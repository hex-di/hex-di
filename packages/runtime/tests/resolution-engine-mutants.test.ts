/**
 * Mutation-killing tests for:
 * - resolution/engine.ts: ResolutionEngine resolve, hooks paths, error wrapping
 * - resolution/async-engine.ts: AsyncResolutionEngine resolve, dedup, cleanup
 * - container/internal/inheritance-resolver.ts: getMode, shared/forked/isolated
 */
import { describe, it, expect, vi } from "vitest";
import { port } from "@hex-di/core";
import { ResolutionEngine } from "../src/resolution/engine.js";
import { AsyncResolutionEngine } from "../src/resolution/async-engine.js";
import { InheritanceResolver } from "../src/container/internal/inheritance-resolver.js";
import { ResolutionContext } from "../src/resolution/context.js";
import { HooksRunner, type ContainerMetadata } from "../src/resolution/hooks-runner.js";
import { MemoMap } from "../src/util/memo-map.js";
import { FactoryError, AsyncFactoryError } from "../src/errors/index.js";
import { ADAPTER_ACCESS } from "../src/inspection/symbols.js";

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

const defaultMetadata: ContainerMetadata = {
  containerId: "root",
  containerKind: "root",
  parentContainerId: null,
};

function makeAdapter(
  portObj: any,
  opts: {
    lifetime?: "singleton" | "scoped" | "transient";
    requires?: any[];
    factory?: any;
    factoryKind?: "sync" | "async";
    clonable?: boolean;
  } = {}
) {
  return {
    provides: portObj,
    requires: opts.requires ?? [],
    portName: portObj.__portName,
    lifetime: opts.lifetime ?? "singleton",
    factoryKind: opts.factoryKind ?? "sync",
    factory: opts.factory ?? vi.fn().mockReturnValue({ mock: true }),
    dependencyNames: (opts.requires ?? []).map((p: any) => p.__portName),
    finalizer: undefined,
    clonable: opts.clonable ?? false,
  } as any;
}

// =============================================================================
// ResolutionEngine (sync)
// =============================================================================

