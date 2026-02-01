/**
 * Type tests for EmptyDependencyGraph and EmptyLifetimeMap invariants.
 *
 * This file verifies critical type invariants that protect against
 * refactoring mistakes. The empty types use a symbol-branded pattern:
 *
 * - EmptyDependencyGraph = { readonly [__emptyDepGraphBrand]?: never }
 * - EmptyLifetimeMap = { readonly [__emptyLifetimeMapBrand]?: never }
 *
 * This pattern:
 * 1. Avoids index signature pollution (unlike `Record<string, never>`)
 * 2. Is more restrictive than plain `object` (arbitrary objects are rejected)
 * 3. Preserves intersection behavior: `EmptyDependencyGraph & { A: "B" }` works
 * 4. Symbol keys are filtered by `Extract<keyof T, string>` (no keyof pollution!)
 *
 * @see src/builder/types/state.ts for the constraint documentation
 */
import { describe, it, expectTypeOf } from "vitest";
import type { EmptyDependencyGraph, EmptyLifetimeMap } from "../src/advanced.js";
import type { __emptyDepGraphBrand, __emptyLifetimeMapBrand } from "../src/builder/types/state.js";

// =============================================================================
// Test: EmptyDependencyGraph intersection behavior
// =============================================================================

describe("EmptyDependencyGraph intersection behavior", () => {
  it("intersection preserves property lookup", () => {
    // This is the CRITICAL invariant: when you intersect EmptyDependencyGraph
    // with specific properties, property lookup should return the property type
    type Graph = EmptyDependencyGraph & { A: "B" };
    type Lookup = Graph["A"];

    // If EmptyDependencyGraph were Record<string, never>, this would be `never`
    expectTypeOf<Lookup>().toEqualTypeOf<"B">();
  });

  it("intersection with multiple properties preserves all lookups", () => {
    type Graph = EmptyDependencyGraph & { A: "B"; C: "D"; E: "F" };

    expectTypeOf<Graph["A"]>().toEqualTypeOf<"B">();
    expectTypeOf<Graph["C"]>().toEqualTypeOf<"D">();
    expectTypeOf<Graph["E"]>().toEqualTypeOf<"F">();
  });

  it("nested intersections preserve property types", () => {
    type Graph1 = EmptyDependencyGraph & { A: "B" };
    type Graph2 = Graph1 & { C: "D" };

    expectTypeOf<Graph2["A"]>().toEqualTypeOf<"B">();
    expectTypeOf<Graph2["C"]>().toEqualTypeOf<"D">();
  });
});

// =============================================================================
// Test: EmptyLifetimeMap intersection behavior
// =============================================================================

describe("EmptyLifetimeMap intersection behavior", () => {
  it("intersection preserves property lookup", () => {
    // Same invariant as EmptyDependencyGraph
    type Map = EmptyLifetimeMap & { Logger: 1 };
    type Lookup = Map["Logger"];

    // If EmptyLifetimeMap were Record<string, never>, this would be `never`
    expectTypeOf<Lookup>().toEqualTypeOf<1>();
  });

  it("intersection with multiple properties preserves all lookups", () => {
    type Map = EmptyLifetimeMap & { Logger: 1; Database: 2; Cache: 3 };

    expectTypeOf<Map["Logger"]>().toEqualTypeOf<1>();
    expectTypeOf<Map["Database"]>().toEqualTypeOf<2>();
    expectTypeOf<Map["Cache"]>().toEqualTypeOf<3>();
  });

  it("nested intersections preserve property types", () => {
    type Map1 = EmptyLifetimeMap & { Logger: 1 };
    type Map2 = Map1 & { Database: 2 };

    expectTypeOf<Map2["Logger"]>().toEqualTypeOf<1>();
    expectTypeOf<Map2["Database"]>().toEqualTypeOf<2>();
  });
});

// =============================================================================
// Test: Demonstrates object type behavior
// =============================================================================

describe("demonstrates object type behavior", () => {
  it("shows object type preserves property types after intersection", () => {
    // Using `object` does NOT have an index signature
    // so intersection works correctly
    type CorrectEmpty = object;
    type CorrectGraph = CorrectEmpty & { A: "B" };
    type CorrectLookup = CorrectGraph["A"];

    // This documents the CORRECT behavior
    expectTypeOf<CorrectLookup>().toEqualTypeOf<"B">();
  });

  it("EmptyDependencyGraph behaves like object (not Record<string, never>)", () => {
    // The key invariant: EmptyDependencyGraph intersected with properties
    // should preserve those properties, not turn them into `never`
    type TestGraph = EmptyDependencyGraph & { Test: "Value" };

    // If EmptyDependencyGraph were Record<string, never>, this would fail
    // because the intersection would produce `never` for the property
    expectTypeOf<TestGraph["Test"]>().toEqualTypeOf<"Value">();
  });

  it("EmptyLifetimeMap behaves like object (not Record<string, number>)", () => {
    // Same invariant for EmptyLifetimeMap
    type TestMap = EmptyLifetimeMap & { Test: 42 };

    // Property lookup should return the specific type, not a wider type
    expectTypeOf<TestMap["Test"]>().toEqualTypeOf<42>();
  });
});

