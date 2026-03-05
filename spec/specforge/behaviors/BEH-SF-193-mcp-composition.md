---
id: BEH-SF-193
kind: behavior
title: MCP Composition
status: active
id_range: 193--200
invariants: [INV-SF-17]
adrs: [ADR-015]
types: [mcp, mcp]
ports: [McpProxyPort, AgentBackendPort]
---

# 27 — MCP Composition

## BEH-SF-193: Dynamic MCP Config Generation — Per-Session Temporary Configuration

The `ClaudeCodeBackend` generates a per-session MCP configuration file based on the agent's role, filtering servers and tools to match the role's requirements.

### Contract

REQUIREMENT (BEH-SF-193): When creating an agent run, the `ClaudeCodeBackend` MUST generate a temporary MCP configuration file at `.specforge/mcp-{sessionId}.json`. The configuration MUST include only servers authorized for the agent's role per the `RoleMcpMapping`. The configuration MUST be passed to `claude -p` via the `--mcp-config` flag. The temporary file MUST be cleaned up when the session ends. If no MCP servers are mapped to the role, the agent MUST spawn without an MCP configuration.

### Verification

- Generation test: spawn an agent with a role that has MCP mappings; verify `mcp-{sessionId}.json` is created.
- Content test: verify the config file contains only the servers authorized for the role.
- Flag test: verify `--mcp-config` is passed to the `claude -p` command.
- Cleanup test: end the session; verify the temporary config file is deleted.
- No-MCP test: spawn an agent with no MCP mappings; verify it spawns without `--mcp-config`.

---

## BEH-SF-194: Role-Based Server Assignment — Role to Authorized MCP Servers Mapping

Each agent role has a defined set of MCP servers it can access, preventing unauthorized external system access.

### Contract

REQUIREMENT (BEH-SF-194): The system MUST maintain a `RoleMcpMapping` configuration that maps each agent role to its authorized MCP servers and tool filters. The mapping MUST support both `allowedTools` (whitelist) and `deniedTools` (blacklist) per role-server pair. The mapping MUST be configurable via `.specforge/config.json` and overridable by plugins. Roles not present in the mapping MUST receive no MCP servers. Tool filters MUST be enforced via the `--allowedTools` flag in the MCP configuration.

### Verification

- Mapping test: configure a role with two servers; spawn an agent; verify both servers are available.
- Whitelist test: configure `allowedTools` for a server; verify only those tools are accessible.
- Blacklist test: configure `deniedTools`; verify those tools are excluded.
- Override test: enable a plugin that overrides mappings; verify the plugin mapping takes effect.
- Missing role test: spawn a role not in the mapping; verify no MCP servers are configured.

---

## BEH-SF-195: Spawn-Time Health Checks — Server Readiness Before Agent Start

> **Invariant:** [INV-SF-17](../invariants/INV-SF-17-mcp-server-health-gate.md) — MCP Server Health Gate

Before spawning an agent with MCP servers, health checks verify that all configured servers are responsive.

### Contract

REQUIREMENT (BEH-SF-195): Before spawning an agent session with MCP servers, the system MUST run health checks on all configured servers. Health checks MUST execute the server's `healthCheckCommand` with a configurable timeout (default 5 seconds). Servers that fail health checks MUST be excluded from the session's MCP configuration and a warning MUST be recorded as a graph node. If all servers for a role fail health checks, the agent MUST still spawn (without MCP) and a `Notification` event MUST be emitted. Health checks MUST run in parallel to minimize startup latency.

### Verification

- Healthy test: configure a healthy server; verify it passes and is included in the config.
- Unhealthy test: configure an unhealthy server; verify it is excluded and a warning is recorded.
- Timeout test: configure a server that takes 10 seconds; verify timeout at 5 seconds.
- All-fail test: configure only unhealthy servers; verify the agent spawns without MCP with notification.
- Parallel test: configure 3 servers; verify health checks run in parallel (total time ≈ max single check).

---

## BEH-SF-196: Neo4j MCP Server — Read-Only Graph Query Tools

A dedicated MCP server provides agents with read-only access to the Neo4j knowledge graph via structured tools.

### Contract

REQUIREMENT (BEH-SF-196): The Neo4j MCP server MUST expose three tools: `neo4j_query` (execute read-only Cypher queries), `neo4j_schema` (return the current graph schema — node types, relationship types, property keys), and `neo4j_path` (find shortest paths between two nodes). All queries MUST be read-only — the server MUST reject any Cypher containing `CREATE`, `MERGE`, `SET`, `DELETE`, or `DETACH`. Query results MUST be returned as JSON. The server MUST enforce a query timeout of 30 seconds.

