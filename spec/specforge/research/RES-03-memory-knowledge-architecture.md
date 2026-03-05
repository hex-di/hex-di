---
id: RES-03
kind: research
title: "Research 03 -- Dual-Memory Architecture: Knowledge Graph + Claude Code Memory"
status: Research
date: 2026-02-27
outcome: adr
related_adr: ADR-005
---

# Research 03 -- Dual-Memory Architecture: Knowledge Graph + Claude Code Memory

---

## The Core Insight

SpecForge already has a knowledge graph -- a structured, queryable, versioned store of every requirement, decision, session chunk, and finding. Claude Code already has a memory system -- CLAUDE.md files, `.claude/rules/` directories, and auto-memory that persists across sessions. These are not competing systems. They are complementary memory layers that, when bridged, create something fundamentally new: an AI development platform where the structured knowledge of the project continuously shapes agent behavior, and agent behavior continuously enriches the structured knowledge.

The knowledge graph is _semantic memory_ -- what the project knows. Claude Code memory is _procedural memory_ -- how agents should act. The bridge between them is the generator pipeline: graph queries that produce CLAUDE.md content, and agent observations that feed back into the graph.

---

## Feature 1: Graph-Backed CLAUDE.md Generation

### Problem

CLAUDE.md files are manually written and become stale. Developers write them once and forget to update them as the project evolves. Meanwhile, the knowledge graph has live, current data about architecture decisions, coding conventions, port APIs, and error patterns -- but agents only see this data if it is explicitly composed into their session context.

### Solution

SpecForge generates the project-root CLAUDE.md from a Cypher query against the knowledge graph. Every time a flow run completes and the graph changes, the CLAUDE.md is re-rendered.

```
MATCH (p:Project {id: $projectId})-[:CONTAINS]->(d:Decision)
WHERE d.status = 'accepted'
MATCH (p)-[:CONTAINS]->(sf:SpecFile)-[:CONTAINS]->(r:Requirement)
WHERE r.priority = 'critical'
RETURN d, r
```

The generator pipeline:

1. **Query** -- extract accepted ADRs, critical requirements, active invariants, port API signatures
2. **Template** -- render into CLAUDE.md sections (Architecture Decisions, Coding Standards, Error Handling Patterns, Port API Reference)
3. **Hash** -- compute SHA-256 of generated content
4. **Write** -- atomically update `./CLAUDE.md` only if the hash differs from the current file
5. **Record** -- store a `RenderedArtifact` node in the graph linking the CLAUDE.md to its source nodes

### Why This Matters

Every `claude -p` invocation loads CLAUDE.md at startup. By generating it from the graph, every agent session -- whether spawned by SpecForge or by a developer running Claude Code manually -- inherits current project knowledge without explicit session composition. The CLAUDE.md becomes a low-bandwidth broadcast channel from the graph to all agents.

### What Neither System Has Alone

- The graph alone cannot influence agent behavior outside SpecForge-orchestrated sessions.
- CLAUDE.md alone cannot stay current with a living, evolving specification.
- Together: a self-updating instruction set that reaches every agent, every time.

---

## Feature 2: Modular Rules from Spec Behaviors

### Problem

SpecForge defines ~160 behaviors (BEH-SF-001 through BEH-SF-160) across 22 behavior files. When a dev agent generates code, it must respect these behaviors, but including all 160 in the system prompt would blow the context budget. Path-specific `.claude/rules/` files solve this -- but only if they are maintained.

### Solution

Generate `.claude/rules/` files from behavior nodes in the graph, scoped by file path using YAML frontmatter.

```
.claude/rules/
  specforge-graph.md          # Rules from BEH-SF-001--008 for graph code
  specforge-sessions.md       # Rules from BEH-SF-009--016 for session code
  specforge-agents.md         # Rules from BEH-SF-017--032 for agent code
  specforge-flows.md          # Rules from BEH-SF-049--072 for flow code
  specforge-adapter.md        # Rules from BEH-SF-151--160 for adapter code
```

Each file has a `paths:` frontmatter pointing to the source directories where those behaviors are implemented:

