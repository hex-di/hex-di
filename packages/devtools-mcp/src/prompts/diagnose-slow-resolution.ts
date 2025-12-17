/**
 * Diagnose slow resolution prompt for MCP.
 *
 * @packageDocumentation
 */

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

/**
 * Diagnose slow resolution prompt definition.
 */
export const diagnoseSlowResolutionPrompt = {
  name: "diagnose_slow_resolution",
  description: "Analyze slow service resolutions and provide optimization recommendations",
  arguments: [
    {
      name: "threshold_ms",
      description: "Duration threshold in milliseconds to consider a resolution slow (default: 10)",
      required: false,
    },
    {
      name: "service_name",
      description: "Optional specific service to analyze",
      required: false,
    },
  ],
};

/**
 * Get the prompt messages for diagnosing slow resolutions.
 */
export function getDiagnoseSlowResolutionMessages(args: {
  threshold_ms?: string;
  service_name?: string;
}): Array<{ role: "user"; content: { type: "text"; text: string } }> {
  const threshold = args.threshold_ms ?? "10";
  const serviceName = args.service_name;

  const basePrompt = `You are analyzing a HexDI dependency injection container for performance issues.

Please use the following tools to diagnose slow service resolutions:

1. First, use the \`get_resolution_trace\` tool to get trace entries${serviceName ? ` for "${serviceName}"` : ""} with minDuration set to ${threshold}

2. Use the \`analyze_cache_efficiency\` tool to check cache performance

3. Use the \`find_dependency_chain\` tool if you identify services with deep dependency chains

Based on the data, provide:
- A list of the slowest services and their resolution times
- Root cause analysis (deep dependency chains, cache misses, transient services being resolved frequently)
- Specific recommendations for improving performance
- Priority ranking of optimizations based on impact`;

  return [
    {
      role: "user" as const,
      content: {
        type: "text" as const,
        text: basePrompt,
      },
    },
  ];
}

/**
 * Register diagnose slow resolution prompt (placeholder for backwards compatibility).
 */
export function registerDiagnoseSlowResolutionPrompt(_server: Server): void {
  // Prompts are registered via the unified handler in mcp-server.ts
}
