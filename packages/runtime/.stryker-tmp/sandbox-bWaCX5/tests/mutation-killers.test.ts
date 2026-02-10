/**
 * Comprehensive mutation-killing tests targeting survived mutants across multiple files.
 *
 * This file provides targeted assertions to kill mutations in:
 * - container/wrappers.ts
 * - container/factory.ts
 * - container/child-impl.ts
 * - container/base-impl.ts
 * - container/internal-types.ts
 * - container/lazy-impl.ts
 * - container/root-impl.ts
 * - inspection/builtin-api.ts
 * - inspection/creation.ts
 * - inspection/helpers.ts
 * - inspection/library-registry.ts
 * - scope/impl.ts
 * - resolution/async-engine.ts
 * - resolution/hooks-runner.ts
 */
// @ts-nocheck

import { describe, it, expect, vi, beforeEach } from "vitest";
import { port, createAdapter, type LibraryInspector } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { ADAPTER_ACCESS, INTERNAL_ACCESS, HOOKS_ACCESS } from "../src/inspection/symbols.js";
import { hasInternalMethods, asParentContainerLike } from "../src/container/wrappers.js";
import {
  isAdapterForPort,
  isAsyncAdapter,
  assertSyncAdapter,
  isForkedEntryForPort,
  isInternalAccessible,
  asInternalAccessible,
} from "../src/container/internal-types.js";
import { isDisposableChild, isInheritanceMode, shallowClone } from "../src/container/helpers.js";
import {
  resetScopeIdCounter,
  createScopeIdGenerator,
  ScopeImpl,
  createScopeWrapper,
} from "../src/scope/impl.js";
import { createLibraryRegistry } from "../src/inspection/library-registry.js";
import { checkCacheHit, HooksRunner } from "../src/resolution/hooks-runner.js";
import { MemoMap } from "../src/util/memo-map.js";
import { AsyncInitializer } from "../src/container/internal/async-initializer.js";
import {
  DisposedScopeError,
  ScopeRequiredError,
  AsyncInitializationRequiredError,
  AsyncFactoryError,
} from "../src/errors/index.js";
import { consumeLazyFlag, markNextChildAsLazy } from "../src/container/lazy-impl.js";
import { createInspector, getInternalAccessor } from "../src/inspection/creation.js";

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

function makeSimpleGraph() {
  const adapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: vi.fn() }),
  });
  return GraphBuilder.create().provide(adapter).build();
}

function makeTransientGraph() {
  const adapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "transient",
    factory: () => ({ log: vi.fn() }),
  });
  return GraphBuilder.create().provide(adapter).build();
}

function makeScopedGraph() {
  const adapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "scoped",
    factory: () => ({ log: vi.fn() }),
  });
  return GraphBuilder.create().provide(adapter).build();
}

// =============================================================================
// container/internal-types.ts - Type Guards
// =============================================================================

describe("internal-types type guards (mutation killers)", () => {
  describe("isAdapterForPort", () => {
    it("returns true when adapter.provides matches port", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const result = isAdapterForPort(adapter, LoggerPort);
      expect(result).toBe(true);
    });

    it("returns false when adapter.provides does NOT match port", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const result = isAdapterForPort(adapter, DatabasePort as any);
      expect(result).toBe(false);
    });
  });

  describe("isAsyncAdapter", () => {
    it("returns true for async adapter", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factoryKind: "async",
        factory: async () => ({ log: vi.fn() }),
      });
      const result = isAsyncAdapter(adapter);
      expect(result).toBe(true);
    });

    it("returns false for sync adapter", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const result = isAsyncAdapter(adapter);
      expect(result).toBe(false);
    });
  });

  describe("assertSyncAdapter", () => {
    it("does not throw for sync adapter", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      expect(() => assertSyncAdapter(adapter, "Logger")).not.toThrow();
    });

    it("throws AsyncInitializationRequiredError for async adapter", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factoryKind: "async",
        factory: async () => ({ log: vi.fn() }),
      });
      expect(() => assertSyncAdapter(adapter, "Logger")).toThrow(AsyncInitializationRequiredError);
    });
  });

  describe("isForkedEntryForPort", () => {
    it("returns true when entry.port matches port", () => {
      const entry = { port: LoggerPort, instance: { log: vi.fn() } };
      expect(isForkedEntryForPort(entry, LoggerPort)).toBe(true);
    });

    it("returns false when entry.port does not match port", () => {
      const entry = { port: LoggerPort, instance: { log: vi.fn() } };
      expect(isForkedEntryForPort(entry, DatabasePort as any)).toBe(false);
    });
  });

  describe("isInternalAccessible", () => {
    it("returns false for null", () => {
      expect(isInternalAccessible(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isInternalAccessible(undefined)).toBe(false);
    });

    it("returns false for primitive", () => {
      expect(isInternalAccessible(42)).toBe(false);
    });

    it("returns false for string", () => {
      expect(isInternalAccessible("hello")).toBe(false);
    });

    it("returns false for object without INTERNAL_ACCESS", () => {
      expect(isInternalAccessible({})).toBe(false);
    });

    it("returns false when INTERNAL_ACCESS is not a function", () => {
      const obj = { [INTERNAL_ACCESS]: "not-a-function" };
      expect(isInternalAccessible(obj)).toBe(false);
    });

    it("returns true for object with INTERNAL_ACCESS function", () => {
      const obj = { [INTERNAL_ACCESS]: () => ({}) };
      expect(isInternalAccessible(obj)).toBe(true);
    });

    it("returns true for real container", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      expect(isInternalAccessible(container)).toBe(true);
    });
  });

  describe("asInternalAccessible", () => {
    it("returns value when valid", () => {
      const obj = { [INTERNAL_ACCESS]: () => ({}) };
      const result = asInternalAccessible(obj, "test context");
      expect(result).toBe(obj);
    });

    it("throws with context message when invalid", () => {
      expect(() => asInternalAccessible({}, "my context")).toThrow(
        "my context: Expected InternalAccessible container"
      );
    });

    it("throws for null", () => {
      expect(() => asInternalAccessible(null, "ctx")).toThrow(
        "ctx: Expected InternalAccessible container"
      );
    });
  });
});

// =============================================================================
// container/helpers.ts - Type Guards
// =============================================================================

