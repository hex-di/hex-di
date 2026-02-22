/**
 * SequenceGeneratorPort — monotonically-increasing counter for event ordering.
 *
 * @packageDocumentation
 */
// @ts-nocheck


import { port } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import { ok, err } from "@hex-di/result";

/** Error returned when sequence counter reaches Number.MAX_SAFE_INTEGER. */
export interface SequenceOverflowError {
  readonly _tag: "SequenceOverflowError";
  readonly lastValue: number;
  readonly message: string;
}

/**
 * Factory for SequenceOverflowError — frozen per GxP error immutability.
 */
export function createSequenceOverflowError(
  lastValue: number
): SequenceOverflowError {
  return Object.freeze({
    _tag: "SequenceOverflowError" as const,
    lastValue,
    message: `Sequence overflow at ${lastValue}`,
  });
}

/**
 * Service interface for SequenceGeneratorPort.
 *
 * Deliberately excludes reset() — structural irresettability prevents audit trail corruption.
 * See spec/libs/clock/type-system/structural-safety.md.
 */
export interface SequenceGeneratorService {
  readonly next: () => Result<number, SequenceOverflowError>;
  readonly current: () => number;
}

/** Monotonically-increasing counter port for event ordering, independent of time precision. */
export const SequenceGeneratorPort = port<SequenceGeneratorService>()({
  name: "SequenceGenerator",
  direction: "outbound",
  description:
    "Monotonically-increasing counter for event ordering, independent of time precision",
  category: "clock/sequence",
  tags: ["sequence", "ordering", "gxp"],
});

// Export Result-related symbols for convenience
export { ok, err };
