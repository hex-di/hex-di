/**
 * Type utility functions unit tests.
 *
 * Tests for branded types, type guards, and context helpers
 * that provide type-safe access to context variables.
 */

import { describe, test, expect } from "vitest";
import { createPort } from "@hex-di/core";
import { isPort, isPortNamed } from "../src/types/type-guards.js";
import { createContextVariableKey, type ContextVariableKey } from "../src/types/branded-types.js";
import {
  getContextVariable,
  setContextVariable,
  getContextVariableOrDefault,
  type TypeSafeContext,
} from "../src/types/helpers.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

interface UserContext {
  userId: string;
  userName: string;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");

function createMockContext(): TypeSafeContext {
  const store = new Map<ContextVariableKey<any>, any>();
  return {
    get(key) {
      return store.get(key);
    },
    set(key, value) {
      store.set(key, value);
    },
  };
}

// =============================================================================
// isPort Type Guard Tests
// =============================================================================

describe("isPort", () => {
  test("returns true for valid Port objects", () => {
    expect(isPort(LoggerPort)).toBe(true);
    expect(isPort(DatabasePort)).toBe(true);
  });

  test("returns false for non-objects", () => {
    expect(isPort(null)).toBe(false);
    expect(isPort(undefined)).toBe(false);
    expect(isPort("string")).toBe(false);
    expect(isPort(123)).toBe(false);
    expect(isPort(true)).toBe(false);
  });

  test("returns false for objects without __portName", () => {
    expect(isPort({})).toBe(false);
    expect(isPort({ foo: "bar" })).toBe(false);
    expect(isPort({ __portName: 123 })).toBe(false);
  });

  test("returns false for objects with non-string __portName", () => {
    expect(isPort({ __portName: 123 })).toBe(false);
    expect(isPort({ __portName: null })).toBe(false);
    expect(isPort({ __portName: undefined })).toBe(false);
  });

  test("returns true for objects with string __portName", () => {
    expect(isPort({ __portName: "Logger" })).toBe(true);
    expect(isPort({ __portName: "Database" })).toBe(true);
  });
});

// =============================================================================
// isPortNamed Type Guard Tests
// =============================================================================

describe("isPortNamed", () => {
  test("returns true for Port with matching name", () => {
    expect(isPortNamed(LoggerPort, "Logger")).toBe(true);
    expect(isPortNamed(DatabasePort, "Database")).toBe(true);
  });

  test("returns false for Port with non-matching name", () => {
    expect(isPortNamed(LoggerPort, "Database")).toBe(false);
    expect(isPortNamed(DatabasePort, "Logger")).toBe(false);
  });

  test("returns false for non-Port objects", () => {
    expect(isPortNamed({}, "Logger")).toBe(false);
    expect(isPortNamed(null, "Logger")).toBe(false);
    expect(isPortNamed(undefined, "Logger")).toBe(false);
  });

  test("returns false for objects with wrong __portName type", () => {
    expect(isPortNamed({ __portName: 123 }, "Logger")).toBe(false);
  });
});

// =============================================================================
// Branded Type Tests
// =============================================================================

describe("createContextVariableKey", () => {
  test("creates a branded key from a string", () => {
    const key = createContextVariableKey<UserContext>("userContext");
    expect(typeof key).toBe("object");
    expect(key.toString()).toBe("userContext");
  });

  test("preserves the key string at runtime", () => {
    const key1 = createContextVariableKey<UserContext>("user");
    const key2 = createContextVariableKey<UserContext>("user");
    expect(key1.toString()).toBe(key2.toString());
  });

  test("allows different types for the same key string", () => {
    const userKey = createContextVariableKey<UserContext>("context");
    const numberKey = createContextVariableKey<number>("context");
    // Both are strings at runtime, but have different types at compile time
    expect(userKey.toString()).toBe(numberKey.toString());
  });
});

// =============================================================================
// Context Helper Tests
// =============================================================================

describe("getContextVariable", () => {
  test("retrieves a stored context variable", () => {
    const mockContext = createMockContext();
    const key = createContextVariableKey<UserContext>("userContext");
    mockContext.set(key, { userId: "123", userName: "Alice" });
    const value = getContextVariable(mockContext, key);

    expect(value).toEqual({ userId: "123", userName: "Alice" });
  });

  test("returns undefined for missing context variable", () => {
    const mockContext = createMockContext();
    const key = createContextVariableKey<UserContext>("userContext");
    const value = getContextVariable(mockContext, key);

    expect(value).toBeUndefined();
  });

  test("works with different value types", () => {
    const mockContext = createMockContext();
    const countKey = createContextVariableKey<number>("count");
    const nameKey = createContextVariableKey<string>("name");
    const activeKey = createContextVariableKey<boolean>("active");

    mockContext.set(countKey, 42);
    mockContext.set(nameKey, "test");
    mockContext.set(activeKey, true);

    expect(getContextVariable(mockContext, countKey)).toBe(42);
    expect(getContextVariable(mockContext, nameKey)).toBe("test");
    expect(getContextVariable(mockContext, activeKey)).toBe(true);
  });
});

describe("setContextVariable", () => {
  test("stores a context variable", () => {
    const mockContext = createMockContext();
    const key = createContextVariableKey<UserContext>("userContext");
    const userContext: UserContext = { userId: "123", userName: "Alice" };

    setContextVariable(mockContext, key, userContext);

    expect(getContextVariable(mockContext, key)).toEqual(userContext);
  });

  test("works with different value types", () => {
    const mockContext = createMockContext();
    const countKey = createContextVariableKey<number>("count");
    const nameKey = createContextVariableKey<string>("name");
    const activeKey = createContextVariableKey<boolean>("active");

    setContextVariable(mockContext, countKey, 42);
    setContextVariable(mockContext, nameKey, "test");
    setContextVariable(mockContext, activeKey, true);

    expect(getContextVariable(mockContext, countKey)).toBe(42);
    expect(getContextVariable(mockContext, nameKey)).toBe("test");
    expect(getContextVariable(mockContext, activeKey)).toBe(true);
  });

  test("overwrites existing values", () => {
    const mockContext = createMockContext();
    const key = createContextVariableKey<UserContext>("userContext");
    mockContext.set(key, { userId: "old", userName: "Old" });
    const newUserContext: UserContext = { userId: "new", userName: "New" };

    setContextVariable(mockContext, key, newUserContext);

    expect(getContextVariable(mockContext, key)).toEqual(newUserContext);
  });
});

describe("getContextVariableOrDefault", () => {
  test("returns stored value when present", () => {
    const mockContext = createMockContext();
    const key = createContextVariableKey<UserContext>("userContext");
    const defaultValue: UserContext = { userId: "guest", userName: "Guest" };
    mockContext.set(key, { userId: "123", userName: "Alice" });

    const value = getContextVariableOrDefault(mockContext, key, defaultValue);

    expect(value).toEqual({ userId: "123", userName: "Alice" });
  });

  test("returns default value when variable is missing", () => {
    const mockContext = createMockContext();
    const key = createContextVariableKey<UserContext>("userContext");
    const defaultValue: UserContext = { userId: "guest", userName: "Guest" };
    const value = getContextVariableOrDefault(mockContext, key, defaultValue);

    expect(value).toEqual(defaultValue);
  });

  test("works with different value types", () => {
    const mockContext = createMockContext();
    const countKey = createContextVariableKey<number>("count");
    const nameKey = createContextVariableKey<string>("name");

    mockContext.set(countKey, 42);

    expect(getContextVariableOrDefault(mockContext, countKey, 0)).toBe(42);
    expect(getContextVariableOrDefault(mockContext, nameKey, "default")).toBe("default");
  });
});
