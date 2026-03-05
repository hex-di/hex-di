---
id: RES-09
kind: research
title: Research 09 — Subagent Architecture Patterns
status: Research
date: 2026-02-27
outcome: deferred
related_adr: []
---

# Research 09 — Subagent Architecture Patterns

**Context:** Claude Code subagent system ([references/claude-code/subagents.md](../references/claude-code/subagents.md)), existing agent roles ([behaviors/BEH-SF-017-agent-roles.md](../behaviors/BEH-SF-017-agent-roles.md)), ClaudeCodeAdapter ([behaviors/BEH-SF-151-claude-code-adapter.md](../behaviors/BEH-SF-151-claude-code-adapter.md))

---

## Problem Statement

SpecForge currently defines 8 static agent roles (`AgentRole` union type) wired into flow definitions at design time. The Claude Code subagent system enables programmatic agent definition via `--agents` JSON and file-based `.claude/agents/` definitions. This creates an opportunity to move beyond a fixed role roster toward a dynamic, composable, and evolvable agent architecture — one where agents are created, specialized, evaluated, and retired based on project context.

This document explores concrete architectural patterns that exploit the subagent primitive to build capabilities that do not exist in the current spec.

---

## Pattern 1 — Dynamic Role Factory

### Concept

Instead of a fixed `AgentRole` union, SpecForge maintains a **role template registry** in the knowledge graph. When a flow starts, the orchestrator queries the project's technology stack, domain vocabulary, and past agent performance to synthesize role definitions on the fly.

### Mechanism

1. A `RoleTemplate` node in Neo4j stores: name pattern, system prompt template (with `{{variables}}`), tool constraints, model selection heuristics, and activation predicates.
2. When the orchestrator enters a phase requiring an agent, it evaluates activation predicates against the project graph. A predicate like `project.hasTech('react') && phase.name === 'authoring'` activates a "React architecture specialist" template.
3. The template is hydrated: variables are replaced with project-specific values (component library names, routing patterns, state management approach) sourced from the `codebase-context` node.
4. The hydrated definition is passed to `--agents` JSON at spawn time.

### Graph Schema

```
(:RoleTemplate {
  name: "react-specialist",
  promptTemplate: "You are an expert in React {{version}}...",
  activationPredicate: "project.hasTech('react')",
  toolSet: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
  model: "opus",
  domain: "frontend"
})

(:RoleTemplate)-[:ACTIVATED_BY]->(:TechNode {name: "react"})
(:RoleTemplate)-[:PRODUCED_BY]->(:RoleFactory {name: "frontend-factory"})
```

### Concrete Features

- **Auto-specialization**: A Go project spawns `go-concurrency-reviewer` and `go-interface-design-advisor`; a Python ML project spawns `pytorch-architecture-analyst` and `data-pipeline-reviewer`. Neither role exists in the base system.
- **Version-aware prompts**: The template for `react-specialist` detects React 19 vs 18 from `package.json` and adjusts guidance on server components, transitions API, and concurrent features.
- **Role retirement**: If a dynamically created role has never been activated across N flow runs, the system marks it dormant and excludes it from future template evaluation.

---

## Pattern 2 — Hierarchical Delegation Chains

### Concept

Claude Code subagents cannot spawn other subagents (single-level nesting). But SpecForge's orchestrator can simulate multi-level delegation by managing the hierarchy itself: a "lead agent" receives a broad task, decomposes it, and the orchestrator spawns subordinate agents for each subtask, feeding results back to the lead.

### Mechanism

1. The orchestrator spawns a **lead agent** with a system prompt that instructs it to produce a structured decomposition (JSON array of subtasks) rather than executing work directly.
2. The lead agent writes subtasks to the ACP session as `TaskDecomposition` documents.
3. The orchestrator reads the decomposition, spawns one **worker agent** per subtask (potentially in parallel via background mode), each with a narrowed system prompt and scoped tools.
4. Worker results are written to the ACP session. The orchestrator feeds them back to the lead agent for synthesis.
5. The lead agent produces the final consolidated output.

