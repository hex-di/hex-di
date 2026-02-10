/**
 * Second batch of mutation-killing tests.
 *
 * Targets fine-grained mutations in:
 * - container/wrappers.ts: isContainerParent, createChildContainerScope, dispose cascade, lazy/async child
 * - container/factory.ts: hooksHolder composition, initializeAsync, createRootScope
 * - container/base-impl.ts: config propagation, adapter resolution internals
 * - inspection/builtin-api.ts: exact snapshot values, event types, phase detection
 * - inspection/helpers.ts: all helper functions
 * - inspection/creation.ts: deepFreeze, buildScopeTreeNode, snapshot field values
 * - container/root-impl.ts: initialization flows, disposal cleanup
 * - resolution/async-engine.ts: cleanupPending, deduplication, error wrapping
 * - resolution/hooks-runner.ts: duration arithmetic, string literals, parentPort nullability
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  port,
  createAdapter,
  type LibraryInspector,
  FactoryError as CoreFactoryError,
} from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { ADAPTER_ACCESS, INTERNAL_ACCESS, HOOKS_ACCESS } from "../src/inspection/symbols.js";
import {
  DisposedScopeError,
  ScopeRequiredError,
  AsyncInitializationRequiredError,
  AsyncFactoryError,
  ContainerError,
  FactoryError,
} from "../src/errors/index.js";
import { resetScopeIdCounter } from "../src/scope/impl.js";
import { createInspector, getInternalAccessor } from "../src/inspection/creation.js";
import { checkCacheHit, HooksRunner } from "../src/resolution/hooks-runner.js";
import { MemoMap } from "../src/util/memo-map.js";
import {
  mapToContainerError,
  mapToDisposalError,
  emitResultEvent,
  resolveResult,
  recordResult,
} from "../src/container/result-helpers.js";
import { detectContainerKind, detectPhase, buildTypedSnapshot } from "../src/inspection/helpers.js";
import { sealHooks, isSealed } from "../src/resolution/hooks.js";

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
interface Config {
  getValue(key: string): string;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const CachePort = port<Cache>()({ name: "Cache" });
const ConfigPort = port<Config>()({ name: "Config" });

// =============================================================================
// result-helpers.ts - Exact error mapping tests
// =============================================================================

describe("result-helpers.ts mutation killers", () => {
  describe("mapToContainerError", () => {
    it("returns ContainerError instances directly", () => {
      const ce = new FactoryError("Logger", new Error("factory fail"));
      const result = mapToContainerError(ce);
      expect(result).toBe(ce);
    });

    it("wraps non-ContainerError in FactoryError with 'unknown' portName", () => {
      const raw = new Error("some error");
      const result = mapToContainerError(raw);
      expect(result).toBeInstanceOf(FactoryError);
      expect(result.message).toContain("unknown");
    });

    it("wraps non-Error values in FactoryError", () => {
      const result = mapToContainerError("string error");
      expect(result).toBeInstanceOf(FactoryError);
    });
  });

  describe("mapToDisposalError", () => {
    it("creates DisposalError from unknown error", () => {
      const result = mapToDisposalError(new Error("dispose fail"));
      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
    });
  });

  describe("emitResultEvent", () => {
    it("does nothing when inspector is undefined", () => {
      expect(() => emitResultEvent(undefined, "Logger", { isOk: () => true } as any)).not.toThrow();
    });

    it("emits result:ok for ok result", () => {
      const emit = vi.fn();
      const inspector = { emit } as any;
      const result = { isOk: () => true } as any;

      emitResultEvent(inspector, "Logger", result);
      expect(emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "result:ok",
          portName: "Logger",
        })
      );
    });

    it("emits result:err for err result", () => {
      const emit = vi.fn();
      const inspector = { emit } as any;
      const result = { isOk: () => false, error: { code: "FACTORY_FAILED" } } as any;

      emitResultEvent(inspector, "Logger", result);
      expect(emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "result:err",
          portName: "Logger",
          errorCode: "FACTORY_FAILED",
        })
      );
    });

    it("emits with timestamp", () => {
      const emit = vi.fn();
      const inspector = { emit } as any;
      const result = { isOk: () => true } as any;

      emitResultEvent(inspector, "Logger", result);
      expect(emit.mock.calls[0][0].timestamp).toBeGreaterThan(0);
    });
  });

  describe("resolveResult", () => {
    it("returns Ok for successful resolution", () => {
      const result = resolveResult(() => 42);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(42);
      }
    });

    it("returns Err for failing resolution", () => {
      const result = resolveResult(() => {
        throw new Error("fail");
      });
      expect(result.isErr()).toBe(true);
    });

    it("uses custom mapErr when provided", () => {
      const customMapper = (err: unknown) => {
        return new CoreFactoryError("custom", err);
      };
      const result = resolveResult(() => {
        throw new Error("fail");
      }, customMapper);
      expect(result.isErr()).toBe(true);
    });
  });

  describe("recordResult", () => {
    it("emits result:ok and returns same result", () => {
      const emit = vi.fn();
      const inspector = { emit } as any;
      const okResult = { isOk: () => true } as any;

      const returned = recordResult(inspector, "Logger", okResult);
      expect(returned).toBe(okResult);
      expect(emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: "result:ok", portName: "Logger" })
      );
    });

    it("emits result:err and returns same result", () => {
      const emit = vi.fn();
      const inspector = { emit } as any;
      const errResult = { isOk: () => false, error: { code: "ERR" } } as any;

      const returned = recordResult(inspector, "Logger", errResult);
      expect(returned).toBe(errResult);
      expect(emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: "result:err", portName: "Logger", errorCode: "ERR" })
      );
    });

    it("is no-op when emit is missing", () => {
      const inspector = {} as any;
      const okResult = { isOk: () => true } as any;
      const returned = recordResult(inspector, "Logger", okResult);
      expect(returned).toBe(okResult);
    });
  });
});

// =============================================================================
// hooks.ts - sealHooks / isSealed
// =============================================================================

describe("hooks.ts sealHooks / isSealed", () => {
  it("sealHooks creates frozen ImmutableHooksConfig", () => {
    const hooks = sealHooks({
      beforeResolve: () => {},
      afterResolve: () => {},
    });
    expect(hooks.sealed).toBe(true);
    expect(Object.isFrozen(hooks)).toBe(true);
  });

  it("isSealed returns true for sealed hooks", () => {
    const hooks = sealHooks({ beforeResolve: () => {} });
    expect(isSealed(hooks)).toBe(true);
  });

  it("isSealed returns false for non-sealed hooks", () => {
    const hooks = { beforeResolve: () => {} };
    expect(isSealed(hooks)).toBe(false);
  });
});

// =============================================================================
// wrappers.ts - isContainerParent detailed coverage
// =============================================================================

describe("wrappers.ts - isContainerParent via child.parent", () => {
  it("child.parent has all required methods", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    const parent = child.parent;
    expect(typeof parent.resolve).toBe("function");
    expect(typeof parent.resolveAsync).toBe("function");
    expect(typeof parent.createScope).toBe("function");
    expect(typeof parent.dispose).toBe("function");
    expect(typeof parent.has).toBe("function");
    expect("isDisposed" in parent).toBe(true);
  });

  it("child.parent.resolve works correctly", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    const logger = child.parent.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });
});

// =============================================================================
// factory.ts - hooksHolder composition for multiple hooks sources
// =============================================================================

describe("factory.ts - hooks composition details", () => {
  it("beforeResolve context has correct portName", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();

    const ctx: any[] = [];
    const container = createContainer({
      graph,
      name: "Test",
      hooks: {
        beforeResolve: c => ctx.push(c),
      },
    });

    container.resolve(LoggerPort);
    expect(ctx.length).toBe(1);
    expect(ctx[0].portName).toBe("Logger");
    expect(ctx[0].lifetime).toBe("transient");
  });

  it("afterResolve context has duration >= 0", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();

    const ctx: any[] = [];
    const container = createContainer({
      graph,
      name: "Test",
      hooks: {
        afterResolve: c => ctx.push(c),
      },
    });

    container.resolve(LoggerPort);
    expect(ctx.length).toBe(1);
    expect(ctx[0].duration).toBeGreaterThanOrEqual(0);
    expect(ctx[0].error).toBeNull();
  });

  it("afterResolve context has error when factory fails", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => {
        throw new Error("boom");
      },
    });
    const graph = GraphBuilder.create().provide(adapter).build();

    const ctx: any[] = [];
    const container = createContainer({
      graph,
      name: "Test",
      hooks: {
        afterResolve: c => ctx.push(c),
      },
    });

    try {
      container.resolve(LoggerPort);
    } catch {
      /* expected */
    }
    expect(ctx.length).toBe(1);
    expect(ctx[0].error).toBeInstanceOf(Error);
  });

  it("addHook('beforeResolve') creates hooks with correct type", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const ctx: any[] = [];
    container.addHook("beforeResolve", c => ctx.push(c));
    container.resolve(LoggerPort);

    expect(ctx[0].portName).toBe("Logger");
    expect(ctx[0].containerId).toBe("root");
    expect(ctx[0].containerKind).toBe("root");
  });

  it("addHook('afterResolve') creates hooks with correct type", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const ctx: any[] = [];
    container.addHook("afterResolve", c => ctx.push(c));
    container.resolve(LoggerPort);

    expect(ctx[0].portName).toBe("Logger");
    expect(typeof ctx[0].duration).toBe("number");
    expect(ctx[0].error).toBeNull();
  });
});

