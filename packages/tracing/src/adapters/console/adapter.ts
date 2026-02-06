/**
 * ConsoleTracerAdapter - DI adapter for ConsoleTracer.
 *
 * Provides TracerPort implementation via hexagonal DI container.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { TracerPort } from "../../ports/tracer.js";
import { ConsoleTracer } from "./tracer.js";
import type { ConsoleTracerOptions } from "./formatter.js";

/**
 * DI adapter for ConsoleTracer.
 *
 * Provides TracerPort implementation with console-based output for development.
 * No dependencies required - outputs directly to console.log.
 *
 * @example
 * ```typescript
 * import { createContainer, createGraph } from '@hex-di/runtime';
 * import { ConsoleTracerAdapter } from '@hex-di/tracing/adapters/console';
 *
 * const graph = createGraph()
 *   .add(ConsoleTracerAdapter)
 *   .build();
 *
 * const container = createContainer(graph);
 * const tracer = container.resolve(TracerPort);
 *
 * tracer.withSpan('my-operation', (span) => {
 *   span.setAttribute('key', 'value');
 *   // ... do work
 * });
 * // Output: [TRACE] my-operation (12.3ms) ✓ 2024-01-15T10:30:45.123Z
 * ```
 *
 * @public
 */
export const ConsoleTracerAdapter = createAdapter({
  provides: TracerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => new ConsoleTracer(),
});

/**
 * Create a ConsoleTracer instance with custom options.
 *
 * Convenience factory for direct instantiation without DI container.
 * Useful for testing or standalone usage.
 *
 * @param options - Console tracer configuration
 * @returns Configured ConsoleTracer instance
 *
 * @example
 * ```typescript
 * const tracer = createConsoleTracer({
 *   colorize: true,
 *   includeTimestamps: true,
 *   minDurationMs: 5, // Only show spans >= 5ms
 *   indent: true,
 * });
 *
 * tracer.withSpan('operation', (span) => {
 *   // ... do work
 * });
 * ```
 *
 * @public
 */
export function createConsoleTracer(options?: ConsoleTracerOptions): ConsoleTracer {
  return new ConsoleTracer(options);
}
