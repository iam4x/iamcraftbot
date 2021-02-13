module.exports = {
  extends: 'algolia/typescript',
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  rules: {
    'no-param-reassign': 'off',
    'no-warning-comments': 'warn',
    'import/no-commonjs': 'off',

    'no-shadow': 'off',
    'no-undef': 'off',
    '@typescript-eslint/no-shadow': ['error'],

    'no-dupe-class-members': 'off',
    '@typescript-eslint/no-dupe-class-members': ['error'],
  },
};
