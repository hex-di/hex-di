/**
 * Tests for lazy-loaded child containers.
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPort } from "@hex-di/ports";
import { createAdapter, GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/index.js";

// =============================================================================
// Test Service Interfaces
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface PluginService {
  name: string;
  activate(): void;
}

interface ExtensionService {
  id: string;
}

// =============================================================================
// Test Ports
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const PluginPort = createPort<"Plugin", PluginService>("Plugin");
const ExtensionPort = createPort<"Extension", ExtensionService>("Extension");

// =============================================================================
// Test Fixtures
// =============================================================================

function createParentGraph() {
  const LoggerAdapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: vi.fn() }),
  });

  return GraphBuilder.create().provide(LoggerAdapter).build();
}

/**
 * Creates a self-contained plugin graph.
 * Used for most tests where we need type-safe, complete graphs.
 */
function createPluginGraph() {
  // Include logger to make the graph self-contained for type tests
  const ChildLoggerAdapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: vi.fn() }),
  });

  const PluginAdapter = createAdapter({
    provides: PluginPort,
    requires: [LoggerPort],
    lifetime: "singleton",
    factory: deps => ({
      name: "TestPlugin",
      activate: () => deps.Logger.log("Plugin activated"),
    }),
  });

  return GraphBuilder.create().provide(ChildLoggerAdapter).provide(PluginAdapter).build();
}

/**
 * Creates an extension-only graph that doesn't override parent ports.
 * Used for testing inheritance modes since it relies on parent's Logger.
 */
function createExtensionGraph() {
  const ExtensionAdapter = createAdapter({
    provides: ExtensionPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ id: "ext-123" }),
  });

  return GraphBuilder.create().provide(ExtensionAdapter).build();
}

// =============================================================================
// createChildAsync Tests
// =============================================================================

describe("createChildAsync", () => {
  it("loads graph and returns container", async () => {
    const parentGraph = createParentGraph();
    const container = createContainer(parentGraph, { name: "Test" });

    const pluginContainer = await container.createChildAsync(
      () => Promise.resolve(createPluginGraph()),
      { name: "Plugin" }
    );

    // Should be able to resolve from child
    const plugin = pluginContainer.resolve(PluginPort);
    expect(plugin.name).toBe("TestPlugin");

    await container.dispose();
  });

  it("returned container works like normal child container", async () => {
    const parentGraph = createParentGraph();
    const container = createContainer(parentGraph, { name: "Test" });

    const pluginContainer = await container.createChildAsync(
      () => Promise.resolve(createPluginGraph()),
      { name: "Plugin" }
    );

    // Can resolve parent ports
    const logger = pluginContainer.resolve(LoggerPort);
    expect(logger).toBeDefined();

    // Can resolve child ports
    const plugin = pluginContainer.resolve(PluginPort);
    expect(plugin).toBeDefined();

    // Child has parent reference
    expect(pluginContainer.parent).toBeDefined();

    await container.dispose();
  });

  it("passes inheritance modes correctly", async () => {
    const parentGraph = createParentGraph();
    const container = createContainer(parentGraph, { name: "Test" });

    // Resolve logger from parent first
    const parentLogger = container.resolve(LoggerPort);

    // Use extension graph (doesn't provide Logger) to test inheritance modes
    const childContainer = await container.createChildAsync(
      () => Promise.resolve(createExtensionGraph()),
      { name: "Child", inheritanceModes: { Logger: "isolated" } }
    );

    // With isolated mode, child should have a different logger instance
    const childLogger = childContainer.resolve(LoggerPort);
    expect(childLogger).not.toBe(parentLogger);

    await container.dispose();
  });

  it("handles graph loader errors", async () => {
    const parentGraph = createParentGraph();
    const container = createContainer(parentGraph, { name: "Test" });

    await expect(
      container.createChildAsync(() => Promise.reject(new Error("Load failed")), { name: "Failed" })
    ).rejects.toThrow("Load failed");

    await container.dispose();
  });
});

// =============================================================================
// createLazyChild Tests
// =============================================================================

