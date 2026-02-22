/**
 * Deserialization utilities for TemporalContext and ClockDiagnostics.
 *
 * @packageDocumentation
 */

import type { Result } from "@hex-di/result";
import { ok, err } from "@hex-di/result";
import { asMonotonic, asWallClock } from "./branded.js";
import type { TemporalContext, OverflowTemporalContext } from "./temporal-context.js";
import type { ClockDiagnostics } from "./ports/diagnostics.js";

/** Error returned when deserialization fails. */
export interface DeserializationError {
  readonly _tag: "DeserializationError";
  readonly schemaType: string;
  readonly expectedVersions: ReadonlyArray<number>;
  readonly actualVersion: number | undefined;
  readonly field: string | undefined;
  readonly message: string;
}

/** Factory for DeserializationError — frozen per GxP error immutability. */
export function createDeserializationError(args: {
  readonly schemaType: string;
  readonly expectedVersions: ReadonlyArray<number>;
  readonly actualVersion?: number;
  readonly field?: string;
  readonly message: string;
}): DeserializationError {
  return Object.freeze({
    _tag: "DeserializationError" as const,
    schemaType: args.schemaType,
    expectedVersions: args.expectedVersions,
    actualVersion: args.actualVersion,
    field: args.field,
    message: args.message,
  });
}

/** Check if a value is a plain object. */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Deserializes a raw object into a TemporalContext.
 * Validates shape and brands numeric fields.
 */
export function deserializeTemporalContext(
  raw: unknown
): Result<TemporalContext, DeserializationError> {
  if (!isObject(raw)) {
    return err(
      createDeserializationError({
        schemaType: "TemporalContext",
        expectedVersions: [1],
        message: "Expected an object",
      })
    );
  }

  if (typeof raw.sequenceNumber !== "number") {
    return err(
      createDeserializationError({
        schemaType: "TemporalContext",
        expectedVersions: [1],
        field: "sequenceNumber",
        message: "Field 'sequenceNumber' must be a number",
      })
    );
  }

  if (typeof raw.monotonicTimestamp !== "number") {
    return err(
      createDeserializationError({
        schemaType: "TemporalContext",
        expectedVersions: [1],
        field: "monotonicTimestamp",
        message: "Field 'monotonicTimestamp' must be a number",
      })
    );
  }

  if (typeof raw.wallClockTimestamp !== "number") {
    return err(
      createDeserializationError({
        schemaType: "TemporalContext",
        expectedVersions: [1],
        field: "wallClockTimestamp",
        message: "Field 'wallClockTimestamp' must be a number",
      })
    );
  }

  const ctx: TemporalContext = Object.freeze({
    sequenceNumber: raw.sequenceNumber,
    monotonicTimestamp: asMonotonic(raw.monotonicTimestamp),
    wallClockTimestamp: asWallClock(raw.wallClockTimestamp),
  });

  return ok(ctx);
}

/**
 * Deserializes a raw object into an OverflowTemporalContext.
 */
