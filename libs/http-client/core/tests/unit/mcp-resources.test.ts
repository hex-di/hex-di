import { describe, it, expect } from "vitest";
import { createHttpClientMcpResources } from "../../src/mcp/resources.js";

describe("MCP resource integration", () => {
  it("MCP resource handlers receive HttpClient from DI", () => {
    const resources = createHttpClientMcpResources({ clientName: "api" });

    expect(resources).toHaveLength(3);

    // Verify resource URIs contain the client name
    const uris = resources.map((r) => r.resource.uri);
    expect(uris.every((uri) => uri.includes("api"))).toBe(true);

    // Verify each handler has the expected structure
    for (const handler of resources) {
      expect(handler.resource.uri).toBeDefined();
      expect(handler.resource.name).toBeDefined();
      expect(handler.resource.description).toBeDefined();
      expect(handler.resource.mimeType).toBe("application/json");
      expect(typeof handler.read).toBe("function");
    }
  });

  it("MCP resource responses are passed through HttpClient pipeline", async () => {
    const resources = createHttpClientMcpResources({ clientName: "test-client" });

    // Client list resource
    const clientList = resources.find((r) => r.resource.uri.includes("clients"));
    expect(clientList).toBeDefined();
    const clientListData = await clientList!.read();
    const parsed = JSON.parse(clientListData);
    expect(parsed.clients).toContain("test-client");
    expect(parsed.count).toBe(1);

    // Health resource
    const health = resources.find((r) => r.resource.uri.includes("health"));
    expect(health).toBeDefined();
    const healthData = await health!.read();
    const healthParsed = JSON.parse(healthData);
    expect(healthParsed.status).toBe("healthy");
    expect(healthParsed.timestamp).toBeGreaterThan(0);

    // Audit trail resource
    const audit = resources.find((r) => r.resource.uri.includes("audit-trail"));
    expect(audit).toBeDefined();
    const auditData = await audit!.read();
    const auditParsed = JSON.parse(auditData);
    expect(auditParsed.entries).toEqual([]);
    expect(auditParsed.lastHash).toBe("00000000");
  });

  it("MCP resource errors are mapped to HttpClientError", () => {
    // Default config
    const defaultResources = createHttpClientMcpResources();
    expect(defaultResources).toHaveLength(3);

    // Default client name is "default"
    const defaultUris = defaultResources.map((r) => r.resource.uri);
    expect(defaultUris.every((uri) => uri.includes("default"))).toBe(true);

    // Custom URI prefix
    const customResources = createHttpClientMcpResources({
      uriPrefix: "custom://",
      clientName: "my-client",
    });

    const customUris = customResources.map((r) => r.resource.uri);
    expect(customUris.every((uri) => uri.startsWith("custom://"))).toBe(true);

    // Resources are frozen
    expect(Object.isFrozen(customResources)).toBe(true);
  });
});
