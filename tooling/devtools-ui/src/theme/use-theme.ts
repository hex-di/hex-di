/**
 * useTheme hook for accessing the current theme context.
 *
 * Returns the resolved theme (never "system"), the user's preference,
 * and a setter function for changing the theme.
 *
 * @packageDocumentation
 */

import { createContext, useContext } from "react";
import type { ResolvedTheme } from "../panels/types.js";

/**
 * Theme preference as set by the user.
 */
export type ThemePreference = "light" | "dark" | "system";

/**
 * Theme context value provided by ThemeProvider.
 */
export interface ThemeContext {
  readonly resolved: ResolvedTheme;
  readonly preference: ThemePreference;
  setTheme(theme: ThemePreference): void;
}

/**
 * React context for the theme system.
 * @internal
 */
export const ThemeReactContext = createContext<ThemeContext | null>(null);
ThemeReactContext.displayName = "HexDI.ThemeContext";

/**
 * Access the current theme from context.
 *
 * Returns the resolved theme ("light" or "dark", never "system"),
 * the user's preference, and a setter to change the theme.
 *
 * @throws {Error} If used outside a ThemeProvider.
 */
export function useTheme(): ThemeContext {
  const context = useContext(ThemeReactContext);

  if (context === null) {
    throw new Error(
      "useTheme must be used within a ThemeProvider. " +
        "Ensure your component is wrapped in a ThemeProvider component."
    );
  }

  return context;
}
