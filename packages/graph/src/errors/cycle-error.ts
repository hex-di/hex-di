/**
 * Structured error types for circular dependency detection.
 *
 * Provides `CycleError` (single cycle with diagram and suggestions) and
 * `MultipleCyclesError` (multiple independent cycles), both following
 * the discriminated union pattern with `_tag` discriminant.
 *
 * @see spec/packages/graph/behaviors/06-enhanced-cycle-errors.md — BEH-GR-06-001, BEH-GR-06-003
 * @see spec/packages/graph/behaviors/08-well-founded-cycles.md — BEH-GR-08-002
 * @packageDocumentation
 */

import type { CycleSuggestion } from "./cycle-suggestions.js";

// =============================================================================
// Lazy Edge Info
// =============================================================================

/**
 * Describes a lazy edge within a cycle, used for well-founded cycle reporting.
 */
export interface CycleLazyEdge {
  readonly from: string;
  readonly to: string;
}

// =============================================================================
// CycleError
// =============================================================================

/**
 * Structured error for a single detected circular dependency.
 *
 * Contains the cycle path, a pre-formatted ASCII diagram, and
 * actionable refactoring suggestions. When `isWellFounded` is true,
 * the cycle is accepted (not an error) because lazy edges break it.
 */
export interface CycleError {
  readonly _tag: "CycleDetected";
  readonly cycle: ReadonlyArray<string>;
  readonly diagram: string;
  readonly suggestions: ReadonlyArray<CycleSuggestion>;
  readonly message: string;
  readonly isWellFounded: boolean;
  readonly lazyEdges: ReadonlyArray<CycleLazyEdge>;
}

/**
 * Creates a frozen `CycleError` with the given properties.
 */
export function createCycleError(fields: {
  readonly cycle: ReadonlyArray<string>;
  readonly diagram: string;
  readonly suggestions: ReadonlyArray<CycleSuggestion>;
  readonly message: string;
  readonly isWellFounded?: boolean;
  readonly lazyEdges?: ReadonlyArray<CycleLazyEdge>;
}): CycleError {
  return Object.freeze({
    _tag: "CycleDetected" as const,
    cycle: Object.freeze([...fields.cycle]),
    diagram: fields.diagram,
    suggestions: fields.suggestions,
    message: fields.message,
    isWellFounded: fields.isWellFounded ?? false,
    lazyEdges: Object.freeze([...(fields.lazyEdges ?? [])]),
  });
}

// =============================================================================
// MultipleCyclesError
// =============================================================================

/**
 * Structured error for multiple independent circular dependencies.
 *
 * When a graph contains 2+ independent cycles, each is reported separately
 * with its own diagram and suggestions. The `summary` provides a human-readable
 * count.
 */
export interface MultipleCyclesError {
  readonly _tag: "MultipleCyclesDetected";
  readonly cycles: ReadonlyArray<CycleError>;
  readonly summary: string;
  readonly message: string;
}

/**
 * Creates a frozen `MultipleCyclesError` with the given properties.
 */
export function createMultipleCyclesError(fields: {
  readonly cycles: ReadonlyArray<CycleError>;
  readonly summary: string;
  readonly message: string;
}): MultipleCyclesError {
  return Object.freeze({
    _tag: "MultipleCyclesDetected" as const,
    cycles: Object.freeze([...fields.cycles]),
    summary: fields.summary,
    message: fields.message,
  });
}

// =============================================================================
// Union type
// =============================================================================

/**
 * Discriminated union of all cycle-related errors.
 */
export type CycleDetectionError = CycleError | MultipleCyclesError;