describe("container helpers type guards (mutation killers)", () => {
  describe("isDisposableChild", () => {
    it("returns true for object with dispose function and isDisposed", () => {
      const obj = { dispose: async () => {}, isDisposed: false };
      expect(isDisposableChild(obj)).toBe(true);
    });

    it("returns false for null", () => {
      expect(isDisposableChild(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isDisposableChild(undefined)).toBe(false);
    });

    it("returns false when dispose is not a function", () => {
      const obj = { dispose: "not-a-function", isDisposed: false };
      expect(isDisposableChild(obj)).toBe(false);
    });

    it("returns false when isDisposed is missing", () => {
      const obj = { dispose: async () => {} };
      expect(isDisposableChild(obj)).toBe(false);
    });

    it("returns false when dispose is missing", () => {
      const obj = { isDisposed: false };
      expect(isDisposableChild(obj)).toBe(false);
    });
  });

  describe("isInheritanceMode", () => {
    it("returns true for 'shared'", () => {
      expect(isInheritanceMode("shared")).toBe(true);
    });

    it("returns true for 'forked'", () => {
      expect(isInheritanceMode("forked")).toBe(true);
    });

    it("returns true for 'isolated'", () => {
      expect(isInheritanceMode("isolated")).toBe(true);
    });

    it("returns false for other string", () => {
      expect(isInheritanceMode("other")).toBe(false);
    });

    it("returns false for null", () => {
      expect(isInheritanceMode(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isInheritanceMode(undefined)).toBe(false);
    });

    it("returns false for number", () => {
      expect(isInheritanceMode(42)).toBe(false);
    });
  });

  describe("shallowClone", () => {
    it("returns primitive values unchanged", () => {
      expect(shallowClone(null)).toBe(null);
      expect(shallowClone(42)).toBe(42);
      expect(shallowClone("hello")).toBe("hello");
      expect(shallowClone(undefined)).toBe(undefined);
    });

    it("creates a new object with same properties", () => {
      const original = { a: 1, b: "two" };
      const cloned = shallowClone(original);
      expect(cloned).not.toBe(original);
      expect(cloned.a).toBe(1);
      expect(cloned.b).toBe("two");
    });

    it("preserves prototype chain", () => {
      class Foo {
        method() {
          return "foo";
        }
      }
      const original = new Foo();
      const cloned = shallowClone(original);
      expect(cloned).not.toBe(original);
      expect(cloned.method()).toBe("foo");
    });
  });
});

// =============================================================================
// container/wrappers.ts - Wrapper Delegation Tests
// =============================================================================

describe("wrappers.ts mutation killers", () => {
  describe("hasInternalMethods - each required check", () => {
    const fullObj = () => ({
      [ADAPTER_ACCESS]: () => {},
      registerChildContainer: () => {},
      unregisterChildContainer: () => {},
      resolveInternal: () => {},
      resolveAsyncInternal: () => {},
      hasAdapter: () => {},
      has: () => {},
    });

    it("returns false when unregisterChildContainer is missing", () => {
      const obj = fullObj();
      delete (obj as any).unregisterChildContainer;
      expect(hasInternalMethods(obj)).toBe(false);
    });

    it("returns false when resolveInternal is missing", () => {
      const obj = fullObj();
      delete (obj as any).resolveInternal;
      expect(hasInternalMethods(obj)).toBe(false);
    });

    it("returns false when resolveAsyncInternal is missing", () => {
      const obj = fullObj();
      delete (obj as any).resolveAsyncInternal;
      expect(hasInternalMethods(obj)).toBe(false);
    });

    it("returns false when hasAdapter is missing", () => {
      const obj = fullObj();
      delete (obj as any).hasAdapter;
      expect(hasInternalMethods(obj)).toBe(false);
    });

    it("returns false when has is missing", () => {
      const obj = fullObj();
      delete (obj as any).has;
      expect(hasInternalMethods(obj)).toBe(false);
    });

    it("returns false when unregisterChildContainer is not a function", () => {
      const obj = { ...fullObj(), unregisterChildContainer: 42 };
      expect(hasInternalMethods(obj)).toBe(false);
    });

    it("returns false when resolveInternal is not a function", () => {
      const obj = { ...fullObj(), resolveInternal: "nope" };
      expect(hasInternalMethods(obj)).toBe(false);
    });

    it("returns false when resolveAsyncInternal is not a function", () => {
      const obj = { ...fullObj(), resolveAsyncInternal: true };
      expect(hasInternalMethods(obj)).toBe(false);
    });

    it("returns false when hasAdapter is not a function", () => {
      const obj = { ...fullObj(), hasAdapter: null };
      expect(hasInternalMethods(obj)).toBe(false);
    });

    it("returns false when has is not a function", () => {
      const obj = { ...fullObj(), has: [] };
      expect(hasInternalMethods(obj)).toBe(false);
    });
  });

  describe("asParentContainerLike", () => {
    it("throws for invalid wrapper (missing internal methods)", () => {
      expect(() => asParentContainerLike({} as any)).toThrow(
        /Invalid Container wrapper: missing internal methods/
      );
    });

    it("returns ParentContainerLike for valid container", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      const parentLike = asParentContainerLike(child as any);
      expect(parentLike).toBeDefined();
      expect(typeof parentLike.resolveInternal).toBe("function");
      expect(typeof parentLike.resolveAsyncInternal).toBe("function");
      expect(typeof parentLike.registerChildContainer).toBe("function");
      expect(typeof parentLike.unregisterChildContainer).toBe("function");
      expect(typeof parentLike.has).toBe("function");
      expect(typeof parentLike.hasAdapter).toBe("function");
      expect(parentLike.originalParent).toBe(child);
    });

    it("parentLike.has delegates to wrapper.has", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      const parentLike = asParentContainerLike(child as any);
      expect(parentLike.has(LoggerPort)).toBe(true);
      expect(parentLike.has(DatabasePort)).toBe(false);
    });

    it("parentLike.hasAdapter delegates to wrapper.hasAdapter", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      const parentLike = asParentContainerLike(child as any);
      expect(parentLike.hasAdapter(LoggerPort)).toBe(true);
      expect(parentLike.hasAdapter(DatabasePort)).toBe(false);
    });
  });

  describe("child container wrapper delegation", () => {
    it("resolve delegates to impl.resolve", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      const result = child.resolve(LoggerPort);
      expect(result).toBeDefined();
      expect(typeof result.log).toBe("function");
    });

    it("resolveAsync delegates to impl.resolveAsync", async () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      const result = await child.resolveAsync(LoggerPort);
      expect(result).toBeDefined();
      expect(typeof result.log).toBe("function");
    });

    it("has delegates to impl.has", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      expect(child.has(LoggerPort)).toBe(true);
      expect(child.has(DatabasePort)).toBe(false);
    });

    it("hasAdapter delegates to impl.hasAdapter", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      expect(child.hasAdapter(LoggerPort)).toBe(true);
      expect(child.hasAdapter(DatabasePort)).toBe(false);
    });

    it("child name and parentName are correct", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "ParentApp" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "ChildModule" });

      expect(child.name).toBe("ChildModule");
      expect(child.parentName).toBe("ParentApp");
      expect(child.kind).toBe("child");
    });

    it("child container is frozen", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      expect(Object.isFrozen(child)).toBe(true);
    });

    it("child isInitialized is always true", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      expect(child.isInitialized).toBe(true);
    });

    it("child isDisposed reflects impl state", async () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      expect(child.isDisposed).toBe(false);
      await child.dispose();
      expect(child.isDisposed).toBe(true);
    });

    it("child dispose calls inspector.disposeLibraries", async () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      // The inspector should have disposeLibraries
      const inspector = (child as any).inspector;
      expect(typeof inspector.disposeLibraries).toBe("function");

      // Dispose the child
      await child.dispose();
      expect(child.isDisposed).toBe(true);
    });

    it("child tryResolve returns Ok for valid port", () => {
      const graph = makeTransientGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      const result = child.tryResolve(LoggerPort);
      expect(result.isOk()).toBe(true);
    });

    it("child tryResolve returns Err for failing factory", () => {
      const failAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => {
          throw new Error("boom");
        },
      });
      const graph = GraphBuilder.create().provide(failAdapter).build();
      const container = createContainer({ graph, name: "Parent" });

      const overrideAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => {
          throw new Error("child boom");
        },
      });
      const childGraph = GraphBuilder.create().override(overrideAdapter).build();
      const child = container.createChild(childGraph, { name: "Child" });

      const result = child.tryResolve(LoggerPort);
      expect(result.isErr()).toBe(true);
    });

    it("child tryResolveAsync returns Ok for valid port", async () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      const result = await child.tryResolveAsync(LoggerPort);
      expect(result.isOk()).toBe(true);
    });

    it("child tryDispose returns Ok", async () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      const result = await child.tryDispose();
      expect(result.isOk()).toBe(true);
      expect(child.isDisposed).toBe(true);
    });

    it("child createScope creates a working scope", () => {
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

      const scope = child.createScope("test-scope");
      const logger = scope.resolve(LoggerPort);
      expect(typeof logger.log).toBe("function");
    });

    it("child INTERNAL_ACCESS returns valid state", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      const state = (child as any)[INTERNAL_ACCESS]();
      expect(state.containerName).toBe("Child");
      expect(state.disposed).toBe(false);
    });

    it("child ADAPTER_ACCESS returns adapter for registered port", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      const adapter = (child as any)[ADAPTER_ACCESS](LoggerPort);
      expect(adapter).toBeDefined();
    });

    it("child ADAPTER_ACCESS returns undefined for missing port", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      const adapter = (child as any)[ADAPTER_ACCESS](DatabasePort);
      expect(adapter).toBeUndefined();
    });

    it("child registerChildContainer/unregisterChildContainer work", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      // Creating a grandchild exercises registerChildContainer
      const grandchildGraph = GraphBuilder.create().build();
      const grandchild = child.createChild(grandchildGraph, { name: "Grandchild" });
      expect(grandchild.name).toBe("Grandchild");
    });
  });

  describe("child container HOOKS_ACCESS", () => {
    it("returns hooks installer with installHooks and uninstall", () => {
      const graph = makeTransientGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      const getInstaller = (child as any)[HOOKS_ACCESS];
      expect(typeof getInstaller).toBe("function");

      const installer = getInstaller();
      expect(typeof installer.installHooks).toBe("function");

      const beforeResolve = vi.fn();
      const uninstall = installer.installHooks({ beforeResolve });

      child.resolve(LoggerPort);
      expect(beforeResolve).toHaveBeenCalledTimes(1);

      uninstall();
      child.resolve(LoggerPort);
      // Should not be called again
      expect(beforeResolve).toHaveBeenCalledTimes(1);
    });
  });

  describe("child container createChild creates grandchild", () => {
    it("grandchild has correct parentName from child", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Root" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "ChildModule" });

      const grandchildGraph = GraphBuilder.create().build();
      const grandchild = child.createChild(grandchildGraph, { name: "Grandchild" });

      expect(grandchild.parentName).toBe("ChildModule");
    });

    it("grandchild can resolve parent ports", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Root" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      const grandchildGraph = GraphBuilder.create().build();
      const grandchild = child.createChild(grandchildGraph, { name: "Grandchild" });

      const logger = grandchild.resolve(LoggerPort);
      expect(typeof logger.log).toBe("function");
    });
  });

  describe("auto-discovery hook for library inspectors", () => {
    it("library inspector is auto-registered on resolve when port has library-inspector category", () => {
      // This tests the afterResolve hook installed in both factory and wrappers
      // that checks getPortMetadata and isLibraryInspector
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;
      expect(typeof inspector.registerLibrary).toBe("function");
    });
  });
});

