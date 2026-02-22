/**
 * Clock context type-level tests — DoD 32
 */

import { describe, it, expectTypeOf } from "vitest";
import { createClockContext } from "../src/clock-context.js";
import type {
  ClockContext,
  ClockContextHandle,
  AsyncClockContextHandle,
} from "../src/clock-context.js";
import type { ClockService } from "../src/ports/clock.js";
import type { SequenceGeneratorService } from "../src/ports/sequence.js";

// =============================================================================
// DoD 32: AsyncLocalStorage Clock Context — type-level
// =============================================================================

describe("ClockContext type structure", () => {
  it("ClockContext has readonly clock: ClockService", () => {
    expectTypeOf<ClockContext>().toHaveProperty("clock").toMatchTypeOf<ClockService>();
  });

  it("ClockContext has readonly sequenceGenerator: SequenceGeneratorService", () => {
    expectTypeOf<ClockContext>()
      .toHaveProperty("sequenceGenerator")
      .toMatchTypeOf<SequenceGeneratorService>();
  });
});

describe("createClockContext() return type", () => {
  it("createClockContext return type has init property", () => {
    const ctx = createClockContext();
    expectTypeOf(ctx).toHaveProperty("init");
  });

  it("createClockContext return type has run property", () => {
    const ctx = createClockContext();
    expectTypeOf(ctx).toHaveProperty("run");
  });

  it("createClockContext return type has get property", () => {
    const ctx = createClockContext();
    expectTypeOf(ctx).toHaveProperty("get");
  });

  it("createClockContext return type is AsyncClockContextHandle", () => {
    expectTypeOf(createClockContext).returns.toMatchTypeOf<AsyncClockContextHandle>();
  });
});

describe("ClockContextHandle generic signatures", () => {
  it("run generic T: run<T>(ctx, fn: () => T) returns T", () => {
    expectTypeOf<ClockContextHandle["run"]>().toBeCallableWith(
      {} as ClockContext,
      () => 42
    );
    // run returns the same type T as the callback
    const ctx = createClockContext();
    const result = ctx.run({} as ClockContext, () => "hello");
    expectTypeOf(result).toEqualTypeOf<string>();
  });

  it("get return type is ClockContext | undefined", () => {
    expectTypeOf<ClockContextHandle["get"]>().returns.toEqualTypeOf<ClockContext | undefined>();
  });
});
