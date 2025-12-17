/**
 * Traces resource for MCP.
 *
 * @packageDocumentation
 */

import type { DataGetter } from "../server/mcp-server.js";

/**
 * Traces resource definition.
 */
export const tracesResource = {
  uri: "hexdi://traces",
  name: "Resolution Traces",
  description: "Trace entries recording service resolution timing and dependency chains",
  mimeType: "application/json",
} as const;

/**
 * Get traces resource content.
 */
export async function getTracesResourceContent(getData: DataGetter): Promise<string> {
  const traces = await getData.getTraces();
  return JSON.stringify(traces, null, 2);
}

/**
 * Register traces resource (placeholder for backwards compatibility).
 */
export function registerTracesResource(): void {
  // Resources are registered via the unified handler in mcp-server.ts
}
