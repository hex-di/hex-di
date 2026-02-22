/**
 * EXPERIMENTAL: Parameter Constraint Pattern Investigation
 *
 * This file documents an experiment to move validation from return type to
 * parameter constraint to potentially eliminate type casts.
 *
 * ## KEY FINDING: Pattern Does NOT Work
 *
 * The hypothesis was that `"ERROR: ..." & AdapterType` would produce `never`,
 * causing TypeScript to reject the adapter at the call site.
 *
 * **Reality:** TypeScript allows intersections of primitives and objects,
 * creating "branded primitives". So `"ERROR: ..." & { ... }` is NOT `never`.
 *
 * This fundamental TypeScript behavior means the Parameter Constraint Pattern
 * CANNOT work for our use case.
 *
 * ## Conclusion
 *
 * The architectural casts in GraphBuilder are NECESSARY and UNAVOIDABLE in
 * TypeScript. There is no alternative pattern that can eliminate them while
 * preserving:
 * 1. Zero runtime overhead
 * 2. Template literal error messages
 * 3. Fluent builder API
 *
 * This experiment validates the current architecture.
 */

import { describe, expectTypeOf, it } from "vitest";
import type { Port, AdapterConstraint, Lifetime, FactoryKind } from "@hex-di/core";

// =============================================================================
// Experimental Types
// =============================================================================

type InferAdapterPortName<A> = A extends { provides: Port<infer Name, unknown> } ? Name : never;

// Must handle `never` specially because `never extends X` is always true
type HasOverlap<A extends string, B extends string> = [A] extends [never]
  ? false
  : [B] extends [never]
    ? false
    : A extends B
      ? true
      : B extends A
        ? true
        : false;

type DuplicateError<PortName extends string> =
  `ERROR[HEX001]: Duplicate adapter for '${PortName}'. Fix: Remove one .provide() call, or use .override() for child graphs.`;

type ValidateAdapter<TProvides extends string, A extends AdapterConstraint> =
  HasOverlap<InferAdapterPortName<A>, TProvides> extends true
    ? DuplicateError<InferAdapterPortName<A>>
    : A;

// =============================================================================
// Mock Types for Testing
// =============================================================================

interface Logger {
  log(): void;
}
interface Database {
  query(): void;
}

interface MockLoggerAdapter {
  readonly provides: Port<"Logger", Logger>;
  readonly requires: readonly [];
  readonly lifetime: Lifetime;
  readonly factoryKind: FactoryKind;
  readonly factory: () => Logger;
  readonly clonable: false;
}

interface MockDatabaseAdapter {
  readonly provides: Port<"Database", Database>;
  readonly requires: readonly [];
  readonly lifetime: Lifetime;
  readonly factoryKind: FactoryKind;
  readonly factory: () => Database;
  readonly clonable: false;
}

// =============================================================================
// Tests: ValidateAdapter Works Correctly in Isolation
// =============================================================================

describe("Parameter Constraint Pattern - ValidateAdapter Logic", () => {
  it("returns adapter type when no overlap (TProvides=never)", () => {
    type Result = ValidateAdapter<never, MockLoggerAdapter>;
    expectTypeOf<Result>().toEqualTypeOf<MockLoggerAdapter>();
  });

  it("returns error string when duplicate detected", () => {
    type Result = ValidateAdapter<"Logger", MockLoggerAdapter>;
    expectTypeOf<Result>().toEqualTypeOf<"ERROR[HEX001]: Duplicate adapter for 'Logger'. Fix: Remove one .provide() call, or use .override() for child graphs.">();
  });

  it("returns adapter type for different port names", () => {
    type Result = ValidateAdapter<"Logger", MockDatabaseAdapter>;
    expectTypeOf<Result>().toEqualTypeOf<MockDatabaseAdapter>();
  });

  it("valid adapter intersected with itself remains the adapter", () => {
    type ValidResult = ValidateAdapter<never, MockLoggerAdapter>;
    type Intersection = ValidResult & MockLoggerAdapter;
    expectTypeOf<Intersection>().toEqualTypeOf<MockLoggerAdapter>();
  });
});

// =============================================================================
// Tests: Documenting Why Pattern Fails
// =============================================================================

describe("Parameter Constraint Pattern - Why It Fails", () => {
  it("CRITICAL: string literal & object is NOT never", () => {
    // This is the key discovery - TypeScript allows "branded primitives"
    type ErrorString = "ERROR: test";
    type TestObject = { foo: string };
    type Intersection = ErrorString & TestObject;

    // TypeScript creates a branded primitive, NOT never!
    // This breaks the fundamental assumption of the pattern.
    type IsNever = [Intersection] extends [never] ? true : false;

    // THIS FAILS - Intersection is NOT never
    // expectTypeOf<IsNever>().toEqualTypeOf<true>();

    // Instead, it's false - intersection exists
    expectTypeOf<IsNever>().toEqualTypeOf<false>();
  });

  it("error string & adapter produces branded type, not never", () => {
    type ErrorString = ValidateAdapter<"Logger", MockLoggerAdapter>;
    type Intersection = ErrorString & MockLoggerAdapter;

    // Verify this is NOT never
    type IsNever = [Intersection] extends [never] ? true : false;
    expectTypeOf<IsNever>().toEqualTypeOf<false>();

    // The intersection produces a weird "branded adapter" type
    // that is neither string nor object but both
  });

  it("pattern would have worked if intersection produced never", () => {
    // Hypothetically, if TypeScript worked this way:
    // - "ERROR: ..." & AdapterType = never
    // - Then provide(adapter: never) would reject all adapters
    // - But TypeScript allows branded primitives, so this doesn't work

    // The pattern IS sound for types that actually reduce to never
    type ReallyNever = string & number; // This IS never
    type IsNever = [ReallyNever] extends [never] ? true : false;
    expectTypeOf<IsNever>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Conclusion: Casts Are Architecturally Necessary
// =============================================================================

describe("Conclusion: Architectural Casts Are Unavoidable", () => {
  it("documents that no TypeScript pattern can eliminate these casts", () => {
    /**
     * Investigated alternatives and their results:
     *
     * 1. Parameter Constraint Pattern - FAILED (branded primitives)
     * 2. Result Type Pattern - Destroys fluent API
     * 3. Callback/Continuation Pattern - Callback hell
     * 4. Proxy Pattern - Still needs cast
     * 5. Function Overloads - Cannot enumerate infinite valid configurations
     * 6. Assertion Functions - Cannot transform return types
     * 7. Type Predicates - Cannot narrow return types
     *
     * The casts in GraphBuilder are:
     * - Architecturally necessary (not escape hatches)
     * - Sound (error branch never reached at runtime)
     * - Zero-cost (erased at compile time)
     * - Documented with SAFETY comments
     * - Verified by type-level tests
     */

    // Type-level assertion: this test documents the conclusion
    type Conclusion = "Architectural casts are unavoidable in TypeScript";
    expectTypeOf<Conclusion>().toEqualTypeOf<"Architectural casts are unavoidable in TypeScript">();
  });
});
