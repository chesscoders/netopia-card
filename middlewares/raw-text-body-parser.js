/**
 * Middleware function to parse raw text body in HTTP requests.
 *
 * This middleware function will read the raw text body from the request and
 * set it as the `req.body` property if the `Content-Type` header is 'text/plain'
 * or not specified. If the `Content-Type` is something else, it will call the
 * next middleware function without modifying the request body.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} _res - The Express response object.
 * @param {NextFunction} next - The next middleware function.
 */
function rawTextBodyParser(req, _res, next) {
  if (!req.headers['content-type'] || req.headers['content-type'] === 'text/plain') {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      req.body = data;
      next();
    });
  } else {
    next();
  }
}

module.exports = rawTextBodyParser;
