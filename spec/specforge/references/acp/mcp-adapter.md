# ACP — MCP Adapter

**Source:** [MCP Adapter](https://agentcommunicationprotocol.dev/integrations/mcp-adapter)
**Captured:** 2026-02-28

---

## What It Is

The ACP-MCP Adapter is a production-ready MCP server that deploys in front of any ACP server, bridging the two protocol worlds. It enables MCP clients to discover and invoke ACP agents — at the cost of a reduced interface compared to full ACP.

---

## How It Works

| ACP Concept          | MCP Exposure                            |
| -------------------- | --------------------------------------- |
| **Agents**           | Exposed as MCP resources (discoverable) |
| **Agent Invocation** | Exposed as MCP tools (callable)         |
| **Agent Manifest**   | Mapped to MCP tool schemas              |

```
┌───────────────┐         ┌─────────────────┐         ┌──────────────┐
│  MCP Client   │  stdio  │  ACP-MCP Adapter │  HTTP   │  ACP Server  │
│  (e.g. Claude)│ ──────► │  (bridge)        │ ──────► │  (agents)    │
└───────────────┘         └─────────────────┘         └──────────────┘
```

---

## Deployment

### PyPI (Direct)

```bash
uvx acp-mcp http://localhost:8000
```

### Docker

```bash
docker run -i --rm ghcr.io/i-am-bee/acp-mcp http://host.docker.internal:8000
```

The adapter takes a single argument: the ACP server URL to proxy.

---

## Transport

The adapter currently supports **stdio transport** for MCP client communication. This is the standard transport used by Claude Code and other MCP-compatible clients.

---

## Configuration

Integration specifics depend on the MCP client's configuration. For Claude Code, the adapter would be configured in the MCP server settings:

```json
{
  "mcpServers": {
    "acp-agents": {
      "command": "uvx",
      "args": ["acp-mcp", "http://localhost:8000"]
    }
  }
}
```

This makes all ACP agents on the target server available as MCP tools within the client session.

---

## Trade-offs

| Full ACP                  | Via MCP Adapter             |
| ------------------------- | --------------------------- |
| Async runs with polling   | Synchronous tool calls only |
| Streaming responses       | No streaming                |
| Session management        | Stateless per-call          |
| Multi-part messages       | Simplified text I/O         |
| Artifacts with MIME types | Basic tool results          |
| Await mechanism (HITL)    | Not available               |

The adapter sacrifices ACP's advanced features for broad MCP client compatibility.

---

## SpecForge Relevance

The ACP-MCP adapter is directly relevant to SpecForge's architecture:

- **MCP Composition** (`c3-mcp-composition.md`): SpecForge already uses MCP for tool composition. The ACP-MCP adapter means external ACP agents can be consumed as MCP tools within SpecForge flows — no protocol changes needed on the SpecForge side.
- **MCP Composition Behavior** (`behaviors/BEH-SF-193-mcp-composition.md`): The adapter enables a concrete integration path: ACP agents hosted externally (or by other teams) become available as MCP tools within SpecForge's existing composition layer.
- **Bidirectional Bridge**: SpecForge could also expose its own agents via ACP, making them available to the broader ACP ecosystem while internally using MCP for tool composition.
