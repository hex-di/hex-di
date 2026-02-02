/**
 * Test: AdapterRequiresNames Soundness
 *
 * This test verifies that AdapterRequiresNames properly distinguishes between:
 * 1. Valid adapters with no requirements (should return `never`)
 * 2. Malformed adapters (should return `MalformedAdapterError`)
 *
 * ## Issue
 * Currently, `AdapterRequiresNames` returns `never` for BOTH cases:
 * - `{ requires: [] }` → `never` (correct: no dependencies)
 * - `{ provides: P }` (no requires property) → `never` (incorrect: should error)
 * - `{ requires: [invalid] }` → `never` (ambiguous: all filtered vs malformed)
 *
 * This ambiguity can cause silent failures in type-level validation.
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import { port } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import type { AdapterRequiresNames } from "../src/validation/types/adapter-extraction.js";
import type { MalformedAdapterError } from "../src/validation/types/captive/errors.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface ServiceA {
  doA(): void;
}
interface ServiceB {
  doB(): void;
}

const PortA = port<ServiceA>()({ name: "PortA" });
const PortB = port<ServiceB>()({ name: "PortB" });

// Valid adapter with no requirements
const NoRequiresAdapter = createAdapter({
  provides: PortA,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ doA: () => {} }),
});

// Valid adapter with requirements
const WithRequiresAdapter = createAdapter({
  provides: PortA,
  requires: [PortB],
  lifetime: "singleton",
  factory: _deps => ({ doA: () => {} }),
});

// =============================================================================
// Current Behavior Tests (Document existing behavior)
// =============================================================================

describe("AdapterRequiresNames current behavior", () => {
  it("returns never for valid adapter with no requirements", () => {
    type Result = AdapterRequiresNames<typeof NoRequiresAdapter>;

    // This is CORRECT behavior - empty requirements = never
    expectTypeOf<Result>().toEqualTypeOf<never>();
  });

  it("returns port names for valid adapter with requirements", () => {
    type Result = AdapterRequiresNames<typeof WithRequiresAdapter>;

    // Should return the port name
    expectTypeOf<Result>().toEqualTypeOf<"PortB">();
  });

  it("returns MalformedAdapterError for malformed adapter without requires property", () => {
    // Malformed adapter - missing requires property
    type MalformedNoRequires = {
      provides: typeof PortA;
      lifetime: "singleton";
      factory: () => ServiceA;
    };

    type Result = AdapterRequiresNames<MalformedNoRequires>;

    // FIXED: Now returns MalformedAdapterError to indicate structural issue
    expectTypeOf<Result>().toEqualTypeOf<MalformedAdapterError<"missing-requires">>();
  });

  it("returns never when all requires elements are invalid but array exists", () => {
    // Adapter with invalid requires elements (not Port types)
    // Note: The requires array EXISTS, so the adapter structure is valid.
    // The invalid elements are filtered out, resulting in `never`.
    type MalformedRequires = {
      provides: typeof PortA;
      requires: readonly [string, number]; // Invalid: should be Port types
      lifetime: "singleton";
      factory: () => ServiceA;
    };

    type Result = AdapterRequiresNames<MalformedRequires>;

    // Returns never because the requires array exists but no valid ports found
    // This is NOT a MalformedAdapterError because the structure is valid
    expectTypeOf<Result>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// Desired Behavior Tests (What we want after the fix)
// =============================================================================

describe("AdapterRequiresNames soundness - desired behavior", () => {
  it("should return never for valid adapter with empty requires array", () => {
    type Result = AdapterRequiresNames<typeof NoRequiresAdapter>;

    // Empty requirements = never (no ports required) - this is CORRECT
    expectTypeOf<Result>().toEqualTypeOf<never>();
  });

  it("should return MalformedAdapterError for adapter without requires property", () => {
    // Adapter missing the requires property entirely
    type MissingRequires = {
      provides: typeof PortA;
      lifetime: "singleton";
      factory: () => ServiceA;
    };

    type Result = AdapterRequiresNames<MissingRequires>;

    // DESIRED: Should return MalformedAdapterError to indicate structural issue
    expectTypeOf<Result>().toEqualTypeOf<MalformedAdapterError<"missing-requires">>();
  });

  it("should return MalformedAdapterError for completely invalid type", () => {
    // Not an adapter at all
    type NotAnAdapter = { foo: string };

    type Result = AdapterRequiresNames<NotAnAdapter>;

    // DESIRED: Should return MalformedAdapterError
    expectTypeOf<Result>().toEqualTypeOf<MalformedAdapterError<"missing-requires">>();
  });

  it("should still extract valid port names even with some invalid elements", () => {
    // Mixed valid and invalid requires - keep filtering behavior for valid elements
    type MixedRequires = {
      provides: typeof PortA;
      requires: readonly [typeof PortB, string]; // PortB valid, string invalid
      lifetime: "singleton";
      factory: () => ServiceA;
    };

    type Result = AdapterRequiresNames<MixedRequires>;

    // Should extract valid port name, filter invalid
    expectTypeOf<Result>().toEqualTypeOf<"PortB">();
  });
});
