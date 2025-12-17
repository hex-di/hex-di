/**
 * Get resolution trace tool for MCP.
 *
 * @packageDocumentation
 */

import type { DataGetter } from "../server/mcp-server.js";

/**
 * Get resolution trace tool definition.
 */
export const getResolutionTraceTool = {
  name: "get_resolution_trace",
  description: "Get resolution trace entries for a specific service. Shows timing, cache hits, and dependency chain.",
  inputSchema: {
    type: "object" as const,
    properties: {
      serviceName: {
        type: "string",
        description: "Name of the service to get traces for",
      },
      limit: {
        type: "number",
        description: "Maximum number of trace entries to return (default: 10)",
      },
      minDuration: {
        type: "number",
        description: "Only return traces with duration >= this value in milliseconds",
      },
    },
    required: ["serviceName"],
  },
};

interface GetResolutionTraceParams {
  serviceName: string;
  limit?: number;
  minDuration?: number;
}

/**
 * Execute get resolution trace tool.
 */
export async function executeGetResolutionTrace(
  getData: DataGetter,
  params: GetResolutionTraceParams
): Promise<string> {
  const traces = await getData.getTraces();

  let filtered = traces.filter((trace) =>
    trace.portName.toLowerCase().includes(params.serviceName.toLowerCase())
  );

  // Filter by minimum duration
  if (params.minDuration !== undefined) {
    filtered = filtered.filter((trace) => trace.duration >= params.minDuration!);
  }

  // Sort by most recent first
  filtered = [...filtered].sort((a, b) => b.startTime - a.startTime);

  // Apply limit
  const limit = params.limit ?? 10;
  filtered = filtered.slice(0, limit);

  const result = {
    serviceName: params.serviceName,
    traceCount: filtered.length,
    traces: filtered.map((trace) => ({
      id: trace.id,
      portName: trace.portName,
      lifetime: trace.lifetime,
      duration: trace.duration,
      isCacheHit: trace.isCacheHit,
      startTime: new Date(trace.startTime).toISOString(),
      parentId: trace.parentId,
      childCount: trace.childIds.length,
      scopeId: trace.scopeId,
    })),
  };

  return JSON.stringify(result, null, 2);
}

/**
 * Register get resolution trace tool (placeholder for backwards compatibility).
 */
export function registerGetResolutionTraceTool(): void {
  // Tools are registered via the unified handler in mcp-server.ts
}
