const crypto = require('crypto');

const ISSUER = 'NETOPIA Payments';
const SIGNATURE_ALGORITHMS = { RS256: 'RSA-SHA256', RS512: 'RSA-SHA512' };

function decodeSegment(segment) {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
}

function toPublicKey(publicKey) {
  // Environment variables carry the PEM with escaped newlines.
  const pem = String(publicKey).replace(/\\n/g, '\n');

  return pem.includes('BEGIN CERTIFICATE')
    ? new crypto.X509Certificate(pem).publicKey
    : crypto.createPublicKey(pem);
}

/**
 * Verifies a NETOPIA payment notification (IPN) and returns the notification it
 * carries.
 *
 * NETOPIA signs every notification with an RSA key and sends the signature as a JWT
 * in the `Verification-token` header: `iss` is NETOPIA, `aud` is the POS signature the
 * notification is for, and `sub` is the base64 sha512 hash of the exact request body.
 * The public key belongs to your account: NETOPIA Payments admin > Profile > Security.
 *
 * The body has to be the bytes as received. A JSON parser that re-serializes them
 * changes the hash, so read the body raw (`rawTextBodyParser`) or keep a copy of it
 * (`captureRawBody`).
 *
 * @param {Object} params
 * @param {string} params.token The `Verification-token` header.
 * @param {Buffer|string} params.rawBody The request body exactly as received.
 * @param {string} params.posSignature The POS signature the notification must be for.
 * @param {string} params.publicKey The account public key or certificate, PEM encoded.
 * @returns {{ order: Object, payment: Object }} The verified notification.
 * @throws {Error} If anything about the notification cannot be trusted.
 */
function verifyNotification({ token, rawBody, posSignature, publicKey } = {}) {
  if (!token) {
    throw new Error('Verification token is required');
  }
  if (rawBody == null || rawBody.length === 0) {
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
  const algorithm = SIGNATURE_ALGORITHMS[decodeSegment(header).alg || 'RS512'];

  if (!algorithm) {
    throw new Error('Unsupported verification token algorithm');
  }

  const verifier = crypto.createVerify(algorithm);
  verifier.update(`${header}.${payload}`);

  if (!verifier.verify(toPublicKey(publicKey), Buffer.from(signature, 'base64url'))) {
    throw new Error('Verification token signature does not match');
  }

  const claims = decodeSegment(payload);
  const now = Math.floor(Date.now() / 1000);

  if (claims.iss !== ISSUER) {
    throw new Error('Verification token was not issued by NETOPIA Payments');
  }
  if (claims.exp != null && now > claims.exp) {
    throw new Error('Verification token has expired');
  }
  if (claims.nbf != null && now < claims.nbf) {
    throw new Error('Verification token is not valid yet');
  }

  const audience = Array.isArray(claims.aud) ? claims.aud[0] : claims.aud;

  if (!audience) {
    throw new Error('Verification token has no audience');
  }
  if (audience !== posSignature) {
    throw new Error('Verification token is for another POS signature');
  }

  const hash = crypto.createHash('sha512').update(rawBody).digest('base64');

  if (hash !== claims.sub) {
    throw new Error('Notification body does not match the verification token');
  }

  return JSON.parse(rawBody.toString());
}

module.exports = verifyNotification;
