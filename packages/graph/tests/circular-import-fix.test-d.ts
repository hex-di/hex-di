/**
 * Type-level tests to verify GraphBuilderSignature compatibility.
 *
 * ## Circular Import Analysis
 *
 * The builder/types/ module has type-only circular imports detected by madge:
 * ```
 * builder.ts > types/index.ts > inspection.ts > merge.ts > provide.ts
 * ```
 *
 * These are `import type` statements which are erased at compile time, so:
 * - No runtime circular dependency exists
 * - TypeScript compilation succeeds
 * - All type inference works correctly
 *
 * The circularity exists because provide.ts and merge.ts need to construct
 * `GraphBuilder<...>` return types, which requires importing GraphBuilder.
 * The GraphBuilderSignature pattern enables pattern MATCHING without imports,
 * but constructing return types with methods still requires the class import.
 *
 * ## Status
 *
 * This is a known architectural limitation. The impact is minimal:
 * - May slightly slow TypeScript compilation on very large codebases
 * - Makes refactoring harder if moving files around
 *
 * A full fix would require either:
 * 1. Moving GraphBuilder class to a separate file that doesn't import types/
 * 2. Using declaration merging to add return types in builder.ts
 * 3. Restructuring to use a factory pattern
 *
 * None of these are justified given the minimal impact.
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/ports";
import { createAdapter, GraphBuilder } from "../src/index.js";
import type { GraphBuilderSignature } from "../src/builder/types/builder-signature.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const LoggerPort = createPort<"Logger", { log(msg: string): void }>("Logger");

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

// =============================================================================
// Compatibility Tests
// =============================================================================

describe("GraphBuilderSignature compatibility", () => {
  it("GraphBuilder is assignable to GraphBuilderSignature", () => {
    const builder = GraphBuilder.create();
    type BuilderType = typeof builder;

    // GraphBuilder should extend GraphBuilderSignature
    type IsAssignable = BuilderType extends GraphBuilderSignature ? true : false;
    expectTypeOf<IsAssignable>().toEqualTypeOf<true>();
  });

  it("GraphBuilder with ports is assignable to GraphBuilderSignature with same ports", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    type BuilderType = typeof builder;

    // Should be assignable to signature with same type params
    type IsAssignable =
      BuilderType extends GraphBuilderSignature<typeof LoggerPort, never, never, never, infer _I>
        ? true
        : false;
    expectTypeOf<IsAssignable>().toEqualTypeOf<true>();
  });

  it("can use GraphBuilderSignature for pattern matching", () => {
    // Extract TProvides using signature pattern
    type ExtractProvides<B> =
      B extends GraphBuilderSignature<infer TProvides, infer _R, infer _A, infer _O, infer _I>
        ? TProvides
        : never;

    const builder = GraphBuilder.create().provide(LoggerAdapter);
    type Provides = ExtractProvides<typeof builder>;
    expectTypeOf<Provides>().toEqualTypeOf<typeof LoggerPort>();
  });

  it("method chaining still works when return type is GraphBuilderSignature", () => {
    // Simulate what would happen if provide() returned GraphBuilderSignature
    // instead of GraphBuilder
    type SimulatedProvide<B extends GraphBuilderSignature> = GraphBuilderSignature<
      B["__provides"] | typeof LoggerPort,
      B["__requires"],
      B["__asyncPorts"],
      B["__overrides"],
      B["__internalState"]
    >;

    const builder = GraphBuilder.create();
    type Result = SimulatedProvide<typeof builder>;

    // The result should still have the phantom properties
    type HasProvides = Result["__provides"];
    expectTypeOf<HasProvides>().toEqualTypeOf<typeof LoggerPort>();
  });
});
