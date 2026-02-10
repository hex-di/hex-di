/**
 * DOD 10: Error Classes → Tagged Errors
 */

import { describe, expect, it } from "vitest";
import {
  DisposedStateAccess,
  DerivedComputationFailed,
  AsyncDerivedExhausted,
  CircularDerivedDependency,
  BatchExecutionFailed,
  EffectErrorHandlerError,
  WaitForStateTimeout,
} from "../src/index.js";
import type { EffectFailedError, AsyncDerivedSelectError, HydrationError } from "../src/index.js";

// =============================================================================
// DisposedStateAccess
// =============================================================================

describe("DisposedStateAccess", () => {
  it("has _tag DisposedStateAccess", () => {
    const err = DisposedStateAccess({
      portName: "Counter",
      containerName: "root",
      operation: "state",
    });
    expect(err._tag).toBe("DisposedStateAccess");
  });

  it("has code DISPOSED_STATE_ACCESS", () => {
    const err = DisposedStateAccess({
      portName: "Counter",
      containerName: "root",
      operation: "state",
    });
    expect(err.code).toBe("DISPOSED_STATE_ACCESS");
  });

  it("has isProgrammingError: true", () => {
    const err = DisposedStateAccess({
      portName: "Counter",
      containerName: "root",
      operation: "state",
    });
    expect(err.isProgrammingError).toBe(true);
  });

  it("includes portName, containerName, operation", () => {
    const err = DisposedStateAccess({
      portName: "Counter",
      containerName: "root",
      operation: "actions",
    });
    expect(err.portName).toBe("Counter");
    expect(err.containerName).toBe("root");
    expect(err.operation).toBe("actions");
  });

  it("is a frozen plain object", () => {
    const err = DisposedStateAccess({
      portName: "Counter",
      containerName: "root",
      operation: "state",
    });
    expect(Object.isFrozen(err)).toBe(true);
  });
});

// =============================================================================
// DerivedComputationFailed
// =============================================================================

describe("DerivedComputationFailed", () => {
  it("has _tag DerivedComputationFailed", () => {
    const err = DerivedComputationFailed({ portName: "CartTotal", cause: new Error("fail") });
    expect(err._tag).toBe("DerivedComputationFailed");
  });

  it("has code DERIVED_COMPUTATION_FAILED", () => {
    const err = DerivedComputationFailed({ portName: "CartTotal", cause: new Error("fail") });
    expect(err.code).toBe("DERIVED_COMPUTATION_FAILED");
  });

  it("has isProgrammingError: false", () => {
    const err = DerivedComputationFailed({ portName: "CartTotal", cause: new Error("fail") });
    expect(err.isProgrammingError).toBe(false);
  });

  it("includes portName and cause", () => {
    const cause = new Error("division by zero");
    const err = DerivedComputationFailed({ portName: "CartTotal", cause });
    expect(err.portName).toBe("CartTotal");
    expect(err.cause).toBe(cause);
  });

  it("is a frozen plain object", () => {
    const err = DerivedComputationFailed({ portName: "CartTotal", cause: new Error("fail") });
    expect(Object.isFrozen(err)).toBe(true);
  });
});

// =============================================================================
// AsyncDerivedExhausted
// =============================================================================

describe("AsyncDerivedExhausted", () => {
  it("has _tag AsyncDerivedExhausted", () => {
    const err = AsyncDerivedExhausted({
      portName: "Rate",
      attempts: 3,
      cause: new Error("timeout"),
    });
    expect(err._tag).toBe("AsyncDerivedExhausted");
  });

  it("has code ASYNC_DERIVED_EXHAUSTED", () => {
    const err = AsyncDerivedExhausted({
      portName: "Rate",
      attempts: 3,
      cause: new Error("timeout"),
    });
    expect(err.code).toBe("ASYNC_DERIVED_EXHAUSTED");
  });

  it("has isProgrammingError: true", () => {
    const err = AsyncDerivedExhausted({
      portName: "Rate",
      attempts: 3,
      cause: new Error("timeout"),
    });
    expect(err.isProgrammingError).toBe(true);
  });

  it("includes portName, attempts, cause", () => {
    const cause = new Error("network");
    const err = AsyncDerivedExhausted({ portName: "Rate", attempts: 5, cause });
    expect(err.portName).toBe("Rate");
    expect(err.attempts).toBe(5);
    expect(err.cause).toBe(cause);
  });

  it("is a frozen plain object", () => {
    const err = AsyncDerivedExhausted({ portName: "Rate", attempts: 3, cause: new Error("x") });
    expect(Object.isFrozen(err)).toBe(true);
  });
});

