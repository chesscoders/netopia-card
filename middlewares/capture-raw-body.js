/**
 * Keeps the body bytes on `req.rawBody`, for `verifyNotification`.
 *
 * A notification is signed over the bytes as sent, so a JSON parser that re-serializes
 * them breaks the hash. Pass this as the `verify` option of a body parser to keep a copy
 * while it parses:
 *
 * ```javascript
 * app.use(express.json({ verify: captureRawBody }));
 * ```
 *
 * On the notification route alone, `rawTextBodyParser` does the same job without a
 * parsed body.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} _res - The Express response object.
 * @param {Buffer} buffer - The raw request body.
 */
function captureRawBody(req, _res, buffer) {
  req.rawBody = buffer;
}

module.exports = captureRawBody;
