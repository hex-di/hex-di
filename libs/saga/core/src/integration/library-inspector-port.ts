/**
 * Saga Library Inspector Port
 *
 * Port token for the saga library inspector bridge, enabling auto-registration
 * with the container's unified inspection protocol.
 *
 * @packageDocumentation
 */

import { createLibraryInspectorPort } from "@hex-di/core";

/**
 * DI Port for resolving a SagaLibraryInspector from the container.
 *
 * When used with a graph, this provides a LibraryInspector bridge that
 * integrates saga inspection into the container's unified
 * Library Inspector Protocol.
 */
export const SagaLibraryInspectorPort = createLibraryInspectorPort({
  name: "SagaLibraryInspector",
  description: "Library inspector bridge for saga orchestration",
});