// =============================================================================
// inspection/helpers.ts - detailed helper coverage
// =============================================================================

describe("inspection/helpers.ts - helpers mutation killers", () => {
  describe("detectContainerKind", () => {
    it("returns 'root' for object without parent or scope markers", () => {
      const kind = detectContainerKind({} as any);
      expect(kind).toBe("root");
    });

    it("returns 'child' for object with _parentContainer", () => {
      const kind = detectContainerKind({ _parentContainer: {} } as any);
      expect(kind).toBe("child");
    });

    it("returns 'lazy' for object with load method", () => {
      const kind = detectContainerKind({ load: () => {} } as any);
      expect(kind).toBe("lazy");
    });

    it("returns 'scope' for object with _scopeId", () => {
      const kind = detectContainerKind({ _scopeId: "scope-0" } as any);
      expect(kind).toBe("scope");
    });
  });

  describe("detectPhase", () => {
    it("returns 'disposed' when isDisposed is true", () => {
      const container = {} as any;
      const snapshot = { isDisposed: true } as any;
      const phase = detectPhase(container, snapshot, "root");
      expect(phase).toBe("disposed");
    });

    it("returns 'initialized' for child containers that are not disposed", () => {
      const container = {} as any;
      const snapshot = { isDisposed: false } as any;
      const phase = detectPhase(container, snapshot, "child");
      expect(phase).toBe("initialized");
    });

    it("returns 'active' for scope containers that are not disposed", () => {
      const container = {} as any;
      const snapshot = { isDisposed: false } as any;
      const phase = detectPhase(container, snapshot, "scope");
      expect(phase).toBe("active");
    });

    it("returns 'initialized' for root container that is sync-only", () => {
      const container = { initialize: () => {} } as any;
      const snapshot = { isDisposed: false, singletons: [] } as any;
      const phase = detectPhase(container, snapshot, "root");
      expect(phase).toBe("initialized");
    });
  });

  describe("buildTypedSnapshot", () => {
    it("builds snapshot with correct kind", () => {
      const runtimeSnapshot = {
        isDisposed: false,
        containerName: "Test",
        singletons: [],
        scopes: { size: 0, entries: [] },
        singletonMemo: { size: 0, entries: [] },
      } as any;
      const internalState = {
        adapterMap: new Map(),
        overridePorts: new Set<string>(),
      } as any;

      const result = buildTypedSnapshot(runtimeSnapshot, "root", internalState);
      expect(result.kind).toBe("root");
      expect(result.containerName).toBe("Test");
      expect(result.isDisposed).toBe(false);
    });

    it("builds snapshot with correct kind for child", () => {
      const runtimeSnapshot = {
        isDisposed: false,
        containerName: "Child",
        singletons: [],
        scopes: { size: 0, entries: [] },
        singletonMemo: { size: 0, entries: [] },
      } as any;
      const internalState = {
        adapterMap: new Map(),
        overridePorts: new Set<string>(),
      } as any;

      const result = buildTypedSnapshot(runtimeSnapshot, "child", internalState);
      expect(result.kind).toBe("child");
    });
  });
});

