/**
 * Port Type Definitions
 *
 * Defines StatePortDef, AtomPortDef, DerivedPortDef, AsyncDerivedPortDef,
 * LinkedDerivedPortDef, and type inference utilities.
 *
 * @packageDocumentation
 */

import type { DirectedPort } from "@hex-di/core";
import type {
  ActionMap,
  StateService,
  AtomService,
  DerivedService,
  AsyncDerivedService,
  LinkedDerivedService,
} from "../types/index.js";

// =============================================================================
// Phantom Type Brand Symbols
// =============================================================================

/** Unique symbol for state type inference */
declare const __stateType: unique symbol;
/** Unique symbol for actions type inference */
declare const __actionsType: unique symbol;
/** Unique symbol for atom type inference */
declare const __atomType: unique symbol;
/** Unique symbol for async derived error type inference */
declare const __asyncDerivedErrorType: unique symbol;

// =============================================================================
// Port Definition Types
// =============================================================================

/**
 * State port definition.
 * Extends DirectedPort with phantom types for state and action inference.
 */
export type StatePortDef<
  TName extends string,
  TState,
  TActions extends ActionMap<TState>,
> = DirectedPort<TName, StateService<TState, TActions>, "outbound"> & {
  readonly [__stateType]: TState;
  readonly [__actionsType]: TActions;
};

/**
 * Atom port definition.
 * Extends DirectedPort with phantom type for value inference.
 */
export type AtomPortDef<TName extends string, TValue> = DirectedPort<
  TName,
  AtomService<TValue>,
  "outbound"
> & {
  readonly [__atomType]: TValue;
};

/**
 * Derived port definition.
 */
export type DerivedPortDef<TName extends string, TResult> = DirectedPort<
  TName,
  DerivedService<TResult>,
  "outbound"
>;

/**
 * Async derived port definition.
 * Extends DirectedPort with phantom type for error inference.
 */
export type AsyncDerivedPortDef<TName extends string, TResult, E = never> = DirectedPort<
  TName,
  AsyncDerivedService<TResult, E>,
  "outbound"
> & {
  readonly [__asyncDerivedErrorType]: E;
};

/**
 * Linked derived (bidirectional) port definition.
 */
export type LinkedDerivedPortDef<TName extends string, TResult> = DirectedPort<
  TName,
  LinkedDerivedService<TResult>,
  "outbound"
>;

// =============================================================================
// Type Inference Utilities
// =============================================================================

/** Extract state type from a state port. Returns never for non-state ports. */
export type InferStateType<P> = [P] extends [{ readonly [__stateType]: infer S }] ? S : never;

/** Extract actions type from a state port. Returns never for non-state ports. */
export type InferActionsType<P> = [P] extends [{ readonly [__actionsType]: infer A }] ? A : never;

/** Extract atom value type from an atom port. Returns never for non-atom ports. */
export type InferAtomType<P> = [P] extends [{ readonly [__atomType]: infer V }] ? V : never;

/** Extract derived result type from a derived port. Returns never for non-derived ports. */
export type InferDerivedType<P> = [P] extends [DerivedPortDef<string, infer R>] ? R : never;

/** Extract linked derived result type. Returns never for non-linked-derived ports. */
export type InferLinkedDerivedType<P> = [P] extends [LinkedDerivedPortDef<string, infer R>]
  ? R
  : never;

/** Extract async derived result type. Returns never for non-async-derived ports. */
export type InferAsyncDerivedType<P> = [P] extends [AsyncDerivedPortDef<string, infer R, infer _E>]
  ? R
  : never;

/** Extract async derived error type. Returns never for non-async-derived ports. */
export type InferAsyncDerivedErrorType<P> = [P] extends [
  { readonly [__asyncDerivedErrorType]: infer E },
]
  ? E
  : never;
