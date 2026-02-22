/**
 * TracerLike Bridge
 *
 * Provides a stack-based TracerLike interface and a factory that adapts
 * a full @hex-di/tracing Tracer to it. This is the canonical bridge
 * between the heavyweight Tracer (OTel-style startSpan/end) and the
 * lightweight pushSpan/popSpan interface consumed by library tracing hooks
 * (Flow, Query, Store, Saga).
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { Tracer } from "../ports/index.js";
import type { Span } from "../types/index.js";
import { warnTracingDisabled } from "../utils/tracing-warnings.js";

// =============================================================================
// TracerLike Interface
// =============================================================================

/**
 * Minimal stack-based tracer interface consumed by library tracing hooks.
 *
 * Each library (Flow, Query, Store, Saga) defines its own structurally
 * identical interface to avoid coupling to @hex-di/tracing. This interface
 * is the canonical definition in @hex-di/tracing and is structurally
 * compatible with all library-local variants.
 */
export interface TracerLike {
  pushSpan(name: string, attributes?: Record<string, string>): void;
  popSpan(status: "ok" | "error"): void;
}

// =============================================================================
// TracerLikePort
// =============================================================================

/**
 * Port for the TracerLike service.
 *
 * Register `tracerLikeAdapter` in your graph to auto-bridge from TracerPort.
 */
export const TracerLikePort = port<TracerLike>()({
  name: "TracerLike",
  direction: "outbound",
  category: "tracing/bridge",
  description: "Stack-based tracer bridge for library tracing hooks",
});

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates a TracerLike adapter from a full Tracer instance.
 *
 * Maintains a local span stack so pushSpan/popSpan calls map correctly
 * to startSpan/setStatus/end on the underlying Tracer.
 *
 * @param tracer - The @hex-di/tracing Tracer to adapt
 * @returns A TracerLike compatible with all library tracing hooks
 */
export function createTracerLikeAdapter(tracer: Tracer): TracerLike {
  if (!tracer.isEnabled()) {
    warnTracingDisabled("createTracerLikeAdapter");
  }

  const spanStack: Span[] = [];

  return {
    pushSpan(name: string, attributes?: Record<string, string>): void {
      const span = tracer.startSpan(name, { attributes });
      spanStack.push(span);
    },

    popSpan(status: "ok" | "error"): void {
      const span = spanStack.pop();
      if (span === undefined) return;
      span.setStatus(status);
      span.end();
    },
  };
}
