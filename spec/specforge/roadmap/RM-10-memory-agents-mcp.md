---
id: RM-10
title: "Phase 10: Memory + Advanced Agents + MCP"
kind: roadmap
status: Planned
dependencies: []
---

## Phase 10: Memory + Advanced Agents + MCP

**Goal:** Dual-memory architecture, dynamic role factory, MCP server composition, and advanced agent patterns including hierarchical delegation, background maintenance, worktree isolation, and skill injection.
**Source:** [research/RES-09-subagent-architecture-patterns.md](../research/RES-09-subagent-architecture-patterns.md)

### Deliverables

| #          | Deliverable                    | Package                 | Behaviors                | Status  |
| ---------- | ------------------------------ | ----------------------- | ------------------------ | ------- |
| WI-PH-10-1 | Memory generation              | `@specforge/server`     | BEH-SF-177–184           | Planned |
| WI-PH-10-2 | Dynamic agents                 | `@specforge/server`     | BEH-SF-185–192           | Planned |
| WI-PH-10-3 | MCP composition                | `@specforge/server`     | BEH-SF-193–200           | Planned |
| WI-PH-10-4 | Advanced agent patterns        | `@specforge/server`     | BEH-SF-408–423           | Planned |
| WI-PH-10-5 | MCP proxy & session resilience | `@specforge/connection` | BEH-SF-520–527 (ADR-023) | Planned |

### Advanced Agent Patterns Detail (BEH-SF-408–423)

| ID         | Behavior                                                                                                                   | Source                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| BEH-SF-408 | Hierarchical Delegation Chain Orchestration — orchestrator-managed multi-level agent delegation                            | research/09 Pattern 2  |
| BEH-SF-409 | Lead Agent Decomposition — lead agent produces structured subtask decomposition for worker dispatch                        | research/09 Pattern 2  |
| BEH-SF-410 | Worker Agent Spawn and Coordination — parallel worker agents with scoped tools and synthesis trigger                       | research/09 Pattern 2  |
| BEH-SF-411 | Background Knowledge Maintenance Agent — continuous haiku-powered indexer updating graph between flows                     | research/09 Pattern 3  |
| BEH-SF-412 | Agent Skill Injection Pipeline — graph-derived skills injected into agent context at spawn time                            | research/09 Pattern 4  |
| BEH-SF-413 | Skill Generation from Graph — auto-generate domain skills from codebase-context graph nodes                                | research/09 Pattern 4  |
| BEH-SF-414 | Competitive Agent Evaluation — parallel candidate agents scored by evaluator for high-stakes tasks                         | research/09 Pattern 5  |
| BEH-SF-415 | Agent Introspection and Audit — background auditor reads transcripts, identifies failure patterns                          | research/09 Pattern 6  |
| BEH-SF-416 | Agent Performance Tracking — per-session metrics (tokens, quality, errors) stored as graph nodes                           | research/09 Pattern 10 |
| BEH-SF-417 | Agent Evolution Recommendation Engine — performance trend analysis proposes template/config changes                        | research/09 Pattern 10 |
| BEH-SF-418 | Worktree-Isolated Agent Spawn — each dev-agent gets an isolated git worktree for parallel implementation                   | research/09 Pattern 9  |
| BEH-SF-419 | Worktree Merge Protocol — sequential merge with dependency ordering and test verification                                  | research/09 Pattern 9  |
| BEH-SF-420 | Conflict Resolver Agent — specialized agent for semantically-aware merge conflict resolution                               | research/09 Pattern 9  |
| BEH-SF-421 | Agent Composition Rules — multi-role prompt/tool blending for cross-domain tasks                                           | research/09 Pattern 11 |
| BEH-SF-422 | Parameterized Agent Templates — typed parameter slots resolved from graph/config at spawn time                             | research/09 Pattern 8  |
| BEH-SF-423 | Template Resolution Pipeline — multi-source parameter resolution (flow config > graph > user defaults > template defaults) | research/09 Pattern 8  |

### Exit Criteria

- [ ] EC-PH-10-1: CLAUDE.md generated from knowledge graph with content hash caching
- [ ] EC-PH-10-2: Dynamic roles activate based on project graph characteristics
- [ ] EC-PH-10-3: MCP servers assigned per role with spawn-time health checks
- [ ] EC-PH-10-4: Finding-to-issue pipeline creates GitHub issues for unresolved critical findings
- [ ] EC-PH-10-5: Hierarchical delegation works: lead decomposes, workers execute in parallel, lead synthesizes
- [ ] EC-PH-10-6: Background indexer runs between flows and keeps graph nodes current
- [ ] EC-PH-10-7: Worktree isolation enables 5 parallel dev-agents with zero file conflicts
- [ ] EC-PH-10-8: Skill injection reduces cold-start iterations by 40%+ compared to unskilled agents

### Risk

- MCP server stability as external dependency; health checks must handle flaky servers gracefully
