const forge = require('node-forge');

/**
 * Extracts the public key from a PEM-encoded certificate.
 * @param {string} certificatePem - The PEM-encoded certificate from which to extract the public key.
 * @return {forge.pki.PublicKey} The public key extracted from the given certificate.
 */
const getPublicKeyFromCertificate = (certificatePem) => {
  const certificate = forge.pki.certificateFromPem(certificatePem);
  return certificate.publicKey;
};

/**
 * Encrypts data using an RSA public key for the AES key and IV, and AES-CBC for the actual data encryption.
 * The function generates a random AES key and IV, encrypts the data, and then encrypts the AES key and IV using the RSA public key.
 * @param {string} certificatePem - The PEM-encoded certificate containing the RSA public key.
 * @param {string} data - The plaintext data to encrypt.
 * @return {Object} An object containing base64-encoded strings of the encrypted key (envKey) and the encrypted data (envData).
 */
const encrypt = (certificatePem, data) => {
  const publicKey = getPublicKeyFromCertificate(certificatePem);
  const key = forge.random.getBytesSync(16);
  const iv = forge.random.getBytesSync(16);

  const cipher = forge.cipher.createCipher('AES-CBC', key);
  cipher.start({ iv });
  cipher.update(forge.util.createBuffer(data, 'utf8'));
  cipher.finish();
  const encryptedData = cipher.output.getBytes();

  const encryptedKey = publicKey.encrypt(key + iv, 'RSA-OAEP');

  return {
    envKey: forge.util.encode64(encryptedKey),
    envData: forge.util.encode64(encryptedData),
  };
};

module.exports = encrypt;
