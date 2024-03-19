const crypto = require('crypto');
const utf8 = require('utf8');

const encrypt = (publicKey, data) => {
  const rc4Key = crypto.randomBytes(32);

  const cipher = crypto.createCipheriv('rc4', rc4Key, '');
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const envKey = crypto.publicEncrypt(
    {
      key: utf8.encode(publicKey),
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    rc4Key
  );

  return {
    envKey: envKey.toString('base64'),
    envData: encrypted,
  };
};

module.exports = encrypt;
