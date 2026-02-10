/**
 * Runner Bridges Tests
 *
 * Tests for src/runtime/runner-bridges.ts — type-erasing bridge functions.
 * Targets: hasExecuteMethod, extractNodes, narrowRunnerExecute/Resume,
 * createResumeNotImplemented, and Result builder helpers.
 */

import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createPort } from "@hex-di/core";
import {
  hasExecuteMethod,
  extractNodes,
  narrowRunnerExecute,
  narrowRunnerResume,
  createResumeNotImplemented,
  okVoidManagement,
  errVoidManagement,
  okStatusManagement,
  errStatusManagement,
} from "../src/runtime/runner-bridges.js";
import { defineStep } from "../src/step/builder.js";
import { defineSaga } from "../src/saga/builder.js";
import type { ManagementError, SagaStatus } from "../src/errors/types.js";

// =============================================================================
// hasExecuteMethod
// =============================================================================

describe("hasExecuteMethod", () => {
  it("returns false for null", () => {
    expect(hasExecuteMethod(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(hasExecuteMethod(undefined)).toBe(false);
  });

  it("returns false for a string", () => {
    expect(hasExecuteMethod("string")).toBe(false);
  });

  it("returns false for a number", () => {
    expect(hasExecuteMethod(42)).toBe(false);
  });

  it("returns false for an empty object (no execute)", () => {
    expect(hasExecuteMethod({})).toBe(false);
  });

  it("returns false when execute is not a function", () => {
    expect(hasExecuteMethod({ execute: 42 })).toBe(false);
  });

  it("returns true when execute is a function", () => {
    expect(hasExecuteMethod({ execute: () => {} })).toBe(true);
  });

  it("returns true when execute is a function alongside other properties", () => {
    expect(hasExecuteMethod({ execute: () => {}, other: 1 })).toBe(true);
  });
});

// =============================================================================
// extractNodes
// =============================================================================

describe("extractNodes", () => {
  const TestPort = createPort<"Test", any>({ name: "Test" });

  it("returns _nodes array from saga built via builder", () => {
    const Step1 = defineStep("Step1")
      .io<string, string>()
      .invoke(TestPort, ctx => ctx.input)
      .build();

    const Step2 = defineStep("Step2")
      .io<string, string>()
      .invoke(TestPort, ctx => ctx.input)
      .build();

    const saga = defineSaga("TestSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const nodes = extractNodes(saga);
    expect(nodes).toHaveLength(2);
    expect(nodes[0]._type).toBe("step");
    expect(nodes[1]._type).toBe("step");

    if (nodes[0]._type === "step") {
      expect(nodes[0].step.name).toBe("Step1");
    }
    if (nodes[1]._type === "step") {
      expect(nodes[1].step.name).toBe("Step2");
    }
  });

  it("falls back to steps.map when _nodes is not an array", () => {
    const Step1 = defineStep("FallbackStep")
      .io<string, string>()
      .invoke(TestPort, ctx => ctx.input)
      .build();

    // Manually construct a saga-like object without _nodes
    const manualSaga = {
      name: "ManualSaga",
      steps: [Step1],
      outputMapper: () => ({}),
      options: { compensationStrategy: "sequential" as const },
    };

    const nodes = extractNodes(manualSaga);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]._type).toBe("step");
    if (nodes[0]._type === "step") {
      expect(nodes[0].step.name).toBe("FallbackStep");
    }
  });

  it("falls back when _nodes exists but is not an array", () => {
    const Step1 = defineStep("NonArrayStep")
      .io<string, string>()
      .invoke(TestPort, ctx => ctx.input)
      .build();

    const manualSaga = Object.create(null);
    manualSaga.name = "ManualSaga2";
    manualSaga.steps = [Step1];
    manualSaga.outputMapper = () => ({});
    manualSaga.options = { compensationStrategy: "sequential" };
    Object.defineProperty(manualSaga, "_nodes", { value: "not-an-array", enumerable: false });

    const nodes = extractNodes(manualSaga);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]._type).toBe("step");
  });
});

