/**
 * Tests for useTheme hook.
 *
 * Spec Section 43.5:
 * - useTheme returns resolved theme (not "system")
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createElement } from "react";
import { ThemeProvider } from "../../src/theme/theme-provider.js";
import { useTheme } from "../../src/theme/use-theme.js";

function setupMatchMedia(darkMode: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)" ? darkMode : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

const mockLocalStorage = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(() => null),
};

describe("useTheme", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      writable: true,
      configurable: true,
      value: mockLocalStorage,
    });
    setupMatchMedia(false);
  });

  it("throws when used outside ThemeProvider", () => {
    expect(() => renderHook(() => useTheme())).toThrow(
      "useTheme must be used within a ThemeProvider"
    );
  });

  it("returns resolved theme, never 'system'", () => {
    setupMatchMedia(true);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(ThemeProvider, null, children);

    const { result } = renderHook(() => useTheme(), { wrapper });

    // preference is "system" but resolved should be "dark" (from matchMedia)
    expect(result.current.preference).toBe("system");
    expect(result.current.resolved).toBe("dark");
    // resolved should never be "system"
    expect(result.current.resolved === "light" || result.current.resolved === "dark").toBe(true);
  });
});
