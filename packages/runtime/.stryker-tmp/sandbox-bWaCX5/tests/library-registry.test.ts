/**
 * Unit Tests for Library Registry
 *
 * Covers DoD 4 (#1-#33): Registration, replacement, event forwarding,
 * snapshot aggregation, and disposal.
 *
 * @packageDocumentation
 */
// @ts-nocheck

import { describe, test, expect, vi } from "vitest";
import type { LibraryInspector, InspectorEvent } from "@hex-di/core";
import { createLibraryRegistry } from "../src/inspection/library-registry.js";

// =============================================================================
// Test Helpers
// =============================================================================

function createMockInspector(
  name: string,
  snapshot: Record<string, unknown> = {},
  options: {
    subscribe?: boolean;
    dispose?: boolean;
  } = { subscribe: true, dispose: true }
): LibraryInspector & {
  subscribeFn: ReturnType<typeof vi.fn>;
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
  const subscribeFn = vi.fn(
    (
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
    }
  );
  const disposeFn = vi.fn();

  const inspector: any = {
    name,
    getSnapshot: () => Object.freeze(snapshot),
  };

  if (options.subscribe) {
    inspector.subscribe = subscribeFn;
  }
  if (options.dispose) {
    inspector.dispose = disposeFn;
  }

  return {
    ...inspector,
    subscribeFn,
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

function createEmitSpy(): { emit: (event: InspectorEvent) => void; events: InspectorEvent[] } {
  const events: InspectorEvent[] = [];
  return {
    emit: (event: InspectorEvent) => events.push(event),
    events,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("createLibraryRegistry", () => {
  // #1
  test("registerLibrary stores inspector and returns unsubscribe function", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();
    const inspector = createMockInspector("flow", { count: 1 });

    const unsub = registry.registerLibrary(inspector, emit);

    expect(typeof unsub).toBe("function");
    expect(registry.getLibraryInspector("flow")).toBeDefined();
  });

  // #2
  test("registerLibrary throws TypeError for null", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();

    expect(() => registry.registerLibrary(null as any, emit)).toThrow(TypeError);
  });

  // #3
  test("registerLibrary throws TypeError for object missing name", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();

    expect(() => registry.registerLibrary({ getSnapshot: () => ({}) } as any, emit)).toThrow(
      TypeError
    );
  });

  // #4
  test("registerLibrary throws TypeError for object missing getSnapshot", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();

    expect(() => registry.registerLibrary({ name: "test" } as any, emit)).toThrow(TypeError);
  });

  // #5
  test("registerLibrary throws TypeError for object with non-function subscribe", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();

    expect(() =>
      registry.registerLibrary(
        { name: "test", getSnapshot: () => ({}), subscribe: "bad" } as any,
        emit
      )
    ).toThrow(TypeError);
  });

  // #6
  test("registerLibrary replaces existing inspector with same name (last-write-wins)", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();
    const inspector1 = createMockInspector("flow", { version: 1 });
    const inspector2 = createMockInspector("flow", { version: 2 });

    registry.registerLibrary(inspector1, emit);
    registry.registerLibrary(inspector2, emit);

    const stored = registry.getLibraryInspector("flow");
    expect(stored?.getSnapshot()).toEqual(Object.freeze({ version: 2 }));
  });

  // #7
  test("registerLibrary calls dispose() on the replaced inspector", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();
    const inspector1 = createMockInspector("flow");
    const inspector2 = createMockInspector("flow");

    registry.registerLibrary(inspector1, emit);
    registry.registerLibrary(inspector2, emit);

    expect(inspector1.disposeFn).toHaveBeenCalledOnce();
  });

  // #8
  test("registerLibrary unsubscribes from the replaced inspector's events", () => {
    const registry = createLibraryRegistry();
    const { emit, events } = createEmitSpy();
    const inspector1 = createMockInspector("flow");
    const inspector2 = createMockInspector("flow");

    registry.registerLibrary(inspector1, emit);
    registry.registerLibrary(inspector2, emit);

    // Emit from old inspector should not reach container
    const eventsBefore = events.length;
    inspector1.emitEvent({ source: "flow", type: "test", payload: {}, timestamp: Date.now() });
    expect(events.length).toBe(eventsBefore);
  });

  // #9
  test("registerLibrary tolerates replaced inspector's dispose() throwing", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();
    const inspector1 = createMockInspector("flow");
    inspector1.disposeFn.mockImplementation(() => {
      throw new Error("dispose failed");
    });
    // Reassign the dispose to use the mock
    (inspector1 as any).dispose = inspector1.disposeFn;
    const inspector2 = createMockInspector("flow");

    expect(() => registry.registerLibrary(inspector2, emit)).not.toThrow();
    // Verify inspector1 was registered first
    registry.registerLibrary(inspector1, emit);
    expect(() => registry.registerLibrary(inspector2, emit)).not.toThrow();
  });

  // #10
  test("unsubscribe function removes inspector from registry", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();
    const inspector = createMockInspector("flow");

    const unsub = registry.registerLibrary(inspector, emit);
    expect(registry.getLibraryInspector("flow")).toBeDefined();

    unsub();
    expect(registry.getLibraryInspector("flow")).toBeUndefined();
  });

  // #11
  test("unsubscribe function calls inspector.dispose() if present", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();
    const inspector = createMockInspector("flow");

    const unsub = registry.registerLibrary(inspector, emit);
    unsub();

    expect(inspector.disposeFn).toHaveBeenCalledOnce();
  });

  // #12
  test("unsubscribe function is idempotent (safe to call twice)", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();
    const inspector = createMockInspector("flow");

    const unsub = registry.registerLibrary(inspector, emit);
    unsub();
    unsub(); // Second call should be a no-op

    expect(inspector.disposeFn).toHaveBeenCalledOnce();
  });

  // #13
  test("getLibraryInspectors returns map of all registered inspectors", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();
    registry.registerLibrary(createMockInspector("flow"), emit);
    registry.registerLibrary(createMockInspector("store"), emit);

    const inspectors = registry.getLibraryInspectors();

    expect(inspectors.size).toBe(2);
    expect(inspectors.has("flow")).toBe(true);
    expect(inspectors.has("store")).toBe(true);
  });

  // #14
  test("getLibraryInspectors returns new map instance each call (not internal reference)", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();
    registry.registerLibrary(createMockInspector("flow"), emit);

    const map1 = registry.getLibraryInspectors();
    const map2 = registry.getLibraryInspectors();

    expect(map1).not.toBe(map2);
  });

  // #15
  test("getLibraryInspector returns specific inspector by name", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();
    const inspector = createMockInspector("flow", { data: true });
    registry.registerLibrary(inspector, emit);

    const found = registry.getLibraryInspector("flow");

    expect(found).toBeDefined();
    expect(found?.name).toBe("flow");
  });

  // #16
  test("getLibraryInspector returns undefined for unknown name", () => {
    const registry = createLibraryRegistry();

    expect(registry.getLibraryInspector("nonexistent")).toBeUndefined();
  });

  // #17
  test("event forwarding: library subscribe events wrapped as { type: 'library', event }", () => {
    const registry = createLibraryRegistry();
    const { emit, events } = createEmitSpy();
    const inspector = createMockInspector("flow");
    registry.registerLibrary(inspector, emit);

    const libraryEvent = {
      source: "flow",
      type: "machine-registered",
      payload: Object.freeze({ machineId: "m1" }),
      timestamp: Date.now(),
    };
    inspector.emitEvent(libraryEvent);

    const libraryEvents = events.filter(e => e.type === "library");
    expect(libraryEvents).toHaveLength(1);
    expect(libraryEvents[0]).toEqual({ type: "library", event: libraryEvent });
  });

  // #18
  test("event forwarding: { type: 'library-registered', name } emitted on registration", () => {
    const registry = createLibraryRegistry();
    const { emit, events } = createEmitSpy();
    registry.registerLibrary(createMockInspector("flow"), emit);

    const regEvents = events.filter(e => e.type === "library-registered");
    expect(regEvents).toHaveLength(1);
    expect(regEvents[0]).toEqual({ type: "library-registered", name: "flow" });
  });

  // #19
  test("event forwarding: { type: 'library-unregistered', name } emitted on unregistration", () => {
    const registry = createLibraryRegistry();
    const { emit, events } = createEmitSpy();
    const unsub = registry.registerLibrary(createMockInspector("flow"), emit);
    unsub();

    const unregEvents = events.filter(e => e.type === "library-unregistered");
    expect(unregEvents).toHaveLength(1);
    expect(unregEvents[0]).toEqual({ type: "library-unregistered", name: "flow" });
  });

  // #20
  test("event forwarding: 'library-registered' emitted after inspector is stored (queryable immediately)", () => {
    const registry = createLibraryRegistry();
    let inspectorDuringEvent: LibraryInspector | undefined;

    const emit = (event: InspectorEvent) => {
      if (event.type === "library-registered") {
        inspectorDuringEvent = registry.getLibraryInspector("flow");
      }
    };

    registry.registerLibrary(createMockInspector("flow"), emit);

    expect(inspectorDuringEvent).toBeDefined();
    expect(inspectorDuringEvent?.name).toBe("flow");
  });

  // #21
  test("event forwarding: 'library-unregistered' emitted after inspector is removed", () => {
    const registry = createLibraryRegistry();
    let inspectorDuringEvent: LibraryInspector | undefined = undefined;

    const emit = (event: InspectorEvent) => {
      if (event.type === "library-unregistered") {
        inspectorDuringEvent = registry.getLibraryInspector("flow");
      }
    };

    const unsub = registry.registerLibrary(createMockInspector("flow"), emit);
    unsub();

    expect(inspectorDuringEvent).toBeUndefined();
  });

  // #22
  test("inspector without subscribe method: no event forwarding attempted", () => {
    const registry = createLibraryRegistry();
    const { emit, events } = createEmitSpy();
    const inspector = createMockInspector("flow", {}, { subscribe: false, dispose: true });

    registry.registerLibrary(inspector, emit);

    // Only library-registered event, no subscribe-based events
    expect(events.filter(e => e.type === "library")).toHaveLength(0);
    expect(inspector.subscribeFn).not.toHaveBeenCalled();
  });

  // #23
  test("inspector without dispose method: no dispose attempted on unregister", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();
    const inspector = createMockInspector("flow", {}, { subscribe: true, dispose: false });

    const unsub = registry.registerLibrary(inspector, emit);

    expect(() => unsub()).not.toThrow();
  });

  // #24
  test("getLibrarySnapshots aggregates all inspector snapshots", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();
    registry.registerLibrary(createMockInspector("flow", { machines: 3 }), emit);
    registry.registerLibrary(createMockInspector("logger", { entries: 100 }), emit);

    const snapshots = registry.getLibrarySnapshots();

    expect(snapshots["flow"]).toEqual({ machines: 3 });
    expect(snapshots["logger"]).toEqual({ entries: 100 });
  });

  // #25
  test("getLibrarySnapshots returns empty object when no inspectors registered", () => {
    const registry = createLibraryRegistry();

    const snapshots = registry.getLibrarySnapshots();

    expect(snapshots).toEqual({});
  });

  // #26
  test("getLibrarySnapshots catches failed snapshot and replaces with { error: 'snapshot-failed' }", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();
    const inspector: LibraryInspector = {
      name: "broken",
      getSnapshot() {
        throw new Error("boom");
      },
    };
    registry.registerLibrary(inspector, emit);

    const snapshots = registry.getLibrarySnapshots();

    expect(snapshots["broken"]).toEqual({ error: "snapshot-failed" });
  });

  // #27
  test("getLibrarySnapshots returns frozen result", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();
    registry.registerLibrary(createMockInspector("flow", { data: true }), emit);

    const snapshots = registry.getLibrarySnapshots();

    expect(Object.isFrozen(snapshots)).toBe(true);
  });

  // #28
  test("getLibrarySnapshots succeeds even when one inspector throws", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();
    const broken: LibraryInspector = {
      name: "broken",
      getSnapshot() {
        throw new Error("boom");
      },
    };
    registry.registerLibrary(broken, emit);
    registry.registerLibrary(createMockInspector("healthy", { ok: true }), emit);

    const snapshots = registry.getLibrarySnapshots();

    expect(snapshots["broken"]).toEqual({ error: "snapshot-failed" });
    expect(snapshots["healthy"]).toEqual({ ok: true });
  });

  // #29
  test("registry dispose unsubscribes all event listeners", () => {
    const registry = createLibraryRegistry();
    const { emit, events } = createEmitSpy();
    const inspector1 = createMockInspector("flow");
    const inspector2 = createMockInspector("store");
    registry.registerLibrary(inspector1, emit);
    registry.registerLibrary(inspector2, emit);

    registry.dispose();

    // Events from disposed inspectors should not be forwarded
    const eventsBefore = events.length;
    inspector1.emitEvent({ source: "flow", type: "test", payload: {}, timestamp: Date.now() });
    expect(events.length).toBe(eventsBefore);
  });

  // #30
  test("registry dispose calls dispose() on all inspectors", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();
    const inspector1 = createMockInspector("flow");
    const inspector2 = createMockInspector("store");
    registry.registerLibrary(inspector1, emit);
    registry.registerLibrary(inspector2, emit);

    registry.dispose();

    expect(inspector1.disposeFn).toHaveBeenCalledOnce();
    expect(inspector2.disposeFn).toHaveBeenCalledOnce();
  });

  // #31
  test("registry dispose tolerates individual dispose() throwing", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();
    const inspector1 = createMockInspector("flow");
    (inspector1 as any).dispose = () => {
      throw new Error("dispose failed");
    };
    const inspector2 = createMockInspector("store");
    registry.registerLibrary(inspector1, emit);
    registry.registerLibrary(inspector2, emit);

    expect(() => registry.dispose()).not.toThrow();
    expect(inspector2.disposeFn).toHaveBeenCalledOnce();
  });

  // #32
  test("registry dispose tolerates individual unsubscribe throwing", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();

    // Create inspector whose subscribe returns a throwing unsubscribe
    const inspector1: LibraryInspector = {
      name: "flow",
      getSnapshot: () => Object.freeze({}),
      subscribe: () => () => {
        throw new Error("unsub failed");
      },
      dispose: vi.fn(),
    };
    const inspector2 = createMockInspector("store");
    registry.registerLibrary(inspector1, emit);
    registry.registerLibrary(inspector2, emit);

    expect(() => registry.dispose()).not.toThrow();
  });

  // #33
  test("registry dispose clears all internal maps", () => {
    const registry = createLibraryRegistry();
    const { emit } = createEmitSpy();
    registry.registerLibrary(createMockInspector("flow"), emit);
    registry.registerLibrary(createMockInspector("store"), emit);

    registry.dispose();

    expect(registry.getLibraryInspectors().size).toBe(0);
    expect(registry.getLibraryInspector("flow")).toBeUndefined();
    expect(registry.getLibraryInspector("store")).toBeUndefined();
  });
});
