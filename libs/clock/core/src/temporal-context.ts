/**
 * TemporalContext — captures sequence number, monotonic, and wall-clock timestamps
 * in a single atomic snapshot with ALCOA+ compliant capture ordering.
 *
 * Capture ordering: seq.next() → monotonicNow() → wallClockNow()
 *
 * @packageDocumentation
 */

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
export function isOverflowTemporalContext(
  ctx: TemporalContext | OverflowTemporalContext
): ctx is OverflowTemporalContext {
  return (ctx as OverflowTemporalContext)._tag === "OverflowTemporalContext";
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
export function createTemporalContextFactory(
  clock: ClockService,
  seq: SequenceGeneratorService
): TemporalContextFactory {
  return Object.freeze({
    create(): Result<TemporalContext, SequenceOverflowError> {
      // CRITICAL ordering: sequence first, then monotonic, then wall-clock
      const seqResult = seq.next();
      const monotonicTimestamp = clock.monotonicNow();
      const wallClockTimestamp = clock.wallClockNow();

      if (seqResult.isErr()) {
        // Re-wrap the error to produce Result<TemporalContext, SequenceOverflowError>
        return err(seqResult.error);
      }

      const context: TemporalContext = Object.freeze({
        sequenceNumber: seqResult.value,
        monotonicTimestamp,
        wallClockTimestamp,
      });

      return ok(context);
    },

    createOverflowContext(): OverflowTemporalContext {
      // Capture timestamps even in overflow for diagnostic purposes
      const monotonicTimestamp = clock.monotonicNow();
      const wallClockTimestamp = clock.wallClockNow();

      return Object.freeze({
        _tag: "OverflowTemporalContext" as const,
        sequenceNumber: -1 as const,
        lastValidSequenceNumber: seq.current(),
        monotonicTimestamp,
        wallClockTimestamp,
      });
    },
  });
}
