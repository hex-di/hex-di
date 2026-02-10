/**
 * Mutation-killing tests for src/inspection/internal-helpers.ts
 *
 * Targets survived mutants in:
 * - detectContainerKindFromInternal: inheritanceModes check
 * - detectPhaseFromSnapshot: isDisposed, switch cases
 * - buildTypedSnapshotFromInternal: switch cases, convertToDevToolsSingleton
 * - buildRootSnapshot: isInitialized === phase === "initialized"
 * - buildChildSnapshot: parentId "unknown", inheritanceModes empty Map
 * - buildLazySnapshot: isLoaded === phase === "loaded"
 * - buildScopeSnapshot: parentScopeId null, scopeId
 */
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

// =============================================================================
// Mock helpers
// =============================================================================

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
  };
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

// =============================================================================
// detectContainerKindFromInternal
// =============================================================================

describe("detectContainerKindFromInternal (mutant killing)", () => {
  it("returns 'child' when inheritanceModes is defined", () => {
    const state = makeInternalState({ inheritanceModes: new Map() });
    expect(detectContainerKindFromInternal(state)).toBe("child");
  });

  it("returns 'child' even with non-empty inheritanceModes", () => {
    const state = makeInternalState({ inheritanceModes: new Map([["Logger", "shared"]]) });
    expect(detectContainerKindFromInternal(state)).toBe("child");
  });

  it("returns 'root' when inheritanceModes is undefined", () => {
    const state = makeInternalState();
    expect(detectContainerKindFromInternal(state)).toBe("root");
  });

  it("returns 'root' - not 'child', 'lazy', or 'scope'", () => {
    const state = makeInternalState();
    const result = detectContainerKindFromInternal(state);
    expect(result).toBe("root");
    expect(result).not.toBe("child");
    expect(result).not.toBe("lazy");
    expect(result).not.toBe("scope");
  });
});

// =============================================================================
// detectPhaseFromSnapshot
// =============================================================================

describe("detectPhaseFromSnapshot (mutant killing)", () => {
  it("returns 'disposed' when isDisposed is true regardless of kind", () => {
    const snapshot = makeRuntimeSnapshot({ isDisposed: true });
    expect(detectPhaseFromSnapshot(snapshot, "root")).toBe("disposed");
    expect(detectPhaseFromSnapshot(snapshot, "child")).toBe("disposed");
    expect(detectPhaseFromSnapshot(snapshot, "lazy")).toBe("disposed");
    expect(detectPhaseFromSnapshot(snapshot, "scope")).toBe("disposed");
  });

  it("returns 'initialized' for root when not disposed", () => {
    const snapshot = makeRuntimeSnapshot({ isDisposed: false });
    const result = detectPhaseFromSnapshot(snapshot, "root");
    expect(result).toBe("initialized");
    expect(result).not.toBe("disposed");
  });

  it("returns 'initialized' for child when not disposed", () => {
    const snapshot = makeRuntimeSnapshot({ isDisposed: false });
    const result = detectPhaseFromSnapshot(snapshot, "child");
    expect(result).toBe("initialized");
    expect(result).not.toBe("active");
  });

  it("returns 'loaded' for lazy when not disposed", () => {
    const snapshot = makeRuntimeSnapshot({ isDisposed: false });
    const result = detectPhaseFromSnapshot(snapshot, "lazy");
    expect(result).toBe("loaded");
    expect(result).not.toBe("initialized");
  });

  it("returns 'active' for scope when not disposed", () => {
    const snapshot = makeRuntimeSnapshot({ isDisposed: false });
    const result = detectPhaseFromSnapshot(snapshot, "scope");
    expect(result).toBe("active");
    expect(result).not.toBe("initialized");
  });

  it("returns 'initialized' for unknown kind (default)", () => {
    const snapshot = makeRuntimeSnapshot({ isDisposed: false });
    expect(detectPhaseFromSnapshot(snapshot, "mystery" as any)).toBe("initialized");
  });
});

// =============================================================================
// buildTypedSnapshotFromInternal
// =============================================================================

