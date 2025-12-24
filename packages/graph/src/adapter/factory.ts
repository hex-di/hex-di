import type { Port, InferService } from "@hex-di/ports";
import type { TupleToUnion } from "../common";
import type { Adapter, Lifetime, ResolvedDeps } from "./types";

/**
 * Configuration object for creating an adapter.
 */
interface AdapterConfig<
  TProvides extends Port<unknown, string>,
  TRequires extends readonly Port<unknown, string>[],
  TLifetime extends Lifetime,
> {
  provides: TProvides;
  requires: TRequires;
  lifetime: TLifetime;
  factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => InferService<TProvides>;
  finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
}

/**
 * Creates a typed adapter with dependency metadata for registration in a dependency graph.
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  TLifetime extends Lifetime,
>(
  config: AdapterConfig<TProvides, TRequires, TLifetime>
): Adapter<TProvides, TupleToUnion<TRequires>, TLifetime, "sync", TRequires> {
  const baseAdapter = {
    provides: config.provides,
    requires: config.requires,
    lifetime: config.lifetime,
    factoryKind: "sync" as const,
    factory: config.factory,
  };

  if (config.finalizer !== undefined) {
    return Object.freeze({
      ...baseAdapter,
      finalizer: config.finalizer,
    });
  }

  return Object.freeze(baseAdapter);
}

/**
 * Valid range for async adapter initialization priority.
 * Priority determines the order in which async adapters are initialized:
 * - Lower values = initialized first
 * - Higher values = initialized later
 * - Default is 100
 */
const MIN_INIT_PRIORITY = 0;
const MAX_INIT_PRIORITY = 1000;

/**
 * Configuration object for creating an async adapter.
 */
interface AsyncAdapterConfig<
  TProvides extends Port<unknown, string>,
  TRequires extends readonly Port<unknown, string>[],
> {
  provides: TProvides;
  requires: TRequires;
  factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => Promise<InferService<TProvides>>;
  /**
   * Initialization priority for async adapters.
   * Lower values are initialized first. Valid range: 0-1000.
   * @default 100
   */
  initPriority?: number;
  finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
}

/**
 * Creates a typed async adapter with dependency metadata for registration in a dependency graph.
 *
 * @throws {RangeError} If initPriority is outside the valid range (0-1000)
 */
export function createAsyncAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
>(
  config: AsyncAdapterConfig<TProvides, TRequires>
): Adapter<TProvides, TupleToUnion<TRequires>, "singleton", "async", TRequires> {
  // Validate initPriority if provided
  const priority = config.initPriority ?? 100;
  if (priority < MIN_INIT_PRIORITY || priority > MAX_INIT_PRIORITY) {
    throw new RangeError(
      `initPriority must be between ${MIN_INIT_PRIORITY} and ${MAX_INIT_PRIORITY}, got ${priority}`
    );
  }

  const baseAdapter = {
    provides: config.provides,
    requires: config.requires,
    lifetime: "singleton" as const, // Async adapters are always singletons
    factoryKind: "async" as const,
    factory: config.factory,
    initPriority: priority,
  };

  if (config.finalizer !== undefined) {
    return Object.freeze({
      ...baseAdapter,
      finalizer: config.finalizer,
    });
  }

  return Object.freeze(baseAdapter);
}
