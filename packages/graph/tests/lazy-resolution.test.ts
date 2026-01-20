/**
 * Runtime tests for lazy resolution support.
 *
 * These tests verify:
 * 1. lazyPort() creates port with Lazy prefix and brand
 * 2. getOriginalPort() extracts original port from lazy
 * 3. isLazyPort() runtime check works correctly
 */
import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/ports";
import { lazyPort, getOriginalPort, isLazyPort } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface UserService {
  getUser(id: string): { id: string; name: string };
}

const UserServicePort = createPort<"UserService", UserService>("UserService");
const LoggerPort = createPort<"Logger", { log: (msg: string) => void }>("Logger");

// =============================================================================
// lazyPort() Tests
// =============================================================================

describe("lazyPort()", () => {
  it("creates port with Lazy prefix in name", () => {
    const lazy = lazyPort(UserServicePort);
    expect(lazy.__portName).toBe("LazyUserService");
  });

  it("creates frozen object", () => {
    const lazy = lazyPort(UserServicePort);
    expect(Object.isFrozen(lazy)).toBe(true);
  });

  it("preserves original port reference", () => {
    const lazy = lazyPort(UserServicePort);
    const original = getOriginalPort(lazy);
    expect(original).toBe(UserServicePort);
  });

  it("works with different port types", () => {
    const lazyLogger = lazyPort(LoggerPort);
    expect(lazyLogger.__portName).toBe("LazyLogger");
  });
});

// =============================================================================
// getOriginalPort() Tests
// =============================================================================

describe("getOriginalPort()", () => {
  it("extracts original port from lazy port", () => {
    const lazy = lazyPort(UserServicePort);
    const original = getOriginalPort(lazy);

    expect(original).toBe(UserServicePort);
    expect(original.__portName).toBe("UserService");
  });

  it("returns correct port for different lazy ports", () => {
    const lazyUser = lazyPort(UserServicePort);
    const lazyLogger = lazyPort(LoggerPort);

    expect(getOriginalPort(lazyUser)).toBe(UserServicePort);
    expect(getOriginalPort(lazyLogger)).toBe(LoggerPort);
  });
});

// =============================================================================
// isLazyPort() Tests
// =============================================================================

describe("isLazyPort()", () => {
  it("returns true for lazy port", () => {
    const lazy = lazyPort(UserServicePort);
    expect(isLazyPort(lazy)).toBe(true);
  });

  it("returns false for regular port", () => {
    expect(isLazyPort(UserServicePort)).toBe(false);
  });

  it("returns false for port-like object without brand", () => {
    const fakeLazy = { __portName: "LazyFake" };
    // @ts-expect-error - Testing runtime behavior with invalid input
    expect(isLazyPort(fakeLazy)).toBe(false);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("Lazy port integration", () => {
  it("lazy ports can be created and inspected at runtime", () => {
    const lazy = lazyPort(UserServicePort);

    // Verify all properties work together
    expect(lazy.__portName).toBe("LazyUserService");
    expect(isLazyPort(lazy)).toBe(true);
    expect(getOriginalPort(lazy).__portName).toBe("UserService");
  });

  it("multiple lazy ports from same original are independent", () => {
    const lazy1 = lazyPort(UserServicePort);
    const lazy2 = lazyPort(UserServicePort);

    // Both should be valid lazy ports
    expect(isLazyPort(lazy1)).toBe(true);
    expect(isLazyPort(lazy2)).toBe(true);

    // Both should unwrap to the same original
    expect(getOriginalPort(lazy1)).toBe(UserServicePort);
    expect(getOriginalPort(lazy2)).toBe(UserServicePort);

    // They are different objects but equivalent
    expect(lazy1).not.toBe(lazy2);
    expect(lazy1.__portName).toBe(lazy2.__portName);
  });
});
