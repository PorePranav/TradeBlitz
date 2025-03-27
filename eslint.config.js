const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettier = require('eslint-plugin-prettier');

module.exports = tseslint.config(eslint.configs.recommended, ...tseslint.configs.recommended, {
  plugins: {
    '@typescript-eslint': tseslint.plugin,
    prettier: prettier,
  },
  rules: {
    'prettier/prettier': 'error',
  },
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    globals: {
      node: true,
      es6: true,
    },
  },
});
