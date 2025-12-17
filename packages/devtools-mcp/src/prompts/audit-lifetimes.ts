/**
 * Audit lifetimes prompt for MCP.
 *
 * @packageDocumentation
 */

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

/**
 * Audit lifetimes prompt definition.
 */
export const auditLifetimesPrompt = {
  name: "audit_lifetimes",
  description: "Review and audit service lifetime configurations for correctness and optimization opportunities",
  arguments: [],
};

/**
 * Get the prompt messages for auditing lifetimes.
 */
export function getAuditLifetimesMessages(): Array<{
  role: "user";
  content: { type: "text"; text: string };
}> {
  const prompt = `You are auditing the lifetime configurations of services in a HexDI dependency injection container.

Service lifetimes in HexDI:
- **Singleton**: One instance shared across the entire application
- **Scoped**: One instance per scope (e.g., per HTTP request)
- **Transient**: New instance created for each resolution

Please use the following tools to audit lifetimes:

1. Use the \`query_services\` tool for each lifetime type to get a full picture
2. Use the \`analyze_cache_efficiency\` tool grouped by lifetime
3. Use the \`detect_circular_deps\` tool to check for circular dependencies

Based on the data, provide an audit report including:

1. **Summary Statistics**
   - Count of services per lifetime
   - Distribution analysis

2. **Potential Issues**
   - Transient services that are frequently resolved (should be scoped/singleton)
   - Singleton services with mutable state that should be scoped
   - Services with incorrect lifetimes based on their dependency patterns

3. **Optimization Recommendations**
   - Services to promote from transient to scoped/singleton
   - Memory implications of current configuration
   - Performance impact of lifetime changes

4. **Best Practices Compliance**
   - Check for captive dependency issues
   - Verify thread-safety requirements for singletons`;

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
 * Register audit lifetimes prompt (placeholder for backwards compatibility).
 */
export function registerAuditLifetimesPrompt(_server: Server): void {
  // Prompts are registered via the unified handler in mcp-server.ts
}
