/**
 * Mutation-killing tests for src/inspection/helpers.ts
 *
 * Targets survived mutants in:
 * - detectContainerKind: all branches (root, child, lazy, scope)
 * - extractKindMetadata: isLazy, isChild, isScope
 * - hasParentReference: `_parent` in / `_parentContainer` in
 * - hasScopeMarker: `_scopeId` in / `scopeId` in
 * - extractParentId: always returns null
 * - detectPhase: disposed, root, child, lazy, scope
 * - detectRootPhase: initialize, async adapters, initialized state
 * - detectLazyPhase: _loaded, _loading
 * - buildTypedSnapshot: all kinds, frozen
 * - convertToDevToolsSingleton: mapping
 * - extractAsyncAdapterInfo: _asyncAdaptersTotal/_asyncAdaptersInitialized
 * - extractInheritanceModes: try/catch, INTERNAL_ACCESS
 * - extractScopeId: _scopeId, scopeId, fallback
 * - extractParentScopeId: _parentScopeId
 */
// @ts-nocheck

import { describe, it, expect } from "vitest";
import { detectContainerKind, detectPhase, buildTypedSnapshot } from "../src/inspection/helpers.js";
import type { ContainerSnapshot as RuntimeSnapshot } from "../src/inspection/internal-state-types.js";
import { INTERNAL_ACCESS } from "../src/inspection/symbols.js";

// =============================================================================
// Mock helpers
// =============================================================================

function makeRootContainer() {
  return { resolve: () => {}, dispose: async () => {}, has: () => true, isDisposed: false } as any;
}

function makeChildContainer_parentProp() {
  return { ...makeRootContainer(), _parent: {} } as any;
}

function makeChildContainer_parentContainerProp() {
  return { ...makeRootContainer(), _parentContainer: {} } as any;
}

function makeLazyContainer() {
  return { ...makeRootContainer(), load: () => Promise.resolve({}) } as any;
}

function makeScopeContainer_private() {
  return { ...makeRootContainer(), _scopeId: "scope-0" } as any;
}

