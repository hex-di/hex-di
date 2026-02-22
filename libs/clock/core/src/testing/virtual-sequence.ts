/**
 * VirtualSequenceGenerator — controllable test sequence generator.
 *
 * Exported only from @hex-di/clock/testing.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import { ok, err } from "@hex-di/result";
import { SequenceGeneratorPort, createSequenceOverflowError } from "../ports/sequence.js";
import type { SequenceGeneratorService, SequenceOverflowError } from "../ports/sequence.js";

/** Error returned when a sequence parameter fails validation. */
export interface SequenceValidationError {
  readonly _tag: "SequenceValidationError";
  readonly parameter: string;
  readonly message: string;
}

/** Factory for SequenceValidationError — frozen per GxP error immutability. */
export function createSequenceValidationError(
  parameter: string,
  message: string
): SequenceValidationError {
  return Object.freeze({
    _tag: "SequenceValidationError" as const,
    parameter,
    message,
  });
}

/** Options for createVirtualSequenceGenerator. */
export interface VirtualSequenceOptions {
  readonly startAt?: number;
}

/**
 * Extended interface for the virtual sequence generator.
 * Includes reset() and setCounter() for test manipulation.
 * Production SequenceGeneratorService does NOT have these methods.
 */
export interface VirtualSequenceGenerator extends SequenceGeneratorService {
  readonly setCounter: (value: number) => Result<void, SequenceValidationError>;
  readonly reset: () => void;
}

/**
 * Creates a virtual sequence generator with reset and setCounter capabilities.
 * Returns err(SequenceValidationError) when startAt is not a finite integer.
 */
export function createVirtualSequenceGenerator(
  options?: VirtualSequenceOptions
): Result<VirtualSequenceGenerator, SequenceValidationError> {
  const startAt = options?.startAt ?? 0;

  if (!Number.isFinite(startAt) || !Number.isInteger(startAt)) {
    return err(
      createSequenceValidationError(
        "startAt",
        `VirtualSequenceOptions 'startAt' must be a finite integer, got ${startAt}`
      )
    );
  }

  let counter = startAt;

  return ok({
    next(): Result<number, SequenceOverflowError> {
      if (counter >= Number.MAX_SAFE_INTEGER) {
        return err(createSequenceOverflowError(counter));
      }
      counter += 1;
      return ok(counter);
    },

    current(): number {
      return counter;
    },

    reset(): void {
      counter = startAt;
    },

    setCounter(value: number): Result<void, SequenceValidationError> {
      if (!Number.isFinite(value)) {
        return err(
          createSequenceValidationError(
            "value",
            `setCounter() 'value' must be a finite number, got ${value}`
          )
        );
      }
      counter = value;
      return ok(undefined);
    },
  });
}

/** Virtual sequence generator adapter — transient lifetime for test isolation. */
export const VirtualSequenceGeneratorAdapter = createAdapter({
  provides: SequenceGeneratorPort,
  requires: [],
  lifetime: "transient",
  // Stryker disable next-line ArrowFunction -- EQUIVALENT: DI factory ArrowFunction no-op cannot be killed via direct unit tests
  factory: () => createVirtualSequenceGenerator(),
});