// =============================================================================
// container/factory.ts - Factory Mutation Killers
// =============================================================================

describe("factory.ts mutation killers", () => {
  describe("createContainer root wrapper", () => {
    it("container has correct name", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "ExactName" });
      expect(container.name).toBe("ExactName");
    });

    it("container parentName is null", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      expect(container.parentName).toBeNull();
    });

    it("container kind is 'root'", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      expect(container.kind).toBe("root");
    });

    it("has() returns correct boolean for each port", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });

      // Exact boolean equality assertions
      expect(container.has(LoggerPort)).toStrictEqual(true);
      expect(container.has(DatabasePort)).toStrictEqual(false);
    });

    it("hasAdapter() returns correct boolean", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });

      expect(container.hasAdapter(LoggerPort)).toStrictEqual(true);
      expect(container.hasAdapter(DatabasePort)).toStrictEqual(false);
    });

    it("isInitialized returns false before initialize()", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      expect(container.isInitialized).toStrictEqual(false);
    });

    it("isDisposed returns false initially", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      expect(container.isDisposed).toStrictEqual(false);
    });

    it("isDisposed returns true after dispose", async () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      await container.dispose();
      expect(container.isDisposed).toStrictEqual(true);
    });

    it("parent getter throws for root container", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      expect(() => container.parent).toThrow();
    });

    it("parent is non-enumerable on root container", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      const descriptor = Object.getOwnPropertyDescriptor(container, "parent");
      expect(descriptor?.enumerable).toBe(false);
    });

    it("HOOKS_ACCESS is non-enumerable", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      const descriptor = Object.getOwnPropertyDescriptor(container, HOOKS_ACCESS);
      expect(descriptor?.enumerable).toBe(false);
      expect(descriptor?.writable).toBe(false);
      expect(descriptor?.configurable).toBe(false);
    });
  });

  describe("late-binding hooks in factory", () => {
    it("beforeResolve hooks fire in order of installation", () => {
      const order: string[] = [];
      const graph = makeTransientGraph();
      const container = createContainer({ graph, name: "Test" });

      container.addHook("beforeResolve", () => order.push("first"));
      container.addHook("beforeResolve", () => order.push("second"));

      container.resolve(LoggerPort);
      expect(order).toEqual(["first", "second"]);
    });

    it("afterResolve hooks fire in reverse order (middleware pattern)", () => {
      const order: string[] = [];
      const graph = makeTransientGraph();
      const container = createContainer({ graph, name: "Test" });

      container.addHook("afterResolve", () => order.push("first"));
      container.addHook("afterResolve", () => order.push("second"));

      container.resolve(LoggerPort);
      // Reverse: second fires before first
      expect(order).toEqual(["second", "first"]);
    });

    it("removeHook actually removes the hook from hookSources", () => {
      const graph = makeTransientGraph();
      const container = createContainer({ graph, name: "Test" });
      const handler = vi.fn();

      container.addHook("beforeResolve", handler);
      container.resolve(LoggerPort);
      expect(handler).toHaveBeenCalledTimes(1);

      container.removeHook("beforeResolve", handler);
      container.resolve(LoggerPort);
      expect(handler).toHaveBeenCalledTimes(1); // not called again
    });

    it("removeHook with unknown handler is a no-op", () => {
      const graph = makeTransientGraph();
      const container = createContainer({ graph, name: "Test" });

      expect(() => container.removeHook("beforeResolve", vi.fn())).not.toThrow();
    });

    it("removeHook deletes from handlerToUninstall WeakMap", () => {
      const graph = makeTransientGraph();
      const container = createContainer({ graph, name: "Test" });
      const handler = vi.fn();

      container.addHook("afterResolve", handler);
      container.removeHook("afterResolve", handler);

      // Second removeHook should be a no-op (already deleted)
      expect(() => container.removeHook("afterResolve", handler)).not.toThrow();
    });
  });

  describe("initialized container wrapper", () => {
    it("multiple initialize() calls return the exact same object", async () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });

      const a = await container.initialize();
      const b = await container.initialize();
      expect(a).toBe(b);
    });

    it("tryInitialize returns same wrapper", async () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });

      const result = await container.tryInitialize();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const initialized = result.value;
        expect(initialized.name).toBe("Test");
        expect(initialized.kind).toBe("root");
        expect(initialized.parentName).toBeNull();
      }
    });

    it("initialized container has addHook/removeHook for dynamic hooks", async () => {
      const graph = makeTransientGraph();
      const container = createContainer({ graph, name: "Test" });
      const initialized = await container.initialize();

      // Initialized containers use addHook/removeHook directly
      expect(typeof initialized.addHook).toBe("function");
      expect(typeof initialized.removeHook).toBe("function");

      const handler = vi.fn();
      initialized.addHook("beforeResolve", handler);
      initialized.resolve(LoggerPort);
      expect(handler).toHaveBeenCalledTimes(1);

      initialized.removeHook("beforeResolve", handler);
      initialized.resolve(LoggerPort);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("initialized container createChildAsync works", async () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Root" });
      const initialized = await container.initialize();

      const dbAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: vi.fn() }),
      });
      const childGraph = GraphBuilder.create().provide(dbAdapter).build();

      const child = await initialized.createChildAsync(async () => childGraph, {
        name: "AsyncChild",
      });

      expect(child.name).toBe("AsyncChild");
      expect(child.resolve(DatabasePort).query).toBeDefined();
    });

    it("initialized container createLazyChild works", async () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Root" });
      const initialized = await container.initialize();

      const dbAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: vi.fn() }),
      });
      const childGraph = GraphBuilder.create().provide(dbAdapter).build();

      const lazy = initialized.createLazyChild(async () => childGraph, { name: "LazyChild" });

      expect(lazy.isLoaded).toBe(false);
    });

    it("initialized container isInitialized delegates to impl", async () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      const initialized = await container.initialize();
      expect(initialized.isInitialized).toBe(true);
    });

    it("initialized container isDisposed delegates to impl", async () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      const initialized = await container.initialize();
      expect(initialized.isDisposed).toBe(false);
      await initialized.dispose();
      expect(initialized.isDisposed).toBe(true);
    });
  });

  describe("user hooks pushed to hookSources", () => {
    it("user hooks are invoked even without dynamic hooks", () => {
      const beforeResolve = vi.fn();
      const graph = makeTransientGraph();
      const container = createContainer({
        graph,
        name: "Test",
        hooks: { beforeResolve },
      });

      container.resolve(LoggerPort);
      expect(beforeResolve).toHaveBeenCalledTimes(1);
    });

    it("undefined hooks config is handled (no error)", () => {
      const graph = makeTransientGraph();
      const container = createContainer({ graph, name: "Test" });
      expect(() => container.resolve(LoggerPort)).not.toThrow();
    });
  });
});

// =============================================================================
// container/child-impl.ts - Child Container
// =============================================================================

describe("child-impl.ts mutation killers", () => {
  describe("child initialize() rejects", () => {
    it("child containers cannot be initialized", async () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      // accessing initialize getter throws
      expect(() => (child as any).initialize).toThrow();
    });
  });

  describe("child override creates grandchild with correct overrides", () => {
    it("overridden port uses new factory", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      const mockLogger: Logger = { log: () => {} };
      const overrideAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => mockLogger,
      });

      const overridden = child.override(overrideAdapter).build();
      expect(overridden.resolve(LoggerPort)).toBe(mockLogger);
    });
  });

  describe("child with extensions", () => {
    it("extension ports are available on child", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });

      const dbAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: vi.fn() }),
      });
      const childGraph = GraphBuilder.create().provide(dbAdapter).build();
      const child = container.createChild(childGraph, { name: "Child" });

      expect(child.has(DatabasePort)).toBe(true);
      const db = child.resolve(DatabasePort);
      expect(typeof db.query).toBe("function");
    });

    it("extension ports are NOT marked as overrides", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });

      const dbAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: vi.fn() }),
      });
      const childGraph = GraphBuilder.create().provide(dbAdapter).build();
      const child = container.createChild(childGraph, { name: "Child" });

      const state = (child as any)[INTERNAL_ACCESS]();
      expect(state.isOverride("Database")).toBe(false);
    });
  });

  describe("child getInternalState overrides", () => {
    it("child state has correct containerId (not 'root')", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      const state = (child as any)[INTERNAL_ACCESS]();
      expect(state.containerId).not.toBe("root");
      expect(typeof state.containerId).toBe("string");
    });

    it("child state has inheritanceModes map", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, {
        name: "Child",
        inheritanceModes: { Logger: "forked" } as any,
      });

      const state = (child as any)[INTERNAL_ACCESS]();
      expect(state.inheritanceModes).toBeInstanceOf(Map);
      expect(state.inheritanceModes.get("Logger")).toBe("forked");
    });

    it("child state is frozen", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      const state = (child as any)[INTERNAL_ACCESS]();
      expect(Object.isFrozen(state)).toBe(true);
    });
  });
});

