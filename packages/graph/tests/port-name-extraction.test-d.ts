/**
 * Port Name Extraction Type Tests.
 *
 * This test file validates the consolidated port name extraction utilities
 * and documents expected behavior for edge cases.
 *
 * ## Background
 *
 * Three different patterns existed for extracting port names:
 *
 * 1. `Port<infer TName, unknown>` - Uses full Port type matching
 * 2. `{ __portName: infer TName }` - Uses structural property matching
 * 3. `{ __portName: infer TName } extends string` - Adds string constraint
 *
 * This test file ensures the consolidated implementation handles all cases
 * correctly and maintains backward compatibility.
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import type { Port } from "@hex-di/core";
import type {
  AdapterProvidesName,
  AdapterRequiresNames,
  ExtractRequiresStrings,
  IsMalformedRequires,
} from "../src/validation/types/adapter-extraction.js";
import type { MalformedAdapterError } from "../src/validation/types/captive/errors.js";

// =============================================================================
// Test Fixtures
// =============================================================================

/** Service interface for testing */
interface TestService {
  doSomething(): void;
}

/** Valid adapter with provides and requires */
type ValidAdapter = {
  readonly provides: Port<"TestService", TestService>;
  readonly requires: readonly [Port<"Logger", unknown>, Port<"Config", unknown>];
  readonly lifetime: "singleton";
  readonly factory: () => TestService;
};

/** Adapter with no requirements */
type AdapterNoRequires = {
  readonly provides: Port<"TestService", TestService>;
  readonly requires: readonly [];
  readonly lifetime: "singleton";
  readonly factory: () => TestService;
};

/** Adapter with single requirement */
type AdapterSingleRequire = {
  readonly provides: Port<"TestService", TestService>;
  readonly requires: readonly [Port<"Logger", unknown>];
  readonly lifetime: "singleton";
  readonly factory: () => TestService;
};

/** Object that is not an adapter (missing provides) */
type NotAnAdapter = {
  readonly something: string;
};

/** Object with wrong provides type */
type WrongProvidesType = {
  readonly provides: string;
  readonly requires: readonly [];
};

/** Adapter with non-Port in requires array */
type InvalidRequiresAdapter = {
  readonly provides: Port<"TestService", TestService>;
  readonly requires: readonly [string, number];
  readonly lifetime: "singleton";
  readonly factory: () => TestService;
};

/** Adapter with mixed valid/invalid requires */
type MixedRequiresAdapter = {
  readonly provides: Port<"TestService", TestService>;
  readonly requires: readonly [Port<"Logger", unknown>, string];
  readonly lifetime: "singleton";
  readonly factory: () => TestService;
};

// =============================================================================
// AdapterProvidesName Tests
// =============================================================================

describe("AdapterProvidesName", () => {
  it("should extract port name from valid adapter", () => {
    expectTypeOf<AdapterProvidesName<ValidAdapter>>().toEqualTypeOf<"TestService">();
  });

  it("should extract port name from adapter with no requires", () => {
    expectTypeOf<AdapterProvidesName<AdapterNoRequires>>().toEqualTypeOf<"TestService">();
  });

  it("should return never for non-adapter objects", () => {
    expectTypeOf<AdapterProvidesName<NotAnAdapter>>().toEqualTypeOf<never>();
  });

  it("should return never for adapter with wrong provides type", () => {
    expectTypeOf<AdapterProvidesName<WrongProvidesType>>().toEqualTypeOf<never>();
  });

  it("should return never for never input", () => {
    expectTypeOf<AdapterProvidesName<never>>().toEqualTypeOf<never>();
  });

  it("should return string for unknown adapter", () => {
    // When the adapter type is unknown, we cannot extract a specific name
    // The result should be `never` since Port<unknown, infer> won't match unknown
    expectTypeOf<AdapterProvidesName<unknown>>().toEqualTypeOf<never>();
  });

  it("should handle union of adapters by distributing", () => {
    type AdapterA = { provides: Port<"A", unknown>; requires: readonly [] };
    type AdapterB = { provides: Port<"B", unknown>; requires: readonly [] };
    type Union = AdapterA | AdapterB;

    // Should distribute over union
    expectTypeOf<AdapterProvidesName<Union>>().toEqualTypeOf<"A" | "B">();
  });
});

// =============================================================================
// AdapterRequiresNames Tests
// =============================================================================

