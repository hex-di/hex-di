// @ts-check
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { baseConfig, testConfig } from "../../eslint.config.js";

export default tseslint.config(
  {
    ignores: ["node_modules/**", "dist/**", "*.config.js", "*.config.ts"],
  },
  ...baseConfig,
  {
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // OpenTUI uses custom JSX properties (fg, bg, flexDirection, etc.)
      "react/no-unknown-property": "off",
      // TUI app has different lifecycle patterns
      "react-hooks/exhaustive-deps": "warn",
      // TUI app uses setState in effects for connection setup
      "react-hooks/set-state-in-effect": "off",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  ...testConfig
);
