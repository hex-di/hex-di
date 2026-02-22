/**
 * Tests for useResultChainData hook.
 *
 * Verifies chain derivation from ResultStatistics, unified chain merging,
 * execution accumulation from result events, and re-derivation on snapshot changes.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import React, { type ReactNode } from "react";
import type { InspectorEvent, ResultStatistics } from "@hex-di/core";
import type { InspectorDataSource } from "../../src/data/inspector-data-source.js";
import { DataSourceProvider } from "../../src/context/data-source-context.js";
import { useResultChainData } from "../../src/hooks/use-result-chain-data.js";

// =============================================================================
// Fixtures
// =============================================================================

const twoPortStats: ReadonlyMap<string, ResultStatistics> = new Map([
  [
    "Logger",
    {
      portName: "Logger",
      totalCalls: 10,
      okCount: 9,
      errCount: 1,
      errorRate: 0.1,
      errorsByCode: new Map(),
      lastError: undefined,
    },
  ],
  [
    "Database",
    {
      portName: "Database",
      totalCalls: 5,
      okCount: 5,
      errCount: 0,
      errorRate: 0,
      errorsByCode: new Map(),
      lastError: undefined,
    },
  ],
]);

const NO_STATS = Symbol("no-stats");

// =============================================================================
// Helpers
// =============================================================================

function createTestDataSource(
  stats: ReadonlyMap<string, ResultStatistics> | typeof NO_STATS = twoPortStats
): {
  dataSource: InspectorDataSource;
  listeners: Set<(event: InspectorEvent) => void>;
  emit: (event: InspectorEvent) => void;
} {
  const listeners = new Set<(event: InspectorEvent) => void>();

  const dataSource: InspectorDataSource = {
    getSnapshot: vi.fn().mockReturnValue(undefined),
    getScopeTree: vi.fn().mockReturnValue(undefined),
    getGraphData: vi.fn().mockReturnValue(undefined),
    getUnifiedSnapshot: vi.fn().mockReturnValue(undefined),
    getAdapterInfo: vi.fn().mockReturnValue(undefined),
    getLibraryInspectors: vi.fn().mockReturnValue(undefined),
    getAllResultStatistics: vi.fn().mockReturnValue(stats === NO_STATS ? undefined : stats),
    subscribe: vi.fn().mockImplementation((listener: (event: InspectorEvent) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }),
    displayName: "Test",
    sourceType: "local",
  };

  const emit = (event: InspectorEvent): void => {
    for (const listener of listeners) {
      listener(event);
    }
  };

  return { dataSource, listeners, emit };
}

function TestHarness({ dataSource }: { readonly dataSource: InspectorDataSource }): ReactNode {
  const { chains, mergedChain, mergedExecution, getExecutions, isRealData } =
    useResultChainData(dataSource);

  const chainIds = [...chains.keys()];
  const totalOps = mergedChain?.operations.length ?? 0;
  const totalSteps = mergedExecution?.steps.length ?? 0;
  const loggerExecs = getExecutions("port:Logger");

  return (
    <div>
      <div data-testid="chain-count">{chains.size}</div>
      <div data-testid="chain-ids">{chainIds.join(",")}</div>
      <div data-testid="merged-ops">{totalOps}</div>
      <div data-testid="merged-steps">{totalSteps}</div>
      <div data-testid="logger-execs">{loggerExecs.length}</div>
      <div data-testid="is-real">{String(isRealData)}</div>
      <div data-testid="merged-chain-id">{mergedChain?.chainId ?? "none"}</div>
    </div>
  );
}

// =============================================================================
// Setup / Cleanup
// =============================================================================

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
});

// =============================================================================
// Tests
// =============================================================================

describe("useResultChainData", () => {
  it("returns chains derived from getAllResultStatistics", () => {
    const { dataSource } = createTestDataSource();

    render(
      <DataSourceProvider dataSource={dataSource}>
        <TestHarness dataSource={dataSource} />
      </DataSourceProvider>
    );

    expect(screen.getByTestId("chain-count").textContent).toBe("2");
    expect(screen.getByTestId("chain-ids").textContent).toContain("port:Logger");
    expect(screen.getByTestId("chain-ids").textContent).toContain("port:Database");
  });

  it("produces a merged chain from all individual chains", () => {
    const { dataSource } = createTestDataSource();

    render(
      <DataSourceProvider dataSource={dataSource}>
        <TestHarness dataSource={dataSource} />
      </DataSourceProvider>
    );

    // 2 chains with 3 ops each = 6 merged ops
    expect(screen.getByTestId("merged-ops").textContent).toBe("6");
    expect(screen.getByTestId("merged-chain-id").textContent).toBe("merged");
  });

  it("accumulates execution when result:ok event arrives and reflects in merged execution", () => {
    const { dataSource, emit } = createTestDataSource();

    render(
      <DataSourceProvider dataSource={dataSource}>
        <TestHarness dataSource={dataSource} />
      </DataSourceProvider>
    );

    act(() => {
      emit({ type: "result:ok", portName: "Logger", timestamp: 1000 });
    });

    expect(screen.getByTestId("logger-execs").textContent).toBe("1");
    // Merged execution should have steps
    expect(Number(screen.getByTestId("merged-steps").textContent)).toBeGreaterThan(0);
  });

  it("accumulates execution when result:err event arrives", () => {
    const { dataSource, emit } = createTestDataSource();

    render(
      <DataSourceProvider dataSource={dataSource}>
        <TestHarness dataSource={dataSource} />
      </DataSourceProvider>
    );

    act(() => {
      emit({ type: "result:err", portName: "Logger", errorCode: "FACTORY_ERROR", timestamp: 2000 });
    });

    expect(screen.getByTestId("logger-execs").textContent).toBe("1");
  });

  it("re-derives chains on snapshot-changed event", () => {
    const { dataSource, emit } = createTestDataSource();

    render(
      <DataSourceProvider dataSource={dataSource}>
        <TestHarness dataSource={dataSource} />
      </DataSourceProvider>
    );

    expect(screen.getByTestId("chain-count").textContent).toBe("2");

    // Update stats to add a third port
    const updatedStats = new Map(twoPortStats);
    updatedStats.set("UserService", {
      portName: "UserService",
      totalCalls: 3,
      okCount: 3,
      errCount: 0,
      errorRate: 0,
      errorsByCode: new Map(),
      lastError: undefined,
    });
    vi.mocked(dataSource.getAllResultStatistics).mockReturnValue(updatedStats);

    act(() => {
      emit({ type: "snapshot-changed" });
    });

    expect(screen.getByTestId("chain-count").textContent).toBe("3");
    // 3 chains * 3 ops each = 9 merged ops
    expect(screen.getByTestId("merged-ops").textContent).toBe("9");
  });

  it("returns empty chains when stats are undefined", () => {
    const { dataSource } = createTestDataSource(NO_STATS);

    render(
      <DataSourceProvider dataSource={dataSource}>
        <TestHarness dataSource={dataSource} />
      </DataSourceProvider>
    );

    expect(screen.getByTestId("chain-count").textContent).toBe("0");
    expect(screen.getByTestId("merged-chain-id").textContent).toBe("none");
    expect(screen.getByTestId("merged-ops").textContent).toBe("0");
  });
});