### Flow Definition Extension

```typescript
interface HierarchicalStage {
  readonly lead: AgentRoleRef;
  readonly workerTemplate: AgentRoleRef;
  readonly decompositionSchema: JsonSchema; // validates lead's subtask output
  readonly maxWorkers: number; // parallel worker cap
  readonly synthesisTrigger: "all-complete" | "majority-complete" | "first-complete";
}
```

### Concrete Features

- **Spec chapter parallelism**: The spec-author lead decomposes a large spec into chapters. Each chapter is authored by a parallel worker agent. The lead synthesizes cross-chapter consistency.
- **Code review fan-out**: The reviewer lead identifies 5 areas of concern. Five worker agents review one area each with deep focus. The lead merges findings and resolves conflicts.
- **Research delegation**: The discovery agent lead identifies 8 open questions. Worker agents research each question independently (some using web search, some using codebase analysis). The lead assembles the requirements brief from all research.

---

## Pattern 3 — Background Knowledge Maintenance Agents

### Concept

Long-running background agents that continuously maintain the knowledge graph by monitoring file changes, re-analyzing modified code, and updating graph nodes without blocking any active flow.

### Mechanism

1. A `background-indexer` subagent is defined with `background: true` and `isolation: "worktree"` in its subagent definition.
2. It runs on `haiku` model (cost-efficient) with read-only tools (`Read`, `Glob`, `Grep`).
3. An MCP server exposes graph-write operations to the background agent, allowing it to update `CodeFile`, `Symbol`, and `Dependency` nodes.
4. The agent receives a prompt like: "Monitor `git diff HEAD~1` for changed files. For each changed file, update its graph node with current exports, imports, and complexity metrics."
5. It runs continuously between flow invocations, triggered by file system hooks or periodic polling.

### Subagent Definition

```json
{
  "background-indexer": {
    "description": "Continuously indexes codebase changes into the knowledge graph",
    "prompt": "You maintain a knowledge graph of the codebase. When invoked, check for files modified since your last run. For each modified file, extract exports, imports, type signatures, and complexity metrics. Write updates via the graph-write MCP tool.",
    "tools": ["Read", "Glob", "Grep", "Bash"],
    "mcpServers": ["specforge-graph-writer"],
    "model": "haiku",
    "background": true,
    "maxTurns": 50
  }
}
```

### Concrete Features

- **Always-fresh graph**: When a spec-writing flow starts, the codebase-context graph nodes are already current. The `codebase-analyzer` agent can skip initial indexing and focus on higher-level analysis.
- **Change impact alerts**: The background agent detects that a modified file breaks a traced requirement chain and posts a finding to a persistent ACP session channel.
- **Dependency drift detection**: The agent tracks `package.json` / `go.mod` / `Cargo.toml` changes and flags new dependencies that lack security review nodes in the graph.

---

## Pattern 4 — Agent Skill Injection

### Concept

Each subagent definition accepts a `skills` field — a list of skill names preloaded into the agent's context at startup. SpecForge generates project-specific skills that encode domain knowledge, making agents immediately productive without rediscovering context.

### Mechanism

1. During the `onboarding` flow, SpecForge generates skill files from the codebase-context graph node. These are `.md` files placed in `.claude/skills/`.
2. Each skill encodes a specific knowledge area: "hex-di port definitions", "saga compensation patterns", "guard policy types".
3. When an agent is spawned, its subagent definition includes `skills: ["hex-di-ports", "saga-patterns"]` based on the flow phase and the task's file scope.
4. The skill content is injected into the agent's context window at startup, giving it pre-loaded domain expertise.

### Skill Generation Pipeline

