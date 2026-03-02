/**
 * Integration Tests: Introspection (DOD 12)
 *
 * Tests the SagaInspector API that backs MCP resources:
 * getDefinitions, getActiveExecutions, getTrace,
 * plus runner.resume and runner.cancel.
 */

import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/core";
import { defineStep } from "../../src/step/builder.js";
import { defineSaga } from "../../src/saga/builder.js";
import { createSagaInspector } from "../../src/introspection/saga-inspector.js";
import { createSagaRunner } from "../../src/runtime/runner.js";
import { createInMemoryPersister } from "../../src/persistence/in-memory.js";
import type { ExecutionTrace } from "../../src/runtime/types.js";
import type { PortResolver } from "../../src/runtime/types.js";

// =============================================================================
// Test Setup
// =============================================================================

const PaymentPort = createPort<"Payment", any>({ name: "Payment" });
const ShippingPort = createPort<"Shipping", any>({ name: "Shipping" });
const NotifyPort = createPort<"Notify", any>({ name: "Notify" });

const PaymentStep = defineStep("Payment")
  .io<{ orderId: string }, { txId: string }>()
  .invoke(PaymentPort, ctx => ctx.input)
  .compensate(ctx => ({ refund: ctx.stepResult.txId }))
  .build();

const ShippingStep = defineStep("Shipping")
  .io<{ orderId: string }, { trackingId: string }>()
  .invoke(ShippingPort, ctx => ctx.input)
  .compensate(ctx => ({ cancel: ctx.stepResult.trackingId }))
  .options({ retry: { maxAttempts: 3, delay: 100 }, timeout: 5000 })
  .build();

const NotifyStep = defineStep("Notify")
  .io<{ orderId: string }, void>()
  .invoke(NotifyPort, ctx => ctx.input)
  .build();

const OrderSaga = defineSaga("OrderSaga")
  .input<{ orderId: string }>()
  .step(PaymentStep)
  .step(ShippingStep)
  .step(NotifyStep)
  .output(r => r)
  .build();

// =============================================================================
// Tests (DOD 12)
// =============================================================================

