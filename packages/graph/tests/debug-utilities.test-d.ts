/**
 * Type tests for Debug Utilities.
 *
 * These types help developers debug type-level validation by exposing
 * intermediate results in an inspectable format.
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import type {
  DebugWouldCreateCycle,
  DebugIsReachable,
  DebugDepthExceeded,
  DebugValidationPipeline,
} from "./test-types.js";

// =============================================================================
// Test Fixtures - Type-Level Adapters
// =============================================================================

// Simple dependency graph: A -> B -> C (no cycle)
type GraphABC = {
  readonly A: "B";
  readonly B: "C";
  readonly C: never;
};

// Empty graph
type GraphEmpty = Record<never, never>;

// =============================================================================
// DebugWouldCreateCycle Tests
// =============================================================================

describe("DebugWouldCreateCycle", () => {
  it("should report no cycle for acyclic graph", () => {
    // Adding D -> A to GraphABC doesn't create a cycle
    type Result = DebugWouldCreateCycle<GraphABC, "D", "A">;

    expectTypeOf<Result["wouldCycle"]>().toEqualTypeOf<false>();
    expectTypeOf<Result["newPort"]>().toEqualTypeOf<"D">();
    expectTypeOf<Result["requires"]>().toEqualTypeOf<"A">();
  });

  it("should report cycle when adding edge that creates cycle", () => {
    // Adding C -> A to GraphABC would create: A -> B -> C -> A
    // Wait, C already exists in GraphABC with C: never
    // So we need to check if adding an adapter for D that requires A
    // where A -> B -> C and then C -> D would create a cycle.

    // Actually, let's check: adding adapter for A that requires C to GraphABC
    // Graph is: A -> B -> C, adding new A -> C means C can reach A? No, C: never
    // So this won't create a cycle.

    // Let's use a graph where adding a new edge creates a cycle:
    // Graph: A -> B, B -> C
    // Adding C -> A creates: A -> B -> C -> A (cycle!)
    type GraphNoCycle = {
      readonly A: "B";
      readonly B: "C";
    };

    // Adding an adapter that provides C and requires A would create a cycle
    type Result = DebugWouldCreateCycle<GraphNoCycle, "C", "A">;

    expectTypeOf<Result["wouldCycle"]>().toEqualTypeOf<true>();
    expectTypeOf<Result["newPort"]>().toEqualTypeOf<"C">();
  });

  it("should detect self-dependency as immediate cycle", () => {
    type Result = DebugWouldCreateCycle<GraphEmpty, "A", "A">;

    expectTypeOf<Result["wouldCycle"]>().toEqualTypeOf<true>();
    expectTypeOf<Result["newPort"]>().toEqualTypeOf<"A">();
    expectTypeOf<Result["requires"]>().toEqualTypeOf<"A">();
  });

  it("should handle empty requires (never)", () => {
    type Result = DebugWouldCreateCycle<GraphABC, "D", never>;

    expectTypeOf<Result["wouldCycle"]>().toEqualTypeOf<false>();
    expectTypeOf<Result["newPort"]>().toEqualTypeOf<"D">();
  });
});

// =============================================================================
// DebugIsReachable Tests
// =============================================================================

describe("DebugIsReachable", () => {
  it("should detect reachable port", () => {
    // In GraphABC: A -> B -> C, so C is reachable from A
    type Result = DebugIsReachable<GraphABC, "A", "C">;

    expectTypeOf<Result["isReachable"]>().toEqualTypeOf<true>();
    expectTypeOf<Result["from"]>().toEqualTypeOf<"A">();
    expectTypeOf<Result["to"]>().toEqualTypeOf<"C">();
  });

  it("should detect unreachable port", () => {
    // In GraphABC: A -> B -> C, A is NOT reachable from C (C: never)
    type Result = DebugIsReachable<GraphABC, "C", "A">;

    expectTypeOf<Result["isReachable"]>().toEqualTypeOf<false>();
    expectTypeOf<Result["from"]>().toEqualTypeOf<"C">();
    expectTypeOf<Result["to"]>().toEqualTypeOf<"A">();
  });

  it("should handle starting from never", () => {
    type Result = DebugIsReachable<GraphABC, never, "A">;

    expectTypeOf<Result["isReachable"]>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// DebugDepthExceeded Tests
// =============================================================================

describe("DebugDepthExceeded", () => {
  it("should report not exceeded for shallow graphs", () => {
    type Result = DebugDepthExceeded<GraphABC, "A", 50>;

    expectTypeOf<Result["exceeded"]>().toEqualTypeOf<false>();
    expectTypeOf<Result["maxDepth"]>().toEqualTypeOf<50>();
    expectTypeOf<Result["startPort"]>().toEqualTypeOf<"A">();
  });

  it("should report exceeded when depth limit is very low", () => {
    // With maxDepth=1, even A -> B exceeds the limit
    type Result = DebugDepthExceeded<GraphABC, "A", 1>;

    expectTypeOf<Result["exceeded"]>().toEqualTypeOf<true>();
    expectTypeOf<Result["maxDepth"]>().toEqualTypeOf<1>();
  });

  it("should include lastPort when exceeded", () => {
    // When depth is exceeded, we should know which port was being processed
    // With maxDepth=1: starts at A (depth 0), visits B (depth 1), exceeds at B
    type Result = DebugDepthExceeded<GraphABC, "A", 1>;

    // lastPort should be the port where traversal stopped
    type LastPort = Result["lastPort"];
    // With maxDepth=1: A->B means B is where we hit the limit
    expectTypeOf<LastPort>().toEqualTypeOf<"B">();
  });
});

// =============================================================================
// DebugValidationPipeline Tests
// =============================================================================

describe("DebugValidationPipeline", () => {
  it("should expose all validation stages", () => {
    // Create a debug view of validation for adding a new adapter
    type LifetimeMap = {
      readonly A: 1; // singleton
      readonly B: 1; // singleton
      readonly C: 2; // scoped
    };

    type Result = DebugValidationPipeline<
      GraphABC,
      LifetimeMap,
      "D", // new port
      "A", // requires A
      1 // singleton lifetime level
    >;

    // Should expose each validation stage with correct types
    // D is not duplicate, not creating cycle, not captive (A is singleton, D depends on singleton A)
    expectTypeOf<Result["duplicateCheck"]["isDuplicate"]>().toEqualTypeOf<false>();
    expectTypeOf<Result["cycleCheck"]["wouldCycle"]>().toEqualTypeOf<false>();
    expectTypeOf<Result["captiveCheck"]["hasCaptive"]>().toEqualTypeOf<false>();
  });

  it("should flag duplicate when port already exists", () => {
    type LifetimeMap = {
      readonly A: 1;
    };

    // Adding adapter for existing port "A"
    type Result = DebugValidationPipeline<GraphABC, LifetimeMap, "A", never, 1>;

    expectTypeOf<Result["duplicateCheck"]["isDuplicate"]>().toEqualTypeOf<true>();
  });

  it("should flag captive when singleton depends on scoped", () => {
    type LifetimeMap = {
      readonly A: 1; // singleton
      readonly B: 2; // scoped
    };

    // Singleton D requiring scoped B = captive
    type Result = DebugValidationPipeline<GraphABC, LifetimeMap, "D", "B", 1>;

    expectTypeOf<Result["captiveCheck"]["hasCaptive"]>().toEqualTypeOf<true>();
  });
});
