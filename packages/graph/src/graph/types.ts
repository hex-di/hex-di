
import type { Port } from "@hex-di/ports";
import type { Adapter, Lifetime, FactoryKind } from "../adapter";
import type { GraphBuilder } from "./builder";

/**
 * The validated dependency graph returned by `GraphBuilder.build()`.
 *
 * This type represents a complete, validated graph where all dependencies
 * have been satisfied. It contains the readonly array of adapters that
 * can be used by `@hex-di/runtime` to create a container.
 */
export type Graph<
  TProvides = never,
  TAsyncPorts = never,
> = {
  readonly adapters: readonly Adapter<any, any, any, any>[];
  /**
   * Phantom type property for compile-time type tracking.
   */
  readonly __provides?: TProvides;
  /**
   * Phantom type property for compile-time async port tracking.
   */
  readonly __asyncPorts?: TAsyncPorts;
};

