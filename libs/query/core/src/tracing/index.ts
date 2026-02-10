/**
 * Tracing Module - Distributed Tracing for Query Operations
 *
 * Provides tracing integration for fetch and mutation operations:
 * - QueryTracingHook: Domain hook for span lifecycle
 * - createQueryTracingHook: Factory to create the hook
 * - createQueryTracingBridge: Adapts TracerLike to hook options
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

export type {
  TracerLike,
  QueryFetchSpanAttributes,
  QueryFetchEndAttributes,
  QueryMutationSpanAttributes,
  QueryMutationEndAttributes,
  QueryTracingHook,
  QueryTracingHookOptions,
} from "./types.js";

// =============================================================================
// QueryTracingHook
// =============================================================================

export { createQueryTracingHook } from "./query-tracing-hook.js";

// =============================================================================
// Tracing Bridge
// =============================================================================

export { type QueryTracingBridgeConfig, createQueryTracingBridge } from "./tracing-bridge.js";
