/**
 * Tests for concrete error classes.
 *
 * Tests CircularDependencyError, FactoryError, DisposedScopeError,
 * ScopeRequiredError, AsyncFactoryError, AsyncInitializationRequiredError,
 * and NonClonableForkedError.
 */

import { describe, it, expect } from "vitest";
import {
  ContainerError,
  CircularDependencyError,
  FactoryError,
  DisposedScopeError,
  ScopeRequiredError,
  AsyncFactoryError,
  AsyncInitializationRequiredError,
  NonClonableForkedError,
} from "../src/index.js";

// =============================================================================
// CircularDependencyError
// =============================================================================

describe("CircularDependencyError", () => {
  it("constructs with dependency chain", () => {
    const err = new CircularDependencyError(["A", "B", "A"]);
    expect(err.message).toBe("Circular dependency detected: A -> B -> A");
    expect(err.dependencyChain).toEqual(["A", "B", "A"]);
  });

  it("has correct code", () => {
    const err = new CircularDependencyError(["X", "Y", "X"]);
    expect(err.code).toBe("CIRCULAR_DEPENDENCY");
  });

  it("has correct _tag", () => {
    const err = new CircularDependencyError(["A", "B", "A"]);
    expect(err._tag).toBe("CircularDependency");
  });

  it("isProgrammingError is true", () => {
    const err = new CircularDependencyError(["A", "B", "A"]);
    expect(err.isProgrammingError).toBe(true);
  });

  it("dependencyChain is frozen", () => {
    const err = new CircularDependencyError(["A", "B", "A"]);
    expect(Object.isFrozen(err.dependencyChain)).toBe(true);
  });

  it("is instanceof ContainerError", () => {
    const err = new CircularDependencyError(["A"]);
    expect(err).toBeInstanceOf(ContainerError);
  });

  it("is instanceof Error", () => {
    const err = new CircularDependencyError(["A"]);
    expect(err).toBeInstanceOf(Error);
  });

  it("name returns class name", () => {
    const err = new CircularDependencyError(["A"]);
    expect(err.name).toBe("CircularDependencyError");
  });

  it("dependencyChain is a copy (not the original array)", () => {
    const chain = ["A", "B", "A"];
    const err = new CircularDependencyError(chain);
    // Modifying original should not affect error
    chain.push("C");
    expect(err.dependencyChain).toEqual(["A", "B", "A"]);
  });
});

// =============================================================================
// FactoryError
// =============================================================================

describe("FactoryError", () => {
  it("constructs with port name and Error cause", () => {
    const cause = new Error("db connection failed");
    const err = new FactoryError("Database", cause);
    expect(err.message).toBe("Factory for port 'Database' threw: db connection failed");
    expect(err.portName).toBe("Database");
    expect(err.cause).toBe(cause);
  });

  it("constructs with non-Error cause (string)", () => {
    const err = new FactoryError("Logger", "string error");
    expect(err.message).toBe("Factory for port 'Logger' threw: string error");
    expect(err.cause).toBe("string error");
  });

  it("constructs with non-Error cause (object with message)", () => {
    const cause = { message: "custom object error" };
    const err = new FactoryError("Config", cause);
    expect(err.message).toBe("Factory for port 'Config' threw: custom object error");
    expect(err.cause).toBe(cause);
  });

  it("constructs with non-Error cause (number)", () => {
    const err = new FactoryError("Config", 42);
    expect(err.message).toBe("Factory for port 'Config' threw: 42");
  });

  it("has correct code", () => {
    const err = new FactoryError("X", new Error("e"));
    expect(err.code).toBe("FACTORY_FAILED");
  });

  it("has correct _tag", () => {
    const err = new FactoryError("X", new Error("e"));
    expect(err._tag).toBe("FactoryFailed");
  });

  it("isProgrammingError is false", () => {
    const err = new FactoryError("X", new Error("e"));
    expect(err.isProgrammingError).toBe(false);
  });

  it("is instanceof ContainerError", () => {
    const err = new FactoryError("X", new Error("e"));
    expect(err).toBeInstanceOf(ContainerError);
  });

  it("name returns class name", () => {
    const err = new FactoryError("X", new Error("e"));
    expect(err.name).toBe("FactoryError");
  });
});

// =============================================================================
// DisposedScopeError
// =============================================================================

describe("DisposedScopeError", () => {
  it("constructs with port name", () => {
    const err = new DisposedScopeError("UserService");
    expect(err.message).toContain("Cannot resolve port 'UserService' from a disposed scope");
    expect(err.portName).toBe("UserService");
  });

  it("has correct code", () => {
    const err = new DisposedScopeError("X");
    expect(err.code).toBe("DISPOSED_SCOPE");
  });

  it("has correct _tag", () => {
    const err = new DisposedScopeError("X");
    expect(err._tag).toBe("DisposedScope");
  });

  it("isProgrammingError is true", () => {
    const err = new DisposedScopeError("X");
    expect(err.isProgrammingError).toBe(true);
  });

  it("is instanceof ContainerError", () => {
    const err = new DisposedScopeError("X");
    expect(err).toBeInstanceOf(ContainerError);
  });

  it("name returns class name", () => {
    const err = new DisposedScopeError("X");
    expect(err.name).toBe("DisposedScopeError");
  });

  it("message includes scope disposal hint", () => {
    const err = new DisposedScopeError("X");
    expect(err.message).toContain("disposed");
  });
});

