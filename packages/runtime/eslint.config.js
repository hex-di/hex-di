// @ts-check
import tseslint from "typescript-eslint";
import { sharedConfig, prodConfig, testConfig, parserConfig } from "../../eslint.config.js";

export default tseslint.config(
  {
    ignores: ["node_modules/**", "dist/**", "dist-verify/**", ".stryker-tmp/**", "*.config.js", "*.config.ts"],
  },
  ...sharedConfig,
  parserConfig(import.meta.dirname),
  ...prodConfig,
  ...testConfig
);
