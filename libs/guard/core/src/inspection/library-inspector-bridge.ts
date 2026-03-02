/**
 * Library Inspector Protocol bridge for the Guard library.
 *
 * Adapts the GuardInspector into a LibraryInspector so it can
 * participate in the container's unified inspection system.
 *
 * @packageDocumentation
 */

import { createLibraryInspectorPort } from "@hex-di/core";
import type { LibraryInspector, LibraryEventListener } from "@hex-di/core";
import type { GuardInspector } from "./inspector.js";
import type { GuardEvent } from "../guard/events.js";

/**
 * Port for the Guard library inspector bridge.
 */
export const GuardLibraryInspectorPort = createLibraryInspectorPort({
  name: "GuardLibraryInspector",
  description: "Library inspector bridge for authorization",
});

/**
 * Creates a LibraryInspector that bridges the GuardInspector
 * into the container's unified inspection protocol.
 *
 * @param guardInspector - The GuardInspector instance to bridge
 * @returns A LibraryInspector compatible with the container registry
 */
export function createGuardLibraryInspector(guardInspector: GuardInspector): LibraryInspector {
  return {
    name: "guard",
    getSnapshot(): Readonly<Record<string, unknown>> {
      const snapshot = guardInspector.getSnapshot();
      return Object.freeze({ ...snapshot });
    },
    subscribe(listener: LibraryEventListener): () => void {
      return guardInspector.subscribe((event: GuardEvent) => {
        listener({
          source: "guard",
          type: event.kind,
          payload: Object.freeze({ ...event }),
          timestamp: Date.parse(event.timestamp),
        });
      });
    },
    // No dispose - GuardInspector does not have a dispose method
  };
}
