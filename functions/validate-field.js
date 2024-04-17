/**
 * Validates a field with given constraints and type checks.
 * @param {*} field The field to be validated.
 * @param {string} name The name of the field, used for error messages.
 * @throws {Error} Throws an error if the field fails validation.
 */
function validateField(field, name = 'Value') {
  if (field == null) {
    throw new Error(`${name} is required`);
  }

  if (typeof field === 'string' && field.trim().length === 0) {
    throw new Error(`${name} cannot be empty or just whitespace`);
  }

  if (typeof field === 'number' && isNaN(field)) {
    throw new Error(`Invalid ${name}`);
  }
}

module.exports = validateField;
