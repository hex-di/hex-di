/**
 * Tagged Union Error Types for @hex-di/flow.
 *
 * These error types use discriminated unions with a `_tag` property
 * for exhaustive pattern matching via `match()` or `switch`.
 *
 * Error unions:
 * - TransitionError: Errors during state transitions
 * - EffectExecutionError: Errors during effect execution
 * - FlowAdapterError: Errors during adapter creation/validation
 * - DisposeError: Errors during disposal
 * - ActivityNotFound: Error when activity is not found
 *
 * @packageDocumentation
 */

import { createError } from "@hex-di/result";

// =============================================================================
// TransitionError Variants
// =============================================================================

/**
 * A guard function threw an error during evaluation.
 */
export const GuardThrew = createError("GuardThrew");
export type GuardThrew = Readonly<{
  _tag: "GuardThrew";
  machineId: string;
  currentState: string;
  eventType: string;
  cause: unknown;
}>;

/**
 * An action function threw an error during execution.
 */
export const ActionThrew = createError("ActionThrew");
export type ActionThrew = Readonly<{
  _tag: "ActionThrew";
  machineId: string;
  currentState: string;
  eventType: string;
  cause: unknown;
}>;

/**
 * Operation attempted on a disposed machine.
 */
export const Disposed = createError("Disposed");
export type Disposed = Readonly<{
  _tag: "Disposed";
  machineId: string;
  operation: string;
}>;

/**
 * Event queue overflow (too many queued events).
 */
export const QueueOverflow = createError("QueueOverflow");
export type QueueOverflow = Readonly<{
  _tag: "QueueOverflow";
  machineId: string;
  queueSize: number;
}>;

/**
 * Event validation failed (GxP F10).
 *
 * Produced when either the global `eventValidator` or a per-transition
 * `validate` predicate rejects an event before the transition is taken.
 */
export const EventValidationFailed = createError("EventValidationFailed");
export type EventValidationFailed = Readonly<{
  _tag: "EventValidationFailed";
  machineId: string;
  eventType: string;
  message: string;
}>;

/**
 * Union of all errors that can occur during state transitions.
 */
export type TransitionError =
  | GuardThrew
  | ActionThrew
  | Disposed
  | QueueOverflow
  | EventValidationFailed;

// =============================================================================
// EffectExecutionError Variants
// =============================================================================

/**
 * An InvokeEffect failed during execution.
 */
export const InvokeError = createError("InvokeError");
export type InvokeError = Readonly<{
  _tag: "InvokeError";
  portName: string;
  method: string;
  cause: unknown;
}>;

/**
 * A SpawnEffect failed during execution.
 */
export const SpawnError = createError("SpawnError");
export type SpawnError = Readonly<{
  _tag: "SpawnError";
  activityId: string;
  cause: unknown;
}>;

/**
 * A StopEffect failed during execution.
 */
export const StopError = createError("StopError");
export type StopError = Readonly<{
  _tag: "StopError";
  activityId: string;
  cause: unknown;
}>;

/**
 * A port resolution failed during effect execution.
 */
export const ResolutionError = createError("ResolutionError");
export type ResolutionError = Readonly<{
  _tag: "ResolutionError";
  portName: string;
  cause: unknown;
}>;

/**
 * A SequenceEffect was aborted because one step failed.
 */
export const SequenceAborted = createError("SequenceAborted");
export type SequenceAborted = Readonly<{
  _tag: "SequenceAborted";
  stepIndex: number;
  cause: unknown;
  /** Indices of steps that completed successfully before the failure (GxP F8). */
  completedSteps: readonly number[];
}>;

/**
 * A ParallelEffect had one or more failures.
 */
export const ParallelErrors = createError("ParallelErrors");
export type ParallelErrors = Readonly<{
  _tag: "ParallelErrors";
  errors: readonly unknown[];
}>;

/**
 * Union of all errors that can occur during effect execution.
 */
export type EffectExecutionError =
  | InvokeError
  | SpawnError
  | StopError
  | ResolutionError
  | SequenceAborted
  | ParallelErrors;

// =============================================================================
// FlowAdapterError Variants
// =============================================================================

/**
 * Flow adapter metadata validation failed.
 */
export const MetadataInvalid = createError("MetadataInvalid");
export type MetadataInvalid = Readonly<{
  _tag: "MetadataInvalid";
  reason: string;
}>;

/**
 * Duplicate activity port name detected.
 */
export const DuplicateActivityPort = createError("DuplicateActivityPort");
export type DuplicateActivityPort = Readonly<{
  _tag: "DuplicateActivityPort";
  portName: string;
}>;

/**
 * Activity is not frozen (not created via factory).
 */
export const ActivityNotFrozen = createError("ActivityNotFrozen");
export type ActivityNotFrozen = Readonly<{
  _tag: "ActivityNotFrozen";
  portName: string;
}>;

/**
 * A required port is not available in the FlowAdapter's requires array.
 */
export const PortNotAvailable = createError("PortNotAvailable");
export type PortNotAvailable = Readonly<{
  _tag: "PortNotAvailable";
  portName: string;
  context: string;
}>;

/**
 * Errors that can occur during FlowAdapter construction
 * (i.e. inside `createFlowAdapter`).
 *
 * This is the narrowed subset of `FlowAdapterError` that the factory
 * can actually produce.
 */
export type FlowAdapterCreationError = DuplicateActivityPort | ActivityNotFrozen;

/**
 * Union of all errors related to flow adapter creation and validation.
 *
 * Includes construction errors (`FlowAdapterCreationError`) plus errors
 * produced by utility functions like `computeFlowMetadata` and runtime
 * port resolution.
 */
export type FlowAdapterError =
  | MetadataInvalid
  | DuplicateActivityPort
  | ActivityNotFrozen
  | PortNotAvailable;

// =============================================================================
// Disposal Errors
// =============================================================================

/**
 * Error during resource disposal.
 */
export const DisposeError = createError("DisposeError");
export type DisposeError = Readonly<{
  _tag: "DisposeError";
  cause: unknown;
}>;

// =============================================================================
// Activity Errors
// =============================================================================

/**
 * Activity not found by ID.
 */
export const ActivityNotFound = createError("ActivityNotFound");
export type ActivityNotFound = Readonly<{
  _tag: "ActivityNotFound";
  activityId: string;
}>;
