/**
 * Unit tests for React Provider nesting with child containers.
 *
 * These tests verify:
 * 1. Nested ContainerProvider with child container works
 * 2. useContainer() returns nearest container in tree
 * 3. usePort() resolves from nested child container
 * 4. Nested AsyncContainerProvider with async child container
 * 5. Compound components work with nested providers
 * 6. Disposal on unmount for nested providers
 * 7. usePort() resolves overridden port from child container
 * 8. Scoped ports work correctly with child container's scopes
 */

import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import React from "react";
import { createPort } from "@hex-di/ports";
import { ContainerBrand, ScopeBrand, INTERNAL_ACCESS } from "@hex-di/runtime";
import type { Container, Scope, ContainerInternalState, ScopeInternalState } from "@hex-di/runtime";
import { MissingProviderError } from "../src/errors.js";
import { ContainerProvider, AutoScopeProvider } from "../src/context.js";
import { AsyncContainerProvider } from "../src/async-container-provider.js";
import { useContainer } from "../src/use-container.js";
import { usePort } from "../src/use-port.js";

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
 * Second port for testing extended ports.
 */
interface ExtendedService {
  feature: string;
}
const ExtendedServicePort = createPort<"ExtendedService", ExtendedService>("ExtendedService");

/**
 * Type aliases for test containers.
 * With unified Container type:
 * - Root container: Container<TProvides, never, ...>
 * - Child container: Container<TProvides, TExtends, ...> where TExtends is the extended ports
 */
type TestContainer = Container<typeof TestServicePort, never, never, "uninitialized">;
type TestChildContainer = Container<
  typeof TestServicePort,
  typeof ExtendedServicePort,
  never,
  "uninitialized"
>;
type TestScope = Scope<typeof TestServicePort>;

/**
 * Creates a mock scope for testing.
 */
function createMockScope(name: string = "scoped-test-service"): TestScope {
  const mockResolve = vi.fn().mockReturnValue({ name });
  const mockCreateScope = vi.fn().mockImplementation(() => createMockScope(`nested-${name}`));
  const mockDispose = vi.fn().mockResolvedValue(undefined);
  const mockResolveAsync = vi.fn().mockResolvedValue({ name });

  const mockInternalState: ScopeInternalState = {
    id: `mock-scope-${name}`,
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
    [ScopeBrand]: { provides: TestServicePort },
    [INTERNAL_ACCESS]: () => mockInternalState,
  };

  return mockScope;
}

/**
 * Creates a mock container for testing.
 */
function createMockContainer(): TestContainer {
  const mockScope = createMockScope();

  const mockResolve = vi.fn().mockReturnValue({ name: "parent-service" });
  const mockResolveAsync = vi.fn().mockResolvedValue({ name: "parent-service" });
  const mockCreateScope = vi.fn().mockReturnValue(mockScope);
  const mockDispose = vi.fn().mockResolvedValue(undefined);
  const mockInitialize = vi.fn().mockImplementation(function (this: TestContainer) {
    return Promise.resolve(this);
  });
  const mockCreateChild = vi.fn();

  const mockInternalState: ContainerInternalState = {
    disposed: false,
    singletonMemo: { size: 0, entries: [] },
    childScopes: [],
    adapterMap: new Map(),
  };

  const mockContainer: TestContainer = {
    resolve: mockResolve,
    resolveAsync: mockResolveAsync,
    createScope: mockCreateScope,
    createChild: mockCreateChild,
    dispose: mockDispose,
    has: vi.fn().mockReturnValue(true),
    initialize: mockInitialize,
    isInitialized: false,
    isDisposed: false,
    get parent(): never {
      throw new Error("Root containers do not have a parent");
    },
    [ContainerBrand]: { provides: TestServicePort, extends: undefined as never },
    [INTERNAL_ACCESS]: () => mockInternalState,
  } as TestContainer;

  return mockContainer;
}

/**
 * Creates a mock child container for testing.
 * Child containers can resolve ports from parent and extended ports.
 */