describe("ResolutionEngine (mutant killing)", () => {
  it("resolves without hooks (null hooksRunner)", () => {
    const singletonMemo = new MemoMap();
    const context = new ResolutionContext();
    const loggerInstance = { log: vi.fn() };

    const engine = new ResolutionEngine(
      singletonMemo,
      context,
      null, // no hooks
      vi.fn() // dependency resolver
    );

    const adapter = makeAdapter(LoggerPort, {
      factory: () => loggerInstance,
    });

    const result = engine.resolve(LoggerPort, adapter, new MemoMap(), null);
    expect(result).toBe(loggerInstance);
  });

  it("resolves with hooks runner", () => {
    const singletonMemo = new MemoMap();
    const context = new ResolutionContext();
    const hooksRunner = new HooksRunner(
      { beforeResolve: vi.fn(), afterResolve: vi.fn() },
      defaultMetadata
    );
    const loggerInstance = { log: vi.fn() };

    const engine = new ResolutionEngine(singletonMemo, context, hooksRunner, vi.fn());

    const adapter = makeAdapter(LoggerPort, {
      factory: () => loggerInstance,
    });

    const result = engine.resolve(LoggerPort, adapter, new MemoMap(), null);
    expect(result).toBe(loggerInstance);
  });

  it("caches singleton on second resolve", () => {
    const singletonMemo = new MemoMap();
    const context = new ResolutionContext();
    let callCount = 0;

    const engine = new ResolutionEngine(singletonMemo, context, null, vi.fn());

    const adapter = makeAdapter(LoggerPort, {
      factory: () => {
        callCount++;
        return { log: vi.fn() };
      },
    });

    const scopedMemo = new MemoMap();
    const first = engine.resolve(LoggerPort, adapter, scopedMemo, null);
    const second = engine.resolve(LoggerPort, adapter, scopedMemo, null);

    expect(first).toBe(second);
    expect(callCount).toBe(1);
  });

  it("cache hit detected for singleton after first resolve (hooks runner path)", () => {
    const singletonMemo = new MemoMap();
    const context = new ResolutionContext();
    const before = vi.fn();
    const hooksRunner = new HooksRunner(
      { beforeResolve: before, afterResolve: vi.fn() },
      defaultMetadata
    );

    const engine = new ResolutionEngine(singletonMemo, context, hooksRunner, vi.fn());

    const adapter = makeAdapter(LoggerPort, {
      factory: () => ({ log: vi.fn() }),
    });

    const scopedMemo = new MemoMap();
    engine.resolve(LoggerPort, adapter, scopedMemo, null);

    // Second resolve - should detect cache hit
    engine.resolve(LoggerPort, adapter, scopedMemo, null);

    // beforeResolve called twice - first with isCacheHit=false, second with isCacheHit=true
    expect(before).toHaveBeenCalledTimes(2);
    const firstCtx = before.mock.calls[0][0];
    expect(firstCtx.isCacheHit).toBe(false);
    const secondCtx = before.mock.calls[1][0];
    expect(secondCtx.isCacheHit).toBe(true);
  });

  it("wraps non-ContainerError in FactoryError", () => {
    const singletonMemo = new MemoMap();
    const context = new ResolutionContext();

    const engine = new ResolutionEngine(singletonMemo, context, null, vi.fn());

    const adapter = makeAdapter(LoggerPort, {
      factory: () => {
        throw new Error("boom");
      },
    });

    expect(() => engine.resolve(LoggerPort, adapter, new MemoMap(), null)).toThrow(FactoryError);
  });

  it("re-throws ContainerError directly", () => {
    const singletonMemo = new MemoMap();
    const context = new ResolutionContext();

    const engine = new ResolutionEngine(singletonMemo, context, null, vi.fn());

    const original = new FactoryError("Logger", new Error("original"));
    const adapter = makeAdapter(LoggerPort, {
      factory: () => {
        throw original;
      },
    });

    expect(() => engine.resolve(LoggerPort, adapter, new MemoMap(), null)).toThrow(original);
  });

  it("transient lifetime creates new instance each time", () => {
    const singletonMemo = new MemoMap();
    const context = new ResolutionContext();

    const engine = new ResolutionEngine(singletonMemo, context, null, vi.fn());

    const adapter = makeAdapter(LoggerPort, {
      lifetime: "transient",
      factory: () => ({ log: vi.fn() }),
    });

    const scopedMemo = new MemoMap();
    const first = engine.resolve(LoggerPort, adapter, scopedMemo, null);
    const second = engine.resolve(LoggerPort, adapter, scopedMemo, null);

    expect(first).not.toBe(second);
  });

  it("scoped lifetime uses scopedMemo", () => {
    const singletonMemo = new MemoMap();
    const context = new ResolutionContext();

    const engine = new ResolutionEngine(singletonMemo, context, null, vi.fn());

    const adapter = makeAdapter(LoggerPort, {
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });

    const scopedMemo = new MemoMap();
    const first = engine.resolve(LoggerPort, adapter, scopedMemo, "scope-1");
    const second = engine.resolve(LoggerPort, adapter, scopedMemo, "scope-1");
    expect(first).toBe(second); // same scope, same instance

    const otherScopedMemo = new MemoMap();
    const third = engine.resolve(LoggerPort, adapter, otherScopedMemo, "scope-2");
    expect(third).not.toBe(first); // different scope, different instance
  });

  it("resolves dependencies using dependency resolver", () => {
    const singletonMemo = new MemoMap();
    const context = new ResolutionContext();
    const loggerInstance = { log: vi.fn() };

    const depResolver = vi.fn().mockReturnValue(loggerInstance);

    const engine = new ResolutionEngine(singletonMemo, context, null, depResolver);

    const adapter = makeAdapter(DatabasePort, {
      requires: [LoggerPort],
      factory: (deps: any) => ({ query: vi.fn(), logger: deps.Logger }),
    });

    const result = engine.resolve(DatabasePort, adapter, new MemoMap(), null);
    expect(depResolver).toHaveBeenCalledWith(LoggerPort, expect.anything(), null, undefined);
    expect(result).toBeDefined();
  });
});

// =============================================================================
// AsyncResolutionEngine
// =============================================================================

