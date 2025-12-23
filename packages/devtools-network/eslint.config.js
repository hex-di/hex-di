// @ts-check
import tseslint from "typescript-eslint";
import { baseConfig, testConfig } from "../../eslint.config.js";

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
  // CLI files can use console
  {
    files: ["**/cli/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
  ...testConfig
);
