const ASCIIFolder = require('fold-to-ascii');

const removeDiacritics = (input) => {
  if (typeof input !== 'object') {
    // If the input is not an object, return it as-is
    return ASCIIFolder.foldReplacing(input);
  }

  if (Array.isArray(input)) {
    // If the input is an array, map over its elements and recursively remove diacritics
    return input.map(removeDiacritics);
  }

  // If the input is an object, create a new object and recursively remove diacritics from its values
  return Object.entries(input).reduce((acc, [key, value]) => {
    const newValue = removeDiacritics(value);
    acc[key] = newValue;
    return acc;
  }, {});
};

module.exports = removeDiacritics;
