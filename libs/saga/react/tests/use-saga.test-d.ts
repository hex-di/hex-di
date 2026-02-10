import { describe, it, expectTypeOf } from "vitest";
import { sagaPort, sagaManagementPort } from "@hex-di/saga";
import type {
  SagaSuccess,
  SagaError,
  SagaStatus,
  ManagementError,
  SagaExecutionSummary,
} from "@hex-di/saga";
import type { Result } from "@hex-di/result";
import type { ResultAsync } from "@hex-di/result";
import {
  useSaga,
  useSagaStatus,
  useSagaHistory,
  SagaBoundary,
  type UseSagaResult,
  type UseSagaStatus,
  type SagaStatusResult,
  type SagaStatusHookStatus,
  type SagaHistoryResult,
  type SagaHistoryOptions,
  type SagaBoundaryProps,
  type SagaBoundaryFallbackProps,
} from "../src/index.js";

// =============================================================================
// Test Ports
// =============================================================================

type OrderInput = { orderId: string };
type OrderOutput = { transactionId: string };
type OrderErrors = { kind: "payment" } | { kind: "validation" };

const _OrderPort = sagaPort<OrderInput, OrderOutput, OrderErrors>()({
  name: "OrderSaga",
});
type OrderPort = typeof _OrderPort;

const _OrderManagementPort = sagaManagementPort<OrderOutput, OrderErrors>()({
  name: "OrderSagaManagement",
});
type OrderManagementPort = typeof _OrderManagementPort;

// =============================================================================
// useSaga Hook Type Tests
// =============================================================================

describe("useSaga - Type Level", () => {
  it("returns UseSagaResult with correct generic types", () => {
    type HookResult = UseSagaResult<OrderInput, OrderOutput, OrderErrors>;
    expectTypeOf<HookResult["status"]>().toMatchTypeOf<UseSagaStatus>();
    expectTypeOf<HookResult["data"]>().toEqualTypeOf<OrderOutput | undefined>();
    expectTypeOf<HookResult["error"]>().toEqualTypeOf<SagaError<OrderErrors> | null>();
    expectTypeOf<HookResult["executionId"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<HookResult["compensated"]>().toEqualTypeOf<boolean>();
  });

  it("execute returns Promise<Result<SagaSuccess<TOutput>, SagaError<TError>>>", () => {
    type HookResult = UseSagaResult<OrderInput, OrderOutput, OrderErrors>;
    type ExecuteReturn = ReturnType<HookResult["execute"]>;
    expectTypeOf<ExecuteReturn>().toMatchTypeOf<
      Promise<Result<SagaSuccess<OrderOutput>, SagaError<OrderErrors>>>
    >();
  });

  it("data field has correct output type", () => {
    type HookResult = UseSagaResult<OrderInput, OrderOutput, OrderErrors>;
    expectTypeOf<HookResult["data"]>().toEqualTypeOf<OrderOutput | undefined>();
  });

  it("error field has correct error type", () => {
    type HookResult = UseSagaResult<OrderInput, OrderOutput, OrderErrors>;
    expectTypeOf<HookResult["error"]>().toEqualTypeOf<SagaError<OrderErrors> | null>();
  });

  it("status field is UseSagaStatus union", () => {
    expectTypeOf<UseSagaStatus>().toEqualTypeOf<
      "idle" | "running" | "compensating" | "success" | "error"
    >();
  });

  it("resume returns Promise<Result<SagaSuccess<TOutput>, SagaError<TError>>>", () => {
    type HookResult = UseSagaResult<OrderInput, OrderOutput, OrderErrors>;
    type ResumeReturn = ReturnType<HookResult["resume"]>;
    expectTypeOf<ResumeReturn>().toMatchTypeOf<
      Promise<Result<SagaSuccess<OrderOutput>, SagaError<OrderErrors>>>
    >();
  });

  it("cancel returns Promise<Result<void, SagaError<TError>>>", () => {
    type HookResult = UseSagaResult<OrderInput, OrderOutput, OrderErrors>;
    type CancelReturn = ReturnType<HookResult["cancel"]>;
    expectTypeOf<CancelReturn>().toEqualTypeOf<Promise<Result<void, SagaError<OrderErrors>>>>();
  });

  it("reset returns Result<void, SagaError<never>>", () => {
    type HookResult = UseSagaResult<OrderInput, OrderOutput, OrderErrors>;
    type ResetReturn = ReturnType<HookResult["reset"]>;
    expectTypeOf<ResetReturn>().toEqualTypeOf<Result<void, SagaError<never>>>();
  });
});

// =============================================================================
// useSagaStatus Hook Type Tests
// =============================================================================

describe("useSagaStatus - Type Level", () => {
  it("returns SagaStatusResult", () => {
    type HookResult = ReturnType<typeof useSagaStatus>;
    expectTypeOf<HookResult>().toMatchTypeOf<SagaStatusResult>();
  });

  it("status field is SagaStatusHookStatus union", () => {
    expectTypeOf<SagaStatusHookStatus>().toEqualTypeOf<
      "pending" | "running" | "compensating" | "completed" | "failed" | "not-found"
    >();
  });

  it("completedSteps is readonly string array", () => {
    expectTypeOf<SagaStatusResult["completedSteps"]>().toMatchTypeOf<readonly string[]>();
  });
});

// =============================================================================
// useSagaHistory Hook Type Tests
// =============================================================================

describe("useSagaHistory - Type Level", () => {
  it("returns SagaHistoryResult", () => {
    type HookResult = ReturnType<typeof useSagaHistory>;
    expectTypeOf<HookResult>().toMatchTypeOf<SagaHistoryResult>();
  });

  it("entries is readonly SagaExecutionSummary array", () => {
    expectTypeOf<SagaHistoryResult["entries"]>().toMatchTypeOf<readonly SagaExecutionSummary[]>();
  });

  it("error field is ManagementError | null", () => {
    expectTypeOf<SagaHistoryResult["error"]>().toEqualTypeOf<ManagementError | null>();
  });

  it("options are properly typed", () => {
    expectTypeOf<SagaHistoryOptions>().toMatchTypeOf<{
      readonly sagaName?: string;
      readonly limit?: number;
    }>();
  });
});

// =============================================================================
// SagaBoundary Component Type Tests
// =============================================================================

describe("SagaBoundary - Type Level", () => {
  it("SagaBoundaryFallbackProps has error and recovery fields", () => {
    expectTypeOf<SagaBoundaryFallbackProps["error"]>().toMatchTypeOf<SagaError<unknown>>();
    expectTypeOf<SagaBoundaryFallbackProps["reset"]>().toMatchTypeOf<() => void>();
    expectTypeOf<SagaBoundaryFallbackProps["retry"]>().toMatchTypeOf<() => void>();
    expectTypeOf<SagaBoundaryFallbackProps["compensated"]>().toEqualTypeOf<boolean>();
    expectTypeOf<SagaBoundaryFallbackProps["executionId"]>().toEqualTypeOf<string | undefined>();
  });

  it("SagaBoundaryProps has required children and fallback", () => {
    expectTypeOf<SagaBoundaryProps>().toHaveProperty("children");
    expectTypeOf<SagaBoundaryProps>().toHaveProperty("fallback");
    expectTypeOf<SagaBoundaryProps>().toHaveProperty("onError");
  });
});