function makeScopeContainer_public() {
  return { ...makeRootContainer(), scopeId: "public-scope-1" } as any;
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
// detectContainerKind
// =============================================================================

describe("detectContainerKind (mutant killing)", () => {
  it("returns 'root' when no special markers", () => {
    const kind = detectContainerKind(makeRootContainer());
    expect(kind).toBe("root");
    expect(kind).not.toBe("child");
    expect(kind).not.toBe("lazy");
    expect(kind).not.toBe("scope");
  });

  it("returns 'child' when _parent property is present", () => {
    const kind = detectContainerKind(makeChildContainer_parentProp());
    expect(kind).toBe("child");
    expect(kind).not.toBe("root");
  });

  it("returns 'child' when _parentContainer property is present", () => {
    const kind = detectContainerKind(makeChildContainer_parentContainerProp());
    expect(kind).toBe("child");
    expect(kind).not.toBe("root");
  });

  it("returns 'lazy' when load function is present", () => {
    const kind = detectContainerKind(makeLazyContainer());
    expect(kind).toBe("lazy");
    expect(kind).not.toBe("root");
    expect(kind).not.toBe("child");
  });

  it("returns 'scope' when _scopeId is present", () => {
    const kind = detectContainerKind(makeScopeContainer_private());
    expect(kind).toBe("scope");
    expect(kind).not.toBe("root");
  });

  it("returns 'scope' when scopeId is present", () => {
    const kind = detectContainerKind(makeScopeContainer_public());
    expect(kind).toBe("scope");
    expect(kind).not.toBe("root");
  });

  it("scope takes priority over child (both markers present)", () => {
    const container = {
      ...makeRootContainer(),
      _parentContainer: {},
      _scopeId: "scope-99",
    } as any;
    expect(detectContainerKind(container)).toBe("scope");
  });

  it("lazy takes priority over child (both markers present)", () => {
    const container = {
      ...makeRootContainer(),
      _parentContainer: {},
      load: () => Promise.resolve({}),
    } as any;
    expect(detectContainerKind(container)).toBe("lazy");
  });

  it("scope takes priority over lazy", () => {
    const container = {
      ...makeRootContainer(),
      load: () => Promise.resolve({}),
      _scopeId: "scope-0",
    } as any;
    expect(detectContainerKind(container)).toBe("scope");
  });

  it("load must be a function for lazy detection", () => {
    const container = { ...makeRootContainer(), load: "not a function" } as any;
    expect(detectContainerKind(container)).toBe("root");
  });

  it("isChild is false when isLazy is true", () => {
    const container = {
      ...makeRootContainer(),
      _parentContainer: {},
      load: () => Promise.resolve({}),
    } as any;
    // isLazy = true, so isChild check is skipped (isChild requires !isLazy)
    expect(detectContainerKind(container)).toBe("lazy");
  });
});

// =============================================================================
// detectPhase
// =============================================================================

describe("detectPhase (mutant killing)", () => {
  it("returns 'disposed' when isDisposed is true for any kind", () => {
    const disposed = makeRuntimeSnapshot({ isDisposed: true });

    expect(detectPhase(makeRootContainer(), disposed, "root")).toBe("disposed");
    expect(detectPhase(makeRootContainer(), disposed, "child")).toBe("disposed");
    expect(detectPhase(makeRootContainer(), disposed, "lazy")).toBe("disposed");
    expect(detectPhase(makeRootContainer(), disposed, "scope")).toBe("disposed");
  });

  it("returns 'initialized' for root container when not disposed", () => {
    const snapshot = makeRuntimeSnapshot();
    expect(detectPhase(makeRootContainer(), snapshot, "root")).toBe("initialized");
  });

  it("returns 'initialized' for child container when not disposed", () => {
    const snapshot = makeRuntimeSnapshot();
    expect(detectPhase(makeRootContainer(), snapshot, "child")).toBe("initialized");
  });

  it("returns 'active' for scope when not disposed", () => {
    const snapshot = makeRuntimeSnapshot();
    expect(detectPhase(makeRootContainer(), snapshot, "scope")).toBe("active");
  });

  it("returns 'initialized' for default/unknown kind", () => {
    const snapshot = makeRuntimeSnapshot();
    expect(detectPhase(makeRootContainer(), snapshot, "unknown" as any)).toBe("initialized");
  });

  it("detectLazyPhase returns 'loaded' when _loaded is true", () => {
    const container = { ...makeLazyContainer(), _loaded: true } as any;
    const snapshot = makeRuntimeSnapshot();
    expect(detectPhase(container, snapshot, "lazy")).toBe("loaded");
  });

  it("detectLazyPhase returns 'unloaded' when _loaded is false", () => {
    const container = { ...makeLazyContainer(), _loaded: false } as any;
    const snapshot = makeRuntimeSnapshot();
    expect(detectPhase(container, snapshot, "lazy")).toBe("unloaded");
  });

  it("detectLazyPhase returns 'loading' when _loading is true", () => {
    const container = { ...makeLazyContainer(), _loading: true } as any;
    const snapshot = makeRuntimeSnapshot();
    expect(detectPhase(container, snapshot, "lazy")).toBe("loading");
  });

  it("detectLazyPhase returns 'unloaded' by default", () => {
    const snapshot = makeRuntimeSnapshot();
    expect(detectPhase(makeLazyContainer(), snapshot, "lazy")).toBe("unloaded");
  });

  it("detectRootPhase returns 'uninitialized' for async adapters not initialized", () => {
    const container = {
      ...makeRootContainer(),
      initialize: () => {},
      _asyncAdapters: true,
      _initialized: false,
    } as any;
    const snapshot = makeRuntimeSnapshot();
    expect(detectPhase(container, snapshot, "root")).toBe("uninitialized");
  });

  it("detectRootPhase returns 'initialized' for async adapters that are initialized", () => {
    const container = {
      ...makeRootContainer(),
      initialize: () => {},
      _asyncAdapters: true,
      _initialized: true,
    } as any;
    const snapshot = makeRuntimeSnapshot();
    expect(detectPhase(container, snapshot, "root")).toBe("initialized");
  });

  it("detectRootPhase returns 'initialized' when has initialize but no async adapters", () => {
    const container = {
      ...makeRootContainer(),
      initialize: () => {},
    } as any;
    const snapshot = makeRuntimeSnapshot();
    expect(detectPhase(container, snapshot, "root")).toBe("initialized");
  });

  it("detectRootPhase checks _asyncPorts as well", () => {
    const container = {
      ...makeRootContainer(),
      initialize: () => {},
      _asyncPorts: true,
      _initialized: false,
    } as any;
    const snapshot = makeRuntimeSnapshot();
    expect(detectPhase(container, snapshot, "root")).toBe("uninitialized");
  });
});

// =============================================================================
// buildTypedSnapshot
// =============================================================================

describe("buildTypedSnapshot (mutant killing)", () => {
  it("builds root snapshot with correct kind and phase", () => {
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "root", makeRootContainer());

    expect(result.kind).toBe("root");
    expect(result.phase).toBe("initialized");
    expect((result as any).isInitialized).toBe(true);
    expect(result.isDisposed).toBe(false);
    expect(result.containerName).toBe("Test");
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("builds child snapshot with kind 'child' and parentId", () => {
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "child", makeRootContainer());

    expect(result.kind).toBe("child");
    expect(result.phase).toBe("initialized");
    expect((result as any).parentId).toBe("unknown");
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("builds lazy snapshot with kind 'lazy' and isLoaded", () => {
    const container = { ...makeLazyContainer(), _loaded: true } as any;
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "lazy", container);

    expect(result.kind).toBe("lazy");
    expect(result.phase).toBe("loaded");
    expect((result as any).isLoaded).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("lazy isLoaded is false when phase is not 'loaded'", () => {
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "lazy", makeLazyContainer());

    expect(result.kind).toBe("lazy");
    expect((result as any).isLoaded).toBe(false);
  });

  it("builds scope snapshot with kind 'scope'", () => {
    const container = { ...makeRootContainer(), _scopeId: "scope-5" } as any;
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "scope", container);

    expect(result.kind).toBe("scope");
    expect(result.phase).toBe("active");
    expect((result as any).scopeId).toBe("scope-5");
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("scope falls back to 'unknown-scope' if no scopeId", () => {
    const container = makeRootContainer() as any;
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "scope", container);

    expect((result as any).scopeId).toBe("unknown-scope");
  });

  it("scope parentScopeId is null by default", () => {
    const container = makeScopeContainer_private() as any;
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "scope", container);

    expect((result as any).parentScopeId).toBeNull();
  });

  it("scope parentScopeId is extracted from _parentScopeId string", () => {
    const container = { ...makeScopeContainer_private(), _parentScopeId: "parent-scope-1" } as any;
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "scope", container);

    expect((result as any).parentScopeId).toBe("parent-scope-1");
  });

  it("scope parentScopeId is null for non-string _parentScopeId", () => {
    const container = { ...makeScopeContainer_private(), _parentScopeId: 42 } as any;
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "scope", container);

    expect((result as any).parentScopeId).toBeNull();
  });

  it("unknown kind defaults to root snapshot", () => {
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "unknown-kind" as any, makeRootContainer());

    expect(result.kind).toBe("root");
  });

  it("converts singleton entries with resolvedAt fallback to 0", () => {
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
          resolvedAt: 123,
          resolutionOrder: 1,
        },
      ],
    });
    const result = buildTypedSnapshot(snapshot, "root", makeRootContainer());

    const singletonA = result.singletons.find((s: any) => s.portName === "A");
    expect(singletonA).toBeDefined();
    expect(singletonA!.resolvedAt).toBe(0); // undefined ?? 0

    const singletonB = result.singletons.find((s: any) => s.portName === "B");
    expect(singletonB).toBeDefined();
    expect(singletonB!.resolvedAt).toBe(123);
  });

  it("root isInitialized is false when disposed", () => {
    const snapshot = makeRuntimeSnapshot({ isDisposed: true });
    const result = buildTypedSnapshot(snapshot, "root", makeRootContainer());

    expect(result.phase).toBe("disposed");
    expect((result as any).isInitialized).toBe(false);
  });
});

