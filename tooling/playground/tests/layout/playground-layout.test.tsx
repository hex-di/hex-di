/**
 * PlaygroundLayout component tests.
 *
 * Covers spec Section 44.8 item 1:
 * 1. PlaygroundLayout renders three panes (editor, visualization, console)
 */

import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { PlaygroundLayout } from "../../src/layout/playground-layout.js";

// ---------------------------------------------------------------------------
// Mock storage
// ---------------------------------------------------------------------------

const localStorageMap = new Map<string, string>();

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
// Mock ResizeObserver (jsdom doesn't provide it)
// ---------------------------------------------------------------------------

// The useResizeObserver hook from devtools-ui requires ResizeObserver.
// We need to mock it globally for jsdom.
// Note: vitest + jsdom may or may not have this.

// ---------------------------------------------------------------------------
// Mock @hex-di/devtools-ui to avoid transitive DOM issues
// ---------------------------------------------------------------------------

vi.mock("@hex-di/devtools-ui", () => {
  // Minimal mocks for the hooks used by PlaygroundLayout
  return {
    useResizeObserver: () => ({ width: 1400, height: 900 }),
  };
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PlaygroundLayout", () => {
  beforeEach(() => {
    localStorageMap.clear();
    Object.defineProperty(window, "localStorage", {
      writable: true,
      configurable: true,
      value: createMockStorage(localStorageMap),
    });
  });

  afterEach(() => {
    cleanup();
    localStorageMap.clear();
  });

  it("renders three panes (editor, visualization, console)", () => {
    const { getByTestId, getByText } = render(
      <PlaygroundLayout
        editor={<div data-testid="test-editor">Editor Content</div>}
        visualization={<div data-testid="test-viz">Viz Content</div>}
        console={<div data-testid="test-console">Console Content</div>}
      />
    );

    expect(getByTestId("playground-layout")).toBeDefined();
    expect(getByTestId("playground-main")).toBeDefined();
    expect(getByText("Editor Content")).toBeDefined();
    expect(getByText("Viz Content")).toBeDefined();
    expect(getByText("Console Content")).toBeDefined();
  });

  it("renders optional toolbar", () => {
    const { getByTestId, getByText } = render(
      <PlaygroundLayout
        editor={<div>Editor</div>}
        visualization={<div>Viz</div>}
        console={<div>Console</div>}
        toolbar={<div>Toolbar Content</div>}
      />
    );

    expect(getByTestId("playground-toolbar")).toBeDefined();
    expect(getByText("Toolbar Content")).toBeDefined();
  });

  it("does not render toolbar when not provided", () => {
    const { queryByTestId } = render(
      <PlaygroundLayout
        editor={<div>Editor</div>}
        visualization={<div>Viz</div>}
        console={<div>Console</div>}
      />
    );

    expect(queryByTestId("playground-toolbar")).toBeNull();
  });

  it("contains resizable splits for full layout", () => {
    const { getAllByTestId } = render(
      <PlaygroundLayout
        editor={<div>Editor</div>}
        visualization={<div>Viz</div>}
        console={<div>Console</div>}
      />
    );

    // In full layout mode (width=1400 from mock), there should be resizable splits
    const splits = getAllByTestId("resizable-split");
    expect(splits.length).toBeGreaterThanOrEqual(1);
  });

  it("renders all three content areas simultaneously", () => {
    const { getByText } = render(
      <PlaygroundLayout
        editor={<div>EDITOR_MARKER</div>}
        visualization={<div>VIZ_MARKER</div>}
        console={<div>CONSOLE_MARKER</div>}
      />
    );

    // All three markers should be in the document
    expect(getByText("EDITOR_MARKER")).toBeDefined();
    expect(getByText("VIZ_MARKER")).toBeDefined();
    expect(getByText("CONSOLE_MARKER")).toBeDefined();
  });
});
