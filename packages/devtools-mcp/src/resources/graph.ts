/**
 * Graph resource for MCP.
 *
 * @packageDocumentation
 */

import type { DataGetter } from "../server/mcp-server.js";

/**
 * Graph resource definition.
 */
export const graphResource = {
  uri: "hexdi://graph",
  name: "Dependency Graph",
  description: "The HexDI dependency graph showing all registered services and their dependencies",
  mimeType: "application/json",
} as const;

/**
 * Get graph resource content.
 */
export async function getGraphResourceContent(getData: DataGetter): Promise<string> {
  const graph = await getData.getGraph();
  return JSON.stringify(graph, null, 2);
}

/**
 * Register graph resource (placeholder for backwards compatibility).
 */
export function registerGraphResource(): void {
  // Resources are registered via the unified handler in mcp-server.ts
}
