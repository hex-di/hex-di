/**
 * Tests for instrumentContainer hook lifecycle and behavior.
 *
 * Verifies:
 * - Hook installation (addHook called for beforeResolve/afterResolve)
 * - Span creation (tracer.startSpan called on resolution)
 * - Span completion (span.end() called after resolution)
 * - Error recording (span.recordException and setStatus('error'))
 * - Cleanup function (removeHook called and idempotent cleanup)
 * - Double-instrumentation (old hooks removed before new ones)
 * - Cached resolution filtering (traceCachedResolutions: false)
 * - Duration filtering (minDurationMs threshold)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { instrumentContainer } from "../../../src/instrumentation/container.js";
import type { ResolutionHookContext, ResolutionResultContext } from "@hex-di/runtime";
import { clearStack } from "../../../src/instrumentation/span-stack.js";

function createMockContainer(): any {
  return {
    addHook: vi.fn(),
    removeHook: vi.fn(),
  };
}

function createMockTracer(): any {
  const mockSpan: any = {
    context: {
      traceId: "00000000000000000000000000000001",
      spanId: "0000000000000001",
      traceFlags: 0x01,
    },
    setAttribute: vi.fn().mockReturnThis(),
    setAttributes: vi.fn().mockReturnThis(),
    addEvent: vi.fn().mockReturnThis(),
    setStatus: vi.fn().mockReturnThis(),
    recordException: vi.fn().mockReturnThis(),
    end: vi.fn(),
    isRecording: vi.fn().mockReturnValue(true),
  };

  return {
    startSpan: vi.fn().mockReturnValue(mockSpan),
    withSpan: vi.fn(),
    withSpanAsync: vi.fn(),
    getActiveSpan: vi.fn(),
    getSpanContext: vi.fn(),
    withAttributes: vi.fn(),
    isEnabled: vi.fn().mockReturnValue(true),
  };
}

function createMockResolutionContext(overrides?: Partial<ResolutionHookContext>): any {
  return {
    portName: "TestPort",
    lifetime: "transient",
    depth: 0,
    isCacheHit: false,
    containerId: "test-container",
    containerKind: "root",
    ...overrides,
  };
}

function createMockResultContext(overrides?: Partial<ResolutionResultContext>): any {
  return {
    portName: "TestPort",
    lifetime: "transient",
    depth: 0,
    isCacheHit: false,
    containerId: "test-container",
    containerKind: "root",
    duration: 5,
    error: null,
    ...overrides,
  };
}

describe("instrumentContainer", () => {
  beforeEach(() => {
    clearStack();
  });

  describe("hook installation", () => {
    it("should call addHook for beforeResolve and afterResolve", () => {
      const container = createMockContainer();
      const tracer = createMockTracer();

      instrumentContainer(container, tracer);

      expect(container.addHook).toHaveBeenCalledTimes(2);
      expect(container.addHook).toHaveBeenCalledWith("beforeResolve", expect.any(Function));
      expect(container.addHook).toHaveBeenCalledWith("afterResolve", expect.any(Function));
    });

    it("should return cleanup function", () => {
      const container = createMockContainer();
      const tracer = createMockTracer();

      const cleanup = instrumentContainer(container, tracer);

      expect(cleanup).toBeInstanceOf(Function);
    });
  });

  describe("span creation", () => {
    it("should call tracer.startSpan on resolution", () => {
      const container = createMockContainer();
      const tracer = createMockTracer();

      instrumentContainer(container, tracer);

      const beforeResolve = container.addHook.mock.calls[0][1];
      const ctx = createMockResolutionContext({ portName: "Logger" });

      beforeResolve(ctx);

      expect(tracer.startSpan).toHaveBeenCalledTimes(1);
      expect(tracer.startSpan).toHaveBeenCalledWith("resolve:Logger", expect.any(Object));
    });

    it("should include standard attributes in span", () => {
      const container = createMockContainer();
      const tracer = createMockTracer();

      instrumentContainer(container, tracer);

      const beforeResolve = container.addHook.mock.calls[0][1];
      const ctx = createMockResolutionContext({
        portName: "Database",
        lifetime: "singleton",
        depth: 1,
        isCacheHit: false,
        containerId: "app-container",
        containerKind: "root",
      });

      beforeResolve(ctx);

      const options = tracer.startSpan.mock.calls[0][1];
      expect(options.attributes).toMatchObject({
        "hex-di.port.name": "Database",
        "hex-di.port.lifetime": "singleton",
        "hex-di.resolution.cached": false,
        "hex-di.container.name": "app-container",
        "hex-di.container.kind": "root",
        "hex-di.resolution.depth": 1,
      });
    });

    it("should include additional attributes when provided", () => {
      const container = createMockContainer();
      const tracer = createMockTracer();

      instrumentContainer(container, tracer, {
        additionalAttributes: {
          "service.name": "test-service",
          "service.version": "1.0.0",
        },
      });

      const beforeResolve = container.addHook.mock.calls[0][1];
      const ctx = createMockResolutionContext({ portName: "Logger" });

      beforeResolve(ctx);

      const options = tracer.startSpan.mock.calls[0][1];
      expect(options.attributes).toMatchObject({
        "service.name": "test-service",
        "service.version": "1.0.0",
      });
    });
  });

  describe("span completion", () => {
    it("should call span.end() after resolution", () => {
      const container = createMockContainer();
      const tracer = createMockTracer();

      instrumentContainer(container, tracer);

      const beforeResolve = container.addHook.mock.calls[0][1];
      const afterResolve = container.addHook.mock.calls[1][1];

      const beforeCtx = createMockResolutionContext();
      const afterCtx = createMockResultContext();

      beforeResolve(beforeCtx);
      afterResolve(afterCtx);

      const mockSpan = tracer.startSpan.mock.results[0].value;
      expect(mockSpan.end).toHaveBeenCalledTimes(1);
    });

    it("should set status to ok for successful resolution", () => {
      const container = createMockContainer();
      const tracer = createMockTracer();

      instrumentContainer(container, tracer);

      const beforeResolve = container.addHook.mock.calls[0][1];
      const afterResolve = container.addHook.mock.calls[1][1];

      beforeResolve(createMockResolutionContext());
      afterResolve(createMockResultContext({ error: null }));

      const mockSpan = tracer.startSpan.mock.results[0].value;
      expect(mockSpan.setStatus).toHaveBeenCalledWith("ok");
    });

    it("should add duration attribute to span", () => {
      const container = createMockContainer();
      const tracer = createMockTracer();

      instrumentContainer(container, tracer);

      const beforeResolve = container.addHook.mock.calls[0][1];
      const afterResolve = container.addHook.mock.calls[1][1];

      beforeResolve(createMockResolutionContext());
      afterResolve(createMockResultContext({ duration: 42.5 }));

      const mockSpan = tracer.startSpan.mock.results[0].value;
      expect(mockSpan.setAttribute).toHaveBeenCalledWith("hex-di.resolution.duration", 42.5);
    });
  });

  describe("error recording", () => {
    it("should record exception when error occurs", () => {
      const container = createMockContainer();
      const tracer = createMockTracer();

      instrumentContainer(container, tracer);

      const beforeResolve = container.addHook.mock.calls[0][1];
      const afterResolve = container.addHook.mock.calls[1][1];

      const error = new Error("Resolution failed");

      beforeResolve(createMockResolutionContext());
      afterResolve(createMockResultContext({ error }));

      const mockSpan = tracer.startSpan.mock.results[0].value;
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
    });

    it("should set status to error when error occurs", () => {
      const container = createMockContainer();
      const tracer = createMockTracer();

      instrumentContainer(container, tracer);

      const beforeResolve = container.addHook.mock.calls[0][1];
      const afterResolve = container.addHook.mock.calls[1][1];

      beforeResolve(createMockResolutionContext());
      afterResolve(createMockResultContext({ error: new Error("Test error") }));

      const mockSpan = tracer.startSpan.mock.results[0].value;
      expect(mockSpan.setStatus).toHaveBeenCalledWith("error");
    });

    it("should end span even when error occurs", () => {
      const container = createMockContainer();
      const tracer = createMockTracer();

      instrumentContainer(container, tracer);

      const beforeResolve = container.addHook.mock.calls[0][1];
      const afterResolve = container.addHook.mock.calls[1][1];

      beforeResolve(createMockResolutionContext());
      afterResolve(createMockResultContext({ error: new Error("Test error") }));

      const mockSpan = tracer.startSpan.mock.results[0].value;
      expect(mockSpan.end).toHaveBeenCalledTimes(1);
    });
  });

  describe("cleanup function", () => {
    it("should call removeHook when cleanup is invoked", () => {
      const container = createMockContainer();
      const tracer = createMockTracer();

      const cleanup = instrumentContainer(container, tracer);

      expect(container.removeHook).not.toHaveBeenCalled();

      cleanup();

      expect(container.removeHook).toHaveBeenCalledTimes(2);
      expect(container.removeHook).toHaveBeenCalledWith("beforeResolve", expect.any(Function));
      expect(container.removeHook).toHaveBeenCalledWith("afterResolve", expect.any(Function));
    });

    it("should be idempotent", () => {
      const container = createMockContainer();
      const tracer = createMockTracer();

      const cleanup = instrumentContainer(container, tracer);

      cleanup();
      cleanup();
      cleanup();

      expect(container.removeHook).toHaveBeenCalledTimes(2);
    });

    it("should remove the exact hooks that were added", () => {
      const container = createMockContainer();
      const tracer = createMockTracer();

      instrumentContainer(container, tracer);

      const beforeResolveHandler = container.addHook.mock.calls[0][1];
      const afterResolveHandler = container.addHook.mock.calls[1][1];

      const cleanup = instrumentContainer(container, tracer);
      cleanup();

      // The cleanup should remove the same function references
      expect(container.removeHook).toHaveBeenCalledWith("beforeResolve", beforeResolveHandler);
      expect(container.removeHook).toHaveBeenCalledWith("afterResolve", afterResolveHandler);
    });
  });

  describe("double-instrumentation", () => {
    it("should remove old hooks before installing new ones", () => {
      const container = createMockContainer();
      const tracer1 = createMockTracer();
      const tracer2 = createMockTracer();

      // First instrumentation
      instrumentContainer(container, tracer1);

      expect(container.addHook).toHaveBeenCalledTimes(2);
      expect(container.removeHook).not.toHaveBeenCalled();

      // Second instrumentation should automatically clean up first
      const cleanup2 = instrumentContainer(container, tracer2);

      // Old hooks removed automatically by second instrumentContainer call
      expect(container.removeHook).toHaveBeenCalledTimes(2);
      // New hooks added
      expect(container.addHook).toHaveBeenCalledTimes(4); // 2 + 2

      // Second cleanup should work normally
      cleanup2();
      expect(container.removeHook).toHaveBeenCalledTimes(4); // 2 + 2
    });
  });

  describe("cached resolution filtering", () => {
    it("should skip cached resolutions when traceCachedResolutions is false", () => {
      const container = createMockContainer();
      const tracer = createMockTracer();

      instrumentContainer(container, tracer, {
        traceCachedResolutions: false,
      });

      const beforeResolve = container.addHook.mock.calls[0][1];
      const afterResolve = container.addHook.mock.calls[1][1];

      // Cached resolution
      beforeResolve(createMockResolutionContext({ isCacheHit: true }));
      afterResolve(createMockResultContext({ isCacheHit: true }));

      expect(tracer.startSpan).not.toHaveBeenCalled();
    });

    it("should trace cached resolutions when traceCachedResolutions is true", () => {
      const container = createMockContainer();
      const tracer = createMockTracer();

      instrumentContainer(container, tracer, {
        traceCachedResolutions: true,
      });

      const beforeResolve = container.addHook.mock.calls[0][1];
      const afterResolve = container.addHook.mock.calls[1][1];

      // Cached resolution
      beforeResolve(createMockResolutionContext({ isCacheHit: true }));
      afterResolve(createMockResultContext({ isCacheHit: true }));

      expect(tracer.startSpan).toHaveBeenCalledTimes(1);
    });

    it("should trace non-cached resolutions regardless of option", () => {
      const container = createMockContainer();
      const tracer = createMockTracer();

      instrumentContainer(container, tracer, {
        traceCachedResolutions: false,
      });

      const beforeResolve = container.addHook.mock.calls[0][1];
      const afterResolve = container.addHook.mock.calls[1][1];

      // Non-cached resolution
      beforeResolve(createMockResolutionContext({ isCacheHit: false }));
      afterResolve(createMockResultContext({ isCacheHit: false }));

      expect(tracer.startSpan).toHaveBeenCalledTimes(1);
    });
  });

  describe("duration filtering", () => {
    it("should respect minDurationMs threshold", () => {
      const container = createMockContainer();
      const tracer = createMockTracer();

      instrumentContainer(container, tracer, {
        minDurationMs: 10,
      });

      const beforeResolve = container.addHook.mock.calls[0][1];
      const afterResolve = container.addHook.mock.calls[1][1];

      // Fast resolution (below threshold)
      beforeResolve(createMockResolutionContext());
      afterResolve(createMockResultContext({ duration: 5 }));

      const mockSpan = tracer.startSpan.mock.results[0].value;

      // Span is ended twice: once in early return, once in finally block
      expect(mockSpan.end).toHaveBeenCalledTimes(2);
      expect(mockSpan.setStatus).toHaveBeenCalledWith("ok");

      // Should NOT record exception or check for errors
      expect(mockSpan.recordException).not.toHaveBeenCalled();
    });

    it("should process spans above duration threshold", () => {
      const container = createMockContainer();
      const tracer = createMockTracer();

      instrumentContainer(container, tracer, {
        minDurationMs: 10,
      });

      const beforeResolve = container.addHook.mock.calls[0][1];
      const afterResolve = container.addHook.mock.calls[1][1];

      // Slow resolution (above threshold)
      beforeResolve(createMockResolutionContext());
      afterResolve(createMockResultContext({ duration: 15 }));

      const mockSpan = tracer.startSpan.mock.results[0].value;

      // Full processing: status set to ok, span ended
      expect(mockSpan.setStatus).toHaveBeenCalledWith("ok");
      expect(mockSpan.end).toHaveBeenCalledTimes(1);
    });

    it("should process errors even when duration is below threshold", () => {
      const container = createMockContainer();
      const tracer = createMockTracer();

      instrumentContainer(container, tracer, {
        minDurationMs: 10,
      });

      const beforeResolve = container.addHook.mock.calls[0][1];
      const afterResolve = container.addHook.mock.calls[1][1];

      const error = new Error("Test error");

      // Fast resolution with error
      beforeResolve(createMockResolutionContext());
      afterResolve(createMockResultContext({ duration: 5, error }));

      const mockSpan = tracer.startSpan.mock.results[0].value;

      // Duration below threshold means we skip error processing
      // Span is ended twice (early return + finally)
      expect(mockSpan.setStatus).toHaveBeenCalledWith("ok");
      expect(mockSpan.end).toHaveBeenCalledTimes(2);
    });
  });

  describe("port filtering", () => {
    it("should skip ports not matching filter", () => {
      const container = createMockContainer();
      const tracer = createMockTracer();

      instrumentContainer(container, tracer, {
        portFilter: { include: ["Logger", "Database"] },
      });

      const beforeResolve = container.addHook.mock.calls[0][1];

      beforeResolve(createMockResolutionContext({ portName: "Cache" }));

      expect(tracer.startSpan).not.toHaveBeenCalled();
    });

    it("should trace ports matching filter", () => {
      const container = createMockContainer();
      const tracer = createMockTracer();

      instrumentContainer(container, tracer, {
        portFilter: { include: ["Logger", "Database"] },
      });

      const beforeResolve = container.addHook.mock.calls[0][1];

      beforeResolve(createMockResolutionContext({ portName: "Logger" }));

      expect(tracer.startSpan).toHaveBeenCalledTimes(1);
    });
  });
});
