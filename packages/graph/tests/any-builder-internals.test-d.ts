/**
 * Type-level tests for AnyBuilderInternals constraint.
 *
 * ## Problem (FIXED)
 *
 * `AnyBuilderInternals` used `unknown` for TDepGraph and TLifetimeMap, which allowed
 * invalid states like primitives (string, number) to be used as dependency graphs.
 *
 * ## Solution
 *
 * Use `object` instead of `unknown` for TDepGraph and TLifetimeMap to ensure only
 * object-like types (including branded empty types) are accepted.
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import type {
  AnyBuilderInternals,
  BuilderInternals,
  DefaultInternals,
  EmptyDependencyGraph,
  EmptyLifetimeMap,
  GetDepGraph,
  GetLifetimeMap,
  GetParentProvides,
  GetMaxDepth,
  GetUnsafeDepthOverride,
  GetDepthExceededWarning,
  GetUncheckedUsed,
  WithDepGraph,
  WithLifetimeMap,
  WithDepGraphAndLifetimeMap,
} from "../src/builder/types/state.js";

describe("AnyBuilderInternals constraint", () => {
  describe("accepts valid BuilderInternals", () => {
    it("should accept DefaultInternals", () => {
      type Extends = DefaultInternals extends AnyBuilderInternals ? true : false;
      expectTypeOf<Extends>().toEqualTypeOf<true>();
    });

    it("should accept BuilderInternals with object-like dep graph", () => {
      type Custom = BuilderInternals<
        EmptyDependencyGraph & { A: "B" | "C" },
        EmptyLifetimeMap & { A: "singleton" },
        unknown,
        50,
        false,
        never,
        false
      >;
      type Extends = Custom extends AnyBuilderInternals ? true : false;
      expectTypeOf<Extends>().toEqualTypeOf<true>();
    });

    it("should accept BuilderInternals with any maxDepth number", () => {
      type Custom = BuilderInternals<
        EmptyDependencyGraph,
        EmptyLifetimeMap,
        unknown,
        100, // Different maxDepth
        true, // unsafeDepthOverride enabled
        "DeepService", // depth warning recorded
        true // uncheckedUsed
      >;
      type Extends = Custom extends AnyBuilderInternals ? true : false;
      expectTypeOf<Extends>().toEqualTypeOf<true>();
    });
  });

  describe("rejects invalid types", () => {
    it("should reject primitive TDepGraph", () => {
      // This tests that using `object` instead of `unknown` prevents primitives
      type InvalidWithStringDepGraph = BuilderInternals<
        string, // Invalid: should be object-like
        EmptyLifetimeMap,
        unknown,
        50,
        false,
        never,
        false
      >;
      // With `object` constraint, this should NOT extend AnyBuilderInternals
      type Extends = InvalidWithStringDepGraph extends AnyBuilderInternals ? true : false;
      expectTypeOf<Extends>().toEqualTypeOf<false>();
    });

    it("should reject primitive TLifetimeMap", () => {
      type InvalidWithNumberLifetimeMap = BuilderInternals<
        EmptyDependencyGraph,
        number, // Invalid: should be object-like
        unknown,
        50,
        false,
        never,
        false
      >;
      // With `object` constraint, this should NOT extend AnyBuilderInternals
      type Extends = InvalidWithNumberLifetimeMap extends AnyBuilderInternals ? true : false;
      expectTypeOf<Extends>().toEqualTypeOf<false>();
    });
  });
});

// =============================================================================
// Get* Extractors - Indexed Access Tests
// =============================================================================

describe("Get* extractors using indexed access", () => {
  // Test fixture: a custom internals with known values
  type CustomInternals = BuilderInternals<
    { A: "B" | "C" }, // TDepGraph
    { A: 1; B: 2 }, // TLifetimeMap (numeric levels)
    "ParentPort", // TParentProvides
    100, // TMaxDepth
    true, // TUnsafeDepthOverride
    "DeepPort", // TDepthExceededWarning
    true // TUncheckedUsed
  >;

  describe("GetDepGraph", () => {
    it("extracts TDepGraph correctly", () => {
      type Result = GetDepGraph<CustomInternals>;
      expectTypeOf<Result>().toEqualTypeOf<{ A: "B" | "C" }>();
    });

    it("extracts EmptyDependencyGraph from DefaultInternals", () => {
      type Result = GetDepGraph<DefaultInternals>;
      expectTypeOf<Result>().toEqualTypeOf<EmptyDependencyGraph>();
    });
  });

  describe("GetLifetimeMap", () => {
    it("extracts TLifetimeMap correctly", () => {
      type Result = GetLifetimeMap<CustomInternals>;
      expectTypeOf<Result>().toEqualTypeOf<{ A: 1; B: 2 }>();
    });

    it("extracts EmptyLifetimeMap from DefaultInternals", () => {
      type Result = GetLifetimeMap<DefaultInternals>;
      expectTypeOf<Result>().toEqualTypeOf<EmptyLifetimeMap>();
    });
  });

  describe("GetParentProvides", () => {
    it("extracts TParentProvides correctly", () => {
      type Result = GetParentProvides<CustomInternals>;
      expectTypeOf<Result>().toEqualTypeOf<"ParentPort">();
    });

    it("extracts unknown from DefaultInternals", () => {
      type Result = GetParentProvides<DefaultInternals>;
      expectTypeOf<Result>().toEqualTypeOf<unknown>();
    });
  });

  describe("GetMaxDepth", () => {
    it("extracts TMaxDepth correctly", () => {
      type Result = GetMaxDepth<CustomInternals>;
      expectTypeOf<Result>().toEqualTypeOf<100>();
    });

    it("extracts 50 (DefaultMaxDepth) from DefaultInternals", () => {
      type Result = GetMaxDepth<DefaultInternals>;
      expectTypeOf<Result>().toEqualTypeOf<50>();
    });
  });

  describe("GetUnsafeDepthOverride", () => {
    it("extracts TUnsafeDepthOverride correctly", () => {
      type Result = GetUnsafeDepthOverride<CustomInternals>;
      expectTypeOf<Result>().toEqualTypeOf<true>();
    });

    it("extracts false from DefaultInternals", () => {
      type Result = GetUnsafeDepthOverride<DefaultInternals>;
      expectTypeOf<Result>().toEqualTypeOf<false>();
    });
  });

  describe("GetDepthExceededWarning", () => {
    it("extracts TDepthExceededWarning correctly", () => {
      type Result = GetDepthExceededWarning<CustomInternals>;
      expectTypeOf<Result>().toEqualTypeOf<"DeepPort">();
    });

    it("extracts never from DefaultInternals", () => {
      type Result = GetDepthExceededWarning<DefaultInternals>;
      expectTypeOf<Result>().toEqualTypeOf<never>();
    });
  });

  describe("GetUncheckedUsed", () => {
    it("extracts TUncheckedUsed correctly", () => {
      type Result = GetUncheckedUsed<CustomInternals>;
      expectTypeOf<Result>().toEqualTypeOf<true>();
    });

    it("extracts false from DefaultInternals", () => {
      type Result = GetUncheckedUsed<DefaultInternals>;
      expectTypeOf<Result>().toEqualTypeOf<false>();
    });
  });
});

// =============================================================================
// With* Transformers - Tests
// =============================================================================

describe("With* transformers", () => {
  describe("WithDepGraph", () => {
    it("updates only TDepGraph", () => {
      type Result = WithDepGraph<DefaultInternals, { X: "Y" }>;

      // DepGraph should be updated
      expectTypeOf<GetDepGraph<Result>>().toEqualTypeOf<{ X: "Y" }>();

      // Everything else should remain unchanged
      expectTypeOf<GetLifetimeMap<Result>>().toEqualTypeOf<EmptyLifetimeMap>();
      expectTypeOf<GetMaxDepth<Result>>().toEqualTypeOf<50>();
      expectTypeOf<GetUnsafeDepthOverride<Result>>().toEqualTypeOf<false>();
    });
  });

  describe("WithLifetimeMap", () => {
    it("updates only TLifetimeMap", () => {
      type Result = WithLifetimeMap<DefaultInternals, { X: 1 }>;

      // LifetimeMap should be updated
      expectTypeOf<GetLifetimeMap<Result>>().toEqualTypeOf<{ X: 1 }>();

      // Everything else should remain unchanged
      expectTypeOf<GetDepGraph<Result>>().toEqualTypeOf<EmptyDependencyGraph>();
      expectTypeOf<GetMaxDepth<Result>>().toEqualTypeOf<50>();
    });
  });

  describe("WithDepGraphAndLifetimeMap", () => {
    it("updates both TDepGraph and TLifetimeMap", () => {
      type Result = WithDepGraphAndLifetimeMap<DefaultInternals, { A: "B" }, { A: 1 }>;

      // Both should be updated
      expectTypeOf<GetDepGraph<Result>>().toEqualTypeOf<{ A: "B" }>();
      expectTypeOf<GetLifetimeMap<Result>>().toEqualTypeOf<{ A: 1 }>();

      // Everything else should remain unchanged
      expectTypeOf<GetMaxDepth<Result>>().toEqualTypeOf<50>();
      expectTypeOf<GetUnsafeDepthOverride<Result>>().toEqualTypeOf<false>();
    });
  });
});
