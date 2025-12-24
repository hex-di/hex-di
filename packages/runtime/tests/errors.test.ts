/**
 * Unit tests for error hierarchy classes.
 *
 * These tests verify:
 * 1. ContainerError base class properties (code, isProgrammingError, message)
 * 2. CircularDependencyError with dependency chain
 * 3. FactoryError wrapping original exception with cause
 * 4. DisposedScopeError with port context
 * 5. ScopeRequiredError with port context
 * 6. Error inheritance hierarchy (instanceof checks)
 */

import { describe, expect, it } from "vitest";
import {
  ContainerError,
  CircularDependencyError,
  FactoryError,
  DisposedScopeError,
  ScopeRequiredError,
  AsyncFactoryError,
  NonClonableForkedError,
} from "../src/index.js";

// =============================================================================
// ContainerError Base Class Tests
// =============================================================================

describe("ContainerError base class", () => {
  it("has code and isProgrammingError properties on derived classes", () => {
    const error = new CircularDependencyError(["A", "B", "A"]);

    expect(error.code).toBe("CIRCULAR_DEPENDENCY");
    expect(error.isProgrammingError).toBe(true);
    expect(error.message).toContain("A");
  });

  it("extends Error and has proper name", () => {
    const error = new CircularDependencyError(["A", "B", "A"]);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ContainerError);
    expect(error.name).toBe("CircularDependencyError");
  });
});

// =============================================================================
// CircularDependencyError Tests
// =============================================================================

describe("CircularDependencyError", () => {
  it("has correct code and isProgrammingError", () => {
    const error = new CircularDependencyError(["ServiceA", "ServiceB", "ServiceA"]);

    expect(error.code).toBe("CIRCULAR_DEPENDENCY");
    expect(error.isProgrammingError).toBe(true);
  });

  it("stores dependency chain as readonly array", () => {
    const chain = ["Logger", "Database", "UserService", "Logger"];
    const error = new CircularDependencyError(chain);

    expect(error.dependencyChain).toEqual(chain);
    expect(error.dependencyChain).not.toBe(chain); // Should be a copy
  });

  it("includes formatted dependency chain in message", () => {
    const error = new CircularDependencyError(["A", "B", "C", "A"]);

    expect(error.message).toContain("A -> B -> C -> A");
  });
});

// =============================================================================
// FactoryError Tests
// =============================================================================

describe("FactoryError", () => {
  it("has correct code and isProgrammingError", () => {
    const cause = new Error("Database connection failed");
    const error = new FactoryError("DatabasePort", cause);

    expect(error.code).toBe("FACTORY_FAILED");
    expect(error.isProgrammingError).toBe(false);
  });

  it("stores port name and original cause", () => {
    const cause = new Error("Connection timeout");
    const error = new FactoryError("LoggerPort", cause);

    expect(error.portName).toBe("LoggerPort");
    expect(error.cause).toBe(cause);
  });

  it("includes port name and original error message in message", () => {
    const cause = new Error("Failed to initialize");
    const error = new FactoryError("ConfigPort", cause);

    expect(error.message).toContain("ConfigPort");
    expect(error.message).toContain("Failed to initialize");
  });

  it("handles non-Error cause", () => {
    const cause = "string error";
    const error = new FactoryError("TestPort", cause);

    expect(error.cause).toBe(cause);
    expect(error.message).toContain("TestPort");
  });

  it("handles custom error objects with message property", () => {
    // Custom error object that doesn't extend Error but has message property
    const customError = { message: "Custom error message", code: "CUSTOM_ERROR" };
    const error = new FactoryError("CustomPort", customError);

    expect(error.cause).toBe(customError);
    expect(error.message).toContain("CustomPort");
    expect(error.message).toContain("Custom error message");
  });

  it("handles objects without message property", () => {
    const objectCause = { code: 123, details: "some details" };
    const error = new FactoryError("ObjectPort", objectCause);

    expect(error.cause).toBe(objectCause);
    expect(error.message).toContain("ObjectPort");
    // Should use String(cause) for objects without message
    expect(error.message).toContain("[object Object]");
  });
});

// =============================================================================
// AsyncFactoryError Tests
// =============================================================================

describe("AsyncFactoryError", () => {
  it("has correct code and isProgrammingError", () => {
    const cause = new Error("Async connection failed");
    const error = new AsyncFactoryError("AsyncDatabasePort", cause);

    expect(error.code).toBe("ASYNC_FACTORY_FAILED");
    expect(error.isProgrammingError).toBe(false);
  });

  it("stores port name and original cause", () => {
    const cause = new Error("Async timeout");
    const error = new AsyncFactoryError("AsyncLoggerPort", cause);

    expect(error.portName).toBe("AsyncLoggerPort");
    expect(error.cause).toBe(cause);
  });

  it("includes port name and original error message in message", () => {
    const cause = new Error("Failed to initialize async");
    const error = new AsyncFactoryError("AsyncConfigPort", cause);

    expect(error.message).toContain("AsyncConfigPort");
    expect(error.message).toContain("Failed to initialize async");
  });

  it("handles custom error objects with message property", () => {
    // Custom error object that doesn't extend Error but has message property
    const customError = { message: "Async custom error message", code: "ASYNC_CUSTOM" };
    const error = new AsyncFactoryError("AsyncCustomPort", customError);

    expect(error.cause).toBe(customError);
    expect(error.message).toContain("AsyncCustomPort");
    expect(error.message).toContain("Async custom error message");
  });

  it("handles non-Error cause", () => {
    const cause = "async string error";
    const error = new AsyncFactoryError("AsyncTestPort", cause);

    expect(error.cause).toBe(cause);
    expect(error.message).toContain("AsyncTestPort");
    expect(error.message).toContain("async string error");
  });
});