function createMockChildContainer(
  parentContainer: TestContainer,
  options: {
    serviceName?: string;
    extendedFeature?: string;
  } = {}
): TestChildContainer {
  const { serviceName = "child-service", extendedFeature = "child-feature" } = options;
  const mockScope = createMockScope(serviceName);

  const mockResolve = vi.fn().mockImplementation(port => {
    if (port === TestServicePort) {
      return { name: serviceName };
    }
    if (port === ExtendedServicePort) {
      return { feature: extendedFeature };
    }
    throw new Error(`Unknown port: ${port.__portName}`);
  });
  const mockResolveAsync = vi.fn().mockImplementation(port => {
    return Promise.resolve(mockResolve(port));
  });
  const mockCreateScope = vi.fn().mockReturnValue(mockScope);
  const mockDispose = vi.fn().mockResolvedValue(undefined);
  const mockCreateChild = vi.fn();

  const mockInternalState: ContainerInternalState = {
    disposed: false,
    singletonMemo: { size: 0, entries: [] },
    childScopes: [],
    adapterMap: new Map(),
  };

  const mockChildContainer = {
    resolve: mockResolve,
    resolveAsync: mockResolveAsync,
    createScope: mockCreateScope,
    createChild: mockCreateChild,
    dispose: mockDispose,
    has: vi.fn().mockReturnValue(true),
    isInitialized: true,
    isDisposed: false,
    parent: parentContainer,
    // Child containers do not have initialize method
    initialize: undefined as never,
    [ContainerBrand]: {
      provides: TestServicePort,
      extends: ExtendedServicePort,
    },
    [INTERNAL_ACCESS]: () => mockInternalState,
  } as unknown as TestChildContainer;

  return mockChildContainer;
}

/**
 * Creates a mock uninitialized child container that needs async initialization.
 * Note: With unified Container type, child containers don't have initialize().
 * This mock is for testing async patterns with child containers.
 */
function createMockUninitializedChildContainer(
  parentContainer: TestContainer
): TestChildContainer & {
  initialize: () => Promise<TestChildContainer>;
} {
  const mockScope = createMockScope("async-child-service");
  let initialized = false;

  const initializedChildContainer = {
    resolve: vi.fn().mockImplementation(port => {
      if (port === TestServicePort) {
        return { name: "async-child-service" };
      }
      if (port === ExtendedServicePort) {
        return { feature: "async-extended-feature" };
      }
      throw new Error(`Unknown port`);
    }),
    resolveAsync: vi.fn().mockResolvedValue({ name: "async-child-service" }),
    createScope: vi.fn().mockReturnValue(mockScope),
    createChild: vi.fn(),
    dispose: vi.fn().mockResolvedValue(undefined),
    has: vi.fn().mockReturnValue(true),
    isInitialized: true,
    isDisposed: false,
    parent: parentContainer,
    initialize: undefined as never,
    [ContainerBrand]: {
      provides: TestServicePort,
      extends: ExtendedServicePort,
    },
    [INTERNAL_ACCESS]: () => ({
      disposed: false,
      singletonMemo: { size: 0, entries: [] },
      childScopes: [],
      adapterMap: new Map(),
    }),
  };

  const mockResolve = vi.fn().mockImplementation(port => {
    if (!initialized) {
      throw new Error("Child container not initialized");
    }
    if (port === TestServicePort) {
      return { name: "async-child-service" };
    }
    if (port === ExtendedServicePort) {
      return { feature: "async-extended-feature" };
    }
    throw new Error(`Unknown port`);
  });

  const mockInitialize = vi.fn().mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    initialized = true;
    return initializedChildContainer;
  });

  const mockInternalState: ContainerInternalState = {
    disposed: false,
    singletonMemo: { size: 0, entries: [] },
    childScopes: [],
    adapterMap: new Map(),
  };

  return {
    resolve: mockResolve,
    resolveAsync: vi.fn().mockResolvedValue({ name: "async-child-service" }),
    createScope: vi.fn().mockReturnValue(mockScope),
    createChild: vi.fn(),
    dispose: vi.fn().mockResolvedValue(undefined),
    has: vi.fn().mockReturnValue(true),
    initialize: mockInitialize,
    isInitialized: false,
    isDisposed: false,
    parent: parentContainer,
    [ContainerBrand]: {
      provides: TestServicePort,
      extends: ExtendedServicePort,
    },
    [INTERNAL_ACCESS]: () => mockInternalState,
  } as unknown as TestChildContainer & {
    initialize: () => Promise<TestChildContainer>;
  };
}

