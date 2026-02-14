/**
 * Shared Tracing Types
 *
 * Extracted from introspection/types.ts to break the circular dependency
 * between runtime/types.ts and introspection/types.ts.
 *
 * @packageDocumentation
 */

// =============================================================================
// TracerLike
// =============================================================================

/**
 * Minimal tracer interface for distributed tracing integration.
 *
 * Any tracing adapter (@hex-di/tracing-datadog, @hex-di/tracing-jaeger, etc.)
 * can provide a compatible object without @hex-di/saga depending on those packages.
 */
export interface TracerLike {
  pushSpan(name: string, attributes?: Record<string, string>): void;
  popSpan(status: "ok" | "error"): void;
}

// =============================================================================
// SagaTracingHookOptions
// =============================================================================

/** Options for creating a SagaTracingHook */
export interface SagaTracingHookOptions {
  readonly tracer: TracerLike;
  readonly filter?: (sagaName: string) => boolean;
  /** Whether to trace compensation-level spans. Defaults to true. */
  readonly traceCompensation?: boolean;
  /** Optional scope ID to include in span attributes. */
  readonly scopeId?: string;
  /** Optional trace context entries to include in span attributes. */
  readonly traceContext?: Record<string, string>;
}

// =============================================================================
// SagaTracingHook
// =============================================================================

/** Hook for creating distributed tracing spans for saga steps and compensation */
export interface SagaTracingHook {
  onStepStart(sagaName: string, stepName: string, stepIndex: number): void;
  onStepEnd(sagaName: string, ok: boolean): void;
  onCompensationStart(sagaName: string, failedStepName: string): void;
  onCompensationEnd(sagaName: string, ok: boolean): void;
}
