// @ts-check
import tseslint from "typescript-eslint";
import { baseConfig, testConfig, typeLevelTestConfig } from "../../eslint.config.js";

export default tseslint.config(
  {
    ignores: ["node_modules/**", "dist/**", "coverage/**", "features/**", "cucumber.mjs", "cucumber-report.html", "*.config.js", "*.config.ts", "*.config.mjs"],
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
);
