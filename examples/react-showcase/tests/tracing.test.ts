/**
 * Tracing Integration Tests - Verify @hex-di/tracing instrumentContainer captures resolutions.
 *
 * These tests verify that:
 * 1. instrumentContainer installs hooks that create spans for service resolutions
 * 2. Service resolutions are captured as SpanData entries via MemoryTracer
 * 3. Span metadata includes port name, lifetime, and timing information
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach } from "./setup.js";
import { createContainer } from "@hex-di/runtime";
import { instrumentContainer, createMemoryTracer } from "@hex-di/tracing";
import type { MemoryTracer } from "@hex-di/tracing";
import { appGraph } from "../src/di/app-graph.js";
import { UserSessionPort } from "../src/di/ports.js";
import { setCurrentUserSelection } from "../src/di/adapters.js";

// =============================================================================
// Tracing Integration Tests
// =============================================================================

describe("Tracing Integration", () => {
  let tracer: MemoryTracer;

  // Reset user selection and tracer before each test
  beforeEach(() => {
    setCurrentUserSelection("alice");
    tracer = createMemoryTracer();
  });

  describe("instrumentContainer", () => {
    it("should install tracing hooks on a container", () => {
      const container = createContainer({ graph: appGraph, name: "Test" });

      const cleanup = instrumentContainer(container, tracer);

      // Cleanup should be a function
      expect(typeof cleanup).toBe("function");

      // Clean up
      cleanup();
      void container.dispose();
    });

    it("should capture spans when services are resolved", () => {
      const container = createContainer({ graph: appGraph, name: "Test" });
      const cleanup = instrumentContainer(container, tracer);
      const scope = container.createScope("tracing-test-scope");

      // Initially no spans
      expect(tracer.getCollectedSpans()).toHaveLength(0);

      // Resolve a service
      scope.resolve(UserSessionPort);

      // Should have at least one span
      const spans = tracer.getCollectedSpans();
      expect(spans.length).toBeGreaterThan(0);

      // Should have a span for UserSession resolution
      const userSessionSpan = spans.find(s => s.name === "resolve:UserSession");
      expect(userSessionSpan).toBeDefined();

      // Clean up
      cleanup();
      void scope.dispose();
      void container.dispose();
    });
  });

  describe("span metadata", () => {
    it("should capture span metadata correctly", () => {
      const container = createContainer({ graph: appGraph, name: "Test" });
      const cleanup = instrumentContainer(container, tracer);
      const scope = container.createScope("metadata-test-scope");

      scope.resolve(UserSessionPort);

      const spans = tracer.getCollectedSpans();
      const span = spans[0];

      // Span should have required properties
      expect(span).toBeDefined();
      expect(span?.context.traceId).toBeDefined();
      expect(span?.context.spanId).toBeDefined();
      expect(span?.name).toBeDefined();
      expect(span?.kind).toBe("internal");
      expect(typeof span?.startTime).toBe("number");
      expect(typeof span?.endTime).toBe("number");
      expect(span?.status).toBe("ok");

      // Should have hex-di specific attributes
      expect(span?.attributes["hex-di.port.name"]).toBeDefined();
      expect(span?.attributes["hex-di.port.lifetime"]).toBeDefined();

      // Clean up
      cleanup();
      void scope.dispose();
      void container.dispose();
    });

    it("should stop capturing after cleanup", () => {
      const container = createContainer({ graph: appGraph, name: "Test" });
      const cleanup = instrumentContainer(container, tracer);
      const scope = container.createScope("cleanup-test-scope");

      // Resolve once - should capture
      scope.resolve(UserSessionPort);
      const spanCountBefore = tracer.getCollectedSpans().length;
      expect(spanCountBefore).toBeGreaterThan(0);

      // Remove instrumentation
      cleanup();

      // Clear and resolve again - should NOT capture new spans
      tracer.clear();
      const scope2 = container.createScope("cleanup-test-scope-2");
      scope2.resolve(UserSessionPort);
      expect(tracer.getCollectedSpans()).toHaveLength(0);

      // Clean up
      void scope.dispose();
      void scope2.dispose();
      void container.dispose();
    });
  });
});
