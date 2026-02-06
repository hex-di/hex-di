/**
 * NoOpTracerAdapter - Zero-overhead tracer adapter for disabled tracing.
 *
 * This adapter provides a TracerPort implementation that performs no operations
 * and has zero runtime overhead. Use this adapter in production environments
 * where tracing is disabled to avoid any performance impact from instrumentation.
 *
 * **Zero-overhead design:**
 * - Returns singleton frozen instances (no allocations)
 * - No timing calls (no Date.now(), no performance.now())
 * - No state mutations (all objects frozen)
 * - No dependencies required (empty requires array)
 *
 * **Usage:**
 * ```typescript
 * import { GraphBuilder } from '@hex-di/graph';
 * import { TracerPort } from '@hex-di/tracing';
 * import { NoOpTracerAdapter } from '@hex-di/tracing/adapters/noop';
 *
 * const graph = GraphBuilder.create()
 *   .addAdapter(NoOpTracerAdapter)
 *   .build();
 * ```
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { TracerPort } from "../../ports/tracer.js";
import { NOOP_TRACER_EXPORTED } from "./tracer.js";

/**
 * Adapter that provides a zero-overhead NoOp tracer implementation.
 *
 * This adapter implements TracerPort with no dependencies and singleton lifetime.
 * All tracing operations are no-ops, ensuring zero performance impact when
 * tracing is disabled.
 *
 * **Characteristics:**
 * - **Provides:** TracerPort
 * - **Requires:** None (empty requires array)
 * - **Lifetime:** Singleton (one instance per container)
 * - **Overhead:** Zero (frozen singleton, no allocations)
 *
 * @public
 */
export const NoOpTracerAdapter = createAdapter({
  provides: TracerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => NOOP_TRACER_EXPORTED,
});
