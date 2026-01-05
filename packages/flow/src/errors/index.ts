/**
 * Flow error hierarchy exports.
 *
 * This module exports the error types for @hex-di/flow:
 * - FlowError: Abstract base class for all flow-related errors
 * - InvalidTransitionError: No valid transition for event in current state
 * - InvalidStateError: Referenced state does not exist
 * - InvalidEventError: Event type not defined in machine
 * - ActivityError: Activity execution failed
 * - EffectExecutionError: Effect executor failed
 * - DisposedMachineError: Operation on disposed machine
 *
 * @packageDocumentation
 */

// Base class and utilities
export { FlowError, extractErrorMessage } from "./base.js";

// Specific error types
export {
  InvalidTransitionError,
  InvalidStateError,
  InvalidEventError,
  ActivityError,
  EffectExecutionError,
  DisposedMachineError,
} from "./errors.js";
