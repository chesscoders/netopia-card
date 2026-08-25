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

  test('uses the certificate as the verification key', () => {
    // Signed by our key, verified against an unrelated certificate: reaching the
    // signature check proves the certificate was parsed and used.
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

  test('takes the first audience of a list', () => {
    expect(verifyNotification(notificationFor({ aud: [POS_SIGNATURE, 'OTHER'] }))).toEqual(
      NOTIFICATION
    );
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

  test('accepts the string body rawTextBodyParser leaves behind', () => {
    const { rawBody, token } = notificationFor();
    const req = { headers: { 'verification-token': token }, body: rawBody };

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