// =============================================================================
// Test 1: Nested ContainerProvider with child container works
// =============================================================================

describe("ContainerProvider nesting with child containers", () => {
  afterEach(() => {
    cleanup();
  });

  it("allows nesting when providing a child container", () => {
    const parentContainer = createMockContainer();
    const childContainer = createMockChildContainer(parentContainer);

    function TestComponent(): React.ReactElement {
      const service = usePort(TestServicePort);
      return <div data-testid="service-name">{service.name}</div>;
    }

    render(
      <ContainerProvider container={parentContainer}>
        <ContainerProvider
          container={childContainer as unknown as Container<typeof TestServicePort>}
        >
          <TestComponent />
        </ContainerProvider>
      </ContainerProvider>
    );

    // Should resolve from child container
    expect(screen.getByTestId("service-name").textContent).toBe("child-service");
    expect(childContainer.resolve).toHaveBeenCalledWith(TestServicePort);
    // Parent's resolve should NOT have been called
    expect(parentContainer.resolve).not.toHaveBeenCalled();
  });

  it("still throws when nesting two root containers", () => {
    const container1 = createMockContainer();
    const container2 = createMockContainer();

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(
        <ContainerProvider container={container1}>
          <ContainerProvider container={container2}>
            <div>Content</div>
          </ContainerProvider>
        </ContainerProvider>
      );
    }).toThrow(MissingProviderError);

    consoleSpy.mockRestore();
  });
});

// =============================================================================
// Test 2: useContainer() returns nearest container in tree
// =============================================================================

describe("useContainer() with nested providers", () => {
  afterEach(() => {
    cleanup();
  });

  it("returns nearest container in tree (child container when nested)", () => {
    const parentContainer = createMockContainer();
    const childContainer = createMockChildContainer(parentContainer);

    let capturedContainer: unknown;

    function TestComponent(): React.ReactElement {
      capturedContainer = useContainer();
      return <div data-testid="component">Rendered</div>;
    }

    render(
      <ContainerProvider container={parentContainer}>
        <ContainerProvider
          container={childContainer as unknown as Container<typeof TestServicePort>}
        >
          <TestComponent />
        </ContainerProvider>
      </ContainerProvider>
    );

    expect(capturedContainer).toBeDefined();
    expect((capturedContainer as any).resolve(TestServicePort).name).toBe("child-service");
    expect(screen.getByTestId("component").textContent).toBe("Rendered");
  });

  it("returns parent container when not nested", () => {
    const parentContainer = createMockContainer();

    let capturedContainer: unknown;

    function TestComponent(): React.ReactElement {
      capturedContainer = useContainer();
      return <div data-testid="component">Rendered</div>;
    }

    render(
      <ContainerProvider container={parentContainer}>
        <TestComponent />
      </ContainerProvider>
    );

    expect(capturedContainer).toBeDefined();
    expect((capturedContainer as any).resolve(TestServicePort).name).toBe("parent-service");
  });
});

// =============================================================================
// Test 3: usePort() resolves from nested child container
// =============================================================================

