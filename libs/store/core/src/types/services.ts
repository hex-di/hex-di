/**
 * Service Interface Types
 *
 * Defines StateService, AtomService, DerivedService, AsyncDerivedService,
 * LinkedDerivedService, and related types.
 *
 * @packageDocumentation
 */

import type { DeepReadonly } from "./deep-readonly.js";
import type { ActionMap, BoundActions } from "./actions.js";

// =============================================================================
// Common Types
// =============================================================================

/** Unsubscribe function returned by subscribe calls */
export type Unsubscribe = () => void;

/** Listener for full state changes */
export type StateListener<TState> = (
  state: DeepReadonly<TState>,
  prev: DeepReadonly<TState>
) => void;

// =============================================================================
// StateService
// =============================================================================

/**
 * Service interface for state ports.
 *
 * Provides reactive state access, bound actions, and subscriptions.
 * The `actions` object and each bound action function are referentially
 * stable for the lifetime of the service instance.
 */
export interface StateService<TState, TActions extends ActionMap<TState>> {
  /** Current state snapshot (deeply frozen, immutable) */
  readonly state: DeepReadonly<TState>;

  /**
   * Type-safe bound actions.
   * Referentially stable for the lifetime of the service instance.
   */
  readonly actions: BoundActions<TState, TActions>;

  /** Whether this service has been disposed. */
  readonly isDisposed: boolean;

  /** Subscribe to all state changes */
  subscribe(listener: StateListener<TState>): Unsubscribe;

  /** Subscribe to a selected slice with optional equality function */
  subscribe<TSelected>(
    selector: (state: DeepReadonly<TState>) => TSelected,
    listener: (value: TSelected, prev: TSelected) => void,
    equalityFn?: (a: TSelected, b: TSelected) => boolean
  ): Unsubscribe;
}

// =============================================================================
// AtomService
// =============================================================================

/**
 * Service interface for atom ports.
 *
 * Simple reactive values with get/set/update. No actions.
 * `set` and `update` functions are referentially stable.
 */
export interface AtomService<TValue> {
  /** Current value (deeply frozen) */
  readonly value: DeepReadonly<TValue>;

  /** Whether this service has been disposed. */
  readonly isDisposed: boolean;

  /** Replace the value. Referentially stable. */
  set(value: TValue): void;

  /** Update the value with a function. Referentially stable. */
  update(fn: (current: TValue) => TValue): void;

  /** Subscribe to value changes */
  subscribe(
    listener: (value: DeepReadonly<TValue>, prev: DeepReadonly<TValue>) => void
  ): Unsubscribe;
}

// =============================================================================
// DerivedService
// =============================================================================

/**
 * Service interface for derived ports.
 *
 * Read-only computed values derived from other state.
 */
export interface DerivedService<TResult> {
  /** Current computed value (deeply frozen) */
  readonly value: DeepReadonly<TResult>;

  /** Whether this service has been disposed. */
  readonly isDisposed: boolean;

  /** Subscribe to recomputation */
  subscribe(
    listener: (value: DeepReadonly<TResult>, prev: DeepReadonly<TResult>) => void
  ): Unsubscribe;
}

// =============================================================================
// AsyncDerivedSnapshot
// =============================================================================

/**
 * Discriminated union snapshot for async derived services.
 *
 * Each variant narrows the available fields based on status.
 * When E is never (default), the error variant uses unknown.
 */
export type AsyncDerivedSnapshot<TResult, E = never> =
  | {
      readonly status: "idle";
      readonly data: undefined;
      readonly error: undefined;
      readonly isLoading: false;
    }
  | {
      readonly status: "loading";
      readonly data: DeepReadonly<TResult> | undefined;
      readonly error: undefined;
      readonly isLoading: true;
    }
  | {
      readonly status: "success";
      readonly data: DeepReadonly<TResult>;
      readonly error: undefined;
      readonly isLoading: false;
    }
  | {
      readonly status: "error";
      readonly data: undefined;
      readonly error: [E] extends [never] ? unknown : E;
      readonly isLoading: false;
    };

// =============================================================================
// AsyncDerivedService
// =============================================================================

/**
 * Service interface for async derived ports.
 *
 * Computed values from async operations (API calls, lazy imports).
 * `refresh` is referentially stable.
 */
export interface AsyncDerivedService<TResult, E = never> {
  /** Current snapshot as a discriminated union */
  readonly snapshot: AsyncDerivedSnapshot<TResult, E>;

  /** Convenience: current status */
  readonly status: AsyncDerivedSnapshot<TResult, E>["status"];

  /** Convenience flag: true when status is "loading" */
  readonly isLoading: boolean;

  /** Whether this service has been disposed. */
  readonly isDisposed: boolean;

  /** Trigger a re-fetch. Referentially stable. */
  refresh(): void;

  /** Subscribe to status/data/error changes */
  subscribe(listener: (snapshot: AsyncDerivedSnapshot<TResult, E>) => void): Unsubscribe;
}

// =============================================================================
// LinkedDerivedService
// =============================================================================

/**
 * Service interface for bidirectional derived ports.
 *
 * Extends DerivedService with a write-back capability.
 * `set` is referentially stable.
 */
export interface LinkedDerivedService<TResult> extends DerivedService<TResult> {
  /** Write back to source state. Referentially stable. */
  set(value: TResult): void;
}
