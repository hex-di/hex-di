import type { Port } from "../ports/types.js";
import type { Adapter, Lifetime } from "./types.js";
import { SYNC, ASYNC, SINGLETON, FALSE, EMPTY_REQUIRES } from "./constants.js";
import { extractServicesInOrder, assertValidAdapterConfig } from "./unified-validation.js";

interface UnifiedAdapterConfig {
  provides: Port<string, unknown>;
  factory?: (deps: Record<string, unknown>) => unknown | Promise<unknown>;
  class?: new (...args: unknown[]) => unknown;
  requires?: readonly Port<string, unknown>[];
  lifetime?: Lifetime;
  clonable?: boolean;
  freeze?: boolean;
  finalizer?: (instance: unknown) => void | Promise<void>;
  errorTags?: readonly string[];
}

type UnifiedAdapter = Adapter<
  Port<string, unknown>,
  unknown,
  Lifetime,
  typeof SYNC | typeof ASYNC,
  boolean,
  readonly Port<string, unknown>[],
  unknown
>;

export function implementUnifiedCreateAdapter(config: UnifiedAdapterConfig): UnifiedAdapter {
  validateFactoryOrClass(config);

  const requires = config.requires ?? EMPTY_REQUIRES;
  const lifetime = config.lifetime ?? SINGLETON;
  const clonable = config.clonable ?? FALSE;
  const freeze = config.freeze !== false;

  const { factory, factoryKind } = resolveFactory(config, requires);

  const isAsync = factoryKind === ASYNC;
  const effectiveLifetime = isAsync ? SINGLETON : lifetime;

  assertValidAdapterConfig(
    {
      provides: config.provides,
      requires,
      lifetime: effectiveLifetime,
      factory: config.factory ?? factory,
      finalizer: config.finalizer,
    },
    isAsync
  );

  const baseAdapter = buildBaseAdapter(
    config,
    requires,
    effectiveLifetime,
    factoryKind,
    factory,
    clonable,
    freeze
  );

  if (config.finalizer !== undefined) {
    return Object.freeze({ ...baseAdapter, finalizer: config.finalizer });
  }

  return Object.freeze(baseAdapter);
}

function validateFactoryOrClass(config: UnifiedAdapterConfig): void {
  const hasFactory = config.factory !== undefined;
  const hasClass = config.class !== undefined;

  if (hasFactory && hasClass) {
    throw new TypeError(
      "ERROR[HEX020]: Invalid adapter config: Cannot provide both 'factory' and 'class'. " +
        "Use 'factory' for custom instantiation logic, or 'class' for constructor injection."
    );
  }

  if (!hasFactory && !hasClass) {
    throw new TypeError(
      "ERROR[HEX019]: Invalid adapter config: Must provide either 'factory' or 'class'. " +
        "Provide a factory function that creates the instance, or a class constructor for dependency injection."
    );
  }
}

function resolveFactory(
  config: UnifiedAdapterConfig,
  requires: readonly Port<string, unknown>[]
): {
  factory: (deps: Record<string, unknown>) => unknown | Promise<unknown>;
  factoryKind: typeof SYNC | typeof ASYNC;
} {
  if (config.class !== undefined) {
    const ClassConstructor = config.class;
    return {
      factory: (deps: Record<string, unknown>): unknown => {
        const args = extractServicesInOrder(deps, requires);
        return new ClassConstructor(...args);
      },
      factoryKind: SYNC,
    };
  }

  if (config.factory !== undefined) {
    const isAsyncFactory = config.factory.constructor.name === "AsyncFunction";
    return { factory: config.factory, factoryKind: isAsyncFactory ? ASYNC : SYNC };
  }

  throw new TypeError("Unreachable: either factory or class must be defined");
}

function buildBaseAdapter(
  config: UnifiedAdapterConfig,
  requires: readonly Port<string, unknown>[],
  lifetime: Lifetime,
  factoryKind: typeof SYNC | typeof ASYNC,
  factory: (deps: Record<string, unknown>) => unknown | Promise<unknown>,
  clonable: boolean,
  freeze: boolean
): UnifiedAdapter {
  const errorTags = config.errorTags;
  const hasErrorTags = errorTags !== undefined && errorTags.length > 0;

  if (hasErrorTags) {
    return {
      provides: config.provides,
      requires,
      lifetime,
      factoryKind,
      factory,
      clonable,
      freeze,
      __errorTags: Object.freeze([...errorTags]),
    };
  }

  return {
    provides: config.provides,
    requires,
    lifetime,
    factoryKind,
    factory,
    clonable,
    freeze,
  };
}
