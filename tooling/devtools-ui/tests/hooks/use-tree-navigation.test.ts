/**
 * Tests for useTreeNavigation hook.
 */

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTreeNavigation } from "../../src/hooks/use-tree-navigation.js";

// Simple tree structure for testing:
//   root
//   ├── child1
//   │   └── grandchild
//   └── child2

const children: Record<string, readonly string[]> = {
  root: ["child1", "child2"],
  child1: ["grandchild"],
  child2: [],
  grandchild: [],
};

const parents: Record<string, string | undefined> = {
  root: undefined,
  child1: "root",
  child2: "root",
  grandchild: "child1",
};

function getChildIds(id: string): readonly string[] {
  return children[id] ?? [];
}

function getParent(id: string): string | undefined {
  return parents[id];
}

describe("useTreeNavigation", () => {
  it("initializes with root focused and expanded", () => {
    const { result } = renderHook(() => useTreeNavigation("root", getChildIds, getParent));

    expect(result.current.focusedId).toBe("root");
    expect(result.current.expandedIds.has("root")).toBe(true);
  });

  it("setFocused changes the focused id", () => {
    const { result } = renderHook(() => useTreeNavigation("root", getChildIds, getParent));

    act(() => {
      result.current.setFocused("child1");
    });

    expect(result.current.focusedId).toBe("child1");
  });

  it("toggleExpanded adds and removes ids", () => {
    const { result } = renderHook(() => useTreeNavigation("root", getChildIds, getParent));

    // Expand child1
    act(() => {
      result.current.toggleExpanded("child1");
    });
    expect(result.current.expandedIds.has("child1")).toBe(true);

    // Collapse child1
    act(() => {
      result.current.toggleExpanded("child1");
    });
    expect(result.current.expandedIds.has("child1")).toBe(false);
  });
});
