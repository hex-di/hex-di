---
id: BEH-SF-185
kind: behavior
title: Dynamic Agents
status: active
id_range: 185--192
invariants: [INV-SF-7]
adrs: [ADR-015]
types: [agent, agent]
ports: [AgentRegistryPort, GraphQueryPort]
---

# 26 — Dynamic Agents

## BEH-SF-185: Dynamic Role Factory — RoleTemplate Registry with Activation Predicates

The system maintains a registry of `RoleTemplate` definitions that can generate specialized agent roles based on project characteristics.

### Contract

REQUIREMENT (BEH-SF-185): The system MUST maintain a `RoleTemplate` registry in the knowledge graph. Each template MUST declare: `templateId`, `roleName`, `domain`, `systemPromptTemplate`, `tools`, `model`, and `activationPredicate` (a Cypher query returning boolean). When a flow starts, the system MUST evaluate all activation predicates against the project graph. Templates whose predicates return true MUST be instantiated as available agent roles for the flow. Instantiated dynamic roles MUST follow the same `AgentPort` protocol as the 8 static roles.

### Verification

- Registration test: register a `RoleTemplate`; verify it appears in the registry.
- Activation test: create a predicate matching the project graph; verify the role is activated.
- Non-activation test: create a predicate not matching; verify the role is not activated.
- Protocol test: activate a dynamic role; verify it follows the `AgentPort` protocol.

---

## BEH-SF-186: Role Templates — Activation Predicates Evaluated Against Project Graph

Activation predicates are Cypher queries that evaluate project characteristics (languages, frameworks, dependencies) to determine which specialized roles are relevant.

### Contract

REQUIREMENT (BEH-SF-186): Activation predicates MUST be expressed as Cypher queries that return a single boolean result. Predicates MUST have access to the project graph including: detected languages (e.g., `MATCH (p:Project)-[:USES_LANGUAGE]->(l:Language)`), framework nodes, dependency nodes, and codebase size metrics. Predicate evaluation MUST be cached per flow run (evaluated once at flow start, not per phase). Predicates MUST timeout after 5 seconds with a default of `false` (role not activated).

### Verification

- Language test: add a Go language node; create a predicate matching Go; verify activation.
- Framework test: add a React framework node; create a predicate matching React; verify activation.
- Cache test: evaluate predicates; modify graph; verify predicates are not re-evaluated within the same flow.
- Timeout test: create a predicate that takes 10 seconds; verify it times out and returns false.

---

## BEH-SF-187: Parameterized Agent Templates — Typed Parameter Slots

Agent templates support typed parameter slots that are filled from flow configuration, graph queries, or default values.

### Contract

REQUIREMENT (BEH-SF-187): `RoleTemplate` system prompts MUST support parameter slots using `{{paramName}}` syntax. Each parameter MUST declare: `name`, `type` (`string`, `number`, `boolean`, `string[]`), `source` (`flow-config`, `graph-query`, `default`), and `defaultValue`. At role instantiation, parameters MUST be resolved in order: flow configuration override → graph query result → default value. Unresolvable required parameters MUST prevent role instantiation with a descriptive error.

### Verification

- Parameter resolution test: create a template with a parameter; provide it via flow config; verify resolution.
- Graph query test: create a parameter sourced from a graph query; verify it resolves from the graph.
- Default test: create a parameter with a default; omit other sources; verify the default is used.
- Missing parameter test: create a required parameter with no sources; verify instantiation fails with error.

---

## BEH-SF-188: Agent Skill Injection — Generated `.claude/skills/` from Codebase Context

The `codebase-analyzer` agent generates `.claude/skills/` markdown files encoding project-specific patterns. Skills are injected into relevant agents at spawn time.

### Contract

REQUIREMENT (BEH-SF-188): The codebase analyzer MUST generate `.claude/skills/` files encoding: naming conventions, file layout patterns, import ordering, error handling patterns (Result types, error tags, freeze conventions), and framework-specific idioms. Skill files MUST be scoped to relevant file paths. Skills MUST be stored as `Skill` graph nodes with `EXTRACTED_FROM` edges to source files. At agent spawn time, the `ClaudeCodeAdapter` MUST include relevant skills in the agent's configuration based on the agent's working directory scope.

