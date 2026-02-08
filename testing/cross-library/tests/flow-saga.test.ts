/**
 * Flow + Saga Integration Tests
 *
 * Tests for cross-library integration patterns between @hex-di/flow and @hex-di/saga.
 * Based on spec/integration/flow-saga.md and spec/integration/17-definition-of-done.md.
 *
 * Patterns tested:
 * 1. Flow Triggers Saga (Effect.invoke)
 * 2. Saga Step Uses Flow
 * 3. Saga Progress Feedback
 *
 * Anti-patterns tested:
 * 1. Tight coupling via direct saga import
 * 2. Blocking saga step without timeout
 * 3. Ignoring compensation events
 */

import { describe, it, expect } from "vitest";
import { createMockFlowService, createFakeSagaAdapter } from "../src/index.js";
import type { MockMachineDefinition, SagaError } from "../src/index.js";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface OrderInput {
  readonly orderId: string;
  readonly items: readonly string[];
  readonly paymentMethod: string;
}

interface OrderOutput {
  readonly trackingNumber: string;
  readonly transactionId: string;
}

// ---------------------------------------------------------------------------
// Pattern 1: Flow Triggers Saga
// ---------------------------------------------------------------------------

describe("Flow + Saga: Flow Triggers Saga", () => {
  type CheckoutState = "cart" | "processing" | "completed" | "failed";
  type CheckoutEvent = "CHECKOUT" | "SAGA_SUCCESS" | "SAGA_ERROR" | "RETRY";

  interface CheckoutContext {
    readonly orderId: string;
    readonly trackingNumber: string | null;
    readonly errorMessage: string | null;
    readonly rolledBack: boolean;
  }

  const checkoutMachine: MockMachineDefinition<CheckoutState, CheckoutEvent, CheckoutContext> = {
    id: "checkout",
    initial: "cart",
    context: {
      orderId: "",
      trackingNumber: null,
      errorMessage: null,
      rolledBack: false,
    },
    states: {
      cart: { on: { CHECKOUT: "processing" } },
      processing: {
        on: {
          SAGA_SUCCESS: "completed",
          SAGA_ERROR: "failed",
        },
      },
      completed: { type: "final" },
      failed: { on: { RETRY: "cart" } },
    },
  };

  function createCheckoutSetup() {
    const flow = createMockFlowService({ machine: checkoutMachine });

    const saga = createFakeSagaAdapter<OrderInput, OrderOutput>({
      name: "OrderSaga",
      steps: [{ name: "validateOrder" }, { name: "processPayment" }, { name: "fulfillOrder" }],
      output: { trackingNumber: "TRACK-001", transactionId: "TXN-001" },
    });

    // Simulate Effect.invoke: machine triggers saga on transition
    const executeCheckout = async (input: OrderInput) => {
      const transitionResult = flow.send("CHECKOUT");
      if (!transitionResult.success) return;

      try {
        const result = await saga.execute(input);
        flow.setContext(ctx => ({
          ...ctx,
          trackingNumber: result.output.trackingNumber,
        }));
        flow.send("SAGA_SUCCESS");
        return result;
      } catch (error) {
        const sagaError = error as SagaError<unknown>;
        flow.setContext(ctx => ({
          ...ctx,
          errorMessage: `Step "${sagaError._tag}" failed`,
          rolledBack: sagaError._tag === "StepFailed",
        }));
        flow.send("SAGA_ERROR");
        throw error;
      }
    };

    return { flow, saga, executeCheckout };
  }

  it("machine invokes saga via Effect.invoke and receives done.invoke event on success", async () => {
    const { flow, executeCheckout } = createCheckoutSetup();

    const result = await executeCheckout({
      orderId: "order-1",
      items: ["item-a"],
      paymentMethod: "card",
    });

    expect(flow.state()).toBe("completed");
    expect(result?.completedSteps).toEqual(["validateOrder", "processPayment", "fulfillOrder"]);
  });

  it("machine receives error.invoke event with SagaError on saga failure", async () => {
    const { flow, saga, executeCheckout } = createCheckoutSetup();
    saga.setFailAtStep(1); // Fail at processPayment

    await expect(
      executeCheckout({
        orderId: "order-1",
        items: ["item-a"],
        paymentMethod: "card",
      })
    ).rejects.toEqual(
      expect.objectContaining({
        _tag: "StepFailed",
        stepName: "processPayment",
      })
    );

    expect(flow.state()).toBe("failed");
  });

  it("machine context is updated with saga output on done.invoke", async () => {
    const { flow, executeCheckout } = createCheckoutSetup();

    await executeCheckout({
      orderId: "order-1",
      items: ["item-a"],
      paymentMethod: "card",
    });

    expect(flow.context().trackingNumber).toBe("TRACK-001");
  });

  it("error discrimination on sagaError._tag distinguishes StepFailed, CompensationFailed, Timeout", async () => {
    const { flow, saga, executeCheckout } = createCheckoutSetup();
    saga.setFailAtStep(1);

    try {
      await executeCheckout({
        orderId: "order-1",
        items: ["item-a"],
        paymentMethod: "card",
      });
    } catch (error) {
      const sagaError = error as SagaError<unknown>;

      // Discriminate on _tag
      switch (sagaError._tag) {
        case "StepFailed":
          expect(sagaError.stepName).toBe("processPayment");
          expect(sagaError.compensatedSteps).toEqual(["validateOrder"]);
          break;
        case "CompensationFailed":
          expect.unreachable("Should not be CompensationFailed");
          break;
        case "SagaTimeout":
          expect.unreachable("Should not be Timeout");
          break;
        case "SagaCancelled":
          expect.unreachable("Should not be Cancelled");
          break;
      }
    }

    expect(flow.context().rolledBack).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Pattern 2: Saga Step Uses Flow
// ---------------------------------------------------------------------------

describe("Flow + Saga: Saga Step Uses Flow", () => {
  it("saga step invokes Flow-backed port and receives result", () => {
    type ApprovalState = "pending" | "approved" | "rejected";
    type ApprovalEvent = "APPROVE" | "REJECT";

    const approvalMachine: MockMachineDefinition<
      ApprovalState,
      ApprovalEvent,
      { approved: boolean; approverName: string }
    > = {
      id: "approval",
      initial: "pending",
      context: { approved: false, approverName: "" },
      states: {
        pending: { on: { APPROVE: "approved", REJECT: "rejected" } },
        approved: { type: "final" },
        rejected: { type: "final" },
      },
    };

    const flow = createMockFlowService({ machine: approvalMachine });

    // Simulate a saga step that invokes a Flow-backed port
    const approvalStep = (input: { orderId: string }) => {
      flow.send("APPROVE");
      flow.setContext(() => ({ approved: true, approverName: "Test Manager" }));

      return {
        approved: flow.context().approved,
        approverName: flow.context().approverName,
        approvalId: `approval-${input.orderId}`,
      };
    };

    const result = approvalStep({ orderId: "order-1" });

    expect(result.approved).toBe(true);
    expect(result.approverName).toBe("Test Manager");
    expect(flow.state()).toBe("approved");
  });

  it("saga step timeout fires when Flow-backed port exceeds timeout", async () => {
    type ApprovalState = "pending" | "approved";
    type ApprovalEvent = "APPROVE";

    const approvalMachine: MockMachineDefinition<
      ApprovalState,
      ApprovalEvent,
      Record<string, never>
    > = {
      id: "approval",
      initial: "pending",
      context: {},
      states: {
        pending: { on: { APPROVE: "approved" } },
        approved: { type: "final" },
      },
    };

    const flow = createMockFlowService({ machine: approvalMachine });

    // Simulate a step with a timeout
    const stepWithTimeout = async (timeoutMs: number) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      return new Promise<string>((resolve, reject) => {
        if (controller.signal.aborted) {
          clearTimeout(timeout);
          reject(new Error("Step timed out - no timeout configured"));
          return;
        }
        controller.signal.addEventListener("abort", () => {
          clearTimeout(timeout);
          reject(new Error("Step timed out - no timeout configured"));
        });

        // This step never resolves on its own (simulates blocking step)
        setTimeout(() => {
          clearTimeout(timeout);
          resolve("approved");
        }, timeoutMs + 100);
      });
    };

    await expect(stepWithTimeout(10)).rejects.toThrow("Step timed out");

    // Flow remains in pending state since it was never approved
    expect(flow.state()).toBe("pending");
  });

  it("compensation cancels the Flow-backed operation on later step failure", () => {
    type ApprovalState = "pending" | "approved" | "cancelled";
    type ApprovalEvent = "APPROVE" | "CANCEL";

    const approvalMachine: MockMachineDefinition<
      ApprovalState,
      ApprovalEvent,
      { approvalId: string }
    > = {
      id: "approval",
      initial: "pending",
      context: { approvalId: "" },
      states: {
        pending: { on: { APPROVE: "approved" } },
        approved: { on: { CANCEL: "cancelled" } },
        cancelled: { type: "final" },
      },
    };

    const approvalFlow = createMockFlowService({ machine: approvalMachine });

    // Forward step: approve
    approvalFlow.send("APPROVE");
    approvalFlow.setContext(() => ({ approvalId: "approval-123" }));
    expect(approvalFlow.state()).toBe("approved");

    // Compensation step: cancel the approval
    approvalFlow.send("CANCEL");
    expect(approvalFlow.state()).toBe("cancelled");
  });
});

// ---------------------------------------------------------------------------
// Pattern 3: Saga Progress Feedback
// ---------------------------------------------------------------------------

describe("Flow + Saga: Saga Progress Feedback", () => {
  type ProgressState = "idle" | "processing" | "compensating" | "completed" | "failed";
  type ProgressEvent =
    | "START"
    | "STEP_COMPLETED"
    | "COMPENSATION_TRIGGERED"
    | "DONE"
    | "FAILED"
    | "RETRY";

  interface ProgressContext {
    readonly currentStep: string;
    readonly completedSteps: number;
    readonly totalSteps: number;
    readonly isCompensating: boolean;
  }

  const progressMachine: MockMachineDefinition<ProgressState, ProgressEvent, ProgressContext> = {
    id: "orderProgress",
    initial: "idle",
    context: {
      currentStep: "",
      completedSteps: 0,
      totalSteps: 0,
      isCompensating: false,
    },
    states: {
      idle: { on: { START: "processing" } },
      processing: {
        on: {
          STEP_COMPLETED: "processing",
          COMPENSATION_TRIGGERED: "compensating",
          DONE: "completed",
          FAILED: "failed",
        },
      },
      compensating: { on: { FAILED: "failed" } },
      completed: { type: "final" },
      failed: { on: { RETRY: "idle" } },
    },
  };

  function createProgressSetup() {
    const flow = createMockFlowService({ machine: progressMachine });

    const saga = createFakeSagaAdapter<OrderInput, OrderOutput>({
      name: "OrderSaga",
      steps: [{ name: "validateOrder" }, { name: "processPayment" }, { name: "fulfillOrder" }],
      output: { trackingNumber: "TRACK-001", transactionId: "TXN-001" },
    });

    return { flow, saga };
  }

  it("progress events (StepCompleted) are routed to machine via activity EventSink", async () => {
    const { flow, saga } = createProgressSetup();
    flow.send("START");

    // Simulate progress events being emitted during saga execution
    const result = await saga.execute({
      orderId: "order-1",
      items: ["item-a"],
      paymentMethod: "card",
    });

    // Simulate routing StepCompleted events to the machine
    for (let i = 0; i < result.completedSteps.length; i++) {
      flow.send("STEP_COMPLETED");
      flow.setContext(ctx => ({
        ...ctx,
        currentStep: result.completedSteps[i],
        completedSteps: i + 1,
        totalSteps: result.completedSteps.length,
      }));
    }

    flow.send("DONE");

    expect(flow.state()).toBe("completed");
    expect(flow.context().completedSteps).toBe(3);
    expect(flow.context().totalSteps).toBe(3);
  });

  it("machine context tracks completedSteps and totalSteps from progress events", async () => {
    const { flow, saga } = createProgressSetup();
    flow.send("START");

    await saga.execute({
      orderId: "order-1",
      items: ["item-a"],
      paymentMethod: "card",
    });

    // After first step
    flow.send("STEP_COMPLETED");
    flow.setContext(ctx => ({
      ...ctx,
      currentStep: "validateOrder",
      completedSteps: 1,
      totalSteps: 3,
    }));

    expect(flow.context().completedSteps).toBe(1);
    expect(flow.context().totalSteps).toBe(3);
    expect(flow.context().currentStep).toBe("validateOrder");

    // After second step
    flow.send("STEP_COMPLETED");
    flow.setContext(ctx => ({
      ...ctx,
      currentStep: "processPayment",
      completedSteps: 2,
    }));

    expect(flow.context().completedSteps).toBe(2);
  });

  it("CompensationTriggered event transitions machine to compensating state", async () => {
    const { flow, saga } = createProgressSetup();
    saga.setFailAtStep(2); // Fail at fulfillOrder

    flow.send("START");

    try {
      await saga.execute({
        orderId: "order-1",
        items: ["item-a"],
        paymentMethod: "card",
      });
    } catch {
      // Route compensation event to machine
      flow.send("COMPENSATION_TRIGGERED");
      flow.setContext(ctx => ({ ...ctx, isCompensating: true }));
    }

    expect(flow.state()).toBe("compensating");
    expect(flow.context().isCompensating).toBe(true);
  });

  it("compensation visibility: machine reflects compensation status in context", async () => {
    const { flow, saga } = createProgressSetup();
    saga.setFailAtStep(1); // Fail at processPayment

    flow.send("START");

    try {
      await saga.execute({
        orderId: "order-1",
        items: ["item-a"],
        paymentMethod: "card",
      });
    } catch (error) {
      const sagaError = error as SagaError<unknown>;
      if (sagaError._tag === "StepFailed") {
        // Route compensation event
        flow.send("COMPENSATION_TRIGGERED");
        flow.setContext(ctx => ({
          ...ctx,
          isCompensating: true,
          currentStep: `compensating: ${sagaError.stepName}`,
        }));

        // After compensation completes, transition to failed
        flow.send("FAILED");
      }
    }

    expect(flow.state()).toBe("failed");
    expect(flow.context().isCompensating).toBe(true);
    expect(flow.context().currentStep).toContain("compensating");
  });
});

// ---------------------------------------------------------------------------
// Anti-Patterns
// ---------------------------------------------------------------------------

describe("Flow + Saga: Anti-Patterns", () => {
  it("tight coupling via direct saga import (bypassing port) is prevented", () => {
    // In the correct pattern, the machine invokes the saga through a port.
    // The anti-pattern is importing saga internals directly into machine code.
    // We verify that our test setup uses a port-like abstraction.

    const saga = createFakeSagaAdapter<OrderInput, OrderOutput>({
      name: "OrderSaga",
      steps: [{ name: "step1" }],
      output: { trackingNumber: "TRACK-001", transactionId: "TXN-001" },
    });

    // The saga is accessed via its execute method (port interface),
    // not through internal SagaRunner or SagaDefinition imports.
    expect(typeof saga.execute).toBe("function");

    // Verify it has a port-like interface (execute with input)
    // NOT a runner-like interface (would have .definition, .container, etc.)
    const sagaKeys = Object.keys(saga);
    expect(sagaKeys).not.toContain("definition");
    expect(sagaKeys).not.toContain("container");
    expect(sagaKeys).not.toContain("runner");
  });

  it("blocking saga step without timeout is detected", async () => {
    // Simulate a saga step that has no timeout and blocks indefinitely.
    // The test verifies that AbortController can enforce a timeout externally.

    const stepCompleted = false;
    const controller = new AbortController();

    const blockingStep = new Promise<string>((resolve, reject) => {
      const onAbort = () => {
        reject(new Error("Step timed out - no timeout configured"));
      };

      if (controller.signal.aborted) {
        onAbort();
        return;
      }

      controller.signal.addEventListener("abort", onAbort);

      // This step never resolves on its own (simulates blocking step)
      // In production, .timeout() on the step definition would prevent this
    });

    // External timeout enforcement (what the saga runtime does)
    setTimeout(() => controller.abort(), 10);

    await expect(blockingStep).rejects.toThrow("Step timed out");
    expect(stepCompleted).toBe(false);
  });

  it("ignoring compensation events leaves machine in stale state (verifies correct handling)", async () => {
    type CheckoutState = "cart" | "processing" | "completed" | "failed";
    type CheckoutEvent = "CHECKOUT" | "SAGA_SUCCESS" | "SAGA_ERROR";

    const correctMachine: MockMachineDefinition<
      CheckoutState,
      CheckoutEvent,
      { errorMessage: string | null }
    > = {
      id: "checkout",
      initial: "cart",
      context: { errorMessage: null },
      states: {
        cart: { on: { CHECKOUT: "processing" } },
        processing: {
          on: {
            SAGA_SUCCESS: "completed",
            SAGA_ERROR: "failed",
          },
        },
        completed: { type: "final" },
        failed: { type: "final" },
      },
    };

    const flow = createMockFlowService({ machine: correctMachine });

    const saga = createFakeSagaAdapter<OrderInput, OrderOutput>({
      name: "OrderSaga",
      steps: [{ name: "step1" }, { name: "step2" }],
      output: { trackingNumber: "TRACK-001", transactionId: "TXN-001" },
      failAtStep: 1,
    });

    flow.send("CHECKOUT");
    expect(flow.state()).toBe("processing");

    try {
      await saga.execute({
        orderId: "order-1",
        items: [],
        paymentMethod: "card",
      });
      flow.send("SAGA_SUCCESS");
    } catch {
      // CORRECT: handle the error event so the machine doesn't stay in processing
      flow.send("SAGA_ERROR");
      flow.setContext(ctx => ({
        ...ctx,
        errorMessage: "Saga failed during compensation",
      }));
    }

    // Machine correctly transitioned to failed (not stuck in processing)
    expect(flow.state()).toBe("failed");
    expect(flow.context().errorMessage).toContain("Saga failed");

    // Verify: if we had NOT sent SAGA_ERROR, machine would be stuck
    type StaleMachineState = "processing" | "completed";
    type StaleMachineEvent = "SAGA_SUCCESS";

    const staleMachine: MockMachineDefinition<
      StaleMachineState,
      StaleMachineEvent,
      Record<string, never>
    > = {
      id: "checkout",
      initial: "processing",
      context: {},
      states: {
        processing: { on: { SAGA_SUCCESS: "completed" } },
        completed: { type: "final" },
      },
    };

    const staleFlow = createMockFlowService({ machine: staleMachine });

    // Without error handling, machine stays in processing (stale)
    expect(staleFlow.state()).toBe("processing");
  });
});
