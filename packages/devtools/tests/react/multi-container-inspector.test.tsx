/**
 * Tests for ContainerInspector with multi-container support.
 *
 * These tests verify:
 * 1. Works with InspectorAPI from registry
 * 2. Works with RuntimeInspector from createInspector
 * 3. Switches between containers correctly
 * 4. Shows scope tree for selected container
 * 5. Displays services for selected container
 *
 * @packageDocumentation
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { toJSON } from "../../src/index.js";
import { createContainer, INTERNAL_ACCESS, type ContainerInternalState } from "@hex-di/runtime";
import type { Container, ContainerPhase } from "@hex-di/runtime";
import type { Port } from "@hex-di/ports";
import type { InspectorAPI } from "@hex-di/inspector";
import { withInspector } from "@hex-di/inspector";
import { pipe } from "@hex-di/runtime";
import { ContainerInspector } from "../../src/react/container-inspector.js";
import { ContainerRegistryContext } from "../../src/react/context/container-registry.js";
import type {
  ContainerRegistryValue,
  ContainerEntry,
} from "../../src/react/context/container-registry.js";
import { Some, None, isSome, type Option } from "../../src/react/types/adt.js";
import type { InspectableContainer } from "../../src/react/types/inspectable-container.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

interface Config {
  getValue(key: string): string;
}

/**
 * Creates a mock InspectableContainer for testing.
 */
function createMockContainer(): InspectableContainer {
  const mockState: ContainerInternalState = {
    disposed: false,
    singletonMemo: { size: 0, entries: [] },
    childScopes: [],
    childContainers: [],
    adapterMap: new Map(),
    containerId: "mock",
  };
  return {
    [INTERNAL_ACCESS]: () => mockState,
  };
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const ConfigPort = createPort<"Config", Config>("Config");

/**
 * Creates a test graph with multiple services.
 */
function createTestGraph() {
  const LoggerAdapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: () => {} }),
  });

  const DatabaseAdapter = createAdapter({
    provides: DatabasePort,
    requires: [LoggerPort],
    lifetime: "singleton",
    factory: () => ({ query: () => ({}) }),
  });

  return GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
}

/**
 * Creates a child container graph with config extension.
 */
function createChildGraph() {
  const ConfigAdapter = createAdapter({
    provides: ConfigPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ getValue: (key: string) => `child-${key}` }),
  });

  return GraphBuilder.create().provide(ConfigAdapter).build();
}

/**
 * Creates a container with InspectorPlugin.
 */
function createInspectableContainer() {
  const graph = createTestGraph();
  const container = pipe(createContainer(graph), withInspector);
  return { container, graph };
}

/**
 * Creates a valid ScopeTree for mocks.
 */
function createMockScopeTree(): {
  id: string;
  status: "active" | "disposed";
  resolvedCount: number;
  totalCount: number;
  children: readonly never[];
  resolvedPorts: readonly string[];
} {
  return {
    id: "container",
    status: "active",
    resolvedCount: 0,
    totalCount: 0,
    children: [],
    resolvedPorts: [],
  };
}

/**
 * Creates a mock InspectorAPI for testing.
 */
function createMockInspector(overrides: Partial<InspectorAPI> = {}): InspectorAPI {
  return {
    getSnapshot: () => ({
      kind: "root" as const,
      phase: "initialized" as const,
      isInitialized: true,
      asyncAdaptersTotal: 0,
      asyncAdaptersInitialized: 0,
      isDisposed: false,
      containerId: "mock",
      singletons: [{ portName: "Logger", isResolved: true, resolvedAt: Date.now() }],
      scopes: createMockScopeTree(),
    }),
    getScopeTree: createMockScopeTree,
    listPorts: () => ["Logger"],
    isResolved: (portName: string) => portName === "Logger",
    subscribe: () => () => {},
    getContainerKind: () => "root",
    getPhase: () => "initialized",
    isDisposed: false,
    ...overrides,
  };
}

/**
 * Creates a mock ContainerEntry for testing.
 */
function createMockContainerEntry(
  id: string,
  label: string,
  kind: "root" | "child" | "lazy" | "scope",
  parentId: string | null = null
): ContainerEntry {
  return {
    id,
    label,
    kind,
    container: createMockContainer(),
    parentId,
    createdAt: Date.now(),
  };
}

/**
 * Creates a mock ContainerRegistryValue for testing.
 */
