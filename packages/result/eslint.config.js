// @ts-check
import tseslint from "typescript-eslint";
import {
  baseConfig,
  testConfig,
  typeLevelTestConfig,
} from "../../eslint.config.js";

export default tseslint.config(
  {
    ignores: ["node_modules/**", "dist/**", "reports/**", "coverage/**", "bench/**", "features/**", "cucumber.mjs", "*.config.js", "*.config.ts"],
  },

  // ── Shared base config ──
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // ── ATR-1: Flag andTee/orTee usage for GxP audit trail compliance ──
  // 21 CFR 11.10(e) — andTee/orTee suppress exceptions, making them unsafe
  // for audit-critical operations. Use inspect/inspectErr/andThrough instead.
  {
    files: ["src/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "CallExpression[callee.property.name='andTee']",
          message:
            "ATR-1: andTee() suppresses exceptions and is prohibited for audit-critical operations. Use inspect() or andThrough() instead. See compliance/gxp.md.",
        },
        {
          selector: "CallExpression[callee.property.name='orTee']",
          message:
            "ATR-1: orTee() suppresses exceptions and is prohibited for audit-critical operations. Use inspectErr() instead. See compliance/gxp.md.",
        },
      ],
    },
  },

  // ── fn/ standalone functions use `any` casts for generic bridging ──
  {
    files: ["src/fn/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
    },
  },

  // ── Source-specific overrides ──
  {
    files: ["src/async/result-async.ts", "src/core/types.ts"],
    rules: {
      "@typescript-eslint/unified-signatures": "off",
    },
  },
  {
    files: ["src/async/result-async.ts"],
    rules: {
      "@typescript-eslint/no-duplicate-type-constituents": "off",
      "@typescript-eslint/unbound-method": "off",
    },
  },

  // ── Shared test configs ──
  ...testConfig,
  ...typeLevelTestConfig,
);
