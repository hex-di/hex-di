/**
 * System color scheme preference detection.
 *
 * Uses `window.matchMedia("(prefers-color-scheme: dark)")` to detect
 * and track the user's OS-level theme preference.
 *
 * @packageDocumentation
 */

import type { ResolvedTheme } from "../panels/types.js";

/**
 * Returns the current system color scheme preference.
 *
 * Falls back to "light" if `matchMedia` is not available (e.g., SSR).
 */
export function getSystemPreference(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }

  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  return mql.matches ? "dark" : "light";
}

/**
 * Subscribes to system color scheme preference changes.
 *
 * @param callback - Called when the system preference changes
 * @returns Unsubscribe function
 */
export function subscribeToSystemPreference(callback: (theme: ResolvedTheme) => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }

  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (event: MediaQueryListEvent): void => {
    callback(event.matches ? "dark" : "light");
  };

  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
}
