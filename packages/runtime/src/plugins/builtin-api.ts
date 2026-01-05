/**
 * Built-in API factory for container property-based access.
 *
 * Creates InspectorAPI and TracingAPI instances for the built-in
 * `.inspector` and `.tracer` container properties.
 *
 * These APIs provide zero-ceremony access to inspection and tracing
 * functionality without requiring plugin wrappers or symbol imports.
 *
 * @packageDocumentation
 */

import type { TracingAPI, TraceFilter, TraceStats, TraceEntry } from "@hex-di/plugin";
import { MemoryCollector } from "./tracing/collectors/memory-collector.js";
import type { InspectorAPI } from "./inspector/types.js";
import { createInspector } from "./inspector/inspector.js";
import type { InternalAccessible } from "../inspector/creation.js";

// =============================================================================
// Tracer API Factory
// =============================================================================

/**
 * Creates a standalone TracingAPI instance.
 *
 * This creates a pull-based tracer with its own MemoryCollector.
 * The tracer starts empty - traces are only collected when hooks are installed
 * via the `withTracing` wrapper or manually via resolution hooks.
 *
 * @returns A frozen TracingAPI instance
 *
 * @internal
 */
export function createBuiltinTracerAPI(): TracingAPI {
  const collector = new MemoryCollector();
  let isPaused = false;

  const api: TracingAPI = {
    getTraces: (filter?: TraceFilter) => collector.getTraces(filter),
    getStats: (): TraceStats => collector.getStats(),
    pause: (): void => {
      isPaused = true;
    },
    resume: (): void => {
      isPaused = false;
    },
    clear: (): void => collector.clear(),
    subscribe: (callback: (entry: TraceEntry) => void) => collector.subscribe(callback),
    isPaused: (): boolean => isPaused,
    pin: (id: string): void => collector.pin?.(id),
    unpin: (id: string): void => collector.unpin?.(id),
  };

  return Object.freeze(api);
}

// =============================================================================
// Inspector API Factory
// =============================================================================

/**
 * Creates a standalone InspectorAPI instance from a container.
 *
 * This is a thin wrapper around the inspector module's createInspector
 * that ensures the API is frozen and ready for property attachment.
 *
 * @param container - Container with INTERNAL_ACCESS symbol
 * @returns A frozen InspectorAPI instance
 *
 * @internal
 */
export function createBuiltinInspectorAPI(container: InternalAccessible): InspectorAPI {
  // The createInspector function already returns a frozen object
  return createInspector(container);
}