```yaml
---
paths:
  - "src/graph/**/*.ts"
  - "src/ports/graph-query-port.ts"
---
# Graph Operation Rules (from BEH-SF-001--008)

- All graph mutations MUST go through GraphStorePort, never direct Cypher
- SessionChunk nodes are immutable once created (INV-SF-11)
- Rendering pipeline MUST produce atomic file writes (INV-SF-6)
- Content hashes are SHA-256 of the raw content bytes
```

### The Regeneration Trigger

When a behavior node changes in the graph (updated text, new behavior added, behavior removed), the rule file is regenerated. The generator runs as a post-flow hook: after any flow that modifies behavior nodes, regenerate affected rule files.

### Why This Matters

Claude Code loads rules automatically when the agent reads or edits files matching the `paths:` patterns. A dev agent working on `src/graph/store.ts` automatically receives the graph operation rules without SpecForge spending any session composition tokens. The rules are always current because they are rendered from the graph, not hand-written.

---

## Feature 3: Cross-Project Knowledge Transfer via Auto-Memory

### Problem

SpecForge manages multiple projects. Patterns learned in one project -- "this team prefers sealed discriminated unions for errors," "this codebase uses barrel exports" -- are trapped in that project's auto-memory directory. There is no mechanism for an insight from Project A to benefit agents working on Project B.

### Solution

SpecForge introduces a **Knowledge Transfer Pipeline** that operates on auto-memory files across projects owned by the same organization.

1. **Harvest** -- after each flow run, read the auto-memory files (`~/.claude/projects/<project>/memory/*.md`) for the active project
2. **Extract** -- use a lightweight agent (haiku model, read-only tools) to extract generalizable patterns from the memory files. Filter out project-specific details (file paths, variable names) and retain abstract patterns (error handling conventions, testing strategies, architectural preferences)
3. **Embed** -- compute embeddings for each extracted pattern
4. **Store** -- persist as `KnowledgePattern` nodes in the graph, linked to the source project and tagged with domain categories
5. **Distribute** -- when composing a session for Project B, query `KnowledgePattern` nodes from Project A (same org), rank by relevance, and inject as context

### The Transfer Boundary

Not all knowledge transfers. The pipeline filters through three gates:

- **Generalizability gate** -- patterns mentioning specific file paths, class names, or project-specific APIs are excluded
- **Relevance gate** -- only patterns tagged with domains matching the target project's tech stack are included
- **Recency gate** -- patterns older than a configurable TTL (default 90 days) are deprioritized

### Why This Matters

Auto-memory is personal and project-scoped by design. SpecForge lifts it into an organizational knowledge base. An agent that struggled with a complex TypeScript pattern in Project A leaves behind a memory note; agents in Project B benefit from that insight without anyone manually copying information.

---

## Feature 4: Evolving Agent Expertise through Memory Accumulation

### Problem

Every Claude Code session starts with the same capabilities. An agent that has run 50 spec-authoring sessions for a project performs identically to one running its first session, because auto-memory is limited to 200 lines loaded at startup and is not curated for relevance.

### Solution

SpecForge curates auto-memory as a first-class concern. After each flow run, a **Memory Curation Stage** runs:

1. **Read** current `MEMORY.md` for the project
2. **Merge** new observations from the completed flow run (extracted from session chunks)
3. **Rank** entries by utility -- how often has this memory entry been relevant to session composition queries?
4. **Prune** entries that have become obsolete (the graph node they reference was deleted or superseded)
5. **Write** the updated `MEMORY.md`, keeping it under 200 lines (the auto-memory load limit)

The key insight: SpecForge tracks which memory entries correlate with successful flow runs (convergence achieved in fewer iterations). Entries that appear in sessions with fast convergence are ranked higher. Entries from sessions with many iterations or failures are ranked lower.

### The Expertise Gradient

Over time, the curated MEMORY.md for a project shifts from generic notes to highly targeted, project-specific expertise:

