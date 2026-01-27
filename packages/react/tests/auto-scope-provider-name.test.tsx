/**
 * Tests for AutoScopeProvider name prop.
 *
 * Verifies that the `name` prop passed to AutoScopeProvider
 * is correctly used as the scope ID in the container.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { createContainer, INTERNAL_ACCESS } from "@hex-di/runtime";
import { createTypedHooks } from "../src/index.js";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";

// =============================================================================
// Test Setup
// =============================================================================

// Create a simple port for testing
const TestPort = createPort<"Test", { value: string }>("Test");

// Create typed hooks
const { ContainerProvider, AutoScopeProvider, usePort } = createTypedHooks<typeof TestPort>();

// =============================================================================
// Tests
// =============================================================================

describe("AutoScopeProvider name prop", () => {
  it("should pass name to createScope and use it as scope ID", () => {
    // Setup
    const testAdapter = createAdapter({
      provides: TestPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ value: "test" }),
    });
    const graph = GraphBuilder.create().provide(testAdapter).build();
    const container = createContainer(graph, { name: "TestContainer" });

    // Render with named AutoScopeProvider
    function TestComponent() {
      const test = usePort(TestPort);
      return <div>{test.value}</div>;
    }

    render(
      <ContainerProvider container={container}>
        <AutoScopeProvider name="custom-test-scope">
          <TestComponent />
        </AutoScopeProvider>
      </ContainerProvider>
    );

    // Get internal state to check scope names
    const internalState = container[INTERNAL_ACCESS]();
    const scopeIds = internalState.childScopes.map(s => s.id);

    // Verify scope has custom name
    expect(scopeIds).toContain("custom-test-scope");

    // Cleanup
    void container.dispose();
  });

  it("should use auto-generated name when name prop is not provided", () => {
    // Setup
    const testAdapter = createAdapter({
      provides: TestPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ value: "test" }),
    });
    const graph = GraphBuilder.create().provide(testAdapter).build();
    const container = createContainer(graph, { name: "TestContainer" });

    // Render without name prop
    function TestComponent() {
      const test = usePort(TestPort);
      return <div>{test.value}</div>;
    }

    render(
      <ContainerProvider container={container}>
        <AutoScopeProvider>
          <TestComponent />
        </AutoScopeProvider>
      </ContainerProvider>
    );

    // Get internal state to check scope names
    const internalState = container[INTERNAL_ACCESS]();
    const scopeIds = internalState.childScopes.map(s => s.id);

    // Verify scope has auto-generated name (starts with "scope-")
    expect(scopeIds.length).toBeGreaterThan(0);
    expect(scopeIds.some(id => /^scope-\d+$/.test(id))).toBe(true);

    // Cleanup
    void container.dispose();
  });
});
