/**
 * Type-level tests for ResultPathDescriptor.
 *
 * Spec: 01-overview.md Section 1.4.7
 */

import { describe, it, expectTypeOf } from "vitest";
import type { ResultPathDescriptor } from "../../../../src/panels/result/types.js";

describe("ResultPathDescriptor — Type Level", () => {
  it("path.trackSequence is readonly ('ok' | 'err')[]", () => {
    expectTypeOf<ResultPathDescriptor["trackSequence"]>().toEqualTypeOf<
      readonly ("ok" | "err")[]
    >();
  });

  it("path.switchPoints is readonly number[]", () => {
    expectTypeOf<ResultPathDescriptor["switchPoints"]>().toEqualTypeOf<readonly number[]>();
  });

  it("path.observed is boolean", () => {
    expectTypeOf<ResultPathDescriptor["observed"]>().toEqualTypeOf<boolean>();
  });

  it("path.frequency is number", () => {
    expectTypeOf<ResultPathDescriptor["frequency"]>().toEqualTypeOf<number>();
  });
});