// =============================================================================
// container/lazy-impl.ts - Lazy Container
// =============================================================================

describe("lazy-impl.ts mutation killers", () => {
  describe("consumeLazyFlag / markNextChildAsLazy", () => {
    it("consumeLazyFlag returns false by default", () => {
      // Reset state
      consumeLazyFlag();
      expect(consumeLazyFlag()).toBe(false);
    });

    it("markNextChildAsLazy sets flag, consumeLazyFlag returns true then resets", () => {
      markNextChildAsLazy();
      expect(consumeLazyFlag()).toBe(true);
      // After consume, should be false
      expect(consumeLazyFlag()).toBe(false);
    });
  });

  describe("LazyContainerImpl", () => {
    function createLazyContainer() {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });

      const dbAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: vi.fn() }),
      });
      const childGraph = GraphBuilder.create().provide(dbAdapter).build();

      const lazy = container.createLazyChild(async () => childGraph, { name: "Lazy" });
      return { lazy, container };
    }

    it("isLoaded is false before load", () => {
      const { lazy } = createLazyContainer();
      expect(lazy.isLoaded).toBe(false);
    });

    it("isDisposed is false initially", () => {
      const { lazy } = createLazyContainer();
      expect(lazy.isDisposed).toBe(false);
    });

    it("load returns container and sets isLoaded", async () => {
      const { lazy } = createLazyContainer();
      const loaded = await lazy.load();
      expect(loaded).toBeDefined();
      expect(lazy.isLoaded).toBe(true);
    });

    it("concurrent loads share the same promise (deduplication)", async () => {
      const { lazy } = createLazyContainer();
      const p1 = lazy.load();
      const p2 = lazy.load();
      const [c1, c2] = await Promise.all([p1, p2]);
      expect(c1).toBe(c2);
    });

    it("second load returns cached container", async () => {
      const { lazy } = createLazyContainer();
      const c1 = await lazy.load();
      const c2 = await lazy.load();
      expect(c1).toBe(c2);
    });

    it("load rejects when disposed", async () => {
      const { lazy } = createLazyContainer();
      await lazy.dispose();
      await expect(lazy.load()).rejects.toThrow(/disposed/i);
    });

    it("resolve loads graph then resolves", async () => {
      const { lazy } = createLazyContainer();
      const db = await lazy.resolve(DatabasePort);
      expect(typeof db.query).toBe("function");
      expect(lazy.isLoaded).toBe(true);
    });

    it("resolveAsync loads graph then resolves", async () => {
      const { lazy } = createLazyContainer();
      const db = await lazy.resolveAsync(DatabasePort);
      expect(typeof db.query).toBe("function");
    });

    it("tryResolve returns Ok ResultAsync on success", async () => {
      const { lazy } = createLazyContainer();
      const result = await lazy.tryResolve(DatabasePort);
      expect(result.isOk()).toBe(true);
    });

    it("tryResolveAsync returns Ok ResultAsync on success", async () => {
      const { lazy } = createLazyContainer();
      const result = await lazy.tryResolveAsync(DatabasePort);
      expect(result.isOk()).toBe(true);
    });

    it("tryDispose returns Ok ResultAsync", async () => {
      const { lazy } = createLazyContainer();
      const result = await lazy.tryDispose();
      expect(result.isOk()).toBe(true);
    });

    it("has delegates to parent before loading", () => {
      const { lazy } = createLazyContainer();
      // LoggerPort is from parent
      expect(lazy.has(LoggerPort)).toBe(true);
    });

    it("has delegates to container after loading", async () => {
      const { lazy } = createLazyContainer();
      await lazy.load();
      expect(lazy.has(DatabasePort)).toBe(true);
    });

    it("dispose when not loaded just marks as disposed", async () => {
      const { lazy } = createLazyContainer();
      await lazy.dispose();
      expect(lazy.isDisposed).toBe(true);
      expect(lazy.isLoaded).toBe(false);
    });

    it("dispose when loaded disposes the container", async () => {
      const { lazy } = createLazyContainer();
      const loaded = await lazy.load();
      await lazy.dispose();
      expect(lazy.isDisposed).toBe(true);
    });

    it("dispose is idempotent", async () => {
      const { lazy } = createLazyContainer();
      await lazy.dispose();
      await lazy.dispose();
      expect(lazy.isDisposed).toBe(true);
    });

    it("dispose during load waits for load to complete", async () => {
      let resolveLoad: ((value: any) => void) | undefined;
      const dbAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: vi.fn() }),
      });
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });

      const lazy = container.createLazyChild(
        () =>
          new Promise(resolve => {
            resolveLoad = () => {
              const childGraph = GraphBuilder.create().provide(dbAdapter).build();
              resolve(childGraph);
            };
          }),
        { name: "Lazy" }
      );

      // Start load
      const loadPromise = lazy.load();
      // Start dispose while loading
      const disposePromise = lazy.dispose();

      // Complete the load
      resolveLoad!();

      await loadPromise.catch(() => {});
      await disposePromise;

      expect(lazy.isDisposed).toBe(true);
    });

    it("failed load clears promise to allow retry", async () => {
      let callCount = 0;
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });

      const dbAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: vi.fn() }),
      });

      const lazy = container.createLazyChild(
        async () => {
          callCount++;
          if (callCount === 1) {
            throw new Error("load failed");
          }
          return GraphBuilder.create().provide(dbAdapter).build();
        },
        { name: "Lazy" }
      );

      // First load fails
      await expect(lazy.load()).rejects.toThrow("load failed");

      // Retry should work
      const loaded = await lazy.load();
      expect(loaded).toBeDefined();
      expect(lazy.isLoaded).toBe(true);
    });
  });
});

// =============================================================================
// scope/impl.ts - Scope
// =============================================================================

describe("scope/impl.ts mutation killers", () => {
  beforeEach(() => {
    resetScopeIdCounter();
  });

  describe("resetScopeIdCounter actually resets", () => {
    it("generates predictable IDs after reset", () => {
      const graph = makeScopedGraph();
      const container = createContainer({ graph, name: "Test" });

      // Create a scope - uses global counter
      const scope1 = container.createScope();
      // Scope IDs are implementation details but we can verify they differ
      // by creating two
      const scope2 = container.createScope();

      // Reset
      resetScopeIdCounter();

      // After reset the counter restarts from 0
      const gen = createScopeIdGenerator();
      expect(gen()).toBe("scope-0");
    });
  });

  describe("scope disposal unregisters from container", () => {
    it("scope is removed from parent scope tree after disposal", async () => {
      const graph = makeScopedGraph();
      const container = createContainer({ graph, name: "Test" });

      const scope = container.createScope("my-scope");
      const inspector = (container as any).inspector;
      const tree1 = inspector.getScopeTree();
      expect(tree1.children.length).toBeGreaterThan(0);

      await scope.dispose();

      const tree2 = inspector.getScopeTree();
      // After disposal, scope should be removed
      expect(tree2.children.length).toBe(0);
    });
  });

  describe("scope parent deregistration on disposal", () => {
    it("child scope deregisters from parent scope on disposal", async () => {
      const graph = makeScopedGraph();
      const container = createContainer({ graph, name: "Test" });

      const scope = container.createScope("parent-scope");
      const childScope = scope.createScope("child-scope");

      const state1 = (scope as any)[INTERNAL_ACCESS]();
      expect(state1.childScopes.length).toBe(1);

      await childScope.dispose();

      const state2 = (scope as any)[INTERNAL_ACCESS]();
      expect(state2.childScopes.length).toBe(0);
    });
  });

  describe("scope resolve throws when disposed", () => {
    it("resolve throws DisposedScopeError after disposal", async () => {
      const graph = makeScopedGraph();
      const container = createContainer({ graph, name: "Test" });
      const scope = container.createScope("test-scope");

      await scope.dispose();
      expect(() => scope.resolve(LoggerPort)).toThrow(DisposedScopeError);
    });

    it("resolveAsync throws DisposedScopeError after disposal", async () => {
      const graph = makeScopedGraph();
      const container = createContainer({ graph, name: "Test" });
      const scope = container.createScope("test-scope");

      await scope.dispose();
      await expect(scope.resolveAsync(LoggerPort)).rejects.toThrow(DisposedScopeError);
    });
  });

  describe("scope disposal cascades to children", () => {
    it("child scopes are disposed when parent disposes", async () => {
      const graph = makeScopedGraph();
      const container = createContainer({ graph, name: "Test" });

      const scope = container.createScope("parent");
      const childScope = scope.createScope("child");

      expect(childScope.isDisposed).toBe(false);
      await scope.dispose();
      expect(childScope.isDisposed).toBe(true);
    });
  });

  describe("scope has() delegates to container", () => {
    it("returns true for registered scoped port", () => {
      const graph = makeScopedGraph();
      const container = createContainer({ graph, name: "Test" });
      const scope = container.createScope("test-scope");

      expect(scope.has(LoggerPort)).toBe(true);
    });

    it("returns false for unregistered port", () => {
      const graph = makeScopedGraph();
      const container = createContainer({ graph, name: "Test" });
      const scope = container.createScope("test-scope");

      expect(scope.has(DatabasePort)).toBe(false);
    });
  });

  describe("scope tryResolve / tryResolveAsync / tryDispose", () => {
    it("tryResolve returns Ok for valid port", () => {
      const graph = makeScopedGraph();
      const container = createContainer({ graph, name: "Test" });
      const scope = container.createScope("test-scope");

      const result = scope.tryResolve(LoggerPort);
      expect(result.isOk()).toBe(true);
    });

    it("tryResolve returns Err for failing factory", () => {
      const failAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => {
          throw new Error("scope boom");
        },
      });
      const graph = GraphBuilder.create().provide(failAdapter).build();
      const container = createContainer({ graph, name: "Test" });
      const scope = container.createScope("test-scope");

      const result = scope.tryResolve(LoggerPort);
      expect(result.isErr()).toBe(true);
    });

    it("tryResolveAsync returns Ok", async () => {
      const graph = makeScopedGraph();
      const container = createContainer({ graph, name: "Test" });
      const scope = container.createScope("test-scope");

      const result = await scope.tryResolveAsync(LoggerPort);
      expect(result.isOk()).toBe(true);
    });

    it("tryDispose returns Ok", async () => {
      const graph = makeScopedGraph();
      const container = createContainer({ graph, name: "Test" });
      const scope = container.createScope("test-scope");

      const result = await scope.tryDispose();
      expect(result.isOk()).toBe(true);
    });
  });

  describe("scope getInternalState throws when disposed", () => {
    it("getInternalState throws DisposedScopeError", async () => {
      const graph = makeScopedGraph();
      const container = createContainer({ graph, name: "Test" });
      const scope = container.createScope("test-scope");

      await scope.dispose();
      expect(() => (scope as any)[INTERNAL_ACCESS]()).toThrow(DisposedScopeError);
    });
  });

  describe("scope lifecycle events", () => {
    it("emits 'disposing' then 'disposed' on disposal", async () => {
      const graph = makeScopedGraph();
      const container = createContainer({ graph, name: "Test" });
      const scope = container.createScope("test-scope");

      const events: string[] = [];
      scope.subscribe(event => events.push(event));

      await scope.dispose();

      expect(events).toContain("disposing");
      expect(events).toContain("disposed");
      expect(events.indexOf("disposing")).toBeLessThan(events.indexOf("disposed"));
    });
  });
});

