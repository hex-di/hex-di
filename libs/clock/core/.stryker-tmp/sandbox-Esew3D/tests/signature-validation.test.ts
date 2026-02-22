/**
 * Signature validation tests — DoD 8a/11
 */
// @ts-nocheck


import { describe, it, expect } from "vitest";
import {
  validateSignableTemporalContext,
  createSignatureValidationError,
} from "../src/signature-validation.js";
import { asMonotonic, asWallClock } from "../src/branded.js";
import type { SignableTemporalContext } from "../src/temporal-context.js";

// =============================================================================
// Helpers
// =============================================================================

const BASE_WALL_CLOCK = asWallClock(Date.now());
const BASE_MONOTONIC = asMonotonic(1000);

function makeUnsigned(): SignableTemporalContext {
  return Object.freeze({
    sequenceNumber: 1,
    monotonicTimestamp: BASE_MONOTONIC,
    wallClockTimestamp: BASE_WALL_CLOCK,
  });
}

function makeSigned(overrides: Partial<{
  signerName: string;
  signerId: string;
  signedAt: string;
  meaning: string;
  method: string;
}> = {}): SignableTemporalContext {
  const wallMs = Date.now();
  return Object.freeze({
    sequenceNumber: 1,
    monotonicTimestamp: BASE_MONOTONIC,
    wallClockTimestamp: asWallClock(wallMs),
    signature: Object.freeze({
      signerName: overrides.signerName ?? "Alice Smith",
      signerId: overrides.signerId ?? "user-123",
      signedAt: overrides.signedAt ?? new Date(wallMs).toISOString(),
      meaning: overrides.meaning ?? "execution",
      method: overrides.method ?? "password",
    }),
  });
}

// =============================================================================
// DoD 8a/11: Signature Validation
// =============================================================================

describe("validateSignableTemporalContext", () => {
  it("returns Ok for unsigned TemporalContext (signature undefined)", () => {
    const ctx = makeUnsigned();
    const result = validateSignableTemporalContext(ctx);
    expect(result.isOk()).toBe(true);
  });

  it("returns Ok for valid fully-populated signed context", () => {
    const ctx = makeSigned();
    const result = validateSignableTemporalContext(ctx);
    expect(result.isOk()).toBe(true);
  });

  it("returns Err with field 'signerName' when signerName is empty string", () => {
    const ctx = makeSigned({ signerName: "" });
    const result = validateSignableTemporalContext(ctx);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("signerName");
    }
  });

  it("returns Err with field 'signerId' when signerId is empty string", () => {
    const ctx = makeSigned({ signerId: "" });
    const result = validateSignableTemporalContext(ctx);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("signerId");
    }
  });

  it("returns Err with field 'signedAt' when signedAt is empty string", () => {
    const ctx = makeSigned({ signedAt: "" });
    const result = validateSignableTemporalContext(ctx);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("signedAt");
    }
  });

  it("returns Err with field 'meaning' when meaning is empty string", () => {
    const ctx = makeSigned({ meaning: "" });
    const result = validateSignableTemporalContext(ctx);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("meaning");
    }
  });

  it("returns Err with field 'method' when method is empty string", () => {
    const ctx = makeSigned({ method: "" });
    const result = validateSignableTemporalContext(ctx);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("method");
    }
  });

  it("SignatureValidationError has correct _tag 'SignatureValidationError'", () => {
    const error = createSignatureValidationError("field", "message");
    expect(error._tag).toBe("SignatureValidationError");
  });

  it("SignatureValidationError is frozen at construction", () => {
    const error = createSignatureValidationError("field", "message");
    expect(Object.isFrozen(error)).toBe(true);
  });

  it("validateSignableTemporalContext() returns same reference on Ok (not a copy)", () => {
    const ctx = makeUnsigned();
    const result = validateSignableTemporalContext(ctx);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(ctx);
    }
  });

  it("error message contains '21 CFR 11.50' (kills StringLiteral mutant)", () => {
    const ctx = makeSigned({ signerName: "" });
    const result = validateSignableTemporalContext(ctx);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain("21 CFR 11.50");
    }
  });

  it("error message contains 'non-empty string' (kills StringLiteral mutant)", () => {
    const ctx = makeSigned({ signerId: "" });
    const result = validateSignableTemporalContext(ctx);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain("non-empty string");
    }
  });

  it("returns Err when signerName is not a string (kills ConditionalExpression mutant)", () => {
    // ConditionalExpression mutant replaces condition with false → never validates
    // Non-string value bypasses the 'value.length === 0' fallback
    const ctx: SignableTemporalContext = JSON.parse(
      JSON.stringify({
        sequenceNumber: 1,
        monotonicTimestamp: 1000,
        wallClockTimestamp: Date.now(),
        signature: {
          signerName: 42,
          signerId: "x",
          signedAt: "2020-01-01T00:00:00Z",
          meaning: "y",
          method: "z",
        },
      })
    );
    const result = validateSignableTemporalContext(ctx);
    expect(result.isErr()).toBe(true);
  });
});
