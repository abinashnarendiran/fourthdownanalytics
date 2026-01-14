import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    parserOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
    },
    rules: {
      // Indentation rules: 2 spaces
      indent: ['error', 2],
      'no-mixed-spaces-and-tabs': 'error',

      // Optional: enforce single quotes and semicolons
      quotes: 'off', // disables the rule entirely
      semi: ['error', 'always'],
    },
  },
]);

export default eslintConfig;
