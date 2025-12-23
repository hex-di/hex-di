import type { InferService, InferPortName } from "@hex-di/ports";

// =============================================================================
// Brand Symbols
// =============================================================================

/**
 * Unique symbol used for nominal typing of Adapter types.
 */
declare const __adapterBrand: unique symbol;

// =============================================================================
// Factory Kind Type
// =============================================================================

/**
 * Discriminator for sync vs async factory functions.
 */
export type FactoryKind = "sync" | "async";

// =============================================================================
// Lifetime Type
// =============================================================================

/**
 * Lifetime scope for an adapter's service instance.
 */
export type Lifetime = "singleton" | "scoped" | "transient";

// =============================================================================
// ResolvedDeps Helper Type
// =============================================================================

/**
 * Maps a union of Port types to an object type for dependency injection.
 */
export type ResolvedDeps<TRequires> = [TRequires] extends [never]
  ? Record<string, unknown>
  : {
      [P in TRequires as InferPortName<P>]: InferService<P>;
    };

// =============================================================================
// Adapter Type
// =============================================================================

/**
 * A branded adapter type that captures the complete contract for a service implementation.
 */
export type Adapter<
  TProvides,
  TRequires,
  TLifetime extends Lifetime,
  TFactoryKind extends FactoryKind = "sync",
  TRequiresTuple extends readonly any[] = [TRequires] extends [never]
    ? readonly []
    : readonly any[],
> = {
  /**
   * Brand property for nominal typing.
   */
  readonly [__adapterBrand]?: [TProvides, TRequires, TLifetime, TFactoryKind];

  /**
   * The port this adapter provides/implements.
   */
  readonly provides: TProvides;

  /**
   * The ports this adapter depends on.
   */
  readonly requires: TRequiresTuple;

  /**
   * The lifetime scope for this adapter's service instances.
   */
  readonly lifetime: TLifetime;

  /**
   * The factory kind discriminator.
   */
  readonly factoryKind: TFactoryKind;

  /**
   * Factory function that creates the service instance.
   */
  readonly factory: TFactoryKind extends "async"
    ? (deps: ResolvedDeps<TRequires>) => Promise<InferService<TProvides>>
    : (deps: ResolvedDeps<TRequires>) => InferService<TProvides>;

  /**
   * Optional initialization priority for async adapters.
   */
  readonly initPriority?: number;

  /**
   * Optional finalizer function called during disposal.
   */
  finalizer?(instance: InferService<TProvides>): void | Promise<void>;
};
