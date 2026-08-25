const crypto = require('crypto');
const { Netopia, verifyNotification } = require('..');

const POS_SIGNATURE = 'XXXX-XXXX-XXXX-XXXX-XXXX';
const NOTIFICATION = {
  order: { orderID: 'order-1', data: {} },
  payment: { method: 'card', ntpID: '1309088', status: 5, amount: 49.99, currency: 'RON' },
};

// A throwaway keypair, generated per run: nothing secret is committed.
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const PUBLIC_KEY_PEM = publicKey.export({ type: 'spki', format: 'pem' });

// Public certificate only, to prove a certificate is accepted where a key is.
const CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIDITCCAgmgAwIBAgIUYObRE1Y9PF4kH6/bH4VAZ02KkbkwDQYJKoZIhvcNAQEL
BQAwIDEeMBwGA1UEAwwVTkVUT1BJQSBQYXltZW50cyBUZXN0MB4XDTI2MDgyNTEw
MzIzN1oXDTM2MDgyMjEwMzIzN1owIDEeMBwGA1UEAwwVTkVUT1BJQSBQYXltZW50
cyBUZXN0MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAs46uNMy3RMKj
Yc/nFmBI1qUadj87hcIELoP09tWenMngE8z3+86009pB/kSRTZrgPc6p3wOs/gWd
YpWCI2pX45BeFfX0KCBhQm7D5LqcRmg2LrFy241a8gJk8v4SM7UZQ5YKf+Opo7Ks
D7JFnYrvd+hN2IK/0OQGEFXW9ClkSmxHIOfIYnW9jXpq7Z6wR/8WKQED+eZm+FXH
7SJLHKU+mIBXhmzJkvx6jMWbIoibQEk4pVdXBXUvw053unVHtLdM5kTs+zK54HyH
YKTts/ekztVC7OXDPET5LfbSBRXGQnKseec3E/6wVzA4aa57nqMmxFAdWpe0SuJn
zwLuLcClqQIDAQABo1MwUTAdBgNVHQ4EFgQUks1Fdtc/PnShfmHriU3tL1xWma8w
HwYDVR0jBBgwFoAUks1Fdtc/PnShfmHriU3tL1xWma8wDwYDVR0TAQH/BAUwAwEB
/zANBgkqhkiG9w0BAQsFAAOCAQEAQl6k0ol/COYbev3CFp7mdxxsHnd8FxtyByp/
ibY1Kz09PRHGjJZShOsQ4UdZ89s430quxDHw6edCk9Q4ZIf5nMZdG5BAlhEGyUwl
F1cwVpNekl2MHClp0mJW/P2NjQcgjOtfOXSfTfdKKwHFAkjx0yC5G465sa3rCbuv
M45g6WaVAix5AldLg1cWt2MnbMZDadiPJp0NzMvOH7wVTTrVI4ywRRexmVcZwqbx
I12KWsdGQinWrwljamXVghSNrS1Eg3WQGwQUr6ZatgfPDZZ016I3ZmmtilsTAWe1
lzEVgH3bPUx1tbAP2+0QZRVQ+B8UZYfMSoQx4xWimnOC8h4LBg==
-----END CERTIFICATE-----`;

function hashOf(rawBody) {
  return crypto.createHash('sha512').update(rawBody).digest('base64');
}

function sign(claims, { alg = 'RS512', key = privateKey } = {}) {
  const header = Buffer.from(JSON.stringify({ alg, typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signer = crypto.createSign(alg === 'RS256' ? 'RSA-SHA256' : 'RSA-SHA512');
  signer.update(`${header}.${payload}`);

  return `${header}.${payload}.${signer.sign(key, 'base64url')}`;
}

function notificationFor(overrides = {}, options) {
  const rawBody = JSON.stringify(NOTIFICATION);
  const claims = {
    iss: 'NETOPIA Payments',
    aud: POS_SIGNATURE,
    sub: hashOf(rawBody),
    ...overrides,
  };

  return {
    rawBody,
    token: sign(claims, options),
    posSignature: POS_SIGNATURE,
    publicKey: PUBLIC_KEY_PEM,
  };
}

describe('verifyNotification', () => {
  test('returns the notification it verified', () => {
    expect(verifyNotification(notificationFor())).toEqual(NOTIFICATION);
  });

  test.each(['RS512', 'RS256'])('accepts a %s token', (alg) => {
    expect(verifyNotification(notificationFor({}, { alg }))).toEqual(NOTIFICATION);
  });

  test('accepts a Buffer body and a PEM with escaped newlines', () => {
    const params = notificationFor();

    expect(
      verifyNotification({
        ...params,
        rawBody: Buffer.from(params.rawBody, 'utf8'),
        publicKey: PUBLIC_KEY_PEM.replace(/\n/g, '\\n'),
      })
    ).toEqual(NOTIFICATION);
  });

  test('keeps the body it verified, not a re-serialized copy', () => {
    // A JSON round-trip reorders nothing here, but the hash is over these exact bytes.
    const rawBody = '{"payment":{"status":5},"order":{"orderID":"order-1"}}';
    const token = sign({ iss: 'NETOPIA Payments', aud: POS_SIGNATURE, sub: hashOf(rawBody) });

    expect(
      verifyNotification({ token, rawBody, posSignature: POS_SIGNATURE, publicKey: PUBLIC_KEY_PEM })
    ).toEqual({ payment: { status: 5 }, order: { orderID: 'order-1' } });
  });

  test('rejects a body that changed by one character', () => {
    const params = notificationFor();

    expect(() =>
      verifyNotification({ ...params, rawBody: params.rawBody.replace('49.99', '49.98') })
    ).toThrow('Notification body does not match the verification token');
  });

  test('rejects a token signed by another key', () => {
    const attacker = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;

    expect(() => verifyNotification(notificationFor({}, { key: attacker }))).toThrow(
      'Verification token signature does not match'
    );
  });

  test('rejects a payload swapped after signing', () => {
    const params = notificationFor();
    const [header, , signature] = params.token.split('.');
    const forged = Buffer.from(
      // Different claims, so the bytes differ and the original signature cannot cover them.
      JSON.stringify({ iss: 'NETOPIA Payments', aud: 'ATTACKER-POS', sub: hashOf(params.rawBody) })
    ).toString('base64url');

    expect(() =>
      verifyNotification({ ...params, token: `${header}.${forged}.${signature}` })
    ).toThrow('Verification token signature does not match');
  });

  test('reads a certificate as the verification key', () => {
    // NETOPIA hands out a certificate, not a bare key. Signed by our key and
    // verified against an unrelated certificate: reaching the signature check
    // proves the certificate parsed into an RSA key and was used.
    expect(() => verifyNotification({ ...notificationFor(), publicKey: CERTIFICATE })).toThrow(
      'Verification token signature does not match'
    );
  });

  test.each([
    ['another issuer', { iss: 'Someone Else' }, 'was not issued by NETOPIA Payments'],
    ['no audience', { aud: '' }, 'Verification token has no audience'],
    ['another POS signature', { aud: 'OTHER-POS' }, 'is for another POS signature'],
    ['an expired token', { exp: 1000 }, 'Verification token has expired'],
    ['a token from the future', { nbf: 4102444800 }, 'is not valid yet'],
    ['a wrong hash', { sub: 'not-the-hash' }, 'does not match the verification token'],
  ])('rejects %s', (_name, claims, message) => {
    expect(() => verifyNotification(notificationFor(claims))).toThrow(message);
  });

  // One account can hold several POS signatures, in any order.
  test.each([[[POS_SIGNATURE, 'OTHER']], [['OTHER', POS_SIGNATURE]], [['A', 'B', POS_SIGNATURE]]])(
    'accepts the POS signature anywhere in aud %s',
    (aud) => {
      expect(verifyNotification(notificationFor({ aud }))).toEqual(NOTIFICATION);
    }
  );

  test.each([
    ['constructor', 'Unsupported verification token algorithm'],
    ['__proto__', 'Unsupported verification token algorithm'],
    ['toString', 'Unsupported verification token algorithm'],
    ['rs512', 'Unsupported verification token algorithm'],
    ['', 'Unsupported verification token algorithm'],
  ])('rejects alg %s without walking the prototype chain', (alg, message) => {
    const params = notificationFor();
    const header = Buffer.from(JSON.stringify({ alg, typ: 'JWT' })).toString('base64url');
    const [, payload, signature] = params.token.split('.');

    expect(() =>
      verifyNotification({ ...params, token: `${header}.${payload}.${signature}` })
    ).toThrow(message);
  });

  test('rejects a header that decodes to null', () => {
    const params = notificationFor();
    const [, payload, signature] = params.token.split('.');

    expect(() =>
      verifyNotification({ ...params, token: `bnVsbA.${payload}.${signature}` })
    ).toThrow('Invalid verification token');
  });

  test('rejects a key that is not RSA', () => {
    const ec = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });

    expect(() =>
      verifyNotification({
        ...notificationFor(),
        publicKey: ec.publicKey.export({ type: 'spki', format: 'pem' }),
      })
    ).toThrow('Public key must be an RSA key');
  });

  test.each([
    ['a string', { exp: 'soon' }, 'Invalid verification token exp'],
    ['an object', { nbf: {} }, 'Invalid verification token nbf'],
    ['null-ish garbage', { iat: 'yesterday' }, 'Invalid verification token iat'],
  ])(
    'rejects %s where a timestamp belongs, instead of skipping the check',
    (_name, claims, message) => {
      expect(() => verifyNotification(notificationFor(claims))).toThrow(message);
    }
  );

  test('bounds the age of a token when asked to', () => {
    const issuedAt = Math.floor(Date.now() / 1000) - 600;

    expect(() =>
      verifyNotification({ ...notificationFor({ iat: issuedAt }), maxAgeSeconds: 300 })
    ).toThrow('Verification token is too old');
    expect(
      verifyNotification({ ...notificationFor({ iat: issuedAt }), maxAgeSeconds: 900 })
    ).toEqual(NOTIFICATION);
  });

  test.each([
    ['not json at all', 'Notification body is not valid JSON'],
    ['null', 'Notification body is not an object'],
    ['[]', 'Notification body is not an object'],
  ])('rejects a correctly signed body that is %s', (rawBody, message) => {
    const token = sign({ iss: 'NETOPIA Payments', aud: POS_SIGNATURE, sub: hashOf(rawBody) });

    expect(() =>
      verifyNotification({
        token,
        rawBody,
        posSignature: POS_SIGNATURE,
        publicKey: PUBLIC_KEY_PEM,
      })
    ).toThrow(message);
  });

  test('rejects an unsupported algorithm', () => {
    const params = notificationFor();
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const [, payload, signature] = params.token.split('.');

    expect(() =>
      verifyNotification({ ...params, token: `${header}.${payload}.${signature}` })
    ).toThrow('Unsupported verification token algorithm');
  });

  test.each([
    ['no token', { token: undefined }, 'Verification token is required'],
    ['a token with two segments', { token: 'a.b' }, 'Invalid verification token'],
    ['no body', { rawBody: '' }, 'Raw body is required'],
    ['no POS signature', { posSignature: '' }, 'POS signature is required'],
    ['no public key', { publicKey: '' }, 'Public key is required'],
    ['a malformed header', { token: 'not-base64.also-not.AAAA' }, 'Invalid verification token'],
    ['an already parsed body', { rawBody: { payment: {} } }, 'Raw body is required'],
    ['a broken public key', { publicKey: 'not a key' }, 'Invalid public key'],
  ])('rejects %s', (_name, overrides, message) => {
    expect(() => verifyNotification({ ...notificationFor(), ...overrides })).toThrow(message);
  });

  test('rejects being called with nothing at all', () => {
    expect(() => verifyNotification()).toThrow('Verification token is required');
  });
});

describe('Netopia.verifyNotification', () => {
  function netopia() {
    return new Netopia({
      apiKey: 'test-api-key',
      posSignature: POS_SIGNATURE,
      publicKey: PUBLIC_KEY_PEM,
      sandbox: true,
    });
  }

  test('reads the token and the raw body off the request', () => {
    const { rawBody, token } = notificationFor();
    const req = { headers: { 'verification-token': token }, rawBody: Buffer.from(rawBody) };

    expect(netopia().verifyNotification(req)).toEqual(NOTIFICATION);
  });

  test('accepts a Buffer body', () => {
    const { rawBody, token } = notificationFor();
    const req = { headers: { 'verification-token': token }, body: Buffer.from(rawBody) };

    expect(netopia().verifyNotification(req)).toEqual(NOTIFICATION);
  });

  test('accepts the string body rawTextBodyParser leaves behind', () => {
    const { rawBody, token } = notificationFor();
    const req = { headers: { 'verification-token': token }, body: rawBody };

    expect(netopia().verifyNotification(req)).toEqual(NOTIFICATION);
  });

  // Setup B in the README: express.json parses the body, captureRawBody keeps the bytes.
  test('prefers rawBody when the body is also parsed', () => {
    const { rawBody, token } = notificationFor();
    const req = {
      headers: { 'verification-token': token },
      rawBody: Buffer.from(rawBody),
      body: JSON.parse(rawBody),
    };

    expect(netopia().verifyNotification(req)).toEqual(NOTIFICATION);
  });

  test('rejects a parsed body, which cannot be hashed back', () => {
    const { rawBody, token } = notificationFor();
    const req = { headers: { 'verification-token': token }, body: JSON.parse(rawBody) };

    expect(() => netopia().verifyNotification(req)).toThrow('Raw body is required');
  });

  test('rejects a request without the header', () => {
    expect(() => netopia().verifyNotification({ headers: {}, rawBody: 'x' })).toThrow(
      'Verification token is required'
    );
  });

  test('requires a request', () => {
    expect(() => netopia().verifyNotification()).toThrow('Request is required');
  });
});
