require('dotenv').config();
const fs = require('fs');
const generateKeys = require('./generate-keys');
const formatNewlines = require('./format-newlines');

const saveKeysInEnvironment = async (options, file = '.env') => {
  const keys = await generateKeys(options);
  process.env.PRIVATE_KEY = formatNewlines(keys.privateKey);
  process.env.PUBLIC_KEY = formatNewlines(keys.publicKey);
  fs.appendFileSync(
    file,
    `PRIVATE_KEY=${process.env.PRIVATE_KEY}PUBLIC_KEY=${process.env.PUBLIC_KEY}`
  );
};

module.exports = saveKeysInEnvironment;
