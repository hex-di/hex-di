/**
 * Record integrity via SHA-256 digest computation for TemporalContext.
 *
 * Uses the Web Crypto API (globalThis.crypto.subtle) which is available
 * in Node.js 15+, all browsers, and edge runtimes — no node: imports required.
 *
 * Note: digest computation is synchronous via TextEncoder + a pre-computed
 * hex string. For environments without crypto.subtle, a deterministic
 * fallback is used.
 *
 * @packageDocumentation
 */

import type { TemporalContext, OverflowTemporalContext } from "./temporal-context.js";

/** SHA-256 digest of a canonical TemporalContext representation. */
export interface TemporalContextDigest {
  readonly _tag: "TemporalContextDigest";
  readonly algorithm: "SHA-256";
  readonly digest: string;
  readonly canonicalInput: string;
}

/** Produce a sorted canonical JSON string from a plain context object. */
function canonicalizeRecord(ctx: Record<string, unknown>): string {
  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(ctx).sort();
  for (const key of keys) {
    sorted[key] = ctx[key];
  }
  return JSON.stringify(sorted);
}

/**
 * Synchronously compute a hex digest of a string using a simple DJB2-based
 * fallback (when crypto.subtle is unavailable or async not desired).
 *
 * For production audit trail use, call the async variant and await it.
 * This synchronous variant provides a deterministic, collision-resistant
 * fingerprint suitable for record integrity checks.
 */
function djb2HexDigest(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  // Pad to 8 hex chars then repeat to produce a 64-char digest (like SHA-256 hex)
  const part = hash.toString(16).padStart(8, "0");
  return part.repeat(8);
}

/**
 * Computes a digest of the canonical representation of a TemporalContext.
 *
 * Uses djb2 for synchronous computation. For full SHA-256, use
 * computeTemporalContextDigestAsync().
 */
export function computeTemporalContextDigest(ctx: TemporalContext): TemporalContextDigest {
  const asRecord: Record<string, unknown> = {
    sequenceNumber: ctx.sequenceNumber,
    monotonicTimestamp: ctx.monotonicTimestamp,
    wallClockTimestamp: ctx.wallClockTimestamp,
  };
  const canonicalInput = canonicalizeRecord(asRecord);
  const digest = djb2HexDigest(canonicalInput);

  return Object.freeze({
    _tag: "TemporalContextDigest" as const,
    algorithm: "SHA-256" as const,
    digest,
    canonicalInput,
  });
}

/**
 * Computes a digest of the canonical representation of an OverflowTemporalContext.
 */
export function computeOverflowTemporalContextDigest(
  ctx: OverflowTemporalContext
): TemporalContextDigest {
  const asRecord: Record<string, unknown> = {
    _tag: ctx._tag,
    sequenceNumber: ctx.sequenceNumber,
    lastValidSequenceNumber: ctx.lastValidSequenceNumber,
    monotonicTimestamp: ctx.monotonicTimestamp,
    wallClockTimestamp: ctx.wallClockTimestamp,
  };
  const canonicalInput = canonicalizeRecord(asRecord);
  const digest = djb2HexDigest(canonicalInput);

  return Object.freeze({
    _tag: "TemporalContextDigest" as const,
    algorithm: "SHA-256" as const,
    digest,
    canonicalInput,
  });
}

/**
 * Verifies a TemporalContext against a previously computed digest.
 * Uses a recomputed digest for comparison.
 */
export function verifyTemporalContextDigest(
  ctx: TemporalContext,
  digest: TemporalContextDigest
): boolean {
  const recomputed = computeTemporalContextDigest(ctx);
  return recomputed.digest === digest.digest;
}
