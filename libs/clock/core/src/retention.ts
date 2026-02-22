/**
 * Retention metadata management for GxP audit records.
 *
 * @packageDocumentation
 */

import type { Result } from "@hex-di/result";
import { ok, err } from "@hex-di/result";

/** Metadata describing the retention requirements for an audit record. */
export interface RetentionMetadata {
  readonly retentionPeriodDays: number;
  readonly retentionBasis: string;
  readonly retentionStartDate: string;
  readonly retentionExpiryDate: string;
  readonly recordType: string;
}

/** Error returned when retention metadata validation fails. */
export interface RetentionValidationError {
  readonly _tag: "RetentionValidationError";
  readonly field: string;
  readonly message: string;
}

/** Factory for RetentionValidationError — frozen per GxP error immutability. */
export function createRetentionValidationError(
  field: string,
  message: string
): RetentionValidationError {
  return Object.freeze({
    _tag: "RetentionValidationError" as const,
    field,
    message,
  });
}

/** ISO 8601 date string pattern (basic validation). */
function isValidISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(value) && !isNaN(Date.parse(value));
}

/**
 * Validates retention metadata for GxP compliance.
 */
export function validateRetentionMetadata(
  metadata: RetentionMetadata
): Result<RetentionMetadata, RetentionValidationError> {
  if (!Number.isFinite(metadata.retentionPeriodDays) || metadata.retentionPeriodDays <= 0) {
    return err(
      createRetentionValidationError(
        "retentionPeriodDays",
        "retentionPeriodDays must be a positive finite number"
      )
    );
  }

  if (typeof metadata.retentionBasis !== "string" || metadata.retentionBasis.length === 0) {
    return err(
      createRetentionValidationError(
        "retentionBasis",
        "retentionBasis must be a non-empty string"
      )
    );
  }

  if (!isValidISODate(metadata.retentionStartDate)) {
    return err(
      createRetentionValidationError(
        "retentionStartDate",
        "retentionStartDate must be a valid ISO 8601 date string"
      )
    );
  }

  if (!isValidISODate(metadata.retentionExpiryDate)) {
    return err(
      createRetentionValidationError(
        "retentionExpiryDate",
        "retentionExpiryDate must be a valid ISO 8601 date string"
      )
    );
  }

  if (typeof metadata.recordType !== "string" || metadata.recordType.length === 0) {
    return err(
      createRetentionValidationError("recordType", "recordType must be a non-empty string")
    );
  }

  return ok(metadata);
}

/**
 * Calculates the retention expiry date from a start date and retention period.
 * Returns an ISO 8601 date string.
 */
export function calculateRetentionExpiryDate(
  startDate: string,
  retentionPeriodDays: number
): string {
  const start = new Date(startDate);
  start.setDate(start.getDate() + retentionPeriodDays);
  return start.toISOString().slice(0, 10);
}
