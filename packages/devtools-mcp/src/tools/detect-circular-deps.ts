/**
 * Detect circular dependencies tool for MCP.
 *
 * @packageDocumentation
 */

import type { DataGetter } from "../server/mcp-server.js";

/**
 * Detect circular dependencies tool definition.
 */
export const detectCircularDepsTool = {
  name: "detect_circular_deps",
  description: "Detect circular dependencies in the HexDI container. Returns all cycles found in the dependency graph.",
  inputSchema: {
    type: "object" as const,
    properties: {
      serviceName: {
        type: "string",
        description: "Optional: Check for cycles involving a specific service",
      },
    },
    required: [],
  },
};

interface DetectCircularDepsParams {
  serviceName?: string;
}

/**
 * Execute detect circular dependencies tool.
 */
export async function executeDetectCircularDeps(
  getData: DataGetter,
  params: DetectCircularDepsParams
): Promise<string> {
  const graph = await getData.getGraph();

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const deps = adjacency.get(edge.from) ?? [];
    deps.push(edge.to);
    adjacency.set(edge.from, deps);
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(nodeId: string): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const deps = adjacency.get(nodeId) ?? [];
    for (const dep of deps) {
      if (!visited.has(dep)) {
        dfs(dep);
      } else if (recursionStack.has(dep)) {
        // Found a cycle
        const cycleStart = path.indexOf(dep);
        const cycle = path.slice(cycleStart);
        cycle.push(dep); // Complete the cycle
        cycles.push(cycle);
      }
    }

    path.pop();
    recursionStack.delete(nodeId);
  }

  // If a specific service is specified, start from there
  if (params.serviceName !== undefined) {
    const startNode = graph.nodes.find(
      (n) => n.id === params.serviceName || n.label === params.serviceName
    );
    if (startNode === undefined) {
      return JSON.stringify({ error: `Service not found: ${params.serviceName}` });
    }
    dfs(startNode.id);
  } else {
    // Check all nodes
    for (const node of graph.nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }
  }

  // Convert IDs to labels for readability
  const namedCycles = cycles.map((cycle) =>
    cycle.map((id) => {
      const node = graph.nodes.find((n) => n.id === id);
      return node?.label ?? id;
    })
  );

  return JSON.stringify({
    hasCycles: namedCycles.length > 0,
    cycleCount: namedCycles.length,
    cycles: namedCycles.map((cycle) => cycle.join(" -> ")),
  }, null, 2);
}

/**
 * Register detect circular deps tool (placeholder for backwards compatibility).
 */
export function registerDetectCircularDepsTool(): void {
  // Tools are registered via the unified handler in mcp-server.ts
}
