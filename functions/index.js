const decrypt = require('./decrypt');
const encrypt = require('./encrypt');
const formatNewlines = require('./format-newlines');
const generateKeys = require('./generate-keys');
const saveKeysInEnvironment = require('./save-keys-in-environment');

module.exports = {
  decrypt,
  encrypt,
  formatNewlines,
  generateKeys,
  saveKeysInEnvironment,
};
