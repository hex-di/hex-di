/**
 * Cache miss analysis prompt for MCP.
 *
 * @packageDocumentation
 */

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

/**
 * Cache miss analysis prompt definition.
 */
export const cacheMissAnalysisPrompt = {
  name: "cache_miss_analysis",
  description: "Analyze cache miss patterns to identify performance optimization opportunities",
  arguments: [
    {
      name: "service_name",
      description: "Optional specific service to analyze",
      required: false,
    },
  ],
};

/**
 * Get the prompt messages for cache miss analysis.
 */
export function getCacheMissAnalysisMessages(args: {
  service_name?: string;
}): Array<{ role: "user"; content: { type: "text"; text: string } }> {
  const serviceName = args.service_name;

  const prompt = `You are analyzing cache miss patterns in a HexDI dependency injection container.

In HexDI, caching behavior depends on lifetime:
- **Singleton**: Should have 100% cache hit rate after first resolution
- **Scoped**: Should have high cache hit rate within the same scope
- **Transient**: Always cache misses (by design)

Please use the following tools to analyze cache misses:

1. Use the \`analyze_cache_efficiency\` tool${serviceName ? ` for "${serviceName}"` : ""} grouped by lifetime
2. Use the \`get_resolution_trace\` tool to get detailed trace data
3. Use the \`query_services\` tool to understand the service configuration

Based on the data, provide:

1. **Cache Performance Summary**
   - Overall cache hit rate
   - Cache hit rate by lifetime (compare against expected rates)
   - Services with abnormal cache miss patterns

2. **Root Cause Analysis**
   - Singletons with cache misses (indicates potential bug or scope issue)
   - Scoped services with low hit rates (indicates scope boundary issues)
   - Transient services resolved too frequently (candidates for promotion)

3. **Recommendations**
   - Specific services to change lifetime for
   - Scope boundary adjustments
   - Caching strategy improvements

4. **Impact Assessment**
   - Estimated performance improvement from fixes
   - Memory trade-offs for caching more aggressively`;

  return [
    {
      role: "user" as const,
      content: {
        type: "text" as const,
        text: prompt,
      },
    },
  ];
}

/**
 * Register cache miss analysis prompt (placeholder for backwards compatibility).
 */
export function registerCacheMissAnalysisPrompt(_server: Server): void {
  // Prompts are registered via the unified handler in mcp-server.ts
}
