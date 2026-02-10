/**
 * Tests specifically targeting surviving mutants in directed ports.
 *
 * These tests exercise:
 * - DIRECTION_BRAND symbol identity (Symbol.for("@hex-di/core/PortDirection"))
 * - METADATA_KEY symbol identity (Symbol.for("@hex-di/core/PortMetadata"))
 * - hasDirectionBrand() negative cases (non-directed ports)
 * - hasMetadataKey() negative cases (ports without metadata)
 * - isDirectedPort() with objects lacking direction brand
 * - getPortDirection() / getPortMetadata() with non-directed ports
 */

import { describe, it, expect } from "vitest";
import {
  port,
  isDirectedPort,
  isInboundPort,
  isOutboundPort,
  getPortDirection,
  getPortMetadata,
} from "../src/index.js";
import { DIRECTION_BRAND, METADATA_KEY } from "../src/ports/directed.js";

// =============================================================================
// Symbol identity tests
// =============================================================================

describe("DIRECTION_BRAND symbol", () => {
  it("is the Symbol.for('@hex-di/core/PortDirection')", () => {
    expect(DIRECTION_BRAND).toBe(Symbol.for("@hex-di/core/PortDirection"));
  });

  it("has correct description", () => {
    expect(DIRECTION_BRAND.description).toBe("@hex-di/core/PortDirection");
  });

  it("is not an empty symbol", () => {
    expect(DIRECTION_BRAND).not.toBe(Symbol.for(""));
  });
});

describe("METADATA_KEY symbol", () => {
  it("is the Symbol.for('@hex-di/core/PortMetadata')", () => {
    expect(METADATA_KEY).toBe(Symbol.for("@hex-di/core/PortMetadata"));
  });

  it("has correct description", () => {
    expect(METADATA_KEY.description).toBe("@hex-di/core/PortMetadata");
  });

  it("is not an empty symbol", () => {
    expect(METADATA_KEY).not.toBe(Symbol.for(""));
  });
});

// =============================================================================
// isDirectedPort() with non-directed ports (negative cases)
// =============================================================================

describe("isDirectedPort() - negative cases", () => {
  it("returns false for a plain object with __portName but no direction brand", () => {
    const fakePort = { __portName: "FakePort" };
    expect(isDirectedPort(fakePort as any)).toBe(false);
  });

  it("returns false for a port object with wrong direction value", () => {
    const fakePort = {
      __portName: "FakePort",
      [DIRECTION_BRAND]: "neither" as any,
    };
    expect(isDirectedPort(fakePort as any)).toBe(false);
  });
});

// =============================================================================
// isInboundPort() with non-directed ports
// =============================================================================

describe("isInboundPort() - negative cases", () => {
  it("returns false for a plain object with __portName but no direction brand", () => {
    const fakePort = { __portName: "FakePort" };
    expect(isInboundPort(fakePort as any)).toBe(false);
  });
});

// =============================================================================
// isOutboundPort() with non-directed ports
// =============================================================================

describe("isOutboundPort() - negative cases", () => {
  it("returns false for a plain object with __portName but no direction brand", () => {
    const fakePort = { __portName: "FakePort" };
    expect(isOutboundPort(fakePort as any)).toBe(false);
  });
});

// =============================================================================
// getPortDirection() with non-directed ports
// =============================================================================

describe("getPortDirection() - non-directed ports", () => {
  it("returns undefined for a plain port without direction brand", () => {
    const fakePort = { __portName: "FakePort" };
    expect(getPortDirection(fakePort as any)).toBeUndefined();
  });

  it("returns direction value from branded port", () => {
    const directedPort = port<unknown>()({ name: "TestPort", direction: "inbound" });
    const direction = getPortDirection(directedPort);
    expect(direction).toBe("inbound");
  });
});

// =============================================================================
// getPortMetadata() with non-metadata ports
// =============================================================================

describe("getPortMetadata() - ports without metadata key", () => {
  it("returns undefined for a plain port without metadata key", () => {
    const fakePort = { __portName: "FakePort" };
    expect(getPortMetadata(fakePort as any)).toBeUndefined();
  });

  it("returns metadata from a port with metadata key", () => {
    const directedPort = port<unknown>()({
      name: "TestPort",
      description: "Test description",
      category: "test",
      tags: ["a", "b"],
    });
    const metadata = getPortMetadata(directedPort);
    expect(metadata).toBeDefined();
    expect(metadata?.description).toBe("Test description");
    expect(metadata?.category).toBe("test");
    expect(metadata?.tags).toEqual(["a", "b"]);
  });
});

// =============================================================================
// Verify direction values are exactly 'inbound' or 'outbound'
// =============================================================================

describe("Direction value precision", () => {
  it("inbound direction is exactly the string 'inbound'", () => {
    const inboundPort = port<unknown>()({ name: "In", direction: "inbound" });
    const direction = getPortDirection(inboundPort);
    expect(direction).toBe("inbound");
    expect(direction).not.toBe("");
    expect(direction).not.toBe("in");
  });

  it("outbound direction is exactly the string 'outbound'", () => {
    const outboundPort = port<unknown>()({ name: "Out", direction: "outbound" });
    const direction = getPortDirection(outboundPort);
    expect(direction).toBe("outbound");
    expect(direction).not.toBe("");
    expect(direction).not.toBe("out");
  });

  it("default direction is exactly 'outbound'", () => {
    const defaultPort = port<unknown>()({ name: "Default" });
    const direction = getPortDirection(defaultPort);
    expect(direction).toBe("outbound");
  });
});
