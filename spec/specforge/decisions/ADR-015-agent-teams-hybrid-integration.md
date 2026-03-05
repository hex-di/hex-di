---
id: ADR-015
kind: decision
title: Agent Teams Hybrid Integration
status: Accepted
date: 2026-02-27
supersedes: []
invariants: [INV-SF-17]
---

# ADR-015: Agent Teams Hybrid Integration

## Context

Claude Code's Agent Teams feature enables multi-agent collaboration with mailbox-based communication. However, Agent Teams is experimental and may not be available in all environments. SpecForge needs a strategy that leverages Agent Teams where available while maintaining full functionality via the existing subagent model.

Additionally, agents need access to external systems (Neo4j, GitHub, test runners) via MCP servers, but different roles need different server configurations.

## Decision

Adopt a hybrid model: use Agent Teams for inter-agent collaboration where available, with subagent fallback for environments without Agent Teams support. Implement dynamic MCP composition that generates per-role, per-session MCP server configurations.

## Mechanism

### 1. Agent Teams Integration

When Agent Teams is available:

- Phases with concurrent stages use Agent Teams' mailbox communication
- ACP session messages map to team mailbox messages
- Team materialization bridge converts team outputs to ACP session events and graph nodes
- Fallback: sequential subagent execution with ACP message exchange

### 2. Dynamic MCP Composition

The `ClaudeCodeAdapter` generates per-session MCP configuration:

1. Resolve agent role → MCP server mapping
2. Filter by available credentials (env vars, keychain, config)
3. Generate temporary `mcp-{sessionId}.json` configuration file
4. Run health checks on all configured servers
5. Exclude unhealthy servers with warning
6. Pass `--mcp-config mcp-{sessionId}.json` to `claude -p`

### 3. Role-Based Server Assignment

| Role              | MCP Servers         | Rationale                                 |
| ----------------- | ------------------- | ----------------------------------------- |
| discovery-agent   | confluence, notion  | Requirements gathering from external docs |
| spec-author       | neo4j, github       | Graph queries, PR references              |
| reviewer          | neo4j, github       | Traceability validation, code review      |
| dev-agent         | github, test-runner | Code changes, test execution              |
| codebase-analyzer | neo4j               | Graph topology queries                    |
| coverage-agent    | neo4j               | Coverage metric queries                   |

### 4. Credential Management

Three-tier credential resolution:

1. **Environment variables** — `$NEO4J_URI`, `$GITHUB_TOKEN`
2. **System keychain** — OS-level secure storage
3. **Config file** — `.specforge/credentials.json` (encrypted at rest)

### 5. Health Gate

No agent session spawns with an MCP server that failed its health check (INV-SF-17). Health checks run at spawn time with configurable timeout. Failed servers are excluded from the session's MCP config and a warning is recorded.

## Rationale

1. **Graceful degradation** — Agent Teams unavailability does not break functionality.

2. **Role-appropriate tooling** — Each agent gets exactly the external tools it needs.

3. **Security by default** — Credential resolution follows least-privilege; servers require explicit role binding.

4. **Health-first spawning** — Unhealthy servers are excluded before agents start, preventing mid-session failures.

5. **Plugin extensibility** — Plugin MCP packs can add new servers and role bindings without core changes.

## Trade-offs

- **Configuration complexity** — Per-role MCP mapping adds configuration surface. Mitigated by sensible defaults and plugin packs.

- **Health check latency** — Pre-spawn health checks add startup time. Mitigated by parallel health checks and configurable timeouts.

- **Credential management** — Three-tier resolution is complex. Mitigated by clear precedence rules and diagnostic logging.

- **Agent Teams instability** — Experimental feature may change. Mitigated by hybrid model with full subagent fallback.

## References

- [Dynamic Agents](../behaviors/BEH-SF-185-dynamic-agents.md) — BEH-SF-185 through BEH-SF-192
- [MCP Composition](../behaviors/BEH-SF-193-mcp-composition.md) — BEH-SF-193 through BEH-SF-200
- [MCP Types](../types/mcp.md) — McpServerConfig, RoleMcpMapping, McpHealthResult
- [INV-SF-17](../invariants/INV-SF-17-mcp-server-health-gate.md) — MCP Server Health Gate
