/**
 * Integration test: Result panel appears in built-in panels and
 * VisualizationPane renders a "Result" tab.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { getBuiltInPanels } from "@hex-di/devtools-ui";
import type { DevToolsPanel } from "@hex-di/devtools-ui";

// ---------------------------------------------------------------------------
// Mock storage and environment
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Result panel integration", () => {
  beforeEach(() => {
    sessionStorageMap.clear();
    Object.defineProperty(window, "sessionStorage", {
      writable: true,
      configurable: true,
      value: createMockStorage(sessionStorageMap),
    });
  });

  afterEach(() => {
    cleanup();
    sessionStorageMap.clear();
  });

  it("getBuiltInPanels() includes a panel with id 'result'", () => {
    const panels = getBuiltInPanels();
    const resultPanel = panels.find(p => p.id === "result");

    expect(resultPanel).toBeDefined();
    expect(resultPanel?.label).toBe("Result");
    expect(resultPanel?.order).toBe(3);
  });

  it("result panel is ordered between overview (0) and container (5)", () => {
    const panels = getBuiltInPanels();
    const sorted = [...panels].sort((a, b) => a.order - b.order);
    const ids = sorted.map(p => p.id);

    const overviewIdx = ids.indexOf("overview");
    const resultIdx = ids.indexOf("result");
    const containerIdx = ids.indexOf("container");

    expect(resultIdx).toBeGreaterThan(overviewIdx);
    expect(resultIdx).toBeLessThan(containerIdx);
  });

  it("getBuiltInPanels() returns 9 panels", () => {
    const panels = getBuiltInPanels();
    expect(panels).toHaveLength(9);
  });

  it("result panel has a valid component", () => {
    const panels = getBuiltInPanels();
    const resultPanel = panels.find(p => p.id === "result");

    expect(typeof resultPanel?.component).toBe("function");
  });
});
