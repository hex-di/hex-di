/**
 * Tests for useDataSourceSnapshot hook.
 *
 * DoD 43.6:
 * 1. Hook returns data value (snapshot)
 * 2. Hook re-renders when subscribe listener fires
 * 3. Returns undefined when data source has no data
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import React from "react";
import type { ContainerSnapshot, ScopeTree, InspectorEvent } from "@hex-di/core";
import type { InspectorDataSource } from "../../src/data/inspector-data-source.js";
import { DataSourceProvider } from "../../src/context/data-source-context.js";
import { useDataSourceSnapshot } from "../../src/hooks/use-data-source-snapshot.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const baseScopeTree: ScopeTree = {
  id: "root",
  status: "active",
  resolvedCount: 0,
  totalCount: 3,
  children: [],
  resolvedPorts: [],
};

const baseSnapshot: ContainerSnapshot = {
  kind: "root",
  containerName: "TestContainer",
  phase: "uninitialized",
  isInitialized: false,
  isDisposed: false,
  asyncAdaptersTotal: 0,
  asyncAdaptersInitialized: 0,
  singletons: [],
  scopes: baseScopeTree,
};

const NO_DATA = Symbol("no-data");

function createMockDataSource(snapshot: ContainerSnapshot | typeof NO_DATA = baseSnapshot): {
  dataSource: InspectorDataSource;
  listeners: Set<(event: InspectorEvent) => void>;
  triggerEvent: () => void;
} {
  const listeners = new Set<(event: InspectorEvent) => void>();
  const snapshotValue = snapshot === NO_DATA ? undefined : snapshot;

  const dataSource: InspectorDataSource = {
    getSnapshot: vi.fn().mockReturnValue(snapshotValue),
    getScopeTree: vi.fn().mockReturnValue(undefined),
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

describe("useDataSourceSnapshot", () => {
  it("returns the snapshot value from the data source", () => {
    const { dataSource } = createMockDataSource();

    function TestComponent(): React.ReactNode {
      const snapshot = useDataSourceSnapshot();
      return <div data-testid="name">{snapshot?.containerName ?? "none"}</div>;
    }

    render(
      <DataSourceProvider dataSource={dataSource}>
        <TestComponent />
      </DataSourceProvider>
    );

    expect(screen.getByTestId("name").textContent).toBe("TestContainer");
  });

  it("re-renders when subscribe listener fires", () => {
    const { dataSource, triggerEvent } = createMockDataSource();

    function TestComponent(): React.ReactNode {
      const snapshot = useDataSourceSnapshot();
      return <div data-testid="phase">{snapshot?.phase ?? "none"}</div>;
    }

    render(
      <DataSourceProvider dataSource={dataSource}>
        <TestComponent />
      </DataSourceProvider>
    );

    expect(screen.getByTestId("phase").textContent).toBe("uninitialized");

    // Update mock to return a different snapshot
    const updatedSnapshot: ContainerSnapshot = {
      ...baseSnapshot,
      phase: "initialized",
      isInitialized: true,
    };
    vi.mocked(dataSource.getSnapshot).mockReturnValue(updatedSnapshot);

    act(() => {
      triggerEvent();
    });

    expect(screen.getByTestId("phase").textContent).toBe("initialized");
  });

  it("returns undefined when data source has no data", () => {
    const { dataSource } = createMockDataSource(NO_DATA);

    function TestComponent(): React.ReactNode {
      const snapshot = useDataSourceSnapshot();
      return <div data-testid="result">{snapshot == null ? "none" : "has-data"}</div>;
    }

    render(
      <DataSourceProvider dataSource={dataSource}>
        <TestComponent />
      </DataSourceProvider>
    );

    expect(screen.getByTestId("result").textContent).toBe("none");
  });
});