// =============================================================================
// DisposedScopeError Tests
// =============================================================================

describe("DisposedScopeError", () => {
  it("has correct code and isProgrammingError", () => {
    const error = new DisposedScopeError("UserServicePort");

    expect(error.code).toBe("DISPOSED_SCOPE");
    expect(error.isProgrammingError).toBe(true);
  });

  it("stores port name", () => {
    const error = new DisposedScopeError("LoggerPort");

    expect(error.portName).toBe("LoggerPort");
  });

  it("message indicates resolve attempted on disposed scope", () => {
    const error = new DisposedScopeError("DatabasePort");

    expect(error.message).toContain("DatabasePort");
    expect(error.message.toLowerCase()).toContain("disposed");
  });
});

// =============================================================================
// ScopeRequiredError Tests
// =============================================================================

describe("ScopeRequiredError", () => {
  it("has correct code and isProgrammingError", () => {
    const error = new ScopeRequiredError("SessionPort");

    expect(error.code).toBe("SCOPE_REQUIRED");
    expect(error.isProgrammingError).toBe(true);
  });

  it("stores port name", () => {
    const error = new ScopeRequiredError("RequestContextPort");

    expect(error.portName).toBe("RequestContextPort");
  });

  it("message indicates scoped port resolved from root container", () => {
    const error = new ScopeRequiredError("UserContextPort");

    expect(error.message).toContain("UserContextPort");
    expect(error.message.toLowerCase()).toContain("scope");
  });
});

// =============================================================================
// NonClonableForkedError Tests
// =============================================================================

describe("NonClonableForkedError", () => {
  it("has correct code and isProgrammingError", () => {
    const error = new NonClonableForkedError("DatabasePort");

    expect(error.code).toBe("NON_CLONABLE_FORKED");
    expect(error.isProgrammingError).toBe(true);
  });

  it("stores port name", () => {
    const error = new NonClonableForkedError("ConnectionPort");

    expect(error.portName).toBe("ConnectionPort");
  });

  it("message indicates forked mode requires clonable adapter", () => {
    const error = new NonClonableForkedError("SocketPort");

    expect(error.message).toContain("SocketPort");
    expect(error.message).toContain("clonable");
    expect(error.message).toContain("forked");
  });
});

// =============================================================================
// Error Inheritance Hierarchy Tests
// =============================================================================

describe("Error inheritance hierarchy", () => {
  it("all error classes extend ContainerError", () => {
    const circularError = new CircularDependencyError(["A", "B"]);
    const factoryError = new FactoryError("Port", new Error());
    const asyncFactoryError = new AsyncFactoryError("Port", new Error());
    const disposedError = new DisposedScopeError("Port");
    const scopeRequiredError = new ScopeRequiredError("Port");
    const nonClonableError = new NonClonableForkedError("Port");

    expect(circularError).toBeInstanceOf(ContainerError);
    expect(factoryError).toBeInstanceOf(ContainerError);
    expect(asyncFactoryError).toBeInstanceOf(ContainerError);
    expect(disposedError).toBeInstanceOf(ContainerError);
    expect(scopeRequiredError).toBeInstanceOf(ContainerError);
    expect(nonClonableError).toBeInstanceOf(ContainerError);
  });

  it("all error classes extend Error", () => {
    const circularError = new CircularDependencyError(["A", "B"]);
    const factoryError = new FactoryError("Port", new Error());
    const asyncFactoryError = new AsyncFactoryError("Port", new Error());
    const disposedError = new DisposedScopeError("Port");
    const scopeRequiredError = new ScopeRequiredError("Port");
    const nonClonableError = new NonClonableForkedError("Port");

    expect(circularError).toBeInstanceOf(Error);
    expect(factoryError).toBeInstanceOf(Error);
    expect(asyncFactoryError).toBeInstanceOf(Error);
    expect(disposedError).toBeInstanceOf(Error);
    expect(scopeRequiredError).toBeInstanceOf(Error);
    expect(nonClonableError).toBeInstanceOf(Error);
  });

  it("each error class has correct name getter", () => {
    const circularError = new CircularDependencyError(["A", "B"]);
    const factoryError = new FactoryError("Port", new Error());
    const asyncFactoryError = new AsyncFactoryError("Port", new Error());
    const disposedError = new DisposedScopeError("Port");
    const scopeRequiredError = new ScopeRequiredError("Port");
    const nonClonableError = new NonClonableForkedError("Port");

    expect(circularError.name).toBe("CircularDependencyError");
    expect(factoryError.name).toBe("FactoryError");
    expect(asyncFactoryError.name).toBe("AsyncFactoryError");
    expect(disposedError.name).toBe("DisposedScopeError");
    expect(scopeRequiredError.name).toBe("ScopeRequiredError");
    expect(nonClonableError.name).toBe("NonClonableForkedError");
  });
});