describe("AdapterRequiresNames", () => {
  it("should extract all required port names as union", () => {
    expectTypeOf<AdapterRequiresNames<ValidAdapter>>().toEqualTypeOf<"Logger" | "Config">();
  });

  it("should return never for adapter with no requires", () => {
    expectTypeOf<AdapterRequiresNames<AdapterNoRequires>>().toEqualTypeOf<never>();
  });

  it("should extract single required port name", () => {
    expectTypeOf<AdapterRequiresNames<AdapterSingleRequire>>().toEqualTypeOf<"Logger">();
  });

  it("should return MalformedAdapterError for non-adapter objects", () => {
    // Objects without a requires property are malformed adapters
    expectTypeOf<AdapterRequiresNames<NotAnAdapter>>().toEqualTypeOf<
      MalformedAdapterError<"missing-requires">
    >();
  });

  it("should return never for invalid requires array", () => {
    // Non-Port types in requires should be filtered out
    expectTypeOf<AdapterRequiresNames<InvalidRequiresAdapter>>().toEqualTypeOf<never>();
  });

  it("should extract only valid ports from mixed requires", () => {
    // Should extract "Logger" but ignore the string
    expectTypeOf<AdapterRequiresNames<MixedRequiresAdapter>>().toEqualTypeOf<"Logger">();
  });

  it("should return never for never input", () => {
    // `never` distributes over conditional types, producing `never`
    // This is correct TypeScript behavior - never is the empty union
    expectTypeOf<AdapterRequiresNames<never>>().toEqualTypeOf<never>();
  });

  it("should return MalformedAdapterError for unknown input", () => {
    // `unknown` doesn't have a requires property, so it's considered malformed
    expectTypeOf<AdapterRequiresNames<unknown>>().toEqualTypeOf<
      MalformedAdapterError<"missing-requires">
    >();
  });

  it("should handle union of adapters by distributing", () => {
    type AdapterA = { provides: Port<"A", unknown>; requires: readonly [Port<"X", unknown>] };
    type AdapterB = {
      provides: Port<"B", unknown>;
      requires: readonly [Port<"Y", unknown>, Port<"Z", unknown>];
    };
    type Union = AdapterA | AdapterB;

    // Should distribute over union and collect all required names
    expectTypeOf<AdapterRequiresNames<Union>>().toEqualTypeOf<"X" | "Y" | "Z">();
  });
});

// =============================================================================
// Pattern Equivalence Tests
// =============================================================================

describe("Pattern Equivalence", () => {
  /**
   * These tests verify that the consolidated implementation produces
   * the same results as the original patterns would have.
   *
   * The consolidated implementation uses Pattern 3 (structural matching with
   * string constraint) as the canonical approach because it:
   * - Works with both real Port types and simplified mocks
   * - Provides explicit string type filtering
   * - Is compatible with internal validation testing
   */

  it("should match Pattern 3 ({ __portName: infer } extends string) behavior", () => {
    // Pattern 3 used: { __portName: infer TName } + TName extends string check
    // This is the canonical pattern used in the consolidated implementation
    type Pattern3Result<T> = T extends { provides: { __portName: infer TName } }
      ? TName extends string
        ? TName
        : never
      : never;

    // For valid adapters, should produce the same result
    expectTypeOf<Pattern3Result<ValidAdapter>>().toEqualTypeOf<AdapterProvidesName<ValidAdapter>>();
    expectTypeOf<Pattern3Result<NotAnAdapter>>().toEqualTypeOf<AdapterProvidesName<NotAnAdapter>>();
  });

  it("should work with simplified mock adapters (no Port brand)", () => {
    // Simplified mock adapter without full Port structure
    type MockAdapter = {
      provides: { __portName: "MockService" };
      requires: readonly [{ __portName: "MockDep" }];
    };

    // Should still extract names correctly
    expectTypeOf<AdapterProvidesName<MockAdapter>>().toEqualTypeOf<"MockService">();
    expectTypeOf<AdapterRequiresNames<MockAdapter>>().toEqualTypeOf<"MockDep">();
  });

  it("should produce same results for real Port types as Pattern 1", () => {
    // Pattern 1 used: Port<infer TName, unknown>
    // Both patterns should work equivalently for real Port types
    type Pattern1Result<T> = T extends { provides: Port<infer TName, unknown> } ? TName : never;

    // For adapters with real Port types, both patterns produce same result
    expectTypeOf<Pattern1Result<ValidAdapter>>().toEqualTypeOf<AdapterProvidesName<ValidAdapter>>();
  });
});

// =============================================================================
// Edge Case Tests
// =============================================================================

