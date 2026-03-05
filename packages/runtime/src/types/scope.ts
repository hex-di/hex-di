/**
 * Scope type definitions for @hex-di/runtime.
 *
 * The Scope type provides type-safe service resolution with scoped lifetimes.
 * It uses branded types for nominal typing and is distinct from Container.
 *
 * @packageDocumentation
 */

import type { Port, InferService, DisposalPhase } from "@hex-di/core";
import type { Result, ResultAsync } from "@hex-di/result";
import type { ContainerError, DisposalError } from "../errors/index.js";
import { INTERNAL_ACCESS } from "../inspection/symbols.js";
import type { ScopeInternalState } from "../inspection/internal-state-types.js";
import type {
  ScopeLifecycleListener,
  ScopeSubscription,
  ScopeDisposalState,
} from "../scope/lifecycle-events.js";
import type { ContainerPhase } from "./options.js";
import { ScopeBrand } from "./brands.js";

// =============================================================================
// Scope Type
// =============================================================================

/**
 * A branded scope type that provides type-safe service resolution with scoped lifetimes.
 *
 * @typeParam TProvides - Union of Port types that this scope can resolve.
 * @typeParam TAsyncPorts - Union of Port types that have async factory functions.
 * @typeParam TPhase - The initialization phase: `'uninitialized' | 'initialized'`.
 * @typeParam TDisposal - The disposal phase: `'active' | 'disposed'`.
 *   When `"active"` (default), all resolution and scope creation methods are available.
 *   When `"disposed"`, those methods are absent from the type — calling them is a type error.
 *
 * @see {@link Container} - Parent container type with identical API but separate brand
 * @see {@link Container.createScope} - Method that creates Scope instances
 */
export type Scope<
  TProvides extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown> = never,
  TPhase extends ContainerPhase = "uninitialized",
  TDisposal extends DisposalPhase = "active",
> = TDisposal extends "active"
  ? ActiveScopeMembers<TProvides, TAsyncPorts, TPhase>
  : DisposedScopeMembers<TProvides>;

/**
 * Alias for the scope members type. Defaults to active scope.
 * @internal
 */
export type ScopeMembers<
  TProvides extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown>,
  TPhase extends ContainerPhase,
  TDisposal extends DisposalPhase = "active",
> = TDisposal extends "active"
  ? ActiveScopeMembers<TProvides, TAsyncPorts, TPhase>
  : DisposedScopeMembers<TProvides>;

// =============================================================================
// Base Scope Properties (shared by active and disposed scopes)
// =============================================================================

/**
 * Properties available on all scopes regardless of disposal state.
 * @internal
 */
type ScopeBase<TProvides extends Port<string, unknown>> = {
  /** Whether the scope has been disposed. */
  readonly isDisposed: boolean;

  /** Checks if the scope can resolve the given port. */
  has(port: Port<string, unknown>): boolean;

  /** Subscribe to scope lifecycle events. */
  subscribe(listener: ScopeLifecycleListener): ScopeSubscription;

  /** Get current disposal state synchronously. */
  getDisposalState(): ScopeDisposalState;

  /** Brand property for nominal typing. */
  readonly [ScopeBrand]: { provides: TProvides };

  /** Internal state accessor for DevTools inspection. @internal */
  readonly [INTERNAL_ACCESS]: () => ScopeInternalState;
};

// =============================================================================
// Active Scope Members (TDisposal = "active")
// =============================================================================

/**
 * Scope interface when the scope is active (not disposed).
 * All resolution, scope creation, and disposal methods are available.
 * @internal
 */
export type ActiveScopeMembers<
  TProvides extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown>,
  TPhase extends ContainerPhase,
> = ScopeBase<TProvides> & {
  /** Resolves a service instance for the given port synchronously. */
  resolve<P extends TPhase extends "initialized" ? TProvides : Exclude<TProvides, TAsyncPorts>>(
    port: P
  ): InferService<P>;

  /** Resolves a service instance for the given port asynchronously. */
  resolveAsync<P extends TProvides>(port: P): Promise<InferService<P>>;

  /** Resolves a service instance, returning a Result instead of throwing. */
  tryResolve<P extends TPhase extends "initialized" ? TProvides : Exclude<TProvides, TAsyncPorts>>(
    port: P
  ): Result<InferService<P>, ContainerError>;

  /** Resolves a service instance asynchronously, returning a ResultAsync. */
  tryResolveAsync<P extends TProvides>(port: P): ResultAsync<InferService<P>, ContainerError>;

  /** Disposes the scope, returning a ResultAsync instead of throwing. */
  tryDispose(): ResultAsync<void, DisposalError>;

  /** Creates a child scope for managing nested scoped service lifetimes. */
  createScope(name?: string): Scope<TProvides, TAsyncPorts, TPhase, "active">;

  /**
   * Disposes the scope and all scoped instances.
   * Returns a promise that resolves to the scope typed as disposed.
   */
  dispose(): Promise<Scope<TProvides, TAsyncPorts, TPhase, "disposed">>;
};

// =============================================================================
// Disposed Scope Members (TDisposal = "disposed")
// =============================================================================

/**
 * Scope interface after disposal.
 *
 * Only metadata and lifecycle properties are available.
 * Resolution methods, scope creation, and disposal are absent.
 * @internal
 */
export type DisposedScopeMembers<TProvides extends Port<string, unknown>> = ScopeBase<TProvides>;
