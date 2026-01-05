/**
 * Tracing plugin wrapper for @hex-di/runtime.
 *
 * Provides the `withTracing` enhancement wrapper function that adds
 * tracing capabilities to containers using the Zustand/Redux-style
 * enhancement pattern.
 *
 * @example
 * ```typescript
 * import { createContainer, withTracing, TRACING } from '@hex-di/runtime';
 *
 * const container = withTracing(createContainer(graph));
 *
 * // TypeScript knows container has tracing API
 * container[TRACING].getTraces();
 * container[TRACING].subscribe((trace) => console.log(trace));
 * ```
 *
 * @example Compose with other plugins
 * ```typescript
 * import { pipe, withInspector, withTracing } from '@hex-di/runtime';
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

import { createPluginWrapper } from "../../plugin/index.js";
import type { PluginWrapper } from "../../plugin/index.js";
import { TracingPlugin, TRACING } from "./plugin.js";
import type { TracingAPI } from "@hex-di/plugin";

/**
 * Enhances a container with Tracing capabilities.
 *
 * Uses the enhancement wrapper pattern (like Zustand middleware)
 * for compile-time type safety. The resulting container type
 * includes the `[TRACING]` symbol property with full API typing.
 *
 * @example Basic usage
 * ```typescript
 * const container = withTracing(createContainer(graph));
 *
 * // TypeScript infers: Container<...> & { [TRACING]: TracingAPI }
 * container[TRACING].getTraces();
 * container[TRACING].getStats();
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
export const withTracing: PluginWrapper<typeof TRACING, TracingAPI> =
  createPluginWrapper(TracingPlugin);

/**
 * Type helper for containers enhanced with Tracing.
 *
 * @example
 * ```typescript
 * function analyzePerformance(container: WithTracing<Container<MyPorts>>) {
 *   const traces = container[TRACING].getTraces();
 *   const stats = container[TRACING].getStats();
 *   // ...
 * }
 * ```
 */
export type WithTracing<C> = C & {
  readonly [TRACING]: TracingAPI;
};
