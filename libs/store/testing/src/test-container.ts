/**
 * Test Container Factory
 *
 * Creates a fully-wired DI container for testing store adapters
 * using real GraphBuilder and createContainer from the hex-di stack.
 *
 * @packageDocumentation
 */

import type { AdapterConstraint, Port } from "@hex-di/core";
import type { Graph } from "@hex-di/graph";
import { GraphBuilder, isGraph } from "@hex-di/graph";
import type { Container } from "@hex-di/runtime";
import { createContainer } from "@hex-di/runtime";

// =============================================================================
// Types
// =============================================================================

/**
 * A test container with all ports resolvable synchronously.
 *
 * Uses `Port<unknown, string>` as TProvides so any port can be resolved,
 * and `never` for TAsyncPorts so `resolve()` accepts all ports.
 */
export type TestContainer = Container<Port<unknown, string>>;

/**
 * Configuration for {@link createStateTestContainer}.
 *
 * @typeParam A - Tuple of adapters to register
 */
export interface StateTestContainerConfig<A extends readonly AdapterConstraint[]> {
  /** Adapters (state, derived, effects) to register */
  readonly adapters: A;
  /**
   * Optional overrides applied after container creation.
   * Each tuple is `[port, value]`. The resolved service must have a `set()`
   * method (e.g. AtomService). For services without `set()`, the override
   * is silently skipped.
   */
  readonly overrides?: ReadonlyArray<readonly [Port<unknown, string>, unknown]>;
}

// =============================================================================
// Type Guard
// =============================================================================

function hasSetMethod(service: unknown): service is { set: (value: unknown) => void } {
  if (service === null || typeof service !== "object") return false;
  return typeof Reflect.get(service, "set") === "function";
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Builds a Graph from an array of adapters at runtime, bypassing
 * the type-level validation that prevents generic adapter arrays
 * from flowing through `GraphBuilder.provideMany().build()`.
 *
 * This works because `Graph`'s phantom type properties (`__provides`,
 * `__asyncPorts`, `__overrides`) and brand symbol exist only at the
 * type level — the runtime `build()` output is just
 * `{ adapters, overridePortNames }`. The `const A` overload signature
 * on the public API ensures callers get precise types.
 */
function buildGraphFromAdapters(
  adapters: readonly AdapterConstraint[]
): Graph<Port<unknown, string>> {
  const result: unknown = GraphBuilder.create().provideMany(adapters).build();
  if (!isGraph(result)) {
    throw new Error(
      typeof result === "string"
        ? `Graph build failed: ${result}`
        : "Graph build produced an invalid result"
    );
  }
  return result;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates a test container from the given adapters or config.
 *
 * Builds a real graph and container — no mocks. Suitable for integration
 * and E2E tests that exercise the full DI + reactivity stack.
 *
 * Accepts either a bare adapters array (backward compatible) or a config
 * object with optional `overrides` for setting initial values on atom ports.
 *
 * @param configOrAdapters - Either a config object with adapters + overrides,
 *   or a bare adapters array (backward compatible)
 * @returns A container ready for port resolution
 *
 * @example
 * ```typescript
 * // Bare adapters array (backward compatible)
 * const container = createStateTestContainer([counterAdapter, derivedAdapter]);
 *
 * // Config object with overrides
 * const container = createStateTestContainer({
 *   adapters: [themeAdapter],
 *   overrides: [[ThemePort, "dark"]],
 * });
 * ```
 */
export function createStateTestContainer<const A extends readonly AdapterConstraint[]>(
  configOrAdapters: StateTestContainerConfig<A> | A
): TestContainer;
export function createStateTestContainer(
  configOrAdapters:
    | StateTestContainerConfig<readonly AdapterConstraint[]>
    | readonly AdapterConstraint[]
): TestContainer {
  const isConfig = !Array.isArray(configOrAdapters) && "adapters" in configOrAdapters;
  const adapters = isConfig ? configOrAdapters.adapters : configOrAdapters;
  const overrides = isConfig ? configOrAdapters.overrides : undefined;

  const graph = buildGraphFromAdapters(adapters);
  const container = createContainer({ graph, name: "test" });

  if (overrides) {
    for (const [port, value] of overrides) {
      const service: unknown = container.resolve(port);
      if (hasSetMethod(service)) {
        service.set(value);
      }
    }
  }

  return container;
}
