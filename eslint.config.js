const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['**/test/*.js', '**/*.test.js', '**/test.js'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.commonjs,
      },
    },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },
];