describe("AsyncResolutionEngine (mutant killing)", () => {
  it("resolves without hooks", async () => {
    const singletonMemo = new MemoMap();
    const context = new ResolutionContext();
    const loggerInstance = { log: vi.fn() };

    const engine = new AsyncResolutionEngine(
      singletonMemo,
      context,
      null,
      async () => loggerInstance
    );

    const adapter = makeAdapter(LoggerPort, {
      factoryKind: "async",
      factory: async () => loggerInstance,
    });

    const result = await engine.resolve(LoggerPort, adapter, new MemoMap(), null);
    expect(result).toBe(loggerInstance);
  });

  it("resolves with hooks runner", async () => {
    const singletonMemo = new MemoMap();
    const context = new ResolutionContext();
    const hooksRunner = new HooksRunner({ beforeResolve: vi.fn() }, defaultMetadata);
    const loggerInstance = { log: vi.fn() };

    const engine = new AsyncResolutionEngine(
      singletonMemo,
      context,
      hooksRunner,
      async () => loggerInstance
    );

    const adapter = makeAdapter(LoggerPort, {
      factoryKind: "async",
      factory: async () => loggerInstance,
    });

    const result = await engine.resolve(LoggerPort, adapter, new MemoMap(), null);
    expect(result).toBe(loggerInstance);
  });

  it("deduplicates concurrent resolutions for same port/scope", async () => {
    const singletonMemo = new MemoMap();
    const context = new ResolutionContext();
    let callCount = 0;

    const engine = new AsyncResolutionEngine(singletonMemo, context, null, async () => ({}));

    const adapter = makeAdapter(LoggerPort, {
      factoryKind: "async",
      factory: async () => {
        callCount++;
        await new Promise(r => setTimeout(r, 10));
        return { log: vi.fn() };
      },
    });

    const scopedMemo = new MemoMap();
    const [r1, r2] = await Promise.all([
      engine.resolve(LoggerPort, adapter, scopedMemo, null),
      engine.resolve(LoggerPort, adapter, scopedMemo, null),
    ]);

    expect(r1).toBe(r2);
    expect(callCount).toBe(1);
  });

  it("does not deduplicate for different scopes (sequential)", async () => {
    const singletonMemo = new MemoMap();
    const context = new ResolutionContext();

    const engine = new AsyncResolutionEngine(singletonMemo, context, null, async () => ({}));

    const adapter = makeAdapter(LoggerPort, {
      factoryKind: "async",
      lifetime: "scoped",
      factory: async () => ({ log: vi.fn() }),
    });

    const scope1 = new MemoMap();
    const scope2 = new MemoMap();
    // Resolve sequentially to avoid circular dep detection
    const r1 = await engine.resolve(LoggerPort, adapter, scope1, "scope-1");
    const r2 = await engine.resolve(LoggerPort, adapter, scope2, "scope-2");

    expect(r1).not.toBe(r2);
  });

  it("wraps non-ContainerError in AsyncFactoryError", async () => {
    const singletonMemo = new MemoMap();
    const context = new ResolutionContext();

    const engine = new AsyncResolutionEngine(singletonMemo, context, null, async () => ({}));

    const adapter = makeAdapter(LoggerPort, {
      factoryKind: "async",
      factory: async () => {
        throw new Error("async boom");
      },
    });

    await expect(engine.resolve(LoggerPort, adapter, new MemoMap(), null)).rejects.toThrow(
      AsyncFactoryError
    );
  });

  it("re-throws ContainerError directly", async () => {
    const singletonMemo = new MemoMap();
    const context = new ResolutionContext();

    const original = new AsyncFactoryError("Logger", new Error("original"));

    const engine = new AsyncResolutionEngine(singletonMemo, context, null, async () => ({}));

    const adapter = makeAdapter(LoggerPort, {
      factoryKind: "async",
      factory: async () => {
        throw original;
      },
    });

    await expect(engine.resolve(LoggerPort, adapter, new MemoMap(), null)).rejects.toBe(original);
  });

  it("cleans up pending resolutions after completion", async () => {
    const singletonMemo = new MemoMap();
    const context = new ResolutionContext();

    const engine = new AsyncResolutionEngine(singletonMemo, context, null, async () => ({}));

    const adapter = makeAdapter(LoggerPort, {
      factoryKind: "async",
      lifetime: "transient",
      factory: async () => ({ log: vi.fn() }),
    });

    const scopedMemo = new MemoMap();
    await engine.resolve(LoggerPort, adapter, scopedMemo, null);

    // After resolution, pending should be cleaned up, so next resolve creates new
    let callCount = 0;
    const adapter2 = makeAdapter(LoggerPort, {
      factoryKind: "async",
      lifetime: "transient",
      factory: async () => {
        callCount++;
        return { log: vi.fn() };
      },
    });
    await engine.resolve(LoggerPort, adapter2, scopedMemo, null);
    expect(callCount).toBe(1);
  });

  it("resolves cached singleton on second call", async () => {
    const singletonMemo = new MemoMap();
    const context = new ResolutionContext();

    const engine = new AsyncResolutionEngine(singletonMemo, context, null, async () => ({}));

    let callCount = 0;
    const adapter = makeAdapter(LoggerPort, {
      factoryKind: "async",
      factory: async () => {
        callCount++;
        return { log: vi.fn() };
      },
    });

    const scopedMemo = new MemoMap();
    const first = await engine.resolve(LoggerPort, adapter, scopedMemo, null);
    const second = await engine.resolve(LoggerPort, adapter, scopedMemo, null);

    expect(first).toBe(second);
    expect(callCount).toBe(1);
  });

  it("cache hit triggers hooks with isCacheHit=true", async () => {
    const singletonMemo = new MemoMap();
    const context = new ResolutionContext();
    const before = vi.fn();
    const hooksRunner = new HooksRunner({ beforeResolve: before }, defaultMetadata);

    const engine = new AsyncResolutionEngine(singletonMemo, context, hooksRunner, async () => ({}));

    const adapter = makeAdapter(LoggerPort, {
      factoryKind: "async",
      factory: async () => ({ log: vi.fn() }),
    });

    const scopedMemo = new MemoMap();
    await engine.resolve(LoggerPort, adapter, scopedMemo, null);
    // Now it's cached
    await engine.resolve(LoggerPort, adapter, scopedMemo, null);

    // Second call should detect cache hit
    const secondCall = before.mock.calls[1]?.[0];
    expect(secondCall?.isCacheHit).toBe(true);
  });

  it("transient async lifetime creates new each time", async () => {
    const singletonMemo = new MemoMap();
    const context = new ResolutionContext();

    const engine = new AsyncResolutionEngine(singletonMemo, context, null, async () => ({}));

    const adapter = makeAdapter(LoggerPort, {
      factoryKind: "async",
      lifetime: "transient",
      factory: async () => ({ log: vi.fn() }),
    });

    const scopedMemo = new MemoMap();
    const first = await engine.resolve(LoggerPort, adapter, scopedMemo, null);
    // Wait for cleanup
    await new Promise(r => setTimeout(r, 20));
    const second = await engine.resolve(LoggerPort, adapter, scopedMemo, null);

    expect(first).not.toBe(second);
  });
});

