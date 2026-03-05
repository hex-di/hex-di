/**
 * Tagged error types for graph build failures.
 *
 * Uses `createError` from `@hex-di/result` following the ecosystem pattern
 * established by flow, saga, and store packages.
 *
 * ## Naming Convention
 *
 * `advanced.ts` already exports compile-time types `CircularDependencyError`
 * and `CaptiveDependencyError` (type-level branded errors). These runtime
 * error types use distinct names to avoid conflict.
 *
 * @packageDocumentation
 */

import { createError } from "@hex-di/result";
import type { CycleError, MultipleCyclesError } from "./cycle-error.js";

// =============================================================================
// Error Constructors
// =============================================================================

/** Creates a `CyclicDependency` tagged error for circular dependency detection. */
export const CyclicDependencyBuild = createError("CyclicDependency");

/** Creates a `CaptiveDependency` tagged error for lifetime scope violations. */
export const CaptiveDependencyBuild = createError("CaptiveDependency");

/** Creates a `MissingDependency` tagged error for unsatisfied requirements. */
export const MissingDependencyBuild = createError("MissingDependency");

/** Creates a `MissingOperation` tagged error for incomplete adapter implementations. */
export const MissingOperationBuild = createError("MissingOperation");

// =============================================================================
// Error Interfaces
// =============================================================================

/**
 * Structured error for circular dependency detection (HEX002).
 *
 * @deprecated Prefer `CycleError` from `cycle-error.ts` which includes diagrams and suggestions.
 */
export interface CyclicDependencyBuildError {
  readonly _tag: "CyclicDependency";
  readonly cyclePath: readonly string[];
  readonly message: string;
}

/** Structured error for captive dependency detection (HEX003). */
export interface CaptiveDependencyBuildError {
  readonly _tag: "CaptiveDependency";
  readonly dependentPort: string;
  readonly dependentLifetime: string;
  readonly captivePort: string;
  readonly captiveLifetime: string;
  readonly message: string;
}

/** Structured error for unsatisfied dependency requirements (HEX008). */
export interface MissingDependencyBuildError {
  readonly _tag: "MissingDependency";
  readonly missingPorts: readonly string[];
  readonly message: string;
}

/**
 * Structured error for incomplete adapter operations.
 *
 * Produced when a port declares `methods` metadata and the adapter
 * factory returns an instance missing one or more of those methods.
 */
export interface MissingOperationBuildError {
  readonly _tag: "MissingOperation";
  readonly portName: string;
  readonly missingMethods: readonly string[];
  readonly message: string;
}

// =============================================================================
// Error Unions
// =============================================================================

/** Errors that can occur during `tryBuild()` / `tryBuildGraph()`. */
export type GraphBuildError =
  | CyclicDependencyBuildError
  | CaptiveDependencyBuildError
  | MissingOperationBuildError
  | CycleError
  | MultipleCyclesError;

/** Errors that can occur during `validate()` (superset of GraphBuildError). */
export type GraphValidationError = GraphBuildError | MissingDependencyBuildError;