// =============================================================================
// Test: EmptyDependencyGraph and EmptyLifetimeMap are compatible with object
// =============================================================================

describe("Empty types are object-compatible", () => {
  it("EmptyDependencyGraph is assignable to object", () => {
    // This ensures we can use EmptyDependencyGraph where object is expected
    type IsAssignable = EmptyDependencyGraph extends object ? true : false;
    expectTypeOf<IsAssignable>().toEqualTypeOf<true>();
  });

  it("EmptyLifetimeMap is assignable to object", () => {
    // This ensures we can use EmptyLifetimeMap where object is expected
    type IsAssignable = EmptyLifetimeMap extends object ? true : false;
    expectTypeOf<IsAssignable>().toEqualTypeOf<true>();
  });

  it("Record<string, never> is assignable to EmptyDependencyGraph (edge case)", () => {
    // Record<string, never> IS assignable because:
    // 1. Our branded property is optional (__emptyDepGraph?: never)
    // 2. Record<string, never>'s index signature provides `never` for any key
    // This is an edge case we accept - the important thing is that arbitrary
    // objects with real properties are NOT assignable.
    type Empty = Record<string, never>;
    type IsAssignable = Empty extends EmptyDependencyGraph ? true : false;
    expectTypeOf<IsAssignable>().toEqualTypeOf<true>();
  });

  it("Record<string, never> is assignable to EmptyLifetimeMap (edge case)", () => {
    // Same reasoning as above
    type Empty = Record<string, never>;
    type IsAssignable = Empty extends EmptyLifetimeMap ? true : false;
    expectTypeOf<IsAssignable>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Test: EmptyDependencyGraph and EmptyLifetimeMap reject non-empty types
// =============================================================================

describe("Empty types are restrictive (branded)", () => {
  it("EmptyDependencyGraph rejects arbitrary object types", () => {
    // Arbitrary objects should NOT be assignable to EmptyDependencyGraph
    // This ensures the type is not overly permissive
    type Arbitrary = { foo: string };
    type IsAssignable = Arbitrary extends EmptyDependencyGraph ? true : false;
    expectTypeOf<IsAssignable>().toEqualTypeOf<false>();
  });

  it("symbol brand key is invisible to string keyof operations (FIX!)", () => {
    // With symbol branding, the phantom key does NOT pollute string keyof operations.
    // This is the key improvement over the previous string-branded pattern.
    type Keys = keyof EmptyDependencyGraph;

    // The brand key is a symbol (typeof __emptyDepGraphBrand), not a string.
    // Symbols don't show up in Extract<keyof T, string> operations.
    // We don't test the exact symbol type here, just verify it's not a string.
    type IsString = Keys extends string ? true : false;
    expectTypeOf<IsString>().toEqualTypeOf<false>();
  });

  it("keyof after intersection only includes real string properties", () => {
    // When intersected with real properties, ONLY the real keys appear in string keyof
    type Graph = EmptyDependencyGraph & { A: "B"; C: "D" };

    // Extract<keyof Graph, string> correctly filters out the symbol brand
    type StringKeys = Extract<keyof Graph, string>;
    expectTypeOf<StringKeys>().toEqualTypeOf<"A" | "C">();
  });

  it("property lookup still works correctly after fix", () => {
    // The symbol branding does NOT affect property lookup for real properties.
    // This is the critical invariant we preserve.
    type Graph = EmptyDependencyGraph & { A: "B" };

    // Real property lookup works correctly
    expectTypeOf<Graph["A"]>().toEqualTypeOf<"B">();
  });

  it("Extract<keyof, string> now correctly filters brand (THE FIX)", () => {
    // This is the key improvement: Extract<keyof, string> correctly filters
    // the symbol brand, returning ONLY the real string keys.
    type Graph = EmptyDependencyGraph & { A: "B"; C: "D" };
    type FilteredKeys = Extract<keyof Graph, string>;

    // Only real string keys, no phantom pollution!
    expectTypeOf<FilteredKeys>().toEqualTypeOf<"A" | "C">();
  });

  it("EmptyLifetimeMap rejects arbitrary object types", () => {
    // Arbitrary objects should NOT be assignable to EmptyLifetimeMap
    type Arbitrary = { foo: number };
    type IsAssignable = Arbitrary extends EmptyLifetimeMap ? true : false;
    expectTypeOf<IsAssignable>().toEqualTypeOf<false>();
  });

  it("EmptyDependencyGraph brand property uses symbol key", () => {
    // The branded type uses a symbol-keyed optional never property
    // This allows the empty object `{}` at runtime while being restrictive at type level
    type BrandProperty = EmptyDependencyGraph extends { readonly [__emptyDepGraphBrand]?: never }
      ? true
      : false;
    expectTypeOf<BrandProperty>().toEqualTypeOf<true>();
  });

  it("EmptyLifetimeMap brand property uses symbol key", () => {
    // Same pattern for EmptyLifetimeMap
    type BrandProperty = EmptyLifetimeMap extends { readonly [__emptyLifetimeMapBrand]?: never }
      ? true
      : false;
    expectTypeOf<BrandProperty>().toEqualTypeOf<true>();
  });
});
