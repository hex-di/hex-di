/**
 * Library Inspector Protocol bridge for the Logger library.
 *
 * Adapts the LoggerInspector into a LibraryInspector so it can
 * participate in the container's unified inspection system.
 *
 * @packageDocumentation
 */

import { createLibraryInspectorPort } from "@hex-di/core";
import type { LibraryInspector, LibraryEventListener } from "@hex-di/core";
import type { LoggerInspector } from "./inspector.js";
import type { LoggerInspectorEvent } from "./events.js";

/**
 * Port for the Logger library inspector bridge.
 */
export const LoggerLibraryInspectorPort = createLibraryInspectorPort({
  name: "LoggerLibraryInspector",
  description: "Library inspector bridge for logging",
});

/**
 * Creates a LibraryInspector that bridges the LoggerInspector
 * into the container's unified inspection protocol.
 *
 * @param loggerInspector - The LoggerInspector instance to bridge
 * @returns A LibraryInspector compatible with the container registry
 */
export function createLoggerLibraryInspector(loggerInspector: LoggerInspector): LibraryInspector {
  return {
    name: "logger",
    getSnapshot(): Readonly<Record<string, unknown>> {
      const snapshot = loggerInspector.getSnapshot();
      return Object.freeze({ ...snapshot });
    },
    subscribe(listener: LibraryEventListener): () => void {
      return loggerInspector.subscribe((event: LoggerInspectorEvent) => {
        listener({
          source: "logger",
          type: event.type,
          payload: Object.freeze({ ...event }),
          timestamp: "timestamp" in event ? event.timestamp : Date.now(),
        });
      });
    },
    // No dispose - LoggerInspector does not have a dispose method
  };
}