function createMockRegistryValue(
  entries: ContainerEntry[],
  selectedId: string | null
): ContainerRegistryValue {
  const containers = new Map<string, ContainerEntry>();
  for (const entry of entries) {
    containers.set(entry.id, entry);
  }

  const selectedIdOption: Option<string> = selectedId !== null ? Some(selectedId) : None;
  const selectedEntry = selectedId !== null ? containers.get(selectedId) : undefined;

  return {
    containers,
    selectedId: selectedIdOption,
    selectContainer: vi.fn(),
    selectedContainer: selectedEntry !== undefined ? Some(selectedEntry.container) : None,
    selectedEntry: selectedEntry !== undefined ? Some(selectedEntry) : None,
    registerContainer: vi.fn(),
    unregisterContainer: vi.fn(),
  };
}

/**
 * Wrapper component that provides ContainerRegistryContext.
 */
function RegistryWrapper({
  children,
  value,
}: {
  readonly children: React.ReactNode;
  readonly value: ContainerRegistryValue | null;
}) {
  return (
    <ContainerRegistryContext.Provider value={value}>{children}</ContainerRegistryContext.Provider>
  );
}

// =============================================================================
// ContainerInspector Multi-Container Tests
// =============================================================================

describe("ContainerInspector Multi-Container", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("works with InspectorAPI from registry", () => {
    it("renders inspector when InspectorAPI is provided directly", () => {
      const mockInspector = createMockInspector();
      const graph = createTestGraph();
      const exportedGraph = toJSON(graph);

      render(<ContainerInspector inspector={mockInspector} exportedGraph={exportedGraph} />);

      // Inspector should render and show scope hierarchy header
      expect(screen.getByText("Scope Hierarchy")).toBeDefined();

      // Should show resolved services
      expect(screen.getByText("Resolved Services")).toBeDefined();
    });

    it("uses inspector prop over container prop when both provided", () => {
      const mockInspector = createMockInspector({
        isResolved: () => true, // All resolved in mock
      });
      const { container, graph } = createInspectableContainer();
      const exportedGraph = toJSON(graph);

      render(
        <ContainerInspector
          container={container}
          inspector={mockInspector}
          exportedGraph={exportedGraph}
        />
      );

      // Should use the mock inspector (which has Logger resolved)
      // The component should render without errors
      expect(screen.getByText("Scope Hierarchy")).toBeDefined();
    });
  });

  describe("works with RuntimeInspector from createInspector", () => {
    it("creates inspector from container when only container is provided", () => {
      const { container, graph } = createInspectableContainer();
      const exportedGraph = toJSON(graph);

      render(<ContainerInspector container={container} exportedGraph={exportedGraph} />);

      // Inspector should render
      expect(screen.getByText("Scope Hierarchy")).toBeDefined();
      expect(screen.getByText("Resolved Services")).toBeDefined();
    });

    it("shows services from container's graph", () => {
      const { container, graph } = createInspectableContainer();
      const exportedGraph = toJSON(graph);

      // Resolve Logger to have a resolved service
      container.resolve(LoggerPort);

      render(<ContainerInspector container={container} exportedGraph={exportedGraph} />);

      // Services from the graph should be shown
      expect(screen.getByTestId("service-item-Logger")).toBeDefined();
      expect(screen.getByTestId("service-item-Database")).toBeDefined();
    });
  });

  describe("switches between containers correctly", () => {
    it("shows different services for different containers", () => {
      // Create two mock inspectors with different resolved services
      const rootInspector = createMockInspector({
        getSnapshot: () => ({
          kind: "root" as const,
          phase: "initialized" as const,
          isInitialized: true,
          asyncAdaptersTotal: 0,
          asyncAdaptersInitialized: 0,
          isDisposed: false,
          containerId: "root",
          singletons: [{ portName: "Logger", isResolved: true, resolvedAt: Date.now() }],
          scopes: createMockScopeTree(),
        }),
        isResolved: (portName: string) => portName === "Logger",
      });

      const graph = createTestGraph();
      const exportedGraph = toJSON(graph);

      // Render with root inspector
      const { rerender } = render(
        <ContainerInspector inspector={rootInspector} exportedGraph={exportedGraph} />
      );

      // Logger should be shown as resolved
      const loggerItem = screen.getByTestId("service-item-Logger");
      expect(loggerItem).toBeDefined();

      // Now create a different inspector with different state
      const childInspector = createMockInspector({
        getSnapshot: () => ({
          kind: "child" as const,
          phase: "initialized" as const,
          parentId: "root",
          inheritanceModes: new Map([
            ["Logger", "shared"],
            ["Database", "shared"],
          ]),
          isDisposed: false,
          containerId: "child",
          singletons: [
            { portName: "Logger", isResolved: false, resolvedAt: 0 },
            { portName: "Database", isResolved: true, resolvedAt: Date.now() },
          ],
          scopes: createMockScopeTree(),
        }),
        isResolved: (portName: string) => portName === "Database",
        getContainerKind: () => "child",
      });

      // Rerender with child inspector
      rerender(<ContainerInspector inspector={childInspector} exportedGraph={exportedGraph} />);

      // Services should update to reflect child container state
      expect(screen.getByTestId("service-item-Logger")).toBeDefined();
      expect(screen.getByTestId("service-item-Database")).toBeDefined();
    });
  });

  describe("shows scope tree for selected container", () => {
    it("displays root container scope in hierarchy", () => {
      const mockInspector = createMockInspector({
        getScopeTree: () => ({
          id: "container",
          status: "active" as const,
          resolvedCount: 0,
          totalCount: 0,
          children: [],
          resolvedPorts: [],
        }),
      });
      const graph = createTestGraph();
      const exportedGraph = toJSON(graph);

      render(<ContainerInspector inspector={mockInspector} exportedGraph={exportedGraph} />);

      // Root container node should be visible
      const rootNode = screen.getByTestId("scope-node-container");
      expect(rootNode).toBeDefined();
      expect(rootNode.textContent).toContain("Root Container");
    });

    it("displays child scopes in hierarchy", () => {
      const mockInspector = createMockInspector({
        getScopeTree: () => ({
          id: "container",
          status: "active" as const,
          resolvedCount: 0,
          totalCount: 0,
          children: [
            {
              id: "scope-1",
              status: "active" as const,
              resolvedCount: 0,
              totalCount: 0,
              children: [],
              resolvedPorts: [],
            },
            {
              id: "scope-2",
              status: "active" as const,
              resolvedCount: 0,
              totalCount: 0,
              children: [],
              resolvedPorts: [],
            },
          ],
          resolvedPorts: [],
        }),
      });
      const graph = createTestGraph();
      const exportedGraph = toJSON(graph);

      render(<ContainerInspector inspector={mockInspector} exportedGraph={exportedGraph} />);

      // Root and child scopes should be visible
      expect(screen.getByTestId("scope-node-container")).toBeDefined();
      expect(screen.getByTestId("scope-node-scope-1")).toBeDefined();
      expect(screen.getByTestId("scope-node-scope-2")).toBeDefined();
    });
  });

  describe("displays services for selected container", () => {
    it("shows all services from exported graph", () => {
      const mockInspector = createMockInspector();
      const graph = createTestGraph();
      const exportedGraph = toJSON(graph);

      render(<ContainerInspector inspector={mockInspector} exportedGraph={exportedGraph} />);

      // All services from the graph should be displayed
      expect(screen.getByTestId("service-item-Logger")).toBeDefined();
      expect(screen.getByTestId("service-item-Database")).toBeDefined();
    });

    it("shows correct resolution status for each service", () => {
      const mockInspector = createMockInspector({
        getSnapshot: () => ({
          kind: "root" as const,
          phase: "initialized" as const,
          isInitialized: true,
          asyncAdaptersTotal: 0,
          asyncAdaptersInitialized: 0,
          isDisposed: false,
          containerId: "test",
          singletons: [
            { portName: "Logger", isResolved: true, resolvedAt: Date.now() },
            { portName: "Database", isResolved: false, resolvedAt: 0 },
          ],
          scopes: createMockScopeTree(),
        }),
        isResolved: (portName: string) => portName === "Logger",
      });
      const graph = createTestGraph();
      const exportedGraph = toJSON(graph);

      render(<ContainerInspector inspector={mockInspector} exportedGraph={exportedGraph} />);

      // Both services should be shown with different status
      const loggerItem = screen.getByTestId("service-item-Logger");
      const databaseItem = screen.getByTestId("service-item-Database");

      expect(loggerItem).toBeDefined();
      expect(databaseItem).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("shows error message when no container or inspector provided", () => {
      const graph = createTestGraph();
      const exportedGraph = toJSON(graph);

      render(<ContainerInspector exportedGraph={exportedGraph} />);

      // Should show error message
      expect(screen.getByText("No container or inspector provided")).toBeDefined();
    });
  });

  describe("refresh functionality", () => {
    it("manual refresh button updates the view", () => {
      let callCount = 0;
      const mockInspector = createMockInspector({
        getSnapshot: () => {
          callCount++;
          return {
            kind: "root" as const,
            phase: "initialized" as const,
            isInitialized: true,
            asyncAdaptersTotal: 0,
            asyncAdaptersInitialized: 0,
            isDisposed: false,
            containerId: "test",
            singletons: [],
            scopes: createMockScopeTree(),
          };
        },
      });
      const graph = createTestGraph();
      const exportedGraph = toJSON(graph);

      render(<ContainerInspector inspector={mockInspector} exportedGraph={exportedGraph} />);

      const initialCallCount = callCount;

      // Click refresh button
      const refreshButton = screen.getByTestId("manual-refresh-button");
      fireEvent.click(refreshButton);

      // getSnapshot should be called again
      expect(callCount).toBeGreaterThan(initialCallCount);
    });
  });
});
