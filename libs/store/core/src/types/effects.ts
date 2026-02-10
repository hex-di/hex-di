/**
 * Effect Types Module
 *
 * Defines EffectMap, EffectContext, ActionEffect, ActionEvent,
 * EffectErrorHandler, and related types.
 *
 * @packageDocumentation
 */

import type { ResultAsync } from "@hex-di/result";
import type { EffectFailedError } from "../errors/tagged-errors.js";
import type { DeepReadonly } from "./deep-readonly.js";
import type { ActionMap, BoundActions } from "./actions.js";

// =============================================================================
// EffectContext
// =============================================================================

/**
 * Context passed to effect functions after a reducer runs.
 */
export interface EffectContext<
  TState,
  TActions extends ActionMap<TState>,
  K extends keyof TActions,
> {
  readonly state: DeepReadonly<TState>;
  readonly prevState: DeepReadonly<TState>;
  readonly payload: TActions[K] extends (state: TState, payload: infer P) => TState ? P : void;
}

// =============================================================================
// EffectMap
// =============================================================================

/**
 * Maps action names to effect functions.
 * Effects return void for sync effects or ResultAsync for async effects.
 */
export type EffectMap<TState, TActions extends ActionMap<TState>> = {
  [K in keyof TActions]: (
    context: EffectContext<TState, TActions, K>
  ) => void | ResultAsync<void, unknown>;
};

// =============================================================================
// EffectErrorHandler
// =============================================================================

/**
 * Handler for effect failures. Receives context and bound actions
 * for dispatching compensating actions.
 */
export interface EffectErrorHandler<TState, TActions extends ActionMap<TState>> {
  (context: {
    readonly error: EffectFailedError;
    readonly actionName: keyof TActions & string;
    readonly state: DeepReadonly<TState>;
    readonly prevState: DeepReadonly<TState>;
    readonly actions: BoundActions<TState, TActions>;
  }): void;
}

// =============================================================================
// ActionEffect (Effect-as-Port pattern)
// =============================================================================

/**
 * Service interface for effect ports.
 * Receives action events from all state ports.
 */
export interface ActionEffect {
  onAction(event: ActionEvent): void | Promise<void>;
}

/**
 * Event dispatched to effect ports after a state transition.
 */
export interface ActionEvent {
  readonly portName: string;
  readonly actionName: string;
  readonly payload: unknown;
  readonly prevState: unknown;
  readonly nextState: unknown;
  readonly timestamp: number;
  readonly phase: "action" | "effect-error";
  readonly error?: EffectFailedError;
  /** W3C Trace Context trace ID (present when @hex-di/tracing is active) */
  readonly traceId?: string;
}
