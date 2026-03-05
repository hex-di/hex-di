/**
 * Type-boundary bridge for adapter construction.
 *
 * The query/mutation adapter factories need to produce AdapterConstraint
 * objects. Rather than calling createAdapter (which has 16+ strict overloads
 * that cannot be matched with type-erased factories), this module constructs
 * the adapter object directly with the correct runtime shape.
 *
 * The public API overloads on createQueryAdapter / createMutationAdapter /
 * createStreamedQueryAdapter ensure full type safety at call sites.
 * This bridge only runs inside their implementation bodies where types
 * are already validated by the overload signatures.
 *
 * @packageDocumentation
 */

import type { AdapterConstraint, Lifetime } from "@hex-di/core";
import type { Port } from "@hex-di/core";
import { SYNC, FALSE } from "@hex-di/core";

/**
 * Configuration accepted by the bridge for no-dependency adapters.
 */
interface BridgeConfigNoDeps {
  readonly provides: Port<string, unknown>;
  readonly factory: () => unknown;
  readonly lifetime?: Lifetime;
  readonly requires?: undefined;
}

/**
 * Configuration accepted by the bridge for adapters with dependencies.
 */
interface BridgeConfigWithDeps {
  readonly provides: Port<string, unknown>;
  readonly requires: ReadonlyArray<Port<string, unknown>>;
  readonly factory: (deps: Record<string, unknown>) => unknown;
  readonly lifetime?: Lifetime;
}

/**
 * Constructs an AdapterConstraint object from type-erased config.
 *
 * This bridges the gap between query-specific adapter factories (which
 * have validated types via their overload signatures) and the DI system
 * (which needs an AdapterConstraint-shaped object).
 *
 * Two overloads match the two calling patterns: no-deps and with-deps.
 * The implementation constructs the frozen adapter object directly.
 */
export function bridgeCreateAdapter(config: BridgeConfigNoDeps): AdapterConstraint;
export function bridgeCreateAdapter(config: BridgeConfigWithDeps): AdapterConstraint;
export function bridgeCreateAdapter(
  config: BridgeConfigNoDeps | BridgeConfigWithDeps
): AdapterConstraint {
  return Object.freeze({
    provides: config.provides,
    requires: config.requires ?? [],
    lifetime: config.lifetime ?? "singleton",
    factoryKind: SYNC,
    factory: config.factory,
    clonable: FALSE,
    freeze: true,
  });
}
