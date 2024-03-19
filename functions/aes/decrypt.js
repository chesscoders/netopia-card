const forge = require('node-forge');

const decrypt = (privateKeyPem, envKey, encryptedData) => {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

  const decryptedKeyIv = privateKey.decrypt(forge.util.decode64(envKey), 'RSA-OAEP');
  const key = decryptedKeyIv.substring(0, 16);
  const iv = decryptedKeyIv.substring(16, 32);

  const decipher = forge.cipher.createDecipher('AES-CBC', key);
  decipher.start({ iv });
  decipher.update(forge.util.createBuffer(forge.util.decode64(encryptedData)));
  decipher.finish();
  return decipher.output.toString();
};

module.exports = decrypt;
