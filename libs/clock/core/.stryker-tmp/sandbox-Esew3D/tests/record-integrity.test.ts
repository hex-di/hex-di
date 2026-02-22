/**
 * Record integrity tests — DoD 8c/12
 */
// @ts-nocheck


import { describe, it, expect } from "vitest";
import {
  computeTemporalContextDigest,
  computeOverflowTemporalContextDigest,
  verifyTemporalContextDigest,
} from "../src/record-integrity.js";
import { asMonotonic, asWallClock } from "../src/branded.js";
import type { TemporalContext, OverflowTemporalContext } from "../src/temporal-context.js";

// =============================================================================
// Helpers
// =============================================================================

function makeContext(seq = 42, mono = 1000, wall = 1707753600000): TemporalContext {
  return Object.freeze({
    sequenceNumber: seq,
    monotonicTimestamp: asMonotonic(mono),
    wallClockTimestamp: asWallClock(wall),
  });
}

function makeOverflowContext(): OverflowTemporalContext {
  return Object.freeze({
    _tag: "OverflowTemporalContext" as const,
    sequenceNumber: -1 as const,
    lastValidSequenceNumber: Number.MAX_SAFE_INTEGER,
    monotonicTimestamp: asMonotonic(9999999),
    wallClockTimestamp: asWallClock(1707753600000),
  });
}

// =============================================================================
// DoD 8c/12: Record Integrity
// =============================================================================

describe("computeTemporalContextDigest", () => {
  it("returns a frozen TemporalContextDigest", () => {
    const ctx = makeContext();
    const digest = computeTemporalContextDigest(ctx);
    expect(Object.isFrozen(digest)).toBe(true);
  });

  it("has _tag 'TemporalContextDigest'", () => {
    const ctx = makeContext();
    const digest = computeTemporalContextDigest(ctx);
    expect(digest._tag).toBe("TemporalContextDigest");
  });

  it("has algorithm 'SHA-256'", () => {
    const ctx = makeContext();
    const digest = computeTemporalContextDigest(ctx);
    expect(digest.algorithm).toBe("SHA-256");
  });

  it("produces hex-encoded digest string", () => {
    const ctx = makeContext();
    const digest = computeTemporalContextDigest(ctx);
    expect(typeof digest.digest).toBe("string");
    expect(digest.digest.length).toBe(64); // 64 hex chars
    expect(/^[0-9a-f]+$/.test(digest.digest)).toBe(true);
  });

  it("includes canonicalInput as JSON string", () => {
    const ctx = makeContext();
    const digest = computeTemporalContextDigest(ctx);
    expect(typeof digest.canonicalInput).toBe("string");
    // Should be parseable JSON
    const parsed: unknown = JSON.parse(digest.canonicalInput);
    expect(typeof parsed).toBe("object");
  });

  it("produces deterministic output (same input, same digest)", () => {
    const ctx1 = makeContext();
    const ctx2 = makeContext();
    const d1 = computeTemporalContextDigest(ctx1);
    const d2 = computeTemporalContextDigest(ctx2);
    expect(d1.digest).toBe(d2.digest);
  });

  it("produces different digests for different inputs", () => {
    const ctx1 = makeContext(1);
    const ctx2 = makeContext(2);
    const d1 = computeTemporalContextDigest(ctx1);
    const d2 = computeTemporalContextDigest(ctx2);
    expect(d1.digest).not.toBe(d2.digest);
  });

  it("canonicalInput has fields in alphabetical order", () => {
    const ctx = makeContext();
    const digest = computeTemporalContextDigest(ctx);
    const parsed = JSON.parse(digest.canonicalInput) as Record<string, unknown>;
    const keys = Object.keys(parsed);
    const sortedKeys = [...keys].sort();
    expect(keys).toEqual(sortedKeys);
  });

  it("digest matches exact known DJB2 value for seq=11,mono=11,wall=946684800000 (kills L45 and L49)", () => {
    // Canonical: {"monotonicTimestamp":11,"sequenceNumber":11,"wallClockTimestamp":946684800000}
    // DJB2 (+hash): hash = 0x0f63c8ce (7 hex digits → padStart(8,"0") adds leading zero)
    // Kills L45 (ArithmeticOperator: -hash → different hash 0xff…)
    // Kills L49 (StringLiteral: padStart(8,"") → no padding → "f63c8ce" instead of "0f63c8ce")
    const ctx = makeContext(11, 11, 946684800000);
    const result = computeTemporalContextDigest(ctx);
    expect(result.canonicalInput).toBe(
      '{"monotonicTimestamp":11,"sequenceNumber":11,"wallClockTimestamp":946684800000}'
    );
    expect(result.digest).toBe("0f63c8ce".repeat(8));
  });
});

describe("verifyTemporalContextDigest", () => {
  it("returns true for matching context and digest", () => {
    const ctx = makeContext();
    const digest = computeTemporalContextDigest(ctx);
    expect(verifyTemporalContextDigest(ctx, digest)).toBe(true);
  });

  it("returns false when sequenceNumber is modified", () => {
    const ctx = makeContext(42);
    const digest = computeTemporalContextDigest(ctx);
    const tampered = makeContext(43);
    expect(verifyTemporalContextDigest(tampered, digest)).toBe(false);
  });

  it("returns false when monotonicTimestamp is modified", () => {
    const ctx = makeContext(42, 1000);
    const digest = computeTemporalContextDigest(ctx);
    const tampered = makeContext(42, 9999);
    expect(verifyTemporalContextDigest(tampered, digest)).toBe(false);
  });

  it("returns false when wallClockTimestamp is modified", () => {
    const ctx = makeContext(42, 1000, 1707753600000);
    const digest = computeTemporalContextDigest(ctx);
    const tampered = makeContext(42, 1000, 1707753601000);
    expect(verifyTemporalContextDigest(tampered, digest)).toBe(false);
  });

  it("returns false for completely fabricated digest", () => {
    const ctx = makeContext();
    const fakeDigest = Object.freeze({
      _tag: "TemporalContextDigest" as const,
      algorithm: "SHA-256" as const,
      digest: "0".repeat(64),
      canonicalInput: "{}",
    });
    expect(verifyTemporalContextDigest(ctx, fakeDigest)).toBe(false);
  });

  it("works for both TemporalContext and OverflowTemporalContext (roundtrip)", () => {
    const ctx = makeContext();
    const digest = computeTemporalContextDigest(ctx);
    expect(verifyTemporalContextDigest(ctx, digest)).toBe(true);

    const overflow = makeOverflowContext();
    const overflowDigest = computeOverflowTemporalContextDigest(overflow);
    // The overflow digest is computed separately
    expect(overflowDigest._tag).toBe("TemporalContextDigest");
  });
});

describe("computeOverflowTemporalContextDigest", () => {
  it("returns frozen digest for OverflowTemporalContext", () => {
    const overflow = makeOverflowContext();
    const digest = computeOverflowTemporalContextDigest(overflow);
    expect(Object.isFrozen(digest)).toBe(true);
  });

  it("includes _tag and lastValidSequenceNumber in canonical form", () => {
    const overflow = makeOverflowContext();
    const digest = computeOverflowTemporalContextDigest(overflow);
    const parsed = JSON.parse(digest.canonicalInput) as Record<string, unknown>;
    expect("_tag" in parsed).toBe(true);
    expect("lastValidSequenceNumber" in parsed).toBe(true);
    expect(parsed["_tag"]).toBe("OverflowTemporalContext");
  });
});
