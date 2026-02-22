/**
 * MemoryTracerAdapter - Adapter registration for memory tracer.
 *
 * Provides the MemoryTracer implementation as a TracerPort adapter
 * for dependency injection. Useful for testing and development.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { TracerPort } from "../../ports/tracer.js";
import { MemoryTracer } from "./tracer.js";

/**
 * MemoryTracerAdapter - DI adapter for the memory tracer.
 *
 * Provides TracerPort implementation with in-memory span collection.
 * Uses transient lifetime for test isolation (each injection gets a new instance).
 *
 * **Usage:**
 * ```typescript
 * import { createContainer } from '@hex-di/runtime';
 * import { TracerPort } from '@hex-di/tracing/ports';
 * import { MemoryTracerAdapter } from '@hex-di/tracing/adapters/memory';
 *
 * const container = createContainer()
 *   .register(MemoryTracerAdapter)
 *   .build();
 *
 * const tracer = container.get(TracerPort);
 * // tracer is a MemoryTracer instance
 * ```
 *
 * @public
 */
export const MemoryTracerAdapter = createAdapter({
  provides: TracerPort,
  requires: [],
  lifetime: "transient",
  factory: () => new MemoryTracer(),
});