describe("createLazyChild", () => {
  let parentContainer: ReturnType<typeof createContainer<typeof LoggerPort>>;

  beforeEach(() => {
    const parentGraph = createParentGraph();
    parentContainer = createContainer(parentGraph, { name: "Test" });
  });

  describe("basic functionality", () => {
    it("returns immediately without loading", () => {
      const graphLoader = vi.fn(() => Promise.resolve(createPluginGraph()));

      const lazyPlugin = parentContainer.createLazyChild(graphLoader, { name: "Lazy" });

      // Should not have called graphLoader yet
      expect(graphLoader).not.toHaveBeenCalled();
      expect(lazyPlugin.isLoaded).toBe(false);
    });

    it("first resolve triggers load", async () => {
      const graphLoader = vi.fn(() => Promise.resolve(createPluginGraph()));

      const lazyPlugin = parentContainer.createLazyChild(graphLoader, { name: "Lazy" });

      const plugin = await lazyPlugin.resolve(PluginPort);

      expect(graphLoader).toHaveBeenCalledTimes(1);
      expect(lazyPlugin.isLoaded).toBe(true);
      expect(plugin.name).toBe("TestPlugin");
    });

    it("subsequent resolves do not reload", async () => {
      const graphLoader = vi.fn(() => Promise.resolve(createPluginGraph()));

      const lazyPlugin = parentContainer.createLazyChild(graphLoader, { name: "Lazy" });

      await lazyPlugin.resolve(PluginPort);
      await lazyPlugin.resolve(PluginPort);
      await lazyPlugin.resolve(PluginPort);

      expect(graphLoader).toHaveBeenCalledTimes(1);
    });

    it("resolveAsync works the same as resolve", async () => {
      const graphLoader = vi.fn(() => Promise.resolve(createPluginGraph()));

      const lazyPlugin = parentContainer.createLazyChild(graphLoader, { name: "Lazy" });

      const plugin = await lazyPlugin.resolveAsync(PluginPort);

      expect(graphLoader).toHaveBeenCalledTimes(1);
      expect(plugin.name).toBe("TestPlugin");
    });
  });

  describe("explicit loading", () => {
    it("load() can be called explicitly", async () => {
      const graphLoader = vi.fn(() => Promise.resolve(createPluginGraph()));

      const lazyPlugin = parentContainer.createLazyChild(graphLoader, { name: "Lazy" });

      const container = await lazyPlugin.load();

      expect(graphLoader).toHaveBeenCalledTimes(1);
      expect(lazyPlugin.isLoaded).toBe(true);

      // Can use container synchronously after load
      const plugin = container.resolve(PluginPort);
      expect(plugin.name).toBe("TestPlugin");
    });

    it("concurrent loads share same promise", async () => {
      const graphLoader = vi.fn(() => Promise.resolve(createPluginGraph()));

      const lazyPlugin = parentContainer.createLazyChild(graphLoader, { name: "Lazy" });

      // Start multiple loads concurrently
      const load1 = lazyPlugin.load();
      const load2 = lazyPlugin.load();
      const load3 = lazyPlugin.load();

      const [container1, container2, container3] = await Promise.all([load1, load2, load3]);

      // Should only have loaded once
      expect(graphLoader).toHaveBeenCalledTimes(1);

      // All should return the same container
      expect(container1).toBe(container2);
      expect(container2).toBe(container3);
    });
  });

  describe("has() behavior", () => {
    it("has() works before loading (delegates to parent)", () => {
      const lazyPlugin = parentContainer.createLazyChild(
        () => Promise.resolve(createPluginGraph()),
        { name: "Lazy" }
      );

      // Before loading, can check parent ports
      expect(lazyPlugin.has(LoggerPort)).toBe(true);
      // Cannot check child-only ports before loading
      expect(lazyPlugin.has(PluginPort)).toBe(false);
    });

    it("has() works after loading (includes child graph)", async () => {
      const lazyPlugin = parentContainer.createLazyChild(
        () => Promise.resolve(createPluginGraph()),
        { name: "Lazy" }
      );

      await lazyPlugin.load();

      expect(lazyPlugin.has(LoggerPort)).toBe(true);
      expect(lazyPlugin.has(PluginPort)).toBe(true);
    });
  });

  describe("disposal", () => {
    it("dispose() works before loading", async () => {
      const graphLoader = vi.fn(() => Promise.resolve(createPluginGraph()));

      const lazyPlugin = parentContainer.createLazyChild(graphLoader, { name: "Lazy" });

      await lazyPlugin.dispose();

      expect(lazyPlugin.isDisposed).toBe(true);
      expect(graphLoader).not.toHaveBeenCalled();
    });

    it("dispose() disposes loaded container", async () => {
      const lazyPlugin = parentContainer.createLazyChild(
        () => Promise.resolve(createPluginGraph()),
        { name: "Lazy" }
      );

      await lazyPlugin.load();
      await lazyPlugin.dispose();

      expect(lazyPlugin.isDisposed).toBe(true);
    });

    it("dispose() prevents further operations", async () => {
      const lazyPlugin = parentContainer.createLazyChild(
        () => Promise.resolve(createPluginGraph()),
        { name: "Lazy" }
      );

      await lazyPlugin.dispose();

      await expect(lazyPlugin.resolve(PluginPort)).rejects.toThrow("disposed");
      await expect(lazyPlugin.load()).rejects.toThrow("disposed");
    });

    it("double dispose is safe", async () => {
      const lazyPlugin = parentContainer.createLazyChild(
        () => Promise.resolve(createPluginGraph()),
        { name: "Lazy" }
      );

      await lazyPlugin.dispose();
      await lazyPlugin.dispose(); // Should not throw

      expect(lazyPlugin.isDisposed).toBe(true);
    });
  });

  describe("error handling", () => {
    it("load failure allows retry", async () => {
      let callCount = 0;
      const graphLoader = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error("First load failed"));
        }
        return Promise.resolve(createPluginGraph());
      });

      const lazyPlugin = parentContainer.createLazyChild(graphLoader, { name: "Lazy" });

      // First load fails
      await expect(lazyPlugin.load()).rejects.toThrow("First load failed");
      expect(lazyPlugin.isLoaded).toBe(false);

      // Second load succeeds
      const container = await lazyPlugin.load();
      expect(lazyPlugin.isLoaded).toBe(true);
      expect(container.resolve(PluginPort).name).toBe("TestPlugin");
    });
  });

  describe("inheritance modes", () => {
    it("passes inheritance modes to child container", async () => {
      // Resolve logger from parent first
      const parentLogger = parentContainer.resolve(LoggerPort);

      // Use extension graph (doesn't provide Logger) to test inheritance modes
      const lazyExtension = parentContainer.createLazyChild(
        () => Promise.resolve(createExtensionGraph()),
        { name: "Lazy", inheritanceModes: { Logger: "isolated" } }
      );

      // Load the container
      const loadedContainer = await lazyExtension.load();

      // The loaded container should have isolated logger
      const childLogger = loadedContainer.resolve(LoggerPort);

      // With isolated mode, should be different instances
      expect(childLogger).not.toBe(parentLogger);
    });
  });
});

// =============================================================================
// Type Tests
// =============================================================================

describe("LazyContainer type safety", () => {
  it("infers correct types for resolve", async () => {
    const parentGraph = createParentGraph();
    const container = createContainer(parentGraph, { name: "Test" });

    const lazyPlugin = container.createLazyChild(() => Promise.resolve(createPluginGraph()), {
      name: "Lazy",
    });

    // Type should be inferred correctly
    const plugin = await lazyPlugin.resolve(PluginPort);
    // TypeScript knows this is PluginService
    plugin.activate();
    expect(plugin.name).toBe("TestPlugin");

    await container.dispose();
  });

  it("load() returns typed Container", async () => {
    const parentGraph = createParentGraph();
    const container = createContainer(parentGraph, { name: "Test" });

    const lazyPlugin = container.createLazyChild(() => Promise.resolve(createPluginGraph()), {
      name: "Lazy",
    });

    const loadedContainer = await lazyPlugin.load();

    // Can resolve sync from loaded container
    const plugin = loadedContainer.resolve(PluginPort);
    expect(plugin.name).toBe("TestPlugin");

    await container.dispose();
  });
});
