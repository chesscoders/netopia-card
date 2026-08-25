const crypto = require('crypto');

const ISSUER = 'NETOPIA Payments';
const SIGNATURE_ALGORITHMS = { RS256: 'RSA-SHA256', RS512: 'RSA-SHA512' };

function decodeSegment(segment) {
  let decoded;

  try {
    decoded = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Invalid verification token');
  }

  if (decoded === null || typeof decoded !== 'object' || Array.isArray(decoded)) {
    throw new Error('Invalid verification token');
  }

  return decoded;
}

function toPublicKey(publicKey) {
  // Environment variables carry the PEM with escaped newlines. createPublicKey reads
  // both a public key and an X.509 certificate, which is what NETOPIA hands out.
  const pem = String(publicKey).replace(/\\n/g, '\n');
  let key;

  try {
    key = crypto.createPublicKey(pem);
  } catch {
    throw new Error('Invalid public key');
  }

  // Without this a key of the wrong type fails the signature check instead, which reads
  // as a forged notification rather than as the misconfiguration it is.
  if (key.asymmetricKeyType !== 'rsa') {
    throw new Error('Public key must be an RSA key');
  }

  return key;
}

function toTimestamp(value, name) {
  if (value == null) {
    return undefined;
  }
  // A non-numeric claim has to fail the check, not skip it: `now > NaN` is false.
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid verification token ${name}`);
  }

  return value;
}

/**
 * Verifies a NETOPIA payment notification (IPN) and returns the notification it
 * carries.
 *
 * NETOPIA signs its notifications with an RSA key and sends the signature as a JWT
 * in the `Verification-token` header: `iss` is NETOPIA, `aud` is the POS signature the
 * notification is for, and `sub` is the base64 sha512 hash of the exact request body.
 * The public key belongs to your account: NETOPIA Payments admin > Profile > Security.
 *
 * The body has to be the bytes as received. A JSON parser that re-serializes them
 * changes the hash, so read the body raw (`rawTextBodyParser`) or keep a copy of it
 * (`captureRawBody`). A Buffer is the safe form: a string has already been decoded.
 *
 * A replayed notification is a valid notification, and NETOPIA retries, so the handler
 * has to be idempotent. `maxAgeSeconds` additionally bounds how old a token may be,
 * for tokens that carry `iat`.
 *
 * @param {Object} params
 * @param {string} params.token The `Verification-token` header.
 * @param {Buffer|string} params.rawBody The request body exactly as received.
 * @param {string} params.posSignature The POS signature the notification must be for.
 * @param {string} params.publicKey The account public key or certificate, PEM encoded.
 * @param {number} [params.maxAgeSeconds] Reject a token issued longer ago than this.
 * @returns {{ order: Object, payment: Object }} The verified notification.
 * @throws {Error} If anything about the notification cannot be trusted.
 */
function verifyNotification({ token, rawBody, posSignature, publicKey, maxAgeSeconds } = {}) {
  if (!token) {
    throw new Error('Verification token is required');
  }
  // A parsed body cannot be hashed back: the signature is over the bytes as received.
  if ((typeof rawBody !== 'string' && !Buffer.isBuffer(rawBody)) || rawBody.length === 0) {
    throw new Error('Raw body is required');
  }
  if (!posSignature) {
    throw new Error('POS signature is required');
  }
  if (!publicKey) {
    throw new Error('Public key is required');
  }

  const segments = String(token).split('.');

  if (segments.length !== 3) {
    throw new Error('Invalid verification token');
  }

  const [header, payload, signature] = segments;
  const { alg } = decodeSegment(header);

  // Own property only: `alg: 'constructor'` would otherwise walk the prototype chain.
  if (typeof alg !== 'string' || !Object.hasOwn(SIGNATURE_ALGORITHMS, alg)) {
    throw new Error('Unsupported verification token algorithm');
  }

  const verifier = crypto.createVerify(SIGNATURE_ALGORITHMS[alg]);
  verifier.update(`${header}.${payload}`);

  if (!verifier.verify(toPublicKey(publicKey), Buffer.from(signature, 'base64url'))) {
    throw new Error('Verification token signature does not match');
  }

  const claims = decodeSegment(payload);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = toTimestamp(claims.exp, 'exp');
  const notBefore = toTimestamp(claims.nbf, 'nbf');
  const issuedAt = toTimestamp(claims.iat, 'iat');

  if (claims.iss !== ISSUER) {
    throw new Error('Verification token was not issued by NETOPIA Payments');
  }
  if (expiresAt !== undefined && now > expiresAt) {
    throw new Error('Verification token has expired');
  }
  if (notBefore !== undefined && now < notBefore) {
    throw new Error('Verification token is not valid yet');
  }
  if (maxAgeSeconds != null && issuedAt !== undefined && now - issuedAt > maxAgeSeconds) {
    throw new Error('Verification token is too old');
  }

  // aud is a list in JWT, and one NETOPIA account can hold several POS signatures.
  const audiences = [].concat(claims.aud ?? []).filter(Boolean);

  if (audiences.length === 0) {
    throw new Error('Verification token has no audience');
  }
  if (!audiences.includes(posSignature)) {
    throw new Error('Verification token is for another POS signature');
  }

  const hash = crypto.createHash('sha512').update(rawBody).digest('base64');

  if (hash !== claims.sub) {
    throw new Error('Notification body does not match the verification token');
  }

  let notification;

  try {
    notification = JSON.parse(rawBody.toString());
  } catch {
    throw new Error('Notification body is not valid JSON');
  }

  if (notification === null || typeof notification !== 'object' || Array.isArray(notification)) {
    throw new Error('Notification body is not an object');
  }

  return notification;
}

module.exports = verifyNotification;
