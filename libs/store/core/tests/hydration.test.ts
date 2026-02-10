/**
 * Hydration Adapter Tests
 *
 * Tests for the StateHydrator interface and createHydrationAdapter factory.
 */

import { describe, it, expect } from "vitest";
import { createHydrationAdapter } from "../src/index.js";
import type { StateHydrator, HydrationStorage } from "../src/index.js";
import { port } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

const HydratorPort = port<StateHydrator>()({ name: "Hydrator" });

function createInMemoryStorage(): HydrationStorage & { store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  return {
    store,
    get(key: string): unknown | undefined {
      return store.get(key);
    },
    set(key: string, value: unknown): void {
      store.set(key, value);
    },
    remove(key: string): void {
      store.delete(key);
    },
  };
}

describe("createHydrationAdapter", () => {
  it("creates an adapter that resolves to StateHydrator", () => {
    const storage = createInMemoryStorage();
    const adapter = createHydrationAdapter({
      provides: HydratorPort,
      storage,
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "test" });
    const hydrator = container.resolve(HydratorPort);

    expect(hydrator).toBeDefined();
    expect(typeof hydrator.hydrate).toBe("function");
    expect(typeof hydrator.dehydrate).toBe("function");
  });

  it("dehydrate stores state and hydrate retrieves it", async () => {
    const storage = createInMemoryStorage();
    const adapter = createHydrationAdapter({
      provides: HydratorPort,
      storage,
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "test" });
    const hydrator = container.resolve(HydratorPort);

    const dehydrateResult = await hydrator.dehydrate("counter", { count: 42 });
    expect(dehydrateResult.isOk()).toBe(true);

    const hydrateResult = await hydrator.hydrate("counter");
    expect(hydrateResult.isOk()).toBe(true);
    if (hydrateResult.isOk()) {
      expect(hydrateResult.value).toEqual({ count: 42 });
    }
  });

  it("hydrate returns undefined for missing port", async () => {
    const storage = createInMemoryStorage();
    const adapter = createHydrationAdapter({
      provides: HydratorPort,
      storage,
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "test" });
    const hydrator = container.resolve(HydratorPort);

    const result = await hydrator.hydrate("nonexistent");
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeUndefined();
    }
  });

  it("returns HydrationError when storage throws on hydrate", async () => {
    const failingStorage: HydrationStorage = {
      get(): never {
        throw new Error("storage failure");
      },
      set(): never {
        throw new Error("storage failure");
      },
      remove(): never {
        throw new Error("storage failure");
      },
    };

    const adapter = createHydrationAdapter({
      provides: HydratorPort,
      storage: failingStorage,
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "test" });
    const hydrator = container.resolve(HydratorPort);

    const result = await hydrator.hydrate("counter");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HydrationFailed");
    }
  });

  it("returns HydrationError when storage throws on dehydrate", async () => {
    const failingStorage: HydrationStorage = {
      get(): never {
        throw new Error("storage failure");
      },
      set(): never {
        throw new Error("storage failure");
      },
      remove(): never {
        throw new Error("storage failure");
      },
    };

    const adapter = createHydrationAdapter({
      provides: HydratorPort,
      storage: failingStorage,
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "test" });
    const hydrator = container.resolve(HydratorPort);

    const result = await hydrator.dehydrate("counter", { count: 10 });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HydrationFailed");
      expect(result.error.portName).toBe("counter");
    }
  });

  it("stores values in the underlying storage backend", async () => {
    const storage = createInMemoryStorage();
    const adapter = createHydrationAdapter({
      provides: HydratorPort,
      storage,
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "test" });
    const hydrator = container.resolve(HydratorPort);

    await hydrator.dehydrate("myPort", { value: "hello" });

    expect(storage.store.get("myPort")).toEqual({ value: "hello" });
  });
});
