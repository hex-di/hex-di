/**
 * Integration test: React Scope Registration Flow.
 *
 * Tests the exact flow that happens in AsyncContainerProvider:
 * 1. Container created with plugin wrappers
 * 2. toRuntimeContainer wraps the container
 * 3. RuntimeContainer.initialize() is called
 * 4. Scope created via RuntimeResolver.createScope()
 * 5. Inspector on original container can see the scope
 *
 * This test uses the actual @hex-di/react conversion functions.
 *
 * @packageDocumentation
 */

import { describe, test, expect, vi } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { createContainer, createInspector, pipe, createPluginWrapper } from "@hex-di/runtime";
import { toRuntimeContainerWithInit } from "../src/internal/runtime-refs.js";

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

describe("React Scope Registration Flow (toRuntimeContainer)", () => {
  test("scope created via RuntimeResolver should appear in original container inspector", async () => {
    // Step 1: Create container with plugin (like in App.tsx)
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = pipe(createContainer(graph, { name: "TestContainer" }), withTestPlugin);

    // Step 2: Wrap in toRuntimeContainerWithInit (what AsyncContainerProvider does)
    const runtimeContainer = toRuntimeContainerWithInit(container);

    // Step 3: Call initialize() (what AsyncContainerProvider.initialize does)
    const initializedResolver = await runtimeContainer.initialize();

    // Step 4: Create scope via RuntimeResolver (what AutoScopeProvider does)
    const scope = initializedResolver.createScope("test-scope");
    expect(scope).toBeDefined();
    expect(scope.isDisposed).toBe(false);

    // Step 5: Check if scope appears in inspector (what DevTools does)
    // DevTools registers the ORIGINAL container (with plugins)
    const inspector = createInspector(container);
    const scopeTree = inspector.getScopeTree();

    // The scope should appear in the original container's inspector
    expect(scopeTree.children.length).toBe(1);
    expect(scopeTree.children[0].id).toBe("test-scope");
    expect(scopeTree.children[0].status).toBe("active");

    // Cleanup
    await scope.dispose();
    await container.dispose();
  });

  test("multiple scopes created via RuntimeResolver should all appear in inspector", async () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = pipe(createContainer(graph, { name: "TestContainer" }), withTestPlugin);
    const runtimeContainer = toRuntimeContainerWithInit(container);
    const initializedResolver = await runtimeContainer.initialize();

    // Create multiple scopes
    const scope1 = initializedResolver.createScope("scope-1");
    const scope2 = initializedResolver.createScope("scope-2");
    const scope3 = initializedResolver.createScope("scope-3");

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

  test("nested scopes via RuntimeResolver should appear hierarchically", async () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = pipe(createContainer(graph, { name: "TestContainer" }), withTestPlugin);
    const runtimeContainer = toRuntimeContainerWithInit(container);
    const initializedResolver = await runtimeContainer.initialize();

    // Create parent scope
    const parentScope = initializedResolver.createScope("parent-scope");
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

  test("scope created via RuntimeContainer.createScope (before initialize) should appear in inspector", async () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = pipe(createContainer(graph, { name: "TestContainer" }), withTestPlugin);
    const runtimeContainer = toRuntimeContainerWithInit(container);

    // Create scope BEFORE initializing (via RuntimeContainer, not RuntimeResolver)
    const scope = runtimeContainer.createScope("pre-init-scope");

    const inspector = createInspector(container);
    const scopeTree = inspector.getScopeTree();

    expect(scopeTree.children.length).toBe(1);
    expect(scopeTree.children[0].id).toBe("pre-init-scope");

    await scope.dispose();
    await container.dispose();
  });

  test("SIMULATES APP.TSX: inspector created FIRST, then scope created via initialized resolver", async () => {
    /**
     * This test simulates the EXACT order of operations in react-showcase App.tsx:
     *
     * 1. Container created at module level with plugins
     * 2. DevTools creates inspector (via useRegisterContainer → createInspectorsForContainers)
     * 3. AsyncContainerProvider initializes and stores resolver
     * 4. AutoScopeProvider creates scope via resolver.createScope()
     * 5. DevTools should see the scope when refreshing tree
     */
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();

    // Step 1: Container created at module level (like App.tsx line 49)
    const container = pipe(createContainer(graph, { name: "TestContainer" }), withTestPlugin);

    // Step 2: DevTools creates inspector FIRST (like useContainerScopeTree does)
    // This happens when DevTools mounts, which may be before scopes are created
    const inspector = createInspector(container);

    // Verify no scopes initially
    const initialTree = inspector.getScopeTree();
    expect(initialTree.children.length).toBe(0);

    // Step 3: AsyncContainerProvider initializes
    const runtimeContainer = toRuntimeContainerWithInit(container);
    const initializedResolver = await runtimeContainer.initialize();

    // Step 4: AutoScopeProvider creates scope via initialized resolver
    const scope = initializedResolver.createScope("app-scope");

    // Step 5: DevTools refreshes tree - should see scope
    const refreshedTree = inspector.getScopeTree();

    // THIS IS THE KEY ASSERTION - Does the inspector see the scope?
    expect(refreshedTree.children.length).toBe(1);
    expect(refreshedTree.children[0]?.id).toBe("app-scope");
    expect(refreshedTree.children[0]?.status).toBe("active");

    // Cleanup
    await scope.dispose();
    await container.dispose();
  });
});
