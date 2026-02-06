/**
 * Specific error types for @hex-di/flow.
 *
 * Each error type provides contextual information specific to the error condition:
 * - InvalidTransitionError: No valid transition for event in current state
 * - InvalidStateError: Referenced state does not exist
 * - InvalidEventError: Event type not defined in machine
 * - ActivityError: Activity execution failed
 * - EffectExecutionError: Effect executor failed
 * - DisposedMachineError: Operation on disposed machine
 *
 * @packageDocumentation
 */

import { FlowError, extractErrorMessage } from "./base.js";

// =============================================================================
// Error Configuration Types
// =============================================================================

/**
 * Configuration for InvalidTransitionError.
 */
interface InvalidTransitionErrorConfig {
  /** The machine identifier where the error occurred */
  readonly machineId: string;
  /** The current state when the invalid transition was attempted */
  readonly currentState: string;
  /** The event type that had no valid transition */
  readonly eventType: string;
}

/**
 * Configuration for InvalidStateError.
 */
interface InvalidStateErrorConfig {
  /** The optional machine identifier */
  readonly machineId?: string;
  /** The name of the state that does not exist */
  readonly stateName: string;
}

/**
 * Configuration for InvalidEventError.
 */
interface InvalidEventErrorConfig {
  /** The optional machine identifier */
  readonly machineId?: string;
  /** The event type that is not defined */
  readonly eventType: string;
}

/**
 * Configuration for ActivityError.
 */
interface ActivityErrorConfig {
  /** The optional machine identifier */
  readonly machineId?: string;
  /** The ID of the activity that failed */
  readonly activityId: string;
  /** The original cause of the failure */
  readonly cause: unknown;
}

/**
 * Configuration for EffectExecutionError.
 */
interface EffectExecutionErrorConfig {
  /** The optional machine identifier */
  readonly machineId?: string;
  /** The effect tag (e.g., 'Invoke', 'Spawn', 'Emit') that failed */
  readonly effectTag: string;
  /** The original cause of the failure */
  readonly cause: unknown;
}

/**
 * Configuration for DisposedMachineError.
 */
interface DisposedMachineErrorConfig {
  /** The machine identifier */
  readonly machineId: string;
  /** The operation that was attempted on the disposed machine */
  readonly operation: string;
}

// =============================================================================
// InvalidTransitionError
// =============================================================================

/**
 * Error thrown when no valid transition exists for an event in the current state.
 *
 * This error occurs when:
 * - The event type has no transition defined in the current state
 * - All guarded transitions fail their guard conditions
 *
 * @remarks
 * - The `currentState` property shows where the machine was when the error occurred
 * - The `eventType` property shows what event was sent
 * - Use this information to debug missing transitions in your machine definition
 *
 * @example
 * ```typescript
 * try {
 *   runner.send({ type: 'CLOSE' });
 * } catch (error) {
 *   if (error instanceof InvalidTransitionError) {
 *     console.log(`State: ${error.currentState}, Event: ${error.eventType}`);
 *   }
 * }
 * ```
 */
export class InvalidTransitionError extends FlowError {
  readonly code = "INVALID_TRANSITION" as const;
  readonly machineId: string;

  /**
   * The current state when the invalid transition was attempted.
   */
  readonly currentState: string;

  /**
   * The event type that had no valid transition.
   */
  readonly eventType: string;

  /**
   * Creates a new InvalidTransitionError.
   *
   * @param config - Configuration with machineId, currentState, and eventType
   */
  constructor(config: InvalidTransitionErrorConfig) {
    super(
      `No valid transition for event '${config.eventType}' in state '${config.currentState}' ` +
        `of machine '${config.machineId}'.`
    );

    this.machineId = config.machineId;
    this.currentState = config.currentState;
    this.eventType = config.eventType;
  }
}

// =============================================================================
// InvalidStateError
// =============================================================================

/**
 * Error thrown when a referenced state does not exist in the machine definition.
 *
 * This error typically occurs at runtime when:
 * - A transition targets a non-existent state
 * - The initial state doesn't exist in the states object
 *
 * @remarks
 * - This usually indicates a configuration error in your machine definition
 * - Check that all transition targets match actual state names
 * - TypeScript should catch most of these at compile time
 *
 * @example
 * ```typescript
 * try {
 *   const machine = createMachine({ initial: 'nonexistent', states: {} });
 * } catch (error) {
 *   if (error instanceof InvalidStateError) {
 *     console.log(`Missing state: ${error.stateName}`);
 *   }
 * }
 * ```
 */
export class InvalidStateError extends FlowError {
  readonly code = "INVALID_STATE" as const;
  readonly machineId: string | undefined;

  /**
   * The name of the state that does not exist.
   */
  readonly stateName: string;

  /**
   * Creates a new InvalidStateError.
   *
   * @param config - Configuration with optional machineId and stateName
   */
  constructor(config: InvalidStateErrorConfig) {
    const machineContext = config.machineId ? ` in machine '${config.machineId}'` : "";

    super(
      `State '${config.stateName}' does not exist${machineContext}. ` +
        `Check that the state is defined in the machine's states object.`
    );

    this.machineId = config.machineId;
    this.stateName = config.stateName;
  }
}

// =============================================================================
// InvalidEventError
// =============================================================================

/**
 * Error thrown when an event type is not defined in the machine.
 *
 * This error occurs when attempting to send an event that the machine
 * doesn't recognize.
 *
 * @remarks
 * - This usually indicates a typo in the event type
 * - TypeScript should catch most of these at compile time
 * - At runtime, this may occur with dynamic event generation
 *
 * @example
 * ```typescript
 * try {
 *   runner.send({ type: 'TYPO_EVENT' });
 * } catch (error) {
 *   if (error instanceof InvalidEventError) {
 *     console.log(`Unknown event: ${error.eventType}`);
 *   }
 * }
 * ```
 */
