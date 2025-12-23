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
      // Not needed with React 17+ JSX transform
      "react/react-in-jsx-scope": "off",
      // DevTools package has complex patterns - relax some rules
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/refs": "off",
      "react-hooks/globals": "off",
      "react-hooks/set-state-in-effect": "off",
      // Control chars in regex are intentional for ANSI codes
      "no-control-regex": "off",
      // Relax unused vars for devtools - many are WIP
      "@typescript-eslint/no-unused-vars": "warn",
      // DevTools has legacy patterns and TUI components
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/triple-slash-reference": "off",
      "react/no-unknown-property": "off",
      "prefer-const": "warn",
      "react/no-unescaped-entities": "off",
      "react-hooks/vars-before-render": "off",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  ...testConfig
);
