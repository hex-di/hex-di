/**
 * Store Library Inspector Bridge
 *
 * Creates a LibraryInspector that bridges StoreInspectorAPI
 * into the container's unified inspection protocol.
 *
 * @packageDocumentation
 */

import type { LibraryInspector, LibraryEventListener } from "@hex-di/core";
import type { StoreInspectorAPI, StoreInspectorEvent } from "../types/inspection.js";

/**
 * Creates a LibraryInspector that bridges StoreInspectorAPI
 * into the container's unified Library Inspector Protocol.
 *
 * The returned inspector:
 * - Reports `name: "store"`
 * - Exposes store snapshot data via `getSnapshot()`
 * - Forwards store inspector events to subscribers as LibraryEvents
 * - `dispose()` is a no-op (StoreInspectorAPI has no cleanup)
 *
 * @param inspector - The StoreInspectorAPI instance to bridge
 * @returns A LibraryInspector for the store library
 *
 * @example
 * ```typescript
 * const libraryInspector = createStoreLibraryInspector(storeInspector);
 * container.inspector.registerLibrary(libraryInspector);
 *
 * const snapshot = libraryInspector.getSnapshot();
 * // { timestamp: ..., ports: [...], totalSubscribers: 5, pendingEffects: 0 }
 * ```
 */
export function createStoreLibraryInspector(inspector: StoreInspectorAPI): LibraryInspector {
  return {
    name: "store",

    getSnapshot(): Readonly<Record<string, unknown>> {
      return Object.freeze(inspector.getSnapshot());
    },

    subscribe(listener: LibraryEventListener): () => void {
      return inspector.subscribe((event: StoreInspectorEvent) => {
        listener({
          source: "store",
          type: event.type,
          payload: Object.freeze({ ...event }),
          timestamp: Date.now(),
        });
      });
    },

    dispose(): void {
      // StoreInspectorAPI has no cleanup — intentional no-op
    },
  };
}