### Verification

- Query test: execute a read-only Cypher query; verify correct JSON results.
- Schema test: call `neo4j_schema`; verify it returns node types and relationship types.
- Path test: call `neo4j_path` between two nodes; verify the shortest path is returned.
- Write rejection test: attempt a `CREATE` query; verify it is rejected.
- Timeout test: execute a slow query; verify it times out at 30 seconds.

---

## BEH-SF-197: GitHub MCP Integration — Role-Based Tool Assignment

The GitHub MCP server provides agents with GitHub API access, filtered by role-appropriate tool sets.

### Contract

REQUIREMENT (BEH-SF-197): The GitHub MCP server MUST be configurable with role-based tool filtering. Reviewer agents MUST have access to `mcp__github__get_pull_request`, `mcp__github__list_pull_request_files`, and `mcp__github__get_file_contents`. Dev agents MUST additionally have `mcp__github__create_pull_request` and `mcp__github__push_files`. Discovery agents MUST have `mcp__github__search_repositories` and `mcp__github__list_issues`. Tool access MUST be enforced via the `--allowedTools` configuration in the MCP config file. Unauthorized tool access attempts MUST be blocked by the MCP server.

### Verification

- Reviewer tools test: spawn a reviewer with GitHub MCP; verify access to read-only PR tools.
- Dev tools test: spawn a dev agent; verify access to write tools.
- Discovery tools test: spawn a discovery agent; verify access to search tools.
- Unauthorized test: attempt a dev tool from a reviewer session; verify it is blocked.

---

## BEH-SF-198: Finding-to-Issue Pipeline — Critical Findings to GitHub Issues

Critical and major findings are automatically converted to GitHub issues with graph linkage.

### Contract

REQUIREMENT (BEH-SF-198): When a finding with severity `critical` or `major` is marked `resolved: false` at flow completion, the system MUST create a GitHub issue via the GitHub MCP server's `mcp__github__create_issue` tool. The issue MUST include: finding description, severity, related requirement IDs, spec file references, and suggested remediation. The created issue MUST be linked to the finding's graph node via a `TRACKED_BY` edge. Duplicate detection MUST prevent creating issues for findings that already have linked issues.

### Verification

- Issue creation test: complete a flow with an unresolved critical finding; verify a GitHub issue is created.
- Content test: verify the issue includes severity, requirement IDs, and spec references.
- Graph linkage test: verify `TRACKED_BY` edge links the finding to the issue.
- Duplicate test: run the pipeline twice for the same finding; verify only one issue is created.
- Severity filter test: create a `minor` finding; verify no issue is created.

---

## BEH-SF-199: MCP Plugin Packs — Bundled Server Configs with Tool Mappings

Plugins can bundle MCP server configurations with pre-defined tool mappings and credential requirements.

### Contract

REQUIREMENT (BEH-SF-199): The `PluginMcpManifest` MUST declare: server configurations (command, args, env), role bindings (which roles get which servers), and credential requirements (env vars, required/optional, description). When a plugin is enabled, its MCP servers MUST be registered and available for role-based assignment. The system MUST validate that all required credentials are available before activating plugin servers. Missing required credentials MUST prevent server activation with a descriptive error.

### Verification

- Registration test: enable a plugin with MCP servers; verify servers are registered.
- Role binding test: verify plugin servers are assigned to the correct roles.
- Credential test: remove a required credential; verify the server is not activated with error.
- Optional credential test: remove an optional credential; verify the server activates with warning.

---

## BEH-SF-200: Credential Management — Env Var Interpolation and 3-Tier Resolution

MCP server credentials are resolved through a three-tier system: environment variables, system keychain, and config file.

### Contract

REQUIREMENT (BEH-SF-200): MCP server configurations MUST support `${ENV_VAR}` interpolation in command args and env fields. Credential resolution MUST follow three tiers in order: (1) environment variables, (2) system keychain (OS-level secure storage), (3) `.specforge/credentials.json` (encrypted at rest). The first tier that provides a value MUST be used. Unresolvable credentials for required servers MUST prevent the server from being included in MCP configurations. Credential resolution MUST be logged (credential name and tier used, NOT the credential value) for debugging.

### Verification

- Env var test: set a credential via environment variable; verify it resolves.
- Keychain test: store a credential in the keychain; remove the env var; verify keychain resolution.
- Config file test: remove env var and keychain; add to config file; verify config file resolution.
- Precedence test: set a credential in all three tiers; verify env var takes precedence.
- Missing test: remove all tiers for a required credential; verify the server is excluded.
- Logging test: verify credential resolution logs the tier used but not the value.
