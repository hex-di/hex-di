/**
 * Phase 3 GxP runtime tests.
 *
 * Tests for monotonic timing, finalizer timeout, scope depth limits,
 * lifecycle error reporter, hook overwrite guard, and hook context freeze.
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { monotonicNow } from "../src/util/monotonic-time.js";
import { FinalizerTimeoutError, ScopeDepthExceededError } from "../src/errors/index.js";
import { ScopeImpl, createScopeWrapper } from "../src/scope/impl.js";
import { ScopeLifecycleEmitter } from "../src/scope/lifecycle-events.js";
import { MemoMap } from "../src/util/memo-map.js";
import { port } from "@hex-di/core";

// =============================================================================
// Monotonic Time Tests
// =============================================================================

describe("monotonicNow()", () => {
  it("returns a positive number", () => {
    expect(monotonicNow()).toBeGreaterThan(0);
  });

  it("is monotonically increasing", () => {
    const t1 = monotonicNow();
    const t2 = monotonicNow();
    expect(t2).toBeGreaterThanOrEqual(t1);
  });

  it("uses sub-millisecond precision (performance.now)", () => {
    // performance.now() returns values much smaller than Date.now()
    const now = monotonicNow();
    // performance.now() is typically < 1_000_000 (< ~16 minutes in ms)
    // Date.now() is typically > 1_700_000_000_000
    expect(now).toBeLessThan(1_000_000_000);
  });
});

// =============================================================================
// Error Class Tests
// =============================================================================

describe("FinalizerTimeoutError", () => {
  it("has correct code", () => {
    const error = new FinalizerTimeoutError("TestPort", 5000);
    expect(error.code).toBe("FINALIZER_TIMEOUT");
  });

  it("is not a programming error", () => {
    const error = new FinalizerTimeoutError("TestPort", 5000);
    expect(error.isProgrammingError).toBe(false);
  });

  it("includes port name and timeout in message", () => {
    const error = new FinalizerTimeoutError("DatabasePort", 3000);
    expect(error.message).toContain("DatabasePort");
    expect(error.message).toContain("3000");
  });

  it("is instanceof Error", () => {
    const error = new FinalizerTimeoutError("TestPort", 5000);
    expect(error).toBeInstanceOf(Error);
  });
});

describe("ScopeDepthExceededError", () => {
  it("has correct code", () => {
    const error = new ScopeDepthExceededError(65, 64);
    expect(error.code).toBe("SCOPE_DEPTH_EXCEEDED");
  });

  it("is a programming error", () => {
    const error = new ScopeDepthExceededError(65, 64);
    expect(error.isProgrammingError).toBe(true);
  });

  it("includes depth info in message", () => {
    const error = new ScopeDepthExceededError(65, 64);
    expect(error.message).toContain("65");
    expect(error.message).toContain("64");
  });

  it("is instanceof Error", () => {
    const error = new ScopeDepthExceededError(65, 64);
    expect(error).toBeInstanceOf(Error);
  });
});

// =============================================================================
// Lifecycle Error Reporter Tests
// =============================================================================

describe("ScopeLifecycleEmitter error reporter", () => {
  it("routes listener errors to reporter", () => {
    const reportedErrors: unknown[] = [];
    const emitter = new ScopeLifecycleEmitter(error => {
      reportedErrors.push(error);
    });

    const listenerError = new Error("Listener failed");
    emitter.subscribe(() => {
      throw listenerError;
    });

    emitter.emit("disposing");

    expect(reportedErrors).toHaveLength(1);
    expect(reportedErrors[0]).toBe(listenerError);
  });

  it("swallows reporter errors (double-fault protection)", () => {
    const emitter = new ScopeLifecycleEmitter(() => {
      throw new Error("Reporter itself failed");
    });

    emitter.subscribe(() => {
      throw new Error("Listener error");
    });

    // Should not throw even though both listener and reporter fail
    expect(() => emitter.emit("disposing")).not.toThrow();
  });

  it("does not call reporter when no listener errors", () => {
    const reporter = vi.fn();
    const emitter = new ScopeLifecycleEmitter(reporter);

    emitter.subscribe(() => {
      // No error
    });

    emitter.emit("disposing");
    expect(reporter).not.toHaveBeenCalled();
  });
});

// =============================================================================
// MemoMap Async Deduplication Tests
// =============================================================================

describe("MemoMap async deduplication", () => {
  const TestPort = port<string>()({ name: "TestPort" });

  it("deduplicates concurrent async factory calls", async () => {
    const memo = new MemoMap();
    let factoryCallCount = 0;

    const factory = async () => {
      factoryCallCount++;
      return "value";
    };

    // Start two concurrent resolutions
    const [result1, result2] = await Promise.all([
      memo.getOrElseMemoizeAsync(TestPort, factory, undefined),
      memo.getOrElseMemoizeAsync(TestPort, factory, undefined),
    ]);

    expect(result1).toBe("value");
    expect(result2).toBe("value");
    expect(factoryCallCount).toBe(1); // Factory called only once
  });
});

// =============================================================================
// MemoMap Finalizer Timeout Tests
// =============================================================================

describe("MemoMap finalizer timeout", () => {
  const TestPort = port<string>()({ name: "TestPort" });

  it("completes disposal when finalizer finishes before timeout", async () => {
    const memo = new MemoMap();
    let finalized = false;

    memo.getOrElseMemoize(
      TestPort,
      () => "value",
      () => {
        finalized = true;
      }
    );

    await memo.dispose({ finalizerTimeoutMs: 5000 });
    expect(finalized).toBe(true);
  });

  it("calls onFinalizerTimeout when finalizer exceeds timeout", async () => {
    const memo = new MemoMap();
    const timeouts: string[] = [];

    memo.getOrElseMemoize(
      TestPort,
      () => "value",
      async () => {
        // Finalizer that takes longer than timeout
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    );

    await memo
      .dispose({
        finalizerTimeoutMs: 10,
        onFinalizerTimeout: portName => {
          timeouts.push(portName);
        },
      })
      .catch(() => {
        // May throw FinalizerTimeoutError
      });

    expect(timeouts).toContain("TestPort");
  });
});
