// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    rules: {
      'import/no-unresolved': 'off',
      'react/no-unescaped-entities': 'off',
    },
    ignores: ['dist/*'],
  },
];
