const MAX_BODY_BYTES = 1024 * 1024;
const RAW_CONTENT_TYPES = ['application/json', 'text/plain'];

function httpError(message, status) {
  return Object.assign(new Error(message), { status: status, statusCode: status });
}

/**
 * Middleware function to parse raw text body in HTTP requests.
 *
 * Reads the body and sets it on `req.rawBody` as a Buffer and on `req.body` as a
 * string, when the `Content-Type` header is 'application/json', 'text/plain' or not
 * specified. NETOPIA sends payment notifications as 'application/json', and the
 * notification signature is over the bytes as received - which is why the Buffer is
 * kept: decoding to a string and back is not byte-exact for anything that is not valid
 * UTF-8. `verifyNotification` uses `req.rawBody` in preference to `req.body`.
 *
 * If the `Content-Type` is something else, or the body was already read, it calls the
 * next middleware function without touching the request body. Keep other body parsers
 * off this route: a JSON parser mounted earlier sets `req.body` and drains the stream,
 * leaving nothing to read here.
 *
 * Bodies larger than 1 MB are rejected with a 413 and the connection is dropped: the
 * notification endpoint is reachable by anyone who learns its URL.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function.
 */
function rawTextBodyParser(req, res, next) {
  const contentType = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const isRaw = !contentType || RAW_CONTENT_TYPES.includes(contentType);

  // Nothing left to read: another body parser drained the stream, or the client is gone.
  // req.complete is not part of this check - it means the message arrived, not that it
  // was consumed, and it is already true whenever an async middleware ran first.
  if (!isRaw || req.body !== undefined || req.readableEnded || req.destroyed) {
    next();
    return;
  }

  const chunks = [];
  let bytes = 0;
  let done = false;

  const finish = (error) => {
    if (done) {
      return;
    }
    done = true;
    next(error);
  };

  req.on('data', (chunk) => {
    if (done) {
      return;
    }

    // Buffers, not decoded strings: bytes are what the cap and the signature are about.
    bytes += chunk.length;

    if (bytes > MAX_BODY_BYTES) {
      req.unpipe?.();
      req.pause();
      finish(httpError('Request body too large', 413));
      // Let the error response go out, then stop the upload for good.
      res.on?.('finish', () => req.destroy());
      return;
    }

    chunks.push(chunk);
  });
  req.on('end', () => {
    if (done) {
      return;
    }
    req.rawBody = Buffer.concat(chunks);
    req.body = req.rawBody.toString('utf8');
    finish();
  });
  req.on('aborted', () => finish(httpError('Request aborted', 400)));
  req.on('close', () => finish(httpError('Request aborted', 400)));
  req.on('error', finish);
}

module.exports = rawTextBodyParser;
