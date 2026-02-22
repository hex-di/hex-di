/**
 * Library inspector bridge for HTTP client.
 * Integrates with @hex-di/core library inspector protocol.
 * @packageDocumentation
 */

import { createLibraryInspectorPort } from "@hex-di/core";
import type { LibraryInspector } from "@hex-di/core";
import type { HttpClientSnapshot } from "./types.js";

/**
 * Port for the HTTP client library inspector bridge.
 */
export const HttpClientLibraryInspectorPort = createLibraryInspectorPort({
  name: "HttpClientLibraryInspector",
  description: "Library inspector bridge for HTTP client",
});

/**
 * Creates a LibraryInspector that bridges the HTTP client snapshot
 * into the container's unified inspection protocol.
 *
 * No subscribe method — the HTTP client inspector is pull-only, so there
 * are no push-based events to subscribe to.
 *
 * @param getSnapshotFn - A function returning the current HttpClientSnapshot
 * @returns A LibraryInspector compatible with the container registry
 */
export function createHttpClientLibraryInspector(
  getSnapshotFn: () => HttpClientSnapshot,
): LibraryInspector {
  return {
    name: "http-client",
    getSnapshot(): Readonly<Record<string, unknown>> {
      const snapshot = getSnapshotFn();
      return Object.freeze({
        name: "http-client",
        requestCount: snapshot.requestCount,
        errorCount: snapshot.errorCount,
        activeRequests: snapshot.activeRequests,
        registeredClients: snapshot.registeredClients,
      });
    },
    // No subscribe — HTTP client inspector is pull-only
  };
}
