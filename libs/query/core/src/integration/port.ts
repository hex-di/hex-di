/**
 * Query Library Inspector Port Definition
 *
 * @packageDocumentation
 */

import { createLibraryInspectorPort } from "@hex-di/core";

/**
 * Port definition for the query library inspector bridge.
 *
 * When registered in a graph, provides a LibraryInspector that bridges
 * query inspection into the container's unified Library Inspector Protocol.
 */
export const QueryLibraryInspectorPort = createLibraryInspectorPort({
  name: "QueryLibraryInspector",
  description: "Library inspector bridge for query cache and fetching",
});
