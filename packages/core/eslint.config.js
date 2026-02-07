// @ts-check
import tseslint from "typescript-eslint";
import { baseConfig, testConfig, typeLevelTestConfig } from "../../eslint.config.js";

export default tseslint.config(
  {
    ignores: ["node_modules/**", "dist/**", "*.config.js", "*.config.ts"],
  },
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
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
