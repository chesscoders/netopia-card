module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2020: true,
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 11,
  },
  rules: {
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'no-unused-vars': ['error', { ignoreRestSiblings: true }],
  },
  ignorePatterns: ['**/test/*.js', '**/*.test.js', '**/test.js'],
};