describe("usePort() with nested child containers", () => {
  afterEach(() => {
    cleanup();
  });

  it("resolves from nested child container", () => {
    const parentContainer = createMockContainer();
    const childContainer = createMockChildContainer(parentContainer, {
      serviceName: "overridden-child-service",
    });

    function TestComponent(): React.ReactElement {
      const service = usePort(TestServicePort);
      return <div data-testid="service-name">{service.name}</div>;
    }

    render(
      <ContainerProvider container={parentContainer}>
        <ContainerProvider
          container={childContainer as unknown as Container<typeof TestServicePort>}
        >
          <TestComponent />
        </ContainerProvider>
      </ContainerProvider>
    );

    expect(screen.getByTestId("service-name").textContent).toBe("overridden-child-service");
    expect(childContainer.resolve).toHaveBeenCalledWith(TestServicePort);
  });

  it("resolves from parent container when sibling (not nested)", () => {
    const parentContainer = createMockContainer();
    const childContainer = createMockChildContainer(parentContainer);

    function ParentConsumer(): React.ReactElement {
      const service = usePort(TestServicePort);
      return <div data-testid="parent-service">{service.name}</div>;
    }

    function ChildConsumer(): React.ReactElement {
      const service = usePort(TestServicePort);
      return <div data-testid="child-service">{service.name}</div>;
    }

    render(
      <ContainerProvider container={parentContainer}>
        <ParentConsumer />
        <ContainerProvider
          container={childContainer as unknown as Container<typeof TestServicePort>}
        >
          <ChildConsumer />
        </ContainerProvider>
      </ContainerProvider>
    );

    expect(screen.getByTestId("parent-service").textContent).toBe("parent-service");
    expect(screen.getByTestId("child-service").textContent).toBe("child-service");
  });
});

// =============================================================================
// Test 4: Nested AsyncContainerProvider with async child container
// =============================================================================

describe("AsyncContainerProvider with nested child containers", () => {
  afterEach(() => {
    cleanup();
  });

  it("handles async initialization for nested child containers", async () => {
    const parentContainer = createMockContainer();
    const asyncChildContainer = createMockUninitializedChildContainer(parentContainer);

    function TestComponent(): React.ReactElement {
      const service = usePort(TestServicePort);
      return <div data-testid="service-name">{service.name}</div>;
    }

    render(
      <ContainerProvider container={parentContainer}>
        <AsyncContainerProvider
          container={
            // Cast to root container type since AsyncContainerProvider requires initialize()
            asyncChildContainer as unknown as Container<
              typeof TestServicePort,
              never,
              never,
              "uninitialized"
            >
          }
          loadingFallback={<div data-testid="loading">Loading...</div>}
        >
          <TestComponent />
        </AsyncContainerProvider>
      </ContainerProvider>
    );

    // Initially should show loading
    expect(screen.getByTestId("loading").textContent).toBe("Loading...");

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId("service-name").textContent).toBe("async-child-service");
    });

    expect(asyncChildContainer.initialize).toHaveBeenCalled();
  });
});

// =============================================================================
// Test 5: Compound components work with nested providers
// =============================================================================

describe("Compound components with nested providers", () => {
  afterEach(() => {
    cleanup();
  });

  it("compound components (Loading, Error, Ready) work with nested child containers", async () => {
    const parentContainer = createMockContainer();
    const asyncChildContainer = createMockUninitializedChildContainer(parentContainer);

    function TestComponent(): React.ReactElement {
      const service = usePort(TestServicePort);
      return <div data-testid="service-name">{service.name}</div>;
    }

    render(
      <ContainerProvider container={parentContainer}>
        <AsyncContainerProvider
          container={
            // Cast to root container type since AsyncContainerProvider requires initialize()
            asyncChildContainer as unknown as Container<
              typeof TestServicePort,
              never,
              never,
              "uninitialized"
            >
          }
        >
          <AsyncContainerProvider.Loading>
            <div data-testid="compound-loading">Loading with compound...</div>
          </AsyncContainerProvider.Loading>
          <AsyncContainerProvider.Ready>
            <TestComponent />
          </AsyncContainerProvider.Ready>
          <AsyncContainerProvider.Error>
            {error => <div data-testid="compound-error">{error.message}</div>}
          </AsyncContainerProvider.Error>
        </AsyncContainerProvider>
      </ContainerProvider>
    );

    // Initially should show compound loading
    expect(screen.getByTestId("compound-loading").textContent).toBe("Loading with compound...");

    // Wait for initialization and ready state
    await waitFor(() => {
      expect(screen.getByTestId("service-name").textContent).toBe("async-child-service");
    });
  });
});

// =============================================================================
// Test 6: Disposal on unmount for nested providers
// =============================================================================

