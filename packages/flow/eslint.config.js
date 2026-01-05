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
  // Allow empty object types in type definitions for conditional types
  // This is necessary for State/Event types that conditionally omit properties
  {
    files: ["src/machine/types.ts"],
    rules: {
      "@typescript-eslint/no-empty-object-type": [
        "error",
        {
          allowObjectTypes: "always",
        },
      ],
    },
  },
  ...testConfig
);
