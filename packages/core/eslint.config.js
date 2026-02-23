// @ts-check
import tseslint from "typescript-eslint";
import { sharedConfig, prodConfig, testConfig, typeLevelTestConfig, parserConfig } from "../../eslint.config.js";

export default tseslint.config(
  {
    ignores: ["node_modules/**", "dist/**", "coverage/**", "*.config.js", "*.config.ts"],
  },
  ...sharedConfig,
  parserConfig(import.meta.dirname),
  ...prodConfig,
  ...testConfig,
  ...typeLevelTestConfig,
  // Type-extraction test files where variables exist solely for typeof
  // in expectTypeOf() assertions. typescript-eslint has no "used only
  // as type" exception (issues #9697, #10604, #10266 all closed wontfix).
  {
    files: [
      "tests/directed-ports.test.ts",
      "tests/uat-phase6.test.ts",
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