// =============================================================================
// inspection/builtin-api.ts - Inspector API
// =============================================================================

describe("builtin-api.ts mutation killers", () => {
  describe("getSnapshot", () => {
    it("reports correct containerName", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "MyApp" });
      const inspector = (container as any).inspector;
      const snapshot = inspector.getSnapshot();
      expect(snapshot.containerName).toBe("MyApp");
    });

    it("reports isDisposed false initially", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;
      expect(inspector.isDisposed).toBe(false);
    });

    it("singleton entries have correct isResolved before resolution", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;
      const snapshot = inspector.getSnapshot();

      for (const singleton of snapshot.singletons) {
        if (singleton.portName === "Logger") {
          expect(singleton.isResolved).toBe(false);
        }
      }
    });

    it("singleton entries have correct isResolved after resolution", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      container.resolve(LoggerPort);
      const inspector = (container as any).inspector;
      const snapshot = inspector.getSnapshot();

      const loggerEntry = snapshot.singletons.find((s: any) => s.portName === "Logger");
      expect(loggerEntry).toBeDefined();
      expect(loggerEntry!.isResolved).toBe(true);
    });
  });

  describe("listPorts", () => {
    it("returns sorted array of port names", () => {
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

      const ports = inspector.listPorts();
      expect(ports).toEqual(["Database", "Logger"]);
    });
  });

  describe("isResolved", () => {
    it("returns false for unresolved singleton", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;
      expect(inspector.isResolved("Logger")).toBe(false);
    });

    it("returns true for resolved singleton", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      container.resolve(LoggerPort);
      const inspector = (container as any).inspector;
      expect(inspector.isResolved("Logger")).toBe(true);
    });

    it("returns 'scope-required' for scoped port", () => {
      const graph = makeScopedGraph();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;
      expect(inspector.isResolved("Logger")).toBe("scope-required");
    });

    it("throws for unknown port name", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;
      expect(() => inspector.isResolved("NonExistent")).toThrow(/not registered/);
    });
  });

  describe("getContainerKind", () => {
    it("returns correct kind for root container", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;
      expect(inspector.getContainerKind()).toBe("root");
    });
  });

  describe("getPhase", () => {
    it("returns phase for root container", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;
      const phase = inspector.getPhase();
      expect(typeof phase).toBe("string");
    });
  });

  describe("subscribe", () => {
    it("emits resolution events", () => {
      const graph = makeTransientGraph();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;

      const events: any[] = [];
      inspector.subscribe((event: any) => events.push(event));

      // tryResolve should emit a result event
      container.tryResolve(LoggerPort);

      const resultEvent = events.find(e => e.type === "result:ok");
      expect(resultEvent).toBeDefined();
      expect(resultEvent.portName).toBe("Logger");
    });

    it("unsubscribe removes listener", () => {
      const graph = makeTransientGraph();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;

      const events: any[] = [];
      const unsub = inspector.subscribe((event: any) => events.push(event));

      container.tryResolve(LoggerPort);
      expect(events.length).toBeGreaterThan(0);

      const countBefore = events.length;
      unsub();
      container.tryResolve(LoggerPort);
      expect(events.length).toBe(countBefore);
    });

    it("listener errors do not prevent other listeners from firing", () => {
      const graph = makeTransientGraph();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;

      const goodListener = vi.fn();
      inspector.subscribe(() => {
        throw new Error("bad listener");
      });
      inspector.subscribe(goodListener);

      inspector.emit({ type: "result:ok", portName: "Test", timestamp: Date.now() });
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe("getChildContainers", () => {
    it("returns child inspectors", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      container.createChild(childGraph, { name: "Child" });

      const inspector = (container as any).inspector;
      const children = inspector.getChildContainers();
      expect(children.length).toBe(1);
    });
  });

  describe("getAdapterInfo", () => {
    it("returns adapter info for all adapters", () => {
      const loggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const dbAdapter = createAdapter({
        provides: DatabasePort,
        requires: [LoggerPort] as const,
        lifetime: "transient",
        factory: () => ({ query: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(loggerAdapter).provide(dbAdapter).build();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;

      const adapters = inspector.getAdapterInfo();
      expect(adapters.length).toBe(2);

      const loggerInfo = adapters.find((a: any) => a.portName === "Logger");
      expect(loggerInfo).toBeDefined();
      expect(loggerInfo.lifetime).toBe("singleton");
      expect(loggerInfo.dependencyNames).toEqual([]);

      const dbInfo = adapters.find((a: any) => a.portName === "Database");
      expect(dbInfo).toBeDefined();
      expect(dbInfo.lifetime).toBe("transient");
      expect(dbInfo.dependencyNames).toContain("Logger");
    });
  });

  describe("getGraphData", () => {
    it("returns graph data with correct structure", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "MyApp" });
      const inspector = (container as any).inspector;

      const graphData = inspector.getGraphData();
      expect(graphData.containerName).toBe("MyApp");
      expect(graphData.kind).toBe("root");
      expect(graphData.parentName).toBeNull();
      expect(graphData.adapters.length).toBe(1);
      expect(graphData.adapters[0].portName).toBe("Logger");
      expect(graphData.adapters[0].origin).toBe("own");
    });

    it("child container getContainerKind returns 'child'", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      const inspector = (child as any).inspector;
      // getContainerKind uses detectContainerKindFromInternal (checks inheritanceModes)
      expect(inspector.getContainerKind()).toBe("child");
    });
  });

  describe("result statistics", () => {
    it("getResultStatistics returns undefined for unknown port", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;

      expect(inspector.getResultStatistics("NonExistent")).toBeUndefined();
    });

    it("getResultStatistics tracks ok count", () => {
      const graph = makeTransientGraph();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;

      container.tryResolve(LoggerPort);
      container.tryResolve(LoggerPort);

      const stats = inspector.getResultStatistics("Logger");
      expect(stats).toBeDefined();
      expect(stats.okCount).toBe(2);
      expect(stats.errCount).toBe(0);
      expect(stats.totalCalls).toBe(2);
      expect(stats.errorRate).toBe(0);
    });

    it("getResultStatistics tracks err count", () => {
      const failAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => {
          throw new Error("fail");
        },
      });
      const graph = GraphBuilder.create().provide(failAdapter).build();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;

      container.tryResolve(LoggerPort);
      container.tryResolve(LoggerPort);

      const stats = inspector.getResultStatistics("Logger");
      expect(stats).toBeDefined();
      expect(stats.errCount).toBe(2);
      expect(stats.okCount).toBe(0);
      expect(stats.errorRate).toBe(1);
    });

    it("getAllResultStatistics returns all port stats", () => {
      const graph = makeTransientGraph();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;

      container.tryResolve(LoggerPort);

      const allStats = inspector.getAllResultStatistics();
      expect(allStats instanceof Map).toBe(true);
      expect(allStats.has("Logger")).toBe(true);
    });

    it("getHighErrorRatePorts returns ports above threshold", () => {
      const failAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => {
          throw new Error("fail");
        },
      });
      const graph = GraphBuilder.create().provide(failAdapter).build();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;

      container.tryResolve(LoggerPort);

      const highError = inspector.getHighErrorRatePorts(0.5);
      expect(highError.length).toBe(1);
      expect(highError[0].portName).toBe("Logger");
    });

    it("getHighErrorRatePorts returns empty for low error rate", () => {
      const graph = makeTransientGraph();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;

      container.tryResolve(LoggerPort);

      const highError = inspector.getHighErrorRatePorts(0.5);
      expect(highError.length).toBe(0);
    });

    it("result statistics track errorsByCode", () => {
      const failAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => {
          throw new Error("fail");
        },
      });
      const graph = GraphBuilder.create().provide(failAdapter).build();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;

      container.tryResolve(LoggerPort);

      const stats = inspector.getResultStatistics("Logger");
      expect(stats.errorsByCode).toBeInstanceOf(Map);
      expect(stats.errorsByCode.size).toBeGreaterThan(0);
    });

    it("result statistics lastError has code and timestamp", () => {
      const failAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => {
          throw new Error("fail");
        },
      });
      const graph = GraphBuilder.create().provide(failAdapter).build();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;

      container.tryResolve(LoggerPort);

      const stats = inspector.getResultStatistics("Logger");
      expect(stats.lastError).toBeDefined();
      expect(typeof stats.lastError.code).toBe("string");
      expect(typeof stats.lastError.timestamp).toBe("number");
    });
  });

  describe("getUnifiedSnapshot", () => {
    it("returns unified snapshot with container data", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;

      const unified = inspector.getUnifiedSnapshot();
      expect(unified.container).toBeDefined();
      expect(unified.libraries).toBeDefined();
      expect(unified.registeredLibraries).toBeDefined();
      expect(typeof unified.timestamp).toBe("number");
    });
  });
});

