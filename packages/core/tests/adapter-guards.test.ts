/**
 * Comprehensive tests for adapter type guards.
 *
 * Tests isLifetime(), isFactoryKind(), and isAdapter() with valid/invalid inputs.
 */

import { describe, it, expect } from "vitest";
import { isAdapter, isLifetime, isFactoryKind, port, createAdapter } from "../src/index.js";

// =============================================================================
// isLifetime()
// =============================================================================

describe("isLifetime()", () => {
  it("returns true for 'singleton'", () => {
    expect(isLifetime("singleton")).toBe(true);
  });

  it("returns true for 'scoped'", () => {
    expect(isLifetime("scoped")).toBe(true);
  });

  it("returns true for 'transient'", () => {
    expect(isLifetime("transient")).toBe(true);
  });

  it("returns false for invalid string", () => {
    expect(isLifetime("request")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isLifetime("")).toBe(false);
  });

  it("returns false for number", () => {
    expect(isLifetime(42)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isLifetime(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isLifetime(undefined)).toBe(false);
  });

  it("returns false for boolean", () => {
    expect(isLifetime(true)).toBe(false);
  });

  it("returns false for object", () => {
    expect(isLifetime({})).toBe(false);
  });
});

// =============================================================================
// isFactoryKind()
// =============================================================================

describe("isFactoryKind()", () => {
  it("returns true for 'sync'", () => {
    expect(isFactoryKind("sync")).toBe(true);
  });

  it("returns true for 'async'", () => {
    expect(isFactoryKind("async")).toBe(true);
  });

  it("returns false for invalid string", () => {
    expect(isFactoryKind("promise")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isFactoryKind("")).toBe(false);
  });

  it("returns false for number", () => {
    expect(isFactoryKind(42)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isFactoryKind(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isFactoryKind(undefined)).toBe(false);
  });

  it("returns false for boolean", () => {
    expect(isFactoryKind(true)).toBe(false);
  });

  it("returns false for object", () => {
    expect(isFactoryKind({})).toBe(false);
  });
});

// =============================================================================
// isAdapter()
// =============================================================================

describe("isAdapter()", () => {
  const LoggerPort = port<{ log(msg: string): void }>()({ name: "Logger" });
  const DatabasePort = port<{ query(): void }>()({ name: "Database" });

  it("returns true for a valid adapter created by createAdapter", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });
    expect(isAdapter(adapter)).toBe(true);
  });

  it("returns true for a valid adapter with all fields explicit", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [DatabasePort],
      lifetime: "scoped",
      clonable: true,
      factory: () => ({ log: () => {} }),
    });
    expect(isAdapter(adapter)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isAdapter(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isAdapter(undefined)).toBe(false);
  });

  it("returns false for a string", () => {
    expect(isAdapter("adapter")).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isAdapter(42)).toBe(false);
  });

  it("returns false for an empty object", () => {
    expect(isAdapter({})).toBe(false);
  });

  it("returns false when 'provides' is missing", () => {
    expect(
      isAdapter({
        requires: [],
        lifetime: "singleton",
        factoryKind: "sync",
        factory: () => {},
        clonable: false,
      })
    ).toBe(false);
  });

  it("returns false when 'provides' is not a port (no __portName)", () => {
    expect(
      isAdapter({
        provides: { name: "Logger" }, // missing __portName
        requires: [],
        lifetime: "singleton",
        factoryKind: "sync",
        factory: () => {},
        clonable: false,
      })
    ).toBe(false);
  });

  it("returns false when 'provides' is null", () => {
    expect(
      isAdapter({
        provides: null,
        requires: [],
        lifetime: "singleton",
        factoryKind: "sync",
        factory: () => {},
        clonable: false,
      })
    ).toBe(false);
  });

  it("returns false when 'requires' is not an array", () => {
    expect(
      isAdapter({
        provides: LoggerPort,
        requires: "not-an-array",
        lifetime: "singleton",
        factoryKind: "sync",
        factory: () => {},
        clonable: false,
      })
    ).toBe(false);
  });

  it("returns false when 'requires' contains non-port element", () => {
    expect(
      isAdapter({
        provides: LoggerPort,
        requires: [{ notAPort: true }],
        lifetime: "singleton",
        factoryKind: "sync",
        factory: () => {},
        clonable: false,
      })
    ).toBe(false);
  });

  it("returns false when 'lifetime' is invalid", () => {
    expect(
      isAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "request",
        factoryKind: "sync",
        factory: () => {},
        clonable: false,
      })
    ).toBe(false);
  });

  it("returns false when 'lifetime' is missing", () => {
    expect(
      isAdapter({
        provides: LoggerPort,
        requires: [],
        factoryKind: "sync",
        factory: () => {},
        clonable: false,
      })
    ).toBe(false);
  });

  it("returns false when 'factoryKind' is invalid", () => {
    expect(
      isAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factoryKind: "promise",
        factory: () => {},
        clonable: false,
      })
    ).toBe(false);
  });

  it("returns false when 'factoryKind' is missing", () => {
    expect(
      isAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => {},
        clonable: false,
      })
    ).toBe(false);
  });

  it("returns false when 'factory' is not a function", () => {
    expect(
      isAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factoryKind: "sync",
        factory: "not a function",
        clonable: false,
      })
    ).toBe(false);
  });

  it("returns false when 'factory' is missing", () => {
    expect(
      isAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factoryKind: "sync",
        clonable: false,
      })
    ).toBe(false);
  });

  it("returns false when 'clonable' is not a boolean", () => {
    expect(
      isAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factoryKind: "sync",
        factory: () => {},
        clonable: "yes",
      })
    ).toBe(false);
  });

  it("returns false when 'clonable' is missing", () => {
    expect(
      isAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factoryKind: "sync",
        factory: () => {},
      })
    ).toBe(false);
  });

  it("returns true when 'requires' has valid port elements", () => {
    expect(
      isAdapter({
        provides: LoggerPort,
        requires: [DatabasePort],
        lifetime: "singleton",
        factoryKind: "sync",
        factory: () => {},
        clonable: false,
      })
    ).toBe(true);
  });

  it("returns false when provides __portName is not a string", () => {
    expect(
      isAdapter({
        provides: { __portName: 42 },
        requires: [],
        lifetime: "singleton",
        factoryKind: "sync",
        factory: () => {},
        clonable: false,
      })
    ).toBe(false);
  });
});
