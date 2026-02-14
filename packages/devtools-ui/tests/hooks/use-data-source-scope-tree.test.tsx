/**
 * Tests for useDataSourceScopeTree hook.
 *
 * DoD 43.6:
 * 1. Hook returns data value (scope tree)
 * 2. Hook re-renders when subscribe listener fires
 * 3. Returns undefined when data source has no data
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import React from "react";
import type { ScopeTree, InspectorEvent } from "@hex-di/core";
import type { InspectorDataSource } from "../../src/data/inspector-data-source.js";
import { DataSourceProvider } from "../../src/context/data-source-context.js";
import { useDataSourceScopeTree } from "../../src/hooks/use-data-source-scope-tree.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const baseScopeTree: ScopeTree = {
  id: "root",
  status: "active",
  resolvedCount: 2,
  totalCount: 5,
  children: [],
  resolvedPorts: ["PortA", "PortB"],
};

const NO_DATA = Symbol("no-data");

function createMockDataSource(scopeTree: ScopeTree | typeof NO_DATA = baseScopeTree): {
  dataSource: InspectorDataSource;
  listeners: Set<(event: InspectorEvent) => void>;
  triggerEvent: () => void;
} {
  const listeners = new Set<(event: InspectorEvent) => void>();
  const scopeTreeValue = scopeTree === NO_DATA ? undefined : scopeTree;

  const dataSource: InspectorDataSource = {
    getSnapshot: vi.fn().mockReturnValue(undefined),
    getScopeTree: vi.fn().mockReturnValue(scopeTreeValue),
    getGraphData: vi.fn().mockReturnValue(undefined),
    getUnifiedSnapshot: vi.fn().mockReturnValue(undefined),
    getAdapterInfo: vi.fn().mockReturnValue(undefined),
    getLibraryInspectors: vi.fn().mockReturnValue(undefined),
    getAllResultStatistics: vi.fn().mockReturnValue(undefined),
    subscribe: vi.fn().mockImplementation((listener: (event: InspectorEvent) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }),
    displayName: "Test",
    sourceType: "local",
  };

  const triggerEvent = (): void => {
    for (const listener of listeners) {
      listener({ type: "snapshot-changed" });
    }
  };

  return { dataSource, listeners, triggerEvent };
}

// =============================================================================
// Cleanup
// =============================================================================

afterEach(() => {
  cleanup();
});

// =============================================================================
// Tests
// =============================================================================

describe("useDataSourceScopeTree", () => {
  it("returns the scope tree value from the data source", () => {
    const { dataSource } = createMockDataSource();

    function TestComponent(): React.ReactNode {
      const tree = useDataSourceScopeTree();
      return (
        <div data-testid="resolved">
          {tree ? `${tree.resolvedCount}/${tree.totalCount}` : "none"}
        </div>
      );
    }

    render(
      <DataSourceProvider dataSource={dataSource}>
        <TestComponent />
      </DataSourceProvider>
    );

    expect(screen.getByTestId("resolved").textContent).toBe("2/5");
  });

  it("re-renders when subscribe listener fires", () => {
    const { dataSource, triggerEvent } = createMockDataSource();

    function TestComponent(): React.ReactNode {
      const tree = useDataSourceScopeTree();
      return <div data-testid="count">{tree?.resolvedCount ?? "none"}</div>;
    }

    render(
      <DataSourceProvider dataSource={dataSource}>
        <TestComponent />
      </DataSourceProvider>
    );

    expect(screen.getByTestId("count").textContent).toBe("2");

    // Update mock to return a different scope tree
    const updatedTree: ScopeTree = {
      ...baseScopeTree,
      resolvedCount: 4,
    };
    vi.mocked(dataSource.getScopeTree).mockReturnValue(updatedTree);

    act(() => {
      triggerEvent();
    });

    expect(screen.getByTestId("count").textContent).toBe("4");
  });

  it("returns undefined when data source has no data", () => {
    const { dataSource } = createMockDataSource(NO_DATA);

    function TestComponent(): React.ReactNode {
      const tree = useDataSourceScopeTree();
      return <div data-testid="result">{tree == null ? "none" : "has-data"}</div>;
    }

    render(
      <DataSourceProvider dataSource={dataSource}>
        <TestComponent />
      </DataSourceProvider>
    );

    expect(screen.getByTestId("result").textContent).toBe("none");
  });
});
