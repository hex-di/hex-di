// @ts-check
import tseslint from "typescript-eslint";
import { sharedConfig, prodConfig, parserConfig } from "../../eslint.config.js";

export default tseslint.config(
  {
    ignores: ["node_modules/**", "dist/**", "*.config.js", "*.config.ts"],
  },
  ...sharedConfig,
  parserConfig(import.meta.dirname),
  ...prodConfig,
);
