/**
 * Tests for src/inspection/internal-helpers.ts
 */
// @ts-nocheck

import { describe, it, expect } from "vitest";
import {
  detectContainerKindFromInternal,
  detectPhaseFromSnapshot,
  buildTypedSnapshotFromInternal,
} from "../src/inspection/internal-helpers.js";
import type {
  ContainerInternalState,
  ContainerSnapshot as RuntimeSnapshot,
} from "../src/inspection/internal-state-types.js";

function makeInternalState(
  overrides: Partial<ContainerInternalState> = {}
): ContainerInternalState {
  return {
    disposed: false,
    singletonMemo: { size: 0, entries: [] },
    childScopes: [],
    childContainers: [],
    adapterMap: new Map(),
    containerId: "root",
    containerName: "Test",
    overridePorts: new Set(),
    isOverride: () => false,
    ...overrides,
  } as ContainerInternalState;
}

function makeRuntimeSnapshot(overrides: Partial<RuntimeSnapshot> = {}): RuntimeSnapshot {
  return {
    isDisposed: false,
    singletons: [],
    scopes: {
      id: "container",
      status: "active",
      resolvedCount: 0,
      totalCount: 0,
      children: [],
      resolvedPorts: [],
    },
    containerName: "Test",
    ...overrides,
  };
}

describe("detectContainerKindFromInternal", () => {
  it("returns 'child' when inheritanceModes is defined", () => {
    const state = makeInternalState({ inheritanceModes: new Map() });
    expect(detectContainerKindFromInternal(state)).toBe("child");
  });

  it("returns 'root' when inheritanceModes is undefined", () => {
    const state = makeInternalState();
    expect(detectContainerKindFromInternal(state)).toBe("root");
  });
});

describe("detectPhaseFromSnapshot", () => {
  it("returns 'disposed' when isDisposed is true", () => {
    const snapshot = makeRuntimeSnapshot({ isDisposed: true });
    expect(detectPhaseFromSnapshot(snapshot, "root")).toBe("disposed");
  });

  it("returns 'initialized' for root kind", () => {
    const snapshot = makeRuntimeSnapshot();
    expect(detectPhaseFromSnapshot(snapshot, "root")).toBe("initialized");
  });

  it("returns 'initialized' for child kind", () => {
    const snapshot = makeRuntimeSnapshot();
    expect(detectPhaseFromSnapshot(snapshot, "child")).toBe("initialized");
  });

  it("returns 'loaded' for lazy kind", () => {
    const snapshot = makeRuntimeSnapshot();
    expect(detectPhaseFromSnapshot(snapshot, "lazy")).toBe("loaded");
  });

  it("returns 'active' for scope kind", () => {
    const snapshot = makeRuntimeSnapshot();
    expect(detectPhaseFromSnapshot(snapshot, "scope")).toBe("active");
  });

  it("returns 'initialized' for unknown kind (default)", () => {
    const snapshot = makeRuntimeSnapshot();
    expect(detectPhaseFromSnapshot(snapshot, "unknown" as any)).toBe("initialized");
  });
});

describe("buildTypedSnapshotFromInternal", () => {
  it("builds root snapshot", () => {
    const snapshot = makeRuntimeSnapshot({ containerName: "MyApp" });
    const state = makeInternalState();
    const result = buildTypedSnapshotFromInternal(snapshot, "root", state);

    expect(result.kind).toBe("root");
    expect(result.containerName).toBe("MyApp");
    expect(Object.isFrozen(result)).toBe(true);
    if (result.kind === "root") {
      expect(result.isInitialized).toBe(true);
      expect(result.asyncAdaptersTotal).toBe(0);
      expect(result.asyncAdaptersInitialized).toBe(0);
    }
  });

  it("builds child snapshot", () => {
    const snapshot = makeRuntimeSnapshot();
    const state = makeInternalState({ inheritanceModes: new Map() });
    const result = buildTypedSnapshotFromInternal(snapshot, "child", state);

    expect(result.kind).toBe("child");
    if (result.kind === "child") {
      expect(result.parentId).toBe("unknown");
      expect(result.inheritanceModes).toBeInstanceOf(Map);
    }
  });

  it("builds lazy snapshot", () => {
    const snapshot = makeRuntimeSnapshot();
    const state = makeInternalState();
    const result = buildTypedSnapshotFromInternal(snapshot, "lazy", state);

    expect(result.kind).toBe("lazy");
    if (result.kind === "lazy") {
      expect(result.isLoaded).toBe(true); // phase is "loaded"
    }
  });

  it("builds scope snapshot with scopeId from scopes.id", () => {
    const snapshot = makeRuntimeSnapshot({
      scopes: {
        id: "scope-42",
        status: "active",
        resolvedCount: 0,
        totalCount: 0,
        children: [],
        resolvedPorts: [],
      },
    });
    const state = makeInternalState();
    const result = buildTypedSnapshotFromInternal(snapshot, "scope", state);

    expect(result.kind).toBe("scope");
    if (result.kind === "scope") {
      expect(result.scopeId).toBe("scope-42");
      expect(result.parentScopeId).toBeNull();
    }
  });

  it("handles disposed snapshot", () => {
    const snapshot = makeRuntimeSnapshot({ isDisposed: true });
    const state = makeInternalState();
    const result = buildTypedSnapshotFromInternal(snapshot, "root", state);

    expect(result.isDisposed).toBe(true);
    if (result.kind === "root") {
      expect(result.phase).toBe("disposed");
      expect(result.isInitialized).toBe(false);
    }
  });

  it("falls back to root for unknown kind", () => {
    const snapshot = makeRuntimeSnapshot();
    const state = makeInternalState();
    const result = buildTypedSnapshotFromInternal(snapshot, "unknown" as any, state);

    expect(result.kind).toBe("root");
  });

  it("converts singletons with proper resolvedAt fallback", () => {
    const snapshot = makeRuntimeSnapshot({
      singletons: [
        { portName: "A", isResolved: true, resolvedAt: 100, lifetime: "singleton" },
        { portName: "B", isResolved: false, resolvedAt: undefined, lifetime: "singleton" },
      ],
    });
    const state = makeInternalState();
    const result = buildTypedSnapshotFromInternal(snapshot, "root", state);

    expect(result.singletons).toHaveLength(2);
    expect(result.singletons[0].resolvedAt).toBe(100);
    expect(result.singletons[1].resolvedAt).toBe(0);
  });
});
