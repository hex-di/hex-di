/**
 * Tests for createQueryLibraryInspector
 *
 * Verifies that the library inspector bridge correctly:
 * - Reports name "query"
 * - Delegates getSnapshot to QueryInspectorAPI and freezes result
 * - Forwards CacheEvents as LibraryEvents
 * - Returns unsubscribe function from subscribe
 * - dispose delegates to inspector.dispose()
 * - QueryLibraryInspectorPort has correct metadata
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { getPortMetadata, isLibraryInspector } from "@hex-di/core";
import { createQueryLibraryInspector } from "../../src/integration/library-inspector-bridge.js";
import { QueryLibraryInspectorPort } from "../../src/integration/port.js";
import type {
  QueryInspectorAPI,
  CacheStats,
  QueryDiagnosticSummary,
  QuerySuggestion,
} from "../../src/index.js";
import type { CacheListener, CacheEvent } from "../../src/cache/query-cache.js";

// =============================================================================
// Test Helpers
// =============================================================================

function createMockStats(): CacheStats {
  return {
    totalEntries: 10,
    activeEntries: 5,
    staleEntries: 2,
    errorEntries: 1,
    inFlightCount: 0,
    cacheHitRate: 0.8,
    avgFetchDurationMs: 150,
    gcEligibleCount: 3,
  };
}

function createMockDiagnostics(): QueryDiagnosticSummary {
  return {
    totalQueries: 10,
    activeQueries: 5,
    staleQueries: 2,
    errorQueries: 1,
    inFlightCount: 0,
    cacheHitRate: 0.8,
    avgFetchDurationMs: 150,
    gcEligibleCount: 3,
    totalFetches: 100,
    errorRate: 0.05,
    dedupSavings: 0,
    errorsByTag: new Map(),
  };
}

function createMockSuggestions(): ReadonlyArray<QuerySuggestion> {
  return [
    {
      type: "stale_query",
      portName: "Users",
      message: 'Query "Users" has stale data',
      action: "Consider reducing staleTime.",
    },
  ];
}

function createMockQueryPorts(): ReadonlyArray<{
  name: string;
  entryCount: number;
  observerCount: number;
}> {
  return [
    { name: "Users", entryCount: 3, observerCount: 2 },
    { name: "Posts", entryCount: 7, observerCount: 1 },
  ];
}

function createMockQueryInspectorAPI(
  overrides: Partial<QueryInspectorAPI> = {}
): QueryInspectorAPI {
  return {
    getSnapshot: vi
      .fn()
      .mockReturnValue({
        timestamp: Date.now(),
        entries: [],
        inFlight: [],
        stats: createMockStats(),
      }),
    getQuerySnapshot: vi.fn().mockReturnValue(undefined),
    subscribe: vi.fn().mockReturnValue(() => undefined),
    getCacheStats: vi.fn().mockReturnValue(createMockStats()),
    getFetchHistory: vi.fn().mockReturnValue([]),
    getInvalidationGraph: vi.fn().mockReturnValue({
      nodes: [],
      edges: [],
      cycles: [],
      maxCascadeDepth: 0,
      warnings: [],
    }),
    getQueryDependencyGraph: vi.fn().mockReturnValue({
      staticEdges: [],
      dynamicEdges: [],
      cycles: [],
    }),
    getDiagnosticSummary: vi.fn().mockReturnValue(createMockDiagnostics()),
    getQuerySuggestions: vi.fn().mockReturnValue(createMockSuggestions()),
    listQueryPorts: vi.fn().mockReturnValue(createMockQueryPorts()),
    dispose: vi.fn(),
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("createQueryLibraryInspector", () => {
  it("returns object with name 'query'", () => {
    const inspector = createMockQueryInspectorAPI();

    const libraryInspector = createQueryLibraryInspector(inspector);

    expect(libraryInspector.name).toBe("query");
  });

  it("getSnapshot returns frozen object with cache stats fields", () => {
    const mockStats = createMockStats();
    const inspector = createMockQueryInspectorAPI({
      getCacheStats: vi.fn().mockReturnValue(mockStats),
    });

    const libraryInspector = createQueryLibraryInspector(inspector);
    const snapshot = libraryInspector.getSnapshot();

    expect(Object.isFrozen(snapshot)).toBe(true);

    const stats = snapshot.stats as CacheStats;
    expect(stats.totalEntries).toBe(10);
    expect(stats.activeEntries).toBe(5);
    expect(stats.cacheHitRate).toBe(0.8);
    expect(Object.isFrozen(stats)).toBe(true);
  });

  it("getSnapshot includes diagnostics data", () => {
    const inspector = createMockQueryInspectorAPI();

    const libraryInspector = createQueryLibraryInspector(inspector);
    const snapshot = libraryInspector.getSnapshot();

    const diagnostics = snapshot.diagnostics as QueryDiagnosticSummary;
    expect(diagnostics.totalQueries).toBe(10);
    expect(diagnostics.errorRate).toBe(0.05);
    expect(diagnostics.totalFetches).toBe(100);
    expect(Object.isFrozen(diagnostics)).toBe(true);
  });

  it("getSnapshot includes suggestions array (frozen)", () => {
    const inspector = createMockQueryInspectorAPI();

    const libraryInspector = createQueryLibraryInspector(inspector);
    const snapshot = libraryInspector.getSnapshot();

    const suggestions = snapshot.suggestions as readonly QuerySuggestion[];
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      type: "stale_query",
      portName: "Users",
    });
    expect(Object.isFrozen(suggestions)).toBe(true);
    expect(Object.isFrozen(suggestions[0])).toBe(true);
  });

  it("getSnapshot includes queryPorts array (frozen)", () => {
    const inspector = createMockQueryInspectorAPI();

    const libraryInspector = createQueryLibraryInspector(inspector);
    const snapshot = libraryInspector.getSnapshot();

    const queryPorts = snapshot.queryPorts as readonly {
      name: string;
      entryCount: number;
      observerCount: number;
    }[];
    expect(queryPorts).toHaveLength(2);
    expect(queryPorts[0]).toMatchObject({ name: "Users", entryCount: 3, observerCount: 2 });
    expect(queryPorts[1]).toMatchObject({ name: "Posts", entryCount: 7, observerCount: 1 });
    expect(Object.isFrozen(queryPorts)).toBe(true);
    expect(Object.isFrozen(queryPorts[0])).toBe(true);
  });

  it("subscribe forwards CacheEvents as LibraryEvents with source 'query'", () => {
    let capturedListener: CacheListener | undefined;

    const inspector = createMockQueryInspectorAPI({
      subscribe: vi.fn((listener: CacheListener) => {
        capturedListener = listener;
        return () => undefined;
      }),
    });

    const libraryInspector = createQueryLibraryInspector(inspector);

    const listener = vi.fn();
    libraryInspector.subscribe!(listener);

    expect(capturedListener).toBeDefined();

    const cacheEvent: CacheEvent = {
      type: "updated",
      key: ["Users", "{}"] as unknown as import("../../src/cache/cache-key.js").CacheKey,
      entry: { status: "success", data: [], observerCount: 1 } as any,
    };

    capturedListener!(cacheEvent);

    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0][0];
    expect(event.source).toBe("query");
    expect(event.type).toBe("updated");
    expect(event.payload).toMatchObject({ type: "updated" });
    expect(typeof event.timestamp).toBe("number");
    expect(Object.isFrozen(event.payload)).toBe(true);
  });

  it("subscribe returns unsubscribe function that delegates", () => {
    const unsubscribeFn = vi.fn();
    const inspector = createMockQueryInspectorAPI({
      subscribe: vi.fn().mockReturnValue(unsubscribeFn),
    });

    const libraryInspector = createQueryLibraryInspector(inspector);

    const unsub = libraryInspector.subscribe!(vi.fn());
    unsub();

    expect(unsubscribeFn).toHaveBeenCalledOnce();
  });

  it("dispose delegates to inspector.dispose()", () => {
    const disposeFn = vi.fn();
    const inspector = createMockQueryInspectorAPI({
      dispose: disposeFn,
    });

    const libraryInspector = createQueryLibraryInspector(inspector);

    libraryInspector.dispose!();

    expect(disposeFn).toHaveBeenCalledOnce();
  });

  it("passes isLibraryInspector type guard", () => {
    const inspector = createMockQueryInspectorAPI();

    const libraryInspector = createQueryLibraryInspector(inspector);

    expect(isLibraryInspector(libraryInspector)).toBe(true);
  });
});

describe("QueryLibraryInspectorPort", () => {
  it("has category 'library-inspector'", () => {
    const meta = getPortMetadata(QueryLibraryInspectorPort);
    expect(meta?.category).toBe("library-inspector");
  });

  it("has name 'QueryLibraryInspector'", () => {
    expect(QueryLibraryInspectorPort.__portName).toBe("QueryLibraryInspector");
  });
});
