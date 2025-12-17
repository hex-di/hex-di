/**
 * Find dependency chain tool for MCP.
 *
 * @packageDocumentation
 */

import type { DataGetter } from "../server/mcp-server.js";

/**
 * Find dependency chain tool definition.
 */
export const findDependencyChainTool = {
  name: "find_dependency_chain",
  description: "Find the dependency chain from one service to another. Useful for understanding how services are connected.",
  inputSchema: {
    type: "object" as const,
    properties: {
      from: {
        type: "string",
        description: "Starting service name or ID",
      },
      to: {
        type: "string",
        description: "Target service name or ID",
      },
    },
    required: ["from", "to"],
  },
};

interface FindDependencyChainParams {
  from: string;
  to: string;
}

/**
 * Execute find dependency chain tool.
 */
export async function executeFindDependencyChain(
  getData: DataGetter,
  params: FindDependencyChainParams
): Promise<string> {
  const graph = await getData.getGraph();

  // Find nodes by label or ID
  const fromNode = graph.nodes.find(
    (n) => n.id === params.from || n.label === params.from
  );
  const toNode = graph.nodes.find(
    (n) => n.id === params.to || n.label === params.to
  );

  if (fromNode === undefined) {
    return JSON.stringify({ error: `Service not found: ${params.from}` });
  }
  if (toNode === undefined) {
    return JSON.stringify({ error: `Service not found: ${params.to}` });
  }

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const deps = adjacency.get(edge.from) ?? [];
    deps.push(edge.to);
    adjacency.set(edge.from, deps);
  }

  // BFS to find path
  const visited = new Set<string>();
  const queue: { node: string; path: string[] }[] = [
    { node: fromNode.id, path: [fromNode.label] },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.node === toNode.id) {
      return JSON.stringify({
        found: true,
        chain: current.path,
        length: current.path.length,
      }, null, 2);
    }

    if (visited.has(current.node)) continue;
    visited.add(current.node);

    const deps = adjacency.get(current.node) ?? [];
    for (const dep of deps) {
      const depNode = graph.nodes.find((n) => n.id === dep);
      if (depNode !== undefined && !visited.has(dep)) {
        queue.push({
          node: dep,
          path: [...current.path, depNode.label],
        });
      }
    }
  }

  return JSON.stringify({
    found: false,
    message: `No dependency path found from ${params.from} to ${params.to}`,
  }, null, 2);
}

/**
 * Register find dependency chain tool (placeholder for backwards compatibility).
 */
export function registerFindDependencyChainTool(): void {
  // Tools are registered via the unified handler in mcp-server.ts
}
