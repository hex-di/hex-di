/**
 * Query services tool for MCP.
 *
 * @packageDocumentation
 */

import type { DataGetter } from "../server/mcp-server.js";

/**
 * Query services tool definition.
 */
export const queryServicesTool = {
  name: "query_services",
  description: "Query registered services in the HexDI container. Filter by name pattern, lifetime, or other attributes.",
  inputSchema: {
    type: "object" as const,
    properties: {
      namePattern: {
        type: "string",
        description: "Regex pattern to match service names",
      },
      lifetime: {
        type: "string",
        enum: ["singleton", "scoped", "transient"],
        description: "Filter by service lifetime",
      },
      hasDependencies: {
        type: "boolean",
        description: "If true, only return services that have dependencies",
      },
    },
    required: [],
  },
};

interface QueryServicesParams {
  namePattern?: string;
  lifetime?: "singleton" | "scoped" | "transient";
  hasDependencies?: boolean;
}

/**
 * Execute query services tool.
 */
export async function executeQueryServices(
  getData: DataGetter,
  params: QueryServicesParams
): Promise<string> {
  const graph = await getData.getGraph();

  let nodes = graph.nodes;

  // Filter by name pattern
  if (params.namePattern !== undefined) {
    const regex = new RegExp(params.namePattern, "i");
    nodes = nodes.filter((node) => regex.test(node.label));
  }

  // Filter by lifetime
  if (params.lifetime !== undefined) {
    nodes = nodes.filter((node) => node.lifetime === params.lifetime);
  }

  // Filter by has dependencies
  if (params.hasDependencies !== undefined) {
    if (params.hasDependencies) {
      const nodesWithDeps = new Set(graph.edges.map((e) => e.from));
      nodes = nodes.filter((node) => nodesWithDeps.has(node.id));
    } else {
      const nodesWithDeps = new Set(graph.edges.map((e) => e.from));
      nodes = nodes.filter((node) => !nodesWithDeps.has(node.id));
    }
  }

  const result = {
    totalMatched: nodes.length,
    services: nodes.map((node) => ({
      id: node.id,
      label: node.label,
      lifetime: node.lifetime,
      dependencyCount: graph.edges.filter((e) => e.from === node.id).length,
    })),
  };

  return JSON.stringify(result, null, 2);
}

/**
 * Register query services tool (placeholder for backwards compatibility).
 */
export function registerQueryServicesTool(): void {
  // Tools are registered via the unified handler in mcp-server.ts
}
