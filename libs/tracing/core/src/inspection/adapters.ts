/**
 * Tracing Library Inspector DI Adapter
 *
 * Provides a frozen singleton adapter that wires TracingLibraryInspectorPort
 * to createTracingLibraryInspector, enabling auto-registration via the
 * container's afterResolve hook for ports with category "library-inspector".
 *
 * @packageDocumentation
 */

import type { Adapter, InferService } from "@hex-di/core";
import { TracingLibraryInspectorPort } from "./library-inspector-bridge.js";
import { createTracingLibraryInspector } from "./library-inspector-bridge.js";
import { TracingQueryApiPort } from "./ports.js";

/**
 * Pre-built frozen adapter for TracingLibraryInspectorPort.
 *
 * Depends on TracingQueryApiPort and produces a LibraryInspector bridge
 * via createTracingLibraryInspector. Because TracingLibraryInspectorPort
 * has `category: "library-inspector"`, the container's afterResolve hook
 * will auto-register it with the unified inspection protocol.
 */
export const TracingLibraryInspectorAdapter: Adapter<
  typeof TracingLibraryInspectorPort,
  typeof TracingQueryApiPort,
  "singleton",
  "sync",
  false,
  readonly [typeof TracingQueryApiPort]
> = Object.freeze({
  provides: TracingLibraryInspectorPort,
  requires: [TracingQueryApiPort] as const,
  lifetime: "singleton" as const,
  factoryKind: "sync" as const,
  clonable: false as const,
  factory: (deps: {
    TracingQueryApi: InferService<typeof TracingQueryApiPort>;
  }): InferService<typeof TracingLibraryInspectorPort> =>
    createTracingLibraryInspector(deps.TracingQueryApi),
});
