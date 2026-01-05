/**
 * Test that verifies scopes created through RuntimeResolver wrapper are properly registered.
 * This test mimics exactly what React's AutoScopeProvider does.
 */

import { describe, test, expect, vi } from "vitest";
import { createContainer, createInspector, createPluginWrapper, pipe } from "../src/index.js";
import { createPort, type Port } from "@hex-di/ports";
import { createAdapter, GraphBuilder } from "@hex-di/graph";
import { definePlugin } from "../src/plugin/define.js";

describe("RuntimeResolver scope registration", () => {
  // Define a test port
  interface Logger {
    log: (msg: string) => void;
  }
  const LoggerPort = createPort<"Logger", Logger>("Logger");

  // Create adapter
  const LoggerAdapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: vi.fn() }),
  });

  // Build graph
  const graph = GraphBuilder.create().provide(LoggerAdapter).build();

  /**
   * Simulates what @hex-di/react's toRuntimeResolver does.
   * This is the exact pattern used in runtime-resolver.ts
   */
  interface RuntimeResolver {
    resolve: (port: Port<unknown, string>) => unknown;
    resolveAsync: (port: Port<unknown, string>) => Promise<unknown>;
    createScope: () => RuntimeResolver;
    dispose: () => Promise<void>;
    has: (port: Port<unknown, string>) => boolean;
    readonly isDisposed: boolean;
  }

  /**
   * Internal resolver interface that Container/Scope satisfy at runtime.
   * Uses method signatures for compatibility with Container's generic methods.
   */
  interface ResolverLike {
    resolve(port: Port<unknown, string>): unknown;
    resolveAsync(port: Port<unknown, string>): Promise<unknown>;
    createScope(): ResolverLike;
    dispose(): Promise<void>;
    has(port: Port<unknown, string>): boolean;
    readonly isDisposed: boolean;
  }

  function toRuntimeResolver(resolver: ResolverLike): RuntimeResolver {
    return {
      resolve: port => resolver.resolve(port),
      resolveAsync: port => resolver.resolveAsync(port),
      createScope: () => toRuntimeResolver(resolver.createScope()),
      dispose: () => resolver.dispose(),
      has: port => resolver.has(port),
      get isDisposed() {
        return resolver.isDisposed;
      },
    };
  }

  const container = createContainer(graph, { name: "Test" });

  test("scopes created through RuntimeResolver wrapper should be registered with the original container", () => {
    // Create RuntimeResolver wrapper like React does
    const runtimeResolver = toRuntimeResolver(container);

    // Create scopes through the wrapper (like AutoScopeProvider does)
    const _scope1 = runtimeResolver.createScope();
    const _scope2 = runtimeResolver.createScope();

    // Inspect the ORIGINAL container
    const inspector = createInspector(container);
    const tree = inspector.getScopeTree();

    // Scopes should be registered with the original container
    expect(tree.children.length).toBe(2);
  });

  test("nested scopes through wrapper should also be registered", () => {
    // Create a fresh container for this test
    const freshContainer = createContainer(graph, { name: "Test" });
    const runtimeResolver = toRuntimeResolver(freshContainer);

    // Create a scope and then a nested scope
    const scope1 = runtimeResolver.createScope();
    const _nestedScope = scope1.createScope();

    // Inspect the original container
    const inspector = createInspector(freshContainer);
    const tree = inspector.getScopeTree();

    // Should have 1 direct child scope
    expect(tree.children.length).toBe(1);

    // The child scope should have 1 nested child
    expect(tree.children[0]?.children.length).toBe(1);
  });

  test("scopes created through plugin-wrapped container should be visible to inspector", () => {
    // Create mock plugins like TracingPlugin and InspectorPlugin
    const MOCK_SYMBOL = Symbol("mock");
    const MockPlugin = definePlugin({
      name: "mock",
      symbol: MOCK_SYMBOL,
      requires: [],
      enhancedBy: [],
      createApi: () => ({ mock: true }),
    });
    const withMock = createPluginWrapper(MockPlugin);

    // Create plugin-wrapped container like App.tsx does
    const wrappedContainer = pipe(createContainer(graph, { name: "Test" }), withMock);

    // Create RuntimeResolver from the wrapped container (like AsyncContainerProvider does)
    const runtimeResolver = toRuntimeResolver(wrappedContainer);

    // Create scopes through the wrapper (like AutoScopeProvider does)
    const _scope1 = runtimeResolver.createScope();
    const _scope2 = runtimeResolver.createScope();

    // Inspect the WRAPPED container (like DevTools does)
    const inspector = createInspector(wrappedContainer);
    const tree = inspector.getScopeTree();

    // Scopes should be visible through the wrapped container
    expect(tree.children.length).toBe(2);
  });

  test("inspector created BEFORE scope creation should see scopes on refresh", () => {
    // Create fresh container
    const freshContainer = createContainer(graph, { name: "Test" });
    const runtimeResolver = toRuntimeResolver(freshContainer);

    // Create inspector FIRST (like DevTools does on initial mount)
    const inspector = createInspector(freshContainer);

    // Initially no scopes
    const treeBefore = inspector.getScopeTree();
    expect(treeBefore.children.length).toBe(0);

    // Now create scopes (like AutoScopeProvider does after mount)
    const _scope1 = runtimeResolver.createScope();
    const _scope2 = runtimeResolver.createScope();

    // Inspector should see scopes now (pull-based, reads fresh state)
    const treeAfter = inspector.getScopeTree();
    expect(treeAfter.children.length).toBe(2);
  });

  test("disposed scopes should be cleaned up when new scopes are registered (StrictMode simulation)", async () => {
    // This test simulates React StrictMode behavior:
    // 1. Component mounts → scope-1 created
    // 2. StrictMode unmount → scope-1 disposed
    // 3. StrictMode remount → scope-2 created
    //
    // Bug: disposed scope-1 stays in childScopes Set, blocking visibility

    const freshContainer = createContainer(graph, { name: "Test" });
    const runtimeResolver = toRuntimeResolver(freshContainer);
    const inspector = createInspector(freshContainer);

    // Step 1: First mount - create scope
    const scope1 = runtimeResolver.createScope();

    // Verify scope1 is visible
    const tree1 = inspector.getScopeTree();
    expect(tree1.children.length).toBe(1);

    // Step 2: StrictMode unmount - dispose scope
    await scope1.dispose();

    // Step 3: StrictMode remount - create new scope
    const _scope2 = runtimeResolver.createScope();

    // BUG: Before fix, disposed scope1 stays in Set, scope2 should be visible
    // The inspector should show exactly 1 active scope (scope2), not 0 or 2
    const tree2 = inspector.getScopeTree();
    expect(tree2.children.length).toBe(1);
    expect(tree2.children[0]?.status).toBe("active");
  });

  /**
   * This test simulates the EXACT React flow:
   * 1. Plugin-wrapped container passed to AsyncContainerProvider
   * 2. toRuntimeContainer wraps it
   * 3. initialize() returns a RuntimeResolver
   * 4. AutoScopeProvider creates scopes through that resolver
   * 5. DevTools inspector should see the scopes
   */
  interface RuntimeContainer {
    resolve: (port: Port<unknown, string>) => unknown;
    resolveAsync: (port: Port<unknown, string>) => Promise<unknown>;
    createScope: () => RuntimeResolver;
    dispose: () => Promise<void>;
    has: (port: Port<unknown, string>) => boolean;
    readonly isDisposed: boolean;
    initialize: () => Promise<RuntimeResolver>;
  }

  function toRuntimeContainer(
    cont: ResolverLike & { initialize?(): Promise<unknown> }
  ): RuntimeContainer {
    const base = toRuntimeResolver(cont);
    return {
      ...base,
      createScope: () => toRuntimeResolver(cont.createScope()),
      initialize: async () => {
        await cont.initialize?.();
        return base; // Returns the same resolver after init
      },
    };
  }

  test("scopes created after initialize() should be visible to inspector (React flow)", async () => {
    // Create plugin-wrapped container (like App.tsx does)
    const MOCK_SYMBOL = Symbol("mock");
    const MockPlugin = definePlugin({
      name: "mock",
      symbol: MOCK_SYMBOL,
      requires: [],
      enhancedBy: [],
      createApi: () => ({ mock: true }),
    });
    const withMock = createPluginWrapper(MockPlugin);
    const pluginContainer = pipe(createContainer(graph, { name: "Test" }), withMock);

    // Create inspector on the plugin-wrapped container (like DevTools does)
    const inspector = createInspector(pluginContainer);

    // Wrap with toRuntimeContainer (like AsyncContainerProvider does)
    const runtimeContainer = toRuntimeContainer(pluginContainer);

    // Initialize and get the resolver (like AsyncContainerProvider does)
    const resolver = await runtimeContainer.initialize();

    // Create scopes through the resolver (like AutoScopeProvider does)
    const _scope1 = resolver.createScope();
    const _scope2 = resolver.createScope();

    // DevTools inspector should see the scopes
    const tree = inspector.getScopeTree();
    expect(tree.children.length).toBe(2);
  });

  /**
   * This test uses the REAL toRuntimeContainer behavior from @hex-di/react.
   * The key difference: initialize() returns toRuntimeResolver(initialized),
   * NOT base. This means scopes are created through a DIFFERENT wrapper.
   */
  function toRuntimeContainerReal(
    cont: ResolverLike & { initialize?(): Promise<ResolverLike> }
  ): RuntimeContainer {
    const base = toRuntimeResolver(cont);
    return {
      ...base,
      createScope: () => toRuntimeResolver(cont.createScope()),
      initialize: async () => {
        if (cont.initialize) {
          const initialized = await cont.initialize();
          // KEY: Returns a wrapper around the INITIALIZED container, not base!
          return toRuntimeResolver(initialized);
        }
        return base;
      },
    };
  }

  test("REAL behavior: scopes through initialized wrapper visible to inspector", async () => {
    // Create plugin-wrapped container (like App.tsx does)
    const MOCK_SYMBOL = Symbol("mock");
    const MockPlugin = definePlugin({
      name: "mock",
      symbol: MOCK_SYMBOL,
      requires: [],
      enhancedBy: [],
      createApi: () => ({ mock: true }),
    });
    const withMock = createPluginWrapper(MockPlugin);
    const pluginContainer = pipe(createContainer(graph, { name: "Test" }), withMock);

    // Create inspector on the plugin-wrapped container (like DevTools does)
    const inspector = createInspector(pluginContainer);

    // Wrap with REAL toRuntimeContainer behavior
    const runtimeContainer = toRuntimeContainerReal(pluginContainer);

    // Initialize and get the resolver (like AsyncContainerProvider does)
    // This returns toRuntimeResolver(initialized), not base!
    const resolver = await runtimeContainer.initialize();

    // Create scopes through the resolver (like AutoScopeProvider does)
    const _scope1 = resolver.createScope();
    const _scope2 = resolver.createScope();

    // DevTools inspector should see the scopes
    // This tests the EXACT scenario the user reported
    const tree = inspector.getScopeTree();
    expect(tree.children.length).toBe(2);
  });

  test("scopes survive StrictMode mount/unmount/remount cycle", async () => {
    // This test exactly simulates React StrictMode behavior with AutoScopeProvider:
    // 1. First mount: scope created during render
    // 2. Unmount effect cleanup: void dispose() called (non-blocking)
    // 3. Remount: if isDisposed, create new scope

    const freshContainer = createContainer(graph, { name: "Test" });
    const inspector = createInspector(freshContainer);
    const runtimeResolver = toRuntimeResolver(freshContainer);

    // Step 1: First mount - create scope during render
    let scopeRef: RuntimeResolver | null = null;
    if (scopeRef === null) {
      scopeRef = runtimeResolver.createScope();
    }

    // Verify scope is visible
    expect(inspector.getScopeTree().children.length).toBe(1);

    // Step 2: StrictMode unmount - cleanup effect runs
    // In React, this is `void scopeRef.current.dispose()` - non-blocking
    void scopeRef.dispose();

    // Step 3: StrictMode remount - render happens BEFORE dispose completes
    // AutoScopeProvider checks: scopeRef.current === null || scopeRef.current.isDisposed
    // isDisposed is set synchronously at the START of dispose(), so this should be true
    if (scopeRef.isDisposed) {
      scopeRef = runtimeResolver.createScope();
    }

    // The new scope should be visible
    const tree = inspector.getScopeTree();
    expect(tree.children.length).toBe(1);
    expect(tree.children[0]?.status).toBe("active");
  });
});
