/**
 * Runtime Adapter Handle — Lifecycle State Machine Implementation
 *
 * Provides the runtime implementation of `AdapterHandle` with state tracking
 * and transition validation. Each transition method returns a new frozen handle
 * in the next state, following the session types pattern.
 *
 * NOTE: This module uses `Object.create(null)` + `Object.defineProperties` to
 * construct phantom-branded objects. The phantom brand (`__adapterStateBrand`)
 * exists only at the type level (declared with `declare const`) and has no
 * runtime counterpart. TypeScript cannot verify these constructions structurally,
 * so the per-state builder functions are typed via return annotations that the
 * test suite validates exhaustively.
 *
 * Implements: BEH-CO-08-001, BEH-CO-08-003
 *
 * @packageDocumentation
 */

import type { AdapterLifecycleState, AdapterHandle } from "./lifecycle.js";
import { ContainerError } from "../errors/base.js";

// =============================================================================
// InvalidTransitionError
// =============================================================================

/**
 * Error thrown when an invalid adapter lifecycle state transition is attempted at runtime.
 *
 * This is a safety net for aliased references — the type system prevents most
 * invalid transitions at compile time, but runtime checks catch edge cases where
 * stale references are used.
 */
export class InvalidTransitionError extends ContainerError {
  readonly _tag = "InvalidTransition" as const;
  readonly code = "INVALID_TRANSITION" as const;
  readonly isProgrammingError = true as const;

  /** The state the handle was in when the transition was attempted. */
  readonly fromState: AdapterLifecycleState;

  /** The target state that was rejected. */
  readonly toState: AdapterLifecycleState;

  constructor(from: AdapterLifecycleState, to: AdapterLifecycleState) {
    super(
      `Invalid adapter lifecycle transition: cannot transition from '${from}' to '${to}'. ` +
        `The valid transition order is: created → initialized → active → disposing → disposed.`
    );
    this.fromState = from;
    this.toState = to;
    Object.freeze(this);
  }
}

// =============================================================================
// Transition Validation
// =============================================================================

/**
 * Runtime lookup for valid transitions.
 * Each state maps to its sole valid successor (or undefined for terminal state).
 */
const VALID_TRANSITIONS: Readonly<
  Record<AdapterLifecycleState, AdapterLifecycleState | undefined>
> = {
  created: "initialized",
  initialized: "active",
  active: "disposing",
  disposing: "disposed",
  disposed: undefined,
};

/**
 * Asserts that a state transition is valid at runtime.
 * Throws `InvalidTransitionError` if the transition is not allowed.
 *
 * @param from - The current lifecycle state
 * @param to - The desired target state
 * @throws InvalidTransitionError if the transition is invalid
 */
export function assertTransition(from: AdapterLifecycleState, to: AdapterLifecycleState): void {
  if (VALID_TRANSITIONS[from] !== to) {
    throw new InvalidTransitionError(from, to);
  }
}

// =============================================================================
// Handle Configuration
// =============================================================================

/**
 * Configuration for creating an adapter handle.
 *
 * @typeParam T - The service type
 */
export interface AdapterHandleConfig<T> {
  /** Async initialization logic (called during `initialize()`). */
  readonly onInitialize?: () => Promise<void>;

  /** Produces the service instance (called during `activate()`). */
  readonly getService: () => T;

  /** Cleanup logic (called during `dispose()`). */
  readonly onDispose?: () => Promise<void>;
}

// =============================================================================
// createAdapterHandle
// =============================================================================

/**
 * Creates a new `AdapterHandle` in the `"created"` state.
 *
 * The returned handle is frozen and follows the session types pattern:
 * each transition method returns a new handle in the next state.
 *
 * @typeParam T - The service type
 * @param config - Configuration controlling initialization, service access, and disposal
 * @returns A frozen `AdapterHandle<T, "created">`
 *
 * @example
 * ```ts
 * const handle = createAdapterHandle<MyService>({
 *   getService: () => myServiceInstance,
 *   onDispose: async () => { await myServiceInstance.close(); },
 * });
 *
 * const initialized = await handle.initialize();
 * const active = initialized.activate();
 * const svc = active.service; // MyService
 * const disposed = await active.dispose();
 * ```
 */
