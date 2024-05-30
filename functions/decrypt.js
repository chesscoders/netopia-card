const forge = require('node-forge');

/**
 * Decrypts data that was encrypted with an RSA public key using AES-CBC encryption.
 * The function uses the private key to first decrypt the AES key and IV, and then uses them
 * to decrypt the actual data.
 * @param {string} privateKeyPem - The PEM-encoded RSA private key.
 * @param {string} envKey - The base64-encoded encrypted AES key and IV.
 * @param {string} encryptedData - The base64-encoded data encrypted with the AES key.
 * @return {string} The decrypted string.
 */
const decrypt = (privateKeyPem, envKey, encryptedData) => {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

  const decryptedKeyIv = privateKey.decrypt(forge.util.decode64(envKey), 'RSA-OAEP');
  const key = decryptedKeyIv.substring(0, 16);
  const iv = decryptedKeyIv.substring(16, 32);

  const decipher = forge.cipher.createDecipher('AES-CBC', key);
  decipher.start({ iv });
  decipher.update(forge.util.createBuffer(forge.util.decode64(encryptedData)));
  decipher.finish();

  const outputBytes = decipher.output.getBytes();
  const outputBuffer = Buffer.from(outputBytes, 'binary');
  return outputBuffer.toString('utf8');
};

module.exports = decrypt;
