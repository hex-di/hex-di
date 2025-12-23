import type { Port } from "@hex-di/ports";
import type {
  Adapter,
  Lifetime,
  FactoryKind,
  InferAdapterProvides,
  InferAdapterRequires,
  InferAdapterLifetime,
  InferManyProvides,
  InferManyRequires,
  InferManyAsyncPorts,
} from "../adapter";
import type {
  DuplicateProviderError,
  MissingDependencyError,
  UnsatisfiedDependencies,
  IsSatisfied,
  HasOverlap,
  OverlappingPorts,
  CircularDependencyError,
  WouldCreateCycle,
  AddEdge,
  AdapterProvidesName,
  AdapterRequiresNames,
  BuildCyclePath,
  MergeDependencyMaps,
  AddManyEdges,
  WouldAnyCreateCycle,
  LifetimeLevel,
  AddLifetime,
  GetLifetimeLevel,
  FindAnyCaptiveDependency,
  CaptiveDependencyError,
  LifetimeName,
  MergeLifetimeMaps,
  AddManyLifetimes,
  WouldAnyBeCaptive,
} from "../validation";

import type { Graph } from "./types";

/**
 * Extracts the lifetime directly from an adapter using property access.
 * This explicitly maps each literal to avoid inference issues with unions.
 * @internal
 */
type DirectAdapterLifetime<A> = A extends { lifetime: "singleton" }
  ? "singleton"
  : A extends { lifetime: "scoped" }
    ? "scoped"
    : A extends { lifetime: "transient" }
      ? "transient"
      : "singleton";

/**
 * Unique symbol used for nominal typing of GraphBuilder types at the type level.
 */
declare const __graphBuilderBrand: unique symbol;

/**
 * Runtime symbol used as a property key for GraphBuilder branding.
 */
const GRAPH_BUILDER_BRAND = Symbol("GraphBuilder");

/**
 * Helper type to check if a type is never.
 * @internal
 */
type IsNever<T> = [T] extends [never] ? true : false;

/**
 * The return type of `GraphBuilder.provide()` with duplicate, cycle, and captive dependency detection.
 *
 * @internal
 */
type ProvideResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  A extends Adapter<any, any, any, any>,
> =
  // First check for duplicate providers
  HasOverlap<InferAdapterProvides<A>, TProvides> extends true
    ? DuplicateProviderError<OverlappingPorts<InferAdapterProvides<A>, TProvides>>
    : // Then check for circular dependencies
      WouldCreateCycle<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>> extends true
      ? CircularDependencyError<
          BuildCyclePath<
            AddEdge<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>>,
            AdapterProvidesName<A>,
            AdapterRequiresNames<A>
          >
        >
      : // Then check for captive dependencies
        FindAnyCaptiveDependency<
            TLifetimeMap,
            LifetimeLevel<DirectAdapterLifetime<A>>,
            AdapterRequiresNames<A>
          > extends infer CaptivePort
        ? IsNever<CaptivePort> extends true
          ? // Success: return new builder with updated types
            GraphBuilder<
              TProvides | InferAdapterProvides<A>,
              TRequires | InferAdapterRequires<A>,
              TAsyncPorts,
              AddEdge<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>>,
              AddLifetime<TLifetimeMap, AdapterProvidesName<A>, DirectAdapterLifetime<A>>
            >
          : CaptivePort extends string
            ? CaptiveDependencyError<
                AdapterProvidesName<A>,
                LifetimeName<LifetimeLevel<DirectAdapterLifetime<A>>>,
                CaptivePort,
                LifetimeName<GetLifetimeLevel<TLifetimeMap, CaptivePort>>
              >
            : // Fallback (shouldn't happen)
              GraphBuilder<
                TProvides | InferAdapterProvides<A>,
                TRequires | InferAdapterRequires<A>,
                TAsyncPorts,
                AddEdge<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>>,
                AddLifetime<TLifetimeMap, AdapterProvidesName<A>, DirectAdapterLifetime<A>>
              >
        : never;

/**
 * The return type of `GraphBuilder.provideAsync()` with duplicate, cycle, and captive dependency detection.
 *
 * Note: Async adapters are always singletons, so captive dependency check still applies.
 *
 * @internal
 */
type ProvideAsyncResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  A extends Adapter<any, any, any, "async">,
> =
  // First check for duplicate providers
  HasOverlap<InferAdapterProvides<A>, TProvides> extends true
    ? DuplicateProviderError<OverlappingPorts<InferAdapterProvides<A>, TProvides>>
    : // Then check for circular dependencies
      WouldCreateCycle<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>> extends true
      ? CircularDependencyError<
          BuildCyclePath<
            AddEdge<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>>,
            AdapterProvidesName<A>,
            AdapterRequiresNames<A>
          >
        >
      : // Then check for captive dependencies (async adapters are always singleton = level 1)
        FindAnyCaptiveDependency<
            TLifetimeMap,
            1, // Async adapters are always singleton
            AdapterRequiresNames<A>
          > extends infer CaptivePort
        ? IsNever<CaptivePort> extends true
          ? // Success: return new builder with updated types
            GraphBuilder<
              TProvides | InferAdapterProvides<A>,
              TRequires | InferAdapterRequires<A>,
              TAsyncPorts | InferAdapterProvides<A>,
              AddEdge<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>>,
              AddLifetime<TLifetimeMap, AdapterProvidesName<A>, "singleton">
            >
          : CaptivePort extends string
            ? CaptiveDependencyError<
                AdapterProvidesName<A>,
                "Singleton",
                CaptivePort,
                LifetimeName<GetLifetimeLevel<TLifetimeMap, CaptivePort>>
              >
            : // Fallback (shouldn't happen)
              GraphBuilder<
                TProvides | InferAdapterProvides<A>,
                TRequires | InferAdapterRequires<A>,
                TAsyncPorts | InferAdapterProvides<A>,
                AddEdge<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>>,
                AddLifetime<TLifetimeMap, AdapterProvidesName<A>, "singleton">
              >
        : never;

/**
 * Checks if a union of new ports overlaps with existing keys.
 * Used for batch collision detection.
 *
 * @internal
 */
type BatchHasOverlap<NewPorts, ExistingPorts> = HasOverlap<NewPorts, ExistingPorts>;

/**
 * The return type of `GraphBuilder.provideMany()` with duplicate, cycle, and captive dependency detection.
 *
 * @internal
 */
type ProvideManyResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  A extends readonly Adapter<any, any, any, any>[],
> =
  // First check for duplicate providers
  BatchHasOverlap<InferManyProvides<A>, TProvides> extends true
    ? DuplicateProviderError<OverlappingPorts<InferManyProvides<A>, TProvides>>
    : // Then check for circular dependencies in the batch
      WouldAnyCreateCycle<TDepGraph, A> extends CircularDependencyError<infer Path>
      ? CircularDependencyError<Path>
      : // Then check for captive dependencies in the batch
        WouldAnyBeCaptive<TLifetimeMap, A> extends CaptiveDependencyError<
            infer DN,
            infer DL,
            infer CP,
            infer CL
          >
        ? CaptiveDependencyError<DN, DL, CP, CL>
        : // Success: return new builder with updated types
          GraphBuilder<
            TProvides | InferManyProvides<A>,
            TRequires | InferManyRequires<A>,
            TAsyncPorts | InferManyAsyncPorts<A>,
            AddManyEdges<TDepGraph, A>,
            AddManyLifetimes<TLifetimeMap, A>
          >;

/**
 * The return type of `GraphBuilder.merge()` with duplicate detection.
 *
 * Note: Cycle and captive dependency detection for merge is complex because it
 * requires checking cross-graph relationships. Currently only checks duplicates;
 * runtime will catch any issues that span merged graphs.
 *
 * @internal
 */
type MergeResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  OProvides,
  ORequires,
  OAsyncPorts,
  ODepGraph,
  OLifetimeMap,
> =
  HasOverlap<OProvides, TProvides> extends true
    ? DuplicateProviderError<OverlappingPorts<OProvides, TProvides>>
    : GraphBuilder<
        TProvides | OProvides,
        TRequires | ORequires,
        TAsyncPorts | OAsyncPorts,
        MergeDependencyMaps<TDepGraph, ODepGraph>,
        MergeLifetimeMaps<TLifetimeMap, OLifetimeMap>
      >;

/**
 * An immutable builder for constructing dependency graphs with compile-time validation.
 *
 * @typeParam TProvides - Union of all port types provided by adapters in this graph
 * @typeParam TRequires - Union of all port types required by adapters in this graph
 * @typeParam TAsyncPorts - Union of all async port types in this graph
 * @typeParam TDepGraph - Type-level dependency map tracking edge relationships for cycle detection
 * @typeParam TLifetimeMap - Type-level lifetime map tracking adapter lifetimes by port name for captive dependency detection
 */