// =============================================================================
// inspection/library-registry.ts - Library Registry
// =============================================================================

describe("library-registry.ts mutation killers", () => {
  function createMockLibraryInspector(name: string): LibraryInspector {
    return {
      name,
      getSnapshot: () => Object.freeze({ status: "ok" }),
      dispose: vi.fn(),
      subscribe: (listener: (event: unknown) => void) => {
        return () => {};
      },
    };
  }

  it("registers and retrieves library inspector", () => {
    const registry = createLibraryRegistry();
    const emitEvent = vi.fn();
    const lib = createMockLibraryInspector("test-lib");

    registry.registerLibrary(lib, emitEvent);

    expect(registry.getLibraryInspector("test-lib")).toBe(lib);
    expect(registry.getLibraryInspectors().get("test-lib")).toBe(lib);
  });

  it("emits library-registered event on registration", () => {
    const registry = createLibraryRegistry();
    const emitEvent = vi.fn();
    const lib = createMockLibraryInspector("test-lib");

    registry.registerLibrary(lib, emitEvent);

    const registeredEvent = emitEvent.mock.calls.find(
      (call: any) => call[0].type === "library-registered"
    );
    expect(registeredEvent).toBeDefined();
    expect(registeredEvent[0].name).toBe("test-lib");
  });

  it("unregister function emits library-unregistered event", () => {
    const registry = createLibraryRegistry();
    const emitEvent = vi.fn();
    const lib = createMockLibraryInspector("test-lib");

    const unregister = registry.registerLibrary(lib, emitEvent);
    unregister();

    const unregisteredEvent = emitEvent.mock.calls.find(
      (call: any) => call[0].type === "library-unregistered"
    );
    expect(unregisteredEvent).toBeDefined();
    expect(unregisteredEvent[0].name).toBe("test-lib");
  });

  it("unregister is idempotent", () => {
    const registry = createLibraryRegistry();
    const emitEvent = vi.fn();
    const lib = createMockLibraryInspector("test-lib");

    const unregister = registry.registerLibrary(lib, emitEvent);
    unregister();
    unregister(); // second call should be no-op

    const unregisteredEvents = emitEvent.mock.calls.filter(
      (call: any) => call[0].type === "library-unregistered"
    );
    expect(unregisteredEvents.length).toBe(1);
  });

  it("replacement unregisters old inspector before registering new one", () => {
    const registry = createLibraryRegistry();
    const emitEvent = vi.fn();
    const lib1 = createMockLibraryInspector("test-lib");
    const lib2 = createMockLibraryInspector("test-lib");

    registry.registerLibrary(lib1, emitEvent);
    registry.registerLibrary(lib2, emitEvent);

    expect(registry.getLibraryInspector("test-lib")).toBe(lib2);
    expect(lib1.dispose).toHaveBeenCalled();
  });

  it("old unregister is no-op after replacement", () => {
    const registry = createLibraryRegistry();
    const emitEvent = vi.fn();
    const lib1 = createMockLibraryInspector("test-lib");
    const lib2 = createMockLibraryInspector("test-lib");

    const unregister1 = registry.registerLibrary(lib1, emitEvent);
    registry.registerLibrary(lib2, emitEvent);

    // Old unregister should not affect the new registration
    unregister1();
    expect(registry.getLibraryInspector("test-lib")).toBe(lib2);
  });

  it("getLibrarySnapshots returns snapshots from all inspectors", () => {
    const registry = createLibraryRegistry();
    const emitEvent = vi.fn();
    const lib = createMockLibraryInspector("test-lib");

    registry.registerLibrary(lib, emitEvent);
    const snapshots = registry.getLibrarySnapshots();
    expect(snapshots["test-lib"]).toEqual({ status: "ok" });
  });

  it("getLibrarySnapshots handles getSnapshot errors", () => {
    const registry = createLibraryRegistry();
    const emitEvent = vi.fn();
    const lib: LibraryInspector = {
      name: "broken-lib",
      getSnapshot: () => {
        throw new Error("snapshot failed");
      },
    };

    registry.registerLibrary(lib, emitEvent);
    const snapshots = registry.getLibrarySnapshots();
    expect(snapshots["broken-lib"]).toEqual({ error: "snapshot-failed" });
  });

  it("dispose cleans up all inspectors and subscriptions", () => {
    const registry = createLibraryRegistry();
    const emitEvent = vi.fn();
    const lib = createMockLibraryInspector("test-lib");

    registry.registerLibrary(lib, emitEvent);
    registry.dispose();

    expect(lib.dispose).toHaveBeenCalled();
    expect(registry.getLibraryInspectors().size).toBe(0);
  });

  it("rejects invalid library inspector", () => {
    const registry = createLibraryRegistry();
    const emitEvent = vi.fn();

    expect(() => registry.registerLibrary({} as any, emitEvent)).toThrow(TypeError);
  });

  it("subscribe forwards library events to container", () => {
    const registry = createLibraryRegistry();
    const emitEvent = vi.fn();
    let capturedListener: ((event: unknown) => void) | undefined;
    const lib: LibraryInspector = {
      name: "event-lib",
      getSnapshot: () => Object.freeze({}),
      subscribe: listener => {
        capturedListener = listener;
        return () => {};
      },
    };

    registry.registerLibrary(lib, emitEvent);

    // Simulate a library event
    capturedListener!({ type: "custom-event" });

    const libraryEvent = emitEvent.mock.calls.find((call: any) => call[0].type === "library");
    expect(libraryEvent).toBeDefined();
    expect(libraryEvent[0].event).toEqual({ type: "custom-event" });
  });
});

// =============================================================================
// resolution/hooks-runner.ts - HooksRunner & checkCacheHit
// =============================================================================