// =============================================================================
// CircularDerivedDependency
// =============================================================================

describe("CircularDerivedDependency", () => {
  it("has _tag CircularDerivedDependency", () => {
    const err = CircularDerivedDependency({ dependencyChain: ["A", "B", "A"] });
    expect(err._tag).toBe("CircularDerivedDependency");
  });

  it("has code CIRCULAR_DERIVED_DEPENDENCY", () => {
    const err = CircularDerivedDependency({ dependencyChain: ["A", "B", "A"] });
    expect(err.code).toBe("CIRCULAR_DERIVED_DEPENDENCY");
  });

  it("has isProgrammingError: true", () => {
    const err = CircularDerivedDependency({ dependencyChain: ["A", "B", "A"] });
    expect(err.isProgrammingError).toBe(true);
  });

  it("includes dependencyChain", () => {
    const chain = ["A", "B", "C", "A"];
    const err = CircularDerivedDependency({ dependencyChain: chain });
    expect(err.dependencyChain).toEqual(chain);
  });

  it("freezes the dependencyChain", () => {
    const err = CircularDerivedDependency({ dependencyChain: ["A", "B"] });
    expect(Object.isFrozen(err.dependencyChain)).toBe(true);
  });

  it("is a frozen plain object", () => {
    const err = CircularDerivedDependency({ dependencyChain: ["A"] });
    expect(Object.isFrozen(err)).toBe(true);
  });
});

// =============================================================================
// BatchExecutionFailed
// =============================================================================

describe("BatchExecutionFailed", () => {
  it("has _tag BatchExecutionFailed", () => {
    const err = BatchExecutionFailed({ cause: new Error("boom") });
    expect(err._tag).toBe("BatchExecutionFailed");
  });

  it("has code BATCH_EXECUTION_FAILED", () => {
    const err = BatchExecutionFailed({ cause: new Error("boom") });
    expect(err.code).toBe("BATCH_EXECUTION_FAILED");
  });

  it("has isProgrammingError: false", () => {
    const err = BatchExecutionFailed({ cause: new Error("boom") });
    expect(err.isProgrammingError).toBe(false);
  });

  it("includes cause", () => {
    const cause = new Error("crash");
    const err = BatchExecutionFailed({ cause });
    expect(err.cause).toBe(cause);
  });

  it("is a frozen plain object", () => {
    const err = BatchExecutionFailed({ cause: new Error("x") });
    expect(Object.isFrozen(err)).toBe(true);
  });
});

// =============================================================================
// EffectErrorHandlerError (tagged)
// =============================================================================

describe("EffectErrorHandlerError (tagged)", () => {
  const originalError: EffectFailedError = {
    _tag: "EffectFailed",
    portName: "Counter",
    actionName: "increment",
    cause: new Error("api"),
  };

  it("has _tag EffectErrorHandlerFailed", () => {
    const err = EffectErrorHandlerError({
      portName: "Counter",
      actionName: "increment",
      originalError,
      handlerError: new Error("handler"),
    });
    expect(err._tag).toBe("EffectErrorHandlerFailed");
  });

  it("includes portName, actionName, originalError, handlerError", () => {
    const handlerError = new Error("handler crash");
    const err = EffectErrorHandlerError({
      portName: "Counter",
      actionName: "increment",
      originalError,
      handlerError,
    });
    expect(err.portName).toBe("Counter");
    expect(err.actionName).toBe("increment");
    expect(err.originalError).toBe(originalError);
    expect(err.handlerError).toBe(handlerError);
  });

  it("is a frozen plain object (not a class instance)", () => {
    const err = EffectErrorHandlerError({
      portName: "Counter",
      actionName: "increment",
      originalError,
      handlerError: new Error("x"),
    });
    expect(Object.isFrozen(err)).toBe(true);
  });
});

