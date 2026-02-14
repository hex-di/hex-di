/**
 * Tests for ThemeProvider component.
 *
 * Spec Section 43.5:
 * 1. Resolves "system" from prefers-color-scheme
 * 2. Persists choice to localStorage
 * 3. Restores choice from localStorage
 * 4. System preference change triggers update
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, screen, cleanup } from "@testing-library/react";
import { ThemeProvider } from "../../src/theme/theme-provider.js";
import { useTheme } from "../../src/theme/use-theme.js";

// =============================================================================
// Test helpers
// =============================================================================

/**
 * A component that exposes the theme context for testing.
 */
function ThemeConsumer(): React.ReactElement {
  const { resolved, preference, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="resolved">{resolved}</span>
      <span data-testid="preference">{preference}</span>
      <button data-testid="set-dark" onClick={() => setTheme("dark")}>
        Dark
      </button>
      <button data-testid="set-light" onClick={() => setTheme("light")}>
        Light
      </button>
      <button data-testid="set-system" onClick={() => setTheme("system")}>
        System
      </button>
    </div>
  );
}

let matchMediaListener: ((event: { matches: boolean }) => void) | undefined;
let matchMediaMatches = false;

function setupMatchMedia(darkMode: boolean): void {
  matchMediaMatches = darkMode;
  matchMediaListener = undefined;

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)" ? matchMediaMatches : false,
      media: query,
      addEventListener: vi.fn().mockImplementation((_type: string, cb: any) => {
        matchMediaListener = cb;
      }),
      removeEventListener: vi.fn(),
    })),
  });
}

// Mock localStorage
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: vi.fn((key: string) => storageMap.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storageMap.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    storageMap.delete(key);
  }),
  clear: vi.fn(() => {
    storageMap.clear();
  }),
  get length() {
    return storageMap.size;
  },
  key: vi.fn((_index: number) => null),
};

// =============================================================================
// Tests
// =============================================================================

describe("ThemeProvider", () => {
  beforeEach(() => {
    storageMap.clear();
    Object.defineProperty(window, "localStorage", {
      writable: true,
      configurable: true,
      value: mockLocalStorage,
    });
    setupMatchMedia(false);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("resolves 'system' from prefers-color-scheme (light)", () => {
    setupMatchMedia(false);

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("resolved").textContent).toBe("light");
    expect(screen.getByTestId("preference").textContent).toBe("system");
  });

  it("resolves 'system' from prefers-color-scheme (dark)", () => {
    setupMatchMedia(true);

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("resolved").textContent).toBe("dark");
  });

  it("persists choice to localStorage", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    act(() => {
      screen.getByTestId("set-dark").click();
    });

    expect(storageMap.get("hex-devtools-theme")).toBe("dark");
    expect(screen.getByTestId("resolved").textContent).toBe("dark");
  });

  it("restores choice from localStorage", () => {
    storageMap.set("hex-devtools-theme", "dark");

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("resolved").textContent).toBe("dark");
    expect(screen.getByTestId("preference").textContent).toBe("dark");
  });

  it("system preference change triggers update", () => {
    setupMatchMedia(false);

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("resolved").textContent).toBe("light");

    // Simulate system preference changing to dark
    act(() => {
      matchMediaListener?.({ matches: true });
    });

    expect(screen.getByTestId("resolved").textContent).toBe("dark");
  });
});
