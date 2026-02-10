/**
 * Machine State Serialization
 *
 * Serialize and restore machine state for persistence and debugging.
 *
 * @packageDocumentation
 */

import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { MachineAny } from "../machine/types.js";
import type { MachineRunnerAny } from "../runner/types.js";
import {
  NonSerializableContext,
  CircularReference,
  InvalidState,
  MachineIdMismatch,
} from "./errors.js";
import type { SerializationError, RestoreError } from "./errors.js";

// =============================================================================
// Serialized State Type
// =============================================================================

/**
 * A serialized representation of machine state.
 *
 * This is a plain JSON-serializable object that can be stored in
 * localStorage, a database, or sent over the wire.
 */
export interface SerializedMachineState {
  /** Schema version for forward compatibility. */
  readonly version: 1;
  /** The machine's unique identifier. */
  readonly machineId: string;
  /** The current state name. */
  readonly state: string;
  /** The serialized context value. */
  readonly context: unknown;
  /** Timestamp of when the state was serialized. */
  readonly timestamp: number;
}

// =============================================================================
// Serialization
// =============================================================================

/**
 * Serializes the current state of a machine runner into a plain object.
 *
 * The serialized state includes the machine ID, current state, context, and
 * a timestamp. It can be stored as JSON for persistence.
 *
 * @param runner - The machine runner to serialize
 * @param machineId - The machine's unique identifier
 * @returns Result with the serialized state, or error if context is not serializable
 *
 * @example
 * ```typescript
 * const result = serializeMachineState(runner, 'my-machine');
 * if (result._tag === 'Ok') {
 *   localStorage.setItem('state', JSON.stringify(result.value));
 * }
 * ```
 */
export function serializeMachineState(
  runner: MachineRunnerAny,
  machineId: string
): Result<SerializedMachineState, SerializationError> {
  const context = runner.context();

  // Validate serializability
  const validation = validateSerializable(context, "context");
  if (validation._tag === "Err") {
    return err(validation.error);
  }

  const serialized: SerializedMachineState = {
    version: 1,
    machineId,
    state: runner.state(),
    context,
    timestamp: Date.now(),
  };

  return ok(serialized);
}

// =============================================================================
// Restoration
// =============================================================================

/**
 * Validates a serialized machine state against a machine definition.
 *
 * Checks that:
 * - The machine ID matches
 * - The serialized state is a valid state in the machine
 *
 * Returns the validated state name and context if valid.
 *
 * @param serialized - The serialized state to validate
 * @param machine - The machine definition to validate against
 * @returns Result with `{ state, context }` on success, or RestoreError on failure
 *
 * @example
 * ```typescript
 * const data = JSON.parse(localStorage.getItem('state'));
 * const result = restoreMachineState(data, machine);
 * if (result._tag === 'Ok') {
 *   // Create runner with restored state
 *   const runner = createMachineRunner(machine, {
 *     executor,
 *     activityManager,
 *     initialState: result.value.state,
 *     initialContext: result.value.context,
 *   });
 * }
 * ```
 */
export function restoreMachineState(
  serialized: SerializedMachineState,
  machine: MachineAny
): Result<{ readonly state: string; readonly context: unknown }, RestoreError> {
  // Check machine ID
  if (serialized.machineId !== machine.id) {
    return err(
      MachineIdMismatch({
        serializedId: serialized.machineId,
        machineId: machine.id,
      })
    );
  }

  // Check state is valid
  const statesRecord = machine.states;
  const validStates = Object.keys(statesRecord);

  if (!validStates.includes(serialized.state)) {
    return err(
      InvalidState({
        stateName: serialized.state,
        validStates,
      })
    );
  }

  return ok({
    state: serialized.state,
    context: serialized.context,
  });
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Validates that a value is JSON-serializable.
 *
 * Detects:
 * - Functions (not serializable)
 * - Symbols (not serializable)
 * - Circular references
 *
 * @internal
 */
function validateSerializable(
  value: unknown,
  path: string,
  seen: Set<object> = new Set()
): Result<void, SerializationError> {
  if (value === null || value === undefined) {
    return ok(undefined);
  }

  const type = typeof value;

  if (type === "function") {
    return err(NonSerializableContext({ path, valueType: "function" }));
  }

  if (type === "symbol") {
    return err(NonSerializableContext({ path, valueType: "symbol" }));
  }

  if (type === "bigint") {
    return err(NonSerializableContext({ path, valueType: "bigint" }));
  }

  if (type === "string" || type === "number" || type === "boolean") {
    return ok(undefined);
  }

  // At this point, type === "object" and value is not null (handled above)
  if (typeof value === "object" && value !== null) {
    // Check for circular references
    if (seen.has(value)) {
      return err(CircularReference({ path }));
    }

    seen.add(value);

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const itemPath = `${path}[${i}]`;
        const itemResult = validateSerializable(value[i], itemPath, seen);
        if (itemResult._tag === "Err") {
          return itemResult;
        }
      }
    } else {
      for (const key of Object.keys(value)) {
        const propPath = `${path}.${key}`;
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        const propValue = descriptor !== undefined ? descriptor.value : undefined;
        const propResult = validateSerializable(propValue, propPath, seen);
        if (propResult._tag === "Err") {
          return propResult;
        }
      }
    }

    seen.delete(value);
  }

  return ok(undefined);
}
