const crypto = require('crypto');
const http = require('http');
const net = require('net');
const { rawTextBodyParser } = require('..');

// A real server, because the bugs this middleware has to survive live in the
// stream: chunk boundaries, an async middleware running first, a client that vanishes.
function startServer({ tick = false, before } = {}) {
  const calls = [];
  const server = http.createServer((req, res) => {
    const run = () => {
      if (before) {
        before(req);
      }
      rawTextBodyParser(req, res, (error) => {
        calls.push({ error, body: req.body, rawBody: req.rawBody, req });
        res.statusCode = error ? error.status || 500 : 200;
        res.end('done');
      });
    };
    // setImmediate stands in for any async middleware mounted earlier.
    return tick ? setImmediate(run) : run();
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () =>
      resolve({
        calls,
        port: server.address().port,
        close: () => server.close(),
      })
    );
  });
}

function send(port, headers, chunks) {
  return new Promise((resolve) => {
    const socket = net.connect(port, '127.0.0.1', async () => {
      socket.write(headers);
      for (const chunk of chunks) {
        socket.write(chunk);
        await new Promise((r) => setTimeout(r, 15));
      }
    });
    socket.on('data', (response) => {
      socket.destroy();
      resolve(String(response).split('\r\n')[0]);
    });
    socket.on('error', () => resolve(null));
  });
}

function headersFor(contentType, byteLength) {
  return (
    'POST /notify HTTP/1.1\r\nHost: x\r\n' +
    (contentType ? `Content-Type: ${contentType}\r\n` : '') +
    `Content-Length: ${byteLength}\r\n\r\n`
  );
}

async function post({ contentType, body, tick = false, before, split }) {
  const server = await startServer({ tick, before });
  const payload = Buffer.from(body, 'utf8');
  const chunks = split ? [payload.subarray(0, split), payload.subarray(split)] : [payload];
  const status = await send(server.port, headersFor(contentType, payload.length), chunks);
  await new Promise((r) => setTimeout(r, 40));
  server.close();
  return { status, calls: server.calls };
}

const NOTIFICATION = '{"order":{"orderID":"abc"},"payment":{"status":3}}';

describe('rawTextBodyParser', () => {
  test.each(['application/json', 'text/plain', 'text/plain; charset=utf-8', 'Application/JSON'])(
    'reads the raw body for content type %s',
    async (contentType) => {
      const { calls } = await post({ contentType, body: NOTIFICATION });

      expect(calls).toHaveLength(1);
      expect(calls[0].error).toBeUndefined();
      expect(JSON.parse(calls[0].body).order.orderID).toBe('abc');
    }
  );

  test('reads the body when an async middleware ran first', async () => {
    // req.complete is already true here, while the body is still unread.
    const { calls } = await post({
      contentType: 'application/json',
      body: NOTIFICATION,
      tick: true,
    });

    expect(calls[0].error).toBeUndefined();
    expect(JSON.parse(calls[0].body).payment.status).toBe(3);
  });

  test('keeps multi-byte characters split across chunks intact', async () => {
    const body = JSON.stringify({ order: { billing: { firstName: 'Ștefan', city: 'București' } } });
    const payload = Buffer.from(body, 'utf8');
    // Cut after the lead byte of the first multi-byte character.
    const split = payload.findIndex((byte) => byte >= 0xc0) + 1;

    const { calls } = await post({ contentType: 'application/json', body, split });

    expect(split).toBeGreaterThan(1);
    expect(calls[0].body).not.toContain('�');
    expect(JSON.parse(calls[0].body).order.billing).toEqual({
      firstName: 'Ștefan',
      city: 'București',
    });
  });

  test('leaves other content types to the next middleware', async () => {
    const { calls } = await post({
      contentType: 'application/x-www-form-urlencoded',
      body: 'orderID=abc',
    });

    expect(calls[0].body).toBeUndefined();
    expect(calls[0].error).toBeUndefined();
  });

  test('does not touch a body another parser already set', async () => {
    const { calls } = await post({
      contentType: 'application/json',
      body: NOTIFICATION,
      before: (req) => {
        req.body = { alreadyParsed: true };
      },
    });

    expect(calls[0].body).toEqual({ alreadyParsed: true });
  });

  test('rejects a body over the size cap with a 413', async () => {
    const { status, calls } = await post({
      contentType: 'text/plain',
      body: 'x'.repeat(1024 * 1024 + 10),
    });

    expect(calls[0].error.message).toBe('Request body too large');
    expect(calls[0].error.status).toBe(413);
    expect(status).toContain('413');
  });

  test('keeps the body byte-exact, even when it is not valid UTF-8', async () => {
    // A CP1252 byte echoed back in a free-form field. Decoding to a string and
    // re-encoding would turn it into U+FFFD and change the sha512 the notification
    // signature is over, so a genuine notification would read as tampering.
    const payload = Buffer.concat([
      Buffer.from('{"order":{"data":{"note":"'),
      Buffer.from([0xe3]),
      Buffer.from('"}}}'),
    ]);
    const server = await startServer();
    const status = await send(server.port, headersFor('application/json', payload.length), [
      payload,
    ]);
    await new Promise((r) => setTimeout(r, 40));
    server.close();

    const { rawBody } = server.calls[0];

    expect(status).toContain('200');
    expect(Buffer.isBuffer(rawBody)).toBe(true);
    expect(Buffer.compare(rawBody, payload)).toBe(0);
    expect(crypto.createHash('sha512').update(rawBody).digest('base64')).toBe(
      crypto.createHash('sha512').update(payload).digest('base64')
    );
    // The string form is lossy for these bytes, which is why rawBody exists.
    expect(server.calls[0].body).toContain('\uFFFD');
  });

  test('drops the connection after refusing an oversized body', async () => {
    const { calls } = await post({
      contentType: 'text/plain',
      body: 'x'.repeat(1024 * 1024 + 10),
    });
    await new Promise((r) => setTimeout(r, 60));

    expect(calls[0].error.status).toBe(413);
    expect(calls[0].req.destroyed).toBe(true);
  });

  test('calls next exactly once when the client disappears mid-body', async () => {
    const server = await startServer();
    const socket = net.connect(server.port, '127.0.0.1');
    await new Promise((resolve) => socket.on('connect', resolve));

    // Announce 500 bytes, send a fragment, vanish.
    socket.write(headersFor('application/json', 500) + '{"partial":');
    await new Promise((r) => setTimeout(r, 40));
    socket.destroy();
    await new Promise((r) => setTimeout(r, 250));
    server.close();

    expect(server.calls).toHaveLength(1);
    expect(server.calls[0].error.message).toBe('Request aborted');
  });
});
