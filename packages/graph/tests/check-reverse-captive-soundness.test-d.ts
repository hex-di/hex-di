/**
 * Type-level tests for CheckReverseCaptive soundness.
 *
 * These tests verify that CheckReverseCaptive correctly handles edge cases:
 * 1. Normal operation with valid lifetime levels
 * 2. Forward references (port not in map) return `never`
 * 3. Edge case: what if GetLifetimeLevel returns unexpected types?
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import type {
  GetLifetimeLevel,
  AddLifetime,
  FindReverseCaptiveDependency,
} from "../src/advanced.js";

// =============================================================================
// GetLifetimeLevel Behavior Tests
// =============================================================================

describe("GetLifetimeLevel return value guarantees", () => {
  it("returns specific number for valid port", () => {
    type Map = AddLifetime<{}, "Logger", "singleton">;
    type Level = GetLifetimeLevel<Map, "Logger">;
    expectTypeOf<Level>().toEqualTypeOf<1>();
  });

  it("returns never for port not in map", () => {
    type Map = AddLifetime<{}, "Logger", "singleton">;
    type Level = GetLifetimeLevel<Map, "NotInMap">;
    expectTypeOf<Level>().toEqualTypeOf<never>();
  });

  it("returns never for empty map", () => {
    type Level = GetLifetimeLevel<{}, "AnyPort">;
    expectTypeOf<Level>().toEqualTypeOf<never>();
  });

  // Edge case: what if the map has an unknown value?
  it("returns never when map value is not a number", () => {
    type BadMap = { Logger: "not-a-number" };
    type Level = GetLifetimeLevel<BadMap, "Logger">;
    expectTypeOf<Level>().toEqualTypeOf<never>();
  });

  it("returns never when map value is unknown", () => {
    type UnknownMap = { Logger: unknown };
    type Level = GetLifetimeLevel<UnknownMap, "Logger">;
    expectTypeOf<Level>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// FindReverseCaptiveDependency Soundness Tests
// =============================================================================

describe("FindReverseCaptiveDependency soundness", () => {
  // Normal operation: existing singleton requires new scoped port
  it("detects reverse captive when singleton requires new scoped", () => {
    // Existing: Singleton Cache requires "Session" (forward ref at the time)
    type ExistingMap = AddLifetime<{}, "Cache", "singleton">;
    type ExistingDepGraph = { Cache: "Session" }; // Cache requires Session

    // Now adding: Scoped Session
    // Note: FindReverseCaptiveDependency<TDepGraph, TLifetimeMap, TNewPortName, TNewPortLevel>
    type Result = FindReverseCaptiveDependency<
      ExistingDepGraph, // Dependency graph first
      ExistingMap, // Lifetime map second
      "Session", // New port being added
      2 // Scoped level
    >;

    // Should find that Cache (singleton) would capture Session (scoped)
    expectTypeOf<Result>().toEqualTypeOf<"Cache">();
  });

  // Normal operation: no reverse captive when lifetimes are compatible
  it("returns never when lifetimes are compatible", () => {
    // Existing: Scoped Cache requires "Logger"
    type ExistingMap = AddLifetime<{}, "Cache", "scoped">;
    type ExistingDepGraph = { Cache: "Logger" };

    // Adding: Singleton Logger (longer-lived, OK to depend on)
    type Result = FindReverseCaptiveDependency<
      ExistingDepGraph,
      ExistingMap,
      "Logger",
      1 // Singleton level
    >;

    expectTypeOf<Result>().toEqualTypeOf<never>();
  });

  // Edge case: dependent port not in lifetime map (forward reference)
  it("returns never for forward reference dependents", () => {
    // Empty lifetime map - no ports registered yet
    type ExistingDepGraph = { Unknown: "NewPort" };

    type Result = FindReverseCaptiveDependency<
      ExistingDepGraph,
      {}, // Empty lifetime map
      "NewPort",
      2
    >;

    // Forward reference - should return never (deferred validation)
    expectTypeOf<Result>().toEqualTypeOf<never>();
  });

  // Edge case: malformed lifetime map with unknown value
  it("returns never for malformed lifetime map values", () => {
    type BadMap = { Cache: unknown }; // Invalid level
    type ExistingDepGraph = { Cache: "Session" };

    type Result = FindReverseCaptiveDependency<ExistingDepGraph, BadMap, "Session", 2>;

    // GetLifetimeLevel returns never for unknown, so no captive detected
    // This is the "silent failure" the expert identified
    expectTypeOf<Result>().toEqualTypeOf<never>();
  });
});
