/**
 * Deep mutation-killing tests for src/inspection/internal-helpers.ts
 *
 * Targets survived mutants:
 * - detectContainerKindFromInternal: inheritanceModes !== undefined check
 * - detectPhaseFromSnapshot: isDisposed check, switch cases
 * - buildTypedSnapshotFromInternal: switch cases
 * - convertToDevToolsSingleton: resolvedAt ?? 0 coalescing
 * - buildRootSnapshot: isInitialized === "initialized" check, freeze
 * - buildChildSnapshot: parentId "unknown", inheritanceModes empty Map
 * - buildLazySnapshot: isLoaded === "loaded" check
 * - buildScopeSnapshot: scopeId, parentScopeId null
 */
import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import type { InspectorAPI } from "../src/inspection/types.js";
import { INTERNAL_ACCESS } from "../src/inspection/symbols.js";
import {
  detectContainerKindFromInternal,
  detectPhaseFromSnapshot,
  buildTypedSnapshotFromInternal,
} from "../src/inspection/internal-helpers.js";

// =============================================================================
// Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });

function getInspector(container: any): InspectorAPI {
  return container.inspector;
}

// =============================================================================
// detectContainerKindFromInternal
// =============================================================================

describe("detectContainerKindFromInternal", () => {
  it("returns 'root' when inheritanceModes is undefined", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Root" });
    const state = container[INTERNAL_ACCESS]();

    const kind = detectContainerKindFromInternal(state);
    expect(kind).toBe("root");
  });

  it("returns 'child' when inheritanceModes is defined", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const parent = createContainer({ graph, name: "Parent" });
    const child = parent.createChild(GraphBuilder.create().build(), { name: "Child" });
    const state = child[INTERNAL_ACCESS]();

    const kind = detectContainerKindFromInternal(state);
    expect(kind).toBe("child");
  });
});

// =============================================================================
// detectPhaseFromSnapshot
// =============================================================================

describe("detectPhaseFromSnapshot", () => {
  it("returns 'disposed' when isDisposed is true", () => {
    const snapshot = {
      isDisposed: true,
      containerName: "Test",
      singletons: [],
      scopes: {
        id: "container",
        status: "disposed" as const,
        resolvedCount: 0,
        totalCount: 0,
        children: [],
        resolvedPorts: [],
      },
    };
    expect(detectPhaseFromSnapshot(snapshot, "root")).toBe("disposed");
  });

  it("returns 'initialized' for root kind", () => {
    const snapshot = {
      isDisposed: false,
      containerName: "Test",
      singletons: [],
      scopes: {
        id: "container",
        status: "active" as const,
        resolvedCount: 0,
        totalCount: 0,
        children: [],
        resolvedPorts: [],
      },
    };
    expect(detectPhaseFromSnapshot(snapshot, "root")).toBe("initialized");
  });

  it("returns 'initialized' for child kind", () => {
    const snapshot = {
      isDisposed: false,
      containerName: "Test",
      singletons: [],
      scopes: {
        id: "container",
        status: "active" as const,
        resolvedCount: 0,
        totalCount: 0,
        children: [],
        resolvedPorts: [],
      },
    };
    expect(detectPhaseFromSnapshot(snapshot, "child")).toBe("initialized");
  });

  it("returns 'loaded' for lazy kind", () => {
    const snapshot = {
      isDisposed: false,
      containerName: "Test",
      singletons: [],
      scopes: {
        id: "container",
        status: "active" as const,
        resolvedCount: 0,
        totalCount: 0,
        children: [],
        resolvedPorts: [],
      },
    };
    expect(detectPhaseFromSnapshot(snapshot, "lazy")).toBe("loaded");
  });

  it("returns 'active' for scope kind", () => {
    const snapshot = {
      isDisposed: false,
      containerName: "Test",
      singletons: [],
      scopes: {
        id: "scope-1",
        status: "active" as const,
        resolvedCount: 0,
        totalCount: 0,
        children: [],
        resolvedPorts: [],
      },
    };
    expect(detectPhaseFromSnapshot(snapshot, "scope")).toBe("active");
  });
});

// =============================================================================
// buildTypedSnapshotFromInternal
// =============================================================================

