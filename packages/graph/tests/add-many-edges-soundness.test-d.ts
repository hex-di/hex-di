/**
 * Type-level tests for AddManyEdges soundness.
 *
 * Verifies that AddManyEdges handles invalid adapter elements safely:
 * - When an element is not an adapter, AdapterProvidesName returns `never`
 * - AddEdge with `never` as key produces `{}`
 * - The dependency graph is not polluted
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import type { AddEdge, AddManyEdges } from "../src/validation/types/cycle/detection.js";
import type { EmptyDependencyGraph } from "../src/builder/types/state.js";
import { createPort } from "@hex-di/ports";
import { createAdapter } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const LoggerPort = createPort<"Logger", { log: () => void }>("Logger");
const DatabasePort = createPort<"Database", { query: () => void }>("Database");

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort],
  lifetime: "singleton",
  factory: () => ({ query: () => {} }),
});

// =============================================================================
// AddEdge with `never` key tests
// =============================================================================

describe("AddEdge handles never key safely", () => {
  it("AddEdge with never as TProvides produces no change", () => {
    // Mapped type over `never` produces empty object: { [K in never]: X } = {}
    // Intersection with empty object is identity: T & {} = T
    type Result = AddEdge<EmptyDependencyGraph, never, "SomePort">;

    // The result should be equivalent to the original graph
    // (with the phantom key preserved)
    expectTypeOf<Result>().toEqualTypeOf<EmptyDependencyGraph>();
  });

  it("AddEdge with never does not add any keys", () => {
    type Graph = { A: "B" };
    type Result = AddEdge<Graph, never, "C">;

    // Keys should remain the same
    type Keys = keyof Result;
    expectTypeOf<Keys>().toEqualTypeOf<"A">();
  });

  it("AddEdge with valid key adds the edge", () => {
    type Graph = { A: "B" };
    type Result = AddEdge<Graph, "C", "A">;

    // New key should be added
    expectTypeOf<Result["C"]>().toEqualTypeOf<"A">();
  });
});

// =============================================================================
// AddManyEdges with invalid elements tests
// =============================================================================

describe("AddManyEdges handles invalid elements safely", () => {
  it("valid adapters produce correct edges", () => {
    type Result = AddManyEdges<
      EmptyDependencyGraph,
      readonly [typeof LoggerAdapter, typeof DatabaseAdapter]
    >;

    // Logger provides "Logger" with no deps
    expectTypeOf<Result["Logger"]>().toEqualTypeOf<never>();

    // Database provides "Database" with deps on "Logger"
    expectTypeOf<Result["Database"]>().toEqualTypeOf<"Logger">();
  });

  it("non-adapter element does not pollute graph", () => {
    type NotAnAdapter = { something: "else" };

    // When a non-adapter is in the tuple:
    // - AdapterProvidesName<NotAnAdapter> = never
    // - AddEdge<Graph, never, ...> = Graph (no change)
    type Result = AddManyEdges<EmptyDependencyGraph, readonly [typeof LoggerAdapter, NotAnAdapter]>;

    // Only Logger should be added (not the non-adapter)
    expectTypeOf<Result["Logger"]>().toEqualTypeOf<never>();

    // With symbol branding, only real string keys appear in Extract<keyof, string>
    type Keys = Extract<keyof Result, string>;
    expectTypeOf<Keys>().toEqualTypeOf<"Logger">();
  });

  it("empty tuple returns original graph", () => {
    type Result = AddManyEdges<EmptyDependencyGraph, readonly []>;
    expectTypeOf<Result>().toEqualTypeOf<EmptyDependencyGraph>();
  });

  it("single valid adapter produces correct graph", () => {
    type Result = AddManyEdges<EmptyDependencyGraph, readonly [typeof LoggerAdapter]>;
    expectTypeOf<Result["Logger"]>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// Conclusion: Safe by design
// =============================================================================

describe("AddManyEdges is safe by design", () => {
  /**
   * The concern was that if a tuple element isn't an adapter,
   * AdapterProvidesName returns `never`, potentially adding an edge
   * with `never` as the key.
   *
   * However, this is actually safe because:
   * 1. `{ [K in never]: T }` = `{}` (mapped type over never is empty)
   * 2. `TDepGraph & {}` = `TDepGraph` (intersection with empty is identity)
   *
   * So invalid elements simply don't add any edges - they're silently ignored.
   */

  it("documents that mapped type over never is empty object", () => {
    type MappedOverNever = { [K in never]: "value" };
    type IsEmpty = keyof MappedOverNever extends never ? true : false;
    expectTypeOf<IsEmpty>().toEqualTypeOf<true>();
  });

  it("documents that intersection with empty object is identity", () => {
    type Graph = { A: "B"; C: "D" };
    type IntersectedWithEmpty = Graph & {};
    expectTypeOf<IntersectedWithEmpty>().toEqualTypeOf<Graph>();
  });
});