// =============================================================================
// extractAsyncAdapterInfo
// =============================================================================

describe("extractAsyncAdapterInfo (via buildTypedSnapshot root)", () => {
  it("extracts async adapter info when properties are present", () => {
    const container = {
      ...makeRootContainer(),
      _asyncAdaptersTotal: 5,
      _asyncAdaptersInitialized: 3,
    } as any;
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "root", container);

    expect((result as any).asyncAdaptersTotal).toBe(5);
    expect((result as any).asyncAdaptersInitialized).toBe(3);
  });

  it("defaults to 0 when properties are absent", () => {
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "root", makeRootContainer());

    expect((result as any).asyncAdaptersTotal).toBe(0);
    expect((result as any).asyncAdaptersInitialized).toBe(0);
  });
});

// =============================================================================
// extractInheritanceModes
// =============================================================================

describe("extractInheritanceModes (via buildTypedSnapshot child)", () => {
  it("returns inheritance modes from internal state", () => {
    const modes = new Map([["Logger", "shared" as const]]);
    const container = {
      ...makeRootContainer(),
      [INTERNAL_ACCESS]: () => ({ inheritanceModes: modes }),
    } as any;
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "child", container);

    expect((result as any).inheritanceModes).toBe(modes);
  });

  it("returns empty map when INTERNAL_ACCESS throws", () => {
    const container = {
      ...makeRootContainer(),
      [INTERNAL_ACCESS]: () => {
        throw new Error("no access");
      },
    } as any;
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "child", container);

    expect((result as any).inheritanceModes).toEqual(new Map());
  });

  it("returns empty map when inheritanceModes is undefined", () => {
    const container = {
      ...makeRootContainer(),
      [INTERNAL_ACCESS]: () => ({ inheritanceModes: undefined }),
    } as any;
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "child", container);

    expect((result as any).inheritanceModes).toEqual(new Map());
  });
});

// =============================================================================
// extractScopeId
// =============================================================================

describe("extractScopeId", () => {
  it("extracts _scopeId as string", () => {
    const container = { ...makeRootContainer(), _scopeId: "my-scope" } as any;
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "scope", container);
    expect((result as any).scopeId).toBe("my-scope");
  });

  it("extracts scopeId as string", () => {
    const container = { ...makeRootContainer(), scopeId: "public-scope" } as any;
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "scope", container);
    expect((result as any).scopeId).toBe("public-scope");
  });

  it("prefers _scopeId over scopeId", () => {
    const container = { ...makeRootContainer(), _scopeId: "private", scopeId: "public" } as any;
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "scope", container);
    expect((result as any).scopeId).toBe("private");
  });

  it("returns 'unknown-scope' if no scope id found", () => {
    const container = makeRootContainer() as any;
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "scope", container);
    expect((result as any).scopeId).toBe("unknown-scope");
  });

  it("returns 'unknown-scope' if _scopeId is not a string", () => {
    const container = { ...makeRootContainer(), _scopeId: 42 } as any;
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "scope", container);
    expect((result as any).scopeId).toBe("unknown-scope");
  });
});
