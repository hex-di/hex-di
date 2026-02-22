/**
 * Validated branding utilities tests — DoD 37
 */

import { describe, it, expect } from "vitest";
import {
  asMonotonicValidated,
  asWallClockValidated,
  asHighResValidated,
  createBrandingValidationError,
} from "../src/branded.js";

// Year 2000 Unix timestamp (Y2K) — matches the implementation's Y2K_MS constant
const Y2K_MS = 946684800000;

// =============================================================================
// DoD 37: Validated Branding Utilities
// =============================================================================

describe("asMonotonicValidated()", () => {
  it("asMonotonicValidated(100) returns Ok(MonotonicTimestamp) for valid monotonic value", () => {
    const result = asMonotonicValidated(100);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(100);
    }
  });

  it("asMonotonicValidated(0) returns Ok (boundary: ms >= 0)", () => {
    const result = asMonotonicValidated(0);
    expect(result.isOk()).toBe(true);
  });

  it("asMonotonicValidated(-1) returns Err(BrandingValidationError) (negative rejected)", () => {
    const result = asMonotonicValidated(-1);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("BrandingValidationError");
      expect(result.error.expectedDomain).toBe("monotonic");
    }
  });

  it("asMonotonicValidated(1e12) returns Err(BrandingValidationError) (ms < 1e12 boundary violated)", () => {
    const result = asMonotonicValidated(1e12);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("BrandingValidationError");
      expect(result.error.expectedDomain).toBe("monotonic");
    }
  });

  it("asMonotonicValidated(999999999999) returns Ok (just under 1e12 boundary)", () => {
    const result = asMonotonicValidated(999999999999);
    expect(result.isOk()).toBe(true);
  });

  it("asMonotonicValidated(1e12 + 1) returns Err (over boundary)", () => {
    const result = asMonotonicValidated(1e12 + 1);
    expect(result.isErr()).toBe(true);
  });

  it("BrandingValidationError includes value field with the rejected input number", () => {
    const result = asMonotonicValidated(-42);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.value).toBe(-42);
    }
  });

  it("BrandingValidationError includes descriptive message string", () => {
    const result = asMonotonicValidated(-1);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(typeof result.error.message).toBe("string");
      expect(result.error.message.length).toBeGreaterThan(0);
    }
  });

  it("Ok result from asMonotonicValidated is the same numeric value as input (identity)", () => {
    const value = 12345;
    const result = asMonotonicValidated(value);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(value);
    }
  });
});

describe("asWallClockValidated()", () => {
  it("asWallClockValidated(Date.now()) returns Ok(WallClockTimestamp) for current time", () => {
    const result = asWallClockValidated(Date.now());
    expect(result.isOk()).toBe(true);
  });

  it("asWallClockValidated(946684800000) returns Ok (boundary: exactly Y2K epoch)", () => {
    const result = asWallClockValidated(Y2K_MS);
    expect(result.isOk()).toBe(true);
  });

  it("asWallClockValidated(946684799999) returns Err(BrandingValidationError) (1ms before Y2K boundary)", () => {
    const result = asWallClockValidated(Y2K_MS - 1);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("BrandingValidationError");
      expect(result.error.expectedDomain).toBe("wallClock");
    }
  });

  it("asWallClockValidated(0) returns Err(BrandingValidationError) (Unix epoch predates Y2K)", () => {
    const result = asWallClockValidated(0);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.expectedDomain).toBe("wallClock");
    }
  });

  it("asWallClockValidated(Date.now() + 90000000) returns Err(BrandingValidationError) (>1 day in future)", () => {
    // Use 90000000ms (~25 hours) for a robust margin above the 1-day threshold
    const result = asWallClockValidated(Date.now() + 90000000);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.expectedDomain).toBe("wallClock");
    }
  });

  it("asWallClockValidated(Date.now() + 86400000) returns Ok (boundary: exactly 1 day in future)", () => {
    // Date.now() + ONE_DAY_MS == maxAllowed, and ms <= maxAllowed passes
    const result = asWallClockValidated(Date.now() + 86400000);
    expect(result.isOk()).toBe(true);
  });

  it("BrandingValidationError includes value field with the rejected input", () => {
    const result = asWallClockValidated(0);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.value).toBe(0);
    }
  });

  it("Ok result from asWallClockValidated is the same numeric value as input (identity)", () => {
    const value = Date.now();
    const result = asWallClockValidated(value);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(value);
    }
  });
});

