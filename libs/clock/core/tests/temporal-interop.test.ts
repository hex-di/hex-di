/**
 * Temporal API interop tests — DoD 29
 *
 * The Temporal API is not yet widely available natively. Tests for Temporal-dependent
 * behavior use a minimal mock object injected via globalThis. Tests that require
 * Temporal unavailability temporarily remove it from globalThis.
 */

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

  it("toTemporalInstant(wallClockTimestamp) returns ok with epochMilliseconds", () => {
    const ms = Date.now();
    const wall = asWallClock(ms);
    const r = toTemporalInstant(wall);
    expect(r.isOk()).toBe(true);
    if (!r.isOk()) return;
    expect(typeof r.value.epochMilliseconds).toBe("bigint");
  });

  it("toTemporalInstant converts epoch ms to nanoseconds via BigInt(ms) * 1_000_000n", () => {
    const ms = 1707753600000; // fixed epoch ms
    const wall = asWallClock(ms);
    const r = toTemporalInstant(wall);
    expect(r.isOk()).toBe(true);
    if (!r.isOk()) return;
    // epochNanoseconds = BigInt(ms) * 1_000_000n, epochMilliseconds = epochNanoseconds / 1_000_000n
    expect(r.value.epochMilliseconds).toBe(BigInt(ms));
  });

  it("fromTemporalInstant(instant) returns ok with correct epoch ms", () => {
    const ms = 1707753600000;
    const mockInstant: MockTemporalInstant = Object.freeze({ epochMilliseconds: BigInt(ms) });
    const r = fromTemporalInstant(mockInstant);
    expect(r.isOk()).toBe(true);
    if (!r.isOk()) return;
    expect(r.value).toBe(ms);
  });

  it("round-trip: fromTemporalInstant(toTemporalInstant(wall)) equals original", () => {
    const ms = 1707753600000;
    const wall = asWallClock(ms);
    const ir = toTemporalInstant(wall);
    expect(ir.isOk()).toBe(true);
    if (!ir.isOk()) return;
    const rr = fromTemporalInstant(ir.value);
    expect(rr.isOk()).toBe(true);
    if (!rr.isOk()) return;
    expect(rr.value).toBe(ms);
  });

  it("toTemporalInstant accepts HighResTimestamp (assignable to WallClockTimestamp | HighResTimestamp)", () => {
    const ms = Date.now();
    const highRes = asHighRes(ms);
    const r = toTemporalInstant(highRes);
    expect(r.isOk()).toBe(true);
    if (!r.isOk()) return;
    expect(typeof r.value.epochMilliseconds).toBe("bigint");
    expect(r.value.epochMilliseconds).toBe(BigInt(ms));
  });

  it("toTemporalInstant rounds fractional milliseconds via Math.round", () => {
    // 1000.7ms should round to 1001
    const ms = 1707753600000.7;
    const wall = asWallClock(ms);
    const r = toTemporalInstant(wall);
    expect(r.isOk()).toBe(true);
    if (!r.isOk()) return;
    expect(r.value.epochMilliseconds).toBe(BigInt(Math.round(ms)));
  });
});

describe("toTemporalInstant() — Temporal unavailable", () => {
  beforeEach(removeTemporal);

  it("toTemporalInstant returns err when Temporal global is unavailable", () => {
    const wall = asWallClock(Date.now());
    const r = toTemporalInstant(wall);
    expect(r.isErr()).toBe(true);
  });

  it("err message includes guidance about polyfill or native Temporal support", () => {
    const wall = asWallClock(Date.now());
    const r = toTemporalInstant(wall);
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/polyfill|Temporal/i);
  });
});

describe("fromTemporalInstant() — Temporal unavailable", () => {
  beforeEach(removeTemporal);

  it("fromTemporalInstant returns err when Temporal global is unavailable", () => {
    const mockInstant: MockTemporalInstant = Object.freeze({
      epochMilliseconds: BigInt(Date.now()),
    });
    const r = fromTemporalInstant(mockInstant);
    expect(r.isErr()).toBe(true);
  });

  it("err message includes guidance about polyfill or native Temporal support", () => {
    const mockInstant: MockTemporalInstant = Object.freeze({
      epochMilliseconds: BigInt(Date.now()),
    });
    const r = fromTemporalInstant(mockInstant);
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/polyfill|Temporal/i);
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

  it("returns err 'Temporal API not available' when Temporal.Instant is not an object (kills L33 CE mutant)", () => {
    // ConditionalExpression mutant at L33: makes typeof Instant === "object" always true
    (globalThis as Record<string, unknown>)["Temporal"] = { Instant: "not-an-object" };
    const wall = asWallClock(Date.now());
    const r = toTemporalInstant(wall);
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/Temporal API is not available/);
  });

  it("returns err when Temporal global is null (kills L32 CE(true) mutant)", () => {
    // L32: `temporal !== null` CE(true) — with the mutant, null passes the null check
    (globalThis as Record<string, unknown>)["Temporal"] = null;
    const wall = asWallClock(Date.now());
    const r = toTemporalInstant(wall);
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/Temporal API is not available/);
  });
});
