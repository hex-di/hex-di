/**
 * Retention utilities tests — DoD 36
 */
// @ts-nocheck


import { describe, it, expect } from "vitest";
import {
  validateRetentionMetadata,
  calculateRetentionExpiryDate,
  createRetentionValidationError,
} from "../src/retention.js";
import type { RetentionMetadata } from "../src/retention.js";

// =============================================================================
// DoD 36: Retention Utilities
// =============================================================================

function validMetadata(overrides: Partial<RetentionMetadata> = {}): RetentionMetadata {
  return Object.freeze({
    retentionPeriodDays: 365,
    retentionBasis: "EU GMP Annex 11",
    retentionStartDate: "2024-01-01",
    retentionExpiryDate: "2025-01-01",
    recordType: "audit-trail",
    ...overrides,
  });
}

describe("validateRetentionMetadata()", () => {
  it("returns Ok for valid RetentionMetadata with all fields correct", () => {
    const result = validateRetentionMetadata(validMetadata());
    expect(result.isOk()).toBe(true);
  });

  it("returns Err when retentionPeriodDays is zero", () => {
    const result = validateRetentionMetadata(validMetadata({ retentionPeriodDays: 0 }));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("RetentionValidationError");
      expect(result.error.field).toBe("retentionPeriodDays");
    }
  });

  it("returns Err when retentionPeriodDays is negative", () => {
    const result = validateRetentionMetadata(validMetadata({ retentionPeriodDays: -1 }));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("retentionPeriodDays");
    }
  });

  it("returns Ok for fractional retentionPeriodDays (implementation allows positive finite numbers)", () => {
    // Note: implementation uses Number.isFinite(x) && x > 0, so fractional values are allowed
    const result = validateRetentionMetadata(validMetadata({ retentionPeriodDays: 30.5 }));
    expect(result.isOk()).toBe(true);
  });

  it("returns Err when retentionBasis is empty string", () => {
    const result = validateRetentionMetadata(validMetadata({ retentionBasis: "" }));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("retentionBasis");
    }
  });

  it("returns Err when retentionStartDate is not valid ISO 8601", () => {
    const result = validateRetentionMetadata(
      validMetadata({ retentionStartDate: "not-a-date" })
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("retentionStartDate");
    }
  });

  it("returns Err when retentionExpiryDate is not valid ISO 8601", () => {
    const result = validateRetentionMetadata(
      validMetadata({ retentionExpiryDate: "invalid" })
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("retentionExpiryDate");
    }
  });

  it("returns Err when recordType is empty string", () => {
    const result = validateRetentionMetadata(validMetadata({ recordType: "" }));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("recordType");
    }
  });

  it("Ok result returns the same metadata object (same reference)", () => {
    const metadata = validMetadata();
    const result = validateRetentionMetadata(metadata);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(metadata);
    }
  });

  it("returns Err when retentionPeriodDays is NaN", () => {
    const result = validateRetentionMetadata(validMetadata({ retentionPeriodDays: NaN }));
    expect(result.isErr()).toBe(true);
  });

  it("returns Err when retentionPeriodDays is Infinity", () => {
    const result = validateRetentionMetadata(
      validMetadata({ retentionPeriodDays: Infinity })
    );
    expect(result.isErr()).toBe(true);
  });

  it("validation rules are applied in order (first failure is reported)", () => {
    // Both retentionPeriodDays and retentionBasis are invalid
    const result = validateRetentionMetadata(
      validMetadata({ retentionPeriodDays: -1, retentionBasis: "" })
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // First validation is retentionPeriodDays
      expect(result.error.field).toBe("retentionPeriodDays");
    }
  });
});

describe("createRetentionValidationError()", () => {
  it("RetentionValidationError has _tag 'RetentionValidationError'", () => {
    const error = createRetentionValidationError("testField", "test message");
    expect(error._tag).toBe("RetentionValidationError");
  });

  it("RetentionValidationError is frozen at construction", () => {
    const error = createRetentionValidationError("field", "message");
    expect(Object.isFrozen(error)).toBe(true);
  });

  it("RetentionValidationError includes field name", () => {
    const error = createRetentionValidationError("retentionPeriodDays", "must be positive");
    expect(error.field).toBe("retentionPeriodDays");
  });

  it("RetentionValidationError includes descriptive message", () => {
    const error = createRetentionValidationError("retentionBasis", "must not be empty");
    expect(error.message).toBe("must not be empty");
  });
});

// =============================================================================
// Mutation score improvement
// =============================================================================

