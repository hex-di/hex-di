/**
 * Retention utilities type-level tests — DoD 36
 */

import { describe, it, expectTypeOf } from "vitest";
import {
  validateRetentionMetadata,
  calculateRetentionExpiryDate,
} from "../src/retention.js";
import type { RetentionMetadata, RetentionValidationError } from "../src/retention.js";
import type { RetentionPolicyService } from "../src/ports/retention-policy.js";
import type { Result } from "@hex-di/result";

// =============================================================================
// DoD 36: Retention Utilities — type-level
// =============================================================================

describe("RetentionMetadata type structure", () => {
  it("RetentionMetadata has readonly retentionPeriodDays: number", () => {
    expectTypeOf<RetentionMetadata>()
      .toHaveProperty("retentionPeriodDays")
      .toEqualTypeOf<number>();
  });

  it("RetentionMetadata has readonly retentionBasis: string", () => {
    expectTypeOf<RetentionMetadata>().toHaveProperty("retentionBasis").toEqualTypeOf<string>();
  });

  it("RetentionMetadata has readonly retentionStartDate: string", () => {
    expectTypeOf<RetentionMetadata>()
      .toHaveProperty("retentionStartDate")
      .toEqualTypeOf<string>();
  });

  it("RetentionMetadata has readonly retentionExpiryDate: string", () => {
    expectTypeOf<RetentionMetadata>()
      .toHaveProperty("retentionExpiryDate")
      .toEqualTypeOf<string>();
  });

  it("RetentionMetadata has readonly recordType: string", () => {
    expectTypeOf<RetentionMetadata>().toHaveProperty("recordType").toEqualTypeOf<string>();
  });
});

describe("RetentionValidationError type structure", () => {
  it("RetentionValidationError has readonly _tag", () => {
    expectTypeOf<RetentionValidationError>()
      .toHaveProperty("_tag")
      .toEqualTypeOf<"RetentionValidationError">();
  });

  it("RetentionValidationError has readonly field: string", () => {
    expectTypeOf<RetentionValidationError>().toHaveProperty("field").toEqualTypeOf<string>();
  });

  it("RetentionValidationError has readonly message: string", () => {
    expectTypeOf<RetentionValidationError>().toHaveProperty("message").toEqualTypeOf<string>();
  });
});

describe("validateRetentionMetadata type signature", () => {
  it("validateRetentionMetadata accepts RetentionMetadata and returns Result<RetentionMetadata, RetentionValidationError>", () => {
    expectTypeOf(validateRetentionMetadata).returns.toMatchTypeOf<
      Result<RetentionMetadata, RetentionValidationError>
    >();
    expectTypeOf(validateRetentionMetadata).parameter(0).toMatchTypeOf<RetentionMetadata>();
  });
});

describe("calculateRetentionExpiryDate type signature", () => {
  it("calculateRetentionExpiryDate accepts (string, number) and returns string", () => {
    expectTypeOf(calculateRetentionExpiryDate).parameter(0).toEqualTypeOf<string>();
    expectTypeOf(calculateRetentionExpiryDate).parameter(1).toEqualTypeOf<number>();
    expectTypeOf(calculateRetentionExpiryDate).returns.toEqualTypeOf<string>();
  });
});

describe("RetentionPolicyPort service type structure", () => {
  it("RetentionPolicyService has getRetentionPeriodDays method", () => {
    expectTypeOf<RetentionPolicyService>()
      .toHaveProperty("getRetentionPeriodDays")
      .toMatchTypeOf<(recordType: string) => number>();
  });

  it("RetentionPolicyService has isRetentionConfigured method", () => {
    expectTypeOf<RetentionPolicyService>()
      .toHaveProperty("isRetentionConfigured")
      .toMatchTypeOf<() => boolean>();
  });

  it("RetentionPolicyService has getSupportedRecordTypes method returning ReadonlyArray<string>", () => {
    expectTypeOf<RetentionPolicyService>()
      .toHaveProperty("getSupportedRecordTypes")
      .toMatchTypeOf<() => ReadonlyArray<string>>();
  });

  it("RetentionPolicyService.getRetentionPeriodDays accepts string and returns number", () => {
    const service = {} as RetentionPolicyService;
    expectTypeOf(service.getRetentionPeriodDays).parameter(0).toEqualTypeOf<string>();
    expectTypeOf(service.getRetentionPeriodDays).returns.toEqualTypeOf<number>();
  });

  it("RetentionPolicyService.getSupportedRecordTypes returns ReadonlyArray<string>", () => {
    const service = {} as RetentionPolicyService;
    expectTypeOf(service.getSupportedRecordTypes).returns.toEqualTypeOf<ReadonlyArray<string>>();
  });
});
