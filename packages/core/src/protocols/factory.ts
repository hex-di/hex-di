/**
 * Protocol Factory — defineProtocol
 *
 * Creates frozen ProtocolSpec instances from a declarative configuration.
 * The factory validates that all transition targets reference valid states
 * and that the initial state is a member of the state set.
 *
 * Implements: BEH-CO-12-001, BEH-CO-12-002
 *
 * @packageDocumentation
 */

import type { ProtocolSpec, TransitionMap } from "./types.js";
import { ContainerError } from "../errors/base.js";

// =============================================================================
// InvalidProtocolError
// =============================================================================

/**
 * Error thrown when a protocol definition is invalid.
 *
 * This error is thrown at protocol-definition time (not at resolution time)
 * when the transition map references states that are not in the declared
 * state set, or when the initial state is not a declared state.
 */
export class InvalidProtocolError extends ContainerError {
  readonly _tag = "InvalidProtocol" as const;
  readonly code = "INVALID_PROTOCOL" as const;
  readonly isProgrammingError = true as const;

  /** The protocol name that failed validation */
  readonly protocolName: string;

  /** Description of what is wrong */
  readonly reason: string;

  constructor(protocolName: string, reason: string) {
    super(`Invalid protocol '${protocolName}': ${reason}`);
    this.protocolName = protocolName;
    this.reason = reason;
    Object.freeze(this);
  }
}

// =============================================================================
// DefineProtocolConfig
// =============================================================================

/**
 * Configuration for defining a protocol state machine.
 *
 * @typeParam TStates - Union of valid state string literals
 * @typeParam TMap - The transition map type
 */
export interface DefineProtocolConfig<
  TStates extends string,
  TMap extends Record<TStates, Record<string, TStates>>,
> {
  /** Human-readable name of the protocol */
  readonly name: string;

  /** All valid states as a readonly tuple */
  readonly states: readonly TStates[];

  /** The initial state when a service is first resolved */
  readonly initialState: TStates;

  /** Transition table: transitions[fromState][method] = toState */
  readonly transitions: TMap;
}

// =============================================================================
// defineProtocol
// =============================================================================

/**
 * Creates a frozen `ProtocolSpec` from a declarative configuration.
 *
 * Validates at runtime that:
 * 1. The initial state is a member of the declared states
 * 2. All source states in the transition map are declared states
 * 3. All target states in the transition map are declared states
 *
 * @typeParam TStates - Union of valid state literals
 * @typeParam TMap - The transition map type
 * @param config - The protocol definition
 * @returns A frozen `ProtocolSpec`
 * @throws InvalidProtocolError if the protocol definition is invalid
 *
 * @example
 * ```ts
 * const dbProtocol = defineProtocol({
 *   name: "DatabaseConnection",
 *   states: ["disconnected", "connected"] as const,
 *   initialState: "disconnected",
 *   transitions: {
 *     disconnected: { connect: "connected" },
 *     connected: { query: "connected", close: "disconnected" },
 *   },
 * });
 * ```
 */
export function defineProtocol<
  TStates extends string,
  TMap extends Record<TStates, Record<string, TStates>>,
>(config: DefineProtocolConfig<TStates, TMap>): ProtocolSpec<TStates, TMap & TransitionMap> {
  const stateSet = new Set<string>(config.states);

  // Validate initial state
  if (!stateSet.has(config.initialState)) {
    throw new InvalidProtocolError(
      config.name,
      `Initial state '${config.initialState}' is not in the declared states: [${config.states.join(", ")}]`
    );
  }

  // Validate transition map
  const transitionEntries = Object.entries(config.transitions) as ReadonlyArray<
    [string, Record<string, string>]
  >;

  for (const [sourceState, methods] of transitionEntries) {
    if (!stateSet.has(sourceState)) {
      throw new InvalidProtocolError(
        config.name,
        `Source state '${sourceState}' in transitions is not in the declared states: [${config.states.join(", ")}]`
      );
    }

    const methodEntries = Object.entries(methods) as ReadonlyArray<[string, string]>;
    for (const [method, targetState] of methodEntries) {
      if (!stateSet.has(targetState)) {
        throw new InvalidProtocolError(
          config.name,
          `Transition target '${targetState}' (from state '${sourceState}', method '${method}') is not in the declared states: [${config.states.join(", ")}]`
        );
      }
    }
  }

  // Deep-freeze the transitions
  const frozenTransitions = Object.freeze(
    Object.fromEntries(
      transitionEntries.map(([state, methods]) => [state, Object.freeze({ ...methods })])
    )
  );

  const spec: ProtocolSpec<TStates, TMap & TransitionMap> = Object.freeze({
    name: config.name,
    states: Object.freeze([...config.states]),
    initialState: config.initialState,
    transitions: frozenTransitions as Readonly<TMap & TransitionMap>,
  });

  return spec;
}

// =============================================================================
// Runtime Protocol Validation Utilities
// =============================================================================

/**
 * Checks at runtime whether a method is available in the given protocol state.
 *
 * @param spec - The protocol specification
 * @param state - The current state
 * @param method - The method name to check
 * @returns `true` if the method is available, `false` otherwise
 */
export function isMethodAvailable(spec: ProtocolSpec, state: string, method: string): boolean {
  const stateMethods = spec.transitions[state];
  if (!stateMethods) return false;
  return method in stateMethods;
}

/**
 * Returns the next state after invoking a method in the given state.
 *
 * @param spec - The protocol specification
 * @param state - The current state
 * @param method - The method being invoked
 * @returns The next state, or `undefined` if the method is not available
 */
export function getNextState(
  spec: ProtocolSpec,
  state: string,
  method: string
): string | undefined {
  const stateMethods = spec.transitions[state];
  if (!stateMethods) return undefined;
  return stateMethods[method];
}

/**
 * Returns all method names available in a given protocol state.
 *
 * @param spec - The protocol specification
 * @param state - The current state
 * @returns Array of available method names (frozen)
 */
export function getAvailableMethodNames(spec: ProtocolSpec, state: string): ReadonlyArray<string> {
  const stateMethods = spec.transitions[state];
  if (!stateMethods) return Object.freeze([]);
  return Object.freeze(Object.keys(stateMethods));
}
