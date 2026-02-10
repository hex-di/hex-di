/**
 * Tests for lazy port functionality.
 *
 * Tests lazyPort(), isLazyPort(), and getOriginalPort().
 */

import { describe, it, expect } from "vitest";
import { port, lazyPort, isLazyPort, getOriginalPort } from "../src/index.js";

// =============================================================================
// Test Ports
// =============================================================================

interface UserService {
  getUser(id: string): { id: string; name: string };
}

interface NotificationService {
  send(userId: string, message: string): void;
}

const UserServicePort = port<UserService>()({ name: "UserService" });
const NotificationServicePort = port<NotificationService>()({ name: "NotificationService" });

// =============================================================================
// lazyPort()
// =============================================================================

describe("lazyPort()", () => {
  it("creates a lazy port with 'Lazy' prefix in name", () => {
    const lazy = lazyPort(UserServicePort);
    expect(lazy.__portName).toBe("LazyUserService");
  });

  it("creates a frozen lazy port object", () => {
    const lazy = lazyPort(UserServicePort);
    expect(Object.isFrozen(lazy)).toBe(true);
  });

  it("creates different lazy ports for different source ports", () => {
    const lazy1 = lazyPort(UserServicePort);
    const lazy2 = lazyPort(NotificationServicePort);
    expect(lazy1.__portName).toBe("LazyUserService");
    expect(lazy2.__portName).toBe("LazyNotificationService");
  });
});

// =============================================================================
// isLazyPort()
// =============================================================================

describe("isLazyPort()", () => {
  it("returns true for a lazy port", () => {
    const lazy = lazyPort(UserServicePort);
    expect(isLazyPort(lazy)).toBe(true);
  });

  it("returns false for a regular port", () => {
    expect(isLazyPort(UserServicePort)).toBe(false);
  });

  it("returns false for another regular port", () => {
    expect(isLazyPort(NotificationServicePort)).toBe(false);
  });
});

// =============================================================================
// getOriginalPort()
// =============================================================================

describe("getOriginalPort()", () => {
  it("extracts the original port from a lazy port", () => {
    const lazy = lazyPort(UserServicePort);
    const original = getOriginalPort(lazy);
    expect(original).toBe(UserServicePort);
  });

  it("extracts correct original port for different lazy ports", () => {
    const lazy1 = lazyPort(UserServicePort);
    const lazy2 = lazyPort(NotificationServicePort);
    expect(getOriginalPort(lazy1)).toBe(UserServicePort);
    expect(getOriginalPort(lazy2)).toBe(NotificationServicePort);
  });

  it("throws HEX019 for an object without original port symbol", () => {
    // Create a fake "lazy port" missing the original port symbol
    const fake = Object.freeze({
      __portName: "LazyFake",
      [Symbol.for("@hex-di/core/LazyPort")]: true,
    });

    expect(() => {
      getOriginalPort(fake as any);
    }).toThrow(/HEX019/);
  });
});