// =============================================================================
// ScopeRequiredError
// =============================================================================

describe("ScopeRequiredError", () => {
  it("constructs with port name", () => {
    const err = new ScopeRequiredError("UserContext");
    expect(err.message).toContain(
      "Cannot resolve scoped port 'UserContext' from the root container"
    );
    expect(err.portName).toBe("UserContext");
  });

  it("has correct code", () => {
    const err = new ScopeRequiredError("X");
    expect(err.code).toBe("SCOPE_REQUIRED");
  });

  it("has correct _tag", () => {
    const err = new ScopeRequiredError("X");
    expect(err._tag).toBe("ScopeRequired");
  });

  it("isProgrammingError is true", () => {
    const err = new ScopeRequiredError("X");
    expect(err.isProgrammingError).toBe(true);
  });

  it("is instanceof ContainerError", () => {
    const err = new ScopeRequiredError("X");
    expect(err).toBeInstanceOf(ContainerError);
  });

  it("name returns class name", () => {
    const err = new ScopeRequiredError("X");
    expect(err.name).toBe("ScopeRequiredError");
  });

  it("message mentions createScope", () => {
    const err = new ScopeRequiredError("X");
    expect(err.message).toContain("createScope()");
  });
});

// =============================================================================
// AsyncFactoryError
// =============================================================================

describe("AsyncFactoryError", () => {
  it("constructs with port name and Error cause", () => {
    const cause = new Error("network timeout");
    const err = new AsyncFactoryError("RemoteService", cause);
    expect(err.message).toBe("Async factory for port 'RemoteService' failed: network timeout");
    expect(err.portName).toBe("RemoteService");
    expect(err.cause).toBe(cause);
  });

  it("constructs with non-Error cause", () => {
    const err = new AsyncFactoryError("Service", "timeout");
    expect(err.message).toBe("Async factory for port 'Service' failed: timeout");
    expect(err.cause).toBe("timeout");
  });

  it("has correct code", () => {
    const err = new AsyncFactoryError("X", new Error("e"));
    expect(err.code).toBe("ASYNC_FACTORY_FAILED");
  });

  it("has correct _tag", () => {
    const err = new AsyncFactoryError("X", new Error("e"));
    expect(err._tag).toBe("AsyncFactoryFailed");
  });

  it("isProgrammingError is false", () => {
    const err = new AsyncFactoryError("X", new Error("e"));
    expect(err.isProgrammingError).toBe(false);
  });

  it("is instanceof ContainerError", () => {
    const err = new AsyncFactoryError("X", new Error("e"));
    expect(err).toBeInstanceOf(ContainerError);
  });

  it("name returns class name", () => {
    const err = new AsyncFactoryError("X", new Error("e"));
    expect(err.name).toBe("AsyncFactoryError");
  });
});

// =============================================================================
// AsyncInitializationRequiredError
// =============================================================================

describe("AsyncInitializationRequiredError", () => {
  it("constructs with port name", () => {
    const err = new AsyncInitializationRequiredError("Database");
    expect(err.message).toContain("Cannot resolve async port 'Database' synchronously");
    expect(err.portName).toBe("Database");
  });

  it("has correct code", () => {
    const err = new AsyncInitializationRequiredError("X");
    expect(err.code).toBe("ASYNC_INIT_REQUIRED");
  });

  it("has correct _tag", () => {
    const err = new AsyncInitializationRequiredError("X");
    expect(err._tag).toBe("AsyncInitRequired");
  });

  it("isProgrammingError is true", () => {
    const err = new AsyncInitializationRequiredError("X");
    expect(err.isProgrammingError).toBe(true);
  });

  it("is instanceof ContainerError", () => {
    const err = new AsyncInitializationRequiredError("X");
    expect(err).toBeInstanceOf(ContainerError);
  });

  it("name returns class name", () => {
    const err = new AsyncInitializationRequiredError("X");
    expect(err.name).toBe("AsyncInitializationRequiredError");
  });

  it("message mentions resolveAsync", () => {
    const err = new AsyncInitializationRequiredError("X");
    expect(err.message).toContain("resolveAsync()");
  });

  it("message mentions initialize()", () => {
    const err = new AsyncInitializationRequiredError("X");
    expect(err.message).toContain("initialize()");
  });
});

// =============================================================================
// NonClonableForkedError
// =============================================================================

describe("NonClonableForkedError", () => {
  it("constructs with port name", () => {
    const err = new NonClonableForkedError("Database");
    expect(err.message).toContain("Cannot use forked inheritance for port 'Database'");
    expect(err.portName).toBe("Database");
  });

  it("has correct code", () => {
    const err = new NonClonableForkedError("X");
    expect(err.code).toBe("NON_CLONABLE_FORKED");
  });

  it("has correct _tag", () => {
    const err = new NonClonableForkedError("X");
    expect(err._tag).toBe("NonClonableForked");
  });

  it("isProgrammingError is true", () => {
    const err = new NonClonableForkedError("X");
    expect(err.isProgrammingError).toBe(true);
  });

  it("is instanceof ContainerError", () => {
    const err = new NonClonableForkedError("X");
    expect(err).toBeInstanceOf(ContainerError);
  });

  it("name returns class name", () => {
    const err = new NonClonableForkedError("X");
    expect(err.name).toBe("NonClonableForkedError");
  });

  it("message mentions clonable", () => {
    const err = new NonClonableForkedError("X");
    expect(err.message).toContain("clonable");
  });
});
