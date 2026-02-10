// @ts-check
import tseslint from "typescript-eslint";
import { baseConfig, testConfig, typeLevelTestConfig } from "../../../eslint.config.js";

export default tseslint.config(
  {
    ignores: ["node_modules/**", "dist/**"],
  },
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  ...baseConfig,
  ...testConfig,
  ...typeLevelTestConfig
);