// =============================================================================
// WaitForStateTimeout
// =============================================================================

describe("WaitForStateTimeout", () => {
  it("has _tag WaitForStateTimeout", () => {
    const err = WaitForStateTimeout({ portName: "Counter", timeoutMs: 5000 });
    expect(err._tag).toBe("WaitForStateTimeout");
  });

  it("has code WAIT_FOR_STATE_TIMEOUT", () => {
    const err = WaitForStateTimeout({ portName: "Counter", timeoutMs: 5000 });
    expect(err.code).toBe("WAIT_FOR_STATE_TIMEOUT");
  });

  it("has isProgrammingError: false", () => {
    const err = WaitForStateTimeout({ portName: "Counter", timeoutMs: 5000 });
    expect(err.isProgrammingError).toBe(false);
  });

  it("includes portName, timeoutMs", () => {
    const err = WaitForStateTimeout({ portName: "Counter", timeoutMs: 3000 });
    expect(err.portName).toBe("Counter");
    expect(err.timeoutMs).toBe(3000);
  });

  it("is a frozen plain object", () => {
    const err = WaitForStateTimeout({ portName: "Counter", timeoutMs: 5000 });
    expect(Object.isFrozen(err)).toBe(true);
  });
});

// =============================================================================
// All errors are frozen plain objects with _tag
// =============================================================================

describe("All errors are frozen plain objects with _tag", () => {
  it("all 6 thrown-error factories produce frozen objects with _tag", () => {
    const errors = [
      DisposedStateAccess({ portName: "p", containerName: "c", operation: "state" }),
      DerivedComputationFailed({ portName: "p", cause: "cause" }),
      AsyncDerivedExhausted({ portName: "p", attempts: 1, cause: "cause" }),
      CircularDerivedDependency({ dependencyChain: ["a"] }),
      BatchExecutionFailed({ cause: "cause" }),
      WaitForStateTimeout({ portName: "p", timeoutMs: 1000 }),
    ];
    for (const err of errors) {
      expect(Object.isFrozen(err)).toBe(true);
      expect(err).toHaveProperty("_tag");
    }
  });
});

// =============================================================================
// Tagged error types (value-based, not thrown)
// =============================================================================

describe("EffectFailedError tagged value", () => {
  it("has _tag EffectFailed, portName, actionName, cause", () => {
    const err: EffectFailedError = {
      _tag: "EffectFailed",
      portName: "Counter",
      actionName: "increment",
      cause: new Error("api fail"),
    };
    expect(err._tag).toBe("EffectFailed");
    expect(err.portName).toBe("Counter");
    expect(err.actionName).toBe("increment");
    expect(err.cause).toBeInstanceOf(Error);
  });
});

describe("AsyncDerivedSelectError tagged value", () => {
  it("has _tag AsyncDerivedSelectFailed", () => {
    const err: AsyncDerivedSelectError = {
      _tag: "AsyncDerivedSelectFailed",
      portName: "Rate",
      attempts: 3,
      cause: new Error("timeout"),
    };
    expect(err._tag).toBe("AsyncDerivedSelectFailed");
  });

  it("includes portName, attempts, cause", () => {
    const cause = new Error("timeout");
    const err: AsyncDerivedSelectError = {
      _tag: "AsyncDerivedSelectFailed",
      portName: "Rate",
      attempts: 3,
      cause,
    };
    expect(err.portName).toBe("Rate");
    expect(err.attempts).toBe(3);
    expect(err.cause).toBe(cause);
  });
});

