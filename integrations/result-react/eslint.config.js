// @ts-check
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import { baseConfig, testConfig } from "../../eslint.config.js";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "*.config.js",
      "*.config.ts",
      "*.mjs",
      "features/**",
    ],
  },
  ...baseConfig,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // React Compiler rules — disable until project adopts compiler
      "react-hooks/refs": "off",
      "react-hooks/globals": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
  ...testConfig,
  {
    files: ["**/*.test.{ts,tsx}", "**/tests/**/*.{ts,tsx}"],
    rules: {
      // Generator functions used with safeTry may legitimately have no yield
      "require-yield": "off",
    },
  },
  {
    // Module augmentation for vitest requires the type parameter name to match
    // the augmented interface exactly; the parameter is "used" structurally.
    files: ["src/testing/matchers.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_|^[A-Z]$",
        },
      ],
    },
  }
);
