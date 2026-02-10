/**
 * Tests for createStoreLibraryInspector
 *
 * Verifies that the library inspector bridge correctly:
 * - Reports name "store"
 * - Delegates getSnapshot to StoreInspectorAPI and freezes result
 * - Forwards StoreInspectorEvents as LibraryEvents
 * - Returns unsubscribe function from subscribe
 * - dispose is a no-op
 * - StoreLibraryInspectorPort has correct metadata
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { getPortMetadata } from "@hex-di/core";
import { createStoreLibraryInspector } from "../../src/integration/library-inspector-bridge.js";
import { StoreLibraryInspectorPort } from "../../src/types/inspection.js";
import type {
  StoreInspectorAPI,
  StoreInspectorListener,
  StoreSnapshot,
  StoreInspectorEvent,
} from "../../src/types/inspection.js";

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
      {
        kind: "atom",
        portName: "ThemeAtom",
        value: "dark",
        subscriberCount: 1,
      },
    ],
    totalSubscribers: 3,
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

describe("createStoreLibraryInspector", () => {
  it("returns object with name 'store'", () => {
    const inspector = createMockStoreInspectorAPI();

    const libraryInspector = createStoreLibraryInspector(inspector);

    expect(libraryInspector.name).toBe("store");
  });

  it("getSnapshot delegates to StoreInspectorAPI.getSnapshot()", () => {
    const mockSnapshot = createMockSnapshot();
    const inspector = createMockStoreInspectorAPI({
      getSnapshot: vi.fn().mockReturnValue(mockSnapshot),
    });

    const libraryInspector = createStoreLibraryInspector(inspector);
    const snapshot = libraryInspector.getSnapshot();

    expect(inspector.getSnapshot).toHaveBeenCalledOnce();
    expect(snapshot.timestamp).toBe(1000);
    expect(snapshot.totalSubscribers).toBe(3);
    expect(snapshot.pendingEffects).toBe(0);

    const ports = snapshot.ports as readonly Record<string, unknown>[];
    expect(ports).toHaveLength(2);
    expect(ports[0]).toMatchObject({ kind: "state", portName: "CounterState" });
    expect(ports[1]).toMatchObject({ kind: "atom", portName: "ThemeAtom" });
  });

  it("getSnapshot result is frozen", () => {
    const inspector = createMockStoreInspectorAPI();

    const libraryInspector = createStoreLibraryInspector(inspector);
    const snapshot = libraryInspector.getSnapshot();

    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("subscribe forwards StoreInspectorEvent as LibraryEvent with correct fields", () => {
    let capturedListener: StoreInspectorListener | undefined;

    const inspector = createMockStoreInspectorAPI({
      subscribe: vi.fn((listener: StoreInspectorListener) => {
        capturedListener = listener;
        return () => undefined;
      }),
    });

    const libraryInspector = createStoreLibraryInspector(inspector);

    const listener = vi.fn();
    libraryInspector.subscribe!(listener);

    expect(capturedListener).toBeDefined();

    const storeEvent: StoreInspectorEvent = {
      type: "state-changed",
      portName: "CounterState",
    };

    capturedListener!(storeEvent);

    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0][0];
    expect(event.source).toBe("store");
    expect(event.type).toBe("state-changed");
    expect(event.payload).toEqual({ type: "state-changed", portName: "CounterState" });
    expect(typeof event.timestamp).toBe("number");
    expect(Object.isFrozen(event.payload)).toBe(true);
  });

  it("subscribe forwards action-dispatched events", () => {
    let capturedListener: StoreInspectorListener | undefined;

    const inspector = createMockStoreInspectorAPI({
      subscribe: vi.fn((listener: StoreInspectorListener) => {
        capturedListener = listener;
        return () => undefined;
      }),
    });

    const libraryInspector = createStoreLibraryInspector(inspector);
    const listener = vi.fn();
    libraryInspector.subscribe!(listener);

    const storeEvent: StoreInspectorEvent = {
      type: "action-dispatched",
      entry: {
        id: "entry-1",
        portName: "CounterState",
        actionName: "increment",
        payload: undefined,
        prevState: { count: 0 },
        nextState: { count: 1 },
        timestamp: 1234,
        effectStatus: "none",
        parentId: null,
        order: 0,
      },
    };

    capturedListener!(storeEvent);

    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0][0];
    expect(event.source).toBe("store");
    expect(event.type).toBe("action-dispatched");
  });

  it("subscribe returns unsubscribe function that delegates", () => {
    const unsubscribeFn = vi.fn();
    const inspector = createMockStoreInspectorAPI({
      subscribe: vi.fn().mockReturnValue(unsubscribeFn),
    });

    const libraryInspector = createStoreLibraryInspector(inspector);

    const unsub = libraryInspector.subscribe!(vi.fn());
    unsub();

    expect(unsubscribeFn).toHaveBeenCalledOnce();
  });

  it("dispose is a no-op and does not throw", () => {
    const inspector = createMockStoreInspectorAPI();

    const libraryInspector = createStoreLibraryInspector(inspector);

    expect(() => libraryInspector.dispose!()).not.toThrow();
  });
});

describe("StoreLibraryInspectorPort", () => {
  it("has category 'library-inspector'", () => {
    const meta = getPortMetadata(StoreLibraryInspectorPort);
    expect(meta?.category).toBe("library-inspector");
  });

  it("has name 'StoreLibraryInspector'", () => {
    expect(StoreLibraryInspectorPort.__portName).toBe("StoreLibraryInspector");
  });
});
