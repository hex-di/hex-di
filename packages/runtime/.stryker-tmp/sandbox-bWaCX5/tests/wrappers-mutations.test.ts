/**
 * Targeted mutation-killing tests for src/container/wrappers.ts
 * Tests hasInternalMethods type guard, isContainerParent,
 * addHook/removeHook, createChildAsync, createLazyChild,
 * tryResolve, tryResolveAsync, tryDispose, override builder.
 */
// @ts-nocheck

import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { ADAPTER_ACCESS, INTERNAL_ACCESS, HOOKS_ACCESS } from "../src/inspection/symbols.js";
import { hasInternalMethods } from "../src/container/wrappers.js";

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });

describe("hasInternalMethods", () => {
  it("returns false for null", () => {
    expect(hasInternalMethods(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(hasInternalMethods(undefined)).toBe(false);
  });

  it("returns false for string", () => {
    expect(hasInternalMethods("container")).toBe(false);
  });

  it("returns false for number", () => {
    expect(hasInternalMethods(42)).toBe(false);
  });

  it("returns false for empty object", () => {
    expect(hasInternalMethods({})).toBe(false);
  });

  it("returns false for object missing some internal methods", () => {
    const obj = {
      [ADAPTER_ACCESS]: () => {},
      registerChildContainer: () => {},
      // missing unregisterChildContainer, resolveInternal, etc.
    };
    expect(hasInternalMethods(obj)).toBe(false);
  });

  it("returns false when ADAPTER_ACCESS is not a function", () => {
    const obj = {
      [ADAPTER_ACCESS]: "not-a-function",
      registerChildContainer: () => {},
      unregisterChildContainer: () => {},
      resolveInternal: () => {},
      resolveAsyncInternal: () => {},
      hasAdapter: () => {},
      has: () => {},
    };
    expect(hasInternalMethods(obj)).toBe(false);
  });

  it("returns false when registerChildContainer is not a function", () => {
    const obj = {
      [ADAPTER_ACCESS]: () => {},
      registerChildContainer: "not-a-function",
      unregisterChildContainer: () => {},
      resolveInternal: () => {},
      resolveAsyncInternal: () => {},
      hasAdapter: () => {},
      has: () => {},
    };
    expect(hasInternalMethods(obj)).toBe(false);
  });

  it("returns true for real container", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });
    expect(hasInternalMethods(container)).toBe(true);
  });

  it("returns true for object with all required methods", () => {
    const obj = {
      [ADAPTER_ACCESS]: () => {},
      registerChildContainer: () => {},
      unregisterChildContainer: () => {},
      resolveInternal: () => {},
      resolveAsyncInternal: () => {},
      hasAdapter: () => {},
      has: () => {},
    };
    expect(hasInternalMethods(obj)).toBe(true);
  });
});

describe("container wrapper hooks", () => {
  describe("addHook / removeHook", () => {
    it("addHook installs beforeResolve hook", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const beforeResolve = vi.fn();
      container.addHook("beforeResolve", beforeResolve);

      container.resolve(LoggerPort);
      expect(beforeResolve).toHaveBeenCalledTimes(1);
    });

    it("addHook installs afterResolve hook", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const afterResolve = vi.fn();
      container.addHook("afterResolve", afterResolve);

      container.resolve(LoggerPort);
      expect(afterResolve).toHaveBeenCalledTimes(1);
    });

    it("removeHook removes a previously added hook", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const beforeResolve = vi.fn();
      container.addHook("beforeResolve", beforeResolve);
      container.removeHook("beforeResolve", beforeResolve);

      container.resolve(LoggerPort);
      expect(beforeResolve).not.toHaveBeenCalled();
    });

    it("removeHook is no-op for unregistered handler", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const unregistered = vi.fn();
      // Should not throw
      container.removeHook("beforeResolve", unregistered);
    });
  });

  describe("child container addHook / removeHook", () => {
    it("addHook on child works", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const parent = createContainer({ graph, name: "Parent" });

      const childGraph = GraphBuilder.create().build();
      const child = parent.createChild(childGraph, { name: "Child" });

      const afterResolve = vi.fn();
      child.addHook("afterResolve", afterResolve);

      child.resolve(LoggerPort);
      expect(afterResolve).toHaveBeenCalledTimes(1);
    });

    it("removeHook on child removes hook", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const parent = createContainer({ graph, name: "Parent" });

      const childGraph = GraphBuilder.create().build();
      const child = parent.createChild(childGraph, { name: "Child" });

      const beforeResolve = vi.fn();
      child.addHook("beforeResolve", beforeResolve);
      child.removeHook("beforeResolve", beforeResolve);

      child.resolve(LoggerPort);
      expect(beforeResolve).not.toHaveBeenCalled();
    });
  });
});

