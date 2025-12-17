/**
 * Detect scope leaks prompt for MCP.
 *
 * @packageDocumentation
 */

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

/**
 * Detect scope leaks prompt definition.
 */
export const detectScopeLeaksPrompt = {
  name: "detect_scope_leaks",
  description: "Detect potential scope leaks where scoped services are incorrectly shared across scopes",
  arguments: [],
};

/**
 * Get the prompt messages for detecting scope leaks.
 */
export function getDetectScopeLeaksMessages(): Array<{
  role: "user";
  content: { type: "text"; text: string };
}> {
  const prompt = `You are analyzing a HexDI dependency injection container for scope leaks.

Scope leaks occur when:
1. A singleton service depends on a scoped service (captive dependency)
2. A scoped service is resolved outside of a scope context
3. Scoped services are being reused across different request/scope boundaries

Please use the following tools to detect scope leaks:

1. Use the \`query_services\` tool with lifetime="singleton" to get all singletons
2. Use the \`find_dependency_chain\` tool to check if any singletons depend on scoped services
3. Use the \`get_resolution_trace\` tool to analyze scope IDs and check for inconsistencies

Based on the data, provide:
- List of potential scope leaks with severity
- Explanation of why each is problematic
- Recommendations for fixing each issue
- Best practices for avoiding scope leaks`;

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
 * Register detect scope leaks prompt (placeholder for backwards compatibility).
 */
export function registerDetectScopeLeaksPrompt(_server: Server): void {
  // Prompts are registered via the unified handler in mcp-server.ts
}
