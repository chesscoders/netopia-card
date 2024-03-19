const crypto = require('crypto');

const decrypt = (privateKey, envKey, encryptedData) => {
  const rc4Key = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(envKey, 'base64')
  );

  const decipher = crypto.createDecipheriv('rc4', rc4Key, '');
  let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

module.exports = decrypt;