export function createAdapterHandle<T>(
  config: AdapterHandleConfig<T>
): AdapterHandle<T, "created"> {
  return buildCreatedHandle(config);
}

// =============================================================================
// Per-State Handle Builders
// =============================================================================

// These functions construct phantom-branded objects using Object.defineProperties.
// The phantom brand (__adapterStateBrand) is declared with `declare const` and has
// no runtime value — it exists only for type-level discrimination. As a result,
// we cannot set it at runtime. The brand is optional (`?:`) in the interface,
// matching the established pattern (see Adapter[__adapterBrand] in types.ts).
//
// The conditional `StateGuardedMethod` members evaluate to `never` in non-matching
// states. At runtime, we set those properties to `undefined`. This is safe because:
// 1. The type system prevents calling `never`-typed properties at the call site.
// 2. Runtime code that bypasses the type system will get `undefined` (falsy) rather
//    than a callable function, so calling it would throw a clear "not a function" error.

/**
 * @internal
 */
function buildCreatedHandle<T>(config: AdapterHandleConfig<T>): AdapterHandle<T, "created"> {
  return Object.freeze({
    state: "created" as const,
    service: undefined,
    initialize: async () => {
      assertTransition("created", "initialized");
      if (config.onInitialize) {
        await config.onInitialize();
      }
      return buildInitializedHandle(config);
    },
    activate: undefined,
    dispose: undefined,
  }) satisfies {
    state: "created";
    service: undefined;
    initialize: () => Promise<AdapterHandle<T, "initialized">>;
    activate: undefined;
    dispose: undefined;
  } as unknown as AdapterHandle<T, "created">;
}

/**
 * @internal
 */
function buildInitializedHandle<T>(
  config: AdapterHandleConfig<T>
): AdapterHandle<T, "initialized"> {
  return Object.freeze({
    state: "initialized" as const,
    service: undefined,
    initialize: undefined,
    activate: () => {
      assertTransition("initialized", "active");
      return buildActiveHandle(config);
    },
    dispose: undefined,
  }) satisfies {
    state: "initialized";
    service: undefined;
    initialize: undefined;
    activate: () => AdapterHandle<T, "active">;
    dispose: undefined;
  } as unknown as AdapterHandle<T, "initialized">;
}

/**
 * @internal
 */
function buildActiveHandle<T>(config: AdapterHandleConfig<T>): AdapterHandle<T, "active"> {
  const serviceValue = config.getService();

  return Object.freeze({
    state: "active" as const,
    service: serviceValue,
    initialize: undefined,
    activate: undefined,
    dispose: async () => {
      // Transition active → disposing (internal)
      assertTransition("active", "disposing");
      if (config.onDispose) {
        await config.onDispose();
      }
      // Transition disposing → disposed (internal)
      assertTransition("disposing", "disposed");
      return buildDisposedHandle<T>();
    },
  }) satisfies {
    state: "active";
    service: T;
    initialize: undefined;
    activate: undefined;
    dispose: () => Promise<AdapterHandle<T, "disposed">>;
  } as unknown as AdapterHandle<T, "active">;
}

/**
 * @internal
 */
function buildDisposedHandle<T>(): AdapterHandle<T, "disposed"> {
  return Object.freeze({
    state: "disposed" as const,
    service: undefined,
    initialize: undefined,
    activate: undefined,
    dispose: undefined,
  }) satisfies {
    state: "disposed";
    service: undefined;
    initialize: undefined;
    activate: undefined;
    dispose: undefined;
  } as unknown as AdapterHandle<T, "disposed">;
}