// =============================================================================
// narrowRunnerExecute / narrowRunnerResume
// =============================================================================

describe("narrowRunnerExecute", () => {
  it("passes through ok ResultAsync", async () => {
    const ok = ResultAsync.ok({ output: "hello", executionId: "e1" });
    const result = await narrowRunnerExecute(ok);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output).toBe("hello");
      expect(result.value.executionId).toBe("e1");
    }
  });

  it("passes through err ResultAsync", async () => {
    const err = ResultAsync.err({
      _tag: "StepFailed" as const,
      executionId: "e2",
      sagaName: "test",
      stepName: "s1",
      stepIndex: 0,
      message: "failed",
      completedSteps: [],
      compensatedSteps: [],
      cause: new Error("oops"),
    });
    const result = await narrowRunnerExecute(err);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
    }
  });
});

describe("narrowRunnerResume", () => {
  it("passes through ok ResultAsync", async () => {
    const ok = ResultAsync.ok({ output: "resumed", executionId: "r1" });
    const result = await narrowRunnerResume(ok);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output).toBe("resumed");
    }
  });

  it("passes through err ResultAsync", async () => {
    const err = ResultAsync.err({
      _tag: "StepFailed" as const,
      executionId: "r2",
      sagaName: "test",
      stepName: "s1",
      stepIndex: 0,
      message: "failed",
      completedSteps: [],
      compensatedSteps: [],
      cause: undefined,
    });
    const result = await narrowRunnerResume(err);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
      expect(result.error.executionId).toBe("r2");
    }
  });
});

// =============================================================================
// createResumeNotImplemented
// =============================================================================

describe("createResumeNotImplemented", () => {
  it("returns an err ResultAsync with StepFailed tag", async () => {
    const result = await createResumeNotImplemented("exec-123");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
      expect(result.error.executionId).toBe("exec-123");
      expect(result.error.message).toContain("Resume not implemented");
      if (result.error._tag === "StepFailed") {
        expect(result.error.cause).toBeInstanceOf(Error);
      }
      expect(result.error.sagaName).toBe("");
      expect(result.error.stepName).toBe("");
      expect(result.error.stepIndex).toBe(-1);
      expect(result.error.completedSteps).toEqual([]);
      expect(result.error.compensatedSteps).toEqual([]);
    }
  });
});

// =============================================================================
// Result builder helpers
// =============================================================================

describe("okVoidManagement", () => {
  it("returns ok ResultAsync with undefined value", async () => {
    const result = await okVoidManagement();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeUndefined();
    }
  });
});

describe("errVoidManagement", () => {
  it("returns err ResultAsync with the given ManagementError", async () => {
    const error: ManagementError = {
      _tag: "ExecutionNotFound",
      message: "not found",
      executionId: "e-1",
    };
    const result = await errVoidManagement(error);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("ExecutionNotFound");
      expect(result.error.message).toBe("not found");
      if (result.error._tag === "ExecutionNotFound") {
        expect(result.error.executionId).toBe("e-1");
      }
    }
  });
});

describe("okStatusManagement", () => {
  it("returns ok ResultAsync with the given SagaStatus", async () => {
    const status: SagaStatus = {
      state: "completed",
      executionId: "e-2",
      sagaName: "TestSaga",
      completedSteps: ["s1", "s2"],
      startedAt: 1000,
      completedAt: 2000,
      durationMs: 1000,
    };
    const result = await okStatusManagement(status);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.state).toBe("completed");
      expect(result.value.executionId).toBe("e-2");
      expect(result.value.sagaName).toBe("TestSaga");
      if (result.value.state === "completed") {
        expect(result.value.completedSteps).toEqual(["s1", "s2"]);
        expect(result.value.durationMs).toBe(1000);
      }
    }
  });
});

describe("errStatusManagement", () => {
  it("returns err ResultAsync with the given ManagementError", async () => {
    const error: ManagementError = {
      _tag: "ExecutionNotFound",
      message: "missing",
      executionId: "e-3",
    };
    const result = await errStatusManagement(error);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("ExecutionNotFound");
      expect(result.error.message).toBe("missing");
    }
  });
});