describe("buildTypedSnapshotFromInternal (mutant killing)", () => {
  it("builds root snapshot with correct kind", () => {
    const snapshot = makeRuntimeSnapshot();
    const state = makeInternalState();
    const result = buildTypedSnapshotFromInternal(snapshot, "root", state);

    expect(result.kind).toBe("root");
    expect(result.phase).toBe("initialized");
    expect((result as any).isInitialized).toBe(true);
    expect((result as any).asyncAdaptersTotal).toBe(0);
    expect((result as any).asyncAdaptersInitialized).toBe(0);
    expect(result.containerName).toBe("Test");
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("root isInitialized is false when disposed", () => {
    const snapshot = makeRuntimeSnapshot({ isDisposed: true });
    const state = makeInternalState();
    const result = buildTypedSnapshotFromInternal(snapshot, "root", state);

    expect(result.phase).toBe("disposed");
    expect((result as any).isInitialized).toBe(false);
  });

  it("builds child snapshot with correct kind", () => {
    const snapshot = makeRuntimeSnapshot();
    const state = makeInternalState();
    const result = buildTypedSnapshotFromInternal(snapshot, "child", state);

    expect(result.kind).toBe("child");
    expect(result.phase).toBe("initialized");
    expect((result as any).parentId).toBe("unknown");
    expect((result as any).inheritanceModes).toEqual(new Map());
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("builds lazy snapshot with correct kind", () => {
    const snapshot = makeRuntimeSnapshot();
    const state = makeInternalState();
    const result = buildTypedSnapshotFromInternal(snapshot, "lazy", state);

    expect(result.kind).toBe("lazy");
    expect(result.phase).toBe("loaded");
    expect((result as any).isLoaded).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("lazy isLoaded is false when disposed", () => {
    const snapshot = makeRuntimeSnapshot({ isDisposed: true });
    const state = makeInternalState();
    const result = buildTypedSnapshotFromInternal(snapshot, "lazy", state);

    expect(result.phase).toBe("disposed");
    expect((result as any).isLoaded).toBe(false);
  });

  it("builds scope snapshot with scope tree id", () => {
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
    expect(result.phase).toBe("active");
    expect((result as any).scopeId).toBe("scope-42");
    expect((result as any).parentScopeId).toBeNull();
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("unknown kind defaults to root", () => {
    const snapshot = makeRuntimeSnapshot();
    const state = makeInternalState();
    const result = buildTypedSnapshotFromInternal(snapshot, "banana" as any, state);

    expect(result.kind).toBe("root");
  });

  it("converts singletons with resolvedAt fallback to 0", () => {
    const snapshot = makeRuntimeSnapshot({
      singletons: [
        {
          portName: "A",
          lifetime: "singleton",
          isResolved: true,
          resolvedAt: undefined,
          resolutionOrder: 0,
        },
        {
          portName: "B",
          lifetime: "singleton",
          isResolved: false,
          resolvedAt: 999,
          resolutionOrder: 1,
        },
      ],
    });
    const state = makeInternalState();
    const result = buildTypedSnapshotFromInternal(snapshot, "root", state);

    const a = result.singletons.find((s: any) => s.portName === "A");
    expect(a!.resolvedAt).toBe(0);

    const b = result.singletons.find((s: any) => s.portName === "B");
    expect(b!.resolvedAt).toBe(999);
  });

  it("singletons array is frozen", () => {
    const snapshot = makeRuntimeSnapshot({
      singletons: [
        {
          portName: "A",
          lifetime: "singleton",
          isResolved: true,
          resolvedAt: 1,
          resolutionOrder: 0,
        },
      ],
    });
    const state = makeInternalState();
    const result = buildTypedSnapshotFromInternal(snapshot, "root", state);

    expect(Object.isFrozen(result.singletons)).toBe(true);
  });

  it("isDisposed propagates correctly", () => {
    const snapshot = makeRuntimeSnapshot({ isDisposed: true });
    const state = makeInternalState();
    const result = buildTypedSnapshotFromInternal(snapshot, "root", state);

    expect(result.isDisposed).toBe(true);
  });

  it("isDisposed is false when not disposed", () => {
    const snapshot = makeRuntimeSnapshot({ isDisposed: false });
    const state = makeInternalState();
    const result = buildTypedSnapshotFromInternal(snapshot, "root", state);

    expect(result.isDisposed).toBe(false);
  });

  it("scopes from runtime snapshot are preserved", () => {
    const scopeTree = {
      id: "container",
      status: "active" as const,
      resolvedCount: 5,
      totalCount: 10,
      children: [
        {
          id: "scope-1",
          status: "active" as const,
          resolvedCount: 2,
          totalCount: 3,
          children: [],
          resolvedPorts: ["A"],
        },
      ],
      resolvedPorts: ["B", "C"],
    };
    const snapshot = makeRuntimeSnapshot({ scopes: scopeTree });
    const state = makeInternalState();
    const result = buildTypedSnapshotFromInternal(snapshot, "root", state);

    expect(result.scopes).toBe(scopeTree);
  });
});
