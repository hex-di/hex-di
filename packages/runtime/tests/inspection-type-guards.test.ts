/**
 * Tests for src/inspection/type-guards.ts
 * hasInspector and getInspectorAPI check for INSPECTOR symbol on Container.
 */
import { describe, it, expect, vi } from "vitest";
import { hasInspector, getInspectorAPI } from "../src/inspection/type-guards.js";
import { INSPECTOR, INTERNAL_ACCESS } from "../src/inspection/symbols.js";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";

const PortA = port<string>()({ name: "PortA" });

function createTestContainer() {
  const adapter = createAdapter({
    provides: PortA,
    requires: [],
    lifetime: "singleton",
    factory: () => "value",
  });
  const graph = GraphBuilder.create().provide(adapter).build();
  return createContainer({ graph, name: "Test" });
}

describe("hasInspector", () => {
  it("returns a boolean for any container", () => {
    const container = createTestContainer();
    const result = hasInspector(container);
    expect(typeof result).toBe("boolean");
  });

  it("returns true when INSPECTOR symbol is in the container", () => {
    // Build a container-like object with INSPECTOR symbol
    const mockInspector = {
      getSnapshot: vi.fn(),
      listPorts: vi.fn(),
      isResolved: vi.fn(),
      getScopeTree: vi.fn(),
    };
    const fakeContainer = {
      [INSPECTOR]: mockInspector,
      [INTERNAL_ACCESS]: () => ({
        disposed: false,
        singletonMemo: { size: 0, entries: [] },
        childScopes: [],
        childContainers: [],
        adapterMap: new Map(),
        containerId: "test",
        containerName: "Test",
        overridePorts: new Set(),
        isOverride: () => false,
      }),
      resolve: () => {},
      resolveAsync: async () => {},
      createScope: () => {},
      dispose: async () => {},
      has: () => true,
      isDisposed: false,
      name: "Test",
    } as any;
    expect(hasInspector(fakeContainer)).toBe(true);
  });

  it("returns false when INSPECTOR symbol is not present", () => {
    const fakeContainer = {
      [INTERNAL_ACCESS]: () => ({}),
      resolve: () => {},
      resolveAsync: async () => {},
      createScope: () => {},
      dispose: async () => {},
      has: () => true,
      isDisposed: false,
      name: "Test",
    } as any;
    expect(hasInspector(fakeContainer)).toBe(false);
  });
});

describe("getInspectorAPI", () => {
  it("returns InspectorAPI when INSPECTOR symbol is present", () => {
    const mockApi = {
      getSnapshot: vi.fn(),
      listPorts: vi.fn(),
      isResolved: vi.fn(),
      getScopeTree: vi.fn(),
    };
    const fakeContainer = {
      [INSPECTOR]: mockApi,
      [INTERNAL_ACCESS]: () => ({
        disposed: false,
        singletonMemo: { size: 0, entries: [] },
        childScopes: [],
        childContainers: [],
        adapterMap: new Map(),
        containerId: "test",
        containerName: "Test",
        overridePorts: new Set(),
        isOverride: () => false,
      }),
      resolve: () => {},
      resolveAsync: async () => {},
      createScope: () => {},
      dispose: async () => {},
      has: () => true,
      isDisposed: false,
      name: "Test",
    } as any;
    const api = getInspectorAPI(fakeContainer);
    expect(api).toBeDefined();
    expect(api?.getSnapshot).toBe(mockApi.getSnapshot);
  });

  it("returns undefined when container lacks INSPECTOR symbol", () => {
    const fakeContainer = {
      [INTERNAL_ACCESS]: () => ({}),
      resolve: () => {},
      resolveAsync: async () => {},
      createScope: () => {},
      dispose: async () => {},
      has: () => true,
      isDisposed: false,
      name: "Test",
    } as any;
    const api = getInspectorAPI(fakeContainer);
    expect(api).toBeUndefined();
  });
});