describe("buildTypedSnapshotFromInternal", () => {
  it("root kind builds RootContainerSnapshot", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const state = container[INTERNAL_ACCESS]();

    const runtimeSnapshot = {
      isDisposed: false,
      containerName: "Test",
      singletons: [{ portName: "Logger", lifetime: "singleton" as const, isResolved: false }],
      scopes: {
        id: "container",
        status: "active" as const,
        resolvedCount: 0,
        totalCount: 1,
        children: [],
        resolvedPorts: [],
      },
    };

    const snapshot = buildTypedSnapshotFromInternal(runtimeSnapshot, "root", state);
    expect(snapshot.kind).toBe("root");
    expect(Object.isFrozen(snapshot)).toBe(true);
    if (snapshot.kind === "root") {
      expect(snapshot.isInitialized).toBe(true);
      expect(snapshot.asyncAdaptersTotal).toBe(0);
      expect(snapshot.asyncAdaptersInitialized).toBe(0);
    }
  });

  it("child kind builds ChildContainerSnapshot", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const parent = createContainer({ graph, name: "Parent" });
    const child = parent.createChild(GraphBuilder.create().build(), { name: "Child" });
    const state = child[INTERNAL_ACCESS]();

    const runtimeSnapshot = {
      isDisposed: false,
      containerName: "Child",
      singletons: [],
      scopes: {
        id: "container",
        status: "active" as const,
        resolvedCount: 0,
        totalCount: 0,
        children: [],
        resolvedPorts: [],
      },
    };

    const snapshot = buildTypedSnapshotFromInternal(runtimeSnapshot, "child", state);
    expect(snapshot.kind).toBe("child");
    expect(Object.isFrozen(snapshot)).toBe(true);
    if (snapshot.kind === "child") {
      expect(snapshot.parentId).toBe("unknown");
      expect(snapshot.inheritanceModes).toBeInstanceOf(Map);
    }
  });

  it("lazy kind builds LazyContainerSnapshot", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const state = container[INTERNAL_ACCESS]();

    const runtimeSnapshot = {
      isDisposed: false,
      containerName: "Test",
      singletons: [],
      scopes: {
        id: "container",
        status: "active" as const,
        resolvedCount: 0,
        totalCount: 0,
        children: [],
        resolvedPorts: [],
      },
    };

    const snapshot = buildTypedSnapshotFromInternal(runtimeSnapshot, "lazy", state);
    expect(snapshot.kind).toBe("lazy");
    expect(Object.isFrozen(snapshot)).toBe(true);
    if (snapshot.kind === "lazy") {
      expect(snapshot.isLoaded).toBe(true);
    }
  });

  it("scope kind builds ScopeSnapshot", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const state = container[INTERNAL_ACCESS]();

    const runtimeSnapshot = {
      isDisposed: false,
      containerName: "Test",
      singletons: [],
      scopes: {
        id: "scope-1",
        status: "active" as const,
        resolvedCount: 0,
        totalCount: 0,
        children: [],
        resolvedPorts: [],
      },
    };

    const snapshot = buildTypedSnapshotFromInternal(runtimeSnapshot, "scope", state);
    expect(snapshot.kind).toBe("scope");
    expect(Object.isFrozen(snapshot)).toBe(true);
    if (snapshot.kind === "scope") {
      expect(snapshot.scopeId).toBe("scope-1");
      expect(snapshot.parentScopeId).toBeNull();
    }
  });

  it("convertToDevToolsSingleton: resolvedAt defaults to 0 when undefined", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const state = container[INTERNAL_ACCESS]();

    // Singleton without resolvedAt (undefined)
    const runtimeSnapshot = {
      isDisposed: false,
      containerName: "Test",
      singletons: [
        {
          portName: "Logger",
          lifetime: "singleton" as const,
          isResolved: false,
          resolvedAt: undefined,
        },
      ],
      scopes: {
        id: "container",
        status: "active" as const,
        resolvedCount: 0,
        totalCount: 1,
        children: [],
        resolvedPorts: [],
      },
    };

    const snapshot = buildTypedSnapshotFromInternal(runtimeSnapshot, "root", state);
    if (snapshot.kind === "root") {
      expect(snapshot.singletons[0].resolvedAt).toBe(0);
    }
  });

  it("disposed root returns 'disposed' phase", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const state = container[INTERNAL_ACCESS]();

    const runtimeSnapshot = {
      isDisposed: true,
      containerName: "Test",
      singletons: [],
      scopes: {
        id: "container",
        status: "disposed" as const,
        resolvedCount: 0,
        totalCount: 0,
        children: [],
        resolvedPorts: [],
      },
    };

    const snapshot = buildTypedSnapshotFromInternal(runtimeSnapshot, "root", state);
    expect(snapshot.phase).toBe("disposed");
    expect(snapshot.isDisposed).toBe(true);
    if (snapshot.kind === "root") {
      expect(snapshot.isInitialized).toBe(false); // disposed !== initialized
    }
  });
});

// =============================================================================
// Integration: getSnapshot through inspector
// =============================================================================

describe("InspectorAPI getSnapshot integration", () => {
  it("root container snapshot is correct", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const inspector = getInspector(container);

    const snapshot = inspector.getSnapshot();
    expect(snapshot.kind).toBe("root");
    expect(snapshot.containerName).toBe("Test");
    expect(snapshot.isDisposed).toBe(false);
    expect(snapshot.phase).toBe("initialized");
    expect(snapshot.singletons.length).toBe(1);
    expect(snapshot.singletons[0].portName).toBe("Logger");
    expect(snapshot.singletons[0].isResolved).toBe(false);
  });

  it("root container snapshot after resolution", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    container.resolve(LoggerPort);
    const inspector = getInspector(container);

    const snapshot = inspector.getSnapshot();
    expect(snapshot.singletons.length).toBe(1);
    expect(snapshot.singletons[0].isResolved).toBe(true);
    expect(snapshot.singletons[0].resolvedAt).toBeGreaterThan(0);
  });
});
