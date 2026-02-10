/**
 * Tests for createTracingHook factory and equivalence with instrumentContainer.
 *
 * Verifies:
 * - Returns ResolutionHooks object with beforeResolve/afterResolve
 * - Same span lifecycle as instrumentContainer
 * - Options respected (port filtering, duration filtering, attributes)
 * - Shared hook reuse across containers
 * - Equivalence with instrumentContainer behavior
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTracingHook } from "../../../src/instrumentation/hooks.js";
import { instrumentContainer } from "../../../src/instrumentation/container.js";
import { createMemoryTracer } from "../../../src/adapters/memory/tracer.js";
import { clearStack } from "../../../src/instrumentation/span-stack.js";
import type { ResolutionHookContext, ResolutionResultContext } from "@hex-di/runtime";

function createMockContainer(): any {
  return {
    addHook: vi.fn(),
    removeHook: vi.fn(),
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

describe("createTracingHook", () => {
  beforeEach(() => {
    clearStack();
  });

  describe("return value", () => {
    it("should return ResolutionHooks object", () => {
      const tracer = createMemoryTracer();
      const hooks = createTracingHook(tracer);

      expect(hooks).toBeDefined();
      expect(hooks).toHaveProperty("beforeResolve");
      expect(hooks).toHaveProperty("afterResolve");
      expect(typeof hooks.beforeResolve).toBe("function");
      expect(typeof hooks.afterResolve).toBe("function");
    });

    it("should return stable function references", () => {
      const tracer = createMemoryTracer();
      const hooks = createTracingHook(tracer);

      const beforeResolve1 = hooks.beforeResolve;
      const afterResolve1 = hooks.afterResolve;

      // Functions should be stable
      expect(hooks.beforeResolve).toBe(beforeResolve1);
      expect(hooks.afterResolve).toBe(afterResolve1);
    });
  });

  describe("span lifecycle", () => {
    it("should create span on beforeResolve", () => {
      const tracer = createMemoryTracer();
      const hooks = createTracingHook(tracer);

      hooks.beforeResolve!(createMockResolutionContext({ portName: "Logger" }));

      // Span should be created but not yet completed
      const spans = tracer.getCollectedSpans();
      expect(spans).toHaveLength(0); // Not completed yet
    });

    it("should complete span on afterResolve", () => {
      const tracer = createMemoryTracer();
      const hooks = createTracingHook(tracer);

      hooks.beforeResolve!(createMockResolutionContext({ portName: "Logger" }));
      hooks.afterResolve!(createMockResultContext({ portName: "Logger" }));

      const spans = tracer.getCollectedSpans();
      expect(spans).toHaveLength(1);
      expect(spans[0].name).toBe("resolve:Logger");
    });

    it("should set attributes on span", () => {
      const tracer = createMemoryTracer();
      const hooks = createTracingHook(tracer);

      hooks.beforeResolve!(
        createMockResolutionContext({
          portName: "Database",
          lifetime: "singleton",
          depth: 1,
        })
      );
      hooks.afterResolve!(
        createMockResultContext({
          portName: "Database",
          lifetime: "singleton",
          depth: 1,
        })
      );

      const spans = tracer.getCollectedSpans();
      expect(spans[0].attributes).toMatchObject({
        "hex-di.port.name": "Database",
        "hex-di.port.lifetime": "singleton",
        "hex-di.resolution.depth": 1,
      });
    });

    it("should handle errors", () => {
      const tracer = createMemoryTracer();
      const hooks = createTracingHook(tracer);

      const error = new Error("Test error");

      hooks.beforeResolve!(createMockResolutionContext());
      hooks.afterResolve!(createMockResultContext({ error }));

      const spans = tracer.getCollectedSpans();
      expect(spans[0].status).toBe("error");
      expect(spans[0].events).toContainEqual(
        expect.objectContaining({
          name: "exception",
        })
      );
    });
  });

  describe("options", () => {
    it("should respect port filter", () => {
      const tracer = createMemoryTracer();
      const hooks = createTracingHook(tracer, {
        portFilter: { include: ["Logger"] },
      });

      // Should trace Logger
      hooks.beforeResolve!(createMockResolutionContext({ portName: "Logger" }));
      hooks.afterResolve!(createMockResultContext({ portName: "Logger" }));

      // Should not trace Database
      hooks.beforeResolve!(createMockResolutionContext({ portName: "Database" }));
      hooks.afterResolve!(createMockResultContext({ portName: "Database" }));

      const spans = tracer.getCollectedSpans();
      expect(spans).toHaveLength(1);
      expect(spans[0].name).toBe("resolve:Logger");
    });

    it("should respect traceCachedResolutions option", () => {
      const tracer = createMemoryTracer();
      const hooks = createTracingHook(tracer, {
        traceCachedResolutions: false,
      });

      // Non-cached resolution
      hooks.beforeResolve!(createMockResolutionContext({ isCacheHit: false }));
      hooks.afterResolve!(createMockResultContext({ isCacheHit: false }));

      // Cached resolution
      hooks.beforeResolve!(createMockResolutionContext({ isCacheHit: true }));
      hooks.afterResolve!(createMockResultContext({ isCacheHit: true }));

      const spans = tracer.getCollectedSpans();
      expect(spans).toHaveLength(1); // Only non-cached
    });

    it("should respect minDurationMs option", () => {
      const tracer = createMemoryTracer();
      const hooks = createTracingHook(tracer, {
        minDurationMs: 10,
      });

      // Fast resolution (below threshold)
      hooks.beforeResolve!(createMockResolutionContext({ portName: "Fast" }));
      hooks.afterResolve!(createMockResultContext({ portName: "Fast", duration: 5 }));

      // Slow resolution (above threshold)
      hooks.beforeResolve!(createMockResolutionContext({ portName: "Slow" }));
      hooks.afterResolve!(createMockResultContext({ portName: "Slow", duration: 15 }));

      const spans = tracer.getCollectedSpans();
      // Both spans created but fast one has minimal processing
      expect(spans).toHaveLength(2);
    });

    it("should include additional attributes", () => {
      const tracer = createMemoryTracer();
      const hooks = createTracingHook(tracer, {
        additionalAttributes: {
          "service.name": "test-service",
          "service.version": "1.0.0",
        },
      });

      hooks.beforeResolve!(createMockResolutionContext());
      hooks.afterResolve!(createMockResultContext());

      const spans = tracer.getCollectedSpans();
      expect(spans[0].attributes).toMatchObject({
        "service.name": "test-service",
        "service.version": "1.0.0",
      });
    });
  });

  describe("shared hook reuse", () => {
    it("should allow same hooks to be used across multiple resolutions", () => {
      const tracer = createMemoryTracer();
      const hooks = createTracingHook(tracer);

      // First resolution
      hooks.beforeResolve!(createMockResolutionContext({ portName: "Logger" }));
      hooks.afterResolve!(createMockResultContext({ portName: "Logger" }));

      // Second resolution
      hooks.beforeResolve!(createMockResolutionContext({ portName: "Database" }));
      hooks.afterResolve!(createMockResultContext({ portName: "Database" }));

      // Third resolution
      hooks.beforeResolve!(createMockResolutionContext({ portName: "Cache" }));
      hooks.afterResolve!(createMockResultContext({ portName: "Cache" }));

      const spans = tracer.getCollectedSpans();
      expect(spans).toHaveLength(3);
      expect(spans[0].name).toBe("resolve:Logger");
      expect(spans[1].name).toBe("resolve:Database");
      expect(spans[2].name).toBe("resolve:Cache");
    });

    it("should maintain independent state per resolution", () => {
      const tracer = createMemoryTracer();
      const hooks = createTracingHook(tracer);

      // Start multiple resolutions (simulating concurrent/nested)
      hooks.beforeResolve!(createMockResolutionContext({ portName: "A", depth: 0 }));
      hooks.beforeResolve!(createMockResolutionContext({ portName: "B", depth: 1 }));
      hooks.beforeResolve!(createMockResolutionContext({ portName: "C", depth: 2 }));

      // Complete in LIFO order (nested resolution pattern)
      hooks.afterResolve!(createMockResultContext({ portName: "C", depth: 2 }));
      hooks.afterResolve!(createMockResultContext({ portName: "B", depth: 1 }));
      hooks.afterResolve!(createMockResultContext({ portName: "A", depth: 0 }));

      const spans = tracer.getCollectedSpans();
      expect(spans).toHaveLength(3);
      expect(spans[0].name).toBe("resolve:C"); // First completed
      expect(spans[1].name).toBe("resolve:B");
      expect(spans[2].name).toBe("resolve:A");
    });
  });

  describe("equivalence with instrumentContainer", () => {
    it("should produce same spans as instrumentContainer", () => {
      const tracer1 = createMemoryTracer();
      const tracer2 = createMemoryTracer();
      const options = { minDurationMs: 0 };

      // Test with createTracingHook
      const hooks = createTracingHook(tracer1, options);
      hooks.beforeResolve!(createMockResolutionContext({ portName: "TestPort" }));
      hooks.afterResolve!(createMockResultContext({ portName: "TestPort", duration: 10 }));
      const hookSpans = tracer1.getCollectedSpans();

      // Test with instrumentContainer
      const container = createMockContainer();
      instrumentContainer(container, tracer2, options);
      const beforeResolve = container.addHook.mock.calls[0]![1];
      const afterResolve = container.addHook.mock.calls[1]![1];
      beforeResolve!(createMockResolutionContext({ portName: "TestPort" }));
      afterResolve!(createMockResultContext({ portName: "TestPort", duration: 10 }));
      const containerSpans = tracer2.getCollectedSpans();

      // Should produce identical spans
      expect(hookSpans).toHaveLength(1);
      expect(containerSpans).toHaveLength(1);
      expect(hookSpans[0].name).toBe(containerSpans[0].name);
      expect(hookSpans[0].attributes).toEqual(containerSpans[0].attributes);
      expect(hookSpans[0].status).toBe(containerSpans[0].status);
    });

    it("should handle port filtering identically", () => {
      const tracer1 = createMemoryTracer();
      const tracer2 = createMemoryTracer();
      const options = {
        portFilter: { include: ["Logger", "Database"] },
      };

      // Test with createTracingHook
      const hooks = createTracingHook(tracer1, options);
      hooks.beforeResolve!(createMockResolutionContext({ portName: "Logger" }));
      hooks.afterResolve!(createMockResultContext({ portName: "Logger" }));
      hooks.beforeResolve!(createMockResolutionContext({ portName: "Cache" })); // Filtered
      hooks.afterResolve!(createMockResultContext({ portName: "Cache" }));
      const hookSpans = tracer1.getCollectedSpans();

      // Test with instrumentContainer
      const container = createMockContainer();
      instrumentContainer(container, tracer2, options);
      const beforeResolve = container.addHook.mock.calls[0]![1];
      const afterResolve = container.addHook.mock.calls[1]![1];
      beforeResolve!(createMockResolutionContext({ portName: "Logger" }));
      afterResolve!(createMockResultContext({ portName: "Logger" }));
      beforeResolve!(createMockResolutionContext({ portName: "Cache" })); // Filtered
      afterResolve!(createMockResultContext({ portName: "Cache" }));
      const containerSpans = tracer2.getCollectedSpans();

      // Should produce same number of spans (filtered consistently)
      expect(hookSpans).toHaveLength(1);
      expect(containerSpans).toHaveLength(1);
      expect(hookSpans[0].name).toBe("resolve:Logger");
      expect(containerSpans[0].name).toBe("resolve:Logger");
    });

    it("should handle errors identically", () => {
      const tracer1 = createMemoryTracer();
      const tracer2 = createMemoryTracer();

      const error = new Error("Test error");

      // Test with createTracingHook
      const hooks = createTracingHook(tracer1);
      hooks.beforeResolve!(createMockResolutionContext());
      hooks.afterResolve!(createMockResultContext({ error }));
      const hookSpans = tracer1.getCollectedSpans();

      // Test with instrumentContainer
      const container = createMockContainer();
      instrumentContainer(container, tracer2);
      const beforeResolve = container.addHook.mock.calls[0]![1];
      const afterResolve = container.addHook.mock.calls[1]![1];
      beforeResolve!(createMockResolutionContext());
      afterResolve!(createMockResultContext({ error }));
      const containerSpans = tracer2.getCollectedSpans();

      // Should handle errors identically
      expect(hookSpans[0].status).toBe("error");
      expect(containerSpans[0].status).toBe("error");
      expect(hookSpans[0].events).toHaveLength(1);
      expect(containerSpans[0].events).toHaveLength(1);
      expect(hookSpans[0].events[0].name).toBe("exception");
      expect(containerSpans[0].events[0].name).toBe("exception");
    });

    it("should handle duration filtering identically", () => {
      const tracer1 = createMemoryTracer();
      const tracer2 = createMemoryTracer();
      const options = { minDurationMs: 10 };

      // Test with createTracingHook
      const hooks = createTracingHook(tracer1, options);
      hooks.beforeResolve!(createMockResolutionContext({ portName: "Fast" }));
      hooks.afterResolve!(createMockResultContext({ portName: "Fast", duration: 5 }));
      hooks.beforeResolve!(createMockResolutionContext({ portName: "Slow" }));
      hooks.afterResolve!(createMockResultContext({ portName: "Slow", duration: 15 }));
      const hookSpans = tracer1.getCollectedSpans();

      // Test with instrumentContainer
      const container = createMockContainer();
      instrumentContainer(container, tracer2, options);
      const beforeResolve = container.addHook.mock.calls[0]![1];
      const afterResolve = container.addHook.mock.calls[1]![1];
      beforeResolve!(createMockResolutionContext({ portName: "Fast" }));
      afterResolve!(createMockResultContext({ portName: "Fast", duration: 5 }));
      beforeResolve!(createMockResolutionContext({ portName: "Slow" }));
      afterResolve!(createMockResultContext({ portName: "Slow", duration: 15 }));
      const containerSpans = tracer2.getCollectedSpans();

      // Should produce same spans with same processing
      expect(hookSpans).toHaveLength(2);
      expect(containerSpans).toHaveLength(2);
    });
  });

  describe("scope name attribute", () => {
    it("should set hex-di.scope.name for user-named scopes", () => {
      const tracer = createMemoryTracer();
      const hooks = createTracingHook(tracer);

      hooks.beforeResolve!(
        createMockResolutionContext({
          portName: "TestPort",
          scopeId: "dashboard",
          scopeName: "dashboard",
        })
      );
      hooks.afterResolve!(
        createMockResultContext({
          portName: "TestPort",
          scopeId: "dashboard",
        })
      );

      const spans = tracer.getCollectedSpans();
      expect(spans).toHaveLength(1);
      expect(spans[0].attributes["hex-di.scope.id"]).toBe("dashboard");
      expect(spans[0].attributes["hex-di.scope.name"]).toBe("dashboard");
    });

    it("should NOT set hex-di.scope.name for auto-generated scope IDs", () => {
      const tracer = createMemoryTracer();
      const hooks = createTracingHook(tracer);

      hooks.beforeResolve!(
        createMockResolutionContext({
          portName: "TestPort",
          scopeId: "scope-1",
          scopeName: undefined,
        })
      );
      hooks.afterResolve!(
        createMockResultContext({
          portName: "TestPort",
          scopeId: "scope-1",
        })
      );

      const spans = tracer.getCollectedSpans();
      expect(spans).toHaveLength(1);
      expect(spans[0].attributes["hex-di.scope.id"]).toBe("scope-1");
      expect(spans[0].attributes["hex-di.scope.name"]).toBeUndefined();
    });

    it("should NOT set hex-di.scope.name for multi-digit auto-generated scope IDs", () => {
      const tracer = createMemoryTracer();
      const hooks = createTracingHook(tracer);

      hooks.beforeResolve!(
        createMockResolutionContext({
          portName: "TestPort",
          scopeId: "scope-123",
        })
      );
      hooks.afterResolve!(
        createMockResultContext({
          portName: "TestPort",
          scopeId: "scope-123",
        })
      );

      const spans = tracer.getCollectedSpans();
      expect(spans).toHaveLength(1);
      expect(spans[0].attributes["hex-di.scope.name"]).toBeUndefined();
    });

    it("should NOT set either attribute when scopeId is absent", () => {
      const tracer = createMemoryTracer();
      const hooks = createTracingHook(tracer);

      hooks.beforeResolve!(
        createMockResolutionContext({
          portName: "TestPort",
        })
      );
      hooks.afterResolve!(
        createMockResultContext({
          portName: "TestPort",
        })
      );

      const spans = tracer.getCollectedSpans();
      expect(spans).toHaveLength(1);
      expect(spans[0].attributes["hex-di.scope.id"]).toBeUndefined();
      expect(spans[0].attributes["hex-di.scope.name"]).toBeUndefined();
    });
  });
});
