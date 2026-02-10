/**
 * Serialization Module
 *
 * Provides functions to serialize and restore machine state for persistence,
 * debugging, and time-travel debugging.
 *
 * @packageDocumentation
 */

export {
  serializeMachineState,
  restoreMachineState,
  type SerializedMachineState,
} from "./serialization.js";

export {
  NonSerializableContext,
  CircularReference,
  InvalidState,
  MachineIdMismatch,
  type SerializationError,
  type RestoreError,
} from "./errors.js";
