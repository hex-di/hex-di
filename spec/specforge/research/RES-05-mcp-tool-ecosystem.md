---
id: RES-05
kind: research
title: Research 05 — MCP Tool Ecosystem
status: Research Draft
date: 2026-02-27
outcome: deferred
related_adr: []
---

# Research 05 — MCP Tool Ecosystem

SpecForge agents run as Claude Code subprocesses via `claude -p`. Claude Code supports `--mcp-config` to inject MCP (Model Context Protocol) servers into any agent session, giving agents access to external tools and data sources beyond the built-in Read/Write/Bash/Grep toolset. This research explores how SpecForge can use MCP servers as a composable tool layer — both consuming third-party MCP servers and exposing SpecForge itself as an MCP server.

---

## 1. The Core Insight: MCP Servers as Composable Agent Capabilities

SpecForge already scopes tools per agent role (BEH-SF-081 through BEH-SF-086). The `--allowedTools` flag on `claude -p` controls which built-in tools an agent can use. MCP servers extend this: each MCP server adds a set of tool definitions to the agent's context, and those tools are subject to the same role-based filtering via `ToolRegistryPort` (BEH-SF-084).

The architectural consequence: agent capabilities become a composition of built-in tools plus zero or more MCP server connections. SpecForge does not need to implement integrations as internal adapters. It delegates them to MCP servers that agents call directly during their agentic loop.

This changes the integration model from "SpecForge talks to external systems on behalf of agents" to "agents talk to external systems themselves, through MCP, while SpecForge orchestrates which servers each agent can reach."

---

## 2. Neo4j MCP Server — Direct Graph Access for Agents

### Problem

Today, agents interact with the knowledge graph indirectly: they write to the ACP session (BEH-SF-033 through BEH-SF-040), and the orchestrator syncs ACP session events to Neo4j. Agents never run Cypher queries themselves. This bottlenecks graph interaction through the ACP session abstraction.

### Feature: `specforge-neo4j-mcp`

A Neo4j MCP server that exposes Cypher query execution as a tool. When injected into an agent session, the agent can run graph queries directly.

**MCP Tools Exposed:**

- `neo4j_query` — Execute a read-only Cypher query, return JSON results. Parameter: `cypher` (string), `params` (object).
- `neo4j_schema` — Return the current graph schema (node labels, relationship types, property keys). No parameters.
- `neo4j_path` — Find shortest path between two nodes. Parameters: `startLabel`, `startProp`, `endLabel`, `endProp`.

**Role-Based Scoping:**

- `reviewer` and `coverage-agent` get `neo4j_query` and `neo4j_path` (read-only) — they need to check traceability chains.
- `codebase-analyzer` gets `neo4j_query` and `neo4j_schema` — it needs to understand what is already in the graph before writing analysis data.
- `discovery-agent` and `spec-author` do NOT get Neo4j MCP tools — they work through the ACP session.

**Security Boundary:**
The MCP server connects with a read-only Neo4j user. Write operations remain exclusively through `GraphMutationPort` on the server side. Agents cannot corrupt the graph through MCP. The MCP server configuration injects the bolt connection string via environment variables, never exposing credentials in the agent prompt.

**Concrete Value:**
The reviewer agent can run `MATCH (r:Requirement)-[:TRACES_TO]->(t:Task) WHERE NOT (t)-[:IMPLEMENTED_BY]->(:Code) RETURN r.id, r.text` directly, instead of relying on the orchestrator to pre-compute traceability gaps and pass them via the ACP session. The agent reasons about the query results in-context and adapts its review strategy.

---

## 3. GitHub MCP Server — Bidirectional Code-Graph Linking

### Problem

SpecForge specs reference code, but the linkage is manual. When a PR changes code that implements a requirement, there is no automated detection or graph update.

### Feature: GitHub MCP Integration

Claude Code already has a GitHub MCP server (`mcp__github__*`). SpecForge composes it into agent sessions where GitHub awareness is needed.

**Use Cases by Agent Role:**

