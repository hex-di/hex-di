/**
 * Flow error types.
 *
 * Tagged union error types for Result pattern matching.
 *
 * @packageDocumentation
 */

export {
  GuardThrew,
  ActionThrew,
  Disposed,
  QueueOverflow,
  EventValidationFailed,
  type TransitionError,
  InvokeError,
  SpawnError,
  StopError,
  ResolutionError,
  SequenceAborted,
  ParallelErrors,
  type EffectExecutionError,
  MetadataInvalid,
  DuplicateActivityPort,
  ActivityNotFrozen,
  PortNotAvailable,
  type FlowAdapterCreationError,
  type FlowAdapterError,
  DisposeError,
  ActivityNotFound,
} from "./tagged-errors.js";
