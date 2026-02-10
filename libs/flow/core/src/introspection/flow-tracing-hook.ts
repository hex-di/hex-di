/**
 * FlowTracingHook - Distributed Tracing Spans
 *
 * Creates tracing spans for state machine transitions and effect executions.
 * Uses the minimal TracerLike interface so @hex-di/flow does NOT depend on
 * @hex-di/tracing — any tracing adapter can provide a compatible object.
 *
 * @packageDocumentation
 */

import type { FlowTracingHook, FlowTracingHookOptions } from "./types.js";

// =============================================================================
// FlowTracingHook Factory
// =============================================================================

/**
 * Creates a FlowTracingHook instance for distributed tracing integration.
 *
 * @param options - Hook configuration with tracer, optional filter, and traceEffects flag
 * @returns A new FlowTracingHook
 */
export function createFlowTracingHook(options: FlowTracingHookOptions): FlowTracingHook {
  const { tracer, filter, scopeId, traceContext } = options;
  const traceEffects = options.traceEffects ?? true;

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

  const hook: FlowTracingHook = {
    onTransitionStart(machineId: string, from: string, to: string, eventType: string): void {
      if (filter !== undefined && !filter(machineId)) return;
      tracer.pushSpan(
        `flow:${machineId}/${from}->${to}`,
        withScopeAttrs({
          machine_id: machineId,
          from_state: from,
          to_state: to,
          event_type: eventType,
        })
      );
    },

    onTransitionEnd(machineId: string, ok: boolean): void {
      if (filter !== undefined && !filter(machineId)) return;
      tracer.popSpan(ok ? "ok" : "error");
    },

    onEffectStart(effectTag: string, detail: string): void {
      if (!traceEffects) return;
      tracer.pushSpan(
        `flow:effect:${effectTag}:${detail}`,
        withScopeAttrs({
          effect_tag: effectTag,
          detail,
        })
      );
    },

    onEffectEnd(ok: boolean): void {
      if (!traceEffects) return;
      tracer.popSpan(ok ? "ok" : "error");
    },
  };

  return hook;
}
