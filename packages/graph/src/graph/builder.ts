
import type { Port, InferPortName } from "@hex-di/ports";
import type { Adapter, Lifetime, FactoryKind, InferAdapterProvides, InferAdapterRequires, InferManyProvides, InferManyRequires, InferManyAsyncPorts } from "../adapter";
import type { DuplicateProviderError, MissingDependencyError, UnsatisfiedDependencies, IsSatisfied, HasOverlap, OverlappingPorts } from "../validation";
import type { Graph } from "./types";

/**
 * Unique symbol used for nominal typing of GraphBuilder types at the type level.
 */
declare const __graphBuilderBrand: unique symbol;

/**
 * Runtime symbol used as a property key for GraphBuilder branding.
 */
const GRAPH_BUILDER_BRAND = Symbol("GraphBuilder");

/**
 * The return type of `GraphBuilder.provide()` with duplicate detection.
 *
 * @internal
 */
type ProvideResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  A extends Adapter<any, any, any, any>,
> = HasOverlap<InferAdapterProvides<A>, TProvides> extends true
  ? DuplicateProviderError<OverlappingPorts<InferAdapterProvides<A>, TProvides>>
  : GraphBuilder<
      TProvides | InferAdapterProvides<A>,
      TRequires | InferAdapterRequires<A>,
      TAsyncPorts
    >;

/**
 * The return type of `GraphBuilder.provideAsync()` with duplicate detection.
 *
 * @internal
 */
type ProvideAsyncResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  A extends Adapter<any, any, any, "async">,
> = HasOverlap<InferAdapterProvides<A>, TProvides> extends true
  ? DuplicateProviderError<OverlappingPorts<InferAdapterProvides<A>, TProvides>>
  : GraphBuilder<
      TProvides | InferAdapterProvides<A>,
      TRequires | InferAdapterRequires<A>,
      TAsyncPorts | InferAdapterProvides<A>
    >;

/**
 * Checks if a union of new ports overlaps with existing keys.
 * Used for batch collision detection.
 *
 * @internal
 */
type BatchHasOverlap<NewPorts, ExistingPorts> =
  HasOverlap<NewPorts, ExistingPorts>;

/**
 * The return type of `GraphBuilder.provideMany()` with duplicate detection.
 *
 * @internal
 */
type ProvideManyResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  A extends readonly Adapter<any, any, any, any>[],
> = BatchHasOverlap<InferManyProvides<A>, TProvides> extends true
  ? DuplicateProviderError<OverlappingPorts<InferManyProvides<A>, TProvides>>
  : GraphBuilder<
      TProvides | InferManyProvides<A>,
      TRequires | InferManyRequires<A>,
      TAsyncPorts | InferManyAsyncPorts<A>
    >;

/**
 * The return type of `GraphBuilder.merge()` with duplicate detection.
 *
 * @internal
 */
type MergeResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  OProvides,
  ORequires,
  OAsyncPorts,
> = HasOverlap<OProvides, TProvides> extends true
  ? DuplicateProviderError<OverlappingPorts<OProvides, TProvides>>
  : GraphBuilder<
      TProvides | OProvides,
      TRequires | ORequires,
      TAsyncPorts | OAsyncPorts
    >;

/**
 * An immutable builder for constructing dependency graphs with compile-time validation.
 */
export class GraphBuilder<
  TProvides = never,
  TRequires = never,
  TAsyncPorts = never,
> {
  /**
   * Type-level brand property for nominal typing.
   * @internal
   */
  declare private readonly [__graphBuilderBrand]: [TProvides, TRequires, TAsyncPorts];

  /**
   * Runtime brand marker for GraphBuilder instances.
   * @internal
   */
  private readonly [GRAPH_BUILDER_BRAND] = true as const;

  /**
   * The readonly array of registered adapters.
   */
  readonly adapters: readonly Adapter<
    Port<unknown, string>,
    Port<unknown, string> | never,
    Lifetime,
    FactoryKind
  >[];

  /**
   * Private constructor to enforce factory method pattern.
   * @internal
   */
  private constructor(
    adapters: readonly Adapter<
      Port<unknown, string>,
      Port<unknown, string> | never,
      Lifetime,
      FactoryKind
    >[]
  ) {
    // Freeze the adapters array for deep immutability
    this.adapters = Object.freeze([...adapters]);
    Object.freeze(this);
  }

  /**
   * Creates a new empty GraphBuilder.
   */
  static create(): GraphBuilder<never, never, never> {
    return new GraphBuilder([]);
  }

  /**
   * Registers an adapter with the graph.
   */
  provide<
    A extends Adapter<any, any, any, any>,
  >(adapter: A): ProvideResult<TProvides, TRequires, TAsyncPorts, A> {
    return new GraphBuilder([...this.adapters, adapter]) as ProvideResult<
      TProvides,
      TRequires,
      TAsyncPorts,
      A
    >;
  }

  /**
   * Registers an async adapter with the graph.
   */
  provideAsync<
    A extends Adapter<any, any, any, "async">,
  >(adapter: A): ProvideAsyncResult<TProvides, TRequires, TAsyncPorts, A> {
    return new GraphBuilder([...this.adapters, adapter]) as ProvideAsyncResult<
      TProvides,
      TRequires,
      TAsyncPorts,
      A
    >;
  }

  /**
   * Registers multiple adapters with the graph in a batch.
   */
  provideMany<
    const A extends readonly Adapter<any, any, any, any>[],
  >(adapters: A): ProvideManyResult<TProvides, TRequires, TAsyncPorts, A> {
    return new GraphBuilder([...this.adapters, ...adapters]) as ProvideManyResult<
      TProvides,
      TRequires,
      TAsyncPorts,
      A
    >;
  }

  /**
   * Merges another GraphBuilder into this one.
   */
  merge<
    OProvides,
    ORequires,
    OAsyncPorts,
  >(
    other: GraphBuilder<OProvides, ORequires, OAsyncPorts>
  ): MergeResult<TProvides, TRequires, TAsyncPorts, OProvides, ORequires, OAsyncPorts> {
    return new GraphBuilder([...this.adapters, ...other.adapters]) as MergeResult<
      TProvides,
      TRequires,
      TAsyncPorts,
      OProvides,
      ORequires,
      OAsyncPorts
    >;
  }

  /**
   * Builds the dependency graph after validating all dependencies are satisfied.
   */
  build(
    ..._: IsSatisfied<TProvides, TRequires> extends true
      ? []
      : [error: MissingDependencyError<UnsatisfiedDependencies<TProvides, TRequires>>]
  ): Graph<TProvides, TAsyncPorts> {
    return Object.freeze({
      adapters: this.adapters,
    });
  }
}
