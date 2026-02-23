// @ts-check
import tseslint from "typescript-eslint";
import { sharedConfig, prodConfig, testConfig, typeLevelTestConfig, parserConfig } from "../../eslint.config.js";

export default tseslint.config(
  {
    ignores: ["node_modules/**", "dist/**", "coverage/**", "features/**", "cucumber.mjs", "cucumber-report.html", "*.config.js", "*.config.ts", "*.config.mjs"],
  },
  ...sharedConfig,
  parserConfig(import.meta.dirname),
  ...prodConfig,
  ...testConfig,
  ...typeLevelTestConfig,
);
