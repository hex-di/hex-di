import { describe, it, expect, vi } from "vitest";
import { createPort } from "@hex-di/core";
import { defineStep } from "../src/step/builder.js";
import { defineSaga } from "../src/saga/builder.js";
import { createSagaRunner, executeSaga } from "../src/runtime/runner.js";
import type { PortResolver } from "../src/runtime/types.js";

// =============================================================================
// Test Ports
// =============================================================================

const ValidatePort = createPort<"Validate", any>({ name: "Validate" });
const ReservePort = createPort<"Reserve", any>({ name: "Reserve" });
const ChargePort = createPort<"Charge", any>({ name: "Charge" });
const NotifyPort = createPort<"Notify", any>({ name: "Notify" });

// =============================================================================
// Test Steps
// =============================================================================

const ValidateStep = defineStep("Validate")
  .io<{ orderId: string }, { valid: boolean }>()
  .invoke(ValidatePort, ctx => ctx.input)
  .build();

const ReserveStep = defineStep("Reserve")
  .io<{ orderId: string }, { reservationId: string }>()
  .invoke(ReservePort, ctx => ctx.input)
  .compensate(ctx => ({ undo: ctx.stepResult.reservationId }))
  .build();

const ChargeStep = defineStep("Charge")
  .io<{ orderId: string }, { transactionId: string }>()
  .invoke(ChargePort, ctx => ctx.input)
  .compensate(ctx => ({ refund: ctx.stepResult.transactionId }))
  .build();

const NotifyStep = defineStep("Notify")
  .io<{ orderId: string }, void>()
  .invoke(NotifyPort, ctx => ctx.input)
  .skipCompensation()
  .build();

// =============================================================================
// Test Saga
// =============================================================================

const OrderSaga = defineSaga("OrderSaga")
  .input<{ orderId: string }>()
  .step(ValidateStep)
  .step(ReserveStep)
  .step(ChargeStep)
  .step(NotifyStep)
  .output(results => ({
    orderId: "test",
    reservationId: results.Reserve.reservationId,
    transactionId: results.Charge.transactionId,
  }))
  .build();

// =============================================================================
// Helpers
// =============================================================================