```
(:CodebaseContext)-[:EXTRACTED_SKILL]->(:Skill {
  name: "hex-di-ports",
  content: "## hex-di Port Definitions\n\nPorts are created via...",
  domain: "core",
  generatedFrom: "codebase-analyzer/session-abc",
  tokenCount: 2400
})
```

### Concrete Features

- **Auto-generated coding conventions skill**: A skill that encodes the project's naming conventions, file layout rules, and import ordering preferences — extracted from the codebase-context node.
- **Domain glossary skill**: A skill containing the project's domain vocabulary with definitions, derived from spec documents in the graph.
- **API surface skill**: A skill listing all public API functions, their signatures, and usage examples — kept up to date by the background indexer.
- **Error pattern skill**: A skill encoding the project's error handling patterns (Result types, error tags, freeze conventions) so every agent writes error-handling code consistently.

---

## Pattern 5 — Competitive Agent Evaluation

### Concept

For high-stakes tasks (architecture decisions, complex refactoring plans), spawn multiple agents with the same task but different approaches. Evaluate outputs and select the best one.

### Mechanism

1. The orchestrator defines a `CompetitiveStage` containing N candidate configurations: different models, different system prompt emphases, or different tool sets.
2. All candidates run in parallel as background subagents, each in its own worktree (via `isolation: "worktree"`).
3. A separate `evaluator` agent (read-only tools, high-capability model) receives all candidate outputs and scores them against explicit criteria defined in the flow.
4. The winning output is promoted to the ACP session. Losing outputs are archived with their scores for learning.

### Flow Definition Extension

```typescript
interface CompetitiveStage {
  readonly candidates: ReadonlyArray<{
    readonly config: AgentSpawnConfig;
    readonly label: string;
  }>;
  readonly evaluator: AgentRoleRef;
  readonly evaluationCriteria: ReadonlyArray<string>;
  readonly selectionStrategy: "highest-score" | "consensus" | "human-pick";
}
```

### Concrete Features

- **Architecture decision quality**: Three agents independently propose architectures for a new feature. An evaluator agent scores them on coupling, testability, and alignment with existing patterns. The best architecture is selected.
- **Prompt engineering for agents**: When generating a new dynamic role, spawn 3 variations of the system prompt. Test each on a sample task. The variation producing the best output becomes the production prompt.
- **Implementation alternatives**: For a tricky algorithm, spawn an Opus agent (deep reasoning) and a Sonnet agent (fast iteration). Compare the implementations on correctness, readability, and performance.

---

## Pattern 6 — Agent Introspection and Self-Improvement

### Concept

Agents that analyze other agents' transcripts, identify failure patterns, and propose prompt or tool configuration improvements.

### Mechanism