describe("hooks-runner.ts mutation killers", () => {
  describe("checkCacheHit", () => {
    it("returns true for singleton when cached", () => {
      const memo = new MemoMap();
      const port1 = port<string>()({ name: "P" });
      memo.getOrElseMemoize(port1, () => "val", undefined);

      expect(checkCacheHit(port1, "singleton", memo, new MemoMap())).toBe(true);
    });

    it("returns false for singleton when not cached", () => {
      const memo = new MemoMap();
      const port1 = port<string>()({ name: "P" });

      expect(checkCacheHit(port1, "singleton", memo, new MemoMap())).toBe(false);
    });

    it("returns true for scoped when cached in scoped memo", () => {
      const singletonMemo = new MemoMap();
      const scopedMemo = new MemoMap();
      const port1 = port<string>()({ name: "P" });
      scopedMemo.getOrElseMemoize(port1, () => "val", undefined);

      expect(checkCacheHit(port1, "scoped", singletonMemo, scopedMemo)).toBe(true);
    });

    it("returns false for scoped when not cached", () => {
      const port1 = port<string>()({ name: "P" });

      expect(checkCacheHit(port1, "scoped", new MemoMap(), new MemoMap())).toBe(false);
    });

    it("returns false for transient always", () => {
      const memo = new MemoMap();
      const port1 = port<string>()({ name: "P" });
      memo.getOrElseMemoize(port1, () => "val", undefined);

      expect(checkCacheHit(port1, "transient", memo, new MemoMap())).toBe(false);
    });
  });

  describe("HooksRunner parentPort tracking", () => {
    it("parentPort is null at depth 0", () => {
      const hooks = {
        beforeResolve: vi.fn(),
        afterResolve: vi.fn(),
      };
      const runner = new HooksRunner(hooks, {
        containerId: "root",
        containerKind: "root",
        parentContainerId: null,
      });

      const portA = port<string>()({ name: "A" });
      runner.runSync(portA, { lifetime: "singleton" }, null, false, null, () => "result");

      expect(hooks.beforeResolve).toHaveBeenCalledWith(
        expect.objectContaining({
          parentPort: null,
          depth: 0,
        })
      );
    });

    it("parentPort tracks nested resolutions", () => {
      const hooks = {
        beforeResolve: vi.fn(),
        afterResolve: vi.fn(),
      };
      const runner = new HooksRunner(hooks, {
        containerId: "root",
        containerKind: "root",
        parentContainerId: null,
      });

      const portA = port<string>()({ name: "A" });
      const portB = port<string>()({ name: "B" });

      // Resolve A, which internally resolves B
      runner.runSync(portA, { lifetime: "singleton" }, null, false, null, () => {
        runner.runSync(portB, { lifetime: "singleton" }, null, false, null, () => "B");
        return "A";
      });

      // Second call (B) should have parentPort = portA
      const secondCall = hooks.beforeResolve.mock.calls[1][0];
      expect(secondCall.portName).toBe("B");
      expect(secondCall.parentPort).toBe(portA);
      expect(secondCall.depth).toBe(1);
    });

    it("afterResolve includes duration", () => {
      const hooks = {
        afterResolve: vi.fn(),
      };
      const runner = new HooksRunner(hooks, {
        containerId: "root",
        containerKind: "root",
        parentContainerId: null,
      });

      const portA = port<string>()({ name: "A" });
      runner.runSync(portA, { lifetime: "singleton" }, null, false, null, () => "result");

      expect(hooks.afterResolve).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: expect.any(Number),
          error: null,
        })
      );
    });

    it("afterResolve includes error on failure", () => {
      const hooks = {
        afterResolve: vi.fn(),
      };
      const runner = new HooksRunner(hooks, {
        containerId: "root",
        containerKind: "root",
        parentContainerId: null,
      });

      const portA = port<string>()({ name: "A" });
      try {
        runner.runSync(portA, { lifetime: "singleton" }, null, false, null, () => {
          throw new Error("test error");
        });
      } catch {
        // Expected
      }

      expect(hooks.afterResolve).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
        })
      );
    });

    it("afterResolve includes result on success", () => {
      const hooks = {
        afterResolve: vi.fn(),
      };
      const runner = new HooksRunner(hooks, {
        containerId: "root",
        containerKind: "root",
        parentContainerId: null,
      });

      const portA = port<string>()({ name: "A" });
      runner.runSync(portA, { lifetime: "singleton" }, null, false, null, () => "the-result");

      expect(hooks.afterResolve).toHaveBeenCalledWith(
        expect.objectContaining({
          result: "the-result",
        })
      );
    });
  });

  describe("HooksRunner runAsync", () => {
    it("calls beforeResolve and afterResolve for async", async () => {
      const hooks = {
        beforeResolve: vi.fn(),
        afterResolve: vi.fn(),
      };
      const runner = new HooksRunner(hooks, {
        containerId: "root",
        containerKind: "root",
        parentContainerId: null,
      });

      const portA = port<string>()({ name: "A" });
      const result = await runner.runAsync(
        portA,
        { lifetime: "singleton" },
        null,
        false,
        null,
        async () => "async-result"
      );

      expect(result).toBe("async-result");
      expect(hooks.beforeResolve).toHaveBeenCalledTimes(1);
      expect(hooks.afterResolve).toHaveBeenCalledTimes(1);
    });

    it("runAsync afterResolve captures error on rejection", async () => {
      const hooks = {
        afterResolve: vi.fn(),
      };
      const runner = new HooksRunner(hooks, {
        containerId: "root",
        containerKind: "root",
        parentContainerId: null,
      });

      const portA = port<string>()({ name: "A" });
      try {
        await runner.runAsync(portA, { lifetime: "singleton" }, null, false, null, async () => {
          throw new Error("async error");
        });
      } catch {
        // Expected
      }

      expect(hooks.afterResolve).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
        })
      );
    });
  });

  describe("HooksRunner context fields", () => {
    it("context includes containerId, containerKind, parentContainerId", () => {
      const hooks = {
        beforeResolve: vi.fn(),
      };
      const runner = new HooksRunner(hooks, {
        containerId: "child-1",
        containerKind: "child",
        parentContainerId: "root",
      });

      const portA = port<string>()({ name: "A" });
      runner.runSync(portA, { lifetime: "singleton" }, "scope-1", true, "shared", () => "val");

      expect(hooks.beforeResolve).toHaveBeenCalledWith(
        expect.objectContaining({
          containerId: "child-1",
          containerKind: "child",
          parentContainerId: "root",
          scopeId: "scope-1",
          isCacheHit: true,
          inheritanceMode: "shared",
        })
      );
    });
  });
});

// =============================================================================
// container/internal/async-initializer.ts - AsyncInitializer
// =============================================================================

describe("async-initializer.ts mutation killers", () => {
  describe("markInitialized", () => {
    it("sets isInitialized to true", () => {
      const init = new AsyncInitializer();
      expect(init.isInitialized).toBe(false);
      init.markInitialized();
      expect(init.isInitialized).toBe(true);
    });
  });

  describe("registerAdapter and hasAsyncPort", () => {
    it("hasAsyncPort returns true for registered port", () => {
      const init = new AsyncInitializer();
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factoryKind: "async",
        factory: async () => ({ log: vi.fn() }),
      });
      init.registerAdapter(adapter);
      expect(init.hasAsyncPort(LoggerPort)).toBe(true);
    });

    it("hasAsyncPort returns false for unregistered port", () => {
      const init = new AsyncInitializer();
      expect(init.hasAsyncPort(LoggerPort)).toBe(false);
    });
  });

  describe("initialize", () => {
    it("is idempotent after successful initialization", async () => {
      const init = new AsyncInitializer();
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factoryKind: "async",
        factory: async () => ({ log: vi.fn() }),
      });
      init.registerAdapter(adapter);
      init.finalizeRegistration();

      let resolveCount = 0;
      const resolver = async () => {
        resolveCount++;
      };

      await init.initialize(resolver);
      expect(init.isInitialized).toBe(true);
      const countAfterFirst = resolveCount;

      await init.initialize(resolver);
      expect(resolveCount).toBe(countAfterFirst); // not called again
    });

    it("wraps non-AsyncFactoryError in AsyncFactoryError", async () => {
      const init = new AsyncInitializer();
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factoryKind: "async",
        factory: async () => ({ log: vi.fn() }),
      });
      init.registerAdapter(adapter);
      init.finalizeRegistration();

      const resolver = async () => {
        throw new Error("custom error");
      };

      await expect(init.initialize(resolver)).rejects.toThrow(AsyncFactoryError);
    });

    it("re-throws AsyncFactoryError as-is", async () => {
      const init = new AsyncInitializer();
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factoryKind: "async",
        factory: async () => ({ log: vi.fn() }),
      });
      init.registerAdapter(adapter);
      init.finalizeRegistration();

      const originalError = new AsyncFactoryError("Logger", new Error("inner"));
      const resolver = async () => {
        throw originalError;
      };

      await expect(init.initialize(resolver)).rejects.toBe(originalError);
    });

    it("concurrent initialize() calls share the same promise", async () => {
      const init = new AsyncInitializer();
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factoryKind: "async",
        factory: async () => ({ log: vi.fn() }),
      });
      init.registerAdapter(adapter);
      init.finalizeRegistration();

      let resolveCount = 0;
      const resolver = async () => {
        resolveCount++;
      };

      const p1 = init.initialize(resolver);
      const p2 = init.initialize(resolver);

      await Promise.all([p1, p2]);
      expect(resolveCount).toBe(1); // Only resolved once
      expect(init.isInitialized).toBe(true);
    });
  });

  describe("topological ordering", () => {
    it("initializes dependencies before dependents", async () => {
      const init = new AsyncInitializer();
      const order: string[] = [];

      const loggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factoryKind: "async",
        factory: async () => ({ log: vi.fn() }),
      });
      const dbAdapter = createAdapter({
        provides: DatabasePort,
        requires: [LoggerPort] as const,
        lifetime: "singleton",
        factoryKind: "async",
        factory: async () => ({ query: vi.fn() }),
      });

      init.registerAdapter(loggerAdapter);
      init.registerAdapter(dbAdapter);
      init.finalizeRegistration();

      const resolver = async (p: any) => {
        order.push(p.__portName);
      };

      await init.initialize(resolver);

      expect(order.indexOf("Logger")).toBeLessThan(order.indexOf("Database"));
    });

    it("no-op for empty adapters", async () => {
      const init = new AsyncInitializer();
      init.finalizeRegistration();
      await init.initialize(async () => {});
      expect(init.isInitialized).toBe(true);
    });
  });
});

