/**
 * QueryTracingHook - Distributed Tracing Spans
 *
 * Creates tracing spans for query fetch and mutation operations.
 * Uses the minimal TracerLike interface so @hex-di/query does NOT depend on
 * @hex-di/tracing — any tracing adapter can provide a compatible object.
 *
 * @packageDocumentation
 */

import type {
  QueryTracingHook,
  QueryTracingHookOptions,
  QueryFetchSpanAttributes,
  QueryMutationSpanAttributes,
} from "./types.js";

// =============================================================================
// QueryTracingHook Factory
// =============================================================================

/**
 * Creates a QueryTracingHook instance for distributed tracing integration.
 *
 * @param options - Hook configuration with tracer, optional filter, and traceMutations flag
 * @returns A new QueryTracingHook
 */
export function createQueryTracingHook(options: QueryTracingHookOptions): QueryTracingHook {
  const { tracer, filter, scopeId, traceContext } = options;
  const traceMutations = options.traceMutations ?? true;

  /**
   * Builds span attributes with optional scopeId and traceContext entries.
   */
  function withScopeAttrs(base: Record<string, string>): Record<string, string> {
    const attrs: Record<string, string> = { ...base };
    if (scopeId !== undefined) attrs["scope_id"] = scopeId;
    if (traceContext !== undefined) {
      for (const [key, value] of Object.entries(traceContext)) {
        attrs[key] = value;
      }
    }
    return attrs;
  }

  const hook: QueryTracingHook = {
    onFetchStart(portName: string, params: string, spanAttrs: QueryFetchSpanAttributes): void {
      if (filter !== undefined && !filter(portName)) return;
      tracer.pushSpan(
        `query:fetch:${portName}`,
        withScopeAttrs({
          "hex-di.query.port.name": portName,
          "hex-di.query.params": params,
          "hex-di.query.cache_hit": String(spanAttrs.cacheHit),
          "hex-di.query.deduplicated": String(spanAttrs.deduplicated),
          "hex-di.query.stale_time_ms": String(spanAttrs.staleTimeMs),
        })
      );
    },

    onFetchEnd(portName: string, ok: boolean): void {
      if (filter !== undefined && !filter(portName)) return;
      tracer.popSpan(ok ? "ok" : "error");
    },

    onMutationStart(portName: string, input: string, spanAttrs: QueryMutationSpanAttributes): void {
      if (!traceMutations) return;
      if (filter !== undefined && !filter(portName)) return;
      tracer.pushSpan(
        `query:mutate:${portName}`,
        withScopeAttrs({
          "hex-di.query.port.name": spanAttrs.portName,
          "hex-di.query.input": input,
        })
      );
    },

    onMutationEnd(portName: string, ok: boolean): void {
      if (!traceMutations) return;
      if (filter !== undefined && !filter(portName)) return;
      tracer.popSpan(ok ? "ok" : "error");
    },
  };

  return hook;
}