1. All agent transcripts are persisted at `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl` (per Claude Code's design).
2. An `agent-auditor` background agent periodically reads transcripts and the knowledge graph's flow run history.
3. It identifies patterns: excessive tool calls that find nothing (bad search strategy), repeated context overflow errors (prompt too large), cycles where the agent undoes its own work (conflicting instructions).
4. Audit findings are written to the graph as `AgentAuditFinding` nodes linked to the `RoleTemplate` and `FlowRun` nodes.
5. When findings accumulate above a threshold, the orchestrator triggers a `prompt-refinement` flow that proposes updated system prompts.

### Graph Schema

```
(:AgentAuditFinding {
  pattern: "excessive-empty-searches",
  severity: "major",
  occurrenceCount: 12,
  affectedRole: "dev-agent",
  suggestedFix: "Add file path hints from codebase-context to system prompt"
})-[:FOUND_IN]->(:FlowRun)
(:AgentAuditFinding)-[:AFFECTS]->(:RoleTemplate)
```

### Concrete Features

- **Tool usage optimization**: The auditor detects that the dev-agent calls `Glob` 15 times per session looking for test files. It suggests adding a skill with the test directory layout.
- **Context overflow prevention**: The auditor detects that 3 of the last 5 spec-author sessions hit context limits. It suggests reducing composed context chunk count or switching to a summarization strategy.
- **Prompt drift detection**: The auditor compares current role template prompts against their original versions and flags accidental regressions introduced by prompt-refinement flows.

---

## Pattern 7 — Plugin-Contributed Agent Packs

### Concept

Extend the plugin architecture (BEH-SF-090) so that plugins contribute not just individual agent roles but complete "agent packs" — coordinated sets of agents, skills, role templates, and evaluation criteria for a specific domain.

### Mechanism

1. A plugin's `PluginManifest` declares an `agentPack` section containing role templates, skills, evaluation criteria, and custom flow phases.
2. When the plugin is activated, its agent pack is registered with both the agent registry and the role template registry.
3. The pack's agents can reference each other in hierarchical delegation chains and include pack-specific MCP servers.

### Plugin Manifest Extension

```typescript
interface AgentPackManifest {
  readonly name: string;
  readonly description: string;
  readonly roles: ReadonlyArray<RoleTemplateDefinition>;
  readonly skills: ReadonlyArray<SkillDefinition>;
  readonly flows: ReadonlyArray<FlowDefinition>;
  readonly evaluationCriteria?: ReadonlyArray<EvaluationCriterion>;
  readonly mcpServers?: ReadonlyArray<McpServerConfig>;
}
```

### Concrete Domain Packs

- **GxP Compliance Pack**: Adds `gxp-auditor` (reviews specs for 21 CFR Part 11 compliance), `validation-protocol-author` (generates IQ/OQ/PQ documents), `electronic-signature-reviewer` (validates e-signature workflows). Includes skills encoding FDA guidance documents and ICH Q-series references.
- **Security Review Pack**: Adds `threat-modeler` (produces STRIDE analysis), `dependency-auditor` (checks CVE databases via MCP), `access-control-reviewer` (validates RBAC/ABAC implementations). Includes an MCP server for NVD API access.
- **API Design Pack**: Adds `openapi-spec-author` (generates OpenAPI from behavior specs), `api-consistency-reviewer` (checks naming conventions, pagination patterns, error formats), `sdk-generator` (produces client SDKs from OpenAPI). Includes skills encoding REST/GraphQL design guidelines.
- **Data Engineering Pack**: Adds `schema-evolution-reviewer` (validates backward-compatible schema changes), `pipeline-analyzer` (maps data lineage), `data-quality-spec-author` (writes data validation specs).

---

## Pattern 8 — Parameterized Agent Templates

### Concept

Agent definitions as reusable templates with typed parameters that are resolved at spawn time based on flow context, project metadata, or user configuration.

### Mechanism

1. A `ParameterizedTemplate` stores a system prompt with typed parameter slots: `{{language:string}}`, `{{framework:string}}`, `{{testRunner:string}}`.
2. Parameters are resolved from multiple sources in priority order: flow stage config > project graph metadata > user defaults > template defaults.
3. The resolved template produces a concrete subagent definition.

### Template Definition

```typescript
interface ParameterizedAgentTemplate {
  readonly name: string;
  readonly parameters: ReadonlyArray<{
    readonly key: string;
    readonly type: "string" | "string[]" | "boolean" | "number";
    readonly source: "graph-query" | "flow-config" | "user-config";
    readonly query?: string; // Cypher query for graph-query source
    readonly default?: unknown;
  }>;
  readonly promptTemplate: string;
  readonly toolTemplate: string; // may include conditional tools
  readonly modelRule: string; // e.g., "if params.complexity > 8 then opus else sonnet"
}
```

### Concrete Features

- **Language-adaptive dev-agent**: A single `dev-agent` template that produces TypeScript-specific, Go-specific, or Python-specific agents based on the `language` parameter resolved from the project graph.
- **Test framework injection**: The dev-agent template's system prompt includes test-framework-specific guidance (`vitest` vs `jest` vs `pytest`) resolved from the project's `devDependencies`.
- **Complexity-based model routing**: Simple tasks (adding a test, fixing a typo) route to Haiku. Medium tasks (implementing a function) route to Sonnet. Complex tasks (redesigning a module) route to Opus. The `complexity` parameter comes from the task decomposer's estimate.

---

## Pattern 9 — Worktree-Isolated Parallel Development

### Concept

Each dev-agent gets its own git worktree, enabling true parallel implementation without file conflicts. The orchestrator manages worktree lifecycle and merge coordination.

### Mechanism

1. When the Dev Forge phase spawns multiple dev-agents for independent task groups, each agent's subagent definition includes `isolation: "worktree"`.
2. Claude Code creates a worktree in `.claude/worktrees/` with a branch for each agent.
3. Agents implement their task groups in isolation. No file locking, no merge conflicts during development.
4. On completion, the orchestrator merges worktree branches sequentially: base -> task-group-1 -> task-group-2 -> ...
5. If a merge conflict arises, a specialized `conflict-resolver` agent is spawned with the conflicting files and both branches' context.

### Orchestrator Merge Protocol

```
1. Sort completed task groups by dependency order
2. For each task group:
   a. Attempt git merge of worktree branch into integration branch
   b. If clean merge: continue
   c. If conflict: spawn conflict-resolver agent with:
      - Conflicting file pairs
      - Both agents' task group specs
      - The spec requirements each implementation satisfies
   d. Conflict-resolver produces resolved files
   e. Commit resolved merge
3. Run full test suite on integration branch
4. If tests pass: promote to main development branch
```

### Concrete Features

- **Zero-conflict parallelism**: Five dev-agents implement five independent task groups simultaneously, each in its own worktree. Total wall-clock time is bounded by the slowest agent, not the sum.
- **Conflict resolution with context**: The conflict-resolver agent understands WHY each change was made (it reads both task group specs) and makes semantically correct merge decisions.
- **Rollback granularity**: If task-group-3 fails tests after merge, only its worktree branch is reverted. Task groups 1, 2, 4, and 5 remain integrated.

---

## Pattern 10 — Agent Performance Tracking and Evolution

### Concept

Track agent performance across flow runs. Use performance data to evolve agent prompts, tool configurations, and model selections over time.

### Mechanism

1. Every agent session produces metrics: token usage, wall-clock time, tool call count, output quality (as rated by evaluator agents or convergence criteria), error rate.
2. Metrics are stored as `AgentPerformance` nodes in the graph, linked to `RoleTemplate`, `FlowRun`, and `Session` nodes.
3. A periodic `agent-evolution` flow reads performance trends and proposes configuration changes.
4. Changes are applied as new versions of `RoleTemplate` nodes (previous versions are retained for comparison).

### Performance Tracking Schema

```
(:AgentPerformance {
  sessionId: "sess-abc",
  role: "dev-agent",
  tokenUsage: 45000,
  wallClockSeconds: 120,
  toolCalls: 37,
  qualityScore: 0.85,     // from evaluator or convergence
  errorRate: 0.02,         // fraction of tool calls that errored
  contextOverflows: 0,
  iterationsToConverge: 3
})-[:MEASURED_IN]->(:FlowRun)
(:AgentPerformance)-[:USED_TEMPLATE]->(:RoleTemplate {version: 4})
```

### Evolution Decisions

| Signal                                        | Evolution Action                                                |
| --------------------------------------------- | --------------------------------------------------------------- |
| Token usage trending up across versions       | Audit prompt for unnecessary verbosity, suggest compression     |
| Quality score declining after template change | Revert to previous template version                             |
| Consistent context overflows                  | Reduce composed context budget or split into sub-tasks          |
| Tool call errors > 10%                        | Audit tool configuration, add error-handling guidance to prompt |
| Convergence iterations increasing             | Review convergence criteria or split the task                   |

### Concrete Features

- **A/B testing agent prompts**: Deploy template v5 for 50% of flow runs and template v4 for the other 50%. Compare quality scores after N runs. Promote the winner.
- **Automatic model downgrade**: If Haiku performs within 5% of Sonnet for a specific role over 20 runs, the system suggests downgrading to Haiku to reduce cost.
- **Prompt length optimization**: Track the correlation between prompt token count and output quality. Find the diminishing-returns point and trim accordingly.

---

## Pattern 11 — Agent Composition and Blending

### Concept

Combine multiple role template prompts and tool sets into a single "composite agent" for tasks that span multiple domains. Rather than delegating to multiple agents and synthesizing, create one agent with blended expertise.

### Mechanism

1. The orchestrator identifies that a task touches multiple domains (e.g., "review the API spec for both security concerns and REST design quality").
2. It queries the role template registry for templates matching the involved domains.
3. System prompts are composed section-by-section: security expertise from `security-reviewer`, API design from `api-design-reviewer`, project-specific patterns from the relevant skill.
4. Tool sets are unioned. Model is selected as the maximum capability across composed roles.
5. A single agent is spawned with the blended definition.

### Composition Rules

```typescript
interface AgentComposition {
  readonly baseRole: AgentRoleRef;
  readonly blendedRoles: ReadonlyArray<AgentRoleRef>;
  readonly promptMergeStrategy: "concatenate" | "interleave" | "prioritized";
  readonly toolMerge: "union" | "intersection";
  readonly modelSelection: "max-capability" | "specified";
}
```

### Concrete Features

- **Full-stack review**: Compose `frontend-reviewer` + `backend-reviewer` + `api-consistency-reviewer` into a single agent that reviews an entire feature branch holistically, catching integration issues that siloed reviewers would miss.
- **Spec-and-code agent**: Compose `spec-author` + `dev-agent` for rapid prototyping flows where the agent writes the spec and immediately implements it, maintaining perfect spec-code alignment.
- **Compliance-aware development**: Compose `dev-agent` + `gxp-auditor` so that the implementation agent self-audits for compliance as it writes code, rather than requiring a separate review pass.

---

## Pattern 12 — Agent Marketplace

### Concept

A community-contributed registry of role templates, skills, and agent packs that users can install into their SpecForge projects.

### Mechanism

1. Role templates are published to a registry (analogous to npm for packages) with metadata: domain tags, compatibility versions, performance benchmarks, user ratings.
2. `specforge marketplace search "security review"` returns matching agent packs.
3. `specforge marketplace install @security/threat-modeler` downloads the pack into `.specforge/plugins/marketplace/`.
4. Installed packs register their role templates and skills with the project's template registry.
5. Version management follows semver. Template updates can be reviewed before adoption.

### Registry Metadata

```typescript
interface MarketplaceEntry {
  readonly name: string;
  readonly publisher: string;
  readonly version: string;
  readonly domain: ReadonlyArray<string>;
  readonly compatibility: { readonly specforge: string };
  readonly benchmarks: {
    readonly avgQualityScore: number;
    readonly avgTokenUsage: number;
    readonly sampleSize: number;
  };
  readonly ratings: { readonly average: number; readonly count: number };
  readonly contents: {
    readonly roles: number;
    readonly skills: number;
    readonly flows: number;
  };
}
```

### Concrete Features

- **Healthcare agent pack**: Community-contributed pack with HIPAA compliance reviewer, HL7 FHIR spec author, and clinical workflow validator.
- **Fintech agent pack**: SOX compliance auditor, PCI-DSS reviewer, financial calculation verifier.
- **Gaming agent pack**: ECS architecture reviewer, shader code analyzer, game state machine spec author.
- **Rating-driven trust**: Agents with high community ratings and large sample sizes are surfaced first. New agents run in competitive evaluation mode against established ones before being trusted.

---

## Integration with Existing Architecture

These patterns integrate with SpecForge's existing architecture through defined extension points:

| Pattern                 | Integration Point                | New Graph Nodes                       | New Behaviors                  |
| ----------------------- | -------------------------------- | ------------------------------------- | ------------------------------ |
| Dynamic Role Factory    | `AgentRegistry`, `--agents` JSON | `RoleTemplate`, `RoleFactory`         | Template evaluation, hydration |
| Hierarchical Delegation | Orchestrator flow engine         | `TaskDecomposition`                   | Lead/worker coordination       |
| Background Maintenance  | Subagent `background: true`      | `IndexerRun`                          | Continuous indexing            |
| Skill Injection         | Subagent `skills` field          | `Skill`                               | Skill generation pipeline      |
| Competitive Evaluation  | Parallel background subagents    | `CandidateOutput`, `EvaluationResult` | Evaluation flow                |
| Agent Introspection     | Transcript persistence           | `AgentAuditFinding`                   | Audit flow                     |
| Plugin Agent Packs      | `PluginManifest` extension       | Pack-specific nodes                   | Pack registration              |
| Parameterized Templates | `RoleTemplate` with parameters   | Parameter resolution sources          | Template resolution            |
| Worktree Isolation      | Subagent `isolation: "worktree"` | `WorktreeBranch`                      | Merge protocol                 |
| Performance Tracking    | `OrchestratorEvent` stream       | `AgentPerformance`                    | Evolution flow                 |
| Agent Composition       | Role template blending           | `CompositeRole`                       | Composition rules              |
| Agent Marketplace       | Plugin discovery                 | `MarketplaceEntry`                    | Install/update protocol        |

---

## Constraints and Limitations

1. **No subagent nesting**: Claude Code subagents cannot spawn other subagents. All hierarchy must be orchestrator-managed. This is a hard constraint that shapes Pattern 2.
2. **Context window limits**: Composite agents (Pattern 11) must respect context window size. Blending too many role prompts may exceed limits or reduce quality.
3. **Cost implications**: Competitive evaluation (Pattern 5) and background agents (Pattern 3) multiply token costs. Budget controls (BEH-SF-073 through BEH-SF-080) must account for these patterns.
4. **Worktree overhead**: Each worktree (Pattern 9) duplicates the working directory. Large repositories pay a disk space penalty. The orchestrator should cap concurrent worktrees.
5. **Transcript privacy**: Agent introspection (Pattern 6) reads agent transcripts. In multi-tenant SaaS mode, transcript access must respect tenant isolation boundaries.
6. **Marketplace trust**: Community-contributed agents (Pattern 12) execute with tool access. A review and sandboxing process is required before marketplace agents gain write access.

---

## Recommended Implementation Order

| Priority | Pattern                     | Rationale                                                            |
| -------- | --------------------------- | -------------------------------------------------------------------- |
| P0       | Parameterized Templates (8) | Foundation for all dynamic patterns. Low risk, high leverage.        |
| P0       | Skill Injection (4)         | Directly improves agent quality with minimal architecture change.    |
| P1       | Dynamic Role Factory (1)    | Builds on templates. Enables project-specific agents.                |
| P1       | Worktree Isolation (9)      | Unblocks parallel development. High user-visible impact.             |
| P1       | Performance Tracking (10)   | Data collection must start early for evolution to work later.        |
| P2       | Hierarchical Delegation (2) | Significant orchestrator change but enables complex workflows.       |
| P2       | Background Maintenance (3)  | Requires MCP server for graph writes. Independent of other patterns. |
| P2       | Agent Introspection (6)     | Depends on performance tracking data accumulation.                   |
| P3       | Competitive Evaluation (5)  | High cost. Best introduced after performance baselines exist.        |
| P3       | Agent Composition (11)      | Complex prompt engineering. Needs empirical validation.              |
| P3       | Plugin Agent Packs (7)      | Depends on the marketplace ecosystem existing.                       |
| P4       | Agent Marketplace (12)      | Requires community adoption. Long-term play.                         |