export function deserializeOverflowTemporalContext(
  raw: unknown
): Result<OverflowTemporalContext, DeserializationError> {
  if (!isObject(raw)) {
    return err(
      createDeserializationError({
        schemaType: "OverflowTemporalContext",
        expectedVersions: [1],
        message: "Expected an object",
      })
    );
  }

  if (raw._tag !== "OverflowTemporalContext") {
    return err(
      createDeserializationError({
        schemaType: "OverflowTemporalContext",
        expectedVersions: [1],
        field: "_tag",
        message: "Field '_tag' must be 'OverflowTemporalContext'",
      })
    );
  }

  if (raw.sequenceNumber !== -1) {
    return err(
      createDeserializationError({
        schemaType: "OverflowTemporalContext",
        expectedVersions: [1],
        field: "sequenceNumber",
        message: "Field 'sequenceNumber' must be -1",
      })
    );
  }

  if (typeof raw.lastValidSequenceNumber !== "number") {
    return err(
      createDeserializationError({
        schemaType: "OverflowTemporalContext",
        expectedVersions: [1],
        field: "lastValidSequenceNumber",
        message: "Field 'lastValidSequenceNumber' must be a number",
      })
    );
  }

  if (typeof raw.monotonicTimestamp !== "number") {
    return err(
      createDeserializationError({
        schemaType: "OverflowTemporalContext",
        expectedVersions: [1],
        field: "monotonicTimestamp",
        message: "Field 'monotonicTimestamp' must be a number",
      })
    );
  }

  if (typeof raw.wallClockTimestamp !== "number") {
    return err(
      createDeserializationError({
        schemaType: "OverflowTemporalContext",
        expectedVersions: [1],
        field: "wallClockTimestamp",
        message: "Field 'wallClockTimestamp' must be a number",
      })
    );
  }

  const ctx: OverflowTemporalContext = Object.freeze({
    _tag: "OverflowTemporalContext" as const,
    sequenceNumber: -1 as const,
    lastValidSequenceNumber: raw.lastValidSequenceNumber,
    monotonicTimestamp: asMonotonic(raw.monotonicTimestamp),
    wallClockTimestamp: asWallClock(raw.wallClockTimestamp),
  });

  return ok(ctx);
}

/**
 * Deserializes a raw object into a ClockDiagnostics.
 */
export function deserializeClockDiagnostics(
  raw: unknown
): Result<ClockDiagnostics, DeserializationError> {
  if (!isObject(raw)) {
    return err(
      createDeserializationError({
        schemaType: "ClockDiagnostics",
        expectedVersions: [1],
        message: "Expected an object",
      })
    );
  }

  if (typeof raw.adapterName !== "string") {
    return err(
      createDeserializationError({
        schemaType: "ClockDiagnostics",
        expectedVersions: [1],
        field: "adapterName",
        message: "Field 'adapterName' must be a string",
      })
    );
  }

  const validMonotonicSources = ["performance.now", "Date.now-clamped", "host-bridge"] as const;
  if (!validMonotonicSources.includes(raw.monotonicSource as (typeof validMonotonicSources)[number])) {
    return err(
      createDeserializationError({
        schemaType: "ClockDiagnostics",
        expectedVersions: [1],
        field: "monotonicSource",
        message: `Field 'monotonicSource' must be one of: ${validMonotonicSources.join(", ")}`,
      })
    );
  }

  const validHighResSources = [
    "performance.timeOrigin+now",
    "Date.now",
    "host-bridge",
    "host-bridge-wallclock",
  ] as const;
  if (!validHighResSources.includes(raw.highResSource as (typeof validHighResSources)[number])) {
    return err(
      createDeserializationError({
        schemaType: "ClockDiagnostics",
        expectedVersions: [1],
        field: "highResSource",
        message: `Field 'highResSource' must be one of: ${validHighResSources.join(", ")}`,
      })
    );
  }

  const diagnostics: ClockDiagnostics = Object.freeze({
    adapterName: raw.adapterName,
    monotonicSource: raw.monotonicSource as ClockDiagnostics["monotonicSource"],
    highResSource: raw.highResSource as ClockDiagnostics["highResSource"],
    platformResolutionMs:
      // Stryker disable next-line all -- EQUIVALENT: null/undefined distinction is irrelevant; typeof-number guard on L250 catches both; || vs && produces identical result for any actual input
      raw.platformResolutionMs === undefined || raw.platformResolutionMs === null
        ? undefined
        : typeof raw.platformResolutionMs === "number"
          ? raw.platformResolutionMs
          : undefined,
    cryptoFipsMode:
      // Stryker disable next-line all -- EQUIVALENT: null/undefined distinction is irrelevant; typeof-boolean guard on L256 catches both; || vs && produces identical result for any actual input
      raw.cryptoFipsMode === undefined || raw.cryptoFipsMode === null
        ? undefined
        : typeof raw.cryptoFipsMode === "boolean"
          ? raw.cryptoFipsMode
          : undefined,
  });

  return ok(diagnostics);
}