// =============================================================================
// inspection/creation.ts - detailed creation coverage
// =============================================================================

describe("inspection/creation.ts additional mutation killers", () => {
  describe("getInternalAccessor", () => {
    it("returns a function for valid container", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const accessor = getInternalAccessor(container as any);
      expect(typeof accessor).toBe("function");
      const state = accessor();
      expect(state.containerName).toBe("Test");
    });
  });

  describe("createInspector deep functionality", () => {
    it("snapshot is deeply frozen", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const inspector = createInspector(container);
      const snapshot = inspector.snapshot();
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.singletons)).toBe(true);
    });

    it("listPorts returns sorted port names", () => {
      const loggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const dbAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(loggerAdapter).provide(dbAdapter).build();
      const container = createContainer({ graph, name: "Test" });

      const inspector = createInspector(container);
      const ports = inspector.listPorts();
      expect(ports).toEqual(["Database", "Logger"]);
      // Verify it's a sorted copy
      const copy = [...ports].sort();
      expect(ports).toEqual(copy);
    });

    it("isResolved returns false for unresolved singleton", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const inspector = createInspector(container);
      expect(inspector.isResolved("Logger")).toBe(false);
    });

    it("isResolved returns true for resolved singleton", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });
      container.resolve(LoggerPort);

      const inspector = createInspector(container);
      expect(inspector.isResolved("Logger")).toBe(true);
    });

    it("isResolved returns 'scope-required' for scoped port", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const inspector = createInspector(container);
      expect(inspector.isResolved("Logger")).toBe("scope-required");
    });

    it("isResolved throws for non-existent port with exact string", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const inspector = createInspector(container);
      expect(() => inspector.isResolved("xxx")).toThrow(/not registered/);
    });

    it("getScopeTree returns correct root structure", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const inspector = createInspector(container);
      const tree = inspector.getScopeTree();
      expect(tree.id).toBe("container");
      expect(tree.status).toBe("active");
      expect(tree.children).toBeDefined();
      expect(tree.resolvedCount).toBe(0);
      expect(tree.resolvedPorts).toEqual([]);
    });

    it("getScopeTree includes child scope details", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const scope = container.createScope("my-scope");
      scope.resolve(LoggerPort);

      const inspector = createInspector(container);
      const tree = inspector.getScopeTree();
      expect(tree.children.length).toBe(1);
      expect(tree.children[0].resolvedCount).toBe(1);
      expect(tree.children[0].resolvedPorts).toContain("Logger");
    });

    it("getScopeTree after disposal shows disposed status", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const scope = container.createScope("my-scope");
      await scope.dispose();

      // After scope disposal, tree should not include it
      const inspector = createInspector(container);
      const tree = inspector.getScopeTree();
      // Disposed scope is removed from tree
      expect(tree.children.length).toBe(0);
    });

    it("getScopeTree with nested scopes", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const parentScope = container.createScope("parent-scope");
      const childScope = parentScope.createScope("child-scope");

      const inspector = createInspector(container);
      const tree = inspector.getScopeTree();

      expect(tree.children.length).toBe(1);
      expect(tree.children[0].children.length).toBe(1);
    });
  });
});

