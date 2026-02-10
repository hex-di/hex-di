import { describe, it, expectTypeOf } from "vitest";
import type {
  SagaError,
  StepFailedError,
  CompensationFailedError,
  TimeoutError,
  CancelledError,
  ValidationFailedError,
  PortNotFoundError,
  PersistenceFailedError,
  SagaSuccess,
  ManagementError,
} from "../src/errors/types.js";
import type { RetryConfig } from "../src/step/types.js";

// =============================================================================
// Type-Level Tests (DOD 8)
// =============================================================================

describe("Error Handling - Type Level", () => {
  // DOD 8 type #1
  it("SagaError<TCause> is a tagged union of 7 variants", () => {
    type Tags = SagaError["_tag"];
    expectTypeOf<Tags>().toEqualTypeOf<
      | "StepFailed"
      | "CompensationFailed"
      | "Timeout"
      | "Cancelled"
      | "ValidationFailed"
      | "PortNotFound"
      | "PersistenceFailed"
    >();
  });

  // DOD 8 type #2
  it("Each variant narrows correctly via _tag discriminant in switch", () => {
    function handleError(error: SagaError<string>): string {
      switch (error._tag) {
        case "StepFailed":
          expectTypeOf(error).toMatchTypeOf<StepFailedError<string>>();
          return error.cause;
        case "CompensationFailed":
          expectTypeOf(error).toMatchTypeOf<CompensationFailedError<string>>();
          return error.cause;
        case "Timeout":
          expectTypeOf(error).toMatchTypeOf<TimeoutError>();
          return String(error.timeoutMs);
        case "Cancelled":
          expectTypeOf(error).toMatchTypeOf<CancelledError>();
          return "cancelled";
        case "ValidationFailed":
          expectTypeOf(error).toMatchTypeOf<ValidationFailedError>();
          return "validation";
        case "PortNotFound":
          expectTypeOf(error).toMatchTypeOf<PortNotFoundError>();
          return error.portName;
        case "PersistenceFailed":
          expectTypeOf(error).toMatchTypeOf<PersistenceFailedError>();
          return error.operation;
      }
    }
    // Ensure function returns string (exhaustive)
    expectTypeOf(handleError).returns.toEqualTypeOf<string>();
  });

  // DOD 8 type #3
  it("StepFailedError<TCause> generic preserves cause type", () => {
    type Err = StepFailedError<{ code: number }>;
    expectTypeOf<Err["cause"]>().toEqualTypeOf<{ code: number }>();
  });

  // DOD 8 type #4
  it("CompensationFailedError<TCause> carries both cause and compensationCause types", () => {
    type Err = CompensationFailedError<{ code: number }>;
    expectTypeOf<Err["cause"]>().toEqualTypeOf<{ code: number }>();
    expectTypeOf<Err["compensationCause"]>().toEqualTypeOf<unknown>();
    expectTypeOf<Err["failedCompensationSteps"]>().toEqualTypeOf<readonly string[]>();
  });

  // DOD 8 type #7
  it("Result<SagaSuccess<TOutput>, SagaError<TErrors>> carries full types", () => {
    type Output = { orderId: string };
    type Success = SagaSuccess<Output>;
    expectTypeOf<Success["output"]>().toEqualTypeOf<Output>();
    expectTypeOf<Success["executionId"]>().toEqualTypeOf<string>();
  });

  // DOD 8 type #8
  it("SagaErrorBase fields (executionId, stepName, etc.) present on all variants", () => {
    // Every SagaError variant extends SagaErrorBase, so these fields must be present
    expectTypeOf<SagaError["executionId"]>().toEqualTypeOf<string>();
    expectTypeOf<SagaError["sagaName"]>().toEqualTypeOf<string>();
    expectTypeOf<SagaError["stepName"]>().toEqualTypeOf<string>();
    expectTypeOf<SagaError["stepIndex"]>().toEqualTypeOf<number>();
    expectTypeOf<SagaError["message"]>().toEqualTypeOf<string>();
    expectTypeOf<SagaError["completedSteps"]>().toEqualTypeOf<readonly string[]>();
    expectTypeOf<SagaError["compensatedSteps"]>().toEqualTypeOf<readonly string[]>();
  });

  // DOD 8 type #9
  it("RetryConfig<TError> retryIf predicate receives TError parameter", () => {
    type MyError = { code: number };
    type Config = RetryConfig<MyError>;
    // retryIf should receive MyError
    type RetryIfFn = NonNullable<Config["retryIf"]>;
    expectTypeOf<RetryIfFn>().toMatchTypeOf<(error: MyError) => boolean>();
  });

  // DOD 8 type #10
  it("TimeoutError has timeoutMs: number field", () => {
    expectTypeOf<TimeoutError["timeoutMs"]>().toEqualTypeOf<number>();
  });

  // DOD 8 type #11
  it("PortNotFoundError has portName: string field", () => {
    expectTypeOf<PortNotFoundError["portName"]>().toEqualTypeOf<string>();
  });

  // DOD 8 type #12
  it("PersistenceFailedError has operation: string and cause: unknown fields", () => {
    expectTypeOf<PersistenceFailedError["operation"]>().toEqualTypeOf<
      "save" | "load" | "delete" | "update"
    >();
    expectTypeOf<PersistenceFailedError["cause"]>().toEqualTypeOf<unknown>();
  });

  // Additional: ManagementError has 3 variants
  it("ManagementError tagged union has 3 variants", () => {
    type Tags = ManagementError["_tag"];
    expectTypeOf<Tags>().toEqualTypeOf<
      "ExecutionNotFound" | "InvalidOperation" | "PersistenceFailed"
    >();
  });
});