describe("Introspection Integration", () => {
  it("SagaInspector.getDefinitions returns data matching MCP hexdi://saga/definitions contract", () => {
    const inspector = createSagaInspector({
      definitions: [OrderSaga],
    });

    const defs = inspector.getDefinitions();
    expect(defs).toHaveLength(1);

    const def = defs[0];
    // MCP contract fields
    expect(def.name).toBe("OrderSaga");
    expect(def.steps).toHaveLength(3);
    expect(def.options.compensationStrategy).toBe("sequential");
    expect(def.portDependencies).toEqual(["Payment", "Shipping", "Notify"]);

    // Step details
    expect(def.steps[0].name).toBe("Payment");
    expect(def.steps[0].hasCompensation).toBe(true);
    expect(def.steps[0].port).toBe("Payment");

    expect(def.steps[1].name).toBe("Shipping");
    expect(def.steps[1].retryPolicy).toBeDefined();
    expect(def.steps[1].retryPolicy?.maxAttempts).toBe(3);
    expect(def.steps[1].timeout).toBe(5000);

    expect(def.steps[2].name).toBe("Notify");
    expect(def.steps[2].hasCompensation).toBe(false);
  });

  it("SagaInspector.getActiveExecutions returns data matching MCP hexdi://saga/executions contract", () => {
    const traces: Record<string, ExecutionTrace> = {};
    traces["exec-1"] = {
      executionId: "exec-1",
      sagaName: "OrderSaga",
      input: { orderId: "o-1" },
      status: "running",
      steps: [
        {
          stepName: "Payment",
          stepIndex: 0,
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          durationMs: 100,
          attemptCount: 1,
          error: undefined,
          skippedReason: undefined,
        },
      ],
      compensation: undefined,
      startedAt: 100,
      completedAt: undefined,
      totalDurationMs: undefined,
      metadata: undefined,
    };
    traces["exec-2"] = {
      executionId: "exec-2",
      sagaName: "OrderSaga",
      input: { orderId: "o-2" },
      status: "completed",
      steps: [],
      compensation: undefined,
      startedAt: 50,
      completedAt: 150,
      totalDurationMs: 100,
      metadata: undefined,
    };

    const inspector = createSagaInspector({
      definitions: [OrderSaga],
      activeTraces: traces,
    });

    const active = inspector.getActiveExecutions();
    // Only running executions returned (not completed)
    expect(active).toHaveLength(1);
    expect(active[0].executionId).toBe("exec-1");
    expect(active[0].sagaName).toBe("OrderSaga");
    expect(active[0].status).toBe("running");
    expect(active[0].completedStepCount).toBe(1);
    expect(active[0].totalSteps).toBe(3);
    expect(active[0].compensationState.active).toBe(false);
  });

  it("SagaInspector.getTrace returns data matching MCP hexdi://saga/executions/{id} contract", () => {
    const trace: ExecutionTrace = {
      executionId: "exec-trace-1",
      sagaName: "OrderSaga",
      input: { orderId: "o-1" },
      status: "completed",
      steps: [
        {
          stepName: "Payment",
          stepIndex: 0,
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          durationMs: 100,
          attemptCount: 1,
          error: undefined,
          skippedReason: undefined,
        },
        {
          stepName: "Shipping",
          stepIndex: 1,
          status: "completed",
          startedAt: 200,
          completedAt: 350,
          durationMs: 150,
          attemptCount: 1,
          error: undefined,
          skippedReason: undefined,
        },
        {
          stepName: "Notify",
          stepIndex: 2,
          status: "completed",
          startedAt: 350,
          completedAt: 400,
          durationMs: 50,
          attemptCount: 1,
          error: undefined,
          skippedReason: undefined,
        },
      ],
      compensation: undefined,
      startedAt: 100,
      completedAt: 400,
      totalDurationMs: 300,
      metadata: undefined,
    };

    const traces: Record<string, ExecutionTrace> = {};
    traces["exec-trace-1"] = trace;

    const inspector = createSagaInspector({
      definitions: [OrderSaga],
      activeTraces: traces,
    });

    const result = inspector.getTrace("exec-trace-1");
    expect(result).not.toBeNull();
    expect(result?.executionId).toBe("exec-trace-1");
    expect(result?.sagaName).toBe("OrderSaga");
    expect(result?.status).toBe("completed");
    expect(result?.steps).toHaveLength(3);
    expect(result?.steps[0].stepName).toBe("Payment");
    expect(result?.steps[1].stepName).toBe("Shipping");
    expect(result?.steps[2].stepName).toBe("Notify");
    expect(result?.totalDurationMs).toBe(300);

    // Nonexistent trace
    expect(inspector.getTrace("nonexistent")).toBeNull();
  });

  it("runner.resume can resume failed execution (backing MCP hexdi://saga/retry tool)", async () => {
    const persister = createInMemoryPersister();
    const callLog: string[] = [];

    const resolver: PortResolver = {
      resolve(portName: string) {
        return (params: any) => {
          if (params?.refund || params?.cancel) return Promise.resolve();
          callLog.push(portName);
          if (portName === "Payment") return Promise.resolve({ txId: "tx-1" });
          if (portName === "Shipping") return Promise.resolve({ trackingId: "track-1" });
          if (portName === "Notify") return Promise.resolve();
          throw new Error(`Port not found: ${portName}`);
        };
      },
    };

    const runner = createSagaRunner(resolver, { persister });

    // Register saga first
    await runner.execute(OrderSaga, { orderId: "reg" }, { executionId: "reg-exec" });
    callLog.length = 0;

    // Simulate a crash after Payment completed
    await persister.save({
      executionId: "retry-exec",
      sagaName: "OrderSaga",
      input: { orderId: "retry-order" },
      currentStep: 1,
      completedSteps: [
        {
          name: "Payment",
          index: 0,
          output: { txId: "tx-persisted" },
          skipped: false,
          completedAt: new Date().toISOString(),
        },
      ],
      status: "running",
      error: null,
      compensation: {
        active: false,
        compensatedSteps: [],
        failedSteps: [],
        triggeringStepIndex: null,
      },
      timestamps: {
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      },
      metadata: {},
      totalSteps: 3,
      pendingStep: null,
    });

    // Resume should skip Payment and execute Shipping + Notify
    const result = await runner.resume("retry-exec");
    expect(result.isOk()).toBe(true);
    expect(callLog).toEqual(["Shipping", "Notify"]);

    if (result.isOk()) {
      expect(result.value.executionId).toBe("retry-exec");
    }
  });

  it("runner.cancel can cancel running execution (backing MCP hexdi://saga/cancel tool)", async () => {
    const abortController = new AbortController();

    const resolver: PortResolver = {
      resolve() {
        return () => new Promise(resolve => setTimeout(() => resolve({ txId: "tx-1" }), 500));
      },
    };

    const runner = createSagaRunner(resolver);

    // Start execution with an AbortSignal for external cancellation
    const resultPromise = runner.execute(
      OrderSaga,
      { orderId: "cancel-order" },
      {
        signal: abortController.signal,
      }
    );

    // Short delay then cancel
    await new Promise(resolve => setTimeout(resolve, 20));
    abortController.abort();

    const result = await resultPromise;
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("Cancelled");
    }
  });
});
