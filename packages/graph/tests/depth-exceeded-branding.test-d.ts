/**
 * Type-level tests for DepthExceededResult branding.
 *
 * These tests verify that DepthExceededResult uses unique symbol branding
 * that cannot be accidentally assigned from other branded types.
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import type {
  DepthExceededResult,
  IsDepthExceeded,
} from "../src/validation/types/cycle/detection.js";

describe("DepthExceededResult branding", () => {
  describe("type discrimination", () => {
    it("should be recognized by IsDepthExceeded", () => {
      expectTypeOf<IsDepthExceeded<DepthExceededResult>>().toEqualTypeOf<true>();
    });

    it("should not match true", () => {
      expectTypeOf<IsDepthExceeded<true>>().toEqualTypeOf<false>();
    });

    it("should not match false", () => {
      expectTypeOf<IsDepthExceeded<false>>().toEqualTypeOf<false>();
    });

    it("should not match never", () => {
      // never extends anything, so this is expected to be false
      type Result = IsDepthExceeded<never>;
      expectTypeOf<Result>().toEqualTypeOf<never>();
    });
  });

  describe("unique symbol branding", () => {
    // This is the key test: generic branded objects should NOT match DepthExceededResult
    it("should not be assignable from generic branded objects", () => {
      // A generic branded object with __brand property
      type GenericBranded = { readonly __brand: "DepthExceeded" };

      // With unique symbol branding, this should NOT be assignable
      // If branding is weak (uses __brand), this would incorrectly pass
      // Test: GenericBranded should NOT extend DepthExceededResult
      type ShouldBeFalse = GenericBranded extends DepthExceededResult ? true : false;
      expectTypeOf<ShouldBeFalse>().toEqualTypeOf<false>();
    });

    it("should not match objects with different brand names", () => {
      type OtherBrand = { readonly __brand: "SomethingElse" };
      expectTypeOf<IsDepthExceeded<OtherBrand>>().toEqualTypeOf<false>();
    });

    it("should not match objects with same string brand through intersection", () => {
      // Even with intersection, a generic branded object shouldn't match
      type IntersectedBrand = { readonly __brand: "DepthExceeded" } & { extra: true };
      // Test: IntersectedBrand should NOT extend DepthExceededResult
      type ShouldBeFalse = IntersectedBrand extends DepthExceededResult ? true : false;
      expectTypeOf<ShouldBeFalse>().toEqualTypeOf<false>();
    });
  });

  describe("IsDepthExceeded type guard", () => {
    it("should return true only for DepthExceededResult", () => {
      expectTypeOf<IsDepthExceeded<DepthExceededResult>>().toEqualTypeOf<true>();
    });

    it("should return false for string", () => {
      expectTypeOf<IsDepthExceeded<string>>().toEqualTypeOf<false>();
    });

    it("should return false for number", () => {
      expectTypeOf<IsDepthExceeded<number>>().toEqualTypeOf<false>();
    });

    it("should return false for object", () => {
      expectTypeOf<IsDepthExceeded<object>>().toEqualTypeOf<false>();
    });

    it("should return false for empty object literal", () => {
      expectTypeOf<IsDepthExceeded<{}>>().toEqualTypeOf<false>();
    });
  });

  describe("assignability constraints", () => {
    it("should not allow assigning DepthExceededResult to boolean", () => {
      // DepthExceededResult should NOT extend boolean
      type ShouldBeFalse = DepthExceededResult extends boolean ? true : false;
      expectTypeOf<ShouldBeFalse>().toEqualTypeOf<false>();
    });

    it("should not allow DepthExceededResult to be true", () => {
      type ShouldBeFalse = DepthExceededResult extends true ? true : false;
      expectTypeOf<ShouldBeFalse>().toEqualTypeOf<false>();
    });

    it("should not allow DepthExceededResult to be false", () => {
      type ShouldBeFalse = DepthExceededResult extends false ? true : false;
      expectTypeOf<ShouldBeFalse>().toEqualTypeOf<false>();
    });
  });
});
