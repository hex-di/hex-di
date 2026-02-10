/**
 * Serialization Error Types
 *
 * Tagged discriminated union error types for serialization/restore operations.
 * Uses `createError()` from `@hex-di/result` for consistent error construction.
 *
 * @packageDocumentation
 */

import { createError } from "@hex-di/result";

// =============================================================================
// Serialization Errors
// =============================================================================

/**
 * Error when the context contains non-serializable values (functions, symbols, etc.).
 */
export const NonSerializableContext = createError("NonSerializableContext");
export type NonSerializableContext = Readonly<{
  _tag: "NonSerializableContext";
  path: string;
  valueType: string;
}>;

/**
 * Error when the context contains circular references.
 */
export const CircularReference = createError("CircularReference");
export type CircularReference = Readonly<{
  _tag: "CircularReference";
  path: string;
}>;

/**
 * Union of all serialization error types.
 */
export type SerializationError = NonSerializableContext | CircularReference;

// =============================================================================
// Restore Errors
// =============================================================================

/**
 * Error when the serialized state name is not a valid state in the machine.
 */
export const InvalidState = createError("InvalidState");
export type InvalidState = Readonly<{
  _tag: "InvalidState";
  stateName: string;
  validStates: readonly string[];
}>;

/**
 * Error when the serialized machine ID doesn't match the target machine.
 */
export const MachineIdMismatch = createError("MachineIdMismatch");
export type MachineIdMismatch = Readonly<{
  _tag: "MachineIdMismatch";
  serializedId: string;
  machineId: string;
}>;

/**
 * Union of all restore error types.
 */
export type RestoreError = InvalidState | MachineIdMismatch;
