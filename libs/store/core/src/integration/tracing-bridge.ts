/**
 * Store Tracing Bridge
 *
 * Adapts a @hex-di/tracing-compatible tracer to Store's StoreTracingHook.
 * This bridges the distributed tracing system with Store action tracing
 * without @hex-di/store depending directly on @hex-di/tracing.
 *
 * @packageDocumentation
 */

// =============================================================================
// Tracer Interface
// =============================================================================

/**
 * Minimal tracer interface for Store tracing bridge.
 * Compatible with @hex-di/tracing's TracerLike and Flow's TracerLike.
 */
export interface StoreTracerLike {
  pushSpan(name: string, attributes?: Record<string, string>): void;
  popSpan(status: "ok" | "error"): void;
}

// =============================================================================
// Span Context
// =============================================================================

/**
 * Context returned from a tracing span start, carrying optional W3C trace IDs.
 */
export interface StoreSpanContext {
  readonly traceId?: string;
  readonly spanId?: string;
}

// =============================================================================
// Tracing Hook
// =============================================================================

/**
 * Hook interface consumed by StateServiceImpl to instrument action dispatch.
 * Optional methods instrument atom updates, derived recomputation, and async fetches.
 */
export interface StoreTracingHook {
  onActionStart(portName: string, actionName: string, containerName: string): StoreSpanContext;
  onActionEnd(ok: boolean): void;
  onAtomUpdate?(portName: string, containerName: string): StoreSpanContext;
  onAtomUpdateEnd?(ok: boolean): void;
  onDerivedRecompute?(portName: string, containerName: string): StoreSpanContext;
  onDerivedRecomputeEnd?(ok: boolean): void;
  onAsyncDerivedFetch?(portName: string, containerName: string): StoreSpanContext;
  onAsyncDerivedFetchEnd?(ok: boolean): void;
}

// =============================================================================
// Bridge Configuration
// =============================================================================

/**
 * Configuration for the Store tracing bridge.
 */
export interface StoreTracingBridgeConfig {
  /**
   * A StoreTracerLike implementation (from @hex-di/tracing or any compatible adapter).
   */
  readonly tracer: StoreTracerLike;

  /**
   * Optional function returning the current span context.
   * Called after pushSpan to retrieve trace/span IDs.
   */
  readonly getSpanContext?: () => StoreSpanContext;

  /**
   * Optional filter to control which ports are traced.
   * Return true to trace the port, false to skip.
   */
  readonly filter?: (portName: string) => boolean;

  /**
   * Optional scope ID to include in span attributes.
   */
  readonly scopeId?: string;
}

// =============================================================================
// Bridge Factory
// =============================================================================

/**
 * Creates a StoreTracingHook from a StoreTracerLike implementation.
 *
 * The bridge calls `tracer.pushSpan()` in `onActionStart` with attributes
 * `store.port`, `store.action`, `store.container`, and optionally `store.scope_id`.
 * Returns span context from `config.getSpanContext?.() ?? {}`.
 * Calls `tracer.popSpan()` in `onActionEnd`.
 *
 * @param config - The bridge configuration
 * @returns StoreTracingHook ready to pass to StateServiceConfig
 */
export function createStoreTracingBridge(config: StoreTracingBridgeConfig): StoreTracingHook {
  let _active = false;
  let _atomActive = false;
  let _derivedActive = false;
  let _asyncActive = false;

  function shouldTrace(portName: string): boolean {
    return !config.filter || config.filter(portName);
  }

  function buildAttributes(portName: string, containerName: string): Record<string, string> {
    const attributes: Record<string, string> = {
      "store.port": portName,
      "store.container": containerName,
    };
    if (config.scopeId !== undefined) {
      attributes["store.scope_id"] = config.scopeId;
    }
    return attributes;
  }

  return {
    onActionStart(portName: string, actionName: string, containerName: string): StoreSpanContext {
      if (!shouldTrace(portName)) {
        return {};
      }

      const attributes = buildAttributes(portName, containerName);
      attributes["store.action"] = actionName;

      config.tracer.pushSpan(`store.${portName}.${actionName}`, attributes);
      _active = true;

      return config.getSpanContext?.() ?? {};
    },

    onActionEnd(ok: boolean): void {
      if (!_active) return;
      _active = false;
      config.tracer.popSpan(ok ? "ok" : "error");
    },

    onAtomUpdate(portName: string, containerName: string): StoreSpanContext {
      if (!shouldTrace(portName)) {
        return {};
      }
      config.tracer.pushSpan(`store.atom.${portName}`, buildAttributes(portName, containerName));
      _atomActive = true;
      return config.getSpanContext?.() ?? {};
    },

    onAtomUpdateEnd(ok: boolean): void {
      if (!_atomActive) return;
      _atomActive = false;
      config.tracer.popSpan(ok ? "ok" : "error");
    },

    onDerivedRecompute(portName: string, containerName: string): StoreSpanContext {
      if (!shouldTrace(portName)) {
        return {};
      }
      config.tracer.pushSpan(`store.derived.${portName}`, buildAttributes(portName, containerName));
      _derivedActive = true;
      return config.getSpanContext?.() ?? {};
    },

    onDerivedRecomputeEnd(ok: boolean): void {
      if (!_derivedActive) return;
      _derivedActive = false;
      config.tracer.popSpan(ok ? "ok" : "error");
    },

    onAsyncDerivedFetch(portName: string, containerName: string): StoreSpanContext {
      if (!shouldTrace(portName)) {
        return {};
      }
      config.tracer.pushSpan(`store.async.${portName}`, buildAttributes(portName, containerName));
      _asyncActive = true;
      return config.getSpanContext?.() ?? {};
    },

    onAsyncDerivedFetchEnd(ok: boolean): void {
      if (!_asyncActive) return;
      _asyncActive = false;
      config.tracer.popSpan(ok ? "ok" : "error");
    },
  };
}