describe("HydrationError tagged value", () => {
  it("has _tag HydrationFailed, portName, cause", () => {
    const cause = new Error("parse");
    const err: HydrationError = {
      _tag: "HydrationFailed",
      portName: "Counter",
      cause,
    };
    expect(err._tag).toBe("HydrationFailed");
    expect(err.portName).toBe("Counter");
    expect(err.cause).toBe(cause);
  });
});

// =============================================================================
// Error message content (kills string-mutation survivors)
// =============================================================================

describe("Error message content", () => {
  it("DisposedStateAccess message contains operation, portName, containerName", () => {
    const err = DisposedStateAccess({
      portName: "Counter",
      containerName: "root",
      operation: "subscribe",
    });
    expect(err.message).toContain("subscribe");
    expect(err.message).toContain("Counter");
    expect(err.message).toContain("root");
  });

  it("DerivedComputationFailed message contains portName and cause message", () => {
    const err = DerivedComputationFailed({
      portName: "CartTotal",
      cause: new Error("division by zero"),
    });
    expect(err.message).toContain("CartTotal");
    expect(err.message).toContain("division by zero");
  });

  it("AsyncDerivedExhausted message contains portName, attempt count, cause", () => {
    const err = AsyncDerivedExhausted({
      portName: "Rate",
      attempts: 3,
      cause: new Error("timeout"),
    });
    expect(err.message).toContain("Rate");
    expect(err.message).toContain("3");
    expect(err.message).toContain("timeout");
  });

  it("CircularDerivedDependency message contains formatted chain", () => {
    const err = CircularDerivedDependency({ dependencyChain: ["A", "B", "C"] });
    expect(err.message).toContain("A -> B -> C");
  });

  it("BatchExecutionFailed message contains cause message", () => {
    const err = BatchExecutionFailed({ cause: new Error("boom") });
    expect(err.message).toContain("boom");
  });

  it("EffectErrorHandlerError tagged value has correct structural fields", () => {
    const originalError: EffectFailedError = {
      _tag: "EffectFailed",
      portName: "Counter",
      actionName: "increment",
      cause: new Error("api failure"),
    };
    const handlerError = new Error("handler crash");
    const err = EffectErrorHandlerError({
      portName: "Counter",
      actionName: "increment",
      originalError,
      handlerError,
    });
    expect(err._tag).toBe("EffectErrorHandlerFailed");
    expect(err.portName).toBe("Counter");
    expect(err.actionName).toBe("increment");
    expect(err.originalError).toBe(originalError);
    expect(err.handlerError).toBe(handlerError);
  });

  it("WaitForStateTimeout message contains portName and timeout value", () => {
    const err = WaitForStateTimeout({ portName: "Counter", timeoutMs: 5000 });
    expect(err.message).toContain("Counter");
    expect(err.message).toContain("5000");
  });

  it("WaitForStateTimeout message contains 'predicate never returned true'", () => {
    const err = WaitForStateTimeout({ portName: "Counter", timeoutMs: 5000 });
    expect(err.message).toContain("The predicate never returned true");
  });
});

describe("Error context preservation", () => {
  it("CircularDerivedDependency.dependencyChain is a frozen copy (not original array ref)", () => {
    const original = ["A", "B", "C"];
    const err = CircularDerivedDependency({ dependencyChain: original });
    expect(err.dependencyChain).toEqual(original);
    expect(err.dependencyChain).not.toBe(original);
  });

  it("DerivedComputationFailed.cause preserves original error identity", () => {
    const cause = new Error("original");
    const err = DerivedComputationFailed({ portName: "P", cause });
    expect(err.cause).toBe(cause);
  });

  it("AsyncDerivedExhausted.cause preserves original error identity", () => {
    const cause = new Error("original");
    const err = AsyncDerivedExhausted({ portName: "P", attempts: 1, cause });
    expect(err.cause).toBe(cause);
  });
});