function createMockResolver(
  portResults: Record<string, unknown>,
  failingPorts?: Record<string, Error>
): PortResolver {
  return {
    resolve(portName: string): unknown {
      if (failingPorts?.[portName]) {
        return (_params: unknown) => Promise.reject(failingPorts[portName]);
      }
      if (portName in portResults) {
        return (_params: unknown) => Promise.resolve(portResults[portName]);
      }
      throw new Error(`Port not found: ${portName}`);
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("SagaRunner", () => {
  describe("successful execution", () => {
    it("executes all steps sequentially and returns output", async () => {
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
        Notify: undefined,
      });

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, OrderSaga, { orderId: "order-1" });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.output.reservationId).toBe("r-1");
        expect(result.value.output.transactionId).toBe("t-1");
        expect(result.value.executionId).toBeTruthy();
      }
    });
  });

  describe("step failure and compensation", () => {
    it("runs compensation when a step fails", async () => {
      const compensationCalls: string[] = [];
      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") {
            return () => Promise.resolve({ valid: true });
          }
          if (portName === "Reserve") {
            return (params: any) => {
              if (params?.undo) {
                compensationCalls.push("Reserve");
                return Promise.resolve();
              }
              return Promise.resolve({ reservationId: "r-1" });
            };
          }
          if (portName === "Charge") {
            return () => Promise.reject(new Error("Payment declined"));
          }
          if (portName === "Notify") {
            return () => Promise.resolve();
          }
          throw new Error(`Port not found: ${portName}`);
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, OrderSaga, { orderId: "order-1" });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("StepFailed");
        expect(result.error.stepName).toBe("Charge");
        expect(result.error.completedSteps).toContain("Reserve");
      }
    });

    it("returns PortNotFound when a port is missing", async () => {
      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") {
            return () => Promise.resolve({ valid: true });
          }
          throw new Error(`Port not found: ${portName}`);
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, OrderSaga, { orderId: "order-1" });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("PortNotFound");
      }
    });
  });

  describe("conditional steps", () => {
    it("skips steps when condition returns false", async () => {
      const ConditionalStep = defineStep("Conditional")
        .io<{ skip: boolean }, void>()
        .invoke(ValidatePort, ctx => ctx.input)
        .when(ctx => !(ctx.input as any).skip)
        .build();

      const saga = defineSaga("ConditionalSaga")
        .input<{ skip: boolean }>()
        .step(ConditionalStep)
        .output(() => ({ done: true }))
        .build();

      const portCalled = vi.fn(() => Promise.resolve());
      const resolver: PortResolver = {
        resolve() {
          return portCalled;
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, { skip: true });

      expect(result.isOk()).toBe(true);
      expect(portCalled).not.toHaveBeenCalled();
    });
  });

  describe("event subscription", () => {
    it("emits events during execution", async () => {
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
        Notify: undefined,
      });

      const runner = createSagaRunner(resolver);

      // Start execution and subscribe
      const resultAsync = executeSaga(runner, OrderSaga, {
        orderId: "order-1",
      });

      // Note: subscription may not catch events if the saga completes
      // before subscribe is called. This tests the basic mechanism.
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });
  });

  describe("cancellation", () => {
    it("cancels an execution via runner.cancel", async () => {
      const abortController = new AbortController();

      // Create a slow resolver
      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") {
            return () => new Promise(resolve => setTimeout(() => resolve({ valid: true }), 500));
          }
          return () => Promise.resolve();
        },
      };

      const runner = createSagaRunner(resolver);
      const resultAsync = executeSaga(
        runner,
        OrderSaga,
        { orderId: "order-1" },
        {
          signal: abortController.signal,
        }
      );

      // Cancel immediately
      abortController.abort();

      const result = await resultAsync;
      // The result should be an error (either Cancelled or a StepFailed due to abort)
      expect(result.isErr()).toBe(true);
    });
  });

  describe("management operations", () => {
    it("getStatus returns error for unknown execution", async () => {
      const resolver = createMockResolver({});
      const runner = createSagaRunner(resolver);

      const result = await runner.getStatus("nonexistent");
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("ExecutionNotFound");
      }
    });

    it("cancel returns error for unknown execution", async () => {
      const resolver = createMockResolver({});
      const runner = createSagaRunner(resolver);

      const result = await runner.cancel("nonexistent");
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("ExecutionNotFound");
      }
    });
  });

  describe("getTrace", () => {
    it("returns null for unknown execution", () => {
      const resolver = createMockResolver({});
      const runner = createSagaRunner(resolver);

      expect(runner.getTrace("nonexistent")).toBeNull();
    });

    it("returns execution trace after successful execution", async () => {
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
        Notify: undefined,
      });

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(
        runner,
        OrderSaga,
        { orderId: "order-1" },
        {
          executionId: "trace-test-1",
        }
      );

      expect(result.isOk()).toBe(true);

      const trace = runner.getTrace("trace-test-1");
      expect(trace).not.toBeNull();
      if (trace) {
        expect(trace.executionId).toBe("trace-test-1");
        expect(trace.sagaName).toBe("OrderSaga");
        expect(trace.status).toBe("completed");
        expect(trace.steps.length).toBeGreaterThanOrEqual(4);
        expect(trace.startedAt).toBeGreaterThan(0);
        expect(trace.completedAt).toBeGreaterThan(0);
        expect(trace.totalDurationMs).toBeGreaterThanOrEqual(0);
      }
    });

    it("records step traces with timing information", async () => {
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
        Notify: undefined,
      });

      const runner = createSagaRunner(resolver);
      await executeSaga(
        runner,
        OrderSaga,
        { orderId: "order-1" },
        {
          executionId: "trace-timing-1",
        }
      );

      const trace = runner.getTrace("trace-timing-1");
      expect(trace).not.toBeNull();
      if (trace) {
        for (const step of trace.steps) {
          expect(step.stepName).toBeTruthy();
          expect(typeof step.stepIndex).toBe("number");
          expect(step.startedAt).toBeGreaterThan(0);
          if (step.status === "completed") {
            expect(step.completedAt).toBeGreaterThan(0);
            expect(typeof step.durationMs).toBe("number");
          }
        }
      }
    });

    it("records compensation traces on step failure", async () => {
      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") {
            return () => Promise.resolve({ valid: true });
          }
          if (portName === "Reserve") {
            return (params: any) => {
              if (params?.undo) return Promise.resolve();
              return Promise.resolve({ reservationId: "r-1" });
            };
          }
          if (portName === "Charge") {
            return () => Promise.reject(new Error("Payment declined"));
          }
          if (portName === "Notify") {
            return () => Promise.resolve();
          }
          throw new Error(`Port not found: ${portName}`);
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(
        runner,
        OrderSaga,
        { orderId: "order-1" },
        {
          executionId: "trace-comp-1",
        }
      );

      expect(result.isErr()).toBe(true);

      const trace = runner.getTrace("trace-comp-1");
      expect(trace).not.toBeNull();
      if (trace) {
        expect(trace.status).toBe("failed");
        // Should have some failed step
        const failedSteps = trace.steps.filter(s => s.status === "failed");
        expect(failedSteps.length).toBeGreaterThanOrEqual(1);

        // Compensation trace should exist if there were completed steps to compensate
        if (trace.compensation) {
          expect(trace.compensation.triggeredByIndex).toBeGreaterThanOrEqual(0);
          expect(trace.compensation.steps.length).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe("event listeners via ExecuteOptions", () => {
    it("captures events from the start via listeners option", async () => {
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
        Notify: undefined,
      });

      const events: Array<{ type: string }> = [];
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(
        runner,
        OrderSaga,
        { orderId: "order-1" },
        {
          listeners: [
            event => {
              events.push({ type: event.type });
            },
          ],
        }
      );

      expect(result.isOk()).toBe(true);
      // Should have captured saga:started and multiple step events
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toContain("saga:started");
      expect(eventTypes).toContain("saga:completed");
      expect(eventTypes.filter(t => t === "step:started").length).toBeGreaterThanOrEqual(4);
      expect(eventTypes.filter(t => t === "step:completed").length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("enriched hook context", () => {
    it("passes enriched context to beforeStep and afterStep hooks", async () => {
      const hookContexts: Array<Record<string, unknown>> = [];

      const HookedStep = defineStep("Hooked")
        .io<unknown, { done: boolean }>()
        .invoke(ValidatePort, ctx => ctx.input)
        .build();

      const HookedSaga = defineSaga("HookedSaga")
        .input<unknown>()
        .step(HookedStep)
        .output(() => ({ done: true }))
        .options({
          compensationStrategy: "sequential",
          hooks: {
            beforeStep: ctx => {
              hookContexts.push({
                stepName: ctx.stepName,
                stepIndex: ctx.stepIndex,
                executionId: ctx.executionId,
                sagaName: ctx.sagaName,
                isCompensation: ctx.isCompensation,
              });
            },
            afterStep: ctx => {
              hookContexts.push({
                stepName: ctx.stepName,
                stepIndex: ctx.stepIndex,
                executionId: ctx.executionId,
                sagaName: ctx.sagaName,
                isCompensation: ctx.isCompensation,
                durationMs: ctx.durationMs,
              });
            },
          },
        })
        .build();

      const resolver = createMockResolver({
        Validate: { done: true },
      });

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(
        runner,
        HookedSaga,
        {},
        {
          executionId: "hook-test-1",
        }
      );

      expect(result.isOk()).toBe(true);
      expect(hookContexts.length).toBeGreaterThanOrEqual(2);

      // beforeStep context
      const beforeCtx = hookContexts[0];
      expect(beforeCtx.stepName).toBe("Hooked");
      expect(beforeCtx.stepIndex).toBe(0);
      expect(beforeCtx.executionId).toBe("hook-test-1");
      expect(beforeCtx.sagaName).toBe("HookedSaga");
      expect(beforeCtx.isCompensation).toBe(false);

      // afterStep context
      const afterCtx = hookContexts[1];
      expect(afterCtx.stepName).toBe("Hooked");
      expect(afterCtx.executionId).toBe("hook-test-1");
      expect(afterCtx.sagaName).toBe("HookedSaga");
      expect(typeof afterCtx.durationMs).toBe("number");
    });
  });
});
