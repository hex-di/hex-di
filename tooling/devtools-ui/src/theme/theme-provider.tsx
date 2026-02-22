/**
 * ThemeProvider component for the HexDI DevTools theme system.
 *
 * Resolves "system" to "light" or "dark" based on prefers-color-scheme,
 * sets CSS custom properties, persists the theme choice, and listens
 * for system preference changes.
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ResolvedTheme } from "../panels/types.js";
import { applyCssVariables } from "./css-variables.js";
import { getSystemPreference, subscribeToSystemPreference } from "./system-preference.js";
import { ThemeReactContext } from "./use-theme.js";
import type { ThemeContext, ThemePreference } from "./use-theme.js";

/**
 * Default localStorage key for persisted theme choice.
 */
const DEFAULT_STORAGE_KEY = "hex-devtools-theme";

/**
 * Props for the ThemeProvider component.
 */
interface ThemeProviderProps {
  readonly theme?: ThemePreference;
  readonly persist?: boolean;
  readonly storageKey?: string;
  readonly children: React.ReactNode;
}

/**
 * Reads the persisted theme preference from localStorage.
 */
function readPersistedTheme(storageKey: string): ThemePreference | undefined {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage unavailable (SSR, security restrictions)
  }
  return undefined;
}

/**
 * Writes a theme preference to localStorage.
 */
function persistTheme(storageKey: string, preference: ThemePreference): void {
  try {
    localStorage.setItem(storageKey, preference);
  } catch {
    // localStorage unavailable
  }
}

/**
 * ThemeProvider component.
 *
 * 1. Resolves "system" to "light" or "dark" based on prefers-color-scheme
 * 2. Sets `data-hex-devtools` and `data-hex-theme` attributes on a wrapper
 * 3. Injects CSS custom properties matching the resolved theme
 * 4. Persists choice to localStorage when persist is true
 * 5. Listens for system preference changes when theme is "system"
 */
function ThemeProvider(props: ThemeProviderProps): React.ReactElement {
  const { persist = true, storageKey = DEFAULT_STORAGE_KEY, children } = props;

  // Track the controlled prop value in a ref to avoid it as an effect dependency
  const themePropRef = useRef(props.theme);
  themePropRef.current = props.theme;

  // Initialize preference: prop > persisted > "system"
  const [preference, setPreference] = useState<ThemePreference>(() => {
    if (props.theme !== undefined) {
      return props.theme;
    }
    if (persist) {
      const persisted = readPersistedTheme(storageKey);
      if (persisted !== undefined) {
        return persisted;
      }
    }
    return "system";
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemPreference);

  const resolved: ResolvedTheme = preference === "system" ? systemTheme : preference;

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Apply CSS variables whenever resolved theme changes
  useEffect(() => {
    const el = wrapperRef.current;
    if (el) {
      applyCssVariables(el, resolved);
      el.setAttribute("data-hex-theme", resolved);
    }
  }, [resolved]);

  // Subscribe to system preference changes
  useEffect(() => {
    if (preference !== "system") {
      return undefined;
    }

    return subscribeToSystemPreference(newTheme => {
      setSystemTheme(newTheme);
    });
  }, [preference]);

  // Sync with controlled prop
  useEffect(() => {
    if (props.theme !== undefined && props.theme !== preference) {
      setPreference(props.theme);
    }
  }, [props.theme, preference]);

  const setTheme = useCallback(
    (newPreference: ThemePreference) => {
      setPreference(newPreference);
      if (persist) {
        persistTheme(storageKey, newPreference);
      }
    },
    [persist, storageKey]
  );

  const contextValue = useMemo<ThemeContext>(
    () => ({
      resolved,
      preference,
      setTheme,
    }),
    [resolved, preference, setTheme]
  );

  return (
    <ThemeReactContext.Provider value={contextValue}>
      <div
        ref={wrapperRef}
        data-hex-devtools=""
        data-hex-theme={resolved}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "var(--hex-bg-primary)",
          color: "var(--hex-text-primary)",
        }}
      >
        {children}
      </div>
    </ThemeReactContext.Provider>
  );
}

export { ThemeProvider };
export type { ThemeProviderProps };
