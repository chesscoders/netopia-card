require('dotenv').config();
const fs = require('fs');
const { generateKeys, formatNewlines } = require('../functions');

/**
 * Saves generated private and public keys into environment variables and appends them to a .env file.
 * This function handles the key generation, newline formatting, and saving process.
 *
 * @param {Object} options - Options for key generation.
 * @param {string} file - The path to the .env file where the keys will be saved.
 * @return {Promise<void>} A promise that resolves when the keys have been saved.
 */
const saveKeysInEnvironment = async (options, file = '.env.test.local') => {
  const keys = await generateKeys(options);
  process.env.PRIVATE_KEY = JSON.stringify(formatNewlines(keys.privateKey));
  process.env.PUBLIC_KEY = JSON.stringify(formatNewlines(keys.publicKey));
  fs.appendFileSync(
    file,
    `PRIVATE_KEY=${process.env.PRIVATE_KEY}\nPUBLIC_KEY=${process.env.PUBLIC_KEY}`
  );
};

// Run the script with the following command:
// node scripts/save-keys-in-environment.js
(async () => {
  try {
    const options = {
      serialNumber: '01',
      attrs: [
        { name: 'commonName', value: 'chesscoders.com' },
        { name: 'countryName', value: 'RO' },
        { name: 'stateOrProvinceName', value: 'Bucharest' },
        { name: 'localityName', value: 'Bucharest' },
        { name: 'organizationName', value: 'Chess Coders' },
        { name: 'organizationalUnitName', value: 'Software Development' },
      ],
    };
    await saveKeysInEnvironment(options);
    console.log('Keys generated and saved successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to generate or save keys:', error);
    process.exit(1);
  }
})();
