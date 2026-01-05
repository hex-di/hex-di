/**
 * Flow Error Hierarchy Tests
 *
 * These tests verify:
 * 1. FlowError base class properties (code, machineId, message)
 * 2. InvalidTransitionError provides helpful message
 * 3. Errors include machine and state context
 * 4. Error hierarchy enables type narrowing
 * 5. All specific error types work correctly
 *
 * @packageDocumentation
 */

import { describe, expect, it } from "vitest";
import {
  FlowError,
  InvalidTransitionError,
  InvalidStateError,
  InvalidEventError,
  ActivityError,
  EffectExecutionError,
  DisposedMachineError,
} from "../src/errors/index.js";

// =============================================================================
// FlowError Base Class Tests
// =============================================================================

describe("FlowError base class", () => {
  it("has code and machineId properties on derived classes", () => {
    const error = new InvalidTransitionError({
      machineId: "testMachine",
      currentState: "idle",
      eventType: "UNKNOWN_EVENT",
    });

    expect(error.code).toBe("INVALID_TRANSITION");
    expect(error.machineId).toBe("testMachine");
    expect(error.message).toContain("idle");
    expect(error.message).toContain("UNKNOWN_EVENT");
  });

  it("extends Error and has proper name", () => {
    const error = new InvalidTransitionError({
      machineId: "testMachine",
      currentState: "idle",
      eventType: "UNKNOWN",
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(FlowError);
    expect(error.name).toBe("InvalidTransitionError");
  });

  it("allows optional machineId", () => {
    const error = new InvalidStateError({
      stateName: "nonexistent",
    });

    expect(error.machineId).toBeUndefined();
  });
});

// =============================================================================
// InvalidTransitionError Tests
// =============================================================================

describe("InvalidTransitionError", () => {
  it("has correct code", () => {
    const error = new InvalidTransitionError({
      machineId: "modal",
      currentState: "closed",
      eventType: "CLOSE",
    });

    expect(error.code).toBe("INVALID_TRANSITION");
  });

  it("provides helpful message with state and event context", () => {
    const error = new InvalidTransitionError({
      machineId: "modal",
      currentState: "closed",
      eventType: "CLOSE",
    });

    expect(error.message).toContain("modal");
    expect(error.message).toContain("closed");
    expect(error.message).toContain("CLOSE");
    expect(error.message).toContain("No valid transition");
  });

  it("stores currentState and eventType", () => {
    const error = new InvalidTransitionError({
      machineId: "wizard",
      currentState: "step1",
      eventType: "PREVIOUS",
    });

    expect(error.currentState).toBe("step1");
    expect(error.eventType).toBe("PREVIOUS");
    expect(error.machineId).toBe("wizard");
  });
});

// =============================================================================
// InvalidStateError Tests
// =============================================================================

describe("InvalidStateError", () => {
  it("has correct code", () => {
    const error = new InvalidStateError({
      machineId: "form",
      stateName: "nonexistent",
    });

    expect(error.code).toBe("INVALID_STATE");
  });

  it("stores stateName and machineId", () => {
    const error = new InvalidStateError({
      machineId: "form",
      stateName: "invalidState",
    });

    expect(error.stateName).toBe("invalidState");
    expect(error.machineId).toBe("form");
  });

  it("provides helpful message", () => {
    const error = new InvalidStateError({
      machineId: "toggle",
      stateName: "unknown",
    });

    expect(error.message).toContain("unknown");
    expect(error.message).toContain("toggle");
    expect(error.message).toContain("does not exist");
  });
});

// =============================================================================
// InvalidEventError Tests
// =============================================================================

describe("InvalidEventError", () => {
  it("has correct code", () => {
    const error = new InvalidEventError({
      machineId: "counter",
      eventType: "INVALID_ACTION",
    });

    expect(error.code).toBe("INVALID_EVENT");
  });

  it("stores eventType and machineId", () => {
    const error = new InvalidEventError({
      machineId: "counter",
      eventType: "UNDEFINED_EVENT",
    });

    expect(error.eventType).toBe("UNDEFINED_EVENT");
    expect(error.machineId).toBe("counter");
  });

  it("provides helpful message", () => {
    const error = new InvalidEventError({
      machineId: "auth",
      eventType: "LOGOUT",
    });

    expect(error.message).toContain("LOGOUT");
    expect(error.message).toContain("auth");
    expect(error.message).toContain("not defined");
  });
});

// =============================================================================
// ActivityError Tests
// =============================================================================

describe("ActivityError", () => {
  it("has correct code", () => {
    const cause = new Error("Network timeout");
    const error = new ActivityError({
      machineId: "fetcher",
      activityId: "fetchData",
      cause,
    });

    expect(error.code).toBe("ACTIVITY_FAILED");
  });

  it("stores activityId and cause", () => {
    const cause = new Error("Connection refused");
    const error = new ActivityError({
      machineId: "uploader",
      activityId: "uploadFile",
      cause,
    });

    expect(error.activityId).toBe("uploadFile");
    expect(error.cause).toBe(cause);
    expect(error.machineId).toBe("uploader");
  });

  it("provides helpful message with activity context", () => {
    const cause = new Error("Permission denied");
    const error = new ActivityError({
      machineId: "fileManager",
      activityId: "readFile",
      cause,
    });

    expect(error.message).toContain("readFile");
    expect(error.message).toContain("fileManager");
    expect(error.message).toContain("Permission denied");
  });

  it("handles non-Error cause", () => {
    const cause = "string error";
    const error = new ActivityError({
      machineId: "processor",
      activityId: "process",
      cause,
    });

    expect(error.cause).toBe(cause);
    expect(error.message).toContain("string error");
  });
});

// =============================================================================
// EffectExecutionError Tests
// =============================================================================

describe("EffectExecutionError", () => {
  it("has correct code", () => {
    const cause = new Error("Service unavailable");
    const error = new EffectExecutionError({
      machineId: "api",
      effectTag: "Invoke",
      cause,
    });

    expect(error.code).toBe("EFFECT_EXECUTION_FAILED");
  });

  it("stores effectTag and cause", () => {
    const cause = new Error("Timeout");
    const error = new EffectExecutionError({
      machineId: "loader",
      effectTag: "Spawn",
      cause,
    });

    expect(error.effectTag).toBe("Spawn");
    expect(error.cause).toBe(cause);
    expect(error.machineId).toBe("loader");
  });

  it("provides helpful message with effect context", () => {
    const cause = new Error("Port not found");
    const error = new EffectExecutionError({
      machineId: "resolver",
      effectTag: "Invoke",
      cause,
    });

    expect(error.message).toContain("Invoke");
    expect(error.message).toContain("resolver");
    expect(error.message).toContain("Port not found");
  });
});

// =============================================================================
// DisposedMachineError Tests
// =============================================================================

describe("DisposedMachineError", () => {
  it("has correct code", () => {
    const error = new DisposedMachineError({
      machineId: "disposed",
      operation: "send",
    });

    expect(error.code).toBe("DISPOSED_MACHINE");
  });

  it("stores operation and machineId", () => {
    const error = new DisposedMachineError({
      machineId: "closedMachine",
      operation: "sendAndExecute",
    });

    expect(error.operation).toBe("sendAndExecute");
    expect(error.machineId).toBe("closedMachine");
  });

  it("provides helpful message indicating disposed state", () => {
    const error = new DisposedMachineError({
      machineId: "oldMachine",
      operation: "subscribe",
    });

    expect(error.message).toContain("oldMachine");
    expect(error.message).toContain("subscribe");
    expect(error.message).toContain("disposed");
  });
});

// =============================================================================
// Error Hierarchy Type Narrowing Tests
// =============================================================================

describe("Error hierarchy enables type narrowing", () => {
  it("all error classes extend FlowError", () => {
    const invalidTransition = new InvalidTransitionError({
      machineId: "m",
      currentState: "s",
      eventType: "e",
    });
    const invalidState = new InvalidStateError({ stateName: "s" });
    const invalidEvent = new InvalidEventError({ eventType: "e" });
    const activityError = new ActivityError({
      activityId: "a",
      cause: new Error(),
    });
    const effectError = new EffectExecutionError({
      effectTag: "Invoke",
      cause: new Error(),
    });
    const disposedError = new DisposedMachineError({
      machineId: "m",
      operation: "send",
    });

    expect(invalidTransition).toBeInstanceOf(FlowError);
    expect(invalidState).toBeInstanceOf(FlowError);
    expect(invalidEvent).toBeInstanceOf(FlowError);
    expect(activityError).toBeInstanceOf(FlowError);
    expect(effectError).toBeInstanceOf(FlowError);
    expect(disposedError).toBeInstanceOf(FlowError);
  });

  it("all error classes extend Error", () => {
    const invalidTransition = new InvalidTransitionError({
      machineId: "m",
      currentState: "s",
      eventType: "e",
    });
    const invalidState = new InvalidStateError({ stateName: "s" });
    const invalidEvent = new InvalidEventError({ eventType: "e" });
    const activityError = new ActivityError({
      activityId: "a",
      cause: new Error(),
    });
    const effectError = new EffectExecutionError({
      effectTag: "Invoke",
      cause: new Error(),
    });
    const disposedError = new DisposedMachineError({
      machineId: "m",
      operation: "send",
    });

    expect(invalidTransition).toBeInstanceOf(Error);
    expect(invalidState).toBeInstanceOf(Error);
    expect(invalidEvent).toBeInstanceOf(Error);
    expect(activityError).toBeInstanceOf(Error);
    expect(effectError).toBeInstanceOf(Error);
    expect(disposedError).toBeInstanceOf(Error);
  });

  it("each error class has correct name getter", () => {
    const invalidTransition = new InvalidTransitionError({
      machineId: "m",
      currentState: "s",
      eventType: "e",
    });
    const invalidState = new InvalidStateError({ stateName: "s" });
    const invalidEvent = new InvalidEventError({ eventType: "e" });
    const activityError = new ActivityError({
      activityId: "a",
      cause: new Error(),
    });
    const effectError = new EffectExecutionError({
      effectTag: "Invoke",
      cause: new Error(),
    });
    const disposedError = new DisposedMachineError({
      machineId: "m",
      operation: "send",
    });

    expect(invalidTransition.name).toBe("InvalidTransitionError");
    expect(invalidState.name).toBe("InvalidStateError");
    expect(invalidEvent.name).toBe("InvalidEventError");
    expect(activityError.name).toBe("ActivityError");
    expect(effectError.name).toBe("EffectExecutionError");
    expect(disposedError.name).toBe("DisposedMachineError");
  });

  it("type narrowing works with instanceof", () => {
    const errors: FlowError[] = [
      new InvalidTransitionError({ machineId: "m", currentState: "s", eventType: "e" }),
      new InvalidStateError({ stateName: "s" }),
      new ActivityError({ activityId: "a", cause: new Error() }),
    ];

    for (const error of errors) {
      if (error instanceof InvalidTransitionError) {
        // TypeScript narrows to InvalidTransitionError
        expect(error.currentState).toBeDefined();
        expect(error.eventType).toBeDefined();
      } else if (error instanceof InvalidStateError) {
        // TypeScript narrows to InvalidStateError
        expect(error.stateName).toBeDefined();
      } else if (error instanceof ActivityError) {
        // TypeScript narrows to ActivityError
        expect(error.activityId).toBeDefined();
        expect(error.cause).toBeDefined();
      }
    }
  });

  it("error codes enable programmatic handling", () => {
    const errors: FlowError[] = [
      new InvalidTransitionError({ machineId: "m", currentState: "s", eventType: "e" }),
      new DisposedMachineError({ machineId: "m", operation: "send" }),
    ];

    const codes = errors.map(e => e.code);
    expect(codes).toContain("INVALID_TRANSITION");
    expect(codes).toContain("DISPOSED_MACHINE");
  });
});
