---
id: INV-SF-17
kind: invariant
title: MCP Server Health Gate
status: active
enforced_by: [ClaudeCodeBackend` spawn-time health checks, McpHealthResult]
behaviors: [BEH-SF-193, BEH-SF-195]
---

## INV-SF-17: MCP Server Health Gate

No agent session spawns with an MCP server that failed its health check. Unhealthy servers are excluded from the session's MCP configuration before the agent starts. This prevents mid-session failures from unavailable external services.
