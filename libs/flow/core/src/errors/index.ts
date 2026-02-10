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
  type FlowAdapterError,
  DisposeError,
  ActivityNotFound,
} from "./tagged-errors.js";
