/**
 * Tracing Inspection Ports
 *
 * DI port tokens for tracing inspection services.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { TracingQueryAPI } from "./types.js";

/**
 * Port for the TracingQueryAPI service.
 *
 * Users must register their own adapter for this port since the span source
 * depends on which tracer adapter they chose (Memory, Console, etc.).
 * Only MemoryTracer has getCompletedSpans().
 *
 * @example
 * ```typescript
 * // User-provided adapter
 * const TracingQueryApiAdapter = Object.freeze({
 *   provides: TracingQueryApiPort,
 *   requires: [MemoryTracerPort],
 *   factory: ({ MemoryTracer }) => createTracingQueryApi(() => MemoryTracer.getCompletedSpans()),
 * });
 * ```
 */
export const TracingQueryApiPort = port<TracingQueryAPI>()({
  name: "TracingQueryApi",
  direction: "outbound",
  category: "infrastructure",
  tags: ["tracing", "inspection"],
});
