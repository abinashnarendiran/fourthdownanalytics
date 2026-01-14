import { defineConfig, globalIgnores } from 'eslint/config';

const eslintConfig = defineConfig([
  {
    env: {
      node: true,       // Node.js global variables
      es2021: true,     // modern JS features
    },
    extends: [
      'eslint:recommended',
      'plugin:node/recommended',
      'prettier',        // makes ESLint work nicely with Prettier
    ],
    parserOptions: {
      ecmaVersion: 12,
      sourceType: 'module', // if using ES Modules
    },
    rules: {
      // Indentation rules: 2 spaces
      indent: ['error', 2],
      'no-mixed-spaces-and-tabs': 'error',

      // Optional: consistent quotes & semicolons
      quotes: 'off', // disables the rule entirely
      semi: ['error', 'always'],
    },
    ignorePatterns: [
      'node_modules/**',
      'dist/**',
      '*.log',
    ],
  },
]);

export default eslintConfig;
