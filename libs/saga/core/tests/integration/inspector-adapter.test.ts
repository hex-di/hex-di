/**
 * Tests for createSagaInspectorAdapter
 *
 * Verifies that the adapter provides the correct port, requires SagaRegistryPort,
 * has singleton lifetime, creates a working inspector from deps, and properly
 * disposes via the finalizer.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/core";
import { createSagaInspectorAdapter } from "../../src/integration/inspector-adapter.js";
import { SagaInspectorPort, SagaRegistryPort } from "../../src/ports/factory.js";
import { createSagaRegistry } from "../../src/introspection/saga-registry.js";
import { defineStep } from "../../src/step/builder.js";
import { defineSaga } from "../../src/saga/builder.js";

// =============================================================================
// Test Setup
// =============================================================================

const TestPort = createPort<"TestPort", any>({ name: "TestPort" });

const TestStep = defineStep("TestStep")
  .io<{ value: number }, { result: number }>()
  .invoke(TestPort, ctx => ctx.input)
  .build();

const TestSaga = defineSaga("TestSaga")
  .input<{ value: number }>()
  .step(TestStep)
  .output(r => r.TestStep)
  .build();

// =============================================================================
// Tests
// =============================================================================

describe("createSagaInspectorAdapter", () => {
  it("provides SagaInspectorPort", () => {
    const adapter = createSagaInspectorAdapter({ definitions: [] });
    expect(adapter.provides).toBe(SagaInspectorPort);
  });

  it("requires SagaRegistryPort", () => {
    const adapter = createSagaInspectorAdapter({ definitions: [] });
    expect(adapter.requires).toHaveLength(1);
    expect(adapter.requires[0]).toBe(SagaRegistryPort);
  });

  it("has singleton lifetime", () => {
    const adapter = createSagaInspectorAdapter({ definitions: [] });
    expect(adapter.lifetime).toBe("singleton");
  });

  it("has sync factoryKind", () => {
    const adapter = createSagaInspectorAdapter({ definitions: [] });
    expect(adapter.factoryKind).toBe("sync");
  });

  it("is not clonable", () => {
    const adapter = createSagaInspectorAdapter({ definitions: [] });
    expect(adapter.clonable).toBe(false);
  });

  it("is frozen", () => {
    const adapter = createSagaInspectorAdapter({ definitions: [] });
    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it("factory creates a working inspector with definitions", () => {
    const adapter = createSagaInspectorAdapter({
      definitions: [TestSaga],
    });

    const registry = createSagaRegistry();
    const deps = { SagaRegistry: registry };

    const inspector = adapter.factory(deps);

    // Inspector should reflect the definitions
    const defs = inspector.getDefinitions();
    expect(defs).toHaveLength(1);
    expect(defs[0].name).toBe("TestSaga");
    expect(defs[0].steps).toHaveLength(1);
    expect(defs[0].steps[0].name).toBe("TestStep");

    registry.dispose();
  });

  it("factory creates inspector that returns suggestions", () => {
    const adapter = createSagaInspectorAdapter({
      definitions: [TestSaga],
    });

    const registry = createSagaRegistry();
    const deps = { SagaRegistry: registry };

    const inspector = adapter.factory(deps);
    const suggestions = inspector.getSuggestions();

    // TestStep has no compensation, so there should be a suggestion
    const compensationSuggestion = suggestions.find(
      s => s.type === "saga_step_without_compensation" && s.stepName === "TestStep"
    );
    expect(compensationSuggestion).toBeDefined();

    registry.dispose();
  });

  it("finalizer calls dispose on inspector if present", () => {
    const adapter = createSagaInspectorAdapter({ definitions: [] });

    const registry = createSagaRegistry();
    const deps = { SagaRegistry: registry };
    const inspector = adapter.factory(deps);

    // Should not throw
    expect(() => adapter.finalizer?.(inspector)).not.toThrow();

    registry.dispose();
  });
});
