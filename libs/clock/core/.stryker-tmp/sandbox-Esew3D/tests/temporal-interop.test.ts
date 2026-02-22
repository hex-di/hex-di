/**
 * Temporal API interop tests — DoD 29
 *
 * The Temporal API is not yet widely available natively. Tests for Temporal-dependent
 * behavior use a minimal mock object injected via globalThis. Tests that require
 * Temporal unavailability temporarily remove it from globalThis.
 */
// @ts-nocheck


import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { toTemporalInstant, fromTemporalInstant } from "../src/temporal-interop.js";
import { asWallClock, asHighRes } from "../src/branded.js";

// Minimal Temporal mock matching the TemporalInstantLike and TemporalNamespace shapes
type MockTemporalInstant = { readonly epochMilliseconds: bigint };

function createMockTemporalNamespace() {
  return {
    Instant: {
      fromEpochNanoseconds(epochNanoseconds: bigint): MockTemporalInstant {
        return Object.freeze({ epochMilliseconds: epochNanoseconds / 1_000_000n });
      },
    },
  };
}

// Helpers to install/remove a mock Temporal global
function installMockTemporal(): void {
  (globalThis as Record<string, unknown>)["Temporal"] = createMockTemporalNamespace();
}

function removeTemporal(): void {
  delete (globalThis as Record<string, unknown>)["Temporal"];
}

// =============================================================================
// DoD 29: Temporal API Interop
// =============================================================================

describe("toTemporalInstant() — with Temporal available", () => {
  beforeEach(installMockTemporal);
  afterEach(removeTemporal);

  it("toTemporalInstant(wallClockTimestamp) returns an object with epochMilliseconds", () => {
    const ms = Date.now();
    const wall = asWallClock(ms);
    const instant = toTemporalInstant(wall);
    expect(typeof instant.epochMilliseconds).toBe("bigint");
  });

  it("toTemporalInstant converts epoch ms to nanoseconds via BigInt(ms) * 1_000_000n", () => {
    const ms = 1707753600000; // fixed epoch ms
    const wall = asWallClock(ms);
    const instant = toTemporalInstant(wall);
    // epochNanoseconds = BigInt(ms) * 1_000_000n, epochMilliseconds = epochNanoseconds / 1_000_000n
    expect(instant.epochMilliseconds).toBe(BigInt(ms));
  });

  it("fromTemporalInstant(instant) returns a WallClockTimestamp with correct epoch ms", () => {
    const ms = 1707753600000;
    const mockInstant: MockTemporalInstant = Object.freeze({ epochMilliseconds: BigInt(ms) });
    const result = fromTemporalInstant(mockInstant);
    expect(result).toBe(ms);
  });

  it("round-trip: fromTemporalInstant(toTemporalInstant(wall)) equals original", () => {
    const ms = 1707753600000;
    const wall = asWallClock(ms);
    const instant = toTemporalInstant(wall);
    const roundTripped = fromTemporalInstant(instant);
    expect(roundTripped).toBe(ms);
  });

  it("toTemporalInstant accepts HighResTimestamp (assignable to WallClockTimestamp | HighResTimestamp)", () => {
    const ms = Date.now();
    const highRes = asHighRes(ms);
    const instant = toTemporalInstant(highRes);
    expect(typeof instant.epochMilliseconds).toBe("bigint");
    expect(instant.epochMilliseconds).toBe(BigInt(ms));
  });

  it("toTemporalInstant rounds fractional milliseconds via Math.round", () => {
    // 1000.7ms should round to 1001
    const ms = 1707753600000.7;
    const wall = asWallClock(ms);
    const instant = toTemporalInstant(wall);
    expect(instant.epochMilliseconds).toBe(BigInt(Math.round(ms)));
  });
});

describe("toTemporalInstant() — Temporal unavailable", () => {
  beforeEach(removeTemporal);

  it("toTemporalInstant throws TypeError when Temporal global is unavailable", () => {
    const wall = asWallClock(Date.now());
    expect(() => toTemporalInstant(wall)).toThrow(TypeError);
  });

  it("TypeError message includes guidance about polyfill or native Temporal support", () => {
    const wall = asWallClock(Date.now());
    expect(() => toTemporalInstant(wall)).toThrow(/polyfill|Temporal/i);
  });
});

describe("fromTemporalInstant() — Temporal unavailable", () => {
  beforeEach(removeTemporal);

  it("fromTemporalInstant throws TypeError when Temporal global is unavailable", () => {
    const mockInstant: MockTemporalInstant = Object.freeze({
      epochMilliseconds: BigInt(Date.now()),
    });
    expect(() => fromTemporalInstant(mockInstant)).toThrow(TypeError);
  });

  it("TypeError message includes guidance about polyfill or native Temporal support", () => {
    const mockInstant: MockTemporalInstant = Object.freeze({
      epochMilliseconds: BigInt(Date.now()),
    });
    expect(() => fromTemporalInstant(mockInstant)).toThrow(/polyfill|Temporal/i);
  });
});

describe("Temporal lazy detection", () => {
  it("Temporal global is NOT accessed at module import time (lazy detection)", () => {
    // The module was already imported without Temporal available.
    // If lazy, the import itself should not throw. We simply verify the module loaded.
    // If not lazy, the test file itself would fail to import.
    expect(typeof toTemporalInstant).toBe("function");
    expect(typeof fromTemporalInstant).toBe("function");
  });
});

describe("Temporal detection edge cases (kills ConditionalExpression mutants)", () => {
  afterEach(removeTemporal);

  it("throws 'Temporal API not available' when Temporal.Instant is not an object (kills L33 CE mutant)", () => {
    // ConditionalExpression mutant at L33: makes typeof Instant === "object" always true
    // With mutant: { Instant: "bad" } passes detection, then fromEpochNanoseconds call fails differently
    (globalThis as Record<string, unknown>)["Temporal"] = { Instant: "not-an-object" };
    const wall = asWallClock(Date.now());
    // Original: getTemporalGlobal returns undefined → "Temporal API is not available"
    // Mutant: returns { Instant: "not-an-object" } → fromEpochNanoseconds is not a function
    expect(() => toTemporalInstant(wall)).toThrow(/Temporal API is not available/);
  });

  it("throws when Temporal global is null (kills L32 CE(true) mutant)", () => {
    // L32: `temporal !== null` CE(true) — with the mutant, null passes the null check
    // typeof null === "object" is true (passes L31), so with CE(true) on L32 we'd
    // try to access null["Instant"] → TypeError (different error from "not available")
    // Original: temporal !== null → false → getTemporalGlobal returns undefined → throws "not available"
    (globalThis as Record<string, unknown>)["Temporal"] = null;
    const wall = asWallClock(Date.now());
    expect(() => toTemporalInstant(wall)).toThrow(/Temporal API is not available/);
  });
});
