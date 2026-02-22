/**
 * TemporalContext type-level tests — DoD 7/8
 */
// @ts-nocheck


import { describe, it, expectTypeOf } from "vitest";
import type {
  TemporalContext,
  OverflowTemporalContext,
  SignableTemporalContext,
  TemporalContextFactory,
} from "../src/temporal-context.js";
import type { SequenceOverflowError } from "../src/ports/sequence.js";
import type { MonotonicTimestamp, WallClockTimestamp } from "../src/branded.js";
import type { Result } from "@hex-di/result";

describe("TemporalContext type shape", () => {
  it("TemporalContext has readonly sequenceNumber, monotonicTimestamp, wallClockTimestamp", () => {
    expectTypeOf<TemporalContext["sequenceNumber"]>().toEqualTypeOf<number>();
    expectTypeOf<TemporalContext["monotonicTimestamp"]>().toEqualTypeOf<MonotonicTimestamp>();
    expectTypeOf<TemporalContext["wallClockTimestamp"]>().toEqualTypeOf<WallClockTimestamp>();
  });

  it("TemporalContextFactory has readonly create method returning Result<TemporalContext, SequenceOverflowError>", () => {
    expectTypeOf<TemporalContextFactory["create"]>().returns.toEqualTypeOf<
      Result<TemporalContext, SequenceOverflowError>
    >();
  });

  it("TemporalContextFactory has readonly createOverflowContext method returning OverflowTemporalContext", () => {
    expectTypeOf<TemporalContextFactory["createOverflowContext"]>().returns.toEqualTypeOf<
      OverflowTemporalContext
    >();
  });

  it("TemporalContextFactory does NOT have a tryCreate method", () => {
    expectTypeOf<TemporalContextFactory>().not.toHaveProperty("tryCreate");
  });

  it("OverflowTemporalContext has readonly _tag, sequenceNumber, lastValidSequenceNumber, monotonicTimestamp, wallClockTimestamp", () => {
    expectTypeOf<OverflowTemporalContext["_tag"]>().toEqualTypeOf<"OverflowTemporalContext">();
    expectTypeOf<OverflowTemporalContext["sequenceNumber"]>().toEqualTypeOf<-1>();
    expectTypeOf<OverflowTemporalContext["lastValidSequenceNumber"]>().toEqualTypeOf<number>();
    expectTypeOf<OverflowTemporalContext["monotonicTimestamp"]>().toEqualTypeOf<MonotonicTimestamp>();
    expectTypeOf<OverflowTemporalContext["wallClockTimestamp"]>().toEqualTypeOf<WallClockTimestamp>();
  });

  it("SignableTemporalContext extends TemporalContext", () => {
    expectTypeOf<SignableTemporalContext>().toMatchTypeOf<TemporalContext>();
  });
});
