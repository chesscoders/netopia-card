const MAX_BODY_BYTES = 1024 * 1024;
const RAW_CONTENT_TYPES = ['application/json', 'text/plain'];

function httpError(message, status) {
  return Object.assign(new Error(message), { status: status, statusCode: status });
}

/**
 * Middleware function to parse raw text body in HTTP requests.
 *
 * This middleware function will read the raw text body from the request and set
 * it as the `req.body` property if the `Content-Type` header is 'application/json',
 * 'text/plain' or not specified. NETOPIA sends payment notifications as
 * 'application/json', and the notification body must be read raw. If the
 * `Content-Type` is something else, or the body was already read, it calls the next
 * middleware function without modifying the request body.
 *
 * Keep other body parsers off this route: a JSON parser mounted earlier sets
 * `req.body` and drains the stream, leaving nothing to read here.
 *
 * Bodies larger than 1 MB are rejected with a 413: the notification endpoint is
 * reachable by anyone who learns its URL.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} _res - The Express response object.
 * @param {NextFunction} next - The next middleware function.
 */
function rawTextBodyParser(req, _res, next) {
  const contentType = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const isRaw = !contentType || RAW_CONTENT_TYPES.includes(contentType);

  // Nothing left to read: another body parser drained the stream, or the client is gone.
  // req.complete is not part of this check - it means the message arrived, not that it
  // was consumed, and it is already true whenever an async middleware ran first.
  if (!isRaw || req.body !== undefined || req.readableEnded || req.destroyed) {
    next();
    return;
  }

  let data = '';
  let bytes = 0;
  let done = false;

  const finish = (error) => {
    if (done) {
      return;
    }
    done = true;
    next(error);
  };

  // Decode across chunk boundaries: a two-byte diacritic split between two TCP
  // segments would otherwise be replaced by U+FFFD in the parsed body.
  req.setEncoding('utf8');

  req.on('data', (chunk) => {
    if (done) {
      return;
    }
    bytes += Buffer.byteLength(chunk);
    if (bytes > MAX_BODY_BYTES) {
      req.pause();
      finish(httpError('Request body too large', 413));
      return;
    }
    data += chunk;
  });
  req.on('end', () => {
    if (done) {
      return;
    }
    req.body = data;
    finish();
  });
  req.on('aborted', () => finish(httpError('Request aborted', 400)));
  req.on('close', () => finish(httpError('Request aborted', 400)));
  req.on('error', finish);
}

module.exports = rawTextBodyParser;
