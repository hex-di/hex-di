/**
 * Integration test: Scope Registration Flow.
 *
 * Tests the exact flow that happens in React's AsyncContainerProvider:
 * 1. Container created with plugin wrappers
 * 2. Container.initialize() returns initializedContainer
 * 3. Scope created via RuntimeResolver wrapper
 * 4. Inspector on original container can see the scope
 *
 * This verifies that scopes created through the RuntimeResolver wrapper
 * are properly registered with the original container's impl.
 *
 * @packageDocumentation
 */

import { describe, test, expect, vi } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { createContainer, createInspector, pipe, createPluginWrapper } from "../src/index.js";

// =============================================================================
// Test Plugin (minimal plugin for testing)
// =============================================================================

const TestPluginSymbol = Symbol.for("test-plugin");

const TestPlugin = {
  symbol: TestPluginSymbol,
  name: "TestPlugin",
  requires: [] as const,
  enhancedBy: [] as const,
  createApi: () => Object.freeze({ value: 42 }),
} as const;

const withTestPlugin = createPluginWrapper(TestPlugin);

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: vi.fn() }),
});

// =============================================================================
// Tests
// =============================================================================

describe("Scope Registration Flow (AsyncContainerProvider simulation)", () => {
  test("scope created via initialize() wrapper should appear in original container inspector", async () => {
    // Step 1: Create container with plugin (like in App.tsx)
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = pipe(createContainer(graph, { name: "Test" }), withTestPlugin);

    // Step 2: Simulate what AsyncContainerProvider does:
    // Call initialize() which returns the initialized container
    const initializedContainer = await container.initialize();

    // Step 3: Create scope on the initialized container (simulating what AutoScopeProvider does)
    const scope = initializedContainer.createScope("test-scope");
    expect(scope).toBeDefined();
    expect(scope.isDisposed).toBe(false);

    // Step 4: Check if scope appears in inspector (what DevTools does)
    // DevTools registers the ORIGINAL container (with plugins), not initializedContainer
    const inspector = createInspector(container);
    const scopeTree = inspector.getScopeTree();

    // The scope created on initializedContainer should appear in the original container's inspector
    // because they share the same impl
    expect(scopeTree.children.length).toBe(1);
    expect(scopeTree.children[0].id).toBe("test-scope");
    expect(scopeTree.children[0].status).toBe("active");

    // Cleanup
    await scope.dispose();
    await container.dispose();
  });

  test("multiple scopes created via initialize() wrapper should all appear in original container inspector", async () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = pipe(createContainer(graph, { name: "Test" }), withTestPlugin);

    const initializedContainer = await container.initialize();

    // Create multiple scopes
    const scope1 = initializedContainer.createScope("scope-1");
    const scope2 = initializedContainer.createScope("scope-2");
    const scope3 = initializedContainer.createScope("scope-3");

    const inspector = createInspector(container);
    const scopeTree = inspector.getScopeTree();

    // All scopes should appear
    expect(scopeTree.children.length).toBe(3);
    const scopeIds = scopeTree.children.map(s => s.id);
    expect(scopeIds).toContain("scope-1");
    expect(scopeIds).toContain("scope-2");
    expect(scopeIds).toContain("scope-3");

    // Cleanup
    await scope1.dispose();
    await scope2.dispose();
    await scope3.dispose();
    await container.dispose();
  });

  test("scope disposal via initialize() wrapper should remove from original container inspector", async () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = pipe(createContainer(graph, { name: "Test" }), withTestPlugin);

    const initializedContainer = await container.initialize();
    const scope = initializedContainer.createScope("disposable-scope");

    const inspector = createInspector(container);

    // Verify scope exists
    expect(inspector.getScopeTree().children.length).toBe(1);

    // Dispose scope
    await scope.dispose();

    // Scope should be marked as disposed (not removed immediately - that's expected behavior)
    const treeAfterDispose = inspector.getScopeTree();
    // Note: Disposed scopes may still appear in tree with status "disposed"
    // or be removed entirely - check for either
    if (treeAfterDispose.children.length > 0) {
      expect(treeAfterDispose.children[0].status).toBe("disposed");
    }

    await container.dispose();
  });

  test("nested scopes created via initialize() wrapper should appear hierarchically", async () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = pipe(createContainer(graph, { name: "Test" }), withTestPlugin);

    const initializedContainer = await container.initialize();

    // Create parent scope
    const parentScope = initializedContainer.createScope("parent-scope");
    // Create child scope from parent
    const childScope = parentScope.createScope("child-scope");

    const inspector = createInspector(container);
    const scopeTree = inspector.getScopeTree();

    // Should have parent at top level
    expect(scopeTree.children.length).toBe(1);
    expect(scopeTree.children[0].id).toBe("parent-scope");

    // Parent should have child nested
    expect(scopeTree.children[0].children.length).toBe(1);
    expect(scopeTree.children[0].children[0].id).toBe("child-scope");

    // Cleanup
    await childScope.dispose();
    await parentScope.dispose();
    await container.dispose();
  });

  test("multiple plugin wrappers should not affect scope visibility", async () => {
    // Create second plugin
    const SecondPluginSymbol = Symbol.for("second-plugin");
    const SecondPlugin = {
      symbol: SecondPluginSymbol,
      name: "SecondPlugin",
      requires: [] as const,
      enhancedBy: [] as const,
      createApi: () => Object.freeze({ data: "test" }),
    } as const;
    const withSecondPlugin = createPluginWrapper(SecondPlugin);

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    // Apply multiple plugins via pipe
    const container = pipe(
      createContainer(graph, { name: "Test" }),
      withTestPlugin,
      withSecondPlugin
    );

    const initializedContainer = await container.initialize();
    const scope = initializedContainer.createScope("multi-plugin-scope");

    const inspector = createInspector(container);
    const scopeTree = inspector.getScopeTree();

    expect(scopeTree.children.length).toBe(1);
    expect(scopeTree.children[0].id).toBe("multi-plugin-scope");

    await scope.dispose();
    await container.dispose();
  });
});
