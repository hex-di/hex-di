/**
 * Tests for StoreLibraryInspectorAdapter
 *
 * Verifies that the frozen singleton adapter correctly:
 * - Is frozen (immutable)
 * - Provides StoreLibraryInspectorPort
 * - Requires [StoreInspectorPort]
 * - Has singleton lifetime and sync factoryKind
 * - Factory returns valid LibraryInspector (name, getSnapshot, subscribe, dispose)
 * - Factory delegates getSnapshot to provided StoreInspectorAPI mock
 * - Port has category "library-inspector" metadata (auto-registration precondition)
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { getPortMetadata } from "@hex-di/core";
import { StoreLibraryInspectorAdapter } from "../../src/integration/library-inspector-adapter.js";
import { StoreLibraryInspectorPort, StoreInspectorPort } from "../../src/types/inspection.js";
import type { StoreInspectorAPI, StoreSnapshot } from "../../src/types/inspection.js";

// =============================================================================
// Test Helpers
// =============================================================================

function createMockSnapshot(): StoreSnapshot {
  return {
    timestamp: 1000,
    ports: [
      {
        kind: "state",
        portName: "CounterState",
        state: { count: 0 },
        subscriberCount: 2,
        actionCount: 5,
        lastActionAt: 900,
      },
    ],
    totalSubscribers: 2,
    pendingEffects: 0,
  };
}

function createMockStoreInspectorAPI(
  overrides: Partial<StoreInspectorAPI> = {}
): StoreInspectorAPI {
  return {
    getSnapshot: vi.fn().mockReturnValue(createMockSnapshot()),
    getPortState: vi.fn().mockReturnValue(undefined),
    listStatePorts: vi.fn().mockReturnValue([]),
    getSubscriberGraph: vi.fn().mockReturnValue({
      correlationId: "test",
      nodes: [],
      edges: [],
    }),
    getActionHistory: vi.fn().mockReturnValue([]),
    subscribe: vi.fn().mockReturnValue(() => undefined),
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("StoreLibraryInspectorAdapter", () => {
  it("is frozen", () => {
    expect(Object.isFrozen(StoreLibraryInspectorAdapter)).toBe(true);
  });

  it("provides StoreLibraryInspectorPort", () => {
    expect(StoreLibraryInspectorAdapter.provides).toBe(StoreLibraryInspectorPort);
  });

  it("requires [StoreInspectorPort]", () => {
    expect(StoreLibraryInspectorAdapter.requires).toHaveLength(1);
    expect(StoreLibraryInspectorAdapter.requires[0]).toBe(StoreInspectorPort);
  });

  it("has singleton lifetime", () => {
    expect(StoreLibraryInspectorAdapter.lifetime).toBe("singleton");
  });

  it("has sync factoryKind", () => {
    expect(StoreLibraryInspectorAdapter.factoryKind).toBe("sync");
  });

  it("is not clonable", () => {
    expect(StoreLibraryInspectorAdapter.clonable).toBe(false);
  });

  it("factory returns a LibraryInspector with name, getSnapshot, subscribe, dispose", () => {
    const mockInspector = createMockStoreInspectorAPI();

    const result = StoreLibraryInspectorAdapter.factory({
      StoreInspector: mockInspector,
    });

    expect(result.name).toBe("store");
    expect(typeof result.getSnapshot).toBe("function");
    expect(typeof result.subscribe).toBe("function");
    expect(typeof result.dispose).toBe("function");
  });

  it("factory delegates getSnapshot to provided StoreInspectorAPI", () => {
    const mockSnapshot = createMockSnapshot();
    const mockInspector = createMockStoreInspectorAPI({
      getSnapshot: vi.fn().mockReturnValue(mockSnapshot),
    });

    const result = StoreLibraryInspectorAdapter.factory({
      StoreInspector: mockInspector,
    });

    const snapshot = result.getSnapshot();

    expect(mockInspector.getSnapshot).toHaveBeenCalledOnce();
    expect(snapshot.timestamp).toBe(1000);
    expect(snapshot.totalSubscribers).toBe(2);
  });
});

describe("StoreLibraryInspectorPort (auto-registration precondition)", () => {
  it("has category 'library-inspector'", () => {
    const meta = getPortMetadata(StoreLibraryInspectorPort);
    expect(meta?.category).toBe("library-inspector");
  });
});
