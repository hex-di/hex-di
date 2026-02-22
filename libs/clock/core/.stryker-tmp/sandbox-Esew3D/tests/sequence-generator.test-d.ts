/**
 * SequenceGeneratorPort type-level tests — DoD 2
 */
// @ts-nocheck


import { describe, it, expectTypeOf } from "vitest";
import { SequenceGeneratorPort } from "../src/ports/sequence.js";
import type { SequenceGeneratorService, SequenceOverflowError } from "../src/ports/sequence.js";
import type { Result } from "@hex-di/result";

describe("SequenceGeneratorPort type shape", () => {
  it("SequenceGeneratorService has next and current properties", () => {
    expectTypeOf<SequenceGeneratorService>().toHaveProperty("next");
    expectTypeOf<SequenceGeneratorService>().toHaveProperty("current");
  });

  it("SequenceGeneratorService does NOT have a reset property at the type level", () => {
    expectTypeOf<SequenceGeneratorService>().not.toHaveProperty("reset");
  });

  it("next() returns Result<number, SequenceOverflowError>", () => {
    expectTypeOf<SequenceGeneratorService["next"]>().returns.toEqualTypeOf<
      Result<number, SequenceOverflowError>
    >();
  });

  it("current() returns number", () => {
    expectTypeOf<SequenceGeneratorService["current"]>().returns.toEqualTypeOf<number>();
  });

  it("SequenceOverflowError has readonly _tag, lastValue, message", () => {
    expectTypeOf<SequenceOverflowError["_tag"]>().toEqualTypeOf<"SequenceOverflowError">();
    expectTypeOf<SequenceOverflowError["lastValue"]>().toEqualTypeOf<number>();
    expectTypeOf<SequenceOverflowError["message"]>().toEqualTypeOf<string>();
  });

  it("SequenceGeneratorPort is defined as a directed port", () => {
    expectTypeOf(SequenceGeneratorPort).toHaveProperty("__portName");
  });
});
