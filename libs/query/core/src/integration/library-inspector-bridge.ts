/**
 * Query Library Inspector Bridge
 *
 * Creates a LibraryInspector that bridges QueryInspectorAPI
 * into the container's unified inspection protocol.
 *
 * @packageDocumentation
 */

import type { LibraryInspector, LibraryEventListener } from "@hex-di/core";
import type { QueryInspectorAPI } from "../inspector/query-inspector.js";
import type { CacheEvent } from "../cache/query-cache.js";

/**
 * Creates a LibraryInspector that bridges QueryInspectorAPI
 * into the container's unified Library Inspector Protocol.
 *
 * The returned inspector:
 * - Reports `name: "query"`
 * - Exposes frozen cache stats, diagnostics, suggestions, and query port listing via `getSnapshot()`
 * - Forwards CacheEvents from `inspector.subscribe()` as LibraryEvents
 * - `dispose()` delegates to `inspector.dispose()`
 *
 * @param inspector - The QueryInspectorAPI instance to bridge
 * @returns A LibraryInspector for the query library
 *
 * @example
 * ```typescript
 * const libraryInspector = createQueryLibraryInspector(queryInspector);
 * container.inspector.registerLibrary(libraryInspector);
 *
 * const snapshot = libraryInspector.getSnapshot();
 * // { stats: { totalEntries: 5, ... }, diagnostics: { ... }, suggestions: [...], queryPorts: [...] }
 * ```
 */
export function createQueryLibraryInspector(inspector: QueryInspectorAPI): LibraryInspector {
  return {
    name: "query",

    getSnapshot(): Readonly<Record<string, unknown>> {
      const stats = inspector.getCacheStats();
      const diagnostics = inspector.getDiagnosticSummary();
      const suggestions = inspector.getQuerySuggestions();
      const queryPorts = inspector.listQueryPorts();

      return Object.freeze({
        stats: Object.freeze({ ...stats }),
        diagnostics: Object.freeze({ ...diagnostics }),
        suggestions: Object.freeze(suggestions.map(s => Object.freeze({ ...s }))),
        queryPorts: Object.freeze(queryPorts.map(p => Object.freeze({ ...p }))),
      });
    },

    subscribe(listener: LibraryEventListener): () => void {
      return inspector.subscribe((event: CacheEvent) => {
        listener({
          source: "query",
          type: event.type,
          payload: Object.freeze({ ...event }),
          timestamp: Date.now(),
        });
      });
    },

    dispose(): void {
      inspector.dispose();
    },
  };
}
