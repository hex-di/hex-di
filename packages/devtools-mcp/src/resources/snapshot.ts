/**
 * Snapshot resource for MCP.
 *
 * @packageDocumentation
 */

import type { DataGetter } from "../server/mcp-server.js";

/**
 * Snapshot resource definition.
 */
export const snapshotResource = {
  uri: "hexdi://snapshot",
  name: "Container Snapshot",
  description: "Current state snapshot of the dependency injection container",
  mimeType: "application/json",
} as const;

/**
 * Get snapshot resource content.
 */
export async function getSnapshotResourceContent(getData: DataGetter): Promise<string> {
  const snapshot = await getData.getSnapshot();
  return JSON.stringify(snapshot, null, 2);
}

/**
 * Register snapshot resource (placeholder for backwards compatibility).
 */
export function registerSnapshotResource(): void {
  // Resources are registered via the unified handler in mcp-server.ts
}
