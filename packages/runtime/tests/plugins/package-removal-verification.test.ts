/**
 * Package Removal Verification Tests
 *
 * These tests verify that all packages that previously depended on
 * @hex-di/inspector and @hex-di/tracing now correctly import from
 * @hex-di/runtime instead.
 *
 * This is part of the inspector-tracing consolidation spec (Task Group 5)
 * which removes the separate inspector and tracing packages.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import * as RuntimeExports from "../../src/index.js";

describe("Package removal verification", () => {
  describe("@hex-di/runtime provides all inspector exports", () => {
    it("exports INSPECTOR symbol", () => {
      expect(RuntimeExports.INSPECTOR).toBeDefined();
      expect(typeof RuntimeExports.INSPECTOR).toBe("symbol");
    });

    it("exports InspectorPlugin", () => {
      expect(RuntimeExports.InspectorPlugin).toBeDefined();
      expect(RuntimeExports.InspectorPlugin.name).toBe("inspector");
    });

    it("exports withInspector wrapper", () => {
      expect(RuntimeExports.withInspector).toBeDefined();
      expect(typeof RuntimeExports.withInspector).toBe("function");
    });

    it("exports hasInspector and getInspectorAPI type guards", () => {
      expect(RuntimeExports.hasInspector).toBeDefined();
      expect(RuntimeExports.getInspectorAPI).toBeDefined();
    });
  });

  describe("@hex-di/runtime provides all tracing exports", () => {
    it("exports TRACING symbol", () => {
      expect(RuntimeExports.TRACING).toBeDefined();
      expect(typeof RuntimeExports.TRACING).toBe("symbol");
    });

    it("exports TracingPlugin", () => {
      expect(RuntimeExports.TracingPlugin).toBeDefined();
      expect(RuntimeExports.TracingPlugin.name).toBe("tracing");
    });

    it("exports withTracing wrapper", () => {
      expect(RuntimeExports.withTracing).toBeDefined();
      expect(typeof RuntimeExports.withTracing).toBe("function");
    });

    it("exports hasTracing and getTracingAPI type guards", () => {
      expect(RuntimeExports.hasTracing).toBeDefined();
      expect(RuntimeExports.getTracingAPI).toBeDefined();
    });

    it("exports collector classes", () => {
      expect(RuntimeExports.MemoryCollector).toBeDefined();
      expect(RuntimeExports.NoOpCollector).toBeDefined();
      expect(RuntimeExports.CompositeCollector).toBeDefined();
    });
  });

  describe("No external dependencies on old packages", () => {
    /**
     * This test verifies that all necessary exports exist for consumers
     * that previously used @hex-di/inspector or @hex-di/tracing.
     *
     * The actual import path changes are verified at build time:
     * - If devtools imports from @hex-di/inspector after removal, build fails
     * - If react-showcase imports from @hex-di/tracing after removal, build fails
     */
    it("runtime exports all types needed by devtools", () => {
      // Types used by devtools - verified by TypeScript at compile time
      // InspectorWithSubscription, InspectorEvent, InspectorAPI, TracingAPI
      // AdapterInfo, VisualizableAdapter

      // These exports enable devtools to function without the old packages
      expect(RuntimeExports.INSPECTOR).toBeDefined();
      expect(RuntimeExports.TRACING).toBeDefined();
      expect(RuntimeExports.InspectorPlugin).toBeDefined();
      expect(RuntimeExports.TracingPlugin).toBeDefined();
      expect(RuntimeExports.getInspectorAPI).toBeDefined();
      expect(RuntimeExports.getTracingAPI).toBeDefined();
    });

    it("runtime exports all types needed by react-showcase", () => {
      // react-showcase uses InspectorPlugin and TracingPlugin for container enhancement
      expect(RuntimeExports.InspectorPlugin).toBeDefined();
      expect(RuntimeExports.TracingPlugin).toBeDefined();

      // It also uses the plugin system for pipe composition
      expect(RuntimeExports.pipe).toBeDefined();
      expect(RuntimeExports.withInspector).toBeDefined();
      expect(RuntimeExports.withTracing).toBeDefined();
    });
  });
});
