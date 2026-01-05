/**
 * Machine Configuration Types
 *
 * This module provides the MachineConfig type for defining complete state
 * machine configurations. Key features:
 *
 * - `id`: Machine identifier string
 * - `initial`: Must exist in states (compile-time checked)
 * - `states`: Record mapping state names to StateNode configurations
 * - `context`: Optional initial context value
 *
 * @packageDocumentation
 */

import type { StateNode } from "./state-node.js";

// =============================================================================
// MachineConfig Type
// =============================================================================

/**
 * Configuration for a complete state machine definition.
 *
 * The MachineConfig type ensures compile-time validation of:
 * - Initial state exists in the states record
 * - All state transitions reference valid states
 * - Context type is consistent across the machine
 *
 * @typeParam TStateNames - Union of all state names (e.g., 'idle' | 'loading' | 'success')
 * @typeParam TEventNames - Union of all event type names (e.g., 'FETCH' | 'SUCCESS')
 * @typeParam TContext - The machine's context type
 *
 * @remarks
 * The machine configuration is validated at compile time:
 * - `initial` must be a member of TStateNames
 * - Each key in `states` must be a member of TStateNames
 * - All transition targets in StateNodes must reference valid states
 *
 * The context represents persistent data that can be transformed by
 * transition actions. If your machine doesn't need context, you can
 * omit the context property entirely.
 *
 * @example Basic machine config
 * ```typescript
 * const config: MachineConfig<
 *   'idle' | 'loading' | 'success',
 *   'FETCH' | 'SUCCESS',
 *   { data: string | null }
 * > = {
 *   id: 'fetcher',
 *   initial: 'idle',
 *   context: { data: null },
 *   states: {
 *     idle: {
 *       on: { FETCH: { target: 'loading' } },
 *     },
 *     loading: {
 *       on: { SUCCESS: { target: 'success' } },
 *     },
 *     success: {
 *       on: {},
 *     },
 *   },
 * };
 * ```
 *
 * @example Machine without context
 * ```typescript
 * const config: MachineConfig<
 *   'off' | 'on',
 *   'TOGGLE',
 *   void
 * > = {
 *   id: 'toggle',
 *   initial: 'off',
 *   states: {
 *     off: { on: { TOGGLE: { target: 'on' } } },
 *     on: { on: { TOGGLE: { target: 'off' } } },
 *   },
 * };
 * ```
 */
export interface MachineConfig<TStateNames extends string, TEventNames extends string, TContext> {
  /**
   * Unique identifier for this machine.
   *
   * The ID is used for debugging, tracing, and DevTools integration.
   * It should be unique within your application.
   */
  readonly id: string;

  /**
   * The initial state name.
   *
   * Must be a valid state name that exists in the `states` record.
   * This is enforced at compile time by the TStateNames constraint.
   */
  readonly initial: TStateNames;

  /**
   * Record mapping state names to their configurations.
   *
   * Each key must be a member of TStateNames, and the value is a
   * StateNode configuration defining that state's behavior.
   */
  readonly states: MachineStatesRecord<TStateNames, TEventNames, TContext>;

  /**
   * Optional initial context value.
   *
   * If TContext is not void, this should be provided to set the
   * machine's initial context value.
   */
  readonly context?: TContext;
}

// =============================================================================
// MachineStatesRecord Type
// =============================================================================

/**
 * Record type mapping state names to StateNode configurations.
 *
 * This type ensures that:
 * - All keys are valid state names from TStateNames
 * - All StateNode configurations have access to valid transition targets
 *
 * @typeParam TStateNames - Union of all state names
 * @typeParam TEventNames - Union of all event type names
 * @typeParam TContext - The context type
 */
export type MachineStatesRecord<
  TStateNames extends string,
  TEventNames extends string,
  TContext,
> = {
  readonly [K in TStateNames]: StateNode<TStateNames, TEventNames, TContext>;
};

// =============================================================================
// MachineConfigAny - Universal Constraint Type
// =============================================================================

/**
 * Structural interface matching ANY MachineConfig without using `any`.
 *
 * This uses TypeScript's variance rules to create a type that ALL MachineConfigs
 * are assignable to. It constrains only the shape of the config without
 * specifying concrete state, event, or context types.
 *
 * When used as a constraint `<C extends MachineConfigAny>`, the generic parameter `C`
 * preserves the EXACT config type for full inference.
 *
 * @remarks
 * This follows the AdapterAny pattern from `@hex-di/graph` to avoid using `any`.
 */
export interface MachineConfigAny {
  /**
   * Machine identifier.
   */
  readonly id: string;

  /**
   * Initial state name.
   */
  readonly initial: string;

  /**
   * States record with string keys.
   */
  readonly states: Record<string, unknown>;

  /**
   * Optional context value.
   */
  readonly context?: unknown;
}
