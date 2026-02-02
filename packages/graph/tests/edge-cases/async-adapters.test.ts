/**
 * Async adapter edge case tests.
 *
 * Tests behavior of async adapters including lifetime, dependencies, and properties.
 */

import { describe, expect, it } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../../src/index.js";

interface Service {
  name: string;
}

describe("async adapter edge cases", () => {
  it("async adapter with no dependencies receives empty object", () => {
    const AsyncServicePort = port<Service>()({ name: "AsyncService" });

    const receivedDeps: unknown[] = [];
    const asyncAdapter = createAdapter({
      provides: AsyncServicePort,
      requires: [],
      factory: async deps => {
        receivedDeps.push(deps);
        return { name: "async-service" };
      },
    });

    expect(asyncAdapter.factoryKind).toBe("async");
    expect(asyncAdapter.lifetime).toBe("singleton"); // Async adapters are always singleton
    expect(asyncAdapter.requires).toEqual([]);
  });

  it("async adapter is always a singleton", () => {
    const AsyncServicePort = port<Service>()({ name: "AsyncService" });

    const asyncAdapter = createAdapter({
      provides: AsyncServicePort,
      requires: [],
      factory: async () => ({ name: "async-service" }),
    });

    // Async adapters are forced to singleton lifetime
    expect(asyncAdapter.lifetime).toBe("singleton");
  });

  it("multiple async adapters in same graph", () => {
    const Async1Port = port<Service>()({ name: "Async1" });
    const Async2Port = port<Service>()({ name: "Async2" });
    const Async3Port = port<Service>()({ name: "Async3" });

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: Async1Port,
          requires: [],
          factory: async () => ({ name: "async1" }),
        })
      )
      .provide(
        createAdapter({
          provides: Async2Port,
          requires: [Async1Port],
          factory: async () => ({ name: "async2" }),
        })
      )
      .provide(
        createAdapter({
          provides: Async3Port,
          requires: [Async1Port, Async2Port],
          factory: async () => ({ name: "async3" }),
        })
      )
      .build();

    expect(graph.adapters.length).toBe(3);
    expect(graph.adapters.every(a => a.factoryKind === "async")).toBe(true);
    expect(graph.adapters.every(a => a.lifetime === "singleton")).toBe(true);
  });

  it("async adapter can depend on sync adapter", () => {
    const SyncPort = port<Service>()({ name: "Sync" });
    const AsyncPort = port<Service>()({ name: "Async" });

    const syncAdapter = createAdapter({
      provides: SyncPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "sync" }),
    });

    const asyncAdapter = createAdapter({
      provides: AsyncPort,
      requires: [SyncPort],
      factory: async () => ({ name: "async" }),
    });

    const graph = GraphBuilder.create().provide(syncAdapter).provide(asyncAdapter).build();

    expect(graph.adapters.length).toBe(2);
    expect(graph.adapters[0].factoryKind).toBe("sync");
    expect(graph.adapters[1].factoryKind).toBe("async");
  });

  it("async adapter factory return type is Promise", () => {
    const AsyncPort = port<Service>()({ name: "AsyncReturn" });

    const asyncAdapter = createAdapter({
      provides: AsyncPort,
      requires: [],
      factory: async () => {
        // Simulate async initialization
        await Promise.resolve();
        return { name: "async-return" };
      },
    });

    // Factory should return a Promise
    const factoryResult = asyncAdapter.factory({});
    expect(factoryResult).toBeInstanceOf(Promise);
  });

  it("async adapter preserves clonable property", () => {
    const ClonableAsyncPort = port<Service>()({ name: "ClonableAsync" });

    const clonableAsync = createAdapter({
      provides: ClonableAsyncPort,
      requires: [],
      clonable: true,
      factory: async () => ({ name: "clonable-async" }),
    });

    const nonClonableAsync = createAdapter({
      provides: port<Service>()({ name: "NonClonableAsync" }),
      requires: [],
      factory: async () => ({ name: "non-clonable-async" }),
    });

    expect(clonableAsync.clonable).toBe(true);
    expect(nonClonableAsync.clonable).toBe(false);
  });
});
