/**
 * Unit Tests for Unified Snapshot & InspectorAPI Integration
 *
 * Covers DoD 5 (#1-#12): Library inspector registration via InspectorAPI,
 * getUnifiedSnapshot composition, event forwarding, and disposal.
 *
 * @packageDocumentation
 */
// @ts-nocheck

import { describe, test, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import type { LibraryInspector, InspectorEvent } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}

const LoggerPort = port<Logger>()({ name: "Logger" });

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

function createTestContainer() {
  const graph = GraphBuilder.create().provide(LoggerAdapter).build();
  return createContainer({ graph, name: "Test" });
}

function createMockInspector(
  name: string,
  snapshot: Record<string, unknown> = {},
  opts: { subscribe?: boolean; dispose?: boolean } = { subscribe: true, dispose: true }
): LibraryInspector & {
  disposeFn: ReturnType<typeof vi.fn>;
  emitEvent: (event: {
    source: string;
    type: string;
    payload: Record<string, unknown>;
    timestamp: number;
  }) => void;
} {
  const listeners: Array<
    (event: {
      source: string;
      type: string;
      payload: Record<string, unknown>;
      timestamp: number;
    }) => void
  > = [];
  const disposeFn = vi.fn();

  const inspector: any = {
    name,
    getSnapshot: () => Object.freeze(snapshot),
  };

  if (opts.subscribe) {
    inspector.subscribe = (
      listener: (event: {
        source: string;
        type: string;
        payload: Record<string, unknown>;
        timestamp: number;
      }) => void
    ) => {
      listeners.push(listener);
      return () => {
        const idx = listeners.indexOf(listener);
        if (idx !== -1) listeners.splice(idx, 1);
      };
    };
  }

  if (opts.dispose) {
    inspector.dispose = disposeFn;
  }

  return {
    ...inspector,
    disposeFn,
    emitEvent(event: {
      source: string;
      type: string;
      payload: Record<string, unknown>;
      timestamp: number;
    }) {
      for (const listener of listeners) {
        listener(event);
      }
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("InspectorAPI library inspector integration", () => {
  // #1
  test("registerLibrary registers and returns unsubscribe function", () => {
    const container = createTestContainer();
    const inspector = createMockInspector("flow", { machines: 5 });

    const unsub = container.inspector.registerLibrary(inspector);

    expect(typeof unsub).toBe("function");
    expect(container.inspector.getLibraryInspector("flow")).toBeDefined();
  });

  // #2
  test("getLibraryInspectors returns all registered inspectors", () => {
    const container = createTestContainer();
    container.inspector.registerLibrary(createMockInspector("flow"));
    container.inspector.registerLibrary(createMockInspector("store"));

    const inspectors = container.inspector.getLibraryInspectors();

    expect(inspectors.size).toBe(2);
    expect(inspectors.has("flow")).toBe(true);
    expect(inspectors.has("store")).toBe(true);
  });

  // #3
  test("getLibraryInspector returns specific inspector", () => {
    const container = createTestContainer();
    container.inspector.registerLibrary(createMockInspector("flow", { count: 3 }));

    const found = container.inspector.getLibraryInspector("flow");

    expect(found).toBeDefined();
    expect(found?.name).toBe("flow");
  });

  // #4
  test("getLibraryInspector returns undefined for unknown name", () => {
    const container = createTestContainer();

    expect(container.inspector.getLibraryInspector("unknown")).toBeUndefined();
  });

  // #5
  test("unsubscribe removes inspector from registry", () => {
    const container = createTestContainer();
    const unsub = container.inspector.registerLibrary(createMockInspector("flow"));

    unsub();

    expect(container.inspector.getLibraryInspector("flow")).toBeUndefined();
  });

  // #6
  test("getUnifiedSnapshot combines container and library snapshots", () => {
    const container = createTestContainer();
    container.inspector.registerLibrary(createMockInspector("flow", { machines: 2 }));
    container.inspector.registerLibrary(createMockInspector("logger", { entries: 50 }));

    const unified = container.inspector.getUnifiedSnapshot();

    expect(unified.timestamp).toBeGreaterThan(0);
    expect(unified.container).toBeDefined();
    expect(unified.container.kind).toBe("root");
    expect(unified.libraries["flow"]).toEqual({ machines: 2 });
    expect(unified.libraries["logger"]).toEqual({ entries: 50 });
    expect(unified.registeredLibraries).toEqual(["flow", "logger"]);
  });

  // #7
  test("getUnifiedSnapshot returns sorted registeredLibraries", () => {
    const container = createTestContainer();
    container.inspector.registerLibrary(createMockInspector("store"));
    container.inspector.registerLibrary(createMockInspector("flow"));
    container.inspector.registerLibrary(createMockInspector("logger"));

    const unified = container.inspector.getUnifiedSnapshot();

    expect(unified.registeredLibraries).toEqual(["flow", "logger", "store"]);
  });

  // #8
  test("getUnifiedSnapshot returns frozen snapshot", () => {
    const container = createTestContainer();
    container.inspector.registerLibrary(createMockInspector("flow"));

    const unified = container.inspector.getUnifiedSnapshot();

    expect(Object.isFrozen(unified)).toBe(true);
    expect(Object.isFrozen(unified.libraries)).toBe(true);
    expect(Object.isFrozen(unified.registeredLibraries)).toBe(true);
  });

  // #9
  test("library events forwarded to container subscribers", () => {
    const container = createTestContainer();
    const events: InspectorEvent[] = [];
    container.inspector.subscribe(event => events.push(event));

    const inspector = createMockInspector("flow");
    container.inspector.registerLibrary(inspector);

    inspector.emitEvent({
      source: "flow",
      type: "machine-registered",
      payload: Object.freeze({ machineId: "m1" }),
      timestamp: Date.now(),
    });

    const libraryEvents = events.filter(e => e.type === "library");
    expect(libraryEvents).toHaveLength(1);
  });

  // #10
  test("library-registered event emitted on registration", () => {
    const container = createTestContainer();
    const events: InspectorEvent[] = [];
    container.inspector.subscribe(event => events.push(event));

    container.inspector.registerLibrary(createMockInspector("flow"));

    const regEvents = events.filter(e => e.type === "library-registered");
    expect(regEvents).toHaveLength(1);
  });

  // #11
  test("library-unregistered event emitted on unregistration", () => {
    const container = createTestContainer();
    const events: InspectorEvent[] = [];
    container.inspector.subscribe(event => events.push(event));

    const unsub = container.inspector.registerLibrary(createMockInspector("flow"));
    unsub();

    const unregEvents = events.filter(e => e.type === "library-unregistered");
    expect(unregEvents).toHaveLength(1);
  });

  // #12
  test("container dispose cleans up library inspectors", async () => {
    const container = createTestContainer();
    const inspector = createMockInspector("flow");
    container.inspector.registerLibrary(inspector);

    await container.dispose();

    expect(inspector.disposeFn).toHaveBeenCalledOnce();
    expect(container.inspector.getLibraryInspectors().size).toBe(0);
  });
});
