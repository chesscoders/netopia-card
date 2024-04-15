const forge = require('node-forge');

const getPublicKeyFromCertificate = (certificatePem) => {
  const certificate = forge.pki.certificateFromPem(certificatePem);
  return certificate.publicKey;
};

const encrypt = (certificatePem, data) => {
  const publicKey = getPublicKeyFromCertificate(certificatePem);
  const key = forge.random.getBytesSync(16);
  const iv = forge.random.getBytesSync(16);

  const cipher = forge.cipher.createCipher('AES-CBC', key);
  cipher.start({ iv });
  cipher.update(forge.util.createBuffer(data));
  cipher.finish();
  const encryptedData = cipher.output.getBytes();

  const encryptedKey = publicKey.encrypt(key + iv, 'RSA-OAEP');

  return {
    envKey: forge.util.encode64(encryptedKey),
    envData: forge.util.encode64(encryptedData),
  };
};

module.exports = encrypt;
