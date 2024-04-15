const formatNewlines = (str) => {
  try {
    return str?.split(String.raw`\n`).join('\n');
  } catch {
    return str;
  }
};

module.exports = formatNewlines;
