/**
 * Adapter Lifecycle States — Type-Level State Machine
 *
 * Defines the phantom type parameters and conditional types that encode
 * adapter lifecycle phases. Each state transition is validated at the type
 * level, preventing invalid operations in wrong states.
 *
 * Implements: BEH-CO-08-001, BEH-CO-08-002, BEH-CO-08-003
 *
 * @packageDocumentation
 */

// =============================================================================
// Brand Symbol
// =============================================================================

/**
 * Unique symbol used for phantom branding of adapter lifecycle state.
 *
 * This is a phantom brand — it exists only at the type level with no
 * runtime representation. The `declare const` ensures TypeScript treats it
 * as a unique symbol type without generating any JavaScript code.
 */
declare const __adapterStateBrand: unique symbol;

// =============================================================================
// AdapterLifecycleState
// =============================================================================

/**
 * The five lifecycle phases an adapter handle can be in.
 *
 * The linear flow is:
 * `"created"` → `"initialized"` → `"active"` → `"disposing"` → `"disposed"`
 *
 * - `"created"`: Handle exists but is not yet initialized
 * - `"initialized"`: Handle has been initialized (dependencies resolved)
 * - `"active"`: Handle is active and the `service` property is accessible
 * - `"disposing"`: Internal state during disposal (not externally observable)
 * - `"disposed"`: Terminal state — no further transitions
 */
export type AdapterLifecycleState = "created" | "initialized" | "active" | "disposing" | "disposed";

// =============================================================================
// StateGuardedMethod
// =============================================================================

/**
 * Conditionally types a method based on the current lifecycle state.
 *
 * When `TState extends TAllowed`, the method has its full `TSignature`.
 * Otherwise, the method is `never`, making it uncallable (a type error).
 *
 * @typeParam TState - The current lifecycle state
 * @typeParam TAllowed - The state(s) in which this method is available
 * @typeParam TSignature - The method's type signature when available
 *
 * @example
 * ```ts
 * type InitMethod = StateGuardedMethod<"created", "created", () => Promise<void>>;
 * // InitMethod = () => Promise<void>
 *
 * type InitMethodWrong = StateGuardedMethod<"active", "created", () => Promise<void>>;
 * // InitMethodWrong = never
 * ```
 */
export type StateGuardedMethod<
  TState extends AdapterLifecycleState,
  TAllowed extends AdapterLifecycleState,
  TSignature,
> = TState extends TAllowed ? TSignature : never;

// =============================================================================
// ValidTransition
// =============================================================================

/**
 * Maps each lifecycle state to its sole valid successor state.
 *
 * The transition graph is strictly linear:
 * - `"created"` → `"initialized"`
 * - `"initialized"` → `"active"`
 * - `"active"` → `"disposing"`
 * - `"disposing"` → `"disposed"`
 * - `"disposed"` → `never` (terminal — no further transitions)
 *
 * @typeParam TFrom - The current lifecycle state
 */
export type ValidTransition<TFrom extends AdapterLifecycleState> = TFrom extends "created"
  ? "initialized"
  : TFrom extends "initialized"
    ? "active"
    : TFrom extends "active"
      ? "disposing"
      : TFrom extends "disposing"
        ? "disposed"
        : never;

// =============================================================================
// CanTransition
// =============================================================================

/**
 * Boolean check for whether a transition from `TFrom` to `TTo` is valid.
 *
 * Evaluates to `true` if the transition is allowed, `false` otherwise.
 *
 * @typeParam TFrom - The current lifecycle state
 * @typeParam TTo - The target lifecycle state
 *
 * @example
 * ```ts
 * type Ok = CanTransition<"created", "initialized">;  // true
 * type Bad = CanTransition<"created", "active">;       // false
 * type Back = CanTransition<"active", "created">;      // false
 * ```
 */
export type CanTransition<TFrom extends AdapterLifecycleState, TTo extends AdapterLifecycleState> =
  TTo extends ValidTransition<TFrom> ? true : false;

// =============================================================================
// AdapterHandle
// =============================================================================

/**
 * A lifecycle-tracked adapter handle with phantom state branding.
 *
 * Adapter handles carry a phantom `TState` parameter encoding the current
 * lifecycle phase. Methods are conditionally available based on state:
 *
 * | State         | `initialize()` | `activate()` | `service` | `dispose()` |
 * |---------------|----------------|--------------|-----------|-------------|
 * | `"created"`   | Available      | `never`      | `never`   | `never`     |
 * | `"initialized"` | `never`     | Available    | `never`   | `never`     |
 * | `"active"`    | `never`        | `never`      | `T`       | Available   |
 * | `"disposing"` | `never`        | `never`      | `never`   | `never`     |
 * | `"disposed"`  | `never`        | `never`      | `never`   | `never`     |
 *
 * @typeParam T - The service type this handle wraps
 * @typeParam TState - The current lifecycle state (phantom parameter)
 */
export interface AdapterHandle<T, TState extends AdapterLifecycleState = "created"> {
  /**
   * Phantom brand encoding the lifecycle state at the type level.
   * Has no runtime representation. Optional (`?:`) so implementations
   * can construct objects without providing this property (same pattern
   * as `Adapter[__adapterBrand]`).
   */
  readonly [__adapterStateBrand]?: TState;

  /**
   * The current lifecycle state, available at runtime.
   */
  readonly state: TState;

  /**
   * The service instance. Only accessible when the handle is in the `"active"` state.
   * In all other states, this is `never`.
   */
  readonly service: StateGuardedMethod<TState, "active", T>;

  /**
   * Transitions the handle from `"created"` to `"initialized"`.
   * Only available in the `"created"` state.
   */
  readonly initialize: StateGuardedMethod<
    TState,
    "created",
    () => Promise<AdapterHandle<T, "initialized">>
  >;

  /**
   * Transitions the handle from `"initialized"` to `"active"`.
   * Only available in the `"initialized"` state.
   */
  readonly activate: StateGuardedMethod<TState, "initialized", () => AdapterHandle<T, "active">>;

  /**
   * Transitions the handle from `"active"` to `"disposed"`.
   * Only available in the `"active"` state.
   * Internally transitions through `"disposing"` before reaching `"disposed"`.
   */
  readonly dispose: StateGuardedMethod<
    TState,
    "active",
    () => Promise<AdapterHandle<T, "disposed">>
  >;
}
