import { describe, it, expectTypeOf } from "vitest";
import type { CompensationContext } from "../src/step/types.js";
import type { CompensationFailedError } from "../src/errors/types.js";

// =============================================================================
// Type-Level Tests (DOD 5)
// =============================================================================

describe("Compensation - Type Level", () => {
  // DOD 5 type #1
  it("CompensationContext<TInput, TAccumulated, TStepOutput, TError> has all 4 type params", () => {
    type Ctx = CompensationContext<string, { A: number }, boolean, { kind: "err" }>;
    expectTypeOf<Ctx["input"]>().toEqualTypeOf<string>();
    expectTypeOf<Ctx["results"]>().toEqualTypeOf<{ A: number }>();
    expectTypeOf<Ctx["stepResult"]>().toEqualTypeOf<boolean>();
    expectTypeOf<Ctx["error"]>().toEqualTypeOf<{ kind: "err" }>();
  });

  // DOD 5 type #2
  it("CompensationContext.stepResult typed as TStepOutput", () => {
    type Ctx = CompensationContext<string, unknown, { reservationId: string }, unknown>;
    expectTypeOf<Ctx["stepResult"]>().toEqualTypeOf<{ reservationId: string }>();
  });

  // DOD 5 type #3
  it("CompensationContext.error typed as TError", () => {
    type MyError = { code: number; message: string };
    type Ctx = CompensationContext<string, unknown, unknown, MyError>;
    expectTypeOf<Ctx["error"]>().toEqualTypeOf<MyError>();
  });

  // DOD 5 type #4
  it("CompensationFailedError<TCause> generic over cause type", () => {
    type Err = CompensationFailedError<{ code: number }>;
    expectTypeOf<Err["_tag"]>().toEqualTypeOf<"CompensationFailed">();
    expectTypeOf<Err["cause"]>().toEqualTypeOf<{ code: number }>();
    expectTypeOf<Err["compensationCause"]>().toEqualTypeOf<unknown>();
    expectTypeOf<Err["failedCompensationSteps"]>().toEqualTypeOf<readonly string[]>();
  });

  // Additional: CompensationContext extends StepContext
  it("CompensationContext includes stepIndex and executionId from StepContext", () => {
    type Ctx = CompensationContext<string, unknown, unknown, unknown>;
    expectTypeOf<Ctx["stepIndex"]>().toEqualTypeOf<number>();
    expectTypeOf<Ctx["executionId"]>().toEqualTypeOf<string>();
    expectTypeOf<Ctx["failedStepIndex"]>().toEqualTypeOf<number>();
    expectTypeOf<Ctx["failedStepName"]>().toEqualTypeOf<string>();
  });
});
