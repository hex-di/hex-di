/**
 * Record integrity type-level tests — DoD 8c/12
 */

import { describe, it, expectTypeOf } from "vitest";
import {
  computeTemporalContextDigest,
  computeOverflowTemporalContextDigest,
  verifyTemporalContextDigest,
} from "../src/record-integrity.js";
import type { TemporalContextDigest } from "../src/record-integrity.js";
import type { TemporalContext, OverflowTemporalContext } from "../src/temporal-context.js";

describe("Record integrity type shape", () => {
  it("TemporalContextDigest has readonly _tag, algorithm, digest, canonicalInput", () => {
    expectTypeOf<TemporalContextDigest["_tag"]>().toEqualTypeOf<"TemporalContextDigest">();
    expectTypeOf<TemporalContextDigest["algorithm"]>().toEqualTypeOf<"SHA-256">();
    expectTypeOf<TemporalContextDigest["digest"]>().toEqualTypeOf<string>();
    expectTypeOf<TemporalContextDigest["canonicalInput"]>().toEqualTypeOf<string>();
  });

  it("computeTemporalContextDigest accepts TemporalContext and returns TemporalContextDigest", () => {
    expectTypeOf(computeTemporalContextDigest).parameters.toEqualTypeOf<[TemporalContext]>();
    expectTypeOf(computeTemporalContextDigest).returns.toEqualTypeOf<TemporalContextDigest>();
  });

  it("verifyTemporalContextDigest accepts TemporalContext and TemporalContextDigest, returns boolean", () => {
    expectTypeOf(verifyTemporalContextDigest).parameters.toEqualTypeOf<
      [TemporalContext, TemporalContextDigest]
    >();
    expectTypeOf(verifyTemporalContextDigest).returns.toEqualTypeOf<boolean>();
  });

  it("computeOverflowTemporalContextDigest accepts OverflowTemporalContext and returns TemporalContextDigest", () => {
    expectTypeOf(computeOverflowTemporalContextDigest).parameters.toEqualTypeOf<
      [OverflowTemporalContext]
    >();
    expectTypeOf(computeOverflowTemporalContextDigest).returns.toEqualTypeOf<TemporalContextDigest>();
  });
});
