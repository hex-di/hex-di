---
id: FEAT-SF-013
kind: feature
title: "MCP Composition"
status: active
behaviors:
  [BEH-SF-193, BEH-SF-194, BEH-SF-195, BEH-SF-196, BEH-SF-197, BEH-SF-198, BEH-SF-199, BEH-SF-200]
adrs: [ADR-005, ADR-018]
roadmap_phases: [RM-10]
---

# MCP Composition

## Problem

Different agent roles need access to different MCP (Model Context Protocol) servers — a discovery agent needs filesystem access while a reviewer needs only read access to specs. Static MCP configuration cannot adapt to dynamic role assignments and multi-agent sessions.

## Solution

Dynamic MCP configuration generates per-role server assignments at agent spawn time. The composition layer manages server health checks, credential injection, and role-based access policies. A dedicated Neo4j MCP server exposes the knowledge graph to agents. Health monitoring ensures servers are available before dispatching agent tasks.

## Constituent Behaviors

| ID         | Summary                              |
| ---------- | ------------------------------------ |
| BEH-SF-193 | Dynamic MCP configuration generation |
| BEH-SF-194 | Role-based server assignment         |
| BEH-SF-195 | MCP server health checks             |
| BEH-SF-196 | Credential injection for MCP servers |
| BEH-SF-197 | Neo4j MCP server for graph access    |
| BEH-SF-198 | MCP server lifecycle management      |
| BEH-SF-199 | MCP configuration validation         |
| BEH-SF-200 | MCP server failover and reconnection |

## Acceptance Criteria

- [ ] Each agent role receives only its permitted MCP servers
- [ ] Health checks detect and report unavailable servers
- [ ] Credentials are injected securely without leaking to logs
- [ ] Neo4j MCP server exposes graph queries to agents
- [ ] Configuration validates before agent spawn
- [ ] Server failover maintains agent operation when possible
