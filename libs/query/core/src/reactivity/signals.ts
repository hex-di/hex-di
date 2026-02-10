/**
 * Signal Reactivity Primitives
 *
 * Wraps alien-signals to provide HexDI-specific signal primitives:
 * Signal, Computed, ReactiveEffect.
 *
 * Supports optional `ReactiveSystemInstance` for per-container signal isolation.
 * When no system is provided, a shared default system is used.
 *
 * @packageDocumentation
 */

import {
  signal as alienSignal,
  computed as alienComputed,
  effect as alienEffect,
  startBatch as alienStartBatch,
  endBatch as alienEndBatch,
  getActiveSub as alienGetActiveSub,
  setActiveSub as alienSetActiveSub,
} from "alien-signals";
import type { ReactiveSystemInstance } from "./system-factory.js";

/**
 * Runs `fn` outside the current reactive tracking scope.
 *
 * When a `system` is provided, uses that system's subscriber tracking.
 * Otherwise uses the global alien-signals tracking.
 */
export function untracked<T>(fn: () => T, system?: ReactiveSystemInstance): T {
  if (system !== undefined) {
    const prev = system.getActiveSub();
    system.setActiveSub(undefined);
    try {
      return fn();
    } finally {
      system.setActiveSub(prev);
    }
  }
  const prev = alienGetActiveSub();
  alienSetActiveSub(undefined);
  try {
    return fn();
  } finally {
    alienSetActiveSub(prev);
  }
}

// =============================================================================
// Signal
// =============================================================================

/** A reactive value that tracks dependents */
export interface Signal<T> {
  /** Read the current value and register as a dependency */
  get(): T;
  /** Write a new value and notify dependents */
  set(value: T): void;
  /** Read without tracking (no dependency registration) */
  peek(): T;
}

/**
 * Creates a reactive signal.
 *
 * @param initial - Initial signal value
 * @param system - Optional isolated reactive system. When provided, the signal
 *   lives in that system's dependency graph instead of the global one.
 */
export function createSignal<T>(initial: T, system?: ReactiveSystemInstance): Signal<T> {
  if (system !== undefined) {
    const s = system.signal(initial);
    return {
      get: () => s(),
      set: (value: T) => {
        s(value);
      },
      peek: () => untracked(() => s(), system),
    };
  }
  const s = alienSignal(initial);
  return {
    get: () => s(),
    set: (value: T) => {
      s(value);
    },
    peek: () => untracked(() => s()),
  };
}

// =============================================================================
// Computed
// =============================================================================

/** A derived signal that auto-tracks dependencies */
export interface Computed<T> {
  /** Read the computed value (lazy, cached until deps change) */
  get(): T;
  /** Read without tracking */
  peek(): T;
}

/**
 * Creates a computed signal.
 *
 * @param fn - Computation function
 * @param system - Optional isolated reactive system
 */
export function createComputed<T>(fn: () => T, system?: ReactiveSystemInstance): Computed<T> {
  if (system !== undefined) {
    const c = system.computed(fn);
    return {
      get: () => c(),
      peek: () => untracked(() => c(), system),
    };
  }
  const c = alienComputed(fn);
  return {
    get: () => c(),
    peek: () => untracked(() => c()),
  };
}

// =============================================================================
// ReactiveEffect
// =============================================================================

/** A reactive effect that runs when tracked signals change */
export interface ReactiveEffect {
  /** Run the effect and track dependencies */
  run(): void;
  /** Stop tracking and dispose */
  dispose(): void;
}

/**
 * Creates a reactive effect.
 *
 * @param fn - Effect function (runs immediately and re-runs when deps change)
 * @param system - Optional isolated reactive system
 */
export function createEffect(fn: () => void, system?: ReactiveSystemInstance): ReactiveEffect {
  let disposed = false;
  const stop = system !== undefined ? system.effect(fn) : alienEffect(fn);

  return {
    run: () => {
      if (!disposed) {
        fn();
      }
    },
    dispose: () => {
      if (!disposed) {
        disposed = true;
        stop();
      }
    },
  };
}

// =============================================================================
// Batching (re-export global alien-signals batching for backward compat)
// =============================================================================

export { alienStartBatch as startBatch, alienEndBatch as endBatch };