describe("validateRetentionMetadata() — error message content", () => {
  it("retentionPeriodDays error message contains 'positive finite' (kills StringLiteral)", () => {
    const result = validateRetentionMetadata(validMetadata({ retentionPeriodDays: 0 }));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain("positive finite");
    }
  });

  it("retentionBasis error message contains 'non-empty string' (kills StringLiteral)", () => {
    const result = validateRetentionMetadata(validMetadata({ retentionBasis: "" }));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain("non-empty string");
    }
  });

  it("retentionStartDate error message contains 'ISO 8601' (kills StringLiteral)", () => {
    const result = validateRetentionMetadata(validMetadata({ retentionStartDate: "not-a-date" }));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain("ISO 8601");
    }
  });

  it("retentionExpiryDate error message contains 'ISO 8601' (kills StringLiteral)", () => {
    const result = validateRetentionMetadata(validMetadata({ retentionExpiryDate: "bad" }));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain("ISO 8601");
    }
  });

  it("recordType error message contains 'non-empty string' (kills StringLiteral)", () => {
    const result = validateRetentionMetadata(validMetadata({ recordType: "" }));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain("non-empty string");
    }
  });
});

describe("validateRetentionMetadata() — isValidISODate mutations", () => {
  it("rejects slash-format date '2024/01/01' (kills LogicalOperator &&→|| mutant)", () => {
    // Original &&: regex fails for '2024/01/01' → isValidISODate = false → err
    // Mutant ||: Date.parse('2024/01/01') is valid → isValidISODate = true → ok
    const result = validateRetentionMetadata(
      validMetadata({ retentionStartDate: "2024/01/01" })
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("retentionStartDate");
    }
  });

  it("rejects date with leading space ' 2024-01-01' (kills Regex ^ anchor mutant)", () => {
    // Original /^\d{4}-/: space prefix fails ^ anchor → err
    // Mutant /\d{4}-/ (no ^): finds digits after space → ok
    const result = validateRetentionMetadata(
      validMetadata({ retentionStartDate: " 2024-01-01" })
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("retentionStartDate");
    }
  });

  it("rejects single-digit day '2024-01-1' (kills Regex \\d{2}→\\d mutant)", () => {
    // Original /\d{2}/ for day: '2024-01-1' fails (1 digit) → Date.parse is valid → but regex fails → err
    // Mutant /\d/: single digit matches → ok
    const result = validateRetentionMetadata(
      validMetadata({ retentionStartDate: "2024-01-1" })
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("retentionStartDate");
    }
  });

  it("rejects non-string retentionBasis (kills ConditionalExpression mutant)", () => {
    // ConditionalExpression mutant replaces typeof check with false
    // Passing number: typeof 42 !== "string" = true (original), false || 42..length fails (mutant)
    const metadata: RetentionMetadata = JSON.parse(
      '{"retentionPeriodDays":365,"retentionBasis":42,"retentionStartDate":"2024-01-01","retentionExpiryDate":"2025-01-01","recordType":"audit"}'
    );
    const result = validateRetentionMetadata(metadata);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("retentionBasis");
    }
  });

  it("rejects non-string recordType (kills ConditionalExpression mutant)", () => {
    const metadata: RetentionMetadata = JSON.parse(
      '{"retentionPeriodDays":365,"retentionBasis":"EU GMP","retentionStartDate":"2024-01-01","retentionExpiryDate":"2025-01-01","recordType":99}'
    );
    const result = validateRetentionMetadata(metadata);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("recordType");
    }
  });
});

describe("calculateRetentionExpiryDate()", () => {
  it("returns ISO 8601 date string for startDate + retentionPeriodDays", () => {
    const result = calculateRetentionExpiryDate("2024-01-01", 365);
    expect(result).toBe("2024-12-31");
  });

  it("handles month-boundary rollover correctly (Jan 31 + 30 days)", () => {
    const result = calculateRetentionExpiryDate("2024-01-31", 30);
    expect(result).toBe("2024-03-01");
  });

  it("handles year-boundary rollover correctly (Dec 15 + 30 days)", () => {
    const result = calculateRetentionExpiryDate("2024-12-15", 30);
    expect(result).toBe("2025-01-14");
  });

  it("handles leap year correctly (Feb 28 + 1 day in leap year 2024)", () => {
    const result = calculateRetentionExpiryDate("2024-02-28", 1);
    expect(result).toBe("2024-02-29");
  });

  it("handles leap year correctly (Feb 29 + 1 day in leap year)", () => {
    const result = calculateRetentionExpiryDate("2024-02-29", 1);
    expect(result).toBe("2024-03-01");
  });

  it("handles non-leap year correctly (Feb 28 + 1 day in 2023)", () => {
    const result = calculateRetentionExpiryDate("2023-02-28", 1);
    expect(result).toBe("2023-03-01");
  });

  it("returns a string in YYYY-MM-DD format", () => {
    const result = calculateRetentionExpiryDate("2024-06-01", 90);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("handles single-day retention (1 day)", () => {
    const result = calculateRetentionExpiryDate("2024-03-15", 1);
    expect(result).toBe("2024-03-16");
  });

  it("handles large retention period (3650 days = 10 years approximately)", () => {
    const result = calculateRetentionExpiryDate("2024-01-01", 3650);
    // 3650 days ≈ 10 years, expected: 2034-01-01 (approximately)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const year = parseInt(result.slice(0, 4), 10);
    expect(year).toBeGreaterThan(2030);
  });
});