describe("asHighResValidated()", () => {
  it("asHighResValidated(Date.now()) returns Ok(HighResTimestamp) for current time", () => {
    const result = asHighResValidated(Date.now());
    expect(result.isOk()).toBe(true);
  });

  it("asHighResValidated applies same validation rules as asWallClockValidated (Y2K floor, 1-day-future ceiling)", () => {
    // Y2K floor
    const errBeforeY2K = asHighResValidated(Y2K_MS - 1);
    expect(errBeforeY2K.isErr()).toBe(true);
    if (errBeforeY2K.isErr()) {
      expect(errBeforeY2K.error.expectedDomain).toBe("highRes");
    }

    // Y2K boundary — ok
    const okAtY2K = asHighResValidated(Y2K_MS);
    expect(okAtY2K.isOk()).toBe(true);

    // 1 day in future ceiling (use 90000000ms for robust margin)
    const errFuture = asHighResValidated(Date.now() + 90000000);
    expect(errFuture.isErr()).toBe(true);
  });

  it("asHighResValidated(0) returns Err(BrandingValidationError) (same rejection as wallClock)", () => {
    const result = asHighResValidated(0);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("BrandingValidationError");
      expect(result.error.expectedDomain).toBe("highRes");
    }
  });

  it("Ok result from asHighResValidated is the same numeric value as input (identity)", () => {
    const value = Date.now();
    const result = asHighResValidated(value);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(value);
    }
  });
});

describe("createBrandingValidationError()", () => {
  it("createBrandingValidationError() returns a frozen BrandingValidationError", () => {
    const error = createBrandingValidationError("monotonic", -1, "must be >= 0");
    expect(Object.isFrozen(error)).toBe(true);
  });

  it("BrandingValidationError has _tag 'BrandingValidationError'", () => {
    const error = createBrandingValidationError("wallClock", 0, "test message");
    expect(error._tag).toBe("BrandingValidationError");
  });

  it("BrandingValidationError includes expectedDomain matching the called function ('monotonic', 'wallClock', 'highRes')", () => {
    const mono = createBrandingValidationError("monotonic", -1, "msg");
    expect(mono.expectedDomain).toBe("monotonic");

    const wall = createBrandingValidationError("wallClock", 0, "msg");
    expect(wall.expectedDomain).toBe("wallClock");

    const highRes = createBrandingValidationError("highRes", 0, "msg");
    expect(highRes.expectedDomain).toBe("highRes");
  });

  it("BrandingValidationError includes value field with the rejected input number", () => {
    const error = createBrandingValidationError("monotonic", -42, "negative rejected");
    expect(error.value).toBe(-42);
  });

  it("BrandingValidationError includes descriptive message string", () => {
    const error = createBrandingValidationError("monotonic", -1, "must be >= 0");
    expect(error.message).toBe("must be >= 0");
  });
});

describe("Validated branding — never throw", () => {
  it("asMonotonicValidated never throws for NaN (returns Ok due to comparison semantics)", () => {
    // NaN comparisons: NaN < 0 = false, NaN >= 1e12 = false → ok(NaN)
    // This documents actual behavior
    expect(() => asMonotonicValidated(NaN)).not.toThrow();
  });

  it("asMonotonicValidated never throws for Infinity (returns Err as Infinity >= 1e12)", () => {
    expect(() => asMonotonicValidated(Infinity)).not.toThrow();
    const result = asMonotonicValidated(Infinity);
    expect(result.isErr()).toBe(true);
  });

  it("asMonotonicValidated never throws for -Infinity (returns Err as -Infinity < 0)", () => {
    expect(() => asMonotonicValidated(-Infinity)).not.toThrow();
    const result = asMonotonicValidated(-Infinity);
    expect(result.isErr()).toBe(true);
  });

  it("asWallClockValidated never throws for negative values", () => {
    expect(() => asWallClockValidated(-1)).not.toThrow();
  });

  it("asHighResValidated never throws for any numeric input", () => {
    expect(() => asHighResValidated(0)).not.toThrow();
    expect(() => asHighResValidated(-Infinity)).not.toThrow();
  });
});
