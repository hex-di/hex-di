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
  // Type-definition files use `any` in generic constraints for type inference
  // This is standard TypeScript pattern, different from runtime `any` usage
  {
    files: ["**/types.ts", "**/inference.ts", "**/builder.ts", "**/builder-types/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      // builder-types uses {} for EmptyDependencyGraph and EmptyLifetimeMap
      // because Record<string, never> causes index signature pollution
      // when intersected with specific properties
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  ...testConfig,
  ...typeLevelTestConfig
);