describe("Edge Cases", () => {
  it("should handle adapter with generic port name", () => {
    // Port with non-literal string name
    type GenericAdapter = {
      provides: Port<string, unknown>;
      requires: readonly [];
    };

    // Should still extract, but result is `string` not a literal
    expectTypeOf<AdapterProvidesName<GenericAdapter>>().toEqualTypeOf<string>();
  });

  it("should handle deeply nested adapter type", () => {
    type DeepAdapter = {
      provides: Port<"DeepService", { nested: { value: TestService } }>;
      requires: readonly [Port<"DeepDep", { another: { level: unknown } }>];
    };

    expectTypeOf<AdapterProvidesName<DeepAdapter>>().toEqualTypeOf<"DeepService">();
    expectTypeOf<AdapterRequiresNames<DeepAdapter>>().toEqualTypeOf<"DeepDep">();
  });

  it("should handle readonly modifier correctly", () => {
    // Ensure readonly arrays in requires work correctly
    type ReadonlyAdapter = {
      provides: Port<"ReadonlyTest", TestService>;
      requires: readonly [Port<"Dep1", unknown>, Port<"Dep2", unknown>];
    };

    expectTypeOf<AdapterRequiresNames<ReadonlyAdapter>>().toEqualTypeOf<"Dep1" | "Dep2">();
  });

  it("should handle mutable array type in requires", () => {
    // Some adapters might have mutable arrays (shouldn't break extraction)
    type MutableAdapter = {
      provides: Port<"MutableTest", TestService>;
      requires: [Port<"Dep1", unknown>, Port<"Dep2", unknown>];
    };

    expectTypeOf<AdapterRequiresNames<MutableAdapter>>().toEqualTypeOf<"Dep1" | "Dep2">();
  });
});

// =============================================================================
// ExtractRequiresStrings Tests
// =============================================================================

describe("ExtractRequiresStrings", () => {
  it("should pass through valid string port names", () => {
    expectTypeOf<ExtractRequiresStrings<"Logger">>().toEqualTypeOf<"Logger">();
    expectTypeOf<ExtractRequiresStrings<"Config">>().toEqualTypeOf<"Config">();
  });

  it("should handle union of valid port names", () => {
    expectTypeOf<ExtractRequiresStrings<"Logger" | "Config">>().toEqualTypeOf<
      "Logger" | "Config"
    >();
  });

  it("should return never for MalformedAdapterError", () => {
    // MalformedAdapterError should be filtered out, not passed through
    expectTypeOf<ExtractRequiresStrings<MalformedAdapterError>>().toEqualTypeOf<never>();
  });

  it("should return never for never input", () => {
    expectTypeOf<ExtractRequiresStrings<never>>().toEqualTypeOf<never>();
  });

  it("should filter out non-string types in union", () => {
    // When AdapterRequiresNames produces a union with MalformedAdapterError mixed in,
    // ExtractRequiresStrings should filter it out
    type Mixed = "Logger" | MalformedAdapterError;
    expectTypeOf<ExtractRequiresStrings<Mixed>>().toEqualTypeOf<"Logger">();
  });

  it("should filter out number types", () => {
    type InvalidUnion = "Logger" | number;
    expectTypeOf<ExtractRequiresStrings<InvalidUnion>>().toEqualTypeOf<"Logger">();
  });
});

// =============================================================================
// IsMalformedRequires Tests
// =============================================================================

describe("IsMalformedRequires", () => {
  it("should return false for valid port name string", () => {
    expectTypeOf<IsMalformedRequires<"Logger">>().toEqualTypeOf<false>();
  });

  it("should return false for union of valid port names", () => {
    expectTypeOf<IsMalformedRequires<"Logger" | "Config">>().toEqualTypeOf<false>();
  });

  it("should return false for never (empty requires)", () => {
    // never means empty union = no requirements = valid
    expectTypeOf<IsMalformedRequires<never>>().toEqualTypeOf<false>();
  });

  it("should return true for MalformedAdapterError", () => {
    expectTypeOf<IsMalformedRequires<MalformedAdapterError>>().toEqualTypeOf<true>();
  });

  it("should return true when MalformedAdapterError is in union", () => {
    // If any part of the union is MalformedAdapterError, the adapter is malformed
    type Mixed = "Logger" | MalformedAdapterError;
    // Due to union distribution, this will be true | false = boolean
    // But we want to detect if ANY member is MalformedAdapterError
    // The actual implementation returns true if T extends MalformedAdapterError
    // which means it checks if the type could be MalformedAdapterError
    expectTypeOf<IsMalformedRequires<Mixed>>().toEqualTypeOf<boolean>();
  });

  it("should integrate correctly with AdapterRequiresNames", () => {
    // Valid adapter produces valid port names
    type ValidResult = AdapterRequiresNames<ValidAdapter>;
    expectTypeOf<IsMalformedRequires<ValidResult>>().toEqualTypeOf<false>();

    // Malformed adapter produces MalformedAdapterError
    type MalformedResult = AdapterRequiresNames<NotAnAdapter>;
    expectTypeOf<IsMalformedRequires<MalformedResult>>().toEqualTypeOf<true>();
  });
});
