/**
 * Unit tests for React hooks.
 *
 * These tests verify:
 * 1. usePort resolves service from container
 * 2. usePort resolves service from nearest scope
 * 3. usePort throws MissingProviderError outside provider
 * 4. useContainer returns root container
 * 5. useContainer throws outside ContainerProvider
 * 6. useScope creates and disposes scope on component lifecycle
 */

import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { createPort } from "@hex-di/core";
import { ContainerBrand, ScopeBrand } from "@hex-di/runtime";
import type { Container, Scope } from "@hex-di/runtime";
import { MissingProviderError } from "../src/errors.js";
import { HexDiContainerProvider, HexDiScopeProvider } from "../src/providers/index.js";
import { useContainer } from "../src/hooks/use-container.js";
import { usePort } from "../src/hooks/use-port.js";
import { useScope } from "../src/hooks/use-scope.js";

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
 * Helper to verify identity of a resolver by comparing its internal ID.
 * This is necessary because resolvers are wrapped for type safety.
 */
interface TestService {
  name: string;
}

/**
 * Port for testing resolution.
 */
const TestServicePort = createPort<TestService, "TestService">({ name: "TestService" });

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
function createMockScope(name: string = "scoped-test-service"): TestScope {
  const mockResolve = vi.fn().mockReturnValue({ name });
  const mockCreateScope = vi.fn().mockImplementation(() => createMockScope(`nested-${name}`));
  const mockDispose = vi.fn().mockResolvedValue(undefined);
  const mockResolveAsync = vi.fn().mockResolvedValue({ name });

  const mockScope: TestScope = {
    resolve: mockResolve,
    resolveAsync: mockResolveAsync,
    createScope: mockCreateScope,
    dispose: mockDispose,
    has: vi.fn().mockReturnValue(true),
    isDisposed: false,
    [ScopeBrand]: { provides: TestServicePort },
  } as any as TestScope;

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

  const mockContainer: TestContainer = {
    resolve: mockResolve,
    resolveAsync: mockResolveAsync,
    createScope: mockCreateScope,
    createChild: vi.fn(),
    dispose: mockDispose,
    has: vi.fn().mockReturnValue(true),
    initialize: mockInitialize,
    isInitialized: false,
    isDisposed: false,
    get parent(): never {
      throw new Error("Root containers do not have a parent");
    },
    [ContainerBrand]: { provides: TestServicePort, extends: undefined as never },
  } as any as TestContainer;

  return mockContainer;
}

// =============================================================================
// usePort Tests
// =============================================================================

describe("usePort", () => {
  afterEach(() => {
    cleanup();
  });

  it("resolves service from container", () => {
    const container = createMockContainer();

    function TestComponent(): React.ReactElement {
      const service = usePort(TestServicePort);
      return <div data-testid="service-name">{service.name}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("service-name").textContent).toBe("test-service");
    expect(container.resolve).toHaveBeenCalledWith(TestServicePort);
  });

  it("resolves service from nearest scope", () => {
    const container = createMockContainer();
    const scope = createMockScope("scope-service");

    function TestComponent(): React.ReactElement {
      const service = usePort(TestServicePort);
      return <div data-testid="service-name">{service.name}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <HexDiScopeProvider scope={scope}>
          <TestComponent />
        </HexDiScopeProvider>
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("service-name").textContent).toBe("scope-service");
    // Container.resolve should NOT have been called - scope.resolve should be used
    expect(container.resolve).not.toHaveBeenCalled();
    expect(scope.resolve).toHaveBeenCalledWith(TestServicePort);
  });

  it("throws MissingProviderError outside provider", () => {
    // Suppress React error boundary console output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function TestComponent(): React.ReactElement {
      const service = usePort(TestServicePort);
      return <div>{service.name}</div>;
    }

    expect(() => {
      render(<TestComponent />);
    }).toThrow(MissingProviderError);

    consoleSpy.mockRestore();
  });
});

// =============================================================================
// useContainer Tests
// =============================================================================

describe("useContainer", () => {
  afterEach(() => {
    cleanup();
  });

  it("returns root container", () => {
    const container = createMockContainer();
    let capturedContainer: TestContainer | undefined;

    function TestComponent(): React.ReactElement {
      capturedContainer = useContainer() as TestContainer;
      return <div data-testid="component">Rendered</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(capturedContainer).toBeDefined();
    expect(capturedContainer!.resolve(TestServicePort).name).toBe("test-service");
    expect(screen.getByTestId("component").textContent).toBe("Rendered");
  });

  it("throws MissingProviderError outside ContainerProvider", () => {
    // Suppress React error boundary console output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function TestComponent(): React.ReactElement {
      const container = useContainer();
      return <div>{String(container)}</div>;
    }

    expect(() => {
      render(<TestComponent />);
    }).toThrow(MissingProviderError);

    consoleSpy.mockRestore();
  });
});

// =============================================================================
// useScope Tests
// =============================================================================

describe("useScope", () => {
  afterEach(() => {
    cleanup();
  });

  it("creates and disposes scope on component lifecycle", async () => {
    const container = createMockContainer();
    const mockScope = createMockScope();
    (container.createScope as ReturnType<typeof vi.fn>).mockReturnValue(mockScope);

    let capturedScope: TestScope | undefined;

    function TestComponent(): React.ReactElement {
      capturedScope = useScope() as TestScope;
      return <div data-testid="component">Rendered</div>;
    }

    const { unmount } = render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    // Verify scope was created from container
    expect(container.createScope).toHaveBeenCalledTimes(1);
    expect(capturedScope!.resolve(TestServicePort).name).toBe("scoped-test-service");

    // Unmount and verify disposal
    unmount();

    // Wait for async dispose
    await vi.waitFor(() => {
      expect(mockScope.dispose).toHaveBeenCalledTimes(1);
    });
  });
});
