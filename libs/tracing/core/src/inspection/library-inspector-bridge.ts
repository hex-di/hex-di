/**
 * Library Inspector Protocol bridge for the Tracing library.
 *
 * Adapts the TracingQueryAPI into a LibraryInspector so it can
 * participate in the container's unified inspection system.
 *
 * @packageDocumentation
 */

import { createLibraryInspectorPort } from "@hex-di/core";
import type { LibraryInspector } from "@hex-di/core";
import type { TracingQueryAPI } from "./types.js";

/**
 * Port for the Tracing library inspector bridge.
 */
export const TracingLibraryInspectorPort = createLibraryInspectorPort({
  name: "TracingLibraryInspector",
  description: "Library inspector bridge for tracing",
});

/**
 * Creates a LibraryInspector that bridges the TracingQueryAPI
 * into the container's unified inspection protocol.
 *
 * No subscribe method — MemoryTracer is pull-only, so there
 * are no push-based events to subscribe to.
 *
 * @param queryApi - The TracingQueryAPI instance to bridge
 * @returns A LibraryInspector compatible with the container registry
 */
export function createTracingLibraryInspector(queryApi: TracingQueryAPI): LibraryInspector {
  return {
    name: "tracing",
    getSnapshot(): Readonly<Record<string, unknown>> {
      return Object.freeze({
        totalSpans: queryApi.getResolutionCount(),
        errorCount: queryApi.getErrorCount(),
        averageDuration: queryApi.getAverageDuration() ?? 0,
        cacheHitRate: queryApi.getCacheHitRate() ?? 0,
      });
    },
    // No subscribe — MemoryTracer is pull-only
  };
}
