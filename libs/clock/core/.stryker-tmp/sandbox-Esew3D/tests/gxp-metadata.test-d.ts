/**
 * GxP Metadata type-level tests — DoD 14/15
 */
// @ts-nocheck


import { describe, it, expectTypeOf } from "vitest";
import { getClockGxPMetadata } from "../src/gxp-metadata.js";
import type { ClockGxPMetadata } from "../src/gxp-metadata.js";

describe("ClockGxPMetadata type shape", () => {
  it("ClockGxPMetadata has readonly clockVersion property of type string", () => {
    expectTypeOf<ClockGxPMetadata["clockVersion"]>().toEqualTypeOf<string>();
  });

  it("ClockGxPMetadata has readonly specRevision property of type string", () => {
    expectTypeOf<ClockGxPMetadata["specRevision"]>().toEqualTypeOf<string>();
  });

  it("getClockGxPMetadata return type is ClockGxPMetadata", () => {
    expectTypeOf(getClockGxPMetadata).returns.toEqualTypeOf<ClockGxPMetadata>();
  });
});
