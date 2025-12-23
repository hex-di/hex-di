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
  // Type-definition files use `any` in generic constraints for type inference
  // This is standard TypeScript pattern, different from runtime `any` usage
  {
    files: ["**/types.ts", "**/inference.ts", "**/builder.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  ...testConfig
);
