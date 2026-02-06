// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import antfu from "eslint-plugin-antfu";
import prettierConfig from "eslint-config-prettier";

/**
 * Shared ESLint configuration for all packages.
 * Each package extends this config in their own eslint.config.js
 */

/** @type {import("typescript-eslint").ConfigArray} */
export const baseConfig = tseslint.config(
  // Base ESLint recommended
  eslint.configs.recommended,

  // TypeScript recommended
  ...tseslint.configs.recommended,

  // Global rules
  {
    plugins: {
      antfu,
    },
    rules: {
      // Core goal: no any types in production
      "@typescript-eslint/no-explicit-any": "error",

      // Code quality
      "prefer-const": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Allow namespace for JSX declarations
      "@typescript-eslint/no-namespace": [
        "error",
        {
          allowDeclarations: true,
          allowDefinitionFiles: true,
        },
      ],

      // Antfu rules
      "antfu/no-top-level-await": "off",
      "antfu/if-newline": "off",

      // Promise/async safety
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/require-await": "warn",

      // Type safety (prevent any leakage) - start as warn to assess impact
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",

      // Console protection
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  // Prettier config (must be last to disable conflicting rules)
  prettierConfig
);

/** @type {import("typescript-eslint").ConfigArray} */
export const testConfig = tseslint.config({
  files: [
    "**/*.test.{ts,tsx}",
    "**/*.test-d.{ts,tsx}",
    "**/tests/**/*.{ts,tsx}",
    "**/__tests__/**/*.{ts,tsx}",
  ],
  rules: {
    // Relaxed for mocking flexibility
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-empty-object-type": "off",

    // Keep some safety in tests
    "@typescript-eslint/no-unused-vars": "warn",
    "prefer-const": "warn",

    // Async rules still active - tests should handle promises correctly
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",

    // Relax unsafe rules for test mocking
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unsafe-return": "off",

    // Allow console in tests
    "no-console": "off",

    // Type-level test files use variables only for `typeof` extraction
    // and async factories without await for type inference
    "@typescript-eslint/require-await": "off",
  },
});

/** @type {import("typescript-eslint").ConfigArray} */
export const typeLevelTestConfig = tseslint.config({
  files: ["**/*.test-d.{ts,tsx}"],
  rules: {
    // Variables in type tests are often only used with typeof
    "@typescript-eslint/no-unused-vars": "off",
  },
});

// Root config - only lints root-level files
export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.docusaurus/**",
      "**/coverage/**",
      // Packages have their own configs
      "packages/**",
      "integrations/**",
      "examples/**",
      "website/**",
    ],
  },
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
  },
  ...baseConfig
);
