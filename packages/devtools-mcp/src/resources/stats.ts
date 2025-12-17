/**
 * Stats resource for MCP.
 *
 * @packageDocumentation
 */

import type { DataGetter } from "../server/mcp-server.js";

/**
 * Stats resource definition.
 */
export const statsResource = {
  uri: "hexdi://stats",
  name: "Resolution Statistics",
  description: "Aggregated statistics about service resolution performance",
  mimeType: "application/json",
} as const;

/**
 * Get stats resource content.
 */
export async function getStatsResourceContent(getData: DataGetter): Promise<string> {
  const stats = await getData.getStats();
  return JSON.stringify(stats, null, 2);
}

/**
 * Register stats resource (placeholder for backwards compatibility).
 */
export function registerStatsResource(): void {
  // Resources are registered via the unified handler in mcp-server.ts
}
