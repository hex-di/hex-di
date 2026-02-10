/**
 * SagaTracingHook - Distributed Tracing Spans
 *
 * Creates tracing spans for saga step executions and compensation.
 * Uses the minimal TracerLike interface so @hex-di/saga does NOT depend on
 * @hex-di/tracing — any tracing adapter can provide a compatible object.
 *
 * @packageDocumentation
 */

import type { SagaTracingHook, SagaTracingHookOptions } from "./types.js";

// =============================================================================
// SagaTracingHook Factory
// =============================================================================

/**
 * Creates a SagaTracingHook instance for distributed tracing integration.
 *
 * @param options - Hook configuration with tracer, optional filter, and traceCompensation flag
 * @returns A new SagaTracingHook
 */
export function createSagaTracingHook(options: SagaTracingHookOptions): SagaTracingHook {
  const { tracer, filter, scopeId, traceContext } = options;
  const traceCompensation = options.traceCompensation ?? true;

  /**
   * Builds span attributes with optional scopeId and traceContext entries.
   */
  function withScopeAttrs(base: Record<string, string>): Record<string, string> {
    const attrs: Record<string, string> = { ...base };
    if (scopeId !== undefined) attrs["hex-di.saga.scope.id"] = scopeId;
    if (traceContext !== undefined) {
      for (const [key, value] of Object.entries(traceContext)) {
        attrs[key] = value;
      }
    }
    return attrs;
  }

  const hook: SagaTracingHook = {
    onStepStart(sagaName: string, stepName: string, stepIndex: number): void {
      if (filter !== undefined && !filter(sagaName)) return;
      tracer.pushSpan(
        `saga:${sagaName}/${stepName}`,
        withScopeAttrs({
          "hex-di.saga.name": sagaName,
          "hex-di.saga.step.name": stepName,
          "hex-di.saga.step.index": String(stepIndex),
        })
      );
    },

    onStepEnd(sagaName: string, ok: boolean): void {
      if (filter !== undefined && !filter(sagaName)) return;
      tracer.popSpan(ok ? "ok" : "error");
    },

    onCompensationStart(sagaName: string, failedStepName: string): void {
      if (!traceCompensation) return;
      if (filter !== undefined && !filter(sagaName)) return;
      tracer.pushSpan(
        `saga:compensation:${failedStepName}`,
        withScopeAttrs({
          "hex-di.saga.name": sagaName,
          "hex-di.saga.failed.step": failedStepName,
        })
      );
    },

    onCompensationEnd(sagaName: string, ok: boolean): void {
      if (!traceCompensation) return;
      if (filter !== undefined && !filter(sagaName)) return;
      tracer.popSpan(ok ? "ok" : "error");
    },
  };

  return hook;
}
