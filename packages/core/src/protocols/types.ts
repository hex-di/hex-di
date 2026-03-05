/**
 * Protocol State Machine Types
 *
 * Defines the type-level building blocks for encoding protocol state machines
 * as phantom types. Service interfaces parameterized by state enable compile-time
 * enforcement of valid call sequences (session types pattern).
 *
 * Implements: BEH-CO-12-001, BEH-CO-12-002, BEH-CO-12-003
 *
 * @packageDocumentation
 */

import type { Port } from "../ports/types.js";

// =============================================================================
// Brand Symbol
// =============================================================================

/**
 * Unique symbol used for phantom branding of protocol state.
 *
 * This is a phantom brand -- it exists only at the type level with no
 * runtime representation. The `declare const` ensures TypeScript treats it
 * as a unique symbol type without generating any JavaScript code.
 */
declare const __protocolStateBrand: unique symbol;

// =============================================================================
// ProtocolPort
// =============================================================================

/**
 * A port augmented with a phantom protocol state parameter.
 *
 * The phantom `TState` encodes the current protocol phase at the type level.
 * The container resolves ProtocolPorts to services in their initial state,
 * and each method invocation returns the service in the next valid state
 * as defined by the protocol's transition map.
 *
 * @typeParam TName - The literal string type for the port name
 * @typeParam TService - The service interface type (parameterized by state)
 * @typeParam TState - The current protocol state (phantom parameter)
 */
export type ProtocolPort<TName extends string, TService, TState extends string = "initial"> = Port<
  TName,
  TService
> & {
  readonly [__protocolStateBrand]: TState;
};

// =============================================================================
// TransitionMap
// =============================================================================

/**
 * A type-level mapping from `(State, Method)` to `NextState`.
 *
 * Each protocol defines its own transition map. The keys are states, the
 * values are records mapping method names to target states.
 *
 * @example
 * ```ts
 * type DBTransitions = {
 *   disconnected: { connect: "connected" };
 *   connected: { query: "connected"; close: "disconnected" };
 * };
 * ```
 */
export type TransitionMap = Record<string, Record<string, string>>;

// =============================================================================
// Transition
// =============================================================================

/**
 * Looks up the next state after invoking `TMethod` in `TState`.
 *
 * Returns `never` if the method is not available in the given state,
 * or if the state is not in the transition map.
 *
 * @typeParam TMap - The protocol's transition map
 * @typeParam TState - The current state
 * @typeParam TMethod - The method being invoked
 */
export type Transition<
  TMap extends TransitionMap,
  TState extends string,
  TMethod extends string,
> = TState extends keyof TMap
  ? TMethod extends keyof TMap[TState]
    ? TMap[TState][TMethod]
    : never
  : never;

// =============================================================================
// AvailableMethods
// =============================================================================

/**
 * Extracts the set of method names available in a given protocol state.
 *
 * Returns the union of method names (keys) from the transition map entry
 * for the given state. Returns `never` if the state is not in the map.
 *
 * @typeParam TMap - The protocol's transition map
 * @typeParam TState - The current state
 */
export type AvailableMethods<
  TMap extends TransitionMap,
  TState extends string,
> = TState extends keyof TMap ? keyof TMap[TState] & string : never;

// =============================================================================
// ProtocolError
// =============================================================================

/**
 * Descriptive error type for invalid protocol method invocations.
 *
 * When a method is called in a state where it is not available, the type
 * system resolves to this branded error type instead of an opaque `never`.
 * IDE tooltips display the structured error for developer guidance.
 *
 * Follows the same pattern as `NotAPortError` in `ports/types.ts`.
 *
 * @typeParam TState - The current protocol state
 * @typeParam TMethod - The method that was attempted
 * @typeParam TAvailable - The methods available in the current state
 */
export type ProtocolError<
  TState extends string,
  TMethod extends string,
  TAvailable extends string,
> = {
  readonly __errorBrand: "ProtocolSequenceError";
  readonly __message: `Method '${TMethod}' is not available in state '${TState}'`;
  readonly __availableMethods: TAvailable;
  readonly __currentState: TState;
};

// =============================================================================
// ProtocolMethod
// =============================================================================

/**
 * Conditionally types a method based on the protocol state.
 *
 * If the method is available in `TState` (exists in the transition map),
 * yields `TSignature`. Otherwise yields `never`.
 *
 * @typeParam TMap - The protocol's transition map
 * @typeParam TState - The current protocol state
 * @typeParam TMethod - The method name
 * @typeParam TSignature - The method's type signature when available
 */
export type ProtocolMethod<
  TMap extends TransitionMap,
  TState extends string,
  TMethod extends string,
  TSignature,
> = TState extends keyof TMap ? (TMethod extends keyof TMap[TState] ? TSignature : never) : never;

// =============================================================================
// ProtocolSpec
// =============================================================================

/**
 * A protocol specification describing the state machine for a service.
 *
 * This is the runtime counterpart of the type-level transition map.
 * It carries the protocol's name, states, initial state, and transition
 * table for runtime introspection and validation.
 *
 * @typeParam TStates - Union of valid state string literals
 * @typeParam TMap - The transition map type
 */
export interface ProtocolSpec<
  TStates extends string = string,
  TMap extends TransitionMap = TransitionMap,
> {
  /** Human-readable name of the protocol */
  readonly name: string;

  /** All valid states in this protocol */
  readonly states: ReadonlyArray<TStates>;

  /** The initial state when a service is first resolved */
  readonly initialState: TStates;

  /** Runtime transition table: transitions[fromState][method] = toState */
  readonly transitions: Readonly<TMap>;
}

// =============================================================================
// ValidateTransitionMap
// =============================================================================

/**
 * Validates that a transition map only references states that exist in the
 * protocol's state set. Returns `true` if valid, or a descriptive error
 * type if target states reference unknown states.
 *
 * @typeParam TStates - The set of valid states
 * @typeParam TMap - The transition map to validate
 */
export type ValidateTransitionMap<
  TStates extends string,
  TMap extends Record<string, Record<string, string>>,
> = {
  [S in keyof TMap]: S extends TStates
    ? {
        [M in keyof TMap[S]]: TMap[S][M] extends TStates
          ? true
          : {
              readonly __errorBrand: "InvalidTransitionTarget";
              readonly __message: `Transition target '${TMap[S][M] & string}' from state '${S & string}' method '${M & string}' is not a valid state`;
              readonly __validStates: TStates;
            };
      }
    : {
        readonly __errorBrand: "InvalidSourceState";
        readonly __message: `Source state '${S & string}' is not in the protocol's state set`;
        readonly __validStates: TStates;
      };
};

// =============================================================================
// IsValidProtocol
// =============================================================================

/**
 * Boolean check: is every target state in the transition map a member of TStates?
 *
 * @typeParam TStates - The set of valid states
 * @typeParam TMap - The transition map
 */
export type IsValidProtocol<
  TStates extends string,
  TMap extends Record<string, Record<string, string>>,
> = keyof TMap extends TStates ? _AllTargetsValid<TStates, TMap, keyof TMap & string> : false;

/**
 * @internal Helper: checks all target states across all source states
 */
type _AllTargetsValid<
  TStates extends string,
  TMap extends Record<string, Record<string, string>>,
  TKeys extends string,
> = TKeys extends infer K extends string
  ? K extends keyof TMap
    ? TMap[K][keyof TMap[K] & string] extends TStates
      ? true
      : false
    : true
  : true;
