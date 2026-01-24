import { defineConfig, globalIgnores } from 'eslint/config';
import airbnbBase from 'eslint-config-airbnb-base';
import prettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...airbnbBase,
  ...prettier,
  // Optional: global ignores
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
  ]),
  {
    parserOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
    },
    rules: {
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      'import/prefer-default-export': 'off',
      'no-nested-ternary': 'off',
      'import/order': 'off',
      'no-undef': 'error',

      // Optional: Airbnb overrides
      indent: ['error', 2],
      'no-mixed-spaces-and-tabs': 'error',
      quotes: 'off',
      semi: ['error', 'always'],
    },
  },
]);

export default eslintConfig;
