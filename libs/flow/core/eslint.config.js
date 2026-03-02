// @ts-check
import tseslint from "typescript-eslint";
import { sharedConfig, prodConfig, testConfig, typeLevelTestConfig, parserConfig } from "../../../eslint.config.js";

export default tseslint.config(
  {
    ignores: ["node_modules/**", "dist/**", "*.config.js", "*.config.ts"],
  },
  ...sharedConfig,
  parserConfig(import.meta.dirname),
  ...prodConfig,
  ...testConfig,
  ...typeLevelTestConfig,
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
  // type-bridge.ts intentionally wraps stdlib APIs that leak `any`
  // (PropertyDescriptor.value, Function.prototype.call) and returns `unknown`.
  {
    files: ["src/utils/type-bridge.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },
);