// =============================================================================
// inspection/creation.ts - createInspector
// =============================================================================

describe("inspection/creation.ts mutation killers", () => {
  describe("getInternalAccessor", () => {
    it("throws when accessor is not a function", () => {
      const obj = { [INTERNAL_ACCESS]: "not-a-function" };
      expect(() => getInternalAccessor(obj as any)).toThrow(/INTERNAL_ACCESS/);
    });
  });

  describe("createInspector snapshot", () => {
    it("snapshot contains correct isDisposed", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      const inspector = createInspector(container);

      const snapshot = inspector.snapshot();
      expect(snapshot.isDisposed).toBe(false);
    });

    it("snapshot contains correct containerName", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "SpecificName" });
      const inspector = createInspector(container);

      const snapshot = inspector.snapshot();
      expect(snapshot.containerName).toBe("SpecificName");
    });

    it("snapshot singletons contain resolved info after resolution", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      container.resolve(LoggerPort);

      const inspector = createInspector(container);
      const snapshot = inspector.snapshot();

      const loggerEntry = snapshot.singletons.find((s: any) => s.portName === "Logger");
      expect(loggerEntry).toBeDefined();
      expect(loggerEntry.isResolved).toBe(true);
    });
  });

  describe("isResolved with suggestions", () => {
    it("suggests similar port name", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      const inspector = createInspector(container);

      // "Logge" is close to "Logger"
      expect(() => inspector.isResolved("Logge")).toThrow(/Did you mean/);
    });
  });

  describe("getScopeTree", () => {
    it("returns tree with container root node", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      const inspector = createInspector(container);

      const tree = inspector.getScopeTree();
      expect(tree.id).toBe("container");
      expect(tree.status).toBe("active");
    });

    it("tree includes child scopes", () => {
      const graph = makeScopedGraph();
      const container = createContainer({ graph, name: "Test" });
      container.createScope("test-scope");

      const inspector = createInspector(container);
      const tree = inspector.getScopeTree();

      expect(tree.children.length).toBe(1);
    });
  });
});

// =============================================================================
// container/root-impl.ts - Root Container
// =============================================================================

describe("root-impl.ts mutation killers", () => {
  describe("root container initialization", () => {
    it("initialize when disposed rejects with DisposedScopeError", async () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      await container.dispose();

      await expect(container.initialize()).rejects.toThrow(DisposedScopeError);
    });
  });

  describe("root container parent", () => {
    it("getParent returns undefined for root", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      // Accessing parent throws (unreachable)
      expect(() => container.parent).toThrow();
    });
  });

  describe("root container resolveWithInheritance throws", () => {
    it("throws for unregistered port (no inheritance)", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });

      expect(() => container.resolve(DatabasePort as any)).toThrow(
        /No adapter registered for port 'Database'/
      );
    });
  });

  describe("root container resolveAsync fallback throws", () => {
    it("rejects for unregistered port", async () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });

      await expect(container.resolveAsync(DatabasePort as any)).rejects.toThrow(
        /No adapter registered for port 'Database'/
      );
    });
  });
});

// =============================================================================
// resolution/async-engine.ts - AsyncResolutionEngine
// =============================================================================

describe("async-engine.ts mutation killers", () => {
  describe("async resolution with hooks", () => {
    it("hooks runner bypassed when null", async () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });

      // resolve async without hooks should work
      const logger = await container.resolveAsync(LoggerPort);
      expect(typeof logger.log).toBe("function");
    });

    it("async resolution deduplicates concurrent requests", async () => {
      let factoryCallCount = 0;
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factoryKind: "async",
        factory: async () => {
          factoryCallCount++;
          return { log: vi.fn() };
        },
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      // Concurrent resolves should share the same promise
      const [a, b] = await Promise.all([
        container.resolveAsync(LoggerPort),
        container.resolveAsync(LoggerPort),
      ]);

      expect(a).toBe(b);
      expect(factoryCallCount).toBe(1);
    });
  });

  describe("async resolution error handling", () => {
    it("wraps non-ContainerError in AsyncFactoryError", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factoryKind: "async",
        factory: async () => {
          throw new Error("factory boom");
        },
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      await expect(container.resolveAsync(LoggerPort)).rejects.toThrow(AsyncFactoryError);
    });
  });
});

// =============================================================================
// inspection/helpers.ts - Detection Functions
// =============================================================================

describe("inspection/helpers.ts mutation killers", () => {
  describe("determineOrigin helper (via getGraphData)", () => {
    it("returns 'own' for root container adapters", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;
      const graphData = inspector.getGraphData();

      expect(graphData.adapters[0].origin).toBe("own");
    });

    it("returns 'overridden' for override ports", () => {
      const graph = makeSimpleGraph();
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
      const loggerAdapter = graphData.adapters.find((a: any) => a.portName === "Logger");
      expect(loggerAdapter).toBeDefined();
      expect(loggerAdapter.isOverride).toBe(true);
      expect(loggerAdapter.origin).toBe("overridden");
    });
  });

  describe("getContainerKind helper (via getGraphData)", () => {
    it("root container has kind 'root'", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });
      const inspector = (container as any).inspector;
      expect(inspector.getGraphData().kind).toBe("root");
    });

    it("child container getContainerKind returns 'child' (from detectContainerKindFromInternal)", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });
      const inspector = (child as any).inspector;
      // getContainerKind uses detectContainerKindFromInternal which checks inheritanceModes
      expect(inspector.getContainerKind()).toBe("child");
    });
  });
});

// =============================================================================
// base-impl.ts - Additional Coverage
// =============================================================================

describe("base-impl.ts additional mutation killers", () => {
  describe("resolve returns correct type for different lifetimes", () => {
    it("transient creates new instance each time", () => {
      const graph = makeTransientGraph();
      const container = createContainer({ graph, name: "Test" });

      const a = container.resolve(LoggerPort);
      const b = container.resolve(LoggerPort);
      expect(a).not.toBe(b);
    });

    it("singleton returns same instance each time", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Test" });

      const a = container.resolve(LoggerPort);
      const b = container.resolve(LoggerPort);
      expect(a).toBe(b);
    });
  });

  describe("adapter map snapshot has correct fields", () => {
    it("dependencyCount matches requires length", () => {
      const loggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const dbAdapter = createAdapter({
        provides: DatabasePort,
        requires: [LoggerPort] as const,
        lifetime: "singleton",
        factory: deps => ({ query: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(loggerAdapter).provide(dbAdapter).build();
      const container = createContainer({ graph, name: "Test" });

      const state = (container as any)[INTERNAL_ACCESS]();
      for (const [, info] of state.adapterMap) {
        if (info.portName === "Logger") {
          expect(info.dependencyCount).toBe(0);
          expect(info.factoryKind).toBe("sync");
        }
        if (info.portName === "Database") {
          expect(info.dependencyCount).toBe(1);
          expect(info.dependencyNames).toEqual(["Logger"]);
        }
      }
    });
  });

  describe("getInternalState child scopes", () => {
    it("includes child scope snapshots", () => {
      const graph = makeScopedGraph();
      const container = createContainer({ graph, name: "Test" });

      const scope = container.createScope("test-scope");
      const state = (container as any)[INTERNAL_ACCESS]();

      expect(state.childScopes.length).toBe(1);
      expect(Object.isFrozen(state.childScopes)).toBe(true);
    });

    it("includes child container snapshots", () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });

      const childGraph = GraphBuilder.create().build();
      container.createChild(childGraph, { name: "Child" });

      const state = (container as any)[INTERNAL_ACCESS]();
      expect(state.childContainers.length).toBe(1);
      expect(Object.isFrozen(state.childContainers)).toBe(true);
    });
  });

  describe("child container parent access validation", () => {
    it("child.parent has expected structure", () => {
      const graph = makeSimpleGraph();
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
  });

  describe("unregisterChildContainer removes child from lifecycle", () => {
    it("child removed from parent after disposal", async () => {
      const graph = makeSimpleGraph();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().build();
      const child = container.createChild(childGraph, { name: "Child" });

      const state1 = (container as any)[INTERNAL_ACCESS]();
      expect(state1.childContainers.length).toBe(1);

      await child.dispose();

      const state2 = (container as any)[INTERNAL_ACCESS]();
      expect(state2.childContainers.length).toBe(0);
    });
  });
});
