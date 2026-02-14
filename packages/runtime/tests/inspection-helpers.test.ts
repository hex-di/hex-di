/**
 * Tests for src/inspection/helpers.ts
 * Covers detectContainerKind, detectPhase, buildTypedSnapshot, and all extraction helpers.
 */
import { describe, it, expect } from "vitest";
import { detectContainerKind, detectPhase, buildTypedSnapshot } from "../src/inspection/helpers.js";
import type { ContainerSnapshot as RuntimeSnapshot } from "../src/inspection/internal-state-types.js";

// =============================================================================
// Mock containers with structural markers
// =============================================================================

function makeRootContainer() {
  return {
    resolve: () => {},
    resolveAsync: async () => {},
    createScope: () => {},
    dispose: async () => {},
    has: () => true,
    isDisposed: false,
    name: "Root",
  } as any;
}

function makeChildContainer() {
  return {
    ...makeRootContainer(),
    _parentContainer: {},
    name: "Child",
  } as any;
}

function makeLazyContainer() {
  return {
    ...makeRootContainer(),
    load: () => Promise.resolve({}),
    name: "Lazy",
  } as any;
}

function makeScopeContainer() {
  return {
    ...makeRootContainer(),
    _scopeId: "scope-0",
    name: "Scope",
  } as any;
}

