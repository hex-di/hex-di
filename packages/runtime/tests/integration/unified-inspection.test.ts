/**
 * Cross-Cutting Integration Tests for Unified Inspection
 *
 * Covers DoD 11 (#1-#12): Full lifecycle, multi-library, event stream,
 * sorted registration, imperative + auto-discovery mix, replacement,
 * partial failure, disposal, exports.
 *
 * @packageDocumentation
 */

import { describe, test, expect, vi } from "vitest";
import { port, createAdapter, isLibraryInspector } from "@hex-di/core";
import type { LibraryInspector, InspectorEvent, UnifiedSnapshot } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../../src/container/factory.js";

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

// Library inspector port with auto-discovery category
const FlowLibInspectorPort = port<LibraryInspector>()({
  name: "FlowLibInspector",
  category: "library-inspector",
});

const StoreLibInspectorPort = port<LibraryInspector>()({
  name: "StoreLibInspector",
  category: "library-inspector",
});

function createMockInspector(
  name: string,
  snapshot: Record<string, unknown> = {}
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

  return {
    name,
    getSnapshot: () => Object.freeze(snapshot),
    subscribe(
      listener: (event: {
        source: string;
        type: string;
        payload: Record<string, unknown>;
        timestamp: number;
      }) => void
    ) {
      listeners.push(listener);
      return () => {
        const idx = listeners.indexOf(listener);
        if (idx !== -1) listeners.splice(idx, 1);
      };
    },
    dispose: disposeFn,
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

function createTestContainer() {
  const graph = GraphBuilder.create().provide(LoggerAdapter).build();
  return createContainer({ graph, name: "Test" });
}

// =============================================================================
// Tests
// =============================================================================

describe("Unified inspection integration", () => {
  // #1 - Full lifecycle: register, query, unregister, verify cleanup
  test("full lifecycle: register, query snapshot, unregister, verify cleanup", () => {
    const container = createTestContainer();
    const flow = createMockInspector("flow", { machines: 3 });

    const unsub = container.inspector.registerLibrary(flow);

    const snapshot = container.inspector.getUnifiedSnapshot();
    expect(snapshot.libraries["flow"]).toEqual({ machines: 3 });
    expect(snapshot.registeredLibraries).toContain("flow");

    unsub();

    const after = container.inspector.getUnifiedSnapshot();
    expect(after.libraries["flow"]).toBeUndefined();
    expect(after.registeredLibraries).not.toContain("flow");
  });

  // #2 - Multi-library: register multiple libraries and verify unified snapshot
  test("multi-library unified snapshot aggregates all libraries", () => {
    const container = createTestContainer();
    container.inspector.registerLibrary(createMockInspector("flow", { machines: 5 }));
    container.inspector.registerLibrary(createMockInspector("store", { slices: 3 }));
    container.inspector.registerLibrary(createMockInspector("logger", { entries: 100 }));

    const snapshot = container.inspector.getUnifiedSnapshot();

    expect(snapshot.registeredLibraries).toEqual(["flow", "logger", "store"]);
    expect(snapshot.libraries["flow"]).toEqual({ machines: 5 });
    expect(snapshot.libraries["store"]).toEqual({ slices: 3 });
    expect(snapshot.libraries["logger"]).toEqual({ entries: 100 });
    expect(snapshot.container).toBeDefined();
    expect(snapshot.timestamp).toBeGreaterThan(0);
  });

  // #3 - Event stream: verify all event types are emitted in correct order
  test("event stream includes all library event types in order", () => {
    const container = createTestContainer();
    const events: InspectorEvent[] = [];
    container.inspector.subscribe(e => events.push(e));

    const flow = createMockInspector("flow");
    const unsub = container.inspector.registerLibrary(flow);

    // Emit library event
    flow.emitEvent({
      source: "flow",
      type: "machine-added",
      payload: Object.freeze({}),
      timestamp: Date.now(),
    });

    unsub();

    const types = events.map(e => e.type);
    expect(types).toContain("library-registered");
    expect(types).toContain("library");
    expect(types).toContain("library-unregistered");

    // Verify order: registered before library event before unregistered
    const regIdx = types.indexOf("library-registered");
    const libIdx = types.indexOf("library");
    const unregIdx = types.indexOf("library-unregistered");
    expect(regIdx).toBeLessThan(libIdx);
    expect(libIdx).toBeLessThan(unregIdx);
  });

  // #4 - Sorted registration: registeredLibraries is always sorted
  test("registeredLibraries is always alphabetically sorted", () => {
    const container = createTestContainer();

    container.inspector.registerLibrary(createMockInspector("zebra"));
    container.inspector.registerLibrary(createMockInspector("alpha"));
    container.inspector.registerLibrary(createMockInspector("middle"));

    const snapshot = container.inspector.getUnifiedSnapshot();
    expect(snapshot.registeredLibraries).toEqual(["alpha", "middle", "zebra"]);
  });

  // #5 - Mix imperative + auto-discovery
  test("imperative registration and auto-discovery coexist", () => {
    const flowInspector: LibraryInspector = {
      name: "flow",
      getSnapshot: () => Object.freeze({ machines: 1 }),
    };

    const FlowInspectorAdapter = createAdapter({
      provides: FlowLibInspectorPort,
      requires: [],
      lifetime: "singleton",
      factory: () => flowInspector,
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(FlowInspectorAdapter)
      .build();
    const container = createContainer({ graph, name: "Test" });

    // Imperative registration
    container.inspector.registerLibrary(createMockInspector("store", { slices: 2 }));

    // Auto-discovery
    container.resolve(FlowLibInspectorPort);

    const snapshot = container.inspector.getUnifiedSnapshot();
    expect(snapshot.registeredLibraries).toEqual(["flow", "store"]);
  });

  // #6 - Replacement: last-write-wins for same name
  test("replacement: last-write-wins for same library name", () => {
    const container = createTestContainer();
    const v1 = createMockInspector("flow", { version: 1 });
    const v2 = createMockInspector("flow", { version: 2 });

    container.inspector.registerLibrary(v1);
    container.inspector.registerLibrary(v2);

    const snapshot = container.inspector.getUnifiedSnapshot();
    expect(snapshot.libraries["flow"]).toEqual({ version: 2 });
    expect(v1.disposeFn).toHaveBeenCalledOnce();
  });

  // #7 - Partial failure: one library snapshot failure doesn't break others
  test("partial failure: one library snapshot failure replaced with error sentinel", () => {
    const container = createTestContainer();
    const broken: LibraryInspector = {
      name: "broken",
      getSnapshot() {
        throw new Error("snapshot failed");
      },
    };
    container.inspector.registerLibrary(broken);
    container.inspector.registerLibrary(createMockInspector("healthy", { ok: true }));

    const snapshot = container.inspector.getUnifiedSnapshot();
    expect(snapshot.libraries["broken"]).toEqual({ error: "snapshot-failed" });
    expect(snapshot.libraries["healthy"]).toEqual({ ok: true });
  });

  // #8 - Disposal: container dispose cleans up all libraries
  test("container disposal cleans up all library inspectors", async () => {
    const container = createTestContainer();
    const flow = createMockInspector("flow");
    const store = createMockInspector("store");

    container.inspector.registerLibrary(flow);
    container.inspector.registerLibrary(store);

    await container.dispose();

    expect(flow.disposeFn).toHaveBeenCalledOnce();
    expect(store.disposeFn).toHaveBeenCalledOnce();
    expect(container.inspector.getLibraryInspectors().size).toBe(0);
  });

  // #9 - UnifiedSnapshot structure validation
  test("UnifiedSnapshot has all required fields with correct types", () => {
    const container = createTestContainer();
    container.inspector.registerLibrary(createMockInspector("flow"));

    const snapshot: UnifiedSnapshot = container.inspector.getUnifiedSnapshot();

    expect(typeof snapshot.timestamp).toBe("number");
    expect(snapshot.container).toBeDefined();
    expect(typeof snapshot.libraries).toBe("object");
    expect(Array.isArray(snapshot.registeredLibraries)).toBe(true);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  // #10 - isLibraryInspector type guard validates protocol
  test("isLibraryInspector correctly validates and rejects objects", () => {
    expect(isLibraryInspector({ name: "test", getSnapshot: () => ({}) })).toBe(true);
    expect(isLibraryInspector({ name: "", getSnapshot: () => ({}) })).toBe(false);
    expect(isLibraryInspector(null)).toBe(false);
    expect(isLibraryInspector({ name: "test" })).toBe(false);
  });

  // #11 - Auto-discovery with multiple library-inspector ports
  test("auto-discovery with multiple library-inspector ports", () => {
    const flowInspector: LibraryInspector = {
      name: "flow",
      getSnapshot: () => Object.freeze({ machines: 1 }),
    };
    const storeInspector: LibraryInspector = {
      name: "store",
      getSnapshot: () => Object.freeze({ slices: 2 }),
    };

    const FlowInspectorAdapter = createAdapter({
      provides: FlowLibInspectorPort,
      requires: [],
      lifetime: "singleton",
      factory: () => flowInspector,
    });
    const StoreInspectorAdapter = createAdapter({
      provides: StoreLibInspectorPort,
      requires: [],
      lifetime: "singleton",
      factory: () => storeInspector,
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(FlowInspectorAdapter)
      .provide(StoreInspectorAdapter)
      .build();
    const container = createContainer({ graph, name: "Test" });

    container.resolve(FlowLibInspectorPort);
    container.resolve(StoreLibInspectorPort);

    const snapshot = container.inspector.getUnifiedSnapshot();
    expect(snapshot.registeredLibraries).toEqual(["flow", "store"]);
    expect(snapshot.libraries["flow"]).toEqual({ machines: 1 });
    expect(snapshot.libraries["store"]).toEqual({ slices: 2 });
  });

  // #12 - Exports verification: all new types and functions exported from core and runtime
  test("all new types and functions are exported from @hex-di/core", async () => {
    const core = await import("@hex-di/core");

    // Runtime export
    expect(typeof core.isLibraryInspector).toBe("function");

    // Type exports are verified by type-level tests, but we verify the function exists
    expect(core.isLibraryInspector).toBeDefined();
  });
});
