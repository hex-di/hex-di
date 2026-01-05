/**
 * Tests for inspector module exports from @hex-di/runtime.
 *
 * These tests verify that the inspector API is properly exported from the
 * runtime package after migration from @hex-di/inspector.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import * as RuntimeExports from "../../../src/index.js";

describe("Inspector exports from @hex-di/runtime", () => {
  describe("INSPECTOR symbol", () => {
    it("exports INSPECTOR symbol for accessing inspector API", () => {
      expect(RuntimeExports.INSPECTOR).toBeDefined();
      expect(typeof RuntimeExports.INSPECTOR).toBe("symbol");
      // Verify it uses Symbol.for for cross-realm consistency
      expect(RuntimeExports.INSPECTOR).toBe(Symbol.for("hex-di/inspector"));
    });
  });

  describe("InspectorPlugin", () => {
    it("exports InspectorPlugin singleton", () => {
      expect(RuntimeExports.InspectorPlugin).toBeDefined();
      expect(RuntimeExports.InspectorPlugin.name).toBe("inspector");
      expect(RuntimeExports.InspectorPlugin.symbol).toBe(RuntimeExports.INSPECTOR);
    });

    it("InspectorPlugin has required plugin properties", () => {
      expect(typeof RuntimeExports.InspectorPlugin.createApi).toBe("function");
      expect(RuntimeExports.InspectorPlugin.requires).toBeDefined();
      expect(Array.isArray(RuntimeExports.InspectorPlugin.requires)).toBe(true);
    });
  });

  describe("withInspector wrapper", () => {
    it("exports withInspector enhancement wrapper", () => {
      expect(RuntimeExports.withInspector).toBeDefined();
      expect(typeof RuntimeExports.withInspector).toBe("function");
    });
  });

  describe("createInspectorAPI factory", () => {
    it("exports createInspectorAPI function from inspector module", () => {
      // Note: This is the inspector-specific createInspector, aliased as createInspectorAPI
      expect(RuntimeExports.createInspectorAPI).toBeDefined();
      expect(typeof RuntimeExports.createInspectorAPI).toBe("function");
    });
  });

  describe("Type guards", () => {
    it("exports hasInspector type guard", () => {
      expect(RuntimeExports.hasInspector).toBeDefined();
      expect(typeof RuntimeExports.hasInspector).toBe("function");
    });

    it("exports getInspectorAPI helper", () => {
      expect(RuntimeExports.getInspectorAPI).toBeDefined();
      expect(typeof RuntimeExports.getInspectorAPI).toBe("function");
    });

    it("exports hasSubscription type guard", () => {
      expect(RuntimeExports.hasSubscription).toBeDefined();
      expect(typeof RuntimeExports.hasSubscription).toBe("function");
    });
  });

  describe("Helper functions", () => {
    it("exports detectContainerKind helper", () => {
      expect(RuntimeExports.detectContainerKind).toBeDefined();
      expect(typeof RuntimeExports.detectContainerKind).toBe("function");
    });

    it("exports detectPhase helper", () => {
      expect(RuntimeExports.detectPhase).toBeDefined();
      expect(typeof RuntimeExports.detectPhase).toBe("function");
    });

    it("exports buildTypedSnapshot helper", () => {
      expect(RuntimeExports.buildTypedSnapshot).toBeDefined();
      expect(typeof RuntimeExports.buildTypedSnapshot).toBe("function");
    });
  });

  describe("Type exports (compile-time verification)", () => {
    it("InspectorAPI type is accessible", () => {
      // This test passes if it compiles - verifies type export
      const _typeCheck: RuntimeExports.InspectorAPI | null = null;
      expect(_typeCheck).toBeNull();
    });

    it("InspectorWithSubscription type is accessible", () => {
      const _typeCheck: RuntimeExports.InspectorWithSubscription | null = null;
      expect(_typeCheck).toBeNull();
    });

    it("InspectorEvent type is accessible", () => {
      const _typeCheck: RuntimeExports.InspectorEvent | null = null;
      expect(_typeCheck).toBeNull();
    });

    it("InspectorListener type is accessible", () => {
      const _typeCheck: RuntimeExports.InspectorListener | null = null;
      expect(_typeCheck).toBeNull();
    });

    it("InspectorAdapterInfo type is accessible", () => {
      const _typeCheck: RuntimeExports.InspectorAdapterInfo | null = null;
      expect(_typeCheck).toBeNull();
    });

    it("VisualizableAdapter type is accessible", () => {
      const _typeCheck: RuntimeExports.VisualizableAdapter | null = null;
      expect(_typeCheck).toBeNull();
    });

    it("ContainerGraphData type is accessible", () => {
      const _typeCheck: RuntimeExports.ContainerGraphData | null = null;
      expect(_typeCheck).toBeNull();
    });

    it("ContainerWithInspector type is accessible", () => {
      const _typeCheck: RuntimeExports.ContainerWithInspector | null = null;
      expect(_typeCheck).toBeNull();
    });
  });
});
