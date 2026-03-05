---
id: TYPE-SF-014
kind: types
title: MCP Composition Types
status: active
domain: mcp
behaviors: []
adrs: [ADR-015, ADR-018]
---

# MCP Composition Types

- [types/agent.md](./agent.md) -- `AgentRole`, agent session types
- [types/acp.md](./acp.md) -- ACP types for ACP-MCP bridge
- [types/extensibility.md](./extensibility.md) -- plugin types
- [behaviors/BEH-SF-193-mcp-composition.md](../behaviors/BEH-SF-193-mcp-composition.md) -- MCP composition behaviors
- [decisions/ADR-015-agent-teams-hybrid-integration.md](../decisions/ADR-015-agent-teams-hybrid-integration.md) -- ADR-015
- [decisions/ADR-018-acp-agent-protocol.md](../decisions/ADR-018-acp-agent-protocol.md) -- ADR-018

---

## MCP Server Configuration

```typescript
interface McpServerConfig {
  readonly serverId: string;
  readonly name: string;
  readonly command: string;
  readonly args: ReadonlyArray<string>;
  readonly env: Record<string, string>;
  readonly healthCheckCommand: string;
  readonly healthCheckTimeoutMs: number;
  readonly requiredTools: ReadonlyArray<string>;
}
```

---

## Role-MCP Mapping

```typescript
interface RoleMcpMapping {
  readonly role: string;
  readonly servers: ReadonlyArray<string>;
  readonly allowedTools: ReadonlyArray<string>;
  readonly deniedTools: ReadonlyArray<string>;
}
```

---

## Health Checks

```typescript
interface McpHealthCheck {
  readonly serverId: string;
  readonly timestamp: string;
  readonly status: McpServerStatus;
  readonly latencyMs: number;
  readonly error: string | null;
}

type McpServerStatus = "healthy" | "degraded" | "unavailable" | "not-checked";

interface McpHealthResult {
  readonly checks: ReadonlyArray<McpHealthCheck>;
  readonly allHealthy: boolean;
  readonly excludedServers: ReadonlyArray<string>;
}
```

---

## Plugin MCP Packs

```typescript
interface PluginMcpManifest {
  readonly pluginName: string;
  readonly servers: ReadonlyArray<McpServerConfig>;
  readonly roleBindings: ReadonlyArray<RoleMcpMapping>;
  readonly credentials: ReadonlyArray<CredentialConfig>;
}

interface CredentialConfig {
  readonly name: string;
  readonly envVar: string;
  readonly required: boolean;
  readonly description: string;
  readonly resolution: "env" | "keychain" | "config-file";
}
```

---

## ACP-MCP Bridge

Configuration for the `acp-mcp` bridge adapter that exposes ACP agents as MCP tools.

```typescript
interface ACPMcpBridgeConfig {
  readonly acpServerUrl: string;
  readonly transport: "stdio";
  readonly agentFilter?: ReadonlyArray<string>;
}
```