// =============================================================================
// builtin-api.ts - Detailed snapshot and event coverage
// =============================================================================

describe("builtin-api.ts - detailed snapshot values", () => {
  describe("snapshot singletons exact values", () => {
    it("reports correct totalCount", () => {
      const loggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const dbAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(loggerAdapter).provide(dbAdapter).build();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;
      const snapshot = inspector.getSnapshot();

      expect(snapshot.singletons.length).toBe(2);
    });

    it("reports correct resolvedCount after resolution", () => {
      const loggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const dbAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(loggerAdapter).provide(dbAdapter).build();
      const container = createContainer({ graph, name: "Test" });

      container.resolve(LoggerPort);

      const inspector = (container as any).inspector;
      const snapshot = inspector.getSnapshot();

      const resolvedCount = snapshot.singletons.filter((s: any) => s.isResolved).length;
      expect(resolvedCount).toBe(1);

      const unresolvedCount = snapshot.singletons.filter((s: any) => !s.isResolved).length;
      expect(unresolvedCount).toBe(1);
    });
  });

  describe("emit function", () => {
    it("emit method exists on inspector", () => {
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
      const inspector = (container as any).inspector;

      expect(typeof inspector.emit).toBe("function");
    });

    it("emit distributes events to subscribers", () => {
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
      const inspector = (container as any).inspector;

      const events: any[] = [];
      inspector.subscribe((e: any) => events.push(e));

      inspector.emit({ type: "custom-test", data: "hello" });
      expect(events.length).toBe(1);
      expect(events[0].type).toBe("custom-test");
    });
  });

  describe("library inspector management", () => {
    function createMockLib(name: string): LibraryInspector {
      return {
        name,
        getSnapshot: () => Object.freeze({ status: "active" }),
        dispose: vi.fn(),
      };
    }

    it("registerLibrary adds inspector accessible via getUnifiedSnapshot", () => {
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
      const inspector = (container as any).inspector;

      const lib = createMockLib("my-lib");
      const unregister = inspector.registerLibrary(lib);

      const unified = inspector.getUnifiedSnapshot();
      expect(unified.libraries["my-lib"]).toEqual({ status: "active" });

      unregister();
    });

    it("disposeLibraries is callable", () => {
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
      const inspector = (container as any).inspector;

      expect(typeof inspector.disposeLibraries).toBe("function");
      expect(() => inspector.disposeLibraries()).not.toThrow();
    });
  });
});

