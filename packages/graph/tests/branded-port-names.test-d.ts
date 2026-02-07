/**
 * Type-level tests for branded port names.
 *
 * ## Problem (FIXED)
 *
 * Port names extracted via `AdapterProvidesName` and `AdapterRequiresNames` are
 * plain string literals. This allows accidental mixing with arbitrary strings
 * that happen to have the same value.
 *
 * ## Solution
 *
 * Added `BrandedPortName<T>` type that wraps port name strings with a phantom
 * brand, providing nominal typing. Also added branded variants of extraction
 * utilities:
 *
 * - `BrandedAdapterProvidesName<A>` - Returns `BrandedPortName<"...">` for valid adapters
 * - `BrandedAdapterRequiresNames<A>` - Returns union of `BrandedPortName<"...">` for dependencies
 *
 * The original `AdapterProvidesName` and `AdapterRequiresNames` still return
 * plain strings for backward compatibility.
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { port } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import type {
  AdapterProvidesName,
  BrandedAdapterProvidesName,
  BrandedAdapterRequiresNames,
  BrandedPortName,
  IsBrandedPortName,
} from "../src/validation/types/adapter-extraction.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const LoggerPort = port<{ log: () => void }>()({ name: "Logger" });
const DatabasePort = port<{ query: () => void }>()({ name: "Database" });

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort] as const,
  lifetime: "singleton",
  factory: () => ({ query: () => {} }),
});

// =============================================================================
// BrandedPortName Type Tests
// =============================================================================

describe("BrandedPortName nominal typing", () => {
  describe("distinguishes branded from unbranded", () => {
    it("should identify branded port names from BrandedAdapterProvidesName", () => {
      type Extracted = BrandedAdapterProvidesName<typeof LoggerAdapter>;

      // Extracted port name should be branded
      type IsBranded = IsBrandedPortName<Extracted>;
      expectTypeOf<IsBranded>().toEqualTypeOf<true>();
    });

    it("should identify plain strings as not branded", () => {
      // Plain string literal should NOT be branded
      type IsBranded = IsBrandedPortName<"Logger">;
      expectTypeOf<IsBranded>().toEqualTypeOf<false>();
    });

    it("should identify string type as not branded", () => {
      // Generic string should NOT be branded
      type IsBranded = IsBrandedPortName<string>;
      expectTypeOf<IsBranded>().toEqualTypeOf<false>();
    });

    it("original AdapterProvidesName still returns plain strings", () => {
      // Original extractor returns plain strings for compatibility
      type Extracted = AdapterProvidesName<typeof LoggerAdapter>;
      type IsBranded = IsBrandedPortName<Extracted>;
      expectTypeOf<IsBranded>().toEqualTypeOf<false>();

      // Can compare directly to string literal
      expectTypeOf<Extracted>().toEqualTypeOf<"Logger">();
    });
  });

  describe("preserves string value", () => {
    it("should preserve literal type in branded name", () => {
      type Extracted = BrandedAdapterProvidesName<typeof LoggerAdapter>;

      // Should still be assignable to "Logger" for comparison purposes
      type ValueMatches = Extracted extends "Logger" ? true : false;
      expectTypeOf<ValueMatches>().toEqualTypeOf<true>();
    });

    it("should work in unions", () => {
      type Names = BrandedAdapterProvidesName<typeof LoggerAdapter | typeof DatabaseAdapter>;

      // Union should preserve branding
      type IsBranded = IsBrandedPortName<Names>;
      expectTypeOf<IsBranded>().toEqualTypeOf<true>();

      // Union values should be correct
      type ContainsLogger = Names extends infer N ? (N extends "Logger" ? true : false) : false;
      type ContainsDatabase = Names extends infer N ? (N extends "Database" ? true : false) : false;
      expectTypeOf<ContainsLogger>().toEqualTypeOf<boolean>(); // Distributes to true | false
      expectTypeOf<ContainsDatabase>().toEqualTypeOf<boolean>();
    });
  });

  describe("BrandedAdapterRequiresNames also returns branded", () => {
    it("should return branded port names from requires", () => {
      type RequiredNames = BrandedAdapterRequiresNames<typeof DatabaseAdapter>;

      // Required port names should also be branded
      type IsBranded = IsBrandedPortName<RequiredNames>;
      expectTypeOf<IsBranded>().toEqualTypeOf<true>();

      // Value should still be correct
      type ValueMatches = RequiredNames extends "Logger" ? true : false;
      expectTypeOf<ValueMatches>().toEqualTypeOf<true>();
    });
  });
});

// =============================================================================
// Type Safety Tests
// =============================================================================

describe("Branded port names prevent accidental mixing", () => {
  it("BrandedPortName should be narrower than string", () => {
    // BrandedPortName<"A"> should be assignable to string
    type BrandedToString = BrandedPortName<"A"> extends string ? true : false;
    expectTypeOf<BrandedToString>().toEqualTypeOf<true>();

    // But string should NOT be assignable to BrandedPortName<"A">
    type StringToBranded = string extends BrandedPortName<"A"> ? true : false;
    expectTypeOf<StringToBranded>().toEqualTypeOf<false>();
  });

  it("unbranded string should not be assignable to branded position", () => {
    // This ensures type safety: only properly extracted port names can be used
    // in places that expect BrandedPortName

    // Two branded names with same value should be compatible
    type BrandedLogger1 = BrandedPortName<"Logger">;
    type BrandedLogger2 = BrandedPortName<"Logger">;
    type BrandedCompatible = BrandedLogger1 extends BrandedLogger2 ? true : false;
    expectTypeOf<BrandedCompatible>().toEqualTypeOf<true>();

    // But plain "Logger" should not be branded
    type PlainLoggerBranded = "Logger" extends BrandedPortName<"Logger"> ? true : false;
    expectTypeOf<PlainLoggerBranded>().toEqualTypeOf<false>();
  });

  it("BrandedPortName should be assignable to underlying literal", () => {
    // BrandedPortName<"Logger"> should be usable where "Logger" is expected
    // This ensures backwards compatibility with string comparisons
    type Assignable = BrandedPortName<"Logger"> extends "Logger" ? true : false;
    expectTypeOf<Assignable>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Comparison: Branded vs Unbranded Variants
// =============================================================================

describe("Comparison between branded and unbranded variants", () => {
  it("AdapterProvidesName returns plain string", () => {
    type Plain = AdapterProvidesName<typeof LoggerAdapter>;
    expectTypeOf<Plain>().toEqualTypeOf<"Logger">();
  });

  it("BrandedAdapterProvidesName returns branded type", () => {
    type Branded = BrandedAdapterProvidesName<typeof LoggerAdapter>;

    // Should extend string
    type ExtendsString = Branded extends string ? true : false;
    expectTypeOf<ExtendsString>().toEqualTypeOf<true>();

    // Should be branded
    type IsBranded = IsBrandedPortName<Branded>;
    expectTypeOf<IsBranded>().toEqualTypeOf<true>();

    // Should be compatible with the literal for comparisons
    type ExtendsLiteral = Branded extends "Logger" ? true : false;
    expectTypeOf<ExtendsLiteral>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Edge Cases (per TypeScript expert review)
// =============================================================================

describe("IsBrandedPortName edge cases", () => {
  it("should return false for unknown", () => {
    type Result = IsBrandedPortName<unknown>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("should return false for empty object", () => {
    type EmptyObj = Record<string, never>;
    type Result = IsBrandedPortName<EmptyObj>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("should return boolean for mixed branded/unbranded unions (distribution)", () => {
    // IsBrandedPortName distributes over unions:
    // IsBrandedPortName<BrandedPortName<"A"> | "B">
    // = IsBrandedPortName<BrandedPortName<"A">> | IsBrandedPortName<"B">
    // = true | false = boolean
    type Mixed = BrandedPortName<"A"> | "B";
    type Result = IsBrandedPortName<Mixed>;
    expectTypeOf<Result>().toEqualTypeOf<boolean>();
  });

  it("should return true for pure branded unions", () => {
    // When ALL members are branded, the result is true | true = true
    type PureBranded = BrandedPortName<"A"> | BrandedPortName<"B">;
    type Result = IsBrandedPortName<PureBranded>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("should return false for pure unbranded unions", () => {
    // When NO members are branded, the result is false | false = false
    type PureUnbranded = "A" | "B";
    type Result = IsBrandedPortName<PureUnbranded>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });
});
