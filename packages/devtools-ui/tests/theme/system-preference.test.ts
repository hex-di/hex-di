/**
 * Tests for system preference detection.
 *
 * Spec Section 43.5:
 * - Resolves "system" from prefers-color-scheme
 * - System preference change triggers update
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSystemPreference,
  subscribeToSystemPreference,
} from "../../src/theme/system-preference.js";

describe("getSystemPreference", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 'light' when prefers-color-scheme is not dark", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
      })),
    });

    expect(getSystemPreference()).toBe("light");
  });

  it("returns 'dark' when prefers-color-scheme is dark", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: true,
      })),
    });

    expect(getSystemPreference()).toBe("dark");
  });
});

describe("subscribeToSystemPreference", () => {
  it("calls callback when system preference changes", () => {
    let listener: ((event: { matches: boolean }) => void) | undefined;

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn().mockImplementation((_type: string, cb: any) => {
          listener = cb;
        }),
        removeEventListener: vi.fn(),
      })),
    });

    const callback = vi.fn();
    const unsubscribe = subscribeToSystemPreference(callback);

    expect(listener).toBeDefined();

    // Simulate change to dark
    listener?.({ matches: true });
    expect(callback).toHaveBeenCalledWith("dark");

    // Simulate change to light
    listener?.({ matches: false });
    expect(callback).toHaveBeenCalledWith("light");

    unsubscribe();
  });
});
