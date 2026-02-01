/**
 * Tracing Integration Tests - Verify built-in tracing captures service resolutions.
 *
 * These tests verify that:
 * 1. Container has built-in tracing via the `tracer` property
 * 2. Service resolutions are captured as trace entries
 * 3. TracingAPI provides type-safe access to trace data
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach } from "./setup.js";
import { createContainer } from "@hex-di/runtime";
import { appGraph } from "../src/di/app-graph.js";
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

  describe("Built-in tracer property", () => {
    it("should have tracer property on container", () => {
      const container = createContainer(appGraph, { name: "Test" });

      // Container should have tracer property
      expect(container.tracer).toBeDefined();

      // Clean up
      void container.dispose();
    });

    it("should provide type-safe TracingAPI via tracer property", () => {
      const container = createContainer(appGraph, { name: "Test" });

      const tracingAPI = container.tracer;

      // TracingAPI should have expected methods
      expect(tracingAPI).toBeDefined();
      expect(typeof tracingAPI.getTraces).toBe("function");
      expect(typeof tracingAPI.getStats).toBe("function");
      expect(typeof tracingAPI.subscribe).toBe("function");
      expect(typeof tracingAPI.clear).toBe("function");
      expect(typeof tracingAPI.pause).toBe("function");
      expect(typeof tracingAPI.resume).toBe("function");

      // Clean up
      void container.dispose();
    });
  });

  describe("trace recording", () => {
    it("should record traces when services are resolved", () => {
      const container = createContainer(appGraph, { name: "Test" });
      const scope = container.createScope("tracing-test-scope");

      // Initially no traces
      const tracingAPI = container.tracer;
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
      void container.dispose();
    });

    it("should capture trace metadata correctly", () => {
      const container = createContainer(appGraph, { name: "Test" });
      const scope = container.createScope("metadata-test-scope");

      scope.resolve(UserSessionPort);

      const tracingAPI = container.tracer;
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
      void container.dispose();
    });
  });
});