### Verification

- Generation test: run codebase analyzer; verify skill files are generated in `.claude/skills/`.
- Content test: verify skill files contain accurate project patterns.
- Scope test: verify skills are scoped to relevant file paths.
- Injection test: spawn an agent in a specific directory; verify relevant skills are loaded.

---

## BEH-SF-189: Agent Performance Tracking — Token Usage, Quality, Error Rate as Graph Nodes

Every agent session's performance metrics are tracked and stored as graph nodes for analysis and role optimization.

### Contract

REQUIREMENT (BEH-SF-189): On session completion, the system MUST record performance metrics as graph nodes linked to the session node: `tokenUsage` (input/output tokens), `qualityScore` (derived from finding resolution rate and convergence contribution), `errorRate` (tool failures / total tool calls), `durationMs`, and `costUsd`. Performance metrics MUST be queryable per role across flow runs. Roles with consistently poor performance metrics (error rate > 20% for 3+ consecutive runs) MUST be flagged for review.

### Verification

- Metrics recording test: complete a session; verify performance graph nodes are created.
- Quality score test: resolve findings; verify quality score reflects resolution rate.
- Error rate test: simulate tool failures; verify error rate is computed correctly.
- Flagging test: create 4 runs with high error rate; verify the role is flagged.

---

## BEH-SF-190: Agent Introspection — Transcript Reading and Audit Finding Nodes

The system can read agent session transcripts to extract audit findings and quality signals.

### Contract

REQUIREMENT (BEH-SF-190): After a session completes, the introspection pipeline MUST parse the session transcript to extract: tool call patterns, reasoning quality signals (coherence, relevance), error recovery patterns, and potential policy violations. Extracted findings MUST be stored as `AgentAuditFinding` graph nodes linked to the session. Findings with severity `critical` or `major` MUST trigger a notification to the flow engine. Transcript parsing MUST NOT modify the session's immutable chunks.

### Verification

- Parsing test: complete a session; verify the transcript is parsed for findings.
- Finding creation test: detect a policy violation; verify an `AgentAuditFinding` node is created.
- Notification test: create a critical finding; verify a notification is sent to the flow engine.
- Immutability test: verify transcript parsing does not modify session chunks.

---

## BEH-SF-191: Agent Composition and Blending — Prompt Merge Strategies and Tool Union

Multiple role templates can be composed into a single agent with merged prompts and unified tool sets.

### Contract

REQUIREMENT (BEH-SF-191): The system MUST support composing two or more `RoleTemplate` definitions into a single agent definition. Composition MUST merge system prompts using a configurable strategy: `concatenate` (append prompts), `interleave` (alternate sections), or `priority` (higher-priority template sections first). Tool sets MUST be unified (union of all tools from composed templates). Composed agents MUST declare their source templates as `COMPOSED_FROM` graph edges. Conflicting instructions between templates MUST be resolved by template priority.

### Verification

- Composition test: compose two templates; verify the merged agent has tools from both.
- Concatenate test: use concatenate strategy; verify prompts are appended.
- Priority test: create conflicting instructions; verify higher-priority template wins.
- Graph linkage test: verify `COMPOSED_FROM` edges link to source templates.

---

## BEH-SF-192: Plugin-Contributed Agent Packs — PluginManifest agentPack Section

Plugins can contribute complete agent packs containing role templates, skill files, and MCP configurations.

### Contract

REQUIREMENT (BEH-SF-192): The `PluginManifest` MUST support an `agentPack` section declaring: role templates (with activation predicates), skill files, MCP server configurations, and flow definitions that use the contributed roles. When a plugin is enabled, its agent pack MUST be registered with the role template registry and skill system. Plugin-contributed roles MUST be indistinguishable from built-in roles in flow definitions. Disabling a plugin MUST remove its roles, skills, and MCP configurations.

### Verification

- Registration test: enable a plugin with an agent pack; verify roles appear in the registry.
- Flow test: reference a plugin role in a flow definition; verify the flow executes.
- Disable test: disable the plugin; verify roles are removed from the registry.
- Skill test: verify plugin-contributed skills are loaded for relevant agents.
