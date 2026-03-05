/**
 * Formal disposal ordering types.
 *
 * Defines the types for deterministic disposal ordering based on
 * dependency graph topology. Dependents are disposed before their
 * dependencies, and independent branches can be disposed in parallel.
 *
 * @see {@link https://hex-di.dev/spec/core/behaviors/14-formal-disposal-ordering | BEH-CO-14}
 *
 * @packageDocumentation
 */

import type { BlameContext } from "../errors/blame.js";

// =============================================================================
// DisposalPhaseEntry — Per-Adapter Disposal Metadata
// =============================================================================

/**
 * Metadata for a single adapter within a disposal phase.
 */
export interface DisposalPhaseEntry {
  /** The name used when registering this adapter (derived from the provides port). */
  readonly adapterName: string;
  /** The port name this adapter provides. */
  readonly portName: string;
  /** Whether this adapter has a finalizer that must be invoked. */
  readonly hasFinalizer: boolean;
}

// =============================================================================
// DisposalPhase — Group of Independent Adapters
// =============================================================================

/**
 * A group of adapters that can be disposed in parallel because they have
 * no dependency relationships between them.
 *
 * Phases are ordered from 0 (leaf nodes, disposed first) to N (root nodes, disposed last).
 */
export interface DisposalPhase {
  /** The level number in the disposal plan (0 = leaves). */
  readonly level: number;
  /** The adapters to dispose in this phase (independent of each other). */
  readonly adapters: ReadonlyArray<DisposalPhaseEntry>;
}

// =============================================================================
// DisposalPlan — Complete Disposal Schedule
// =============================================================================

/**
 * A complete disposal plan computed from the dependency graph.
 *
 * Phases are ordered from first-to-dispose (leaf nodes with no dependents)
 * to last-to-dispose (root nodes with no dependencies on other nodes).
 */
export interface DisposalPlan {
  /** Ordered phases from first-to-dispose (leaves) to last-to-dispose (roots). */
  readonly phases: ReadonlyArray<DisposalPhase>;
  /** Total number of adapters in the plan. */
  readonly totalAdapters: number;
}

// =============================================================================
// DisposalErrorEntry — Per-Adapter Disposal Error
// =============================================================================

/**
 * Records an error that occurred during disposal of a single adapter.
 */
export interface DisposalErrorEntry {
  /** The name of the adapter whose finalizer threw. */
  readonly adapterName: string;
  /** The error thrown by the finalizer. */
  readonly error: unknown;
  /** Blame context attributing the error. */
  readonly blame: BlameContext;
}

// =============================================================================
// DisposalResult — Outcome of Executing a Disposal Plan
// =============================================================================

/**
 * The result of executing a disposal plan.
 *
 * Even when errors occur, disposal proceeds on a best-effort basis.
 * All adapters are marked as disposed regardless of whether their
 * finalizer succeeded or failed.
 */
export interface DisposalResult {
  /** Port names of all adapters that were processed (in disposal order). */
  readonly disposed: ReadonlyArray<string>;
  /** Errors from failed finalizers, with blame context. */
  readonly errors: ReadonlyArray<DisposalErrorEntry>;
  /** Total time in milliseconds for the disposal process. */
  readonly totalTime: number;
}

// =============================================================================
// DependencyEdge — For Building Dependency Graphs
// =============================================================================

/**
 * Describes a single adapter's dependencies for disposal planning.
 *
 * Used as input to `computeDisposalPlan` to avoid coupling
 * the disposal planner to the full adapter type.
 */
export interface DependencyEntry {
  /** The port name this adapter provides. */
  readonly portName: string;
  /** Port names this adapter depends on. */
  readonly dependsOn: ReadonlyArray<string>;
  /** Whether this adapter has a finalizer. */
  readonly hasFinalizer: boolean;
}
