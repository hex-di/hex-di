/**
 * Standalone container tracing functions.
 *
 * Provides simple APIs for tracing container resolutions:
 * - trace(container, fn): Trace resolutions within a callback
 * - enableTracing(container): Enable global tracing, returns disable function
 *
 * @packageDocumentation
 */

import type { Port, TraceEntry } from "@hex-di/core";
import type { Container, ContainerPhase } from "./types/index.js";
import type { ResolutionHookContext, ResolutionResultContext } from "./resolution/hooks.js";

// Counter for unique trace IDs
let traceIdCounter = 0;

/**
 * Result of a traced execution.
 */
export interface TraceResult<R> {
  /** The result of the traced function */
  readonly result: R;
  /** Array of trace entries collected during execution */
  readonly traces: readonly TraceEntry[];
}

/**
 * Creates a trace entry from resolution context.
 * @internal
 */
function createTraceEntry(
  ctx: ResolutionResultContext,
  startTime: number,
  duration: number,
  order: number
): TraceEntry {
  return Object.freeze({
    id: `trace-${++traceIdCounter}`,
    portName: ctx.portName,
    lifetime: ctx.lifetime,
    startTime,
    duration,
    isCacheHit: ctx.isCacheHit,
    parentId: ctx.parentPort ? `parent-${ctx.parentPort.__portName}` : null,
    childIds: Object.freeze([]),
    scopeId: ctx.scopeId,
    order,
    isPinned: false,
  });
}

/**
 * Traces all resolutions within a callback function.
 *
 * Installs temporary hooks before the callback runs, collects all
 * resolution traces, then removes the hooks and returns both the
 * callback result and the collected traces.
 *
 * @param container - The container to trace
 * @param fn - The function to execute with tracing
 * @returns Object with result and traces array
 *
 * @example
 * ```typescript
 * import { createContainer, trace } from '@hex-di/runtime';
 *
 * const container = createContainer(graph, { name: 'App' });
 *
 * const { result, traces } = trace(container, () => {
 *   const logger = container.resolve(LoggerPort);
 *   const db = container.resolve(DatabasePort);
 *   return { logger, db };
 * });
 *
 * console.log('Resolved services:', result);
 * console.log('Resolution traces:', traces);
 * // traces = [
 * //   { portName: 'Logger', duration: 0.5, ... },
 * //   { portName: 'Database', duration: 2.1, ... }
 * // ]
 * ```
 */
export function trace<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
  R,
>(container: Container<TProvides, TExtends, TAsyncPorts, TPhase>, fn: () => R): TraceResult<R> {
  const traces: TraceEntry[] = [];
  const startTimes = new Map<string, number>();
  let order = 0;

  // Install before hook to capture start time
  const beforeHandler = (ctx: ResolutionHookContext): void => {
    startTimes.set(ctx.portName, Date.now());
  };

  // Install after hook to capture trace entry
  const afterHandler = (ctx: ResolutionResultContext): void => {
    const startTime = startTimes.get(ctx.portName) ?? Date.now();
    const duration = Date.now() - startTime;
    traces.push(createTraceEntry(ctx, startTime, duration, ++order));
  };

  // Install hooks
  container.addHook("beforeResolve", beforeHandler);
  container.addHook("afterResolve", afterHandler);

  try {
    // Execute the function
    const result = fn();
    return { result, traces: Object.freeze(traces) };
  } finally {
    // Remove hooks
    container.removeHook("beforeResolve", beforeHandler);
    container.removeHook("afterResolve", afterHandler);
  }
}

/**
 * Callback for receiving trace entries during global tracing.
 */
export type TraceCallback = (entry: TraceEntry) => void;

/**
 * Enables global tracing for a container.
 *
 * Returns a function to disable tracing. While enabled, all resolutions
 * are traced and provided to the optional callback. The callback receives
 * trace entries in real-time as resolutions complete.
 *
 * @param container - The container to enable tracing on
 * @param callback - Optional callback to receive trace entries
 * @returns A function to disable tracing
 *
 * @example
 * ```typescript
 * import { createContainer, enableTracing } from '@hex-di/runtime';
 *
 * const container = createContainer(graph, { name: 'App' });
 * const traces: TraceEntry[] = [];
 *
 * const disableTracing = enableTracing(container, (entry) => {
 *   traces.push(entry);
 *   console.log(`Resolved: ${entry.portName} in ${entry.duration}ms`);
 * });
 *
 * // All resolutions are now traced
 * container.resolve(LoggerPort);
 * container.resolve(DatabasePort);
 *
 * console.log('Collected traces:', traces);
 *
 * // Disable when done
 * disableTracing();
 * ```
 *
 * @example Without callback (silent tracing)
 * ```typescript
 * const container = createContainer(graph, { name: 'App' });
 * const disableTracing = enableTracing(container);
 *
 * // Tracing is enabled but no callback provided
 * // Useful when combined with container.tracer.getTraces()
 *
 * disableTracing();
 * ```
 */
export function enableTracing<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(
  container: Container<TProvides, TExtends, TAsyncPorts, TPhase>,
  callback?: TraceCallback
): () => void {
  const startTimes = new Map<string, number>();
  let order = 0;

  const beforeHandler = (ctx: ResolutionHookContext): void => {
    startTimes.set(ctx.portName, Date.now());
  };

  const afterHandler = (ctx: ResolutionResultContext): void => {
    const startTime = startTimes.get(ctx.portName) ?? Date.now();
    const duration = Date.now() - startTime;

    if (callback) {
      const entry = createTraceEntry(ctx, startTime, duration, ++order);
      callback(entry);
    }
  };

  container.addHook("beforeResolve", beforeHandler);
  container.addHook("afterResolve", afterHandler);

  return () => {
    container.removeHook("beforeResolve", beforeHandler);
    container.removeHook("afterResolve", afterHandler);
    startTimes.clear();
  };
}
