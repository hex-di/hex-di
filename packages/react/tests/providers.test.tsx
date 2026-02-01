/**
 * Unit tests for React Provider components.
 *
 * These tests verify:
 * 1. ContainerProvider renders children
 * 2. ContainerProvider provides container via context
 * 3. ScopeProvider renders children and provides scope
 * 4. AutoScopeProvider creates and disposes scope on lifecycle
 * 5. Nested ContainerProvider throws error
 * 6. AutoScopeProvider outside ContainerProvider throws MissingProviderError
 */

import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React, { useContext } from "react";
import { createPort, type InspectorAPI, type TracingAPI } from "@hex-di/core";
import { ContainerBrand, ScopeBrand, INTERNAL_ACCESS } from "@hex-di/runtime";
import type { Container, Scope, ContainerInternalState, ScopeInternalState } from "@hex-di/runtime";
import { MissingProviderError } from "../src/errors.js";
import {
  HexDiContainerProvider,
  HexDiScopeProvider,
  HexDiAutoScopeProvider,
} from "../src/providers/index.js";
import { ContainerContext } from "../src/context/container-context.jsx";
import { ResolverContext } from "../src/context/resolver-context.jsx";

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Simple service interface for testing.
 */
interface TestService {
  name: string;
}

/**
 * Port for testing resolution.
 */
const TestServicePort = createPort<"TestService", TestService>("TestService");

/**
 * Type alias for test containers.
 */
type TestContainer = Container<typeof TestServicePort>;
type TestScope = Scope<typeof TestServicePort>;

/**
 * Creates a mock scope for testing that satisfies the full Scope interface.
 *
 * The Container and Scope types from @hex-di/runtime are branded types
 * with unique symbol properties. To create properly typed mocks without
 * type assertions, we must satisfy the complete interface including the
 * brand symbols and internal access methods.
 */
function createMockScope(): TestScope {
  const mockResolve = vi.fn().mockReturnValue({ name: "scoped-test-service" });
  const mockCreateScope = vi.fn().mockImplementation(() => createMockScope());
  const mockDispose = vi.fn().mockResolvedValue(undefined);
  const mockResolveAsync = vi.fn().mockResolvedValue({ name: "scoped-test-service" });

  const mockInternalState: ScopeInternalState = {
    id: "mock-scope",
    disposed: false,
    scopedMemo: { size: 0, entries: [] },
    childScopes: [],
  };

  const mockScope: TestScope = {
    resolve: mockResolve,
    resolveAsync: mockResolveAsync,
    createScope: mockCreateScope,
    dispose: mockDispose,
    has: vi.fn().mockReturnValue(true),
    isDisposed: false,
    subscribe: vi.fn().mockReturnValue(() => {}),
    getDisposalState: vi.fn().mockReturnValue("active"),
    [ScopeBrand]: { provides: TestServicePort },
    [INTERNAL_ACCESS]: () => mockInternalState,
  };

  return mockScope;
}

/**
 * Creates a mock container for testing that satisfies the full Container interface.
 */
function createMockContainer(): TestContainer {
  const mockScope = createMockScope();

  const mockResolve = vi.fn().mockReturnValue({ name: "test-service" });
  const mockResolveAsync = vi.fn().mockResolvedValue({ name: "test-service" });
  const mockCreateScope = vi.fn().mockReturnValue(mockScope);
  const mockDispose = vi.fn().mockResolvedValue(undefined);
  const mockInitialize = vi.fn().mockImplementation(function (this: TestContainer) {
    return Promise.resolve(this);
  });

  const mockInternalState: ContainerInternalState = {
    containerId: "root",
    containerName: "TestContainer",
    disposed: false,
    singletonMemo: { size: 0, entries: [] },
    childScopes: [],
    childContainers: [],
    adapterMap: new Map(),
    overridePorts: new Set(),
    isOverride: () => false,
  };

  const mockInspector: InspectorAPI = {
    getSnapshot: vi
      .fn()
      .mockReturnValue({
        kind: "root",
        containerId: "root",
        containerName: "TestContainer",
        phase: "uninitialized",
        singletons: [],
        scopes: [],
        children: [],
      }),
    getScopeTree: vi.fn().mockReturnValue({ rootId: "root", name: "TestContainer", children: [] }),
    listPorts: vi.fn().mockReturnValue([]),
    isResolved: vi.fn().mockReturnValue(false),
    getContainerKind: vi.fn().mockReturnValue("root"),
    getPhase: vi.fn().mockReturnValue("uninitialized"),
    isDisposed: false,
  };

  const mockTracer: TracingAPI = {
    getTraces: vi.fn().mockReturnValue([]),
    getStats: vi
      .fn()
      .mockReturnValue({
        totalResolutions: 0,
        cacheHits: 0,
        cacheMisses: 0,
        avgResolutionMs: 0,
        portStats: new Map(),
      }),
    pause: vi.fn(),
    resume: vi.fn(),
    clear: vi.fn(),
    subscribe: vi.fn().mockReturnValue(() => {}),
    isPaused: vi.fn().mockReturnValue(false),
    pin: vi.fn(),
    unpin: vi.fn(),
  };

  const mockContainer: TestContainer = {
    resolve: mockResolve,
    resolveAsync: mockResolveAsync,
    createScope: mockCreateScope,
    createChild: vi.fn(),
    createChildAsync: vi.fn(),
    createLazyChild: vi.fn().mockReturnValue({
      resolve: vi.fn().mockResolvedValue({ name: "lazy-service" }),
      resolveAsync: vi.fn().mockResolvedValue({ name: "lazy-service" }),
      load: vi.fn(),
      isLoaded: false,
      isDisposed: false,
      has: vi.fn().mockReturnValue(true),
      dispose: vi.fn().mockResolvedValue(undefined),
    }),
    dispose: mockDispose,
    has: vi.fn().mockReturnValue(true),
    initialize: mockInitialize,
    isInitialized: false,
    isDisposed: false,
    name: "TestContainer",
    parentName: null,
    kind: "root",
    inspector: mockInspector,
    tracer: mockTracer,
    get parent(): never {
      throw new Error("Root containers do not have a parent");
    },
    [ContainerBrand]: { provides: TestServicePort, extends: undefined as never },
    [INTERNAL_ACCESS]: () => mockInternalState,
  } as TestContainer;

  return mockContainer;
}