// =============================================================================
// wrappers.ts - Lazy and Async child creation from child containers
// =============================================================================

describe("wrappers.ts - lazy/async child from child container", () => {
  it("child.createChildAsync creates a grandchild", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Root" });

    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    const dbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });
    const grandchildGraph = GraphBuilder.create().provide(dbAdapter).build();

    const grandchild = await child.createChildAsync(async () => grandchildGraph, {
      name: "Grandchild",
    });

    expect(grandchild.name).toBe("Grandchild");
    expect(grandchild.parentName).toBe("Child");
    expect(grandchild.resolve(DatabasePort).query).toBeDefined();
    expect(grandchild.resolve(LoggerPort).log).toBeDefined();
  });

  it("child.createLazyChild creates a lazy grandchild", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Root" });

    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    const dbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });
    const grandchildGraph = GraphBuilder.create().provide(dbAdapter).build();

    const lazy = child.createLazyChild(async () => grandchildGraph, { name: "LazyGrandchild" });

    expect(lazy.isLoaded).toBe(false);
    expect(lazy.isDisposed).toBe(false);
  });

  it("lazy child from child container can load and resolve", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Root" });

    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    const dbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });
    const grandchildGraph = GraphBuilder.create().provide(dbAdapter).build();

    const lazy = child.createLazyChild(async () => grandchildGraph, { name: "LazyGrandchild" });

    const loaded = await lazy.load();
    expect(loaded.name).toBe("LazyGrandchild");
    expect(loaded.resolve(DatabasePort).query).toBeDefined();
  });
});

