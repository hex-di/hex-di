/**
 * Extended tests for src/errors/index.ts
 * Covers all error classes, their properties, codes, and edge cases.
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
  DisposalError,
} from "../src/errors/index.js";

describe("ContainerError", () => {
  it("is abstract (cannot be instantiated directly)", () => {
    // Can only test subclasses
    const err = new FactoryError("Test", new Error("test"));
    expect(err).toBeInstanceOf(ContainerError);
    expect(err).toBeInstanceOf(Error);
  });

  it("has name getter returning class name", () => {
    const err = new FactoryError("Test", new Error("test"));
    expect(err.name).toBe("FactoryError");
  });
});

describe("CircularDependencyError", () => {
  it("has correct code", () => {
    const err = new CircularDependencyError(["A", "B", "A"]);
    expect(err.code).toBe("CIRCULAR_DEPENDENCY");
  });

  it("isProgrammingError is true", () => {
    const err = new CircularDependencyError(["A", "B", "A"]);
    expect(err.isProgrammingError).toBe(true);
  });

  it("stores dependency chain as frozen array", () => {
    const chain = ["A", "B", "C", "A"];
    const err = new CircularDependencyError(chain);
    expect(err.dependencyChain).toEqual(["A", "B", "C", "A"]);
    expect(Object.isFrozen(err.dependencyChain)).toBe(true);
  });

  it("message includes formatted chain", () => {
    const err = new CircularDependencyError(["UserService", "AuthService", "UserService"]);
    expect(err.message).toBe(
      "Circular dependency detected: UserService -> AuthService -> UserService"
    );
  });

  it("has suggestion for fixing", () => {
    const err = new CircularDependencyError(["A", "B", "A"]);
    expect(err.suggestion).toBeDefined();
    expect(err.suggestion).toContain("break the circular dependency");
  });

  it("is instanceof ContainerError", () => {
    const err = new CircularDependencyError(["A", "B", "A"]);
    expect(err).toBeInstanceOf(ContainerError);
  });

  it("is instanceof Error", () => {
    const err = new CircularDependencyError(["A", "B", "A"]);
    expect(err).toBeInstanceOf(Error);
  });

  it("has stack trace", () => {
    const err = new CircularDependencyError(["A", "B", "A"]);
    expect(err.stack).toBeDefined();
  });

  it("name getter returns CircularDependencyError", () => {
    const err = new CircularDependencyError(["A", "B", "A"]);
    expect(err.name).toBe("CircularDependencyError");
  });
});

describe("FactoryError", () => {
  it("has correct code", () => {
    const err = new FactoryError("Logger", new Error("fail"));
    expect(err.code).toBe("FACTORY_FAILED");
  });

  it("isProgrammingError is false", () => {
    const err = new FactoryError("Logger", new Error("fail"));
    expect(err.isProgrammingError).toBe(false);
  });

  it("stores portName", () => {
    const err = new FactoryError("Logger", new Error("fail"));
    expect(err.portName).toBe("Logger");
  });

  it("stores cause", () => {
    const cause = new Error("original error");
    const err = new FactoryError("Logger", cause);
    expect(err.cause).toBe(cause);
  });

  it("message includes port name and cause message", () => {
    const err = new FactoryError("Logger", new Error("connection refused"));
    expect(err.message).toContain("Logger");
    expect(err.message).toContain("connection refused");
  });

  it("handles non-Error cause (string)", () => {
    const err = new FactoryError("Logger", "string error");
    expect(err.message).toContain("string error");
  });

  it("handles object with message property as cause", () => {
    const err = new FactoryError("Logger", { message: "custom message" });
    expect(err.message).toContain("custom message");
  });

  it("handles null cause", () => {
    const err = new FactoryError("Logger", null);
    expect(err.message).toContain("null");
  });

  it("name getter returns FactoryError", () => {
    const err = new FactoryError("Logger", new Error("fail"));
    expect(err.name).toBe("FactoryError");
  });
});

describe("DisposedScopeError", () => {
  it("has correct code", () => {
    const err = new DisposedScopeError("Logger");
    expect(err.code).toBe("DISPOSED_SCOPE");
  });

  it("isProgrammingError is true", () => {
    const err = new DisposedScopeError("Logger");
    expect(err.isProgrammingError).toBe(true);
  });

  it("stores portName", () => {
    const err = new DisposedScopeError("Logger");
    expect(err.portName).toBe("Logger");
  });

  it("message mentions disposed scope", () => {
    const err = new DisposedScopeError("Logger");
    expect(err.message).toContain("disposed scope");
    expect(err.message).toContain("Logger");
  });

  it("has suggestion", () => {
    const err = new DisposedScopeError("Logger");
    expect(err.suggestion).toBeDefined();
    expect(err.suggestion).toContain("Scope lifecycle");
  });
});

describe("ScopeRequiredError", () => {
  it("has correct code", () => {
    const err = new ScopeRequiredError("UserContext");
    expect(err.code).toBe("SCOPE_REQUIRED");
  });

  it("isProgrammingError is true", () => {
    const err = new ScopeRequiredError("UserContext");
    expect(err.isProgrammingError).toBe(true);
  });

  it("stores portName", () => {
    const err = new ScopeRequiredError("UserContext");
    expect(err.portName).toBe("UserContext");
  });

  it("message mentions scoped port and root container", () => {
    const err = new ScopeRequiredError("UserContext");
    expect(err.message).toContain("scoped port");
    expect(err.message).toContain("root container");
    expect(err.message).toContain("UserContext");
  });

  it("has suggestion with port name", () => {
    const err = new ScopeRequiredError("UserContext");
    expect(err.suggestion).toBeDefined();
    expect(err.suggestion).toContain("UserContext");
  });
});

describe("AsyncFactoryError", () => {
  it("has correct code", () => {
    const err = new AsyncFactoryError("Database", new Error("connection timeout"));
    expect(err.code).toBe("ASYNC_FACTORY_FAILED");
  });

  it("isProgrammingError is false", () => {
    const err = new AsyncFactoryError("Database", new Error("fail"));
    expect(err.isProgrammingError).toBe(false);
  });

  it("stores portName and cause", () => {
    const cause = new Error("timeout");
    const err = new AsyncFactoryError("Database", cause);
    expect(err.portName).toBe("Database");
    expect(err.cause).toBe(cause);
  });

  it("message includes port name and cause", () => {
    const err = new AsyncFactoryError("Database", new Error("timeout"));
    expect(err.message).toContain("Database");
    expect(err.message).toContain("timeout");
  });

  it("handles non-Error causes", () => {
    const err = new AsyncFactoryError("Database", "string error");
    expect(err.message).toContain("string error");
  });

  it("handles object with message property", () => {
    const err = new AsyncFactoryError("Database", { message: "custom msg" });
    expect(err.message).toContain("custom msg");
  });
});

describe("AsyncInitializationRequiredError", () => {
  it("has correct code", () => {
    const err = new AsyncInitializationRequiredError("Database");
    expect(err.code).toBe("ASYNC_INIT_REQUIRED");
  });

  it("isProgrammingError is true", () => {
    const err = new AsyncInitializationRequiredError("Database");
    expect(err.isProgrammingError).toBe(true);
  });

  it("stores portName", () => {
    const err = new AsyncInitializationRequiredError("Database");
    expect(err.portName).toBe("Database");
  });

  it("message mentions async port", () => {
    const err = new AsyncInitializationRequiredError("Database");
    expect(err.message).toContain("async port");
    expect(err.message).toContain("Database");
  });

  it("has suggestion with two options", () => {
    const err = new AsyncInitializationRequiredError("Database");
    expect(err.suggestion).toContain("resolveAsync");
    expect(err.suggestion).toContain("initialize");
  });
});

describe("NonClonableForkedError", () => {
  it("has correct code", () => {
    const err = new NonClonableForkedError("Database");
    expect(err.code).toBe("NON_CLONABLE_FORKED");
  });

  it("isProgrammingError is true", () => {
    const err = new NonClonableForkedError("Database");
    expect(err.isProgrammingError).toBe(true);
  });

  it("stores portName", () => {
    const err = new NonClonableForkedError("Database");
    expect(err.portName).toBe("Database");
  });

  it("message mentions non-clonable forked", () => {
    const err = new NonClonableForkedError("Database");
    expect(err.message).toContain("forked inheritance");
    expect(err.message).toContain("Database");
    expect(err.message).toContain("not marked as clonable");
  });

  it("has suggestion with three options", () => {
    const err = new NonClonableForkedError("Database");
    expect(err.suggestion).toContain("shared");
    expect(err.suggestion).toContain("isolated");
    expect(err.suggestion).toContain("clonable");
  });
});

describe("DisposalError", () => {
  it("has correct code", () => {
    const err = new DisposalError("Disposal failed", []);
    expect(err.code).toBe("DISPOSAL_FAILED");
  });

  it("isProgrammingError is false", () => {
    const err = new DisposalError("Disposal failed", []);
    expect(err.isProgrammingError).toBe(false);
  });

  it("stores causes as frozen array", () => {
    const causes = [new Error("e1"), new Error("e2")];
    const err = new DisposalError("msg", causes);
    expect(err.causes).toHaveLength(2);
    expect(Object.isFrozen(err.causes)).toBe(true);
  });

  it("stores original error in cause property", () => {
    const original = new Error("original");
    const err = new DisposalError("msg", [original], original);
    expect(err.cause).toBe(original);
  });

  it("does not set cause when originalError is undefined", () => {
    const err = new DisposalError("msg", []);
    expect(err.cause).toBeUndefined();
  });

  it("fromAggregateError extracts causes", () => {
    const errors = [new Error("e1"), new Error("e2"), new Error("e3")];
    const aggErr = new AggregateError(errors);
    const err = DisposalError.fromAggregateError(aggErr);

    expect(err.causes).toHaveLength(3);
    expect(err.message).toContain("3 finalizer(s) threw");
    expect(err.cause).toBe(aggErr);
  });

  it("fromUnknown with AggregateError delegates to fromAggregateError", () => {
    const aggErr = new AggregateError([new Error("e1")]);
    const err = DisposalError.fromUnknown(aggErr);
    expect(err.causes).toHaveLength(1);
  });

  it("fromUnknown with regular Error wraps in causes", () => {
    const error = new Error("single error");
    const err = DisposalError.fromUnknown(error);
    expect(err.causes).toHaveLength(1);
    expect(err.causes[0]).toBe(error);
    expect(err.message).toContain("single error");
  });

  it("fromUnknown with string wraps in causes", () => {
    const err = DisposalError.fromUnknown("string error");
    expect(err.causes).toHaveLength(1);
    expect(err.message).toContain("string error");
  });
});