// =============================================================================
// InheritanceResolver
// =============================================================================

describe("InheritanceResolver (mutant killing)", () => {
  function makeParentContainer(adapters: any[]) {
    const instances: Map<any, any> = new Map();
    return {
      resolveInternal: (port: any) => {
        let inst = instances.get(port);
        if (!inst) {
          inst = { portName: port.__portName, value: Math.random() };
          instances.set(port, inst);
        }
        return inst;
      },
      [ADAPTER_ACCESS]: (port: any) => {
        return adapters.find(a => a.provides === port);
      },
    } as any;
  }

  describe("getMode", () => {
    it("returns mode from map", () => {
      const modes = new Map([["Logger", "forked" as const]]);
      const parent = makeParentContainer([]);
      const resolver = new InheritanceResolver(parent, modes);
      expect(resolver.getMode("Logger")).toBe("forked");
    });

    it("defaults to 'shared' when port not in map", () => {
      const modes = new Map<string, any>();
      const parent = makeParentContainer([]);
      const resolver = new InheritanceResolver(parent, modes);
      expect(resolver.getMode("Logger")).toBe("shared");
    });

    it("returns 'isolated' when set", () => {
      const modes = new Map([["Logger", "isolated" as const]]);
      const parent = makeParentContainer([]);
      const resolver = new InheritanceResolver(parent, modes);
      expect(resolver.getMode("Logger")).toBe("isolated");
    });
  });

  describe("resolveWithCallback - shared mode", () => {
    it("delegates to parent for shared mode", () => {
      const adapter = makeAdapter(LoggerPort, { clonable: true });
      const parent = makeParentContainer([adapter]);
      const modes = new Map<string, any>(); // default = shared
      const resolver = new InheritanceResolver(parent, modes);

      const result: any = resolver.resolveWithCallback(LoggerPort, vi.fn() as any);
      expect(result).toBeDefined();
      expect(result.portName).toBe("Logger");
    });

    it("returns same instance on multiple shared resolves", () => {
      const adapter = makeAdapter(LoggerPort, { clonable: true });
      const parent = makeParentContainer([adapter]);
      const modes = new Map<string, any>();
      const resolver = new InheritanceResolver(parent, modes);

      const first = resolver.resolveWithCallback(LoggerPort, vi.fn() as any);
      const second = resolver.resolveWithCallback(LoggerPort, vi.fn() as any);
      expect(first).toBe(second);
    });
  });

  describe("resolveWithCallback - forked mode", () => {
    it("returns cloned instance for forked mode", () => {
      const adapter = makeAdapter(LoggerPort, { clonable: true });
      const parent = makeParentContainer([adapter]);
      const modes = new Map([["Logger", "forked" as const]]);
      const resolver = new InheritanceResolver(parent, modes);

      const result: any = resolver.resolveWithCallback(LoggerPort, vi.fn() as any);
      expect(result).toBeDefined();
      // Should be different reference (cloned)
      const parentInstance = parent.resolveInternal(LoggerPort);
      expect(result).not.toBe(parentInstance);
      // But same structure
      expect(result.portName).toBe(parentInstance.portName);
    });

    it("caches forked instance on second resolve", () => {
      const adapter = makeAdapter(LoggerPort, { clonable: true });
      const parent = makeParentContainer([adapter]);
      const modes = new Map([["Logger", "forked" as const]]);
      const resolver = new InheritanceResolver(parent, modes);

      const first = resolver.resolveWithCallback(LoggerPort, vi.fn() as any);
      const second = resolver.resolveWithCallback(LoggerPort, vi.fn() as any);
      expect(first).toBe(second);
    });

    it("throws NonClonableForkedError when adapter is not clonable", () => {
      const adapter = makeAdapter(LoggerPort, { clonable: false });
      const parent = makeParentContainer([adapter]);
      const modes = new Map([["Logger", "forked" as const]]);
      const resolver = new InheritanceResolver(parent, modes);

      expect(() => resolver.resolveWithCallback(LoggerPort, vi.fn() as any)).toThrow(
        /clonable|forked/i
      );
    });

    it("throws NonClonableForkedError when adapter is undefined", () => {
      const parent = makeParentContainer([]);
      const modes = new Map([["Logger", "forked" as const]]);
      const resolver = new InheritanceResolver(parent, modes);

      expect(() => resolver.resolveWithCallback(LoggerPort, vi.fn() as any)).toThrow(
        /clonable|forked/i
      );
    });
  });

  describe("resolveWithCallback - isolated mode", () => {
    it("uses callback when adapter is available", () => {
      const adapter = makeAdapter(LoggerPort, { clonable: true });
      const parent = makeParentContainer([adapter]);
      const modes = new Map([["Logger", "isolated" as const]]);
      const resolver = new InheritanceResolver(parent, modes);

      const isolatedInstance = { log: vi.fn(), isolated: true };
      const callback = vi.fn().mockReturnValue(isolatedInstance);

      const result = resolver.resolveWithCallback(LoggerPort, callback as any);
      expect(callback).toHaveBeenCalledWith(LoggerPort, adapter);
      expect(result).toBe(isolatedInstance);
    });

    it("falls back to clone when no adapter available", () => {
      const parent = makeParentContainer([]);
      const modes = new Map([["Logger", "isolated" as const]]);
      const resolver = new InheritanceResolver(parent, modes);

      const callback = vi.fn();
      const result: any = resolver.resolveWithCallback(LoggerPort, callback as any);

      // Callback should NOT be called
      expect(callback).not.toHaveBeenCalled();
      // Should be a clone of parent instance
      expect(result).toBeDefined();
      const parentInstance = parent.resolveInternal(LoggerPort);
      expect(result).not.toBe(parentInstance);
      expect(result.portName).toBe(parentInstance.portName);
    });
  });

  describe("resolveSharedInternal", () => {
    it("delegates to parent resolveInternal", () => {
      const adapter = makeAdapter(LoggerPort);
      const parent = makeParentContainer([adapter]);
      const modes = new Map<string, any>();
      const resolver = new InheritanceResolver(parent, modes);

      const result: any = resolver.resolveSharedInternal(LoggerPort);
      expect(result).toBeDefined();
      expect(result.portName).toBe("Logger");
    });
  });
});
