/**
 * Signature validation for SignableTemporalContext (21 CFR 11.50).
 *
 * @packageDocumentation
 */

import type { Result } from "@hex-di/result";
import { ok, err } from "@hex-di/result";
import type { SignableTemporalContext } from "./temporal-context.js";

/** Error returned when signature validation fails. */
export interface SignatureValidationError {
  readonly _tag: "SignatureValidationError";
  readonly field: string;
  readonly message: string;
}

/** Factory for SignatureValidationError — frozen per GxP error immutability. */
export function createSignatureValidationError(
  field: string,
  message: string
): SignatureValidationError {
  return Object.freeze({
    _tag: "SignatureValidationError" as const,
    field,
    message,
  });
}

// CLK-SIG-001: Temporal window thresholds — non-configurable at library level.
const RETRO_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours retrospective
const FUTURE_THRESHOLD_EXECUTION_MS = 5 * 60 * 1000; // 5 minutes for execution
const FUTURE_THRESHOLD_REVIEW_MS = 72 * 60 * 60 * 1000; // 72 hours for review/approval

/**
 * Validates a SignableTemporalContext.
 *
 * Returns ok(ctx) for unsigned contexts.
 * For signed contexts:
 *  1. All 5 signature fields must be non-empty strings (21 CFR 11.50).
 *  2. signedAt must be a valid ISO 8601 date string.
 *  3. The signature object must be frozen (immutability).
 *  4. Temporal consistency windows (CLK-SIG-001):
 *     - signedAt must not be >24h BEFORE wallClockTimestamp.
 *     - signedAt must not be >5min AFTER wallClockTimestamp for meaning 'execution'.
 *     - signedAt must not be >72h AFTER wallClockTimestamp for meaning 'review'/'approval'.
 */
export function validateSignableTemporalContext(
  ctx: SignableTemporalContext
): Result<SignableTemporalContext, SignatureValidationError> {
  if (ctx.signature === undefined) {
    return ok(ctx);
  }

  const { signature } = ctx;
  const requiredFields = ["signerName", "signerId", "signedAt", "meaning", "method"] as const;

  for (const field of requiredFields) {
    const value = signature[field];
    if (typeof value !== "string" || value.length === 0) {
      return err(
        createSignatureValidationError(
          field,
          `Signature field '${field}' must be a non-empty string (21 CFR 11.50)`
        )
      );
    }
  }

  // ISO 8601 validation for signedAt
  const signedAtMs = Date.parse(signature.signedAt);
  if (!Number.isFinite(signedAtMs)) {
    return err(
      createSignatureValidationError(
        "signedAt",
        `Signature field 'signedAt' must be a valid ISO 8601 date string (21 CFR 11.50)`
      )
    );
  }

  // Signature object must be frozen (immutability requirement)
  if (!Object.isFrozen(signature)) {
    return err(
      createSignatureValidationError(
        "signature",
        "Signature object must be frozen to ensure immutability (21 CFR 11.50)"
      )
    );
  }

  // Temporal consistency window validation (CLK-SIG-001)
  const delta = signedAtMs - ctx.wallClockTimestamp;

  if (delta < -RETRO_THRESHOLD_MS) {
    return err(
      createSignatureValidationError(
        "signedAt",
        "Signature timestamp is more than 24 hours before the event timestamp (21 CFR 11.50 temporal consistency)"
      )
    );
  }

  const futureThresholdMs =
    signature.meaning === "review" || signature.meaning === "approval"
      ? FUTURE_THRESHOLD_REVIEW_MS
      : FUTURE_THRESHOLD_EXECUTION_MS;

  if (delta > futureThresholdMs) {
    return err(
      createSignatureValidationError(
        "signedAt",
        `Signature timestamp is too far in the future for meaning '${signature.meaning}' (21 CFR 11.50 temporal consistency)`
      )
    );
  }

  return ok(ctx);
}
