/**
 * Runtime tests for createComponent function.
 *
 * These tests verify:
 * 1. Component resolves dependencies from container
 * 2. Component resolves from nearest scope
 * 3. Component throws MissingProviderError outside provider
 * 4. Props are correctly passed to render function
 * 5. Empty requires works correctly
 * 6. Multiple dependencies are resolved correctly
 */

import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { createPort } from "@hex-di/core";
import { ContainerBrand, ScopeBrand } from "@hex-di/runtime";
import type { Container, Scope } from "@hex-di/runtime";
import { MissingProviderError } from "../src/errors.js";
import { HexDiContainerProvider, HexDiScopeProvider } from "../src/providers/index.js";
import { createComponent } from "../src/factories/create-component.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface LoggerService {
  name: string;
  log(message: string): void;
}

interface DatabaseService {
  name: string;
  query(sql: string): Promise<unknown>;
}

const LoggerPort = createPort<LoggerService, "Logger">({ name: "Logger" });
const DatabasePort = createPort<DatabaseService, "Database">({ name: "Database" });

type TestProvides = typeof LoggerPort | typeof DatabasePort;
type TestContainer = Container<TestProvides>;
type TestScope = Scope<TestProvides>;

/**
 * Creates a mock scope for testing.
 */
function createMockScope(name: string = "scoped"): TestScope {
  const mockResolve = vi.fn().mockImplementation(port => {
    const portName = (port as { __portName: string }).__portName;
    return { name: `${name}-${portName}`, log: vi.fn(), query: vi.fn() };
  });
  const mockCreateScope = vi.fn().mockImplementation(() => createMockScope(`nested-${name}`));
  const mockDispose = vi.fn().mockResolvedValue(undefined);
  const mockResolveAsync = vi.fn().mockImplementation(port => {
    const portName = (port as { __portName: string }).__portName;
    return Promise.resolve({ name: `${name}-${portName}`, log: vi.fn(), query: vi.fn() });
  });

  const mockScope: TestScope = {
    resolve: mockResolve,
    resolveAsync: mockResolveAsync,
    createScope: mockCreateScope,
    dispose: mockDispose,
    has: vi.fn().mockReturnValue(true),
    isDisposed: false,
    [ScopeBrand]: { provides: LoggerPort },
  } as unknown as TestScope;

  return mockScope;
}

/**
 * Creates a mock container for testing.
 */
function createMockContainer(): TestContainer {
  const mockScope = createMockScope();

  const mockResolve = vi.fn().mockImplementation(port => {
    const portName = (port as { __portName: string }).__portName;
    return { name: `container-${portName}`, log: vi.fn(), query: vi.fn() };
  });
  const mockResolveAsync = vi.fn().mockImplementation(port => {
    const portName = (port as { __portName: string }).__portName;
    return Promise.resolve({ name: `container-${portName}`, log: vi.fn(), query: vi.fn() });
  });
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
    createChildAsync: vi.fn(),
    createLazyChild: vi.fn(),
    dispose: mockDispose,
    has: vi.fn().mockReturnValue(true),
    initialize: mockInitialize,
    isInitialized: false,
    isDisposed: false,
    get parent(): never {
      throw new Error("Root containers do not have a parent");
    },
    [ContainerBrand]: { provides: LoggerPort, extends: undefined as never },
  } as unknown as TestContainer;

  return mockContainer;
}

// =============================================================================
// Basic Resolution Tests
// =============================================================================