- **Week 1:** "This project uses pnpm workspaces. Run `pnpm lint` before committing."
- **Month 1:** "Guard policies use 10 policy kinds. The `hasRelationship` policy requires a `RelationshipResolver` port adapter."
- **Month 3:** "When modifying flow execution, always check convergence criteria evaluation order. BEH-SF-057 requires phases to loop until criteria are met, not just once. Past sessions that forgot this required 3+ extra iterations."

### Why This Matters

The agent literally gets better at the project over time. Not through training or fine-tuning, but through curated procedural memory that encodes what works and what does not.

---

## Feature 5: Path-Specific Rules for Domain Agents

### Problem

SpecForge defines multiple agent roles (discovery, spec-author, reviewer, dev-agent, etc.). Each role works with different parts of the codebase. A frontend dev-agent editing React components needs different rules than a backend dev-agent writing API handlers. Today, all agents receive the same CLAUDE.md.

### Solution

Combine agent role definitions with `.claude/rules/` path scoping to create role-appropriate rule sets:

```
.claude/rules/
  frontend/
    react-components.md       # paths: ["src/components/**/*.tsx"]
    state-management.md       # paths: ["src/store/**/*.ts"]
    css-conventions.md        # paths: ["src/**/*.css", "src/**/*.module.css"]
  backend/
    api-handlers.md           # paths: ["src/api/**/*.ts"]
    database-access.md        # paths: ["src/db/**/*.ts", "src/ports/**/*.ts"]
    error-handling.md         # paths: ["src/errors/**/*.ts", "src/**/*.ts"]
  testing/
    unit-test-patterns.md     # paths: ["tests/unit/**/*.test.ts"]
    integration-patterns.md   # paths: ["tests/integration/**/*.test.ts"]
```

SpecForge generates these from graph queries that combine:

- **Agent role** -> which directories does this role typically touch? (derived from `AgentSession` history: which files did past sessions of this role read/write?)
- **Behavior scope** -> which behaviors govern code in those directories?
- **Finding patterns** -> what recurring issues has the reviewer found in those directories?

### The Feedback Loop

When a reviewer agent produces a finding ("Missing null check in API handler at src/api/users.ts"), the finding is stored in the graph. The next rule regeneration adds to `backend/api-handlers.md`:

```markdown
- All API handler parameters MUST be validated before use (reviewer finding F-0042, 2026-02-15)
```

The dev-agent working on API handlers in the next flow run automatically receives this rule. The reviewer's knowledge becomes the dev-agent's instruction.

---

## Feature 6: Memory as Specification Artifact

### Problem

CLAUDE.md files and `.claude/rules/` are typically treated as developer tooling configuration -- not as specification artifacts. They are unversioned, untraced, and invisible to the spec process.

### Solution

SpecForge treats generated memory files as first-class spec artifacts:

1. **Graph nodes** -- each generated CLAUDE.md and rules file has a corresponding `RenderedArtifact` node in the graph
2. **Traceability** -- `RenderedArtifact` nodes link via `DERIVED_FROM` relationships to the behavior, decision, and finding nodes they were generated from
3. **Versioning** -- each regeneration creates a new version (content hash). The graph stores the full version history
4. **Change detection** -- when a memory file changes, the diff is available in the web dashboard. Reviewers can see exactly which graph changes caused which memory file changes
5. **Audit trail** -- for GxP compliance (the optional plugin), memory file changes are part of the audit trail with electronic signatures

### The Traceability Chain

```
ADR-005 (Graph-First Architecture)
  -> BEH-SF-001 (Graph Node Operations)
    -> .claude/rules/specforge-graph.md (generated rule)
      -> AgentSession (dev-agent that received this rule)
        -> SessionChunk (what the agent did with this rule)
          -> Finding (any issues found)
```

Every instruction given to an agent is traceable back to the specification that motivated it, and forward to the work the agent produced under that instruction.

---

## Feature 7: Collective Memory from Multi-Agent Flows

### Problem

SpecForge runs multi-agent flows where discovery, spec-authoring, review, and development agents all work on the same project. Each agent accumulates its own observations, but these observations are siloed in individual session transcripts.

### Solution