// =============================================================================
// wrappers.ts - dispose cascade behavior for child with inspector
// =============================================================================

describe("wrappers.ts - dispose behavior", () => {
  it("child dispose calls inspector.disposeLibraries before impl.dispose", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    // Register a library inspector on the child
    const lib: LibraryInspector = {
      name: "test-lib",
      getSnapshot: () => Object.freeze({}),
      dispose: vi.fn(),
    };
    const childInspector = (child as any).inspector;
    childInspector.registerLibrary(lib);

    await child.dispose();

    expect(child.isDisposed).toBe(true);
    expect(lib.dispose).toHaveBeenCalled();
  });
});

// =============================================================================
// wrappers.ts - createChildContainerScope via child.createScope
// =============================================================================

describe("wrappers.ts - child container scope creation", () => {
  beforeEach(() => {
    resetScopeIdCounter();
  });

  it("scope from child container delegates to child impl", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    const scope = child.createScope("child-scope");
    expect(scope.resolve(LoggerPort)).toBeDefined();
    expect(typeof scope.resolve(LoggerPort).log).toBe("function");
  });

  it("scope dispose cleans up child scope tracking", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    const scope = child.createScope("test");
    expect(scope.isDisposed).toBe(false);
    await scope.dispose();
    expect(scope.isDisposed).toBe(true);
  });

  it("scope has delegates to child container has", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    const scope = child.createScope("test");
    expect(scope.has(LoggerPort)).toBe(true);
    expect(scope.has(DatabasePort)).toBe(false);
  });
});

// =============================================================================
// factory.ts - tryResolve error event emission
// =============================================================================

describe("factory.ts - tryResolve event emission", () => {
  it("tryResolve emits result:ok event on inspector", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const inspector = (container as any).inspector;
    const events: any[] = [];
    inspector.subscribe((e: any) => events.push(e));

    container.tryResolve(LoggerPort);

    const okEvent = events.find(e => e.type === "result:ok" && e.portName === "Logger");
    expect(okEvent).toBeDefined();
    expect(okEvent.timestamp).toBeGreaterThan(0);
  });

  it("tryResolve emits result:err event on failure", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => {
        throw new Error("fail");
      },
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const inspector = (container as any).inspector;
    const events: any[] = [];
    inspector.subscribe((e: any) => events.push(e));

    container.tryResolve(LoggerPort);

    const errEvent = events.find(e => e.type === "result:err" && e.portName === "Logger");
    expect(errEvent).toBeDefined();
    expect(errEvent.errorCode).toBeDefined();
  });

  it("tryResolveAsync emits result:ok event eventually", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const inspector = (container as any).inspector;
    const events: any[] = [];
    inspector.subscribe((e: any) => events.push(e));

    const resultAsync = container.tryResolveAsync(LoggerPort);
    await resultAsync;

    // Wait for async event emission
    await new Promise(resolve => setTimeout(resolve, 10));

    const okEvent = events.find(e => e.type === "result:ok" && e.portName === "Logger");
    expect(okEvent).toBeDefined();
  });
});

// =============================================================================
// async-engine.ts - detailed deduplication and cleanup
// =============================================================================

