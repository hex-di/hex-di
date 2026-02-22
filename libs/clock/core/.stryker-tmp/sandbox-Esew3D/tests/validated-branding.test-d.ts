/**
 * Validated branding utilities type-level tests — DoD 37
 */
// @ts-nocheck


import { describe, it, expectTypeOf } from "vitest";
import {
  asMonotonicValidated,
  asWallClockValidated,
  asHighResValidated,
  createBrandingValidationError,
} from "../src/branded.js";
import type {
  MonotonicTimestamp,
  WallClockTimestamp,
  HighResTimestamp,
  BrandingValidationError,
} from "../src/branded.js";
import type { Result } from "@hex-di/result";

// =============================================================================
// DoD 37: Validated Branding Utilities — type-level
// =============================================================================

describe("Validated branding function signatures", () => {
  it("asMonotonicValidated accepts number and returns Result<MonotonicTimestamp, BrandingValidationError>", () => {
    expectTypeOf(asMonotonicValidated).parameter(0).toEqualTypeOf<number>();
    expectTypeOf(asMonotonicValidated).returns.toMatchTypeOf<
      Result<MonotonicTimestamp, BrandingValidationError>
    >();
  });

  it("asWallClockValidated accepts number and returns Result<WallClockTimestamp, BrandingValidationError>", () => {
    expectTypeOf(asWallClockValidated).parameter(0).toEqualTypeOf<number>();
    expectTypeOf(asWallClockValidated).returns.toMatchTypeOf<
      Result<WallClockTimestamp, BrandingValidationError>
    >();
  });

  it("asHighResValidated accepts number and returns Result<HighResTimestamp, BrandingValidationError>", () => {
    expectTypeOf(asHighResValidated).parameter(0).toEqualTypeOf<number>();
    expectTypeOf(asHighResValidated).returns.toMatchTypeOf<
      Result<HighResTimestamp, BrandingValidationError>
    >();
  });
});

describe("BrandingValidationError type structure", () => {
  it("BrandingValidationError has readonly _tag: 'BrandingValidationError'", () => {
    expectTypeOf<BrandingValidationError>()
      .toHaveProperty("_tag")
      .toEqualTypeOf<"BrandingValidationError">();
  });

  it("BrandingValidationError has readonly expectedDomain field", () => {
    expectTypeOf<BrandingValidationError>()
      .toHaveProperty("expectedDomain")
      .toEqualTypeOf<"monotonic" | "wallClock" | "highRes">();
  });

  it("BrandingValidationError.expectedDomain is 'monotonic' | 'wallClock' | 'highRes'", () => {
    type Domain = BrandingValidationError["expectedDomain"];
    expectTypeOf<Domain>().toEqualTypeOf<"monotonic" | "wallClock" | "highRes">();
  });

  it("BrandingValidationError has readonly value: number", () => {
    expectTypeOf<BrandingValidationError>().toHaveProperty("value").toEqualTypeOf<number>();
  });

  it("BrandingValidationError has readonly message: string", () => {
    expectTypeOf<BrandingValidationError>()
      .toHaveProperty("message")
      .toEqualTypeOf<string>();
  });
});

describe("createBrandingValidationError type signature", () => {
  it("createBrandingValidationError accepts (expectedDomain, value, message) and returns BrandingValidationError", () => {
    expectTypeOf(createBrandingValidationError).parameter(0).toMatchTypeOf<
      "monotonic" | "wallClock" | "highRes"
    >();
    expectTypeOf(createBrandingValidationError).parameter(1).toEqualTypeOf<number>();
    expectTypeOf(createBrandingValidationError).parameter(2).toEqualTypeOf<string>();
    expectTypeOf(createBrandingValidationError).returns.toEqualTypeOf<BrandingValidationError>();
  });
});
