/**
 * Third batch of mutation-killing tests.
 *
 * Targets:
 * - wrapper-utils.ts: parseChildGraph, parseInheritanceModes, createChildContainerConfig, attachBuiltinAPIs
 * - inspection/internal-helpers.ts: detectContainerKindFromInternal, detectPhaseFromSnapshot, buildTypedSnapshotFromInternal
 * - container/helpers.ts: isAdapterProvidedByParent, isAdapterProvidedByParentOrExtensions, createMemoMapSnapshot
 * - container/lazy-impl.ts: LazyContainerImpl edge cases
 * - scope/impl.ts: ScopeImpl lifecycle emitter, nested dispose, getInternalState fields
 * - resolution/hooks-runner.ts: checkCacheHit for "transient" string, scopeId pass-through
 * - container/wrappers.ts: wrapper override method, container brand, ContainerBrand property
 * - container/base-impl.ts: singletonMemo entries, multiple children tracking
 * - factory.ts: initialized container tryInitialize after init, tryDispose, initialized hooks propagation
 * - inspection/builtin-api.ts: adapter info exact field values, graph data adapters origin
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { ADAPTER_ACCESS, INTERNAL_ACCESS, HOOKS_ACCESS } from "../src/inspection/symbols.js";
import {
  detectContainerKindFromInternal,
  detectPhaseFromSnapshot,
  buildTypedSnapshotFromInternal,
} from "../src/inspection/internal-helpers.js";
import {
  parseChildGraph,
  parseInheritanceModes,
  createChildContainerConfig,
} from "../src/container/wrapper-utils.js";
import {
  isAdapterProvidedByParent,
  isAdapterProvidedByParentOrExtensions,
  createMemoMapSnapshot,
} from "../src/container/helpers.js";
import { MemoMap } from "../src/util/memo-map.js";
import { resetScopeIdCounter } from "../src/scope/impl.js";
import { DisposedScopeError, AsyncFactoryError } from "../src/errors/index.js";
import { checkCacheHit } from "../src/resolution/hooks-runner.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}
interface Cache {
  get(key: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const CachePort = port<Cache>()({ name: "Cache" });

function makeLoggerAdapter(lifetime: "singleton" | "transient" | "scoped" = "singleton") {
  return createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime,
    factory: () => ({ log: vi.fn() }),
  });
}

function makeDbAdapter() {
  return createAdapter({
    provides: DatabasePort,
    requires: [LoggerPort] as const,
    lifetime: "singleton",
    factory: () => ({ query: vi.fn() }),
  });
}

// =============================================================================
// wrapper-utils.ts
// =============================================================================

describe("wrapper-utils.ts mutation killers", () => {
  describe("parseChildGraph", () => {
    it("separates overrides from extensions", () => {
      const overrideAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const extensionAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: vi.fn() }),
      });
      const graph = GraphBuilder.create()
        .override(overrideAdapter)
        .provide(extensionAdapter)
        .build();

      const { overrides, extensions } = parseChildGraph(graph);
      expect(overrides.size).toBe(1);
      expect(extensions.size).toBe(1);
      expect(overrides.has(LoggerPort)).toBe(true);
      expect(extensions.has(DatabasePort)).toBe(true);
    });

    it("returns empty maps for empty graph", () => {
      const graph = GraphBuilder.create().build();
      const { overrides, extensions } = parseChildGraph(graph);
      expect(overrides.size).toBe(0);
      expect(extensions.size).toBe(0);
    });

    it("all adapters go to extensions when no overrides", () => {
      const loggerAdapter = makeLoggerAdapter();
      const dbAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(loggerAdapter).provide(dbAdapter).build();

      const { overrides, extensions } = parseChildGraph(graph);
      expect(overrides.size).toBe(0);
      expect(extensions.size).toBe(2);
    });
  });

  describe("parseInheritanceModes", () => {
    it("returns empty map when undefined", () => {
      const map = parseInheritanceModes(undefined);
      expect(map.size).toBe(0);
    });

    it("returns empty map when empty object", () => {
      const map = parseInheritanceModes({} as any);
      expect(map.size).toBe(0);
    });

    it("parses valid inheritance modes", () => {
      const map = parseInheritanceModes({
        Logger: "shared",
        Database: "forked",
        Cache: "isolated",
      } as any);
      expect(map.size).toBe(3);
      expect(map.get("Logger")).toBe("shared");
      expect(map.get("Database")).toBe("forked");
      expect(map.get("Cache")).toBe("isolated");
    });

    it("skips invalid modes", () => {
      const map = parseInheritanceModes({
        Logger: "shared",
        Database: "invalid_mode",
      } as any);
      expect(map.size).toBe(1);
      expect(map.has("Database")).toBe(false);
    });
  });

  describe("createChildContainerConfig", () => {
    it("creates config with correct fields", () => {
      const loggerAdapter = makeLoggerAdapter();
      const graph = GraphBuilder.create().provide(loggerAdapter).build();
      const container = createContainer({ graph, name: "Parent" });

      const overrides = new Map();
      const extensions = new Map();
      const inheritanceModes = new Map();
      inheritanceModes.set("Logger", "shared");

      const parentLike: any = {
        resolveInternal: () => {},
        resolveAsyncInternal: () => {},
        has: () => true,
        hasAdapter: () => true,
        [ADAPTER_ACCESS]: () => undefined,
        registerChildContainer: () => {},
        unregisterChildContainer: () => {},
        originalParent: container,
      };

      const config = createChildContainerConfig(
        parentLike,
        overrides,
        extensions,
        inheritanceModes,
        "Child",
        "Parent"
      );

      expect(config.kind).toBe("child");
      expect(config.containerName).toBe("Child");
      expect(config.parentContainerId).toBe("Parent");
      expect(config.parent).toBe(parentLike);
      expect(config.overrides).toBe(overrides);
      expect(config.extensions).toBe(extensions);
      expect(config.inheritanceModes).toBe(inheritanceModes);
      expect(typeof config.containerId).toBe("string");
      // containerId should not be "Parent" or "Child"
      expect(config.containerId).not.toBe("Parent");
      expect(config.containerId).not.toBe("Child");
    });
  });
});

// =============================================================================
// inspection/internal-helpers.ts
// =============================================================================

describe("internal-helpers.ts mutation killers", () => {
  describe("detectContainerKindFromInternal", () => {
    it("returns 'root' when inheritanceModes is undefined", () => {
      const state = {
        inheritanceModes: undefined,
      } as any;
      expect(detectContainerKindFromInternal(state)).toBe("root");
    });

    it("returns 'child' when inheritanceModes is defined (empty Map)", () => {
      const state = {
        inheritanceModes: new Map(),
      } as any;
      expect(detectContainerKindFromInternal(state)).toBe("child");
    });

    it("returns 'child' when inheritanceModes is defined with entries", () => {
      const modes = new Map();
      modes.set("Logger", "shared");
      const state = { inheritanceModes: modes } as any;
      expect(detectContainerKindFromInternal(state)).toBe("child");
    });
  });

  describe("detectPhaseFromSnapshot", () => {
    it("returns 'disposed' when snapshot.isDisposed is true (any kind)", () => {
      expect(detectPhaseFromSnapshot({ isDisposed: true } as any, "root")).toBe("disposed");
      expect(detectPhaseFromSnapshot({ isDisposed: true } as any, "child")).toBe("disposed");
      expect(detectPhaseFromSnapshot({ isDisposed: true } as any, "lazy")).toBe("disposed");
      expect(detectPhaseFromSnapshot({ isDisposed: true } as any, "scope")).toBe("disposed");
    });

    it("returns 'initialized' for root when not disposed", () => {
      expect(detectPhaseFromSnapshot({ isDisposed: false } as any, "root")).toBe("initialized");
    });

    it("returns 'initialized' for child when not disposed", () => {
      expect(detectPhaseFromSnapshot({ isDisposed: false } as any, "child")).toBe("initialized");
    });

    it("returns 'loaded' for lazy when not disposed", () => {
      expect(detectPhaseFromSnapshot({ isDisposed: false } as any, "lazy")).toBe("loaded");
    });

    it("returns 'active' for scope when not disposed", () => {
      expect(detectPhaseFromSnapshot({ isDisposed: false } as any, "scope")).toBe("active");
    });
  });

  describe("buildTypedSnapshotFromInternal", () => {
    function makeRuntimeSnapshot(overrides: Partial<any> = {}) {
      return {
        isDisposed: false,
        containerName: "Test",
        singletons: [],
        scopes: {
          id: "container",
          status: "active",
          children: [],
          resolvedCount: 0,
          totalCount: 0,
          resolvedPorts: [],
        },
        singletonMemo: { size: 0, entries: [] },
        ...overrides,
      } as any;
    }

    it("builds root snapshot with correct kind", () => {
      const result = buildTypedSnapshotFromInternal(makeRuntimeSnapshot(), "root", {
        adapterMap: new Map(),
        overridePorts: new Set(),
      } as any);
      expect(result.kind).toBe("root");
    });

    it("builds child snapshot with correct kind", () => {
      const result = buildTypedSnapshotFromInternal(makeRuntimeSnapshot(), "child", {
        adapterMap: new Map(),
        overridePorts: new Set(),
      } as any);
      expect(result.kind).toBe("child");
    });

    it("builds lazy snapshot with correct kind", () => {
      const result = buildTypedSnapshotFromInternal(makeRuntimeSnapshot(), "lazy", {
        adapterMap: new Map(),
        overridePorts: new Set(),
      } as any);
      expect(result.kind).toBe("lazy");
    });

    it("builds scope snapshot with correct kind", () => {
      const result = buildTypedSnapshotFromInternal(makeRuntimeSnapshot(), "scope", {
        adapterMap: new Map(),
        overridePorts: new Set(),
      } as any);
      expect(result.kind).toBe("scope");
    });

    it("root snapshot has isInitialized field", () => {
      const result = buildTypedSnapshotFromInternal(makeRuntimeSnapshot(), "root", {
        adapterMap: new Map(),
        overridePorts: new Set(),
      } as any);
      expect(result.kind).toBe("root");
      expect((result as any).isInitialized).toBe(true);
    });

    it("lazy snapshot has isLoaded field", () => {
      const result = buildTypedSnapshotFromInternal(makeRuntimeSnapshot(), "lazy", {
        adapterMap: new Map(),
        overridePorts: new Set(),
      } as any);
      expect((result as any).isLoaded).toBe(true);
    });

    it("disposed root snapshot has correct phase", () => {
      const result = buildTypedSnapshotFromInternal(
        makeRuntimeSnapshot({ isDisposed: true }),
        "root",
        { adapterMap: new Map(), overridePorts: new Set() } as any
      );
      expect(result.kind).toBe("root");
      expect((result as any).phase).toBe("disposed");
      expect((result as any).isInitialized).toBe(false);
    });

    it("all snapshots are frozen", () => {
      for (const kind of ["root", "child", "lazy", "scope"] as const) {
        const result = buildTypedSnapshotFromInternal(makeRuntimeSnapshot(), kind, {
          adapterMap: new Map(),
          overridePorts: new Set(),
        } as any);
        expect(Object.isFrozen(result)).toBe(true);
      }
    });
  });
});

// =============================================================================
// container/helpers.ts - isAdapterProvidedByParent, createMemoMapSnapshot
// =============================================================================

describe("container/helpers.ts additional mutation killers", () => {
  describe("isAdapterProvidedByParent", () => {
    it("returns true when parent has adapter for port", () => {
      const adapter = makeLoggerAdapter();
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Parent" });

      const parentLike: any = {
        [ADAPTER_ACCESS]: (p: any) => (container as any)[ADAPTER_ACCESS](p),
      };

      expect(isAdapterProvidedByParent(parentLike, adapter)).toBe(true);
    });

    it("returns false when parent does not have adapter for port", () => {
      const adapter = makeLoggerAdapter();
      const dbAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Parent" });

      const parentLike: any = {
        [ADAPTER_ACCESS]: (p: any) => (container as any)[ADAPTER_ACCESS](p),
      };

      expect(isAdapterProvidedByParent(parentLike, dbAdapter)).toBe(false);
    });
  });

  describe("isAdapterProvidedByParentOrExtensions", () => {
    it("returns true when parent has adapter", () => {
      const adapter = makeLoggerAdapter();
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Parent" });

      const parentLike: any = {
        [ADAPTER_ACCESS]: (p: any) => (container as any)[ADAPTER_ACCESS](p),
      };

      const extensions = new Map();
      expect(isAdapterProvidedByParentOrExtensions(parentLike, extensions, adapter)).toBe(true);
    });

    it("returns true when extensions has adapter", () => {
      const adapter = makeLoggerAdapter();
      const graph = GraphBuilder.create().build();
      const container = createContainer({ graph, name: "Parent" });

      const parentLike: any = {
        [ADAPTER_ACCESS]: (p: any) => (container as any)[ADAPTER_ACCESS](p),
      };

      const extensions = new Map();
      extensions.set(LoggerPort, adapter);
      expect(isAdapterProvidedByParentOrExtensions(parentLike, extensions, adapter)).toBe(true);
    });

    it("returns false when neither has adapter", () => {
      const dbAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: vi.fn() }),
      });
      const graph = GraphBuilder.create().build();
      const container = createContainer({ graph, name: "Parent" });

      const parentLike: any = {
        [ADAPTER_ACCESS]: (p: any) => (container as any)[ADAPTER_ACCESS](p),
      };

      const extensions = new Map();
      expect(isAdapterProvidedByParentOrExtensions(parentLike, extensions, dbAdapter)).toBe(false);
    });
  });

  describe("createMemoMapSnapshot", () => {
    it("returns empty snapshot for empty memo", () => {
      const memo = new MemoMap();
      const snapshot = createMemoMapSnapshot(memo);
      expect(snapshot.size).toBe(0);
      expect(snapshot.entries).toEqual([]);
      expect(Object.isFrozen(snapshot)).toBe(true);
    });

    it("returns snapshot with correct entries for populated memo", () => {
      const memo = new MemoMap();
      const p = port<string>()({ name: "TestPort" });
      memo.getOrElseMemoize(p, () => "value", undefined);

      const snapshot = createMemoMapSnapshot(memo);
      expect(snapshot.size).toBe(1);
      expect(snapshot.entries.length).toBe(1);
      expect(snapshot.entries[0].portName).toBe("TestPort");
      expect(snapshot.entries[0].port).toBe(p);
      expect(typeof snapshot.entries[0].resolvedAt).toBe("number");
      expect(typeof snapshot.entries[0].resolutionOrder).toBe("number");
      expect(Object.isFrozen(snapshot.entries[0])).toBe(true);
    });

    it("snapshot entries preserve resolution order", () => {
      const memo = new MemoMap();
      const p1 = port<string>()({ name: "First" });
      const p2 = port<string>()({ name: "Second" });
      memo.getOrElseMemoize(p1, () => "a", undefined);
      memo.getOrElseMemoize(p2, () => "b", undefined);

      const snapshot = createMemoMapSnapshot(memo);
      expect(snapshot.size).toBe(2);
      expect(snapshot.entries[0].resolutionOrder).toBeLessThan(snapshot.entries[1].resolutionOrder);
    });
  });
});

// =============================================================================
// checkCacheHit for the "transient" string literal mutation
// =============================================================================

describe("checkCacheHit transient string literal", () => {
  it("transient returns false even when memo has entry", () => {
    const memo = new MemoMap();
    const p = port<string>()({ name: "P" });
    memo.getOrElseMemoize(p, () => "val", undefined);

    // "transient" should always return false
    expect(checkCacheHit(p, "transient", memo, new MemoMap())).toBe(false);
  });

  it("transient returns false with empty memos", () => {
    const p = port<string>()({ name: "P" });
    expect(checkCacheHit(p, "transient", new MemoMap(), new MemoMap())).toBe(false);
  });

  it("singleton returns true only for singleton memo", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();
    const p = port<string>()({ name: "P" });

    // Not in any memo
    expect(checkCacheHit(p, "singleton", singletonMemo, scopedMemo)).toBe(false);

    // Add to singleton memo
    singletonMemo.getOrElseMemoize(p, () => "val", undefined);
    expect(checkCacheHit(p, "singleton", singletonMemo, scopedMemo)).toBe(true);
  });

  it("scoped returns true only for scoped memo", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();
    const p = port<string>()({ name: "P" });

    expect(checkCacheHit(p, "scoped", singletonMemo, scopedMemo)).toBe(false);

    // Add to scoped memo
    scopedMemo.getOrElseMemoize(p, () => "val", undefined);
    expect(checkCacheHit(p, "scoped", singletonMemo, scopedMemo)).toBe(true);
  });
});

// =============================================================================
// factory.ts - initialized container edge cases
// =============================================================================

describe("factory.ts - initialized container edge cases", () => {
  it("tryInitialize returns ok with initialized wrapper", async () => {
    const adapter = makeLoggerAdapter();
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = await container.tryInitialize();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.isInitialized).toBe(true);
      expect(result.value.name).toBe("Test");
    }
  });

  it("initialized container initialize getter throws", async () => {
    const adapter = makeLoggerAdapter();
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    expect(() => initialized.initialize).toThrow();
  });

  it("initialized container tryInitialize getter throws", async () => {
    const adapter = makeLoggerAdapter();
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    expect(() => initialized.tryInitialize).toThrow();
  });

  it("initialized container tryResolve returns Ok", async () => {
    const adapter = makeLoggerAdapter("transient");
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    const result = initialized.tryResolve(LoggerPort);
    expect(result.isOk()).toBe(true);
  });

  it("initialized container tryResolveAsync returns Ok", async () => {
    const adapter = makeLoggerAdapter();
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    const result = await initialized.tryResolveAsync(LoggerPort);
    expect(result.isOk()).toBe(true);
  });

  it("initialized container tryDispose returns Ok", async () => {
    const adapter = makeLoggerAdapter();
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    const result = await initialized.tryDispose();
    expect(result.isOk()).toBe(true);
  });

  it("initialized container has INTERNAL_ACCESS", async () => {
    const adapter = makeLoggerAdapter();
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    const state = (initialized as any)[INTERNAL_ACCESS]();
    expect(state.containerName).toBe("Test");
    expect(state.disposed).toBe(false);
  });

  it("initialized container has ADAPTER_ACCESS", async () => {
    const adapter = makeLoggerAdapter();
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    const adapterResult = (initialized as any)[ADAPTER_ACCESS](LoggerPort);
    expect(adapterResult).toBeDefined();
  });

  it("initialized container parent throws", async () => {
    const adapter = makeLoggerAdapter();
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    expect(() => initialized.parent).toThrow();
  });

  it("initialized container is frozen", async () => {
    const adapter = makeLoggerAdapter();
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    expect(Object.isFrozen(initialized)).toBe(true);
  });

  it("initialized container createScope works", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    const scope = initialized.createScope("test-scope");
    const logger = scope.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("initialized container override works", async () => {
    const adapter = makeLoggerAdapter();
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();

    const mockLogger = { log: vi.fn() };
    const overrideAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => mockLogger,
    });

    const overridden = initialized.override(overrideAdapter).build();
    expect(overridden.resolve(LoggerPort)).toBe(mockLogger);
  });

  it("initialized container addHook fires for each resolution", async () => {
    const adapter = makeLoggerAdapter("transient");
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    const handler = vi.fn();
    initialized.addHook("beforeResolve", handler);

    initialized.resolve(LoggerPort);
    initialized.resolve(LoggerPort);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("initialized container removeHook stops firing", async () => {
    const adapter = makeLoggerAdapter("transient");
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    const handler = vi.fn();
    initialized.addHook("afterResolve", handler);
    initialized.resolve(LoggerPort);
    expect(handler).toHaveBeenCalledTimes(1);

    initialized.removeHook("afterResolve", handler);
    initialized.resolve(LoggerPort);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// container/base-impl.ts & root-impl.ts - multiple children and scopes
// =============================================================================

describe("base-impl.ts multiple children and scopes", () => {
  it("multiple child containers tracked independently", async () => {
    const adapter = makeLoggerAdapter();
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child1 = container.createChild(childGraph, { name: "Child1" });
    const child2 = container.createChild(childGraph, { name: "Child2" });
    const child3 = container.createChild(childGraph, { name: "Child3" });

    const state = (container as any)[INTERNAL_ACCESS]();
    expect(state.childContainers.length).toBe(3);

    await child2.dispose();

    const state2 = (container as any)[INTERNAL_ACCESS]();
    expect(state2.childContainers.length).toBe(2);
  });

  it("multiple scopes tracked independently", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const scope1 = container.createScope("scope1");
    const scope2 = container.createScope("scope2");
    const scope3 = container.createScope("scope3");

    const state = (container as any)[INTERNAL_ACCESS]();
    expect(state.childScopes.length).toBe(3);

    await scope1.dispose();

    const state2 = (container as any)[INTERNAL_ACCESS]();
    expect(state2.childScopes.length).toBe(2);

    await scope3.dispose();

    const state3 = (container as any)[INTERNAL_ACCESS]();
    expect(state3.childScopes.length).toBe(1);
  });

  it("container disposal cascades to all children and scopes", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child1 = container.createChild(childGraph, { name: "Child1" });
    const child2 = container.createChild(childGraph, { name: "Child2" });
    const scope1 = container.createScope("scope1");
    const scope2 = container.createScope("scope2");

    await container.dispose();

    expect(container.isDisposed).toBe(true);
    expect(child1.isDisposed).toBe(true);
    expect(child2.isDisposed).toBe(true);
    expect(scope1.isDisposed).toBe(true);
    expect(scope2.isDisposed).toBe(true);
  });
});

// =============================================================================
// scope/impl.ts - nested scope lifecycle
// =============================================================================

describe("scope/impl.ts nested scope lifecycle", () => {
  beforeEach(() => {
    resetScopeIdCounter();
  });

  it("nested scope getInternalState returns correct structure", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const scope = container.createScope("parent-scope");
    scope.resolve(LoggerPort);

    const state = (scope as any)[INTERNAL_ACCESS]();
    expect(state.id).toBeDefined();
    expect(state.disposed).toBe(false);
    expect(state.scopedMemo.size).toBe(1);
    expect(state.childScopes).toEqual([]);
  });

  it("nested scope getInternalState shows child scopes", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const scope = container.createScope("parent");
    const child = scope.createScope("child");

    const state = (scope as any)[INTERNAL_ACCESS]();
    expect(state.childScopes.length).toBe(1);
    expect(state.childScopes[0].id).toBeDefined();
  });

  it("deeply nested scopes cascade disposal correctly", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const level1 = container.createScope("L1");
    const level2 = level1.createScope("L2");
    const level3 = level2.createScope("L3");

    expect(level1.isDisposed).toBe(false);
    expect(level2.isDisposed).toBe(false);
    expect(level3.isDisposed).toBe(false);

    await level1.dispose();

    expect(level1.isDisposed).toBe(true);
    expect(level2.isDisposed).toBe(true);
    expect(level3.isDisposed).toBe(true);
  });

  it("scope has tryResolve / tryResolveAsync", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const scope = container.createScope("test");
    const result = scope.tryResolve(LoggerPort);
    expect(result.isOk()).toBe(true);
  });

  it("scope scoped instances are independent across sibling scopes", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const scope1 = container.createScope("scope1");
    const scope2 = container.createScope("scope2");

    const logger1 = scope1.resolve(LoggerPort);
    const logger2 = scope2.resolve(LoggerPort);

    expect(logger1).not.toBe(logger2);
  });

  it("scope singleton instances are shared from container", () => {
    const loggerAdapter = makeLoggerAdapter("singleton");
    const graph = GraphBuilder.create().provide(loggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const scope1 = container.createScope("scope1");
    const scope2 = container.createScope("scope2");

    const logger1 = scope1.resolve(LoggerPort);
    const logger2 = scope2.resolve(LoggerPort);

    expect(logger1).toBe(logger2);
  });
});

// =============================================================================
// builtin-api.ts - getGraphData adapter origin and isOverride
// =============================================================================

describe("builtin-api.ts getGraphData adapter detail", () => {
  it("root container adapters have origin 'own' and isOverride false", () => {
    const loggerAdapter = makeLoggerAdapter();
    const graph = GraphBuilder.create().provide(loggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const inspector = (container as any).inspector;
    const graphData = inspector.getGraphData();

    expect(graphData.adapters.length).toBe(1);
    expect(graphData.adapters[0].portName).toBe("Logger");
    expect(graphData.adapters[0].origin).toBe("own");
    expect(graphData.adapters[0].isOverride).toBe(false);
    expect(graphData.adapters[0].lifetime).toBe("singleton");
    expect(graphData.adapters[0].factoryKind).toBe("sync");
    expect(graphData.adapters[0].dependencyNames).toEqual([]);
  });

  it("adapter with dependencies has correct dependencyNames", () => {
    const loggerAdapter = makeLoggerAdapter();
    const dbAdapter = makeDbAdapter();
    const graph = GraphBuilder.create().provide(loggerAdapter).provide(dbAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const inspector = (container as any).inspector;
    const graphData = inspector.getGraphData();
    const dbInfo = graphData.adapters.find((a: any) => a.portName === "Database");

    expect(dbInfo).toBeDefined();
    expect(dbInfo.dependencyNames).toEqual(["Logger"]);
  });

  it("child override adapter has isOverride true and origin 'overridden'", () => {
    const loggerAdapter = makeLoggerAdapter();
    const graph = GraphBuilder.create().provide(loggerAdapter).build();
    const container = createContainer({ graph, name: "Parent" });

    const overrideAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => "overridden" }),
    });
    const childGraph = GraphBuilder.create().override(overrideAdapter).build();
    const child = container.createChild(childGraph, { name: "Child" });

    const inspector = (child as any).inspector;
    const graphData = inspector.getGraphData();
    const loggerInfo = graphData.adapters.find((a: any) => a.portName === "Logger");

    expect(loggerInfo).toBeDefined();
    expect(loggerInfo.isOverride).toBe(true);
    expect(loggerInfo.origin).toBe("overridden");
  });

  it("child with extension adapter has correct origin 'own'", () => {
    const loggerAdapter = makeLoggerAdapter();
    const graph = GraphBuilder.create().provide(loggerAdapter).build();
    const container = createContainer({ graph, name: "Parent" });

    const dbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });
    const childGraph = GraphBuilder.create().provide(dbAdapter).build();
    const child = container.createChild(childGraph, { name: "Child" });

    const inspector = (child as any).inspector;
    const graphData = inspector.getGraphData();
    const dbInfo = graphData.adapters.find((a: any) => a.portName === "Database");

    expect(dbInfo).toBeDefined();
    expect(dbInfo.origin).toBe("own");
    expect(dbInfo.isOverride).toBe(false);
  });

  it("graphData adapters are frozen", () => {
    const loggerAdapter = makeLoggerAdapter();
    const graph = GraphBuilder.create().provide(loggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const inspector = (container as any).inspector;
    const graphData = inspector.getGraphData();

    expect(Object.isFrozen(graphData)).toBe(true);
    expect(Object.isFrozen(graphData.adapters)).toBe(true);
    if (graphData.adapters.length > 0) {
      expect(Object.isFrozen(graphData.adapters[0])).toBe(true);
    }
  });
});

// =============================================================================
// Root container - async initialization flow
// =============================================================================

describe("root container async initialization", () => {
  it("async adapter requires initialize() before sync resolve", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factoryKind: "async",
      factory: async () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    // Sync resolve should fail for async adapter
    expect(() => container.resolve(LoggerPort)).toThrow(/async/i);
  });

  it("after initialize(), sync resolve works for async adapter", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factoryKind: "async",
      factory: async () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    const logger = initialized.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("initialize returns same wrapper on repeated calls", async () => {
    const adapter = makeLoggerAdapter();
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const a = await container.initialize();
    const b = await container.initialize();
    expect(a).toBe(b);
  });
});
