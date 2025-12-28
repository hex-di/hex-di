/**
 * Tracing Integration Tests - Verify TracingPlugin captures service resolutions.
 *
 * These tests verify that:
 * 1. TracingPlugin properly instruments container resolutions via wrapper pattern
 * 2. Service resolutions are captured as trace entries
 * 3. TracingAPI provides type-safe access to trace data via TRACING symbol
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach } from "./setup.js";
import { createContainer, pipe } from "@hex-di/runtime";
import { TRACING, withTracing } from "@hex-di/tracing";
import { appGraph } from "../src/di/graph.js";
import { UserSessionPort } from "../src/di/ports.js";
import { setCurrentUserSelection } from "../src/di/adapters.js";

// =============================================================================
// Tracing Integration Tests
// =============================================================================

describe("Tracing Integration", () => {
  // Reset user selection before each test
  beforeEach(() => {
    setCurrentUserSelection("alice");
  });

  describe("TracingPlugin via wrapper pattern", () => {
    it("should add TRACING Symbol to container with withTracing wrapper", () => {
      const tracingContainer = pipe(createContainer(appGraph), withTracing);

      // Container should have TRACING Symbol
      expect(TRACING in tracingContainer).toBe(true);

      // Clean up
      void tracingContainer.dispose();
    });

    it("should provide type-safe TracingAPI via wrapper pattern", () => {
      // Using wrapper pattern for compile-time type safety
      const tracingContainer = pipe(createContainer(appGraph), withTracing);

      // TypeScript knows container[TRACING] exists - no cast needed!
      const tracingAPI = tracingContainer[TRACING];

      // TracingAPI should have expected methods
      expect(tracingAPI).toBeDefined();
      expect(typeof tracingAPI.getTraces).toBe("function");
      expect(typeof tracingAPI.getStats).toBe("function");
      expect(typeof tracingAPI.subscribe).toBe("function");
      expect(typeof tracingAPI.clear).toBe("function");
      expect(typeof tracingAPI.pause).toBe("function");
      expect(typeof tracingAPI.resume).toBe("function");

      // Clean up
      void tracingContainer.dispose();
    });
  });

  describe("trace recording", () => {
    it("should record traces when services are resolved", () => {
      const tracingContainer = pipe(createContainer(appGraph), withTracing);
      const scope = tracingContainer.createScope();

      // Initially no traces
      const tracingAPI = tracingContainer[TRACING];
      expect(tracingAPI.getTraces()).toHaveLength(0);

      // Resolve a service
      scope.resolve(UserSessionPort);

      // Should have at least one trace
      const traces = tracingAPI.getTraces();
      expect(traces.length).toBeGreaterThan(0);

      // First trace should be for UserSession
      const userSessionTrace = traces.find(
        (t: { portName: string }) => t.portName === "UserSession"
      );
      expect(userSessionTrace).toBeDefined();

      // Clean up
      void scope.dispose();
      void tracingContainer.dispose();
    });

    it("should capture trace metadata correctly", () => {
      const tracingContainer = pipe(createContainer(appGraph), withTracing);
      const scope = tracingContainer.createScope();

      scope.resolve(UserSessionPort);

      const tracingAPI = tracingContainer[TRACING];
      const traces = tracingAPI.getTraces();
      const trace = traces[0];

      // Trace should have required properties
      expect(trace).toBeDefined();
      expect(trace?.id).toBeDefined();
      expect(trace?.portName).toBeDefined();
      expect(trace?.lifetime).toBeDefined();
      expect(typeof trace?.duration).toBe("number");
      expect(typeof trace?.isCacheHit).toBe("boolean");

      // Clean up
      void scope.dispose();
      void tracingContainer.dispose();
    });
  });
});
