/**
 * Memory Tracer Adapter
 *
 * In-memory tracing implementation for testing and debugging.
 * Collects all completed spans in memory for test assertions.
 *
 * **Features:**
 * - Flat span storage for easy test assertions
 * - Parent-child relationship tracking via parentSpanId
 * - 10k span limit with FIFO eviction
 * - `getCollectedSpans()` for test verification
 * - `clear()` for test isolation
 *
 * **Usage in tests:**
 * ```typescript
 * import { createContainer } from '@hex-di/runtime';
 * import { TracerPort } from '@hex-di/tracing/ports';
 * import { MemoryTracerAdapter } from '@hex-di/tracing/adapters/memory';
 *
 * test('traces operations', () => {
 *   const container = createContainer()
 *     .register(MemoryTracerAdapter)
 *     .build();
 *
 *   const tracer = container.get(TracerPort);
 *
 *   tracer.withSpan('operation', (span) => {
 *     span.setAttribute('key', 'value');
 *   });
 *
 *   const spans = tracer.getCollectedSpans();
 *   expect(spans).toHaveLength(1);
 *   expect(spans[0].name).toBe('operation');
 *   expect(spans[0].attributes.key).toBe('value');
 * });
 * ```
 *
 * **Direct usage without DI:**
 * ```typescript
 * import { createMemoryTracer } from '@hex-di/tracing/adapters/memory';
 *
 * const tracer = createMemoryTracer();
 *
 * tracer.withSpan('test', (span) => {
 *   span.setAttribute('test', true);
 * });
 *
 * console.log(tracer.getCollectedSpans());
 * tracer.clear();
 * ```
 *
 * @packageDocumentation
 */

export { MemoryTracerAdapter } from "./adapter.js";
export { MemoryTracer, createMemoryTracer } from "./tracer.js";
export type { MemoryTracerOptions } from "./tracer.js";
export { MemorySpan } from "./span.js";
