/**
 * Query Library Inspector DI Adapter
 *
 * Provides a frozen singleton adapter that wires QueryLibraryInspectorPort
 * to createQueryLibraryInspector, enabling auto-registration via the
 * container's afterResolve hook for ports with category "library-inspector".
 *
 * @packageDocumentation
 */

import type { Adapter, InferService } from "@hex-di/core";
import { QueryInspectorPort } from "../inspector/port.js";
import { QueryLibraryInspectorPort } from "./port.js";
import { createQueryLibraryInspector } from "./library-inspector-bridge.js";

/**
 * Pre-built frozen adapter for QueryLibraryInspectorPort.
 *
 * Depends on QueryInspectorPort and produces a LibraryInspector bridge
 * via createQueryLibraryInspector. Because QueryLibraryInspectorPort
 * has `category: "library-inspector"`, the container's afterResolve hook
 * will auto-register it with the unified inspection protocol.
 *
 * @example
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(QueryInspectorAdapter)
 *   .provide(QueryLibraryInspectorAdapter)
 *   .build();
 *
 * // Auto-registered on first resolve thanks to category: "library-inspector"
 * const inspector = container.resolve(QueryLibraryInspectorPort);
 * ```
 */
export const QueryLibraryInspectorAdapter: Adapter<
  typeof QueryLibraryInspectorPort,
  typeof QueryInspectorPort,
  "singleton",
  "sync",
  false,
  readonly [typeof QueryInspectorPort]
> = Object.freeze({
  provides: QueryLibraryInspectorPort,
  requires: [QueryInspectorPort] as const,
  lifetime: "singleton" as const,
  factoryKind: "sync" as const,
  clonable: false as const,
  factory: (deps: {
    QueryInspector: InferService<typeof QueryInspectorPort>;
  }): InferService<typeof QueryLibraryInspectorPort> =>
    createQueryLibraryInspector(deps.QueryInspector),
});
