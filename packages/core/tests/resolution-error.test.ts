/**
 * Tests for resolution error type guards: isResolutionError() and toResolutionError().
 */

import { describe, it, expect } from "vitest";
import {
  isResolutionError,
  toResolutionError,
  CircularDependencyError,
  FactoryError,
  DisposedScopeError,
  ScopeRequiredError,
  AsyncFactoryError,
  AsyncInitializationRequiredError,
  NonClonableForkedError,
} from "../src/index.js";

// =============================================================================
// isResolutionError()
// =============================================================================

describe("isResolutionError()", () => {
  it("returns true for CircularDependencyError", () => {
    const err = new CircularDependencyError(["A", "B", "A"]);
    expect(isResolutionError(err)).toBe(true);
  });

  it("returns true for FactoryError", () => {
    const err = new FactoryError("X", new Error("failed"));
    expect(isResolutionError(err)).toBe(true);
  });

  it("returns true for DisposedScopeError", () => {
    const err = new DisposedScopeError("X");
    expect(isResolutionError(err)).toBe(true);
  });

  it("returns true for ScopeRequiredError", () => {
    const err = new ScopeRequiredError("X");
    expect(isResolutionError(err)).toBe(true);
  });

  it("returns true for AsyncFactoryError", () => {
    const err = new AsyncFactoryError("X", new Error("failed"));
    expect(isResolutionError(err)).toBe(true);
  });

  it("returns true for AsyncInitializationRequiredError", () => {
    const err = new AsyncInitializationRequiredError("X");
    expect(isResolutionError(err)).toBe(true);
  });

  it("returns true for NonClonableForkedError", () => {
    const err = new NonClonableForkedError("X");
    expect(isResolutionError(err)).toBe(true);
  });

  it("returns false for a regular Error", () => {
    expect(isResolutionError(new Error("test"))).toBe(false);
  });

  it("returns false for a TypeError", () => {
    expect(isResolutionError(new TypeError("test"))).toBe(false);
  });

  it("returns false for a string", () => {
    expect(isResolutionError("error")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isResolutionError(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isResolutionError(undefined)).toBe(false);
  });

  it("returns false for a plain object", () => {
    expect(isResolutionError({ code: "CIRCULAR_DEPENDENCY" })).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isResolutionError(42)).toBe(false);
  });
});

// =============================================================================
// toResolutionError()
// =============================================================================

describe("toResolutionError()", () => {
  it("returns the error for CircularDependencyError", () => {
    const err = new CircularDependencyError(["A", "B", "A"]);
    const result = toResolutionError(err);
    expect(result).toBe(err);
  });

  it("returns the error for FactoryError", () => {
    const err = new FactoryError("X", new Error("failed"));
    const result = toResolutionError(err);
    expect(result).toBe(err);
  });

  it("returns null for a regular Error", () => {
    expect(toResolutionError(new Error("test"))).toBeNull();
  });

  it("returns null for a string", () => {
    expect(toResolutionError("error")).toBeNull();
  });

  it("returns null for null", () => {
    expect(toResolutionError(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(toResolutionError(undefined)).toBeNull();
  });

  it("returns null for a plain object", () => {
    expect(toResolutionError({ code: "TEST" })).toBeNull();
  });

  it("returns null for a number", () => {
    expect(toResolutionError(42)).toBeNull();
  });
});
