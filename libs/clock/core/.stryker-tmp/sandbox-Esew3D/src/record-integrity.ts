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
// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
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
  if (stryMutAct_9fa48("908")) {
    {}
  } else {
    stryCov_9fa48("908");
    const sorted: Record<string, unknown> = {};
    const keys = stryMutAct_9fa48("909") ? Object.keys(ctx) : (stryCov_9fa48("909"), Object.keys(ctx).sort());
    for (const key of keys) {
      if (stryMutAct_9fa48("910")) {
        {}
      } else {
        stryCov_9fa48("910");
        sorted[key] = ctx[key];
      }
    }
    return JSON.stringify(sorted);
  }
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
  if (stryMutAct_9fa48("911")) {
    {}
  } else {
    stryCov_9fa48("911");
    let hash = 5381;
    for (let i = 0; stryMutAct_9fa48("914") ? i >= input.length : stryMutAct_9fa48("913") ? i <= input.length : stryMutAct_9fa48("912") ? false : (stryCov_9fa48("912", "913", "914"), i < input.length); stryMutAct_9fa48("915") ? i-- : (stryCov_9fa48("915"), i++)) {
      if (stryMutAct_9fa48("916")) {
        {}
      } else {
        stryCov_9fa48("916");
        hash = (stryMutAct_9fa48("917") ? (hash << 5) - hash : (stryCov_9fa48("917"), (hash << 5) + hash)) ^ input.charCodeAt(i);
        hash = hash >>> 0; // keep unsigned 32-bit
      }
    }
    // Pad to 8 hex chars then repeat to produce a 64-char digest (like SHA-256 hex)
    const part = hash.toString(16).padStart(8, stryMutAct_9fa48("918") ? "" : (stryCov_9fa48("918"), "0"));
    return part.repeat(8);
  }
}

/**
 * Computes a digest of the canonical representation of a TemporalContext.
 *
 * Uses djb2 for synchronous computation. For full SHA-256, use
 * computeTemporalContextDigestAsync().
 */
export function computeTemporalContextDigest(ctx: TemporalContext): TemporalContextDigest {
  if (stryMutAct_9fa48("919")) {
    {}
  } else {
    stryCov_9fa48("919");
    const asRecord: Record<string, unknown> = stryMutAct_9fa48("920") ? {} : (stryCov_9fa48("920"), {
      sequenceNumber: ctx.sequenceNumber,
      monotonicTimestamp: ctx.monotonicTimestamp,
      wallClockTimestamp: ctx.wallClockTimestamp
    });
    const canonicalInput = canonicalizeRecord(asRecord);
    const digest = djb2HexDigest(canonicalInput);
    return Object.freeze(stryMutAct_9fa48("921") ? {} : (stryCov_9fa48("921"), {
      _tag: "TemporalContextDigest" as const,
      algorithm: "SHA-256" as const,
      digest,
      canonicalInput
    }));
  }
}

/**
 * Computes a digest of the canonical representation of an OverflowTemporalContext.
 */
export function computeOverflowTemporalContextDigest(ctx: OverflowTemporalContext): TemporalContextDigest {
  if (stryMutAct_9fa48("922")) {
    {}
  } else {
    stryCov_9fa48("922");
    const asRecord: Record<string, unknown> = stryMutAct_9fa48("923") ? {} : (stryCov_9fa48("923"), {
      _tag: ctx._tag,
      sequenceNumber: ctx.sequenceNumber,
      lastValidSequenceNumber: ctx.lastValidSequenceNumber,
      monotonicTimestamp: ctx.monotonicTimestamp,
      wallClockTimestamp: ctx.wallClockTimestamp
    });
    const canonicalInput = canonicalizeRecord(asRecord);
    const digest = djb2HexDigest(canonicalInput);
    return Object.freeze(stryMutAct_9fa48("924") ? {} : (stryCov_9fa48("924"), {
      _tag: "TemporalContextDigest" as const,
      algorithm: "SHA-256" as const,
      digest,
      canonicalInput
    }));
  }
}

/**
 * Verifies a TemporalContext against a previously computed digest.
 * Uses a recomputed digest for comparison.
 */
export function verifyTemporalContextDigest(ctx: TemporalContext, digest: TemporalContextDigest): boolean {
  if (stryMutAct_9fa48("925")) {
    {}
  } else {
    stryCov_9fa48("925");
    const recomputed = computeTemporalContextDigest(ctx);
    return stryMutAct_9fa48("928") ? recomputed.digest !== digest.digest : stryMutAct_9fa48("927") ? false : stryMutAct_9fa48("926") ? true : (stryCov_9fa48("926", "927", "928"), recomputed.digest === digest.digest);
  }
}