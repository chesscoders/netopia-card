const crypto = require("crypto");
const rc4 = require("./arc4");
const utf8 = require("utf8");

const encrypt = (publicKey, data) => {
  const buff = crypto.randomBytes(32);
  const cipher = rc4(buff);
  const encrypted = cipher.encode(data, "binary", "base64");
  const envKey = crypto.publicEncrypt(
    {
      key: utf8.encode(publicKey),
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    buff
  );

  return {
    envKey: envKey.toString("base64"),
    envData: encrypted,
  };
};

module.exports = encrypt;
