/**
 * GxP integrity tests for @hex-di/core.
 *
 * Verifies:
 * - ContainerError instances are frozen
 * - Tracing warning utilities
 * - Lazy port double-wrap guard
 * - Freeze verification guards
 * - Error code completeness
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import {
  CircularDependencyError,
  FactoryError,
  DisposedScopeError,
  ScopeRequiredError,
  AsyncFactoryError,
  AsyncInitializationRequiredError,
  NonClonableForkedError,
  NumericErrorCode,
  ErrorCode,
  port,
  createAdapter,
  lazyPort,
  isLazyPort,
  assertAdapterFrozen,
  assertPortFrozen,
  isAdapterFrozen,
  configureTracingWarning,
  emitTracingWarning,
  resetTracingWarning,
  TRACING_NOT_CONFIGURED_CODE,
} from "../src/index.js";

// =============================================================================
// Test Ports
// =============================================================================

interface TestService {
  doWork(): void;
}

const TestPort = port<TestService>()({ name: "TestService" });

// =============================================================================
// Error Freezing
// =============================================================================

describe("GxP: ContainerError freezing", () => {
  it("CircularDependencyError is frozen after construction", () => {
    const error = new CircularDependencyError(["A", "B", "A"]);
    expect(Object.isFrozen(error)).toBe(true);
  });

  it("CircularDependencyError.dependencyChain is frozen", () => {
    const error = new CircularDependencyError(["A", "B", "A"]);
    expect(Object.isFrozen(error.dependencyChain)).toBe(true);
  });

  it("CircularDependencyError.message cannot be mutated", () => {
    const error = new CircularDependencyError(["A", "B", "A"]);
    expect(() => {
      (error as any).message = "tampered";
    }).toThrow();
  });

  it("FactoryError is frozen after construction", () => {
    const error = new FactoryError("TestPort", new Error("boom"));
    expect(Object.isFrozen(error)).toBe(true);
  });

  it("FactoryError properties cannot be mutated", () => {
    const error = new FactoryError("TestPort", new Error("boom"));
    expect(() => {
      (error as any).portName = "tampered";
    }).toThrow();
  });

  it("DisposedScopeError is frozen after construction", () => {
    const error = new DisposedScopeError("TestPort");
    expect(Object.isFrozen(error)).toBe(true);
  });

  it("ScopeRequiredError is frozen after construction", () => {
    const error = new ScopeRequiredError("TestPort");
    expect(Object.isFrozen(error)).toBe(true);
  });

  it("AsyncFactoryError is frozen after construction", () => {
    const error = new AsyncFactoryError("TestPort", new Error("async boom"));
    expect(Object.isFrozen(error)).toBe(true);
  });

  it("AsyncInitializationRequiredError is frozen after construction", () => {
    const error = new AsyncInitializationRequiredError("TestPort");
    expect(Object.isFrozen(error)).toBe(true);
  });

  it("NonClonableForkedError is frozen after construction", () => {
    const error = new NonClonableForkedError("TestPort");
    expect(Object.isFrozen(error)).toBe(true);
  });
});

// =============================================================================
// Tracing Warning
// =============================================================================

describe("GxP: Tracing warning utilities", () => {
  afterEach(() => {
    resetTracingWarning();
  });

  it("TRACING_NOT_CONFIGURED_CODE is HEX_WARN_001", () => {
    expect(TRACING_NOT_CONFIGURED_CODE).toBe("HEX_WARN_001");
  });

  it("emitTracingWarning calls the configured handler", () => {
    const handler = vi.fn();
    configureTracingWarning({ handler });
    emitTracingWarning("TestContainer");
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(expect.stringContaining("TestContainer"), "HEX_WARN_001");
  });

  it("emitTracingWarning includes the warning code in the message", () => {
    const handler = vi.fn();
    configureTracingWarning({ handler });
    emitTracingWarning("MyApp");
    const message = handler.mock.calls[0][0];
    expect(message).toContain("WARNING[HEX_WARN_001]");
    expect(message).toContain("MyApp");
  });

  it("emitTracingWarning does nothing when disabled", () => {
    const handler = vi.fn();
    configureTracingWarning({ enabled: false, handler });
    emitTracingWarning("TestContainer");
    expect(handler).not.toHaveBeenCalled();
  });

  it("resetTracingWarning restores default config", () => {
    configureTracingWarning({ enabled: false });
    resetTracingWarning();
    const handler = vi.fn();
    configureTracingWarning({ handler });
    emitTracingWarning("Test");
    expect(handler).toHaveBeenCalledOnce();
  });
});

// =============================================================================
// Error Codes
// =============================================================================

describe("GxP: New error codes", () => {
  it("NumericErrorCode includes DOUBLE_LAZY_PORT (HEX026)", () => {
    expect(NumericErrorCode.DOUBLE_LAZY_PORT).toBe("HEX026");
  });

  it("NumericErrorCode includes UNFROZEN_ADAPTER (HEX027)", () => {
    expect(NumericErrorCode.UNFROZEN_ADAPTER).toBe("HEX027");
  });

  it("NumericErrorCode includes UNFROZEN_PORT (HEX028)", () => {
    expect(NumericErrorCode.UNFROZEN_PORT).toBe("HEX028");
  });

  it("NumericErrorCode includes TRACING_NOT_CONFIGURED (HEX_WARN_001)", () => {
    expect(NumericErrorCode.TRACING_NOT_CONFIGURED).toBe("HEX_WARN_001");
  });

  it("ErrorCode includes DOUBLE_LAZY_PORT", () => {
    expect(ErrorCode.DOUBLE_LAZY_PORT).toBe("DOUBLE_LAZY_PORT");
  });

  it("ErrorCode includes UNFROZEN_ADAPTER", () => {
    expect(ErrorCode.UNFROZEN_ADAPTER).toBe("UNFROZEN_ADAPTER");
  });

  it("ErrorCode includes UNFROZEN_PORT", () => {
    expect(ErrorCode.UNFROZEN_PORT).toBe("UNFROZEN_PORT");
  });

  it("ErrorCode includes TRACING_NOT_CONFIGURED", () => {
    expect(ErrorCode.TRACING_NOT_CONFIGURED).toBe("TRACING_NOT_CONFIGURED");
  });
});

// =============================================================================
// Lazy Port Double-Wrap Guard
// =============================================================================

describe("GxP: Lazy port double-wrap guard", () => {
  it("lazyPort() rejects an already-lazy port", () => {
    const lazy = lazyPort(TestPort);
    expect(() => lazyPort(lazy as any)).toThrow("ERROR[HEX026]");
  });

  it("lazyPort() accepts a regular port", () => {
    const lazy = lazyPort(TestPort);
    expect(isLazyPort(lazy)).toBe(true);
  });

  it("error message mentions the lazy port name", () => {
    const lazy = lazyPort(TestPort);
    expect(() => lazyPort(lazy as any)).toThrow("LazyTestService");
  });
});

// =============================================================================
// Freeze Verification Guards
// =============================================================================

describe("GxP: Freeze verification guards", () => {
  it("isAdapterFrozen returns true for adapters from createAdapter()", () => {
    const adapter = createAdapter({
      provides: TestPort,
      factory: () => ({ doWork: () => {} }),
    });
    expect(isAdapterFrozen(adapter)).toBe(true);
  });

  it("assertAdapterFrozen does not throw for frozen adapters", () => {
    const adapter = createAdapter({
      provides: TestPort,
      factory: () => ({ doWork: () => {} }),
    });
    expect(() => assertAdapterFrozen(adapter)).not.toThrow();
  });

  it("assertAdapterFrozen throws for unfrozen objects", () => {
    const fake = {
      provides: TestPort,
      requires: [],
      lifetime: "singleton" as const,
      factoryKind: "sync" as const,
      factory: () => ({ doWork: () => {} }),
      clonable: false,
      freeze: true,
    };
    expect(() => assertAdapterFrozen(fake)).toThrow("ERROR[HEX027]");
  });

  it("assertPortFrozen does not throw for ports from port()", () => {
    expect(() => assertPortFrozen(TestPort)).not.toThrow();
  });

  it("assertPortFrozen throws for unfrozen objects", () => {
    const fake = { __portName: "FakePort" };
    expect(() => assertPortFrozen(fake as any)).toThrow("ERROR[HEX028]");
  });
});
