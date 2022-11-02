const crypto = require("crypto");
const rc4 = require("arc4");

const decrypt = (privateKey, envKey, data) => {
  const buffer = Buffer.from(envKey, "base64");
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    buffer
  );
  const cipher = rc4("arc4", decrypted);

  return cipher.decode(Buffer.from(data, "base64"), "utf8");
};

module.exports = decrypt;