describe("Disposal on unmount for nested providers", () => {
  afterEach(() => {
    cleanup();
  });

  it("nested provider does not dispose parent on unmount", () => {
    const parentContainer = createMockContainer();
    const childContainer = createMockChildContainer(parentContainer);

    function TestComponent(): React.ReactElement {
      return <div data-testid="child-content">Child Content</div>;
    }

    function ParentContent(): React.ReactElement {
      return <div data-testid="parent-content">Parent Content</div>;
    }

    function App({ showChild }: { showChild: boolean }): React.ReactElement {
      return (
        <ContainerProvider container={parentContainer}>
          <ParentContent />
          {showChild && (
            <ContainerProvider
              container={childContainer as unknown as Container<typeof TestServicePort>}
            >
              <TestComponent />
            </ContainerProvider>
          )}
        </ContainerProvider>
      );
    }

    const { rerender } = render(<App showChild={true} />);

    expect(screen.getByTestId("child-content").textContent).toBe("Child Content");
    expect(screen.getByTestId("parent-content").textContent).toBe("Parent Content");

    // Unmount child provider
    rerender(<App showChild={false} />);

    // Parent should still be rendered and functional
    expect(screen.getByTestId("parent-content").textContent).toBe("Parent Content");
    expect(screen.queryByTestId("child-content")).toBeNull();

    // Parent container should NOT have been disposed
    expect(parentContainer.dispose).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Test 7: Scoped ports work correctly with child container's scopes
// =============================================================================

describe("Scoped ports with child container's scopes", () => {
  afterEach(() => {
    cleanup();
  });

  it("AutoScopeProvider creates scope from child container when nested", async () => {
    const parentContainer = createMockContainer();
    const childContainer = createMockChildContainer(parentContainer);
    const childScope = createMockScope("scoped-from-child");
    (childContainer.createScope as ReturnType<typeof vi.fn>).mockReturnValue(childScope);

    function ScopedComponent(): React.ReactElement {
      const service = usePort(TestServicePort);
      return <div data-testid="scoped-service">{service.name}</div>;
    }

    const { unmount } = render(
      <ContainerProvider container={parentContainer}>
        <ContainerProvider
          container={childContainer as unknown as Container<typeof TestServicePort>}
        >
          <AutoScopeProvider>
            <ScopedComponent />
          </AutoScopeProvider>
        </ContainerProvider>
      </ContainerProvider>
    );

    // AutoScopeProvider should have created scope from child container
    expect(childContainer.createScope).toHaveBeenCalledTimes(1);
    // Parent's createScope should NOT have been called
    expect(parentContainer.createScope).not.toHaveBeenCalled();

    // Should resolve from child's scope
    expect(screen.getByTestId("scoped-service").textContent).toBe("scoped-from-child");

    // Unmount and verify scope disposal
    unmount();

    await waitFor(() => {
      expect(childScope.dispose).toHaveBeenCalledTimes(1);
    });
  });
});

// =============================================================================
// Test 8: Multiple levels of nesting work correctly
// =============================================================================

describe("Multiple levels of nested providers", () => {
  afterEach(() => {
    cleanup();
  });

  it("resolves from deepest nested child container", () => {
    const parentContainer = createMockContainer();
    const childContainer = createMockChildContainer(parentContainer, {
      serviceName: "first-child-service",
    });
    const grandchildContainer = createMockChildContainer(
      childContainer as unknown as TestContainer,
      {
        serviceName: "grandchild-service",
      }
    );

    function TestComponent(): React.ReactElement {
      const service = usePort(TestServicePort);
      return <div data-testid="service-name">{service.name}</div>;
    }

    render(
      <ContainerProvider container={parentContainer}>
        <ContainerProvider
          container={childContainer as unknown as Container<typeof TestServicePort>}
        >
          <ContainerProvider
            container={grandchildContainer as unknown as Container<typeof TestServicePort>}
          >
            <TestComponent />
          </ContainerProvider>
        </ContainerProvider>
      </ContainerProvider>
    );

    // Should resolve from grandchild (deepest nested)
    expect(screen.getByTestId("service-name").textContent).toBe("grandchild-service");
    expect(grandchildContainer.resolve).toHaveBeenCalledWith(TestServicePort);
    expect(childContainer.resolve).not.toHaveBeenCalled();
    expect(parentContainer.resolve).not.toHaveBeenCalled();
  });
});
