/**
 * Runtime tests for useDeps hook.
 *
 * These tests verify:
 * 1. Hook resolves single dependency from container
 * 2. Hook resolves multiple dependencies from container
 * 3. Hook resolves from nearest scope
 * 4. Hook throws MissingProviderError outside provider
 * 5. Empty call returns empty object
 * 6. Dependencies are correctly keyed by port name
 */

import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { createPort } from "@hex-di/ports";
import { ContainerBrand, ScopeBrand } from "@hex-di/runtime";
import type { Container, Scope } from "@hex-di/runtime";
import { MissingProviderError } from "../src/errors.js";
import { HexDiContainerProvider, HexDiScopeProvider } from "../src/providers/index.js";
import { useDeps } from "../src/hooks/use-deps.js";

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

interface UserService {
  name: string;
  getUser(id: string): { name: string };
}

const LoggerPort = createPort<"Logger", LoggerService>("Logger");
const DatabasePort = createPort<"Database", DatabaseService>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");

type TestProvides = typeof LoggerPort | typeof DatabasePort | typeof UserServicePort;
type TestContainer = Container<TestProvides>;
type TestScope = Scope<TestProvides>;

/**
 * Creates a mock scope for testing.
 */
function createMockScope(name: string = "scoped"): TestScope {
  const mockResolve = vi.fn().mockImplementation(port => {
    const portName = (port as { __portName: string }).__portName;
    return {
      name: `${name}-${portName}`,
      log: vi.fn(),
      query: vi.fn(),
      getUser: vi.fn().mockReturnValue({ name: "test-user" }),
    };
  });
  const mockCreateScope = vi.fn().mockImplementation(() => createMockScope(`nested-${name}`));
  const mockDispose = vi.fn().mockResolvedValue(undefined);
  const mockResolveAsync = vi.fn().mockImplementation(port => {
    const portName = (port as { __portName: string }).__portName;
    return Promise.resolve({
      name: `${name}-${portName}`,
      log: vi.fn(),
      query: vi.fn(),
      getUser: vi.fn().mockReturnValue({ name: "test-user" }),
    });
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
    return {
      name: `container-${portName}`,
      log: vi.fn(),
      query: vi.fn(),
      getUser: vi.fn().mockReturnValue({ name: "test-user" }),
    };
  });
  const mockResolveAsync = vi.fn().mockImplementation(port => {
    const portName = (port as { __portName: string }).__portName;
    return Promise.resolve({
      name: `container-${portName}`,
      log: vi.fn(),
      query: vi.fn(),
      getUser: vi.fn().mockReturnValue({ name: "test-user" }),
    });
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
// Single Dependency Tests
// =============================================================================

describe("useDeps with single dependency", () => {
  afterEach(() => {
    cleanup();
  });

  it("resolves single dependency from container", () => {
    const container = createMockContainer();

    function TestComponent(): React.ReactElement {
      const { Logger } = useDeps(LoggerPort);
      return <div data-testid="logger-name">{Logger.name}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("logger-name").textContent).toBe("container-Logger");
    expect(container.resolve).toHaveBeenCalledWith(LoggerPort);
  });
});

// =============================================================================
// Multiple Dependencies Tests
// =============================================================================

describe("useDeps with multiple dependencies", () => {
  afterEach(() => {
    cleanup();
  });

  it("resolves multiple dependencies from container", () => {
    const container = createMockContainer();

    function TestComponent(): React.ReactElement {
      const { Logger, Database } = useDeps(LoggerPort, DatabasePort);
      return (
        <div>
          <span data-testid="logger-name">{Logger.name}</span>
          <span data-testid="database-name">{Database.name}</span>
        </div>
      );
    }

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

  it("resolves three dependencies from container", () => {
    const container = createMockContainer();

    function TestComponent(): React.ReactElement {
      const { Logger, Database, UserService } = useDeps(LoggerPort, DatabasePort, UserServicePort);
      return (
        <div>
          <span data-testid="logger-name">{Logger.name}</span>
          <span data-testid="database-name">{Database.name}</span>
          <span data-testid="user-service-name">{UserService.name}</span>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("logger-name").textContent).toBe("container-Logger");
    expect(screen.getByTestId("database-name").textContent).toBe("container-Database");
    expect(screen.getByTestId("user-service-name").textContent).toBe("container-UserService");
  });
});

// =============================================================================
// Scope Resolution Tests
// =============================================================================

describe("useDeps with scope", () => {
  afterEach(() => {
    cleanup();
  });

  it("resolves from nearest scope", () => {
    const container = createMockContainer();
    const scope = createMockScope("scope");

    function TestComponent(): React.ReactElement {
      const { Logger } = useDeps(LoggerPort);
      return <div data-testid="logger-name">{Logger.name}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <HexDiScopeProvider scope={scope}>
          <TestComponent />
        </HexDiScopeProvider>
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("logger-name").textContent).toBe("scope-Logger");
    // Container.resolve should NOT have been called
    expect(container.resolve).not.toHaveBeenCalled();
    expect(scope.resolve).toHaveBeenCalledWith(LoggerPort);
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe("useDeps error handling", () => {
  afterEach(() => {
    cleanup();
  });

  it("throws MissingProviderError outside provider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function TestComponent(): React.ReactElement {
      const { Logger } = useDeps(LoggerPort);
      return <div>{Logger.name}</div>;
    }

    expect(() => {
      render(<TestComponent />);
    }).toThrow(MissingProviderError);

    consoleSpy.mockRestore();
  });
});

// =============================================================================
// Empty Call Tests
// =============================================================================

describe("useDeps with no arguments", () => {
  afterEach(() => {
    cleanup();
  });

  it("returns empty object when called with no ports", () => {
    const container = createMockContainer();
    let capturedDeps: Record<string, unknown> | undefined;

    function TestComponent(): React.ReactElement {
      capturedDeps = useDeps();
      return <div data-testid="component">Rendered</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("component").textContent).toBe("Rendered");
    expect(capturedDeps).toEqual({});
    // No ports should have been resolved
    expect(container.resolve).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Port Name Keying Tests
// =============================================================================

describe("useDeps port name keying", () => {
  afterEach(() => {
    cleanup();
  });

  it("keys dependencies by port name", () => {
    const container = createMockContainer();
    let capturedDeps: Record<string, unknown> | undefined;

    function TestComponent(): React.ReactElement {
      const deps = useDeps(LoggerPort, DatabasePort);
      capturedDeps = deps;
      return <div data-testid="component">Rendered</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    // Verify keys match port names
    expect(capturedDeps).toHaveProperty("Logger");
    expect(capturedDeps).toHaveProperty("Database");
    expect(Object.keys(capturedDeps!).sort()).toEqual(["Database", "Logger"]);
  });
});
