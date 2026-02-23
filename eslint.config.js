// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import antfu from "eslint-plugin-antfu";
import prettierConfig from "eslint-config-prettier";

/**
 * Shared ESLint configuration split into prod and test concerns.
 *
 * - sharedConfig:        rules for ALL files (style, unused vars, prettier)
 * - prodConfig:          strict type-safety rules scoped to src/**
 * - testConfig:          relaxed rules for test files
 * - typeLevelTestConfig: extra relaxation for .test-d.ts files
 * - parserConfig(dir):   helper to wire up projectService per-package
 */

// ── Shared config: applies to ALL files ──

/** @type {import("typescript-eslint").ConfigArray} */
export const sharedConfig = tseslint.config(
  eslint.configs.recommended,

  ...tseslint.configs.recommended,

  {
    plugins: {
      antfu,
    },
    rules: {
      "prefer-const": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-namespace": [
        "error",
        {
          allowDeclarations: true,
          allowDefinitionFiles: true,
        },
      ],
      "antfu/no-top-level-await": "off",
      "antfu/if-newline": "off",
    },
  },

  prettierConfig
);

// ── Prod config: strict rules scoped to src/ files only ──

/** @type {import("typescript-eslint").ConfigArray} */
export const prodConfig = tseslint.config({
  files: ["src/**/*.{ts,tsx}"],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/require-await": "warn",
    "@typescript-eslint/no-unsafe-assignment": "warn",
    "@typescript-eslint/no-unsafe-call": "warn",
    "@typescript-eslint/no-unsafe-member-access": "warn",
    "@typescript-eslint/no-unsafe-return": "warn",
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
});

// ── Test config: relaxed rules for test files ──

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
    "@typescript-eslint/no-empty-object-type": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        args: "none",
        varsIgnorePattern: "^_",
        caughtErrors: "none",
        destructuredArrayIgnorePattern: "^_",
        ignoreRestSiblings: true,
      },
    ],
    "prefer-const": "warn",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unsafe-return": "off",
    "no-console": "off",
    "@typescript-eslint/require-await": "off",
  },
});

// ── Type-level test config: extra relaxation for .test-d.ts files ──

/** @type {import("typescript-eslint").ConfigArray} */
export const typeLevelTestConfig = tseslint.config({
  files: ["**/*.test-d.{ts,tsx}"],
  rules: {
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-unused-expressions": "off",
  },
});

// ── Parser config factory: reduces per-package boilerplate ──

/** @param {string} dirname - import.meta.dirname of the package */
export function parserConfig(dirname) {
  return {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: dirname,
      },
    },
  };
}

// ── Root config: only lints root-level files ──

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.docusaurus/**",
      "**/coverage/**",
      "packages/**",
      "integrations/**",
      "tooling/**",
      "libs/**",
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
  ...sharedConfig,
  ...prodConfig
);