function makeScopeContainerWithPublicId() {
  return {
    ...makeRootContainer(),
    scopeId: "public-scope-1",
    name: "ScopePublic",
  } as any;
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
// Tests
// =============================================================================

describe("detectContainerKind", () => {
  it("detects root container (no special markers)", () => {
    expect(detectContainerKind(makeRootContainer())).toBe("root");
  });

  it("detects child container (has _parentContainer)", () => {
    expect(detectContainerKind(makeChildContainer())).toBe("child");
  });

  it("detects lazy container (has load method)", () => {
    expect(detectContainerKind(makeLazyContainer())).toBe("lazy");
  });

  it("detects scope container (has _scopeId)", () => {
    expect(detectContainerKind(makeScopeContainer())).toBe("scope");
  });

  it("detects scope container (has scopeId)", () => {
    expect(detectContainerKind(makeScopeContainerWithPublicId())).toBe("scope");
  });

  it("prioritizes scope over child markers", () => {
    const container = {
      ...makeChildContainer(),
      _scopeId: "scope-0",
    } as any;
    expect(detectContainerKind(container)).toBe("scope");
  });

  it("prioritizes scope over lazy markers", () => {
    const container = {
      ...makeLazyContainer(),
      _scopeId: "scope-0",
    } as any;
    expect(detectContainerKind(container)).toBe("scope");
  });
});

describe("detectPhase", () => {
  it("returns disposed when snapshot is disposed", () => {
    const snapshot = makeRuntimeSnapshot({ isDisposed: true });
    expect(detectPhase(makeRootContainer(), snapshot, "root")).toBe("disposed");
  });

  it("returns initialized for root containers", () => {
    const snapshot = makeRuntimeSnapshot();
    expect(detectPhase(makeRootContainer(), snapshot, "root")).toBe("initialized");
  });

  it("returns initialized for child containers", () => {
    const snapshot = makeRuntimeSnapshot();
    expect(detectPhase(makeChildContainer(), snapshot, "child")).toBe("initialized");
  });

  it("returns active for scope containers", () => {
    const snapshot = makeRuntimeSnapshot();
    expect(detectPhase(makeScopeContainer(), snapshot, "scope")).toBe("active");
  });

  it("returns unloaded for lazy containers by default", () => {
    const snapshot = makeRuntimeSnapshot();
    const lazyContainer = makeLazyContainer();
    expect(detectPhase(lazyContainer, snapshot, "lazy")).toBe("unloaded");
  });

  it("returns loaded for lazy containers with _loaded=true", () => {
    const snapshot = makeRuntimeSnapshot();
    const lazyContainer = { ...makeLazyContainer(), _loaded: true } as any;
    expect(detectPhase(lazyContainer, snapshot, "lazy")).toBe("loaded");
  });

  it("returns unloaded for lazy containers with _loaded=false", () => {
    const snapshot = makeRuntimeSnapshot();
    const lazyContainer = { ...makeLazyContainer(), _loaded: false } as any;
    expect(detectPhase(lazyContainer, snapshot, "lazy")).toBe("unloaded");
  });

  it("returns loading for lazy containers with _loading=true", () => {
    const snapshot = makeRuntimeSnapshot();
    const lazyContainer = { ...makeLazyContainer(), _loading: true } as any;
    expect(detectPhase(lazyContainer, snapshot, "lazy")).toBe("loading");
  });

  it("returns initialized for uninitialized root with initialize and no async adapters", () => {
    const snapshot = makeRuntimeSnapshot();
    const container = { ...makeRootContainer(), initialize: () => {} } as any;
    expect(detectPhase(container, snapshot, "root")).toBe("initialized");
  });

  it("returns uninitialized for root with async adapters and not initialized", () => {
    const snapshot = makeRuntimeSnapshot();
    const container = {
      ...makeRootContainer(),
      initialize: () => {},
      _asyncAdapters: [],
    } as any;
    expect(detectPhase(container, snapshot, "root")).toBe("uninitialized");
  });

  it("returns initialized for root with async adapters and _initialized=true", () => {
    const snapshot = makeRuntimeSnapshot();
    const container = {
      ...makeRootContainer(),
      initialize: () => {},
      _asyncPorts: [],
      _initialized: true,
    } as any;
    expect(detectPhase(container, snapshot, "root")).toBe("initialized");
  });

  it("returns initialized for unknown kind", () => {
    const snapshot = makeRuntimeSnapshot();
    expect(detectPhase(makeRootContainer(), snapshot, "unknown" as any)).toBe("initialized");
  });
});

describe("buildTypedSnapshot", () => {
  it("builds root snapshot with correct kind", () => {
    const snapshot = makeRuntimeSnapshot({ containerName: "App" });
    const result = buildTypedSnapshot(snapshot, "root", makeRootContainer());
    expect(result.kind).toBe("root");
    expect(result.containerName).toBe("App");
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("builds root snapshot with isInitialized flag", () => {
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "root", makeRootContainer());
    if (result.kind === "root") {
      expect(result.isInitialized).toBe(true);
      expect(result.asyncAdaptersTotal).toBe(0);
      expect(result.asyncAdaptersInitialized).toBe(0);
    }
  });

  it("builds root snapshot with async adapter info when available", () => {
    const snapshot = makeRuntimeSnapshot();
    const container = {
      ...makeRootContainer(),
      _asyncAdaptersTotal: 5,
      _asyncAdaptersInitialized: 3,
    } as any;
    const result = buildTypedSnapshot(snapshot, "root", container);
    if (result.kind === "root") {
      expect(result.asyncAdaptersTotal).toBe(5);
      expect(result.asyncAdaptersInitialized).toBe(3);
    }
  });

  it("builds child snapshot with correct kind and parentId", () => {
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "child", makeChildContainer());
    expect(result.kind).toBe("child");
    if (result.kind === "child") {
      expect(result.parentId).toBe("unknown");
      expect(result.inheritanceModes).toBeInstanceOf(Map);
    }
  });

  it("builds lazy snapshot with correct kind", () => {
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "lazy", makeLazyContainer());
    expect(result.kind).toBe("lazy");
    if (result.kind === "lazy") {
      expect(result.isLoaded).toBe(false);
    }
  });

  it("builds scope snapshot with correct kind and scopeId", () => {
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "scope", makeScopeContainer());
    expect(result.kind).toBe("scope");
    if (result.kind === "scope") {
      expect(result.scopeId).toBe("scope-0");
      expect(result.parentScopeId).toBeNull();
    }
  });

  it("builds scope snapshot with scopeId from public property", () => {
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "scope", makeScopeContainerWithPublicId());
    if (result.kind === "scope") {
      expect(result.scopeId).toBe("public-scope-1");
    }
  });

  it("builds scope snapshot with unknown-scope when no scopeId found", () => {
    const snapshot = makeRuntimeSnapshot();
    const container = { ...makeRootContainer() } as any;
    const result = buildTypedSnapshot(snapshot, "scope", container);
    if (result.kind === "scope") {
      expect(result.scopeId).toBe("unknown-scope");
    }
  });

  it("builds scope snapshot with parentScopeId when _parentScopeId is set", () => {
    const snapshot = makeRuntimeSnapshot();
    const container = {
      ...makeScopeContainer(),
      _parentScopeId: "parent-scope-1",
    } as any;
    const result = buildTypedSnapshot(snapshot, "scope", container);
    if (result.kind === "scope") {
      expect(result.parentScopeId).toBe("parent-scope-1");
    }
  });

  it("builds scope snapshot with null parentScopeId when _parentScopeId is non-string", () => {
    const snapshot = makeRuntimeSnapshot();
    const container = {
      ...makeScopeContainer(),
      _parentScopeId: 42,
    } as any;
    const result = buildTypedSnapshot(snapshot, "scope", container);
    if (result.kind === "scope") {
      expect(result.parentScopeId).toBeNull();
    }
  });

  it("handles unknown kind by falling back to root", () => {
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "unknown" as any, makeRootContainer());
    expect(result.kind).toBe("root");
  });

  it("converts singletons with resolvedAt", () => {
    const snapshot = makeRuntimeSnapshot({
      singletons: [
        {
          portName: "Logger",
          isResolved: true,
          resolvedAt: 12345,
          lifetime: "singleton",
          resolutionOrder: 0,
        },
        {
          portName: "Database",
          isResolved: false,
          resolvedAt: undefined,
          lifetime: "singleton",
          resolutionOrder: undefined,
        },
      ],
    });
    const result = buildTypedSnapshot(snapshot, "root", makeRootContainer());
    expect(result.singletons).toHaveLength(2);
    expect(result.singletons[0].portName).toBe("Logger");
    expect(result.singletons[0].resolvedAt).toBe(12345);
    expect(result.singletons[1].portName).toBe("Database");
    expect(result.singletons[1].resolvedAt).toBe(0);
  });

  it("preserves isDisposed flag", () => {
    const snapshot = makeRuntimeSnapshot({ isDisposed: true });
    const result = buildTypedSnapshot(snapshot, "root", makeRootContainer());
    expect(result.isDisposed).toBe(true);
  });

  it("freezes singletons array", () => {
    const snapshot = makeRuntimeSnapshot();
    const result = buildTypedSnapshot(snapshot, "root", makeRootContainer());
    expect(Object.isFrozen(result.singletons)).toBe(true);
  });
});