describe("createComponent", () => {
  afterEach(() => {
    cleanup();
  });

  it("resolves dependencies from container", () => {
    const container = createMockContainer();

    const TestComponent = createComponent({
      requires: [LoggerPort],
      render: ({ Logger }) => {
        return <div data-testid="logger-name">{Logger.name}</div>;
      },
    });

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("logger-name").textContent).toBe("container-Logger");
    expect(container.resolve).toHaveBeenCalledWith(LoggerPort);
  });

  it("resolves multiple dependencies", () => {
    const container = createMockContainer();

    const TestComponent = createComponent({
      requires: [LoggerPort, DatabasePort],
      render: ({ Logger, Database }) => {
        return (
          <div>
            <span data-testid="logger-name">{Logger.name}</span>
            <span data-testid="database-name">{Database.name}</span>
          </div>
        );
      },
    });

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("logger-name").textContent).toBe("container-Logger");
    expect(screen.getByTestId("database-name").textContent).toBe("container-Database");
    expect(container.resolve).toHaveBeenCalledWith(LoggerPort);
    expect(container.resolve).toHaveBeenCalledWith(DatabasePort);
  });

  it("resolves from nearest scope", () => {
    const container = createMockContainer();
    const scope = createMockScope("scope");

    const TestComponent = createComponent({
      requires: [LoggerPort],
      render: ({ Logger }) => {
        return <div data-testid="logger-name">{Logger.name}</div>;
      },
    });

    render(
      <HexDiContainerProvider container={container}>
        <HexDiScopeProvider scope={scope}>
          <TestComponent />
        </HexDiScopeProvider>
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("logger-name").textContent).toBe("scope-Logger");
    // Container.resolve should NOT have been called - scope.resolve should be used
    expect(container.resolve).not.toHaveBeenCalled();
    expect(scope.resolve).toHaveBeenCalledWith(LoggerPort);
  });

  it("throws MissingProviderError outside provider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const TestComponent = createComponent({
      requires: [LoggerPort],
      render: ({ Logger }) => {
        return <div>{Logger.name}</div>;
      },
    });

    expect(() => {
      render(<TestComponent />);
    }).toThrow(MissingProviderError);

    consoleSpy.mockRestore();
  });
});

// =============================================================================
// Props Tests
// =============================================================================

describe("createComponent props", () => {
  afterEach(() => {
    cleanup();
  });

  it("passes props to render function", () => {
    const container = createMockContainer();

    const TestComponent = createComponent({
      requires: [LoggerPort],
      render: ({ Logger }, { userId }: { userId: string }) => {
        return (
          <div>
            <span data-testid="logger-name">{Logger.name}</span>
            <span data-testid="user-id">{userId}</span>
          </div>
        );
      },
    });

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent userId="user-123" />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("logger-name").textContent).toBe("container-Logger");
    expect(screen.getByTestId("user-id").textContent).toBe("user-123");
  });

  it("handles multiple props", () => {
    const container = createMockContainer();

    const TestComponent = createComponent({
      requires: [LoggerPort],
      render: (_, { name, count }: { name: string; count: number }) => {
        return (
          <div>
            <span data-testid="name">{name}</span>
            <span data-testid="count">{count}</span>
          </div>
        );
      },
    });

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent name="test" count={42} />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("name").textContent).toBe("test");
    expect(screen.getByTestId("count").textContent).toBe("42");
  });
});

// =============================================================================
// Empty Requires Tests
// =============================================================================

describe("createComponent with empty requires", () => {
  afterEach(() => {
    cleanup();
  });

  it("works with empty requires array", () => {
    const container = createMockContainer();

    const TestComponent = createComponent({
      requires: [],
      render: (_, { message }: { message: string }) => {
        return <div data-testid="message">{message}</div>;
      },
    });

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent message="Hello World" />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("message").textContent).toBe("Hello World");
    // No ports should have been resolved
    expect(container.resolve).not.toHaveBeenCalled();
  });

  it("deps object is empty for empty requires", () => {
    const container = createMockContainer();
    let capturedDeps: Record<string, unknown> | undefined;

    const TestComponent = createComponent({
      requires: [],
      render: deps => {
        capturedDeps = deps;
        return <div data-testid="component">Rendered</div>;
      },
    });

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("component").textContent).toBe("Rendered");
    expect(capturedDeps).toEqual({});
  });
});

// =============================================================================
// Display Name Tests
// =============================================================================

describe("createComponent display name", () => {
  it("component has a display name for DevTools", () => {
    const TestComponent = createComponent({
      requires: [LoggerPort],
      render: ({ Logger }) => {
        return <div>{Logger.name}</div>;
      },
    });

    expect(TestComponent.displayName).toBe("DIComponent");
  });
});
