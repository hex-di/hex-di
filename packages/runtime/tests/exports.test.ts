/**
 * Tests for @hex-di/runtime public API exports.
 *
 * This test file verifies that:
 * 1. All public API exports are accessible
 * 2. Internal implementation classes are NOT exported
 * 3. Exports have the expected types
 *
 * NOTE: @hex-di/runtime does NOT re-export from @hex-di/core or @hex-di/graph.
 * Users should import directly from those packages.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import * as RuntimeExports from "../src/index.js";

// =============================================================================
// Public API Export Tests
// =============================================================================

describe("@hex-di/runtime exports", () => {
  const runtimeExports: Record<string, unknown> = { ...RuntimeExports };

  describe("createContainer function", () => {
    it("should export createContainer as a function", () => {
      expect(typeof RuntimeExports.createContainer).toBe("function");
    });
  });

  describe("Error classes", () => {
    it("should export ContainerError as a class", () => {
      expect(RuntimeExports.ContainerError).toBeDefined();
      expect(typeof RuntimeExports.ContainerError).toBe("function");
    });

    it("should export CircularDependencyError as a class", () => {
      expect(RuntimeExports.CircularDependencyError).toBeDefined();
      expect(typeof RuntimeExports.CircularDependencyError).toBe("function");
    });

    it("should export FactoryError as a class", () => {
      expect(RuntimeExports.FactoryError).toBeDefined();
      expect(typeof RuntimeExports.FactoryError).toBe("function");
    });

    it("should export DisposedScopeError as a class", () => {
      expect(RuntimeExports.DisposedScopeError).toBeDefined();
      expect(typeof RuntimeExports.DisposedScopeError).toBe("function");
    });

    it("should export ScopeRequiredError as a class", () => {
      expect(RuntimeExports.ScopeRequiredError).toBeDefined();
      expect(typeof RuntimeExports.ScopeRequiredError).toBe("function");
    });

    it("should have CircularDependencyError extend ContainerError", () => {
      const error = new RuntimeExports.CircularDependencyError(["A", "B", "A"]);
      expect(error).toBeInstanceOf(RuntimeExports.ContainerError);
      expect(error).toBeInstanceOf(Error);
    });

    it("should have FactoryError extend ContainerError", () => {
      const error = new RuntimeExports.FactoryError("TestPort", new Error("test"));
      expect(error).toBeInstanceOf(RuntimeExports.ContainerError);
      expect(error).toBeInstanceOf(Error);
    });

    it("should have DisposedScopeError extend ContainerError", () => {
      const error = new RuntimeExports.DisposedScopeError("TestPort");
      expect(error).toBeInstanceOf(RuntimeExports.ContainerError);
      expect(error).toBeInstanceOf(Error);
    });

    it("should have ScopeRequiredError extend ContainerError", () => {
      const error = new RuntimeExports.ScopeRequiredError("TestPort");
      expect(error).toBeInstanceOf(RuntimeExports.ContainerError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("Internal classes should NOT be exported", () => {
    it("should NOT export MemoMap", () => {
      expect(runtimeExports["MemoMap"]).toBeUndefined();
    });

    it("should NOT export ResolutionContext", () => {
      expect(runtimeExports["ResolutionContext"]).toBeUndefined();
    });

    it("should NOT export ContainerImpl", () => {
      expect(runtimeExports["ContainerImpl"]).toBeUndefined();
    });

    it("should NOT export ScopeImpl", () => {
      expect(runtimeExports["ScopeImpl"]).toBeUndefined();
    });

    it("should NOT export plugin system (removed)", () => {
      expect(runtimeExports["definePlugin"]).toBeUndefined();
      expect(runtimeExports["PluginManager"]).toBeUndefined();
      expect(runtimeExports["pipe"]).toBeUndefined();
      expect(runtimeExports["withInspector"]).toBeUndefined();
      expect(runtimeExports["withTracing"]).toBeUndefined();
    });
  });

  describe("Should NOT re-export from other packages", () => {
    it("should NOT export removed MemoryCollector", () => {
      expect(runtimeExports["MemoryCollector"]).toBeUndefined();
    });

    it("should NOT export removed NoOpCollector", () => {
      expect(runtimeExports["NoOpCollector"]).toBeUndefined();
    });

    it("should NOT export removed CompositeCollector", () => {
      expect(runtimeExports["CompositeCollector"]).toBeUndefined();
    });

    it("should NOT re-export inspectGraph (use @hex-di/graph/advanced)", () => {
      expect(runtimeExports["inspectGraph"]).toBeUndefined();
    });

    it("should NOT re-export createPort (use @hex-di/core)", () => {
      expect(runtimeExports["createPort"]).toBeUndefined();
    });

    it("should NOT re-export createAdapter (use @hex-di/core)", () => {
      expect(runtimeExports["createAdapter"]).toBeUndefined();
    });
  });

  describe("Expected export count", () => {
    it("should have the expected runtime exports", () => {
      // List of expected runtime value exports (not type-only exports)
      const expectedRuntimeExports = [
        // Error classes
        "ContainerError",
        "CircularDependencyError",
        "FactoryError",
        "DisposedScopeError",
        "ScopeRequiredError",
        "AsyncFactoryError",
        "AsyncInitializationRequiredError",
        "NonClonableForkedError",
        // Container brands
        "ContainerBrand",
        "ScopeBrand",
        // Context variable utilities
        "createContextVariableKey",
        "getContextVariable",
        "setContextVariable",
        "getContextVariableOrDefault",
        "portComparator",
        // Type guards
        "isPort",
        "isPortNamed",
        "isRecord",
        "isSealed",
        // Container factory
        "createContainer",
        // Override builder
        "OverrideBuilder",
        // Hooks utilities
        "sealHooks",
        // Inspection symbols
        "INTERNAL_ACCESS",
        "TRACING_ACCESS",
        // Inspector exports
        "createInspector",
        "getInternalAccessor",
        "INSPECTOR",
        "createInspectorAPI",
        "hasInspector",
        "getInspectorAPI",
        "detectContainerKind",
        "detectPhase",
        "buildTypedSnapshot",
        // Standalone inspection functions
        "inspect",
      ];

      // Verify all expected exports exist
      for (const exportName of expectedRuntimeExports) {
        expect(
          runtimeExports[exportName],
          `Expected export '${exportName}' to exist`
        ).toBeDefined();
      }

      // Get all actual runtime exports (excluding type-only exports)
      const actualExports = Object.keys(RuntimeExports);

      // Verify we have exactly the expected number of runtime exports
      expect(actualExports.sort()).toEqual(expectedRuntimeExports.sort());
    });
  });
});

// =============================================================================
// Type Export Tests
// =============================================================================

describe("Type exports (compile-time verification)", () => {
  /**
   * These tests verify that type exports are accessible at the type level.
   * They use TypeScript's type system to verify exports exist.
   * If any type is not exported, these will cause compile errors.
   */

  it("should export Container type", () => {
    type _Container = RuntimeExports.Container<never>;
    expect(true).toBe(true);
  });

  it("should export Scope type", () => {
    type _Scope = RuntimeExports.Scope<never>;
    expect(true).toBe(true);
  });

  it("should export InferContainerProvides type", () => {
    type _InferContainerProvides = RuntimeExports.InferContainerProvides<never>;
    expect(true).toBe(true);
  });

  it("should export InferScopeProvides type", () => {
    type _InferScopeProvides = RuntimeExports.InferScopeProvides<never>;
    expect(true).toBe(true);
  });

  it("should export IsResolvable type", () => {
    type _IsResolvable = RuntimeExports.IsResolvable<never, never>;
    expect(true).toBe(true);
  });

  it("should export ServiceFromContainer type", () => {
    type _ServiceFromContainer = RuntimeExports.ServiceFromContainer<never, never>;
    expect(true).toBe(true);
  });

  it("should export ContainerInternalState type", () => {
    type _ContainerInternalState = RuntimeExports.ContainerInternalState;
    expect(true).toBe(true);
  });

  it("should export ScopeInternalState type", () => {
    type _ScopeInternalState = RuntimeExports.ScopeInternalState;
    expect(true).toBe(true);
  });

  // Scope lifecycle event types
  it("should export ScopeLifecycleEvent type", () => {
    type _ScopeLifecycleEvent = RuntimeExports.ScopeLifecycleEvent;
    expect(true).toBe(true);
  });

  it("should export ScopeLifecycleListener type", () => {
    type _ScopeLifecycleListener = RuntimeExports.ScopeLifecycleListener;
    expect(true).toBe(true);
  });

  it("should export ScopeSubscription type", () => {
    type _ScopeSubscription = RuntimeExports.ScopeSubscription;
    expect(true).toBe(true);
  });

  it("should export ScopeDisposalState type", () => {
    type _ScopeDisposalState = RuntimeExports.ScopeDisposalState;
    expect(true).toBe(true);
  });
});
