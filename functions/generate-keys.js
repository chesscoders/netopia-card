const forge = require('node-forge');

/**
 * Generates a self-signed certificate along with a corresponding private key.
 * Allows customization of the certificate's attributes and serial number through options.
 *
 * @param {Object} options - Optional settings which may include `serialNumber` and `attrs` for the certificate attributes.
 * @return {Promise<Object>} A promise that resolves with an object containing PEM-encoded strings of the private key and certificate.
 */
function generateSelfSignedCertificate(options = {}) {
  return new Promise((resolve, reject) => {
    forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 }, function (err, keyPair) {
      if (err) {
        reject(err);
        return;
      }

      const cert = forge.pki.createCertificate();
      cert.publicKey = keyPair.publicKey;
      cert.serialNumber = options.serialNumber || '01';

      const attrs = [
        { name: 'commonName', value: 'example.org' },
        { name: 'countryName', value: 'US' },
        { name: 'stateOrProvinceName', value: 'California' },
        { name: 'localityName', value: 'San Francisco' },
        { name: 'organizationName', value: 'Example Company' },
        { name: 'organizationalUnitName', value: 'IT Department' },
        { shortName: 'OU', value: 'Test' },
        ...options.attrs,
      ];

      cert.setSubject(attrs);
      cert.setIssuer(attrs);

      cert.sign(keyPair.privateKey, forge.md.sha256.create());

      const pem = {
        privateKey: forge.pki.privateKeyToPem(keyPair.privateKey),
        certificate: forge.pki.certificateToPem(cert),
      };

      resolve(pem);
    });
  });
}

/**
 * Asynchronous function that generates a self-signed certificate and its corresponding private key.
 * Utilizes `generateSelfSignedCertificate` to create the certificate.
 *
 * @param {Object} options - Options to pass to `generateSelfSignedCertificate`, such as `serialNumber` and certificate attributes.
 * @return {Promise<Object>} A promise that resolves with an object containing the private key and the public key certificate.
 */
const generateKeys = async (options) => {
  try {
    const { privateKey, certificate } = await generateSelfSignedCertificate(options);
    return {
      privateKey,
      publicKey: certificate,
    };
  } catch (error) {
    throw new Error(`Key generation failed: ${error.message}`);
  }
};

module.exports = generateKeys;