After a multi-agent flow run completes, a **Collective Memory Synthesis** stage runs:

1. **Collect** session chunks from all agents in the flow run
2. **Cross-reference** observations -- did the reviewer contradict the spec-author? Did the dev-agent discover an implementation constraint the spec-author missed?
3. **Synthesize** consensus observations into shared memory entries
4. **Annotate** with confidence levels based on agent agreement (3 agents agree = high confidence, 1 agent disagrees = flagged for human review)
5. **Write** to project-level auto-memory, replacing lower-confidence entries with higher-confidence consensus

### The Collective Intelligence Effect

A single agent's memory is limited by its context window and role scope. But when a discovery agent notes "the codebase uses Effect-TS for error handling," a spec-author notes "errors follow tagged union patterns," and a reviewer notes "all factory errors must be Object.freeze()d" -- the collective memory synthesizes these into a rich, multi-perspective understanding that no single agent had.

This synthesized memory becomes part of the next session's MEMORY.md, giving future agents the collective intelligence of all prior agents.

---

## Feature 8: Memory-Driven Convergence Acceleration

### Problem

SpecForge's convergence loop (phases iterate until criteria are met) can be expensive. Early iterations often fail on the same issues -- agents make mistakes that were already identified in prior iterations of the same phase.

### Solution

Use memory entries to short-circuit known failure modes:

1. **Track convergence failures** -- when a phase iteration fails convergence criteria, record the failure reason as a `ConvergenceFailure` node in the graph
2. **Extract failure patterns** -- after 2+ failures with similar reasons, extract a prevention rule
3. **Inject as rules** -- add the prevention rule to `.claude/rules/` or the session's composed context
4. **Measure** -- track whether iterations with the injected rule converge faster

Example: if the reviewer consistently rejects spec-author output for "missing traceability links," generate a rule:

```yaml
---
paths:
  - "spec/**/*.md"
---
# Convergence Acceleration Rules

- Every requirement MUST include a traceability link to its parent spec file
- Every behavior MUST reference its governing invariant
- Omitting traceability links has caused convergence failures in 4 prior iterations
```

### The Acceleration Curve

First flow run: 5 iterations to converge. Second flow run with memory: 3 iterations. Fifth flow run: 2 iterations. The project's convergence speed improves as the memory accumulates prevention rules for common failure modes.

---

## Feature 9: Memory Pruning and Graph-Synchronized Curation

### Problem

Auto-memory accumulates indefinitely. Entries about deleted files, superseded decisions, or resolved issues persist and pollute the agent's instruction set. Stale memory is worse than no memory -- it actively misleads agents.

### Solution

SpecForge runs a **Memory Pruning Pipeline** triggered by graph state changes:

1. **Watch** -- monitor graph events (node deletions, status changes, relationship removals)
2. **Scan** -- for each graph change, scan memory files for entries that reference the changed node
3. **Evaluate** -- determine if the memory entry is now stale:
   - Referenced ADR was superseded -> entry is stale
   - Referenced requirement was deleted -> entry is stale
   - Referenced finding was resolved -> entry demoted (still useful as historical context, but deprioritized)
   - Referenced file path no longer exists -> entry is stale
4. **Prune** -- remove stale entries, demote resolved entries, compact the MEMORY.md
5. **Record** -- log the pruning action in the graph for audit

### Staleness Detection via Content Hashes

Each memory entry is tagged with the content hash of the graph node it was derived from. When the graph node's hash changes (content updated), the memory entry is flagged for review. When the graph node is deleted, the memory entry is flagged for removal. This is deterministic -- no LLM inference required for staleness detection.

---

## Feature 10: Organization-Level Managed Memory

### Problem

Organizations have coding standards, security policies, and architectural guidelines that should apply to every project and every agent. Today, these must be manually maintained in each project's CLAUDE.md or communicated through team meetings and documentation.

### Solution

SpecForge manages the organization-level CLAUDE.md (`/Library/Application Support/ClaudeCode/CLAUDE.md` on macOS) as a rendered artifact from an organization-level graph:

1. **Organization graph** -- a separate Neo4j database (or namespace) containing org-wide standards
2. **Standard nodes** -- `CodingStandard`, `SecurityPolicy`, `ArchitecturalGuideline` node types
3. **Rendering** -- generate the managed CLAUDE.md from these nodes
4. **Distribution** -- deploy to all developer machines via MDM, dotfiles sync, or a SpecForge CLI command (`specforge sync-org-memory`)
5. **Override detection** -- if a project's CLAUDE.md contradicts an org-level standard, flag it in the dashboard

### The Enforcement Mechanism

Claude Code loads the managed CLAUDE.md before any project-level files. Organization standards are always present. Project-level files can add specifics but cannot override org-level rules (Claude Code's precedence model gives more-specific files higher priority, but the org-level file is still loaded and visible in the context).

To enforce non-overridable standards, the managed CLAUDE.md uses explicit precedence markers:

```markdown
# Organization Standards (MANDATORY - do not override in project CLAUDE.md)

- Never commit secrets or credentials to source control
- All public APIs must have OpenAPI documentation
- Error types must use frozen discriminated unions with `_tag` fields
```

---

## Architecture Summary

```
                    Neo4j Knowledge Graph
                    (Semantic Memory)
                           |
                    Generator Pipeline
                    (Query -> Template -> Hash -> Write)
                           |
              +------------+------------+
              |            |            |
         CLAUDE.md   .claude/rules/  MEMORY.md
         (project)   (path-scoped)   (auto-memory)
              |            |            |
              +------------+------------+
                           |
                    Claude Code Agent
                    (Procedural Memory)
                           |
                    Session Execution
                           |
                    Session Chunks + Findings
                           |
                    Materialization Pipeline
                    (Segment -> Embed -> Store)
                           |
                    Neo4j Knowledge Graph
                    (Feedback Loop Complete)
```

The dual-memory architecture is a closed loop. The graph generates memory files, agents consume those files and produce work, the work is materialized back into the graph, and the graph generates updated memory files. Each cycle makes the next cycle more informed.

---

## Implementation Priority

| Priority | Feature                                | Effort | Impact                                         |
| -------- | -------------------------------------- | ------ | ---------------------------------------------- |
| 1        | Graph-backed CLAUDE.md generation      | Medium | High -- every agent benefits immediately       |
| 2        | Modular rules from spec behaviors      | Medium | High -- path-scoped rules reduce context waste |
| 3        | Memory pruning and curation            | Low    | High -- prevents stale memory accumulation     |
| 4        | Memory-driven convergence acceleration | Medium | High -- directly reduces cost per flow run     |
| 5        | Memory as specification artifact       | Low    | Medium -- traceability for compliance          |
| 6        | Evolving agent expertise               | Medium | Medium -- compounds over time                  |
| 7        | Path-specific rules for domain agents  | Medium | Medium -- requires session history analysis    |
| 8        | Collective memory synthesis            | High   | Medium -- multi-agent coordination             |
| 9        | Cross-project knowledge transfer       | High   | Medium -- organizational value                 |
| 10       | Organization-level managed memory      | Low    | Low -- depends on org adoption                 |

---

## Open Questions

1. **Conflict resolution** -- when the generated CLAUDE.md contradicts a developer's manual CLAUDE.local.md, which wins? Claude Code's precedence says local wins, but should SpecForge warn?
2. **Memory budget** -- auto-memory loads only 200 lines. Is that enough for a mature project with accumulated expertise? Should SpecForge use topic files (`~/.claude/projects/<project>/memory/topic.md`) to expand capacity?
3. **Regeneration frequency** -- regenerating CLAUDE.md after every flow run may be too aggressive. Should there be a debounce period, or should regeneration only occur when graph changes affect the template inputs?
4. **Security** -- generated rules may contain sensitive architectural details. Should there be a classification system that prevents certain graph nodes from being rendered into memory files?
5. **Multi-tenant isolation** -- in SaaS mode, organization-level memory must be strictly isolated. How does the rendering pipeline ensure one org's standards never leak into another's generated files?
