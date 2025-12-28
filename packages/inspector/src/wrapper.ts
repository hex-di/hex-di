/**
 * Inspector plugin wrapper for @hex-di/inspector.
 *
 * Provides the `withInspector` enhancement wrapper function that adds
 * inspector capabilities to containers using the Zustand/Redux-style
 * enhancement pattern.
 *
 * @example
 * ```typescript
 * import { createContainer } from '@hex-di/runtime';
 * import { withInspector, INSPECTOR } from '@hex-di/inspector';
 *
 * const container = withInspector(createContainer(graph));
 *
 * // TypeScript knows container has inspector API
 * container[INSPECTOR].getSnapshot();
 * container[INSPECTOR].subscribe((event) => console.log(event));
 * ```
 *
 * @example Compose with other plugins
 * ```typescript
 * import { pipe } from '@hex-di/runtime';
 * import { withInspector } from '@hex-di/inspector';
 * import { withTracing } from '@hex-di/tracing';
 *
 * const container = pipe(
 *   createContainer(graph),
 *   withInspector,
 *   withTracing
 * );
 *
 * // Both APIs are available with full type safety
 * container[INSPECTOR].getSnapshot();
 * container[TRACING].getTraces();
 * ```
 *
 * @packageDocumentation
 */

import { createPluginWrapper, type PluginWrapper } from "@hex-di/runtime";
import { InspectorPlugin } from "./plugin.js";
import { INSPECTOR } from "./symbols.js";
import type { InspectorWithSubscription } from "./types.js";

/**
 * Enhances a container with Inspector capabilities.
 *
 * Uses the enhancement wrapper pattern (like Zustand middleware)
 * for compile-time type safety. The resulting container type
 * includes the `[INSPECTOR]` symbol property with full API typing.
 *
 * @example Basic usage
 * ```typescript
 * const container = withInspector(createContainer(graph));
 *
 * // TypeScript infers: Container<...> & { [INSPECTOR]: InspectorWithSubscription }
 * container[INSPECTOR].getSnapshot();
 * container[INSPECTOR].subscribe(listener);
 * ```
 *
 * @example With pipe for multiple plugins
 * ```typescript
 * const container = pipe(
 *   createContainer(graph),
 *   withInspector,
 *   withTracing
 * );
 * ```
 */
export const withInspector: PluginWrapper<typeof INSPECTOR, InspectorWithSubscription> =
  createPluginWrapper(InspectorPlugin);

/**
 * Type helper for containers enhanced with Inspector.
 *
 * @example
 * ```typescript
 * function analyzeContainer(container: WithInspector<Container<MyPorts>>) {
 *   const snapshot = container[INSPECTOR].getSnapshot();
 *   // ...
 * }
 * ```
 */
export type WithInspector<C> = C & {
  readonly [INSPECTOR]: InspectorWithSubscription;
};