// =============================================================================
// Helper Components for Testing
// =============================================================================

/**
 * Component that displays the container context value for testing.
 */
function ContainerConsumer(): React.ReactElement {
  const context = useContext(ContainerContext);
  return <div data-testid="container-value">{context ? "has-container" : "no-container"}</div>;
}

/**
 * Component that displays the resolver context value for testing.
 */
function ResolverConsumer(): React.ReactElement {
  const context = useContext(ResolverContext);
  return <div data-testid="resolver-value">{context ? "has-resolver" : "no-resolver"}</div>;
}

// =============================================================================
// ContainerProvider Tests
// =============================================================================

describe("ContainerProvider", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders children", () => {
    const container = createMockContainer();

    render(
      <HexDiContainerProvider container={container}>
        <div data-testid="child">Child Content</div>
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("child").textContent).toBe("Child Content");
  });

  it("provides container via context", () => {
    const container = createMockContainer();

    render(
      <HexDiContainerProvider container={container}>
        <ContainerConsumer />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("container-value").textContent).toBe("has-container");
  });

  it("throws MissingProviderError when nested ContainerProvider detected", () => {
    const container1 = createMockContainer();
    const container2 = createMockContainer();

    // Suppress React error boundary console output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(
        <HexDiContainerProvider container={container1}>
          <HexDiContainerProvider container={container2}>
            <div>Nested content</div>
          </HexDiContainerProvider>
        </HexDiContainerProvider>
      );
    }).toThrow(MissingProviderError);

    consoleSpy.mockRestore();
  });
});

// =============================================================================
// ScopeProvider Tests
// =============================================================================

describe("ScopeProvider", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders children and provides scope", () => {
    const container = createMockContainer();
    const scope = createMockScope();

    render(
      <HexDiContainerProvider container={container}>
        <HexDiScopeProvider scope={scope}>
          <div data-testid="child">Child Content</div>
          <ResolverConsumer />
        </HexDiScopeProvider>
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("child").textContent).toBe("Child Content");
    expect(screen.getByTestId("resolver-value").textContent).toBe("has-resolver");
  });
});

// =============================================================================
// AutoScopeProvider Tests
// =============================================================================

describe("AutoScopeProvider", () => {
  afterEach(() => {
    cleanup();
  });

  it("creates and disposes scope on lifecycle", async () => {
    const container = createMockContainer();
    const mockScope = createMockScope();
    (container.createScope as ReturnType<typeof vi.fn>).mockReturnValue(mockScope);

    const { unmount } = render(
      <HexDiContainerProvider container={container}>
        <HexDiAutoScopeProvider>
          <ResolverConsumer />
        </HexDiAutoScopeProvider>
      </HexDiContainerProvider>
    );

    // Verify scope was created
    expect(container.createScope).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("resolver-value").textContent).toBe("has-resolver");

    // Unmount and verify disposal
    unmount();

    // Wait for async dispose
    await vi.waitFor(() => {
      expect(mockScope.dispose).toHaveBeenCalledTimes(1);
    });
  });

  it("throws MissingProviderError when used outside ContainerProvider", () => {
    // Suppress React error boundary console output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(
        <HexDiAutoScopeProvider>
          <div>Content</div>
        </HexDiAutoScopeProvider>
      );
    }).toThrow(MissingProviderError);

    consoleSpy.mockRestore();
  });
});
