/**
 * MCP resource integration for HTTP client.
 *
 * Exposes HTTP client state and operations as MCP-compatible resources.
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

export interface McpResource {
  readonly uri: string;
  readonly name: string;
  readonly description: string;
  readonly mimeType: string;
}

export interface McpResourceHandler {
  readonly resource: McpResource;
  readonly read: () => Promise<string>;
}

export interface HttpClientMcpConfig {
  /** Base URI prefix for resources. Default: "http-client://". */
  readonly uriPrefix?: string;

  /** Client name identifier. Default: "default". */
  readonly clientName?: string;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Create MCP resource handlers for HTTP client state.
 *
 * @example
 * ```typescript
 * const resources = createHttpClientMcpResources({ clientName: "api" });
 * // Returns handlers for: clients, health, audit-trail
 * ```
 */
export function createHttpClientMcpResources(
  config?: HttpClientMcpConfig,
): ReadonlyArray<McpResourceHandler> {
  const uriPrefix = config?.uriPrefix ?? "http-client://";
  const clientName = config?.clientName ?? "default";

  const clientListResource: McpResourceHandler = {
    resource: {
      uri: `${uriPrefix}${clientName}/clients`,
      name: `${clientName} — Client List`,
      description: "List of registered HTTP client instances",
      mimeType: "application/json",
    },
    read: async () => JSON.stringify({ clients: [clientName], count: 1 }),
  };

  const healthResource: McpResourceHandler = {
    resource: {
      uri: `${uriPrefix}${clientName}/health`,
      name: `${clientName} — Health`,
      description: "Current health status of the HTTP client",
      mimeType: "application/json",
    },
    read: async () =>
      JSON.stringify({ status: "healthy", timestamp: Date.now() }),
  };

  const auditTrailResource: McpResourceHandler = {
    resource: {
      uri: `${uriPrefix}${clientName}/audit-trail`,
      name: `${clientName} — Audit Trail`,
      description: "Audit trail of HTTP operations",
      mimeType: "application/json",
    },
    read: async () =>
      JSON.stringify({ entries: [], count: 0, lastHash: "00000000" }),
  };

  return Object.freeze([clientListResource, healthResource, auditTrailResource]);
}
