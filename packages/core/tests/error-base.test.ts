/**
 * Tests for base error classes: ContainerError, hasMessageProperty, extractErrorMessage.
 */

import { describe, it, expect } from "vitest";
import { ContainerError, extractErrorMessage, hasMessageProperty } from "../src/index.js";

// =============================================================================
// Concrete test subclass for testing abstract ContainerError
// =============================================================================

class TestContainerError extends ContainerError {
  readonly code = "TEST_ERROR" as const;
  readonly isProgrammingError = true as const;

  constructor(message: string) {
    super(message);
  }
}

class TestRuntimeError extends ContainerError {
  readonly code = "RUNTIME_ERROR" as const;
  readonly isProgrammingError = false as const;

  constructor(message: string) {
    super(message);
  }
}

// =============================================================================
// hasMessageProperty()
// =============================================================================

describe("hasMessageProperty()", () => {
  it("returns true for object with string message property", () => {
    expect(hasMessageProperty({ message: "hello" })).toBe(true);
  });

  it("returns true for Error instances", () => {
    expect(hasMessageProperty(new Error("test"))).toBe(true);
  });

  it("returns false for null", () => {
    expect(hasMessageProperty(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(hasMessageProperty(undefined)).toBe(false);
  });

  it("returns false for string", () => {
    expect(hasMessageProperty("hello")).toBe(false);
  });

  it("returns false for number", () => {
    expect(hasMessageProperty(42)).toBe(false);
  });

  it("returns false for object without message property", () => {
    expect(hasMessageProperty({ code: "ERR" })).toBe(false);
  });

  it("returns false for object with non-string message property", () => {
    expect(hasMessageProperty({ message: 42 })).toBe(false);
  });

  it("returns false for object with null message property", () => {
    expect(hasMessageProperty({ message: null })).toBe(false);
  });

  it("returns false for empty object", () => {
    expect(hasMessageProperty({})).toBe(false);
  });
});

// =============================================================================
// extractErrorMessage()
// =============================================================================

describe("extractErrorMessage()", () => {
  it("extracts message from Error instances", () => {
    expect(extractErrorMessage(new Error("test error"))).toBe("test error");
  });

  it("extracts message from objects with message property", () => {
    expect(extractErrorMessage({ message: "custom error" })).toBe("custom error");
  });

  it("converts string to string", () => {
    expect(extractErrorMessage("string error")).toBe("string error");
  });

  it("converts number to string", () => {
    expect(extractErrorMessage(42)).toBe("42");
  });

  it("converts null to string", () => {
    expect(extractErrorMessage(null)).toBe("null");
  });

  it("converts undefined to string", () => {
    expect(extractErrorMessage(undefined)).toBe("undefined");
  });

  it("converts boolean to string", () => {
    expect(extractErrorMessage(false)).toBe("false");
  });

  it("prefers Error.message over generic message property", () => {
    const err = new Error("error message");
    expect(extractErrorMessage(err)).toBe("error message");
  });

  it("handles ContainerError subclass", () => {
    const err = new TestContainerError("container error");
    expect(extractErrorMessage(err)).toBe("container error");
  });
});

// =============================================================================
// ContainerError
// =============================================================================

describe("ContainerError", () => {
  it("has correct message", () => {
    const err = new TestContainerError("test message");
    expect(err.message).toBe("test message");
  });

  it("has correct code on programming error subclass", () => {
    const err = new TestContainerError("test");
    expect(err.code).toBe("TEST_ERROR");
  });

  it("has correct isProgrammingError on programming error subclass", () => {
    const err = new TestContainerError("test");
    expect(err.isProgrammingError).toBe(true);
  });

  it("has correct isProgrammingError on runtime error subclass", () => {
    const err = new TestRuntimeError("test");
    expect(err.isProgrammingError).toBe(false);
  });

  it("is instanceof Error", () => {
    const err = new TestContainerError("test");
    expect(err).toBeInstanceOf(Error);
  });

  it("is instanceof ContainerError", () => {
    const err = new TestContainerError("test");
    expect(err).toBeInstanceOf(ContainerError);
  });

  it("is instanceof its own class", () => {
    const err = new TestContainerError("test");
    expect(err).toBeInstanceOf(TestContainerError);
  });

  it("name getter returns concrete class name", () => {
    const err = new TestContainerError("test");
    expect(err.name).toBe("TestContainerError");
  });

  it("name getter returns different name for different subclass", () => {
    const err = new TestRuntimeError("test");
    expect(err.name).toBe("TestRuntimeError");
  });

  it("has a stack trace", () => {
    const err = new TestContainerError("test");
    expect(err.stack).toBeDefined();
    expect(typeof err.stack).toBe("string");
  });
});