export class InvalidEventError extends FlowError {
  readonly code = "INVALID_EVENT" as const;
  readonly machineId: string | undefined;

  /**
   * The event type that is not defined in the machine.
   */
  readonly eventType: string;

  /**
   * Creates a new InvalidEventError.
   *
   * @param config - Configuration with optional machineId and eventType
   */
  constructor(config: InvalidEventErrorConfig) {
    const machineContext = config.machineId ? ` in machine '${config.machineId}'` : "";

    super(
      `Event type '${config.eventType}' is not defined${machineContext}. ` +
        `Check that the event type matches one defined in your machine.`
    );

    this.machineId = config.machineId;
    this.eventType = config.eventType;
  }
}

// =============================================================================
// ActivityError
// =============================================================================

/**
 * Error thrown when an activity execution fails.
 *
 * This error wraps the original exception thrown by the activity's execute method,
 * providing context about which activity failed.
 *
 * @remarks
 * - The `cause` property contains the original exception
 * - This is a runtime error - activities can fail for various reasons
 * - Consider implementing retry logic for recoverable failures
 *
 * @example
 * ```typescript
 * try {
 *   await runner.sendAndExecute({ type: 'START_UPLOAD' });
 * } catch (error) {
 *   if (error instanceof ActivityError) {
 *     console.log(`Activity '${error.activityId}' failed:`, error.cause);
 *   }
 * }
 * ```
 */
export class ActivityError extends FlowError {
  readonly code = "ACTIVITY_FAILED" as const;
  readonly machineId: string | undefined;

  /**
   * The ID of the activity that failed.
   */
  readonly activityId: string;

  /**
   * The original exception thrown by the activity.
   * Can be any value since JavaScript allows throwing non-Error values.
   */
  readonly cause: unknown;

  /**
   * Creates a new ActivityError.
   *
   * @param config - Configuration with optional machineId, activityId, and cause
   */
  constructor(config: ActivityErrorConfig) {
    const causeMessage = extractErrorMessage(config.cause);
    const machineContext = config.machineId ? ` in machine '${config.machineId}'` : "";

    super(`Activity '${config.activityId}'${machineContext} failed: ${causeMessage}`);

    this.machineId = config.machineId;
    this.activityId = config.activityId;
    this.cause = config.cause;
  }
}

// =============================================================================
// EffectExecutionError
// =============================================================================

/**
 * Error thrown when an effect executor fails to execute an effect.
 *
 * This error wraps the original exception thrown during effect execution,
 * providing context about which effect type failed.
 *
 * @remarks
 * - The `effectTag` property indicates the type of effect (e.g., 'Invoke', 'Spawn')
 * - The `cause` property contains the original exception
 * - Common causes: port not found, method threw, network errors
 *
 * @example
 * ```typescript
 * try {
 *   await runner.sendAndExecute({ type: 'FETCH' });
 * } catch (error) {
 *   if (error instanceof EffectExecutionError) {
 *     console.log(`Effect '${error.effectTag}' failed:`, error.cause);
 *   }
 * }
 * ```
 */
export class EffectExecutionError extends FlowError {
  readonly code = "EFFECT_EXECUTION_FAILED" as const;
  readonly machineId: string | undefined;

  /**
   * The effect tag (type) that failed during execution.
   * Examples: 'Invoke', 'Spawn', 'Stop', 'Emit', 'Delay'
   */
  readonly effectTag: string;

  /**
   * The original exception thrown during effect execution.
   * Can be any value since JavaScript allows throwing non-Error values.
   */
  readonly cause: unknown;

  /**
   * Creates a new EffectExecutionError.
   *
   * @param config - Configuration with optional machineId, effectTag, and cause
   */
  constructor(config: EffectExecutionErrorConfig) {
    const causeMessage = extractErrorMessage(config.cause);
    const machineContext = config.machineId ? ` in machine '${config.machineId}'` : "";

    super(`Effect '${config.effectTag}'${machineContext} execution failed: ${causeMessage}`);

    this.machineId = config.machineId;
    this.effectTag = config.effectTag;
    this.cause = config.cause;
  }
}

// =============================================================================
// DisposedMachineError
// =============================================================================

/**
 * Error thrown when attempting to perform an operation on a disposed machine.
 *
 * Once a machine runner is disposed, it cannot be used to send events,
 * subscribe to changes, or perform any other operations.
 *
 * @remarks
 * - This is a programming error - code should not use disposed runners
 * - The `operation` property indicates what was attempted
 * - Check your runner lifecycle management if this error occurs
 *
 * @example
 * ```typescript
 * await runner.dispose();
 *
 * // This will throw DisposedMachineError:
 * runner.send({ type: 'FETCH' });
 * ```
 */
export class DisposedMachineError extends FlowError {
  readonly code = "DISPOSED_MACHINE" as const;
  readonly machineId: string;

  /**
   * The operation that was attempted on the disposed machine.
   * Examples: 'send', 'sendAndExecute', 'subscribe'
   */
  readonly operation: string;

  /**
   * Creates a new DisposedMachineError.
   *
   * @param config - Configuration with machineId and operation
   */
  constructor(config: DisposedMachineErrorConfig) {
    super(
      `Cannot perform '${config.operation}' on disposed machine '${config.machineId}'. ` +
        `The machine has already been disposed and cannot be used.`
    );

    this.machineId = config.machineId;
    this.operation = config.operation;
  }
}
