const forge = require('node-forge');

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
