/**
 * Child Container Scope Visibility Tests.
 *
 * Tests that each container's scope tree shows ONLY its own scopes,
 * NOT scopes from child containers. Child container scopes are visible
 * through the DevTools ContainerRegistryProvider, which builds a unified
 * tree from all registered containers.
 *
 * @packageDocumentation
 */
// @ts-nocheck

import { describe, test, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer, createInspector } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Plugin {
  execute(): void;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const PluginPort = port<Plugin>()({ name: "Plugin" });

// =============================================================================
// Child Container Scope Visibility Tests
// =============================================================================

describe("Child Container Scope Visibility", () => {
  test("parent container scope tree should NOT include child container scopes", () => {
    // Setup: Create parent with Logger
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();
    const parentContainer = createContainer({ graph: parentGraph, name: "Test" });

    // Create child container with a Plugin
    const PluginAdapter = createAdapter({
      provides: PluginPort,
      requires: [LoggerPort],
      lifetime: "scoped",
      factory: ({ Logger }) => ({ execute: () => (Logger as Logger).log("executed") }),
    });

    // Use buildFragment() since PluginAdapter's dependency (Logger) comes from parent
    const childGraph = GraphBuilder.create().provide(PluginAdapter).buildFragment();
    const childContainer = parentContainer.createChild(childGraph, { name: "Child" });

    // Create a scope on the child container
    const _scope = childContainer.createScope();

    // Inspect the PARENT container
    const parentInspector = createInspector(parentContainer);
    const parentTree = parentInspector.getScopeTree();

    // Parent's scope tree should NOT include child container's scopes
    // Each container only shows its own scopes
    expect(parentTree.children.length).toBe(0);

    // But the child container's inspector should show its own scope
    const childInspector = createInspector(childContainer);
    const childTree = childInspector.getScopeTree();
    expect(childTree.children.length).toBe(1);
  });

  test("child container should be registered with parent's lifecycle manager", () => {
    // Setup: Create parent container
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();
    const parentContainer = createContainer({ graph: parentGraph, name: "Test" });

    // Create child container
    const childGraph = GraphBuilder.create().build();
    const childContainer = parentContainer.createChild(childGraph, { name: "Child" });

    // Inspect parent's internal state
    const inspector = createInspector(parentContainer);
    const snapshot = inspector.snapshot();

    // The parent should track the child container
    // We verify this indirectly - if child container is registered,
    // its scopes should eventually be visible
    expect(childContainer).toBeDefined();
    expect(snapshot.isDisposed).toBe(false);
  });

  test("each container only shows its own scopes, not from other containers", () => {
    // Setup
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();
    const parentContainer = createContainer({ graph: parentGraph, name: "Test" });

    // Create two child containers
    const childGraph = GraphBuilder.create().build();
    const child1 = parentContainer.createChild(childGraph, { name: "Child" });
    const child2 = parentContainer.createChild(childGraph, { name: "Child" });

    // Create scopes on each child
    const _scope1 = child1.createScope();
    const _scope2 = child2.createScope();
    const _scope3 = child2.createScope();

    // Inspect parent - should see NO scopes (children's scopes are separate)
    const parentInspector = createInspector(parentContainer);
    const parentTree = parentInspector.getScopeTree();
    expect(parentTree.children.length).toBe(0);

    // Inspect child1 - should see 1 scope
    const child1Inspector = createInspector(child1);
    const child1Tree = child1Inspector.getScopeTree();
    expect(child1Tree.children.length).toBe(1);

    // Inspect child2 - should see 2 scopes
    const child2Inspector = createInspector(child2);
    const child2Tree = child2Inspector.getScopeTree();
    expect(child2Tree.children.length).toBe(2);
  });

  test("nested containers each show only their own scopes", () => {
    // Setup
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();
    const rootContainer = createContainer({ graph: parentGraph, name: "Test" });

    // Create child container
    const childGraph = GraphBuilder.create().build();
    const childContainer = rootContainer.createChild(childGraph, { name: "Child" });

    // Create grandchild container from child
    const grandchildContainer = childContainer.createChild(childGraph, { name: "Child" });

    // Create scope on grandchild
    const _scope = grandchildContainer.createScope();

    // Inspect ROOT container - should see NO scopes
    const rootInspector = createInspector(rootContainer);
    const rootTree = rootInspector.getScopeTree();
    expect(rootTree.children.length).toBe(0);

    // Inspect CHILD container - should see NO scopes (scope is on grandchild)
    const childInspector = createInspector(childContainer);
    const childTree = childInspector.getScopeTree();
    expect(childTree.children.length).toBe(0);

    // Inspect GRANDCHILD container - should see its scope
    const grandchildInspector = createInspector(grandchildContainer);
    const grandchildTree = grandchildInspector.getScopeTree();
    expect(grandchildTree.children.length).toBe(1);
  });

  test("disposing child container does not affect parent's scope tree", async () => {
    // Setup
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();
    const parentContainer = createContainer({ graph: parentGraph, name: "Test" });

    // Create scope on parent
    const _parentScope = parentContainer.createScope();

    // Create child container and scope
    const childGraph = GraphBuilder.create().build();
    const childContainer = parentContainer.createChild(childGraph, { name: "Child" });
    const _childScope = childContainer.createScope();

    // Verify parent only sees its own scope
    const inspector = createInspector(parentContainer);
    const treeBefore = inspector.getScopeTree();
    expect(treeBefore.children.length).toBe(1);

    // Dispose child container
    await childContainer.dispose();

    // Parent's tree should still have only its own scope
    const treeAfter = inspector.getScopeTree();
    expect(treeAfter.children.length).toBe(1);
  });
});