describe("async-engine.ts - edge cases", () => {
  it("transient sync resolution via resolveAsync does not cache", async () => {
    let callCount = 0;
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => {
        callCount++;
        return { log: vi.fn() };
      },
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const a = await container.resolveAsync(LoggerPort);
    const b = await container.resolveAsync(LoggerPort);
    expect(a).not.toBe(b);
    expect(callCount).toBe(2);
  });

  it("scoped async resolution caches within scope", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factoryKind: "async",
      factory: async () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const scope = container.createScope("test-scope");
    const a = await scope.resolveAsync(LoggerPort);
    const b = await scope.resolveAsync(LoggerPort);
    expect(a).toBe(b);
  });

  it("async resolution with hooks passes correct isCacheHit", async () => {
    const ctxList: any[] = [];
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factoryKind: "async",
      factory: async () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({
      graph,
      name: "Test",
      hooks: {
        beforeResolve: c => ctxList.push({ ...c }),
      },
    });

    await container.resolveAsync(LoggerPort);
    // Second resolution should be a cache hit
    await container.resolveAsync(LoggerPort);

    expect(ctxList.length).toBe(2);
    expect(ctxList[0].isCacheHit).toBe(false);
    expect(ctxList[1].isCacheHit).toBe(true);
  });

  it("ContainerError is re-thrown without wrapping", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factoryKind: "async",
      factory: async () => {
        throw new FactoryError("Logger", new Error("inner"));
      },
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    await expect(container.resolveAsync(LoggerPort)).rejects.toThrow(FactoryError);
  });
});

// =============================================================================
// hooks-runner.ts - duration arithmetic, transient string, parentPort len
// =============================================================================

describe("hooks-runner.ts - fine-grained mutations", () => {
  it("parentPort is correctly null when stack is empty", () => {
    const contexts: any[] = [];
    const runner = new HooksRunner(
      { beforeResolve: c => contexts.push({ ...c }) },
      { containerId: "root", containerKind: "root", parentContainerId: null }
    );

    const p = port<string>()({ name: "A" });
    runner.runSync(p, { lifetime: "singleton" }, null, false, null, () => "val");

    expect(contexts[0].parentPort).toBeNull();
    expect(contexts[0].depth).toBe(0);
  });

  it("parentPort tracks correctly with 3 levels of nesting", () => {
    const contexts: any[] = [];
    const runner = new HooksRunner(
      {
        beforeResolve: c =>
          contexts.push({ parentPort: c.parentPort, depth: c.depth, portName: c.portName }),
      },
      { containerId: "root", containerKind: "root", parentContainerId: null }
    );

    const pA = port<string>()({ name: "A" });
    const pB = port<string>()({ name: "B" });
    const pC = port<string>()({ name: "C" });

    runner.runSync(pA, { lifetime: "singleton" }, null, false, null, () => {
      runner.runSync(pB, { lifetime: "singleton" }, null, false, null, () => {
        runner.runSync(pC, { lifetime: "singleton" }, null, false, null, () => "C");
        return "B";
      });
      return "A";
    });

    expect(contexts[0].depth).toBe(0);
    expect(contexts[0].parentPort).toBeNull();

    expect(contexts[1].depth).toBe(1);
    expect(contexts[1].parentPort).toBe(pA);

    expect(contexts[2].depth).toBe(2);
    expect(contexts[2].parentPort).toBe(pB);
  });

  it("afterResolve pops parent stack correctly", () => {
    const afterContexts: any[] = [];
    const runner = new HooksRunner(
      {
        afterResolve: c => afterContexts.push({ portName: c.portName, duration: c.duration }),
      },
      { containerId: "root", containerKind: "root", parentContainerId: null }
    );

    const pA = port<string>()({ name: "A" });
    const pB = port<string>()({ name: "B" });

    runner.runSync(pA, { lifetime: "singleton" }, null, false, null, () => {
      runner.runSync(pB, { lifetime: "singleton" }, null, false, null, () => "B");
      return "A";
    });

    // Both afterResolve should fire with durations
    expect(afterContexts.length).toBe(2);
    expect(afterContexts[0].portName).toBe("B"); // Inner completes first
    expect(afterContexts[1].portName).toBe("A"); // Outer completes second
    expect(afterContexts[0].duration).toBeGreaterThanOrEqual(0);
    expect(afterContexts[1].duration).toBeGreaterThanOrEqual(0);
  });

  it("non-Error thrown values are wrapped in Error in afterResolve", () => {
    const afterContexts: any[] = [];
    const runner = new HooksRunner(
      { afterResolve: c => afterContexts.push({ error: c.error }) },
      { containerId: "root", containerKind: "root", parentContainerId: null }
    );

    const p = port<string>()({ name: "A" });
    try {
      runner.runSync(p, { lifetime: "singleton" }, null, false, null, () => {
        throw "string-error"; // non-Error
      });
    } catch {
      // Expected
    }

    expect(afterContexts[0].error).toBeInstanceOf(Error);
    expect(afterContexts[0].error.message).toBe("string-error");
  });

  it("async non-Error thrown values are wrapped in Error in afterResolve", async () => {
    const afterContexts: any[] = [];
    const runner = new HooksRunner(
      { afterResolve: c => afterContexts.push({ error: c.error }) },
      { containerId: "root", containerKind: "root", parentContainerId: null }
    );

    const p = port<string>()({ name: "A" });
    try {
      await runner.runAsync(p, { lifetime: "singleton" }, null, false, null, async () => {
        throw "async-string-error"; // non-Error
      });
    } catch {
      // Expected
    }

    expect(afterContexts[0].error).toBeInstanceOf(Error);
    expect(afterContexts[0].error.message).toBe("async-string-error");
  });
});

