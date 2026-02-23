// @ts-check
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { sharedConfig, prodConfig, testConfig, parserConfig } from "../../eslint.config.js";

export default tseslint.config(
  {
    ignores: ["node_modules/**", "dist/**", "*.config.js", "*.config.ts"],
  },
  ...sharedConfig,
  parserConfig(import.meta.dirname),
  ...prodConfig,
  {
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Not needed with React 17+ JSX transform
      "react/react-in-jsx-scope": "off",
      // These are React Compiler rules - disable until project adopts compiler
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/refs": "off",
      "react-hooks/globals": "off",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  ...testConfig
);