describe("container wrapper tryResolve / tryResolveAsync / tryDispose", () => {
  it("tryResolve returns ok result on success", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = container.tryResolve(LoggerPort);
    expect(result.isOk()).toBe(true);
  });

  it("tryResolve returns err result on failure", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => {
        throw new Error("boom");
      },
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = container.tryResolve(LoggerPort);
    expect(result.isErr()).toBe(true);
  });

  it("tryResolveAsync returns ok ResultAsync on success", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const resultAsync = container.tryResolveAsync(LoggerPort);
    const result = await resultAsync;
    expect(result.isOk()).toBe(true);
  });

  it("tryDispose returns ok ResultAsync on success", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = await container.tryDispose();
    expect(result.isOk()).toBe(true);
    expect(container.isDisposed).toBe(true);
  });
});

describe("container wrapper async child creation", () => {
  it("createChildAsync loads graph and creates child", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const parent = createContainer({ graph, name: "Parent" });

    const dbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });
    const childGraph = GraphBuilder.create().provide(dbAdapter).build();

    const child = await parent.createChildAsync(async () => childGraph, { name: "AsyncChild" });

    expect(child.name).toBe("AsyncChild");
    expect(child.resolve(DatabasePort).query).toBeDefined();
    // Parent ports are also accessible
    expect(child.resolve(LoggerPort).log).toBeDefined();
  });

  it("createLazyChild creates lazy container", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const parent = createContainer({ graph, name: "Parent" });

    const dbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });
    const childGraph = GraphBuilder.create().provide(dbAdapter).build();

    const lazy = parent.createLazyChild(async () => childGraph, { name: "LazyChild" });

    expect(lazy.isLoaded).toBe(false);
  });
});

describe("HOOKS_ACCESS on container", () => {
  it("root container has HOOKS_ACCESS", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const getHooksInstaller = (container as any)[HOOKS_ACCESS];
    expect(typeof getHooksInstaller).toBe("function");

    const installer = getHooksInstaller();
    expect(typeof installer.installHooks).toBe("function");
  });

  it("installing hooks via HOOKS_ACCESS works", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const getHooksInstaller = (container as any)[HOOKS_ACCESS];
    const installer = getHooksInstaller();

    const beforeResolve = vi.fn();
    const uninstall = installer.installHooks({ beforeResolve });

    container.resolve(LoggerPort);
    expect(beforeResolve).toHaveBeenCalledTimes(1);

    uninstall();

    container.resolve(LoggerPort);
    // Should not be called again after uninstall
    expect(beforeResolve).toHaveBeenCalledTimes(1);
  });

  it("child container has HOOKS_ACCESS", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const parent = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const getHooksInstaller = (child as any)[HOOKS_ACCESS];
    expect(typeof getHooksInstaller).toBe("function");
  });
});

describe("container override method", () => {
  it("override returns an OverrideBuilder", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const mockAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const builder = container.override(mockAdapter);
    expect(typeof builder.override).toBe("function");
    expect(typeof builder.build).toBe("function");
  });

  it("override().build() creates child with overridden adapter", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => "original" }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const mockLogger: Logger = { log: () => {} };
    const mockAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => mockLogger,
    });

    const overridden = container.override(mockAdapter).build();
    const logger = overridden.resolve(LoggerPort);
    expect(logger).toBe(mockLogger);
  });

  it("child container override works too", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const parent = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const mockAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => "mocked" }),
    });

    const overridden = child.override(mockAdapter).build();
    const logger = overridden.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });
});

describe("child container initialize throws", () => {
  it("accessing initialize on child throws", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const parent = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    expect(() => (child as any).initialize).toThrow();
  });

  it("accessing tryInitialize on child throws", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const parent = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    expect(() => (child as any).tryInitialize).toThrow();
  });
});

describe("container isInitialized", () => {
  it("uninitialized container returns false", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    // Root container without async ports: isInitialized is false until initialize() is called
    expect(container.isInitialized).toBe(false);
  });

  it("child container isInitialized returns true", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const parent = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    // Child containers are always initialized (inherit from parent)
    expect(child.isInitialized).toBe(true);
  });
});

describe("child container createChildAsync", () => {
  it("child container can create async child", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const parent = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const dbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });
    const grandchildGraph = GraphBuilder.create().provide(dbAdapter).build();

    const grandchild = await child.createChildAsync(async () => grandchildGraph, {
      name: "GrandChild",
    });

    expect(grandchild.name).toBe("GrandChild");
    expect(grandchild.resolve(DatabasePort).query).toBeDefined();
  });
});

describe("child container createLazyChild", () => {
  it("child container can create lazy child", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const parent = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const dbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });
    const grandchildGraph = GraphBuilder.create().provide(dbAdapter).build();

    const lazy = child.createLazyChild(async () => grandchildGraph, { name: "LazyGrandChild" });

    expect(lazy.isLoaded).toBe(false);
  });
});
