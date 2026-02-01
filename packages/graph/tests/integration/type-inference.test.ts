/**
 * Complex type inference integration tests.
 *
 * Tests type inference in complex generic scenarios and self-referential edge cases.
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import { createPort, type InferService, createAdapter } from "@hex-di/core";
import { GraphBuilder, InferGraphProvides, InferGraphRequires } from "../../src/index.js";
import type { UnsatisfiedDependencies } from "../../src/advanced.js";
import { LoggerPort, DatabasePort } from "./shared-fixtures.js";

describe("Integration: Complex generic type inference", () => {
  it("type inference works through complex nested generics", () => {
    // Create a generic repository pattern
    interface Repository<T> {
      findById(id: string): Promise<T | null>;
      save(entity: T): Promise<void>;
    }

    interface User {
      id: string;
      name: string;
    }

    const UserRepoPort = createPort<"UserRepo", Repository<User>>("UserRepo");

    const userRepoAdapter = createAdapter({
      provides: UserRepoPort,
      requires: [DatabasePort],
      lifetime: "scoped",
      factory: deps => ({
        findById: async id => {
          const [user] = await deps.Database.query<User>("SELECT * FROM users WHERE id = ?", [id]);
          return user || null;
        },
        save: async user => {
          await deps.Database.execute("INSERT INTO users VALUES (?)", [user]);
        },
      }),
    });
    expect(userRepoAdapter).toBeDefined();

    // Verify type inference preserved the generic
    type UserRepoService = InferService<typeof UserRepoPort>;
    expectTypeOf<UserRepoService>().toEqualTypeOf<Repository<User>>();

    // Build graph with database dependency
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: DatabasePort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ query: () => Promise.resolve([]), execute: () => Promise.resolve() }),
        })
      )
      .provide(userRepoAdapter)
      .build();
    expect(graph).toBeDefined();

    // Use conditional inference since __provides is optional
    type GraphProvides = typeof graph extends { __provides: infer P } ? P : never;
    expectTypeOf<GraphProvides>().toEqualTypeOf<typeof DatabasePort | typeof UserRepoPort>();
  });

  it("conditional types work correctly with graph builder types", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {}, error: () => {} }),
    });
    expect(adapter).toBeDefined();

    const builder = GraphBuilder.create().provide(adapter);
    expect(builder).toBeDefined();

    // Test UnsatisfiedDependencies with extracted types
    type Provides = InferGraphProvides<typeof builder>;
    type Requires = InferGraphRequires<typeof builder>;
    type Unsatisfied = UnsatisfiedDependencies<Provides, Requires>;

    // No unsatisfied dependencies
    expectTypeOf<Unsatisfied>().toBeNever();
  });
});

describe("Integration: Self-referential adapter (edge case)", () => {
  it("adapter requiring itself is detected at adapter creation time", () => {
    // This is a degenerate case - an adapter that requires its own port
    // Self-dependency is now caught at adapter creation time with a clear error

    expect(() =>
      createAdapter({
        provides: LoggerPort,
        requires: [LoggerPort], // Requires itself!
        lifetime: "singleton",
        factory: deps => {
          // This would be recursive - Logger requires Logger
          return deps.Logger; // Just return the dependency
        },
      })
    ).toThrow("Adapter cannot require its own port 'Logger'");
  });

  it("two adapters with circular dependency are detected at compile-time", () => {
    // A requires B, B requires A - this is a cycle
    interface ServiceA {
      a(): void;
    }
    interface ServiceB {
      b(): void;
    }

    const PortA = createPort<"A", ServiceA>("A");
    const PortB = createPort<"B", ServiceB>("B");

    const adapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: deps => ({ a: () => deps.B.b() }),
    });

    const adapterB = createAdapter({
      provides: PortB,
      requires: [PortA],
      lifetime: "singleton",
      factory: deps => ({ b: () => deps.A.a() }),
    });
    expect(adapterA).toBeDefined();
    expect(adapterB).toBeDefined();

    // Adding A is fine (B doesn't exist yet, so no cycle detected at this point)
    const builderWithA = GraphBuilder.create().provide(adapterA);
    expect(builderWithA).toBeDefined();
    type BuilderWithAType = typeof builderWithA;
    type IsBuilderAfterA = BuilderWithAType extends { provide: (...args: never[]) => unknown }
      ? true
      : false;
    expectTypeOf<IsBuilderAfterA>().toEqualTypeOf<true>();

    // Adding B creates the cycle: A->B->A
    type ProvideResultB = ReturnType<typeof builderWithA.provide<typeof adapterB>>;
    type IsCycleError = ProvideResultB extends `ERROR[HEX002]: Circular dependency: ${string}`
      ? true
      : false;
    expectTypeOf<IsCycleError>().toEqualTypeOf<true>();
  });
});
