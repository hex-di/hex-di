/**
 * Type-level tests for ForwardReferenceMarker.
 *
 * When an adapter references a port that hasn't been registered yet,
 * captive detection can't validate the lifetime relationship. Previously
 * this returned silent `never`. Now we use ForwardReferenceMarker to
 * make this case explicit and debuggable.
 *
 * ## Why ForwardReferenceMarker?
 *
 * Consider: Singleton A requires Scoped B, but B isn't registered yet.
 * - Before: `FindCaptiveDependency` returns `never` (indistinguishable from "no error")
 * - After: Returns `ForwardReferenceMarker<"B">` (explicitly marks the forward ref)
 *
 * This helps with:
 * 1. **Debugging**: Developers can see which ports are forward references
 * 2. **Tooling**: IDE tooltips can show forward reference status
 * 3. **Testing**: Tests can verify forward reference detection behavior
 */

import { describe, expectTypeOf, it } from "vitest";
import type {
  FindCaptiveDependency,
  ForwardReferenceMarker,
  IsForwardReference,
} from "../src/validation/types/captive/index.js";

// =============================================================================
// ForwardReferenceMarker Type Tests
// =============================================================================

describe("ForwardReferenceMarker type", () => {
  it("should be a branded type with port name", () => {
    // ForwardReferenceMarker should carry the port name it refers to
    type Marker = ForwardReferenceMarker<"MyPort">;
    // Check that it has a portName property with the correct type
    expectTypeOf<Marker["portName"]>().toEqualTypeOf<"MyPort">();
  });

  it("should be distinguishable from string types", () => {
    // ForwardReferenceMarker should NOT be assignable to string
    type Marker = ForwardReferenceMarker<"MyPort">;
    type IsString = Marker extends string ? true : false;
    expectTypeOf<IsString>().toEqualTypeOf<false>();
  });

  it("should be distinguishable from never", () => {
    // ForwardReferenceMarker should NOT be `never`
    type Marker = ForwardReferenceMarker<"MyPort">;
    type IsNever = [Marker] extends [never] ? true : false;
    expectTypeOf<IsNever>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// IsForwardReference Type Guard Tests
// =============================================================================

describe("IsForwardReference type guard", () => {
  it("should return true for ForwardReferenceMarker", () => {
    type Result = IsForwardReference<ForwardReferenceMarker<"Port">>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("should return false for string", () => {
    type Result = IsForwardReference<"SomePort">;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("should return false for never", () => {
    type Result = IsForwardReference<never>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("should return false for union of strings", () => {
    type Result = IsForwardReference<"A" | "B">;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// FindCaptiveDependency Forward Reference Tests
// =============================================================================

describe("FindCaptiveDependency with forward references", () => {
  // Create a simple lifetime map for testing
  // Singleton = 1, Scoped = 2, Transient = 3
  type SingletonLifetimeMap = { Logger: 1 }; // Logger is singleton

  it("should return ForwardReferenceMarker when port is not in lifetime map", () => {
    // Check for captive: Singleton (level 1) depends on "UnknownPort"
    // Since UnknownPort is not in the map, this is a forward reference
    type Result = FindCaptiveDependency<SingletonLifetimeMap, 1, "UnknownPort">;

    // Should be a ForwardReferenceMarker, not never
    expectTypeOf<Result>().toMatchTypeOf<ForwardReferenceMarker<"UnknownPort">>();
  });

  it("should return port name when captive dependency found", () => {
    // Logger is singleton (level 1) in the map
    // If a singleton (level 1) depends on Logger (level 1), no captive
    // But if singleton depends on a scoped port, that's captive
    type ScopedMap = { ScopedService: 2 }; // Scoped = 2

    // Singleton (1) depending on Scoped (2) IS captive
    type Result = FindCaptiveDependency<ScopedMap, 1, "ScopedService">;
    expectTypeOf<Result>().toEqualTypeOf<"ScopedService">();
  });

  it("should return never when no captive dependency", () => {
    // Scoped (2) depending on Singleton (1) is NOT captive
    type Result = FindCaptiveDependency<SingletonLifetimeMap, 2, "Logger">;
    type IsNever = [Result] extends [never] ? true : false;
    expectTypeOf<IsNever>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Debug and Clarity Tests
// =============================================================================

describe("Forward reference debugging clarity", () => {
  it("should allow filtering forward references from real errors", () => {
    // When iterating over multiple requirements, we may get a mix of:
    // - ForwardReferenceMarker (for unknown ports)
    // - string (for captive ports)
    // - never (for valid ports)
    //
    // We should be able to filter these appropriately
    type MixedResults = ForwardReferenceMarker<"FuturePort"> | "CaptivePort" | never;

    // Filter to get only real errors (strings)
    type OnlyErrors = Exclude<MixedResults, ForwardReferenceMarker<string>>;
    expectTypeOf<OnlyErrors>().toEqualTypeOf<"CaptivePort">();

    // Filter to get only forward references
    type OnlyForwardRefs = Extract<MixedResults, ForwardReferenceMarker<string>>;
    expectTypeOf<OnlyForwardRefs>().toMatchTypeOf<ForwardReferenceMarker<"FuturePort">>();
  });
});

// =============================================================================
// Infer Pattern Leak Prevention Tests
// =============================================================================

describe("ForwardReferenceMarker infer pattern leak prevention", () => {
  /**
   * This test suite verifies that ForwardReferenceMarker cannot accidentally
   * "leak" through infer patterns in type-level code. The pattern used in
   * CheckAdapterCaptiveDependency and similar types correctly filters out
   * the marker.
   */

  // Example of how the internal code handles ForwardReferenceMarker
  type SafeInferPattern<TResult> = TResult extends infer R
    ? R extends string
      ? R // Only strings pass through
      : never // ForwardReferenceMarker is filtered
    : never;

  it("should filter ForwardReferenceMarker with extends string check", () => {
    // ForwardReferenceMarker is NOT a string, so it should be filtered
    type Result = SafeInferPattern<ForwardReferenceMarker<"Port">>;
    type IsNever = [Result] extends [never] ? true : false;
    expectTypeOf<IsNever>().toEqualTypeOf<true>();
  });

  it("should pass through actual string values", () => {
    type Result = SafeInferPattern<"CaptivePort">;
    expectTypeOf<Result>().toEqualTypeOf<"CaptivePort">();
  });

  it("should preserve never as never", () => {
    type Result = SafeInferPattern<never>;
    type IsNever = [Result] extends [never] ? true : false;
    expectTypeOf<IsNever>().toEqualTypeOf<true>();
  });

  it("should handle union of marker and string", () => {
    // Mixed result: marker | string should filter to just string
    type Mixed = ForwardReferenceMarker<"Forward"> | "Captive";
    type Result = SafeInferPattern<Mixed>;
    expectTypeOf<Result>().toEqualTypeOf<"Captive">();
  });

  it("should handle union of marker and never", () => {
    // Forward ref only: should become never
    type OnlyMarker = ForwardReferenceMarker<"Forward"> | never;
    type Result = SafeInferPattern<OnlyMarker>;
    type IsNever = [Result] extends [never] ? true : false;
    expectTypeOf<IsNever>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// FindAnyCaptiveDependency Filtering Tests
// =============================================================================

import type { FindAnyCaptiveDependency } from "../src/validation/types/captive/index.js";

describe("FindAnyCaptiveDependency filters ForwardReferenceMarker", () => {
  /**
   * FindAnyCaptiveDependency is the recommended wrapper around FindCaptiveDependency
   * that filters out ForwardReferenceMarker. This ensures that code using this
   * type only ever sees `never` (no captive) or a string (captive port name).
   */

  type SingletonMap = { Logger: 1 };
  type ScopedMap = { ScopedService: 2 };

  it("returns never for forward reference (not leaked marker)", () => {
    // Singleton depends on UnknownPort (not in map)
    // FindCaptiveDependency returns ForwardReferenceMarker
    // FindAnyCaptiveDependency filters it to never
    type Result = FindAnyCaptiveDependency<SingletonMap, 1, "UnknownPort">;
    type IsNever = [Result] extends [never] ? true : false;
    expectTypeOf<IsNever>().toEqualTypeOf<true>();
  });

  it("returns never for valid dependency (no captive)", () => {
    // Scoped depends on Singleton - valid, no captive
    type Result = FindAnyCaptiveDependency<SingletonMap, 2, "Logger">;
    type IsNever = [Result] extends [never] ? true : false;
    expectTypeOf<IsNever>().toEqualTypeOf<true>();
  });

  it("returns port name for captive dependency", () => {
    // Singleton depends on Scoped - captive!
    type Result = FindAnyCaptiveDependency<ScopedMap, 1, "ScopedService">;
    expectTypeOf<Result>().toEqualTypeOf<"ScopedService">();
  });

  it("handles union requirements with mixed results", () => {
    // Mix of forward ref and captive
    type MixedMap = { ScopedService: 2 }; // Only ScopedService known
    // Singleton depends on ScopedService (captive) and UnknownPort (forward ref)
    type Result = FindAnyCaptiveDependency<MixedMap, 1, "ScopedService" | "UnknownPort">;
    // Should return "ScopedService" (the captive), forward ref filtered
    expectTypeOf<Result>().toEqualTypeOf<"ScopedService">();
  });
});
