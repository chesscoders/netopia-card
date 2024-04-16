/**
 * Converts various newline character sequences in a string to a unified newline character.
 * This function replaces all occurrences of "\\r\\n" (Windows-style newline) and "\\r" (old Mac-style newline)
 * with "\\n" (Unix-style newline). It's particularly useful for normalizing newline characters in text
 * data that may have originated from different operating systems.
 *
 * @param {string} str - The string to be processed.
 * @return {string} The processed string with unified newline characters.
 */
const formatNewlines = (str) => {
  if (typeof str !== 'string') {
    // If the input is not a string, return it as is.
    return str;
  }

  try {
    // Replace different types of newline characters with a single newline character '\n'.
    return str.replace(/\r\n|\r/g, '\n');
  } catch {
    // In case of an error, return the original string.
    return str;
  }
};

module.exports = formatNewlines;