| Agent Role          | GitHub MCP Tools                                   | Purpose                                                    |
| ------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| `codebase-analyzer` | `search_code`, `get_file_contents`, `list_commits` | Analyze code structure, detect recent changes              |
| `reviewer`          | `pull_request_read`, `get_commit`, `search_code`   | Review PRs against spec requirements, check commit history |
| `coverage-agent`    | `search_code`, `list_pull_requests`                | Verify implementation coverage against code                |
| `task-decomposer`   | `search_issues`, `list_issues`                     | Check existing issues before creating duplicate tasks      |
| `dev-agent`         | `create_pull_request`, `push_files`, `issue_write` | Create PRs from implementation, create issues for blockers |

**Automated Graph Linking (Post-Phase Hook):**
After the `reviewer` agent completes a code review, a post-phase hook (BEH-SF-092) extracts PR numbers and commit SHAs from the agent's output, then creates `IMPLEMENTED_BY` relationships in the knowledge graph linking `Task` nodes to specific commits and PRs:

```
(task:Task)-[:IMPLEMENTED_BY]->(commit:Commit {sha: "abc123"})
(commit:Commit)-[:PART_OF]->(pr:PullRequest {number: 42})
```

**Finding-to-Issue Pipeline:**
When the `reviewer` agent produces findings (BEH-SF-036), a post-phase hook can call the GitHub MCP server to create GitHub issues for critical and major findings, automatically linking the issue back to the finding node in the graph:

```
(finding:Finding)-[:TRACKED_BY]->(issue:GitHubIssue {number: 87, repo: "org/repo"})
```

---

## 4. Project Management MCP — Jira/Linear Task Synchronization

### Feature: Task Decomposition to Project Management

The `task-decomposer` agent (BEH-SF-021) produces `TaskGroup` entries with dependency ordering. Today these exist only in the ACP session and knowledge graph. With a Jira or Linear MCP server, the agent writes tasks directly to the project management system.

**MCP Configuration (per-project `.mcp.json`):**

```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "@anthropic/linear-mcp-server"],
      "env": {
        "LINEAR_API_KEY": "${SPECFORGE_LINEAR_API_KEY}"
      }
    }
  }
}
```

**Agent Behavior Change:**
The `task-decomposer` agent, when the Linear MCP server is present in its tool set, creates Linear issues for each task group. It sets dependencies between issues matching the `TaskGroup.dependencies` ordering. It assigns labels matching the task's spec file origin. Each created issue ID is written back to the ACP session, and a post-phase hook persists the linkage to the graph:

```
(task:Task)-[:TRACKED_IN]->(linearIssue:LinearIssue {id: "LIN-42", teamId: "..."})
```

