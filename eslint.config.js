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
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-empty-object-type": "off",
    "prefer-const": "off",
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
      "examples/**",
      "website/**",
    ],
  },
  ...baseConfig
);
