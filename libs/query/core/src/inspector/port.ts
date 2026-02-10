/**
 * Query inspector port definition.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { QueryInspectorAPI } from "./query-inspector.js";

/**
 * Port for the QueryInspector service.
 */
export const QueryInspectorPort = port<QueryInspectorAPI>()({
  name: "QueryInspector",
  direction: "outbound",
  category: "query",
  tags: ["query", "observability", "inspection"],
});
