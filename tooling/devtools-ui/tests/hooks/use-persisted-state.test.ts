/**
 * Tests for usePersistedState hook.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePersistedState } from "../../src/hooks/use-persisted-state.js";

// Mock localStorage and sessionStorage
const localStorageMap = new Map<string, string>();
const sessionStorageMap = new Map<string, string>();

function createMockStorage(map: Map<string, string>) {
  return {
    getItem: vi.fn((key: string) => map.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      map.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      map.delete(key);
    }),
    clear: vi.fn(() => {
      map.clear();
    }),
    get length() {
      return map.size;
    },
    key: vi.fn((_index: number) => null),
  };
}

describe("usePersistedState", () => {
  beforeEach(() => {
    localStorageMap.clear();
    sessionStorageMap.clear();
    Object.defineProperty(window, "localStorage", {
      writable: true,
      configurable: true,
      value: createMockStorage(localStorageMap),
    });
    Object.defineProperty(window, "sessionStorage", {
      writable: true,
      configurable: true,
      value: createMockStorage(sessionStorageMap),
    });
  });

  it("initializes with default value when nothing stored", () => {
    const { result } = renderHook(() => usePersistedState("test-key", "default"));

    expect(result.current[0]).toBe("default");
  });

  it("restores from localStorage", () => {
    localStorageMap.set("test-key", JSON.stringify("stored-value"));

    const { result } = renderHook(() => usePersistedState("test-key", "default"));

    expect(result.current[0]).toBe("stored-value");
  });

  it("persists to localStorage on update", () => {
    const { result } = renderHook(() => usePersistedState("test-key", "default"));

    act(() => {
      result.current[1]("new-value");
    });

    expect(result.current[0]).toBe("new-value");
    expect(JSON.parse(localStorageMap.get("test-key") ?? "")).toBe("new-value");
  });

  it("supports session storage", () => {
    const { result } = renderHook(() => usePersistedState("test-key", 0, "session"));

    act(() => {
      result.current[1](42);
    });

    expect(result.current[0]).toBe(42);
    expect(JSON.parse(sessionStorageMap.get("test-key") ?? "")).toBe(42);
  });

  it("supports function updates", () => {
    const { result } = renderHook(() => usePersistedState("test-key", 10));

    act(() => {
      result.current[1](prev => prev + 5);
    });

    expect(result.current[0]).toBe(15);
  });
});
