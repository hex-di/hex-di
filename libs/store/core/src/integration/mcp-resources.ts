/**
 * MCP Resource Contract Types
 *
 * Defines the resource contract for exposing store inspection data via MCP.
 * This module provides types and a handler factory; the actual MCP server
 * implementation lives in @hex-di/mcp (Phase 4).
 *
 * @packageDocumentation
 */

import type {
  StoreInspectorAPI,
  StoreSnapshot,
  StatePortInfo,
  SubscriberGraph,
  ActionHistoryEntry,
  ActionHistoryFilter,
} from "../types/inspection.js";

// =============================================================================
// Resource Map
// =============================================================================

/**
 * Maps MCP resource URIs to their response types.
 */
export interface StoreMcpResourceMap {
  readonly "hexdi://store/snapshot": StoreSnapshot;
  readonly "hexdi://store/ports": readonly StatePortInfo[];
  readonly "hexdi://store/graph": SubscriberGraph;
  readonly "hexdi://store/history": readonly ActionHistoryEntry[];
}

/**
 * Known MCP resource URI strings.
 */
export type StoreMcpResourceUri = keyof StoreMcpResourceMap;

// =============================================================================
// Handler
// =============================================================================

/**
 * Handler that resolves MCP resource URIs to inspector data.
 */
export interface StoreMcpResourceHandler {
  resolveSnapshot(params?: ActionHistoryFilter): StoreSnapshot;
  resolvePorts(): readonly StatePortInfo[];
  resolveGraph(): SubscriberGraph;
  resolveHistory(params?: ActionHistoryFilter): readonly ActionHistoryEntry[];
  readonly supportedUris: readonly StoreMcpResourceUri[];
}

/**
 * Creates a StoreMcpResourceHandler from a StoreInspectorAPI.
 *
 * The handler maps resource operations to the appropriate inspector method:
 * - `resolveSnapshot()` → `inspector.getSnapshot()`
 * - `resolvePorts()` → `inspector.listStatePorts()`
 * - `resolveGraph()` → `inspector.getSubscriberGraph()`
 * - `resolveHistory(filter?)` → `inspector.getActionHistory(filter?)`
 */
export function createStoreMcpResourceHandler(
  inspector: StoreInspectorAPI
): StoreMcpResourceHandler {
  const supportedUris: readonly StoreMcpResourceUri[] = [
    "hexdi://store/snapshot",
    "hexdi://store/ports",
    "hexdi://store/graph",
    "hexdi://store/history",
  ];

  return {
    resolveSnapshot: () => inspector.getSnapshot(),
    resolvePorts: () => inspector.listStatePorts(),
    resolveGraph: () => inspector.getSubscriberGraph(),
    resolveHistory: (params?: ActionHistoryFilter) => inspector.getActionHistory(params),
    supportedUris,
  };
}
