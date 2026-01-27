/**
 * Multi-layer dependency chain integration tests.
 *
 * Tests A requires B, B requires C chains and adapters with multiple dependencies.
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import { createAdapter, GraphBuilder, Graph, InferAdapterRequires } from "../../src/index.js";
import {
  Logger,
  Database,
  Cache,
  LoggerPort,
  ConfigPort,
  DatabasePort,
  CachePort,
  UserServicePort,
} from "./shared-fixtures.js";

describe("Integration: Multi-layer dependency chain", () => {
  it("handles A requires B, B requires C chain correctly", () => {
    // Layer C: Config (no dependencies)
    const configAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        get: () => "",
        getNumber: () => 0,
      }),
    });

    // Layer B: Cache requires Config
    const cacheAdapter = createAdapter({
      provides: CachePort,
      requires: [ConfigPort],
      lifetime: "singleton",
      factory: () => {
        return {
          get: () => undefined,
          set: () => {},
          invalidate: () => {},
        };
      },
    });

    // Layer A: Database requires Cache
    const databaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [CachePort],
      lifetime: "singleton",
      factory: () => {
        return {
          query: () => Promise.resolve([]),
          execute: () => Promise.resolve(),
        };
      },
    });

    // Build the complete chain
    const graph = GraphBuilder.create()
      .provide(configAdapter)
      .provide(cacheAdapter)
      .provide(databaseAdapter)
      .build();

    expect(graph.adapters.length).toBe(3);

    // Verify type shows all dependencies are satisfied
    type GraphType = typeof graph;
    type IsGraph = GraphType extends Graph<infer P> ? P : never;
    expectTypeOf<IsGraph>().toEqualTypeOf<
      typeof ConfigPort | typeof CachePort | typeof DatabasePort
    >();
  });

  it("type errors when middle layer is missing", () => {
    const configAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: () => "", getNumber: () => 0 }),
    });

    const databaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [CachePort], // Cache is missing!
      lifetime: "singleton",
      factory: () => ({
        query: () => Promise.resolve([]),
        execute: () => Promise.resolve(),
      }),
    });

    // Build without Cache - should return error string
    const builder = GraphBuilder.create().provide(configAdapter).provide(databaseAdapter);
    expect(builder).toBeDefined();

    type BuildResult = ReturnType<typeof builder.build>;
    // Error should be a template literal with the missing port name
    expectTypeOf<BuildResult>().toEqualTypeOf<"ERROR[HEX008]: Missing adapters for Cache. Call .provide() first.">();
  });
});

describe("Integration: Adapter with multiple dependencies", () => {
  it("correctly resolves adapter with 3+ dependencies", () => {
    // UserService requires Logger, Database, and Cache
    const userServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort, CachePort],
      lifetime: "scoped",
      factory: deps => {
        // Verify all deps are accessible with correct types
        expectTypeOf(deps.Logger).toEqualTypeOf<Logger>();
        expectTypeOf(deps.Database).toEqualTypeOf<Database>();
        expectTypeOf(deps.Cache).toEqualTypeOf<Cache>();

        return {
          getUser: async id => {
            deps.Logger.log(`Getting user ${id}`);
            const cached = deps.Cache.get<{ id: string; name: string; email: string }>(id);
            if (cached) return cached;
            const [user] = await deps.Database.query<{ id: string; name: string; email: string }>(
              "SELECT * FROM users WHERE id = ?",
              [id]
            );
            return user || null;
          },
          createUser: async (name, email) => {
            deps.Logger.log(`Creating user ${name}`);
            await deps.Database.execute("INSERT INTO users (name, email) VALUES (?, ?)", [
              name,
              email,
            ]);
            return { id: "new-id" };
          },
        };
      },
    });
    expect(userServiceAdapter).toBeDefined();

    // Verify the adapter requires all three dependencies
    type AdapterRequires = InferAdapterRequires<typeof userServiceAdapter>;
    expectTypeOf<AdapterRequires>().toEqualTypeOf<
      typeof LoggerPort | typeof DatabasePort | typeof CachePort
    >();

    // Build complete graph
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: () => {}, error: () => {} }),
        })
      )
      .provide(
        createAdapter({
          provides: DatabasePort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ query: () => Promise.resolve([]), execute: () => Promise.resolve() }),
        })
      )
      .provide(
        createAdapter({
          provides: CachePort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ get: () => undefined, set: () => {}, invalidate: () => {} }),
        })
      )
      .provide(userServiceAdapter)
      .build();

    expect(graph.adapters.length).toBe(4);
  });
});
