/**
 * ConsoleTracer adapter for development debugging.
 *
 * Provides human-readable console output with colorization, timestamps,
 * hierarchy visualization, and duration filtering.
 *
 * ## Features
 *
 * - **Colorized output**: ANSI colors for TTY terminals (auto-detected)
 * - **Span hierarchy**: Indentation shows parent-child relationships
 * - **Duration filtering**: Hide fast spans below threshold (minDurationMs)
 * - **Timestamps**: ISO 8601 timestamps for each span
 * - **Error highlighting**: Red markers and error messages for failed spans
 * - **Attributes display**: Key-value attributes shown below each span
 *
 * ## Usage
 *
 * ### With DI Container
 *
 * ```typescript
 * import { createContainer, createGraph } from '@hex-di/runtime';
 * import { ConsoleTracerAdapter } from '@hex-di/tracing/adapters/console';
 * import { TracerPort } from '@hex-di/tracing/ports';
 *
 * const graph = createGraph()
 *   .add(ConsoleTracerAdapter)
 *   .build();
 *
 * const container = createContainer(graph);
 * const tracer = container.resolve(TracerPort);
 * ```
 *
 * ### Standalone
 *
 * ```typescript
 * import { createConsoleTracer } from '@hex-di/tracing/adapters/console';
 *
 * const tracer = createConsoleTracer({
 *   colorize: true,
 *   includeTimestamps: true,
 *   minDurationMs: 1,
 *   indent: true,
 * });
 * ```
 *
 * ## Output Example
 *
 * ```
 * [TRACE] http.request (45.2ms) ✓ 2024-01-15T10:30:45.123Z
 *    {http.method=GET, http.url=/api/users}
 *   └─ [TRACE] db.query (12.3ms) ✓ 2024-01-15T10:30:45.135Z
 *      {db.table=users, db.rows=5}
 *   └─ [TRACE] cache.set (2.1ms) ✓ 2024-01-15T10:30:45.150Z
 * ```
 *
 * @packageDocumentation
 */

export { ConsoleTracerAdapter, createConsoleTracer } from "./adapter.js";
export { ConsoleTracer } from "./tracer.js";
export type { ConsoleTracerOptions } from "./formatter.js";
