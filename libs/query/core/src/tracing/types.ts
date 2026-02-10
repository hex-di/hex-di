/**
 * Query Tracing Types
 *
 * Type definitions for the Query tracing subsystem:
 * - TracerLike: Minimal tracer interface (no dependency on @hex-di/tracing)
 * - QueryTracingHook: Domain hook for fetch/mutation span lifecycle
 * - QueryTracingHookOptions: Configuration for creating a hook
 *
 * @packageDocumentation
 */

// =============================================================================
// TracerLike Interface
// =============================================================================

/**
 * Minimal tracer interface for distributed tracing integration.
 *
 * Any tracing adapter (@hex-di/tracing-datadog, @hex-di/tracing-jaeger, etc.)
 * can provide a compatible object without @hex-di/query depending on those packages.
 */
export interface TracerLike {
  pushSpan(name: string, attributes?: Record<string, string>): void;
  popSpan(status: "ok" | "error"): void;
}

// =============================================================================
// Span Attribute Types
// =============================================================================

/**
 * Attributes for query fetch span start.
 */
export interface QueryFetchSpanAttributes {
  readonly cacheHit: boolean;
  readonly deduplicated: boolean;
  readonly staleTimeMs: number;
}

/**
 * Attributes for query fetch span end.
 */
export interface QueryFetchEndAttributes {
  readonly durationMs: number;
  readonly result: "ok" | "error";
  readonly errorTag?: string;
  readonly retryAttempt?: number;
}

/**
 * Attributes for mutation span start.
 */
export interface QueryMutationSpanAttributes {
  readonly portName: string;
}

/**
 * Attributes for mutation span end.
 */
export interface QueryMutationEndAttributes {
  readonly durationMs: number;
  readonly result: "ok" | "error";
  readonly errorTag?: string;
}

// =============================================================================
// QueryTracingHook
// =============================================================================

/**
 * Hook for creating distributed tracing spans for fetch and mutation operations.
 */
export interface QueryTracingHook {
  onFetchStart(portName: string, params: string, attrs: QueryFetchSpanAttributes): void;
  onFetchEnd(portName: string, ok: boolean): void;
  onMutationStart(portName: string, input: string, attrs: QueryMutationSpanAttributes): void;
  onMutationEnd(portName: string, ok: boolean): void;
}

// =============================================================================
// QueryTracingHookOptions
// =============================================================================

/**
 * Options for creating a QueryTracingHook.
 */
export interface QueryTracingHookOptions {
  readonly tracer: TracerLike;
  /** Optional filter to control which ports are traced. Return true to trace. */
  readonly filter?: (portName: string) => boolean;
  /** Whether to trace mutation operations. Defaults to true. */
  readonly traceMutations?: boolean;
  /** Optional scope ID to include in span attributes. */
  readonly scopeId?: string;
  /** Optional trace context entries to include in span attributes. */
  readonly traceContext?: Record<string, string>;
}
