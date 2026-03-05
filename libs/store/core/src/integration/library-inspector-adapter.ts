/**
 * Store Library Inspector DI Adapter
 *
 * Provides a frozen singleton adapter that wires StoreLibraryInspectorPort
 * to createStoreLibraryInspector, enabling auto-registration via the
 * container's afterResolve hook for ports with category "library-inspector".
 *
 * @packageDocumentation
 */

import type { Adapter, InferService } from "@hex-di/core";
import { StoreLibraryInspectorPort, StoreInspectorPort } from "../types/inspection.js";
import { createStoreLibraryInspector } from "./library-inspector-bridge.js";

/**
 * Pre-built frozen adapter for StoreLibraryInspectorPort.
 *
 * Depends on StoreInspectorPort and produces a LibraryInspector bridge
 * via createStoreLibraryInspector. Because StoreLibraryInspectorPort
 * has `category: "library-inspector"`, the container's afterResolve hook
 * will auto-register it with the unified inspection protocol.
 *
 * @example
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(StoreInspectorAdapter)
 *   .provide(StoreLibraryInspectorAdapter)
 *   .build();
 *
 * // Auto-registered on first resolve thanks to category: "library-inspector"
 * const inspector = container.resolve(StoreLibraryInspectorPort);
 * ```
 */
export const StoreLibraryInspectorAdapter: Adapter<
  typeof StoreLibraryInspectorPort,
  typeof StoreInspectorPort,
  "singleton",
  "sync",
  false,
  readonly [typeof StoreInspectorPort]
> = Object.freeze({
  provides: StoreLibraryInspectorPort,
  requires: [StoreInspectorPort] as const,
  lifetime: "singleton" as const,
  factoryKind: "sync" as const,
  clonable: false as const,
  freeze: true as const,
  factory: (deps: {
    StoreInspector: InferService<typeof StoreInspectorPort>;
  }): InferService<typeof StoreLibraryInspectorPort> =>
    createStoreLibraryInspector(deps.StoreInspector),
});
