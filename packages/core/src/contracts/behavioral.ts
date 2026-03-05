/**
 * Behavioral port specifications: pre/postconditions and invariants.
 *
 * Ports can declare preconditions (requirements on arguments), postconditions
 * (guarantees on return values), and invariants (conditions that must hold
 * before and after every method call) for each method. These annotations
 * are stored in the port's runtime metadata and evaluated when runtime
 * verification mode is enabled.
 *
 * @see {@link https://hex-di.dev/spec/core/behaviors/13-behavioral-port-specs | BEH-CO-13}
 *
 * @packageDocumentation
 */

// =============================================================================
// Predicate Type
// =============================================================================

/**
 * A predicate function used in contract checks.
 *
 * @typeParam T - The type of value being checked
 */
export type Predicate<T> = (value: T) => boolean;

// =============================================================================
// MethodContract
// =============================================================================

/**
 * A single named condition (precondition or postcondition) on a method.
 *
 * @typeParam T - The type being checked (args tuple for preconditions, return type for postconditions)
 */
export interface NamedCondition<T> {
  readonly name: string;
  readonly check: Predicate<T>;
  readonly message: string;
}

/**
 * Pre/postcondition contract for a single method.
 *
 * @typeParam TArgs - Tuple type of the method's parameters
 * @typeParam TReturn - The method's return type (Promises are unwrapped since
 *   postconditions check the resolved value)
 */
export interface MethodContract<TArgs extends readonly unknown[], TReturn> {
  readonly preconditions: ReadonlyArray<NamedCondition<TArgs>>;
  readonly postconditions: ReadonlyArray<NamedCondition<TReturn>>;
}

// =============================================================================
// BehavioralPortSpec
// =============================================================================

/**
 * Extracts function-property keys from a type.
 *
 * Uses `(...args: never[]) => unknown` as the function test because function
 * parameter types are contravariant: `(a: number) => void` does NOT extend
 * `(...args: unknown[]) => void`, but it DOES extend `(...args: never[]) => unknown`.
 *
 * @internal
 */
type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: never[]) => unknown ? K : never;
}[keyof T];

/**
 * Unwraps a Promise type to its resolved value.
 * Non-Promise types are returned as-is.
 *
 * @internal
 */
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

/**
 * Behavioral specification for a port, declaring pre/postconditions per method.
 *
 * Only function-typed properties of `T` appear in the `methods` map.
 * Non-function properties are excluded at the type level.
 * All method contracts are optional -- you only need to specify contracts
 * for methods you want to verify.
 *
 * For async methods, postcondition predicates receive the unwrapped (resolved)
 * value, not the Promise, because the verification proxy awaits async results
 * before checking postconditions.
 *
 * @typeParam T - The service interface type
 */
export interface BehavioralPortSpec<T> {
  readonly methods: {
    readonly [K in FunctionKeys<T>]?: T[K] extends (...args: infer A) => infer R
      ? MethodContract<A extends readonly unknown[] ? A : readonly unknown[], UnwrapPromise<R>>
      : never;
  };
}

// =============================================================================
// StateInvariant
// =============================================================================

/**
 * An invariant condition on the service instance state.
 *
 * Invariants are checked before and after every method call when
 * runtime verification is enabled.
 *
 * @typeParam T - The service interface type
 */
export interface StateInvariant<T> {
  readonly name: string;
  readonly check: Predicate<T>;
  readonly message: string;
}

// =============================================================================
// StatefulPortSpec
// =============================================================================

/**
 * Behavioral specification that includes state invariants.
 *
 * Extends `BehavioralPortSpec<T>` with an array of invariants that
 * must hold before and after every method invocation.
 *
 * @typeParam T - The service interface type
 */
export interface StatefulPortSpec<T> extends BehavioralPortSpec<T> {
  readonly invariants: ReadonlyArray<StateInvariant<T>>;
}

// =============================================================================
// VerificationConfig
// =============================================================================

/**
 * Configuration for runtime behavioral verification.
 *
 * - `runtimeVerification: false` (default) — no proxy wrapping, zero overhead
 * - `runtimeVerification: true` — resolved services are wrapped in verification proxies
 * - `verificationMode` — which checks to run (default: "all")
 * - `onViolation` — how to handle violations (default: "error")
 */
export interface VerificationConfig {
  readonly runtimeVerification?: boolean;
  readonly verificationMode?: "all" | "preconditions" | "postconditions" | "invariants";
  readonly onViolation?: "error" | "warn" | "log";
}

// =============================================================================
// VerificationViolation
// =============================================================================

/**
 * A violation detected during runtime behavioral verification.
 *
 * Carries the violation tag, contract name, human-readable message,
 * the port and method names, and optional blame context.
 */
export interface VerificationViolation {
  readonly _tag: "PreconditionViolation" | "PostconditionViolation" | "InvariantViolation";
  readonly contractName: string;
  readonly message: string;
  readonly portName: string;
  readonly methodName: string;
}
