import { defineConfig, globalIgnores } from "eslint/config";
import airbnbBase from "eslint-config-airbnb-base";
import prettier from "eslint-config-prettier";

export default defineConfig([
  ...airbnbBase,
  ...prettier,

  // Global ignores
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
  ]),

  {
    parserOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
    },
    rules: {
      "prettier/prettier": ["error", { endOfLine: "auto" }],
      "import/prefer-default-export": "off",
      "no-nested-ternary": "off",
      "import/order": "off",
      "no-undef": "error",

      // Airbnb overrides
      indent: ["error", 2],
      "no-mixed-spaces-and-tabs": "error",
      quotes: "off",
      semi: ["error", "always"],

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
