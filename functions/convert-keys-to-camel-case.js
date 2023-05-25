const { camelCase } = require('change-case');

/**
 * Converts all keys in an object to camel case.
 *
 * @param {object} obj The object to convert.
 * @returns {object} The converted object.
 */
const convertKeysToCamelCase = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map((item) => convertKeysToCamelCase(item));
  } else if (typeof obj === 'object' && obj !== null) {
    const convertedObj = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const camelCaseKey = camelCase(key);
        convertedObj[camelCaseKey] = convertKeysToCamelCase(obj[key]);
      }
    }
    return convertedObj;
  }
  return obj;
};

module.exports = convertKeysToCamelCase;
