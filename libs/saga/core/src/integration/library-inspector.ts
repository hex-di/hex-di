/**
 * Saga Library Inspector Bridge
 *
 * Creates a LibraryInspector that bridges SagaInspector
 * into the container's unified inspection protocol.
 *
 * @packageDocumentation
 */

import type { LibraryInspector, LibraryEventListener } from "@hex-di/core";
import type { SagaInspector } from "../introspection/types.js";
import type { SagaEvent } from "../runtime/types.js";

/**
 * Creates a LibraryInspector that bridges SagaInspector
 * into the container's unified Library Inspector Protocol.
 *
 * The returned inspector:
 * - Reports `name: "saga"`
 * - Exposes definitions, active executions, compensation stats, and suggestions via `getSnapshot()`
 * - Forwards saga lifecycle events to subscribers as LibraryEvents
 * - `dispose()` is a no-op (SagaInspector has no cleanup)
 *
 * @param inspector - The SagaInspector instance to bridge
 * @returns A LibraryInspector for the saga library
 *
 * @example
 * ```typescript
 * const libraryInspector = createSagaLibraryInspector(sagaInspector);
 * container.inspector.registerLibrary(libraryInspector);
 *
 * const snapshot = libraryInspector.getSnapshot();
 * // { definitions: [...], activeExecutions: [...], compensationStats: {...}, suggestions: [...] }
 * ```
 */
export function createSagaLibraryInspector(inspector: SagaInspector): LibraryInspector {
  return {
    name: "saga",

    getSnapshot(): Readonly<Record<string, unknown>> {
      return Object.freeze({
        definitions: Object.freeze(inspector.getDefinitions()),
        activeExecutions: Object.freeze(inspector.getActiveExecutions()),
        compensationStats: Object.freeze(inspector.getCompensationStats()),
        suggestions: Object.freeze(inspector.getSuggestions()),
      });
    },

    subscribe(listener: LibraryEventListener): () => void {
      return inspector.subscribe((event: SagaEvent) => {
        listener({
          source: "saga",
          type: event.type,
          payload: Object.freeze({ ...event }),
          timestamp: event.timestamp,
        });
      });
    },

    dispose(): void {
      // SagaInspector has no cleanup — intentional no-op
    },
  };
}
