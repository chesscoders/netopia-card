/**
 * Picks the specified properties from an object and returns a new object with those properties.
 * @param {Object} object The source object from which to pick properties.
 * @param {string[]} paths An array of property names to be picked from the source object.
 * @returns {Object} A new object containing only the picked properties.
 */
function pick(object, paths) {
  const result = {};

  for (const field of paths) {
    if (object.hasOwnProperty(field)) {
      result[field] = object[field];
    }
  }

  return result;
}

module.exports = pick;