**Bidirectional Sync:**
When a Linear issue transitions to "Done", an external webhook (outside SpecForge's scope) can trigger a SpecForge CLI command (`specforge sync linear`) that updates the `Task` node status in the knowledge graph. The coverage-agent then picks up the updated status on its next run.

---

## 5. SpecForge as an MCP Server — Exposing the Knowledge Graph to Any Claude Code Session

### The Inversion

Instead of only consuming MCP servers, SpecForge itself becomes an MCP server. Any Claude Code session — not just SpecForge-orchestrated agents — can access the knowledge graph, ACP session state, and flow status.

### Feature: `@specforge/mcp-server`

A standalone MCP server process that SpecForge runs alongside its main server. It exposes the knowledge graph and orchestration state as MCP tools.

**MCP Tools Exposed:**

| Tool                           | Parameters                              | Returns                                         |
| ------------------------------ | --------------------------------------- | ----------------------------------------------- |
| `specforge_query_graph`        | `cypher: string`                        | Query results as JSON                           |
| `specforge_get_requirement`    | `id: string`                            | Requirement node with traceability chain        |
| `specforge_list_findings`      | `flowRunId?: string, severity?: string` | Findings matching filters                       |
| `specforge_get_coverage`       | `specFileId?: string`                   | Coverage report for spec or project             |
| `specforge_get_flow_status`    | `flowRunId: string`                     | Current flow run state, phase, iteration        |
| `specforge_get_acp_session`    | `flowRunId: string, layer: string`      | ACP session contents for a flow run             |
| `specforge_search_specs`       | `query: string`                         | Full-text search across spec documents          |
| `specforge_get_session_chunks` | `role?: string, limit?: number`         | Relevant session chunks for context composition |

**Use Case: Developer's Personal Claude Code Session**

A developer working in their own Claude Code session (not orchestrated by SpecForge) can add SpecForge as an MCP server in their `~/.claude.json`:

```json
{
  "mcpServers": {
    "specforge": {
      "command": "specforge",
      "args": ["mcp-server", "--project", "/path/to/project"],
      "env": {}
    }
  }
}
```

Now the developer's Claude Code session can query the knowledge graph while coding: "What requirements does this function implement?" The agent calls `specforge_get_requirement` and `specforge_query_graph` to answer from the actual graph data.

**Use Case: CI/CD Pipeline Verification**

A CI job runs `claude -p --mcp-config specforge-mcp.json "Verify that PR #42 implements all requirements in SPEC-AUTH-001"`. The agent uses `specforge_get_coverage` and `specforge_query_graph` to check traceability, then uses the GitHub MCP server to post the results as a PR comment.

---

## 6. Database Schema MCP — Spec Validation Against Production

### Feature: Database Introspection for Spec Validation

When specs describe data models, the `reviewer` agent can validate that the spec's data model matches the actual database schema.

**MCP Configuration:**

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@anthropic/postgres-mcp-server"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${SPECFORGE_DB_URL}"
      }
    }
  }
}
```

**Agent Behavior:**
The `reviewer` agent, when reviewing specs that contain data model definitions (identified by sections named "Data Model", "Schema", or "Entities"), calls the Postgres MCP server to inspect the actual table structure. It produces findings when:

- A spec describes a column that does not exist in the database.
- The database has columns not mentioned in the spec (potential spec gap).
- Column types in the spec do not match the actual types.
- Index or constraint definitions in the spec diverge from the actual schema.

These findings get severity `major` (spec-database mismatch) or `observation` (database column not in spec), and are written to the ACP session with `source: 'database-validation'` metadata.

---

## 7. OpenAPI/Swagger MCP — API Spec Validation

### Feature: Live API Contract Validation

When specs describe API contracts, agents validate them against actual OpenAPI definitions or running services.

**MCP Tool: `openapi_validate`**

- Input: spec requirements describing endpoints, request/response schemas
- Action: fetch the OpenAPI spec from a configured URL, compare against the spec's described API
- Output: list of discrepancies (missing endpoints, schema mismatches, changed response codes)

**Integration Pattern:**
The `codebase-analyzer` agent fetches the OpenAPI spec and writes an API surface document to the ACP session. The `reviewer` agent cross-references this with the spec's API section. The `coverage-agent` checks that every API endpoint in the OpenAPI spec is covered by at least one requirement.

---

## 8. Docker/Kubernetes MCP — Infrastructure Spec Validation

### Feature: Deployment Spec Verification

Specs that describe deployment topology (services, replicas, resource limits, environment variables) can be validated against actual Kubernetes manifests or running clusters.

**MCP Tools:**

- `k8s_get_deployments` — List deployments in a namespace with replica counts and resource limits.
- `k8s_get_services` — List services with ports and selectors.
- `k8s_get_configmaps` — List configmaps and their keys (not values, for security).
- `docker_inspect` — Inspect a Docker image for labels, exposed ports, entrypoint.

**Agent Behavior:**
The `reviewer` agent, when reviewing infrastructure specs, queries the Kubernetes MCP server to verify:

- Service count matches the spec's deployment diagram.
- Resource limits in the spec match actual deployment manifests.
- Environment variables referenced in the spec exist in configmaps.
- Port numbers in the spec match service definitions.

Discrepancies produce findings tagged `infrastructure-drift`.

---

## 9. Test Runner MCP — Structured Test Results

### Feature: Direct Test Execution with Structured Results

The `dev-agent` (BEH-SF-022) already runs tests via `TestRunnerPort`. An MCP-based test runner provides richer structured results that the agent can reason about more effectively.

**MCP Tools:**

- `test_run` — Execute a test suite. Parameters: `pattern` (glob), `timeout` (ms). Returns: structured JSON with pass/fail per test, assertion messages, stack traces, duration.
- `test_coverage` — Execute tests with coverage collection. Returns: per-file coverage percentages, uncovered line ranges.
- `test_list` — List available test suites without running them. Returns: test names, file paths, tags.

**Advantage Over Bash:**
When the `dev-agent` runs tests through Bash (`pnpm test`), it gets unstructured terminal output that it must parse. The MCP test runner returns structured JSON, so the agent can directly iterate over failures, correlate them with requirements, and focus repairs on specific failing assertions without parsing text.

**Integration with Coverage Agent:**
The `coverage-agent` calls `test_coverage` to get per-file coverage data, then cross-references with the knowledge graph to compute requirement-level coverage (not just line-level coverage). A requirement is covered when all code paths implementing it have test coverage above the threshold.

---

## 10. Dynamic MCP Composition — Role-Based Server Assignment

### Feature: Per-Agent MCP Server Configuration

SpecForge already computes per-role tool sets at spawn time (BEH-SF-082). MCP server assignment follows the same pattern: each agent role gets a specific set of MCP servers.

**Implementation:**

The `ClaudeCodeAdapter` (BEH-SF-151) writes a temporary `mcp.json` file per agent session, containing only the MCP servers authorized for that role. The `--mcp-config` flag points to this file.

```typescript
// Pseudocode for MCP config generation
function buildMcpConfig(role: AgentRole, projectConfig: ProjectConfig): McpConfig {
  const servers: Record<string, McpServerConfig> = {};

  // All agents that need graph access get the Neo4j MCP server
  if (role === "reviewer" || role === "coverage-agent" || role === "codebase-analyzer") {
    servers["neo4j"] = projectConfig.mcpServers.neo4j;
  }

  // Dev agent gets test runner MCP
  if (role === "dev-agent") {
    servers["test-runner"] = projectConfig.mcpServers.testRunner;
  }

  // Task decomposer gets project management MCP if configured
  if (role === "task-decomposer" && projectConfig.mcpServers.linear) {
    servers["linear"] = projectConfig.mcpServers.linear;
  }

  // Reviewer gets database and API validation MCPs if configured
  if (role === "reviewer") {
    if (projectConfig.mcpServers.postgres) servers["postgres"] = projectConfig.mcpServers.postgres;
    if (projectConfig.mcpServers.openapi) servers["openapi"] = projectConfig.mcpServers.openapi;
    if (projectConfig.mcpServers.kubernetes) servers["k8s"] = projectConfig.mcpServers.kubernetes;
  }

  return { mcpServers: servers };
}
```

**ToolRegistryPort Integration:**
MCP-provided tools are discovered at spawn time and added to the tool registry with `origin: 'mcp'` (BEH-SF-084). The `--allowedTools` flag on `claude -p` still controls the final tool set. If a role declares `neo4j_query` in its allowed tools but the Neo4j MCP server is not configured, the tool simply does not exist — no error, no capability.

**Temporary File Cleanup:**
The adapter creates `mcp-{sessionId}.json` in a temp directory. When the agent session completes (BEH-SF-154), the adapter deletes the temporary file as part of resource cleanup.

---

## 11. Security Scanner MCP — Automated Security Review

### Feature: SAST/DAST Integration for Spec Review

Security-focused flows benefit from automated scanning tools available as MCP servers.

**MCP Tools:**

- `sast_scan` — Run static analysis on specified files. Returns: vulnerability findings with CWE IDs, severity, line numbers.
- `dependency_audit` — Audit dependencies for known vulnerabilities. Returns: CVE list with severity and affected packages.
- `secret_scan` — Scan files for hardcoded secrets. Returns: locations of potential credential leaks.

**New Agent Role: `security-reviewer`**

A custom agent role (registerable via BEH-SF-088) that combines the security scanner MCP with the existing reviewer capabilities:

```json
{
  "role": "security-reviewer",
  "domain": "security",
  "tools": ["Read", "Glob", "Grep", "neo4j_query", "sast_scan", "dependency_audit", "secret_scan"],
  "model": "opus"
}
```

This agent reviews specs for security considerations and cross-references with automated scan results. It produces findings like "Spec describes JWT authentication but SAST scan found hardcoded secret at auth/config.ts:42" with severity `critical`.

**Integration with Risk Assessment Flow:**
The `risk-assessment` flow gains a new stage where the security-reviewer agent runs, combining spec-level security review with automated scanning. Findings feed into the FMEA risk assessment.

---

## 12. Documentation MCP — Internal Knowledge Access

### Feature: Confluence/Wiki Access for Context Enrichment

The `discovery-agent` (BEH-SF-017) gathers requirements through conversation and web search. A documentation MCP server gives it access to internal company wikis, Confluence spaces, and Notion databases.

**MCP Tools:**

- `confluence_search` — Full-text search across Confluence spaces. Returns: page titles, excerpts, URLs.
- `confluence_get_page` — Fetch a specific page's content. Returns: rendered content as markdown.
- `notion_search` — Search Notion databases and pages.
- `notion_get_page` — Fetch a Notion page's content.

**Agent Behavior Change:**
During the discovery phase, the `discovery-agent` augments web search with internal documentation search. When the user mentions a system or feature name, the agent automatically searches Confluence for existing documentation, architecture decision records, and past design docs. This context is written to the ACP session as research notes, enriching the requirements brief.

**Session Chunk Value:**
Internal documentation references become high-value session chunks. When these chunks are materialized and embedded (BEH-SF-009 through BEH-SF-016), future sessions can compose them for context, reducing redundant internal doc searches.

---

## 13. MCP Server Marketplace — Curated Tool Packs

### Feature: SpecForge Plugin Packs with Pre-Configured MCP Servers

SpecForge's plugin architecture (BEH-SF-090) extends to include MCP server bundles. A plugin can declare MCP servers alongside agent roles, hooks, and conventions.

**Plugin Manifest Extension:**

```typescript
interface PluginManifest {
  readonly name: string;
  readonly version: string;
  readonly provides: {
    readonly agentRoles?: ReadonlyArray<CustomAgentConfig>;
    readonly hooks?: ReadonlyArray<PhaseHook>;
    readonly conventions?: ConventionPlugin;
    readonly flows?: ReadonlyArray<FlowDefinition>;
    readonly mcpServers?: Record<string, McpServerConfig>; // NEW
    readonly toolMappings?: Record<string, ReadonlyArray<string>>; // NEW: role -> MCP tool names
  };
  readonly activationMode: "always" | "on-demand";
}
```

**Example: "Full-Stack Validation" Plugin Pack**

```json
{
  "name": "full-stack-validation",
  "version": "1.0.0",
  "provides": {
    "mcpServers": {
      "postgres": { "command": "npx", "args": ["-y", "@anthropic/postgres-mcp-server"] },
      "openapi": { "command": "npx", "args": ["-y", "@specforge/openapi-mcp-server"] },
      "k8s": { "command": "npx", "args": ["-y", "@specforge/k8s-mcp-server"] }
    },
    "toolMappings": {
      "reviewer": ["postgres_query", "openapi_validate", "k8s_get_deployments"],
      "codebase-analyzer": ["postgres_schema", "openapi_fetch"]
    },
    "flows": [
      {
        "name": "full-stack-review",
        "description": "Review spec against database, API, and infrastructure",
        "phases": ["..."]
      }
    ]
  }
}
```

**Marketplace Distribution:**
In SaaS mode, plugins are distributed via `CloudMarketplaceAdapter` (from `MarketplacePort`). In solo mode, plugins are installed from npm or local directories. The marketplace lists MCP server requirements, so users know what credentials they need before installing.

---

## 14. MCP Health and Discovery at Spawn Time

### Feature: Graceful MCP Server Failure Handling

MCP servers are external processes. They can fail to start, crash during a session, or become unresponsive. SpecForge needs to handle this gracefully.

**Spawn-Time Health Check:**
Before passing the `--mcp-config` to `claude -p`, the adapter performs a lightweight health check on each configured MCP server. Servers that fail the health check are excluded from the config, and a warning is logged. The agent session proceeds with the remaining MCP servers.

**Fallback Behavior:**
If a critical MCP server (one required by the flow, not optional) fails the health check, the adapter reports an `McpServerUnavailableError` and the orchestrator decides whether to proceed (degraded mode) or abort the phase.

**Runtime Crash Recovery:**
If an MCP server crashes mid-session, Claude Code handles the tool failure internally (the tool call returns an error). The agent adapts by not calling that tool again. The adapter detects this through stream-json events containing tool errors from MCP-origin tools and reports the degradation to the orchestrator.

---

## 15. Composition Matrix — Which Agents Get Which MCP Servers

Summary of the full MCP server assignment matrix across all agent roles:

| MCP Server        | discovery | spec-author | reviewer          | feedback-synth | task-decomp | dev-agent | codebase-analyzer | coverage-agent |
| ----------------- | --------- | ----------- | ----------------- | -------------- | ----------- | --------- | ----------------- | -------------- |
| Neo4j (read-only) | -         | -           | yes               | -              | -           | -         | yes               | yes            |
| GitHub            | -         | -           | yes               | -              | yes         | yes       | yes               | -              |
| Linear/Jira       | -         | -           | -                 | -              | yes         | -         | -                 | -              |
| Postgres          | -         | -           | yes               | -              | -           | -         | yes               | -              |
| OpenAPI           | -         | -           | yes               | -              | -           | -         | yes               | -              |
| Kubernetes        | -         | -           | yes               | -              | -           | -         | -                 | -              |
| Test Runner       | -         | -           | -                 | -              | -           | yes       | -                 | yes            |
| Security Scanner  | -         | -           | security-reviewer | -              | -           | -         | -                 | -              |
| Confluence/Notion | yes       | -           | -                 | -              | -           | -         | -                 | -              |
| SpecForge (self)  | -         | -           | -                 | -              | -           | -         | -                 | -              |

The SpecForge MCP server (row "SpecForge (self)") is specifically designed for external consumers — developer Claude Code sessions, CI pipelines, third-party tooling — not for SpecForge's own orchestrated agents, which access the graph through internal ports.

---

## 16. Configuration Surface

### Project-Level MCP Configuration (`.specforge/mcp.json`)

Users configure available MCP servers per project. SpecForge reads this and composes per-agent configs at spawn time.

```json
{
  "servers": {
    "neo4j": {
      "command": "npx",
      "args": ["-y", "@specforge/neo4j-mcp-server"],
      "env": {
        "NEO4J_URI": "${SPECFORGE_NEO4J_URI}",
        "NEO4J_USER": "${SPECFORGE_NEO4J_READONLY_USER}",
        "NEO4J_PASSWORD": "${SPECFORGE_NEO4J_READONLY_PASSWORD}"
      },
      "roles": ["reviewer", "coverage-agent", "codebase-analyzer"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic/github-mcp-server"],
      "env": {
        "GITHUB_TOKEN": "${SPECFORGE_GITHUB_TOKEN}"
      },
      "roles": ["reviewer", "task-decomposer", "dev-agent", "codebase-analyzer"]
    },
    "test-runner": {
      "command": "npx",
      "args": ["-y", "@specforge/test-runner-mcp-server"],
      "env": {},
      "roles": ["dev-agent", "coverage-agent"]
    }
  }
}
```

The `roles` field is a SpecForge extension — it controls which agent roles receive the MCP server in their session config. This is enforced by the `ClaudeCodeAdapter` at spawn time, composing the per-session `mcp.json`.

### Environment Variable Interpolation

MCP server configs reference environment variables with `${VAR_NAME}` syntax. SpecForge resolves these from:

1. Process environment
2. `.specforge/.env` (project-local, gitignored)
3. `~/.specforge/.env` (user-global)

Credentials never appear in agent prompts or MCP config files committed to git.

---

## Summary of Key Additions to SpecForge

| Addition                                | Type                        | Touches                         |
| --------------------------------------- | --------------------------- | ------------------------------- |
| `specforge-neo4j-mcp` server            | New package                 | `GraphQueryPort`, agent spawn   |
| `@specforge/mcp-server` (self-exposure) | New package                 | All read ports, ACP session     |
| Per-agent MCP config generation         | `ClaudeCodeAdapter` change  | BEH-SF-151                      |
| MCP health check at spawn               | `ClaudeCodeAdapter` change  | BEH-SF-151                      |
| `.specforge/mcp.json` config format     | New config surface          | `ConfigPort`                    |
| `PluginManifest.mcpServers` field       | Type extension              | BEH-SF-090                      |
| `ToolDefinition.origin: 'mcp'` handling | Existing (BEH-SF-084)       | No change needed                |
| Post-phase hooks for graph linking      | New hooks                   | BEH-SF-092, `GraphMutationPort` |
| Security-reviewer custom agent role     | New role via plugin         | BEH-SF-088                      |
| MCP server marketplace distribution     | `MarketplacePort` extension | BEH-SF-090                      |
