/**
 * Flow Library Inspector DI Adapter
 *
 * Provides a frozen singleton adapter that wires FlowLibraryInspectorPort
 * to createFlowLibraryInspector, enabling auto-registration via the
 * container's afterResolve hook for ports with category "library-inspector".
 *
 * @packageDocumentation
 */

import type { Adapter, InferService } from "@hex-di/core";
import { FlowLibraryInspectorPort, FlowInspectorPort, FlowRegistryPort } from "./types.js";
import { createFlowLibraryInspector } from "./library-inspector-bridge.js";

/**
 * Pre-built frozen adapter for FlowLibraryInspectorPort.
 *
 * Depends on FlowInspectorPort and FlowRegistryPort, produces a LibraryInspector bridge
 * via createFlowLibraryInspector. Because FlowLibraryInspectorPort
 * has `category: "library-inspector"`, the container's afterResolve hook
 * will auto-register it with the unified inspection protocol.
 */
export const FlowLibraryInspectorAdapter: Adapter<
  typeof FlowLibraryInspectorPort,
  typeof FlowInspectorPort | typeof FlowRegistryPort,
  "singleton",
  "sync",
  false,
  readonly [typeof FlowInspectorPort, typeof FlowRegistryPort]
> = Object.freeze({
  provides: FlowLibraryInspectorPort,
  requires: [FlowInspectorPort, FlowRegistryPort] as const,
  lifetime: "singleton" as const,
  factoryKind: "sync" as const,
  clonable: false as const,
  factory: (deps: {
    FlowInspector: InferService<typeof FlowInspectorPort>;
    FlowRegistry: InferService<typeof FlowRegistryPort>;
  }): InferService<typeof FlowLibraryInspectorPort> =>
    createFlowLibraryInspector(deps.FlowInspector, deps.FlowRegistry),
});