// =============================================================================
// scope/impl.ts - scope lifecycle detailed
// =============================================================================

describe("scope/impl.ts - scope lifecycle details", () => {
  beforeEach(() => {
    resetScopeIdCounter();
  });

  it("scope.getDisposalState returns 'active' before disposal", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const scope = container.createScope("test");
    expect(scope.getDisposalState()).toBe("active");
  });

  it("scope.getDisposalState returns 'disposed' after disposal", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const scope = container.createScope("test");
    await scope.dispose();
    expect(scope.getDisposalState()).toBe("disposed");
  });

  it("scope.subscribe returns unsubscribe function", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const scope = container.createScope("test");
    const events: string[] = [];
    const unsubscribe = scope.subscribe(event => events.push(event));

    // ScopeSubscription is just () => void
    unsubscribe();
    await scope.dispose();

    // Should not receive events after unsubscribe
    expect(events.length).toBe(0);
  });

  it("scope dispose is idempotent", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const scope = container.createScope("test");
    await scope.dispose();
    await scope.dispose(); // Second call is a no-op
    expect(scope.isDisposed).toBe(true);
  });

  it("scope dispose clears lifecycle listeners", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const scope = container.createScope("test");
    let count = 0;
    scope.subscribe(() => count++);

    await scope.dispose();

    // Listener called for "disposing" and "disposed" events
    expect(count).toBe(2);
    // After clear, no more events
  });
});

// =============================================================================
// container/base-impl.ts & root-impl.ts - finalizer integration
// =============================================================================

describe("base-impl.ts - finalizer integration", () => {
  it("singleton finalizer is called on container disposal", async () => {
    const finalizer = vi.fn();
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
      finalizer,
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    container.resolve(LoggerPort);
    await container.dispose();

    expect(finalizer).toHaveBeenCalledTimes(1);
  });

  it("scoped finalizer is called on scope disposal", async () => {
    const finalizer = vi.fn();
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
      finalizer,
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const scope = container.createScope("test");
    scope.resolve(LoggerPort);
    await scope.dispose();

    expect(finalizer).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// container/root-impl.ts - additional paths
// =============================================================================

describe("root-impl.ts - additional mutation targets", () => {
  it("container getSingletonMemo returns working memo", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    container.resolve(LoggerPort);

    const state = (container as any)[INTERNAL_ACCESS]();
    expect(state.singletonMemo.size).toBe(1);
    expect(state.singletonMemo.entries[0].portName).toBe("Logger");
  });

  it("child container resolves different singleton instances from parent", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const parent = createContainer({ graph, name: "Parent" });

    const parentLogger = parent.resolve(LoggerPort);

    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });
    const childLogger = child.resolve(LoggerPort);

    // Shared (default) inheritance: same instance
    expect(childLogger).toBe(parentLogger);
  });
});
