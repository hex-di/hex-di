/**
 * Plugin composition utilities for @hex-di/runtime.
 *
 * Provides helpers for composing multiple plugin wrappers into
 * a single enhancer function, similar to Redux's `compose` or
 * Zustand's middleware stacking.
 *
 * @packageDocumentation
 */

import type { PluginWrapper, EnhanceableContainer, WithPlugin } from "./wrapper.js";

// =============================================================================
// Pipe Utility - Primary Composition Method
// =============================================================================

/**
 * Pipes a container through multiple wrappers.
 *
 * This is the recommended way to compose plugins, as TypeScript
 * can fully infer the result type without any casts.
 *
 * @param container - The base container to enhance
 * @returns The enhanced container (with wrappers applied if provided)
 *
 * @example Single plugin
 * ```typescript
 * const container = pipe(
 *   createContainer(graph),
 *   withInspector
 * );
 * container[INSPECTOR].getSnapshot();
 * ```
 *
 * @example Multiple plugins
 * ```typescript
 * const container = pipe(
 *   createContainer(graph),
 *   withInspector,
 *   withTracing,
 *   withMetrics
 * );
 *
 * container[INSPECTOR].getSnapshot();
 * container[TRACING].getTraces();
 * container[METRICS].getStats();
 * ```
 */
export function pipe<C extends EnhanceableContainer>(container: C): C;

export function pipe<C extends EnhanceableContainer, S1 extends symbol, A1>(
  container: C,
  w1: PluginWrapper<S1, A1>
): WithPlugin<C, S1, A1>;

export function pipe<C extends EnhanceableContainer, S1 extends symbol, A1, S2 extends symbol, A2>(
  container: C,
  w1: PluginWrapper<S1, A1>,
  w2: PluginWrapper<S2, A2>
): WithPlugin<WithPlugin<C, S1, A1>, S2, A2>;

export function pipe<
  C extends EnhanceableContainer,
  S1 extends symbol,
  A1,
  S2 extends symbol,
  A2,
  S3 extends symbol,
  A3,
>(
  container: C,
  w1: PluginWrapper<S1, A1>,
  w2: PluginWrapper<S2, A2>,
  w3: PluginWrapper<S3, A3>
): WithPlugin<WithPlugin<WithPlugin<C, S1, A1>, S2, A2>, S3, A3>;

export function pipe<
  C extends EnhanceableContainer,
  S1 extends symbol,
  A1,
  S2 extends symbol,
  A2,
  S3 extends symbol,
  A3,
  S4 extends symbol,
  A4,
>(
  container: C,
  w1: PluginWrapper<S1, A1>,
  w2: PluginWrapper<S2, A2>,
  w3: PluginWrapper<S3, A3>,
  w4: PluginWrapper<S4, A4>
): WithPlugin<WithPlugin<WithPlugin<WithPlugin<C, S1, A1>, S2, A2>, S3, A3>, S4, A4>;

export function pipe<
  C extends EnhanceableContainer,
  S1 extends symbol,
  A1,
  S2 extends symbol,
  A2,
  S3 extends symbol,
  A3,
  S4 extends symbol,
  A4,
  S5 extends symbol,
  A5,
>(
  container: C,
  w1: PluginWrapper<S1, A1>,
  w2: PluginWrapper<S2, A2>,
  w3: PluginWrapper<S3, A3>,
  w4: PluginWrapper<S4, A4>,
  w5: PluginWrapper<S5, A5>
): WithPlugin<
  WithPlugin<WithPlugin<WithPlugin<WithPlugin<C, S1, A1>, S2, A2>, S3, A3>, S4, A4>,
  S5,
  A5
>;

// Implementation - uses simpler function type for compatibility with overloads
export function pipe(
  container: EnhanceableContainer,
  ...wrappers: Array<(c: EnhanceableContainer) => EnhanceableContainer>
): EnhanceableContainer {
  let enhanced: EnhanceableContainer = container;
  for (const wrapper of wrappers) {
    enhanced = wrapper(enhanced);
  }
  return enhanced;
}

// =============================================================================
// Compose Utility - For Creating Reusable Enhancers
// =============================================================================

/**
 * Composes two plugin wrappers into a single enhancer.
 *
 * Use `pipe` for direct application, use `compose` when you need
 * a reusable enhancer function.
 *
 * @example
 * ```typescript
 * // Create a reusable enhancer
 * const withDevTools = compose2(withInspector, withTracing);
 *
 * // Apply to multiple containers
 * const container1 = withDevTools(createContainer(graph1));
 * const container2 = withDevTools(createContainer(graph2));
 * ```
 */
export function compose2<S1 extends symbol, A1, S2 extends symbol, A2>(
  w1: PluginWrapper<S1, A1>,
  w2: PluginWrapper<S2, A2>
): <C extends EnhanceableContainer>(container: C) => WithPlugin<WithPlugin<C, S1, A1>, S2, A2> {
  return <C extends EnhanceableContainer>(container: C) => w2(w1(container));
}

/**
 * Composes three plugin wrappers into a single enhancer.
 */
export function compose3<S1 extends symbol, A1, S2 extends symbol, A2, S3 extends symbol, A3>(
  w1: PluginWrapper<S1, A1>,
  w2: PluginWrapper<S2, A2>,
  w3: PluginWrapper<S3, A3>
): <C extends EnhanceableContainer>(
  container: C
) => WithPlugin<WithPlugin<WithPlugin<C, S1, A1>, S2, A2>, S3, A3> {
  return <C extends EnhanceableContainer>(container: C) => w3(w2(w1(container)));
}

/**
 * Composes four plugin wrappers into a single enhancer.
 */
export function compose4<
  S1 extends symbol,
  A1,
  S2 extends symbol,
  A2,
  S3 extends symbol,
  A3,
  S4 extends symbol,
  A4,
>(
  w1: PluginWrapper<S1, A1>,
  w2: PluginWrapper<S2, A2>,
  w3: PluginWrapper<S3, A3>,
  w4: PluginWrapper<S4, A4>
): <C extends EnhanceableContainer>(
  container: C
) => WithPlugin<WithPlugin<WithPlugin<WithPlugin<C, S1, A1>, S2, A2>, S3, A3>, S4, A4> {
  return <C extends EnhanceableContainer>(container: C) => w4(w3(w2(w1(container))));
}

/**
 * Composes five plugin wrappers into a single enhancer.
 */
export function compose5<
  S1 extends symbol,
  A1,
  S2 extends symbol,
  A2,
  S3 extends symbol,
  A3,
  S4 extends symbol,
  A4,
  S5 extends symbol,
  A5,
>(
  w1: PluginWrapper<S1, A1>,
  w2: PluginWrapper<S2, A2>,
  w3: PluginWrapper<S3, A3>,
  w4: PluginWrapper<S4, A4>,
  w5: PluginWrapper<S5, A5>
): <C extends EnhanceableContainer>(
  container: C
) => WithPlugin<
  WithPlugin<WithPlugin<WithPlugin<WithPlugin<C, S1, A1>, S2, A2>, S3, A3>, S4, A4>,
  S5,
  A5
> {
  return <C extends EnhanceableContainer>(container: C) => w5(w4(w3(w2(w1(container)))));
}
