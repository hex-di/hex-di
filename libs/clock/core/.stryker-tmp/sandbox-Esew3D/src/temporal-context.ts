/**
 * TemporalContext — captures sequence number, monotonic, and wall-clock timestamps
 * in a single atomic snapshot with ALCOA+ compliant capture ordering.
 *
 * Capture ordering: seq.next() → monotonicNow() → wallClockNow()
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
import type { Result } from "@hex-di/result";
import { ok, err } from "@hex-di/result";
import type { MonotonicTimestamp, WallClockTimestamp } from "./branded.js";
import type { ClockService } from "./ports/clock.js";
import type { SequenceGeneratorService, SequenceOverflowError } from "./ports/sequence.js";

// =============================================================================
// TemporalContext Interfaces
// =============================================================================

/** A timestamped snapshot capturing sequence number + monotonic + wall-clock time. */
export interface TemporalContext {
  readonly sequenceNumber: number;
  readonly monotonicTimestamp: MonotonicTimestamp;
  readonly wallClockTimestamp: WallClockTimestamp;
}

/**
 * Represents a temporal context captured when the sequence generator has overflowed.
 * sequenceNumber is always -1 to distinguish from a valid context.
 */
export interface OverflowTemporalContext {
  readonly _tag: "OverflowTemporalContext";
  readonly sequenceNumber: -1;
  readonly lastValidSequenceNumber: number;
  readonly monotonicTimestamp: MonotonicTimestamp;
  readonly wallClockTimestamp: WallClockTimestamp;
}

/** A temporal context that may carry an optional electronic signature (21 CFR 11.50). */
export interface SignableTemporalContext extends TemporalContext {
  readonly signature?: {
    readonly signerName: string;
    readonly signerId: string;
    readonly signedAt: string;
    readonly meaning: string;
    readonly method: string;
  };
}

// =============================================================================
// Type Guard
// =============================================================================

/** Type guard for OverflowTemporalContext. */
export function isOverflowTemporalContext(ctx: TemporalContext | OverflowTemporalContext): ctx is OverflowTemporalContext {
  if (stryMutAct_9fa48("1010")) {
    {}
  } else {
    stryCov_9fa48("1010");
    return stryMutAct_9fa48("1013") ? (ctx as OverflowTemporalContext)._tag !== "OverflowTemporalContext" : stryMutAct_9fa48("1012") ? false : stryMutAct_9fa48("1011") ? true : (stryCov_9fa48("1011", "1012", "1013"), (ctx as OverflowTemporalContext)._tag === (stryMutAct_9fa48("1014") ? "" : (stryCov_9fa48("1014"), "OverflowTemporalContext")));
  }
}

// =============================================================================
// TemporalContextFactory
// =============================================================================

/** Factory for creating temporal contexts from a clock and sequence generator. */
export interface TemporalContextFactory {
  /**
   * Captures a new temporal context.
   * Returns err(SequenceOverflowError) if the sequence generator is exhausted.
   * Capture ordering: seq.next() → monotonicNow() → wallClockNow()
   */
  readonly create: () => Result<TemporalContext, SequenceOverflowError>;

  /**
   * Creates an overflow temporal context for use when the sequence generator is exhausted.
   * The sequenceNumber is always -1.
   */
  readonly createOverflowContext: () => OverflowTemporalContext;
}

/**
 * Creates a TemporalContextFactory from a clock and sequence generator.
 *
 * CRITICAL: capture ordering MUST be seq.next() → monotonicNow() → wallClockNow()
 */
export function createTemporalContextFactory(clock: ClockService, seq: SequenceGeneratorService): TemporalContextFactory {
  if (stryMutAct_9fa48("1015")) {
    {}
  } else {
    stryCov_9fa48("1015");
    return Object.freeze(stryMutAct_9fa48("1016") ? {} : (stryCov_9fa48("1016"), {
      create(): Result<TemporalContext, SequenceOverflowError> {
        if (stryMutAct_9fa48("1017")) {
          {}
        } else {
          stryCov_9fa48("1017");
          // CRITICAL ordering: sequence first, then monotonic, then wall-clock
          const seqResult = seq.next();
          const monotonicTimestamp = clock.monotonicNow();
          const wallClockTimestamp = clock.wallClockNow();
          if (stryMutAct_9fa48("1019") ? false : stryMutAct_9fa48("1018") ? true : (stryCov_9fa48("1018", "1019"), seqResult.isErr())) {
            if (stryMutAct_9fa48("1020")) {
              {}
            } else {
              stryCov_9fa48("1020");
              // Re-wrap the error to produce Result<TemporalContext, SequenceOverflowError>
              return err(seqResult.error);
            }
          }
          const context: TemporalContext = Object.freeze(stryMutAct_9fa48("1021") ? {} : (stryCov_9fa48("1021"), {
            sequenceNumber: seqResult.value,
            monotonicTimestamp,
            wallClockTimestamp
          }));
          return ok(context);
        }
      },
      createOverflowContext(): OverflowTemporalContext {
        if (stryMutAct_9fa48("1022")) {
          {}
        } else {
          stryCov_9fa48("1022");
          // Capture timestamps even in overflow for diagnostic purposes
          const monotonicTimestamp = clock.monotonicNow();
          const wallClockTimestamp = clock.wallClockNow();
          return Object.freeze(stryMutAct_9fa48("1023") ? {} : (stryCov_9fa48("1023"), {
            _tag: "OverflowTemporalContext" as const,
            sequenceNumber: -1 as const,
            lastValidSequenceNumber: seq.current(),
            monotonicTimestamp,
            wallClockTimestamp
          }));
        }
      }
    }));
  }
}