export class GraphBuilder<
  TProvides = never,
  TRequires = never,
  TAsyncPorts = never,
  TDepGraph = {},
  TLifetimeMap = {},
> {
  /**
   * Type-level brand property for nominal typing.
   * @internal
   */
  declare private readonly [__graphBuilderBrand]: [
    TProvides,
    TRequires,
    TAsyncPorts,
    TDepGraph,
    TLifetimeMap,
  ];

  /**
   * Runtime brand marker for GraphBuilder instances.
   * @internal
   */
  private readonly [GRAPH_BUILDER_BRAND] = true as const;

  /**
   * Phantom type property for compile-time type tracking of provided ports.
   * @internal
   */
  declare readonly __provides: TProvides;

  /**
   * Phantom type property for compile-time type tracking of required ports.
   * @internal
   */
  declare readonly __requires: TRequires;

  /**
   * Phantom type property for compile-time type tracking of async ports.
   * @internal
   */
  declare readonly __asyncPorts: TAsyncPorts;

  /**
   * Phantom type property for compile-time dependency graph (edge map).
   * Used for circular dependency detection.
   * @internal
   */
  declare readonly __depGraph: TDepGraph;

  /**
   * Phantom type property for compile-time lifetime map.
   * Used for captive dependency detection.
   * @internal
   */
  declare readonly __lifetimeMap: TLifetimeMap;

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
  static create(): GraphBuilder<never, never, never, {}, {}> {
    return new GraphBuilder([]);
  }

  /**
   * Registers an adapter with the graph.
   * Performs compile-time duplicate, circular, and captive dependency detection.
   */
  provide<A extends Adapter<any, any, any, any>>(
    adapter: A
  ): ProvideResult<TProvides, TRequires, TAsyncPorts, TDepGraph, TLifetimeMap, A> {
    return new GraphBuilder([...this.adapters, adapter]) as ProvideResult<
      TProvides,
      TRequires,
      TAsyncPorts,
      TDepGraph,
      TLifetimeMap,
      A
    >;
  }

  /**
   * Registers an async adapter with the graph.
   * Performs compile-time duplicate, circular, and captive dependency detection.
   */
  provideAsync<A extends Adapter<any, any, any, "async">>(
    adapter: A
  ): ProvideAsyncResult<TProvides, TRequires, TAsyncPorts, TDepGraph, TLifetimeMap, A> {
    return new GraphBuilder([...this.adapters, adapter]) as ProvideAsyncResult<
      TProvides,
      TRequires,
      TAsyncPorts,
      TDepGraph,
      TLifetimeMap,
      A
    >;
  }

  /**
   * Registers multiple adapters with the graph in a batch.
   * Performs compile-time duplicate, circular, and captive dependency detection.
   */
  provideMany<const A extends readonly Adapter<any, any, any, any>[]>(
    adapters: A
  ): ProvideManyResult<TProvides, TRequires, TAsyncPorts, TDepGraph, TLifetimeMap, A> {
    return new GraphBuilder([...this.adapters, ...adapters]) as ProvideManyResult<
      TProvides,
      TRequires,
      TAsyncPorts,
      TDepGraph,
      TLifetimeMap,
      A
    >;
  }

  /**
   * Merges another GraphBuilder into this one.
   * Performs compile-time duplicate detection.
   *
   * Note: Cross-graph cycle and captive dependency detection is limited;
   * runtime will catch any issues that span merged graphs.
   */
  merge<OProvides, ORequires, OAsyncPorts, ODepGraph, OLifetimeMap>(
    other: GraphBuilder<OProvides, ORequires, OAsyncPorts, ODepGraph, OLifetimeMap>
  ): MergeResult<
    TProvides,
    TRequires,
    TAsyncPorts,
    TDepGraph,
    TLifetimeMap,
    OProvides,
    ORequires,
    OAsyncPorts,
    ODepGraph,
    OLifetimeMap
  > {
    return new GraphBuilder([...this.adapters, ...other.adapters]) as MergeResult<
      TProvides,
      TRequires,
      TAsyncPorts,
      TDepGraph,
      TLifetimeMap,
      OProvides,
      ORequires,
      OAsyncPorts,
      ODepGraph,
      OLifetimeMap
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
    // Phantom type properties (__provides, __asyncPorts) exist only at compile-time.
    // The runtime object only needs the adapters array.
    return Object.freeze({
      adapters: this.adapters,
    }) as Graph<TProvides, TAsyncPorts>;
  }
}
