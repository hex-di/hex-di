/**
 * Signature validation tests — DoD 8a/11
 */

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

const BASE_MONOTONIC = asMonotonic(1000);

function makeUnsigned(): SignableTemporalContext {
  return Object.freeze({
    sequenceNumber: 1,
    monotonicTimestamp: BASE_MONOTONIC,
    wallClockTimestamp: asWallClock(Date.now()),
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

/** Creates a signed context where signedAt = wallClockTimestamp + offsetMs. */
function makeSignedWithOffset(offsetMs: number, meaning = "execution"): SignableTemporalContext {
  const wallMs = Date.now();
  return Object.freeze({
    sequenceNumber: 1,
    monotonicTimestamp: BASE_MONOTONIC,
    wallClockTimestamp: asWallClock(wallMs),
    signature: Object.freeze({
      signerName: "Alice Smith",
      signerId: "user-123",
      signedAt: new Date(wallMs + offsetMs).toISOString(),
      meaning,
      method: "password",
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

  // --- DoD 8a test 6: ISO 8601 validation ---

  it("returns Err with field 'signedAt' when signedAt is not valid ISO 8601", () => {
    const ctx = makeSigned({ signedAt: "not-a-date" });
    const result = validateSignableTemporalContext(ctx);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("signedAt");
    }
  });

  // --- DoD 8a test 9: frozen signature object ---

  it("returns Err with field 'signature' when signature object is not frozen", () => {
    const wallMs = Date.now();
    const ctx: SignableTemporalContext = Object.freeze({
      sequenceNumber: 1,
      monotonicTimestamp: BASE_MONOTONIC,
      wallClockTimestamp: asWallClock(wallMs),
      signature: { // intentionally NOT frozen
        signerName: "Alice Smith",
        signerId: "user-123",
        signedAt: new Date(wallMs).toISOString(),
        meaning: "execution",
        method: "password",
      },
    });
    const result = validateSignableTemporalContext(ctx);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("signature");
    }
  });
});

// =============================================================================
// DoD 8a tests 13–20: Temporal window validation (CLK-SIG-001)
// Thresholds: retrospective 24h, future 5min for execution, 72h for review/approval.
// Tests use hardcoded threshold values per CLK-SIG-001 (non-configurable at library level).
// =============================================================================

const RETRO_MS = 24 * 60 * 60 * 1000;
const EXEC_FUTURE_MS = 5 * 60 * 1000;
const REVIEW_FUTURE_MS = 72 * 60 * 60 * 1000;

describe("validateSignableTemporalContext — temporal window (CLK-SIG-001)", () => {
  it("test 13: returns Err when signedAt is more than 24h before wallClockTimestamp (retrospective threshold)", () => {
    const ctx = makeSignedWithOffset(-(RETRO_MS + 1));
    const result = validateSignableTemporalContext(ctx);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("signedAt");
    }
  });

  it("test 14: returns Ok when signedAt is exactly 24h before wallClockTimestamp (boundary)", () => {
    const ctx = makeSignedWithOffset(-RETRO_MS);
    const result = validateSignableTemporalContext(ctx);
    expect(result.isOk()).toBe(true);
  });

  it("test 15: returns Err when signedAt is more than 5min after wallClockTimestamp for meaning 'execution'", () => {
    const ctx = makeSignedWithOffset(EXEC_FUTURE_MS + 1, "execution");
    const result = validateSignableTemporalContext(ctx);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("signedAt");
    }
  });

  it("test 16: returns Ok when signedAt is exactly 5min after wallClockTimestamp for meaning 'execution' (boundary)", () => {
    const ctx = makeSignedWithOffset(EXEC_FUTURE_MS, "execution");
    const result = validateSignableTemporalContext(ctx);
    expect(result.isOk()).toBe(true);
  });

  it("test 17: returns Ok when signedAt is 30min after wallClockTimestamp for meaning 'review'", () => {
    const ctx = makeSignedWithOffset(30 * 60 * 1000, "review");
    const result = validateSignableTemporalContext(ctx);
    expect(result.isOk()).toBe(true);
  });

  it("test 18: returns Ok when signedAt is 30min after wallClockTimestamp for meaning 'approval'", () => {
    const ctx = makeSignedWithOffset(30 * 60 * 1000, "approval");
    const result = validateSignableTemporalContext(ctx);
    expect(result.isOk()).toBe(true);
  });

  it("test 19: returns Err when signedAt is more than 72h after wallClockTimestamp for meaning 'review'", () => {
    const ctx = makeSignedWithOffset(REVIEW_FUTURE_MS + 1, "review");
    const result = validateSignableTemporalContext(ctx);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("signedAt");
    }
  });

  it("test 20: returns Ok when signedAt is exactly 72h after wallClockTimestamp for meaning 'review' (boundary)", () => {
    const ctx = makeSignedWithOffset(REVIEW_FUTURE_MS, "review");
    const result = validateSignableTemporalContext(ctx);
    expect(result.isOk()).toBe(true);
  });
});

// =============================================================================
// Mutation score improvement — message content assertions and frozen-sig non-string
// =============================================================================

describe("validateSignableTemporalContext — error message content (kills StringLiteral mutants)", () => {
  it("ISO 8601 error message is non-empty and contains '21 CFR 11.50' (kills L76 StringLiteral)", () => {
    const ctx = makeSigned({ signedAt: "not-a-date" });
    const result = validateSignableTemporalContext(ctx);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).not.toBe("");
      expect(result.error.message).toContain("21 CFR 11.50");
    }
  });

  it("frozen-signature error message is non-empty and contains '21 CFR 11.50' (kills L86 StringLiteral)", () => {
    const wallMs = Date.now();
    const ctx: SignableTemporalContext = Object.freeze({
      sequenceNumber: 1,
      monotonicTimestamp: BASE_MONOTONIC,
      wallClockTimestamp: asWallClock(wallMs),
      signature: { // intentionally NOT frozen
        signerName: "Alice Smith",
        signerId: "user-123",
        signedAt: new Date(wallMs).toISOString(),
        meaning: "execution",
        method: "password",
      },
    });
    const result = validateSignableTemporalContext(ctx);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).not.toBe("");
      expect(result.error.message).toContain("21 CFR 11.50");
    }
  });

  it("temporal-too-early error message contains '24 hours' (kills L98 StringLiteral)", () => {
    const ctx = makeSignedWithOffset(-(RETRO_MS + 1));
    const result = validateSignableTemporalContext(ctx);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).not.toBe("");
      expect(result.error.message).toContain("24 hours");
    }
  });

  it("temporal-too-late error message contains the meaning value (kills L112 StringLiteral)", () => {
    const ctx = makeSignedWithOffset(EXEC_FUTURE_MS + 1, "execution");
    const result = validateSignableTemporalContext(ctx);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).not.toBe("");
      expect(result.error.message).toContain("execution");
    }
  });

  it("returns Err with field 'signerName' when signerName is non-string in frozen signature (kills L60 CE=false)", () => {
    // JSON.parse returns `any`, bypassing type constraints for runtime type safety testing
    const wall = Date.now();
    const rawSig = JSON.parse(JSON.stringify({
      signerName: 42,
      signerId: "user-123",
      signedAt: new Date(wall).toISOString(),
      meaning: "execution",
      method: "password",
    }));
    Object.freeze(rawSig);
    const ctx: SignableTemporalContext = Object.freeze({
      sequenceNumber: 1,
      monotonicTimestamp: BASE_MONOTONIC,
      wallClockTimestamp: asWallClock(wall),
      signature: rawSig,
    });
    const result = validateSignableTemporalContext(ctx);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("signerName");
    }
  });
});
