const crypto = require('crypto');
const rc4 = require('./arc4');
const utf8 = require('utf8');

const encrypt = (publicKey, data) => {
  const buf = crypto.randomBytes(32);
  const cipher = rc4(buf);

  const encrypted = cipher.encode(data, 'binary', 'base64');
  const envKey = crypto.publicEncrypt({ key: utf8.encode(publicKey) }, buf);

  return {
    envKey: envKey.toString('base64'),
    envData: encrypted,
  };
};

module.exports = encrypt;
