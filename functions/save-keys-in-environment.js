require('dotenv').config();
const fs = require('fs');
const generateKeys = require('./generate-keys');
const formatNewlines = require('./format-newlines');

/**
 * Saves generated private and public keys into environment variables and appends them to a .env file.
 * This function handles the key generation, newline formatting, and saving process.
 *
 * @param {Object} options - Options for key generation.
 * @param {string} file - The path to the .env file where the keys will be saved.
 * @return {Promise<void>} A promise that resolves when the keys have been saved.
 */
const saveKeysInEnvironment = async (options, file = '.env') => {
  const keys = await generateKeys(options);
  process.env.PRIVATE_KEY = JSON.stringify(formatNewlines(keys.privateKey));
  process.env.PUBLIC_KEY = JSON.stringify(formatNewlines(keys.publicKey));
  fs.appendFileSync(
    file,
    `PRIVATE_KEY=${process.env.PRIVATE_KEY}\nPUBLIC_KEY=${process.env.PUBLIC_KEY}`
  );
};

module.exports = saveKeysInEnvironment;
