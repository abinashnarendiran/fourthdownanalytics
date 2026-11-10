import { defineConfig, globalIgnores } from "eslint/config";
import { configs, plugins } from "eslint-config-airbnb-extended";
import prettier from "eslint-config-prettier";

export default defineConfig([
  ...Object.values(plugins),
  ...configs.next.recommended,
  ...configs.base.typescript,
  ...configs.next.typescript,
  prettier,

  // Global ignores
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
  ]),

  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
      },
    },
    rules: {
      "import/prefer-default-export": "off",
      "no-nested-ternary": "off",
      "import/order": "off",
      "no-undef": "off",

      // TypeScript and the existing React codebase do not use these Airbnb conventions.
      indent: "off",
      "no-mixed-spaces-and-tabs": "error",
      quotes: "off",
      semi: ["error", "always"],
      "react/button-has-type": "off",
      "react/function-component-definition": "off",
      "react/require-default-props": "off",
      "@typescript-eslint/array-type": "off",
      "react/no-array-index-key": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
      "@typescript-eslint/no-use-before-define": "warn",
      "@typescript-eslint/no-shadow": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react/jsx-no-constructed-context-values": "warn",
      "react/jsx-boolean-value": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-effect": "warn",

      // Highlight unused variables
      "no-unused-vars": [
        "warn", // or 'error' if you want red squiggles
        {
          vars: "all", // check all variables
          args: "after-used", // ignore unused args at the start
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_", // allow _error style
        },
      ],
    },
  },
]);
