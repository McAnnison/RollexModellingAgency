module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2020,
  },
  ignorePatterns: [
    '/lib/**/*',
    '/generated/**/*',
    '/node_modules/**/*',
  ],
  rules: {
    'no-console': 'off',
    'semi': ['error', 'always'],
  },
};
