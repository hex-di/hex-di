---
name: Specforge Domain
description: "SpecForge product domain knowledge — core concepts, agent roles, flows, architecture, and invariants. Use when working on any spec/specforge/ file, reasoning about SpecForge behaviors, discussing SpecForge architecture, or making cross-domain connections between SpecForge subsystems."
---

# Specforge Domain

This skill teaches Claude the SpecForge product domain — the "what" and "why" of the system. SpecForge replaces disconnected spec files with a living Neo4j knowledge graph and autonomous agent sessions that continuously verify code against intent.

## When to use this skill

- Working on any file under `spec/specforge/`
- Reasoning about SpecForge behaviors (BEH-SF-001 through BEH-SF-208)
- Discussing SpecForge architecture, agent roles, or flows
- Making cross-domain connections between SpecForge subsystems
- Writing or reviewing SpecForge ADRs, invariants, or risk assessments
- Answering questions about how SpecForge works

## Core Mission

Replace disconnected spec files with a living Neo4j knowledge graph and autonomous agent sessions that continuously verify code against intent.

**Package:** `@hex-di/specforge`

## The 6 Principles

1. **Graph-canonical** — Neo4j is the source of truth; filesystem documents are derived renderings
2. **Convergence-driven** — Phases loop until criteria are met, not just once
3. **Persistent sessions** — Agent conversations accumulate context across iterations within a phase
4. **Compositional knowledge** — Session chunks are materialized, embedded, and composed into future sessions
5. **Mode-agnostic** — All features work in all deployment modes; modes select adapters, not capabilities
6. **Declarative flows** — Flows are data structures, not imperative code

## Core Concepts Glossary

| Concept               | Definition                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| **Flow**              | Declarative data structure defining phases, agents, and convergence criteria for a workflow       |
| **Flow Run**          | Single execution of a flow with its own blackboard and session scope                              |
| **Phase**             | Major stage within a flow; runs until convergence or max iterations                               |
| **Stage**             | Unit within a phase specifying which agent roles execute (may run concurrently)                   |
| **Convergence**       | Condition for phase termination based on metrics (e.g., zero critical findings, 80% coverage)     |
| **Blackboard**        | Append-only event log with 3 layers (documents, findings, messages) for inter-agent communication |
| **Session Chunk**     | Immutable segment of agent conversation materialized in Neo4j                                     |
| **Composed Context**  | New session bootstrapped from selected prior session chunks                                       |
| **Agent Role**        | Named role with specific model, tools, and responsibilities (8 static roles + dynamic)            |
| **Trust Tier**        | Agent permission level: restricted → standard → elevated → autonomous                             |
| **Budget Zone**       | Progressive degradation level: Green → Yellow → Orange → Red                                      |
| **Hook Pipeline**     | Programmable event bus intercepting every tool invocation (PreToolUse, PostToolUse, Stop)         |
| **MCP Composition**   | Dynamic assembly of MCP server configurations per agent role                                      |
| **Memory Generation** | Pipeline producing CLAUDE.md and .claude/rules/ from graph knowledge                              |
| **GxP Mode**          | Optional compliance mode with audit trails, signatures, data retention                            |
| **Solo Mode**         | Single-developer deployment (local server + local Neo4j)                                          |
| **SaaS Mode**         | Cloud deployment (local server + cloud-backed adapters)                                           |

## The 8 Static Agent Roles

All agent sessions use the Claude Code subprocess model (opaque process, ADR-004).

### 1. Discovery Agent (`discovery-agent`) — BEH-SF-017

- **Model:** Opus
- **Tools:** Web search, file access, code search, blackboard read/write
- **Responsibility:** Interactive requirements gathering; produces requirements brief
- **Key rule:** Phase does NOT complete until user approves brief (conversational mode)

### 2. Spec Author (`spec-author`) — BEH-SF-018

- **Model:** Opus
- **Tools:** File access, code search, blackboard read/write
- **Responsibility:** Consolidated role for full spec lifecycle — scaffolding, authoring, revising, finalizing, reverse-generating
- **Key rule:** Persistent session retains context across scaffold → author → revise → finalize stages

### 3. Reviewer (`reviewer`) — BEH-SF-019

- **Model:** Opus
- **Tools:** File access, code search, graph query, blackboard read/write
- **Responsibility:** Consolidated role for architectural review and traceability checking
- **Output:** Findings with severity (critical/major/minor/observation) and requirement ID references

### 4. Feedback Synthesizer (`feedback-synthesizer`) — BEH-SF-020

- **Model:** Sonnet (simple aggregation)
- **Tools:** Blackboard read/write
- **Responsibility:** Aggregates findings into prioritized action items; deduplicates overlapping findings
- **Key rule:** Human feedback ranked above all agent findings

### 5. Task Decomposer (`task-decomposer`) — BEH-SF-021

- **Model:** Sonnet
- **Tools:** File access, code search, blackboard read/write
- **Responsibility:** Breaks finalized spec into ordered, dependency-aware task groups
- **Key rule:** Every task MUST trace to at least one requirement ID; no task can depend on later tasks

### 6. Dev Agent (`dev-agent`) — BEH-SF-022

- **Model:** Opus
- **Tools:** File write, code search, test runner, scoped bash
- **Responsibility:** Consolidated implementation role — code, tests, verification, iterative repair
- **Key rule:** Persistent session enables iterative repair; produces verification report mapping requirements to implementation status

### 7. Codebase Analyzer (`codebase-analyzer`) — BEH-SF-023

- **Model:** Sonnet
- **Tools:** File access, code search, blackboard read/write
- **Responsibility:** Consolidated reverse engineering — topology, file classification, semantic extraction, dependency mapping
- **Output:** Consolidated codebase context document (persisted as SpecFile node in graph)

### 8. Coverage Agent (`coverage-agent`) — BEH-SF-024

- **Model:** Sonnet
- **Tools:** File access, code search, graph query, blackboard read/write
- **Responsibility:** Consolidated coverage tracking and validation against thresholds
- **Output:** Coverage report + gap findings

## The 5 Predefined Flows

### 1. Spec Writing Flow — BEH-SF-049

The primary flow with 5 phases:

| Phase        | Mode                   | Agents                                      | Convergence                                     |
| ------------ | ---------------------- | ------------------------------------------- | ----------------------------------------------- |
| Discovery    | Conversational         | discovery-agent                             | User approves brief                             |
| Spec Forge   | Automated, looped      | spec-author, reviewer, feedback-synthesizer | Zero critical/major findings AND coverage ≥ 80% |
| Task Master  | Automated, single pass | task-decomposer                             | All tasks traced                                |
| Dev Forge    | Automated, looped      | dev-agent                                   | All tests pass                                  |
| Verification | Automated, single pass | coverage-agent                              | Coverage report produced                        |

### 2. Reverse Engineering Flow — BEH-SF-050

3 phases: Analysis → Spec Generation → Validation

- Analysis: codebase-analyzer produces topology, classification, semantics, dependencies
- Spec Generation: spec-author reads codebase context, produces reverse-engineered specs
- Validation: coverage-agent and reviewer run concurrently

### 3. Code Review Flow — BEH-SF-051

3 phases: Discovery → Review → Synthesis

- Accepts `--diff` parameter to scope changes
- Produces final review summary with findings

### 4. Risk Assessment Flow — BEH-SF-052

3 phases: Discovery → Analysis → Assessment

- Accepts `--scope` parameter
- Produces risk report with severity matrix and mitigation suggestions

### 5. Onboarding Flow — BEH-SF-053

3 phases: Analysis → Documentation → Validation

- Produces getting-started guide, architecture overview, module walkthroughs
- Validates all modules and entry points are covered

## Port Architecture

SpecForge has 30 ports: 25 universal + 5 mode-switched.

### Universal Ports (25)

Same adapter in all modes:

| #   | Port               | Purpose                                |
| --- | ------------------ | -------------------------------------- |
| 1   | OrchestratorPort   | Flow entry point                       |
| 2   | FlowEnginePort     | Phase scheduling                       |
| 3   | SchedulerPort      | Phase ordering, iteration counting     |
| 4   | ConvergencePort    | Convergence criteria evaluation        |
| 5   | SessionManagerPort | Agent session lifecycle                |
| 6   | AgentPort          | Claude Code CLI communication          |
| 7   | CompositionPort    | Session context assembly               |
| 8   | BlackboardPort     | Append-only event log                  |
| 9   | GraphQueryPort     | Read-only graph traversals             |
| 10  | GraphMutationPort  | Write operations on graph              |
| 11  | NLQPort            | Natural language to Cypher translation |
| 12  | AnalyticsPort      | Flow metrics, quality trends           |
| 13  | EventBusPort       | Internal event pub/sub                 |
| 14  | LoggerPort         | Structured logging                     |
| 15  | ConfigPort         | Configuration loading                  |
| 16  | CachePort          | In-memory caching                      |
| 17  | FileSystemPort     | File read/write operations             |
| 18  | TemplatePort       | Flow template loading                  |
| 19  | ValidationPort     | Input validation                       |
| 20  | SerializerPort     | Serialization/deserialization          |
| 21  | MetricsPort        | Runtime metrics collection             |
| 22  | HealthCheckPort    | Liveness and readiness probes          |
| 23  | LLMProviderPort    | CLI-based agent tools                  |
| 24  | ImportAdapterPort  | Pluggable import formats               |
| 25  | ExportAdapterPort  | Pluggable export formats               |

### Mode-Switched Ports (5)

Adapter selected at startup via `SPECFORGE_MODE`:

| Port            | Solo Adapter                         | SaaS Adapter               |
| --------------- | ------------------------------------ | -------------------------- |
| GraphStorePort  | LocalNeo4j (bolt://localhost:7687)   | CloudNeo4j (AuraDB)        |
| AuthPort        | NoOpAuth                             | CloudOAuth (GitHub/Google) |
| BillingPort     | NoOpBilling                          | StripeBilling (Stripe API) |
| MarketplacePort | LocalFiles (~/.specforge/templates/) | CloudMarketplaceAdapter    |
| TelemetryPort   | NoOpTelemetry                        | CloudTelemetryAdapter      |

## The 17 Invariants

Runtime guarantees that must never be violated:

| ID        | Title                                         | Key Rule                                              |
| --------- | --------------------------------------------- | ----------------------------------------------------- |
| INV-SF-1  | Blackboard Append-Only History                | Events never modified or deleted during flow run      |
| INV-SF-2  | Agent Session Isolation                       | Agents communicate only through blackboard            |
| INV-SF-3  | Convergence Bound                             | Every phase has a finite maxIterations                |
| INV-SF-4  | Dependency-Respecting Execution               | Stages respect dependency ordering                    |
| INV-SF-5  | Tool Isolation                                | Agents only access tools declared in their role       |
| INV-SF-6  | Atomic Filesystem Flush                       | Write-to-temp-then-rename for all file operations     |
| INV-SF-7  | Graph Data Persistence                        | Every graph mutation is durable before acknowledgment |
| INV-SF-8  | Rendering Fidelity                            | Filesystem rendering matches graph canonical data     |
| INV-SF-9  | Flow Determinism                              | Same input + same graph state = same flow structure   |
| INV-SF-10 | Graph-Blackboard Sync Consistency             | Blackboard events sync to graph within 50ms           |
| INV-SF-11 | Session Chunk Immutability                    | Materialized chunks are never modified                |
| INV-SF-12 | Hook Pipeline Ordering                        | Hooks execute in registration order                   |
| INV-SF-13 | Structured Output Schema Compliance           | Agent output validated against JSON schema            |
| INV-SF-14 | Memory Artifact Traceability                  | Every CLAUDE.md section traces to source              |
| INV-SF-15 | Budget Zone Monotonicity                      | Green→Yellow→Orange→Red, no reversals                 |
| INV-SF-16 | Permission Escalation Requires Explicit Grant | Every trust tier change recorded as immutable node    |
| INV-SF-17 | MCP Server Health Gate                        | No session spawns with failed health check            |

## Architecture Decision Records (15)

| ADR     | Title                                              | Status                |
| ------- | -------------------------------------------------- | --------------------- |
| ADR-001 | hex-di as DI Foundation                            | Accepted              |
| ADR-002 | Tauri over Electron                                | Superseded by ADR-010 |
| ADR-003 | Blackboard Communication                           | Accepted              |
| ADR-004 | Claude Code CLI as Opaque Agent Subprocess         | Accepted              |
| ADR-005 | Graph-First Architecture                           | Accepted              |
| ADR-006 | Persistent Agent Sessions                          | Accepted              |
| ADR-007 | Flow-Based Orchestration                           | Accepted              |
| ADR-008 | GxP as Optional Mode                               | Accepted              |
| ADR-009 | Compositional Sessions                             | Accepted              |
| ADR-010 | Web Dashboard + VS Code Extension over Desktop App | Accepted              |
| ADR-011 | Hooks as Event Bus                                 | Accepted              |
| ADR-012 | JSON-First Structured Output                       | Accepted              |
| ADR-013 | Dual-Memory Architecture                           | Accepted              |
| ADR-014 | Role-Adaptive Model Routing                        | Accepted              |
| ADR-015 | Agent Teams Hybrid Integration                     | Accepted              |

## Blackboard Architecture (3 Layers)

The blackboard (BEH-SF-033 through BEH-SF-040) is the central inter-agent communication mechanism:

### Layer 1: Document Layer (BEH-SF-035)

- Versioned spec artifacts
- Each write creates new version; agents see latest
- History preserved for diff/rollback

### Layer 2: Findings Layer (BEH-SF-036)

- Review issues with severity (critical/major/minor/observation)
- Status: open/resolved/wont-fix/deferred
- References requirement IDs and spec files

### Layer 3: Messages Layer (BEH-SF-037)

- ClarificationRequest, ClarificationResponse, Broadcast messages
- Human feedback messages ranked highest priority

### Key Properties

- Append-only event log (INV-SF-1)
- Write serialization prevents race conditions
- Sync-on-write triggers immediate graph updates
- Delta review optimization — later iterations receive only changes since last read

## Token Budgeting & Cost Optimization

### Three Budget Levels (BEH-SF-073 through BEH-SF-080)

1. **Flow-Level** — Total tokens for entire flow run
2. **Phase-Level** — Per-phase allocation
3. **Agent-Level** — Per-session tracking (input + output tokens)

### Budget Zones (BEH-SF-080)

| Zone   | Budget Remaining | Behavior                                                  |
| ------ | ---------------- | --------------------------------------------------------- |
| Green  | >60%             | Normal operation                                          |
| Yellow | 30–60%           | Non-critical agents downgraded to Haiku                   |
| Orange | 10–30%           | All agents to Sonnet, minimal iterations                  |
| Red    | <10%             | Essential stages only, "budget critical" prompt injection |

Transitions are **monotonic** (INV-SF-15): Green → Yellow → Orange → Red, no reversals.

### Model Routing (ADR-014, BEH-SF-170)

- Discovery agents → Opus (complex reasoning)
- Feedback synthesizers → Haiku (simple aggregation)
- Dev-agent repair cycles → Sonnet (cost efficiency)
- Convergence-responsive escalation: if critical findings stall, Sonnet → Opus
- Expected savings: ~40% cost reduction per flow run

## Hook Pipeline System (BEH-SF-161 through BEH-SF-168)

Three hook categories:

### PreToolUse Hooks (BEH-SF-161)

- Synchronous, execute before tool invocation
- Exit codes: 0 = allow, 1 = error (logged, tool proceeds), 2 = block (tool rejected)
- Used for compliance gates (BEH-SF-162)

### PostToolUse Hooks (BEH-SF-163)

- Asynchronous, FIFO queue ordering
- Used for graph sync, audit recording, monitoring
- Graph sync hooks: upsert file nodes, compute SHA-256, extract requirement IDs

### Stop Hooks (BEH-SF-168)

- Execute when agent session ends
- Used for session recording and cleanup

### Ordering Guarantee (INV-SF-12)

Hooks execute in registration order. PreToolUse completes before tool runs.

## Permission Governance (BEH-SF-201 through BEH-SF-208)

### Four Trust Tiers (BEH-SF-202)

| Tier       | Level                    | Access                               |
| ---------- | ------------------------ | ------------------------------------ |
| Restricted | Initial                  | Read-only, no external tools         |
| Standard   | After N clean iterations | Read/write within assigned scope     |
| Elevated   | Further clean iterations | Cross-scope, external tool usage     |
| Autonomous | Highest                  | Self-directed with minimal oversight |

- New agents start at `restricted`
- N consecutive clean iterations (default 3) → promotion
- Any anomaly → demotion by one tier
- Every change recorded as immutable PermissionDecision node (INV-SF-16)

### GxP Permission Overlay (BEH-SF-204)

When GxP mode active:

- Block destructive git operations (push --force, reset --hard, branch -D, rebase)
- Require approval gates before all phase transitions
- Mandate dual-control for spec file modifications
- GxP restrictions layer on top (never expand)

## Memory & Knowledge Transfer (BEH-SF-177 through BEH-SF-184)

### Dual-Memory Architecture (ADR-013)

- **Graph** — Persistent, canonical, queryable (Neo4j)
- **CLAUDE.md** — High-bandwidth broadcast channel for agents

### Memory Generation Pipeline (BEH-SF-177)

After every flow completion:

1. Query Neo4j for high-confidence patterns (ADRs, critical requirements, invariants, port APIs, recent chunks)
2. Compute content hash via SHA-256
3. Atomic write (write-to-temp-then-rename, INV-SF-6)
4. Create RenderedArtifact nodes with DERIVED_FROM edges

### Memory Curation (BEH-SF-179)

- Merge overlapping patterns
- Rank by recency, reference count, invariant status, ADR acceptance
- Prune to ~200 effective lines for CLAUDE.md

## Dynamic Agents & MCP Composition

### Dynamic Role Factory (BEH-SF-185 through BEH-SF-192)

- RoleTemplate registry stored in Neo4j
- Templates declare activation predicates (Cypher queries)
- At flow start: evaluate predicates → matching templates instantiated as available roles
- Dynamic roles follow same AgentPort protocol as 8 static roles

### Agent Skill Injection (BEH-SF-188)

- codebase-analyzer generates `.claude/skills/` markdown files
- Skills stored as graph nodes with EXTRACTED_FROM edges
- At spawn time: relevant skills loaded based on working directory scope

### MCP Composition (BEH-SF-193 through BEH-SF-200)

- Dynamic MCP config per agent role
- Health checks before every session spawn (INV-SF-17)
- Unhealthy servers excluded from config before agent starts

## Implementation Roadmap (10 Phases)

| Phase | Focus                         | Key Behaviors                                   |
| ----- | ----------------------------- | ----------------------------------------------- |
| 1     | Foundation                    | BEH-SF-001–033 (graph, blackboard, basic flow)  |
| 2     | Multi-Agent Orchestration     | BEH-SF-057–080 (scheduler, roles, budgeting)    |
| 3     | Knowledge Graph & Composition | BEH-SF-009–115 (chunks, composition, NLQ)       |
| 4     | Web Dashboard + VS Code       | BEH-SF-133–142 (React SPA, WebSocket, HITL)     |
| 5     | Reverse Engineering & Flows   | BEH-SF-050–091 (all flows, tool isolation, CLI) |
| 6     | SaaS Mode + Collaboration     | BEH-SF-095–150 (cloud, OAuth, shared sessions)  |
| 7     | Import/Export + Extensibility | BEH-SF-127–192 (plugins, custom flows/agents)   |
| 8     | Hook Infrastructure + Cost    | BEH-SF-161–176 (hooks, compliance, routing)     |
| 9     | Memory + Dynamic Agents + MCP | BEH-SF-177–200 (CLAUDE.md gen, templates, MCP)  |
| 10    | Permission Governance         | BEH-SF-201–208 (trust, sandbox, GxP overlay)    |

## Behavior-to-File Cross-Reference

Quick lookup for which behavior file covers which domain:

| Behavior Range | File                                      | Domain                          |
| -------------- | ----------------------------------------- | ------------------------------- |
| BEH-SF-001–008 | `behaviors/01-graph-operations.md`        | Graph store operations          |
| BEH-SF-009–016 | `behaviors/02-session-materialization.md` | Session chunks and composition  |
| BEH-SF-017–024 | `behaviors/03-agent-roles.md`             | 8 consolidated agent roles      |
| BEH-SF-025–032 | `behaviors/04-agent-sessions.md`          | Session lifecycle               |
| BEH-SF-033–040 | `behaviors/05-blackboard.md`              | Blackboard architecture         |
| BEH-SF-041–048 | `behaviors/06-agent-communication.md`     | Inter-agent communication       |
| BEH-SF-049–056 | `behaviors/07-flow-definitions.md`        | Predefined and custom flows     |
| BEH-SF-057–064 | `behaviors/08-flow-execution.md`          | Flow execution mechanics        |
| BEH-SF-065–072 | `behaviors/09-flow-lifecycle.md`          | Pause, cancel, crash recovery   |
| BEH-SF-073–080 | `behaviors/10-token-budgeting.md`         | Budgets, cost estimation        |
| BEH-SF-081–086 | `behaviors/11-tool-isolation.md`          | Tool access control             |
| BEH-SF-087–094 | `behaviors/12-extensibility.md`           | Custom flows, hooks, plugins    |
| BEH-SF-095–100 | `behaviors/13-deployment-modes.md`        | Solo, SaaS modes                |
| BEH-SF-101–106 | `behaviors/14-authentication.md`          | Auth flows, org model           |
| BEH-SF-107–112 | `behaviors/15-cloud-services.md`          | Cloud infrastructure            |
| BEH-SF-113–120 | `behaviors/16-cli.md`                     | CLI commands, CI, import/export |
| BEH-SF-121–126 | `behaviors/17-human-in-the-loop.md`       | Human feedback, approval gates  |
| BEH-SF-127–132 | `behaviors/18-import-export.md`           | Import/export adapters          |
| BEH-SF-133–138 | `behaviors/19-web-dashboard.md`           | Dashboard views, real-time      |
| BEH-SF-139–142 | `behaviors/20-vscode-extension.md`        | VS Code extension panels        |
| BEH-SF-143–150 | `behaviors/21-collaboration.md`           | Multi-user collaboration        |
| BEH-SF-151–160 | `behaviors/22-claude-code-adapter.md`     | ClaudeCodeAdapter               |
| BEH-SF-161–168 | `behaviors/23-hook-pipeline.md`           | Hook pipeline system            |
| BEH-SF-169–176 | `behaviors/24-cost-optimization.md`       | Cost optimization, routing      |
| BEH-SF-177–184 | `behaviors/25-memory-generation.md`       | Memory generation, curation     |
| BEH-SF-185–192 | `behaviors/26-dynamic-agents.md`          | Dynamic roles, templates        |
| BEH-SF-193–200 | `behaviors/27-mcp-composition.md`         | MCP server composition          |
| BEH-SF-201–208 | `behaviors/28-permission-governance.md`   | Permission governance           |

## Key Metrics

- **208** behaviors (BEH-SF-001 through BEH-SF-208)
- **17** invariants (INV-SF-1 through INV-SF-17)
- **15** ADRs (ADR-001 through ADR-015)
- **8** static agent roles (+ dynamic roles)
- **5** predefined flows
- **30** ports (25 universal + 5 mode-switched)
- **4** trust tiers
- **4** budget zones
- **3** blackboard layers
- **3** hook categories
- **2** deployment modes (solo, SaaS)

## What NOT to Do

- Do not confuse SpecForge flows with hex-di/flow state machines — they are separate systems
- Do not treat flows as imperative code — flows are declarative data structures (ADR-007)
- Do not assume agents communicate directly — all inter-agent communication goes through the blackboard (INV-SF-2)
- Do not assume phases run once — convergence-driven phases loop until criteria met or maxIterations reached (INV-SF-3)
- Do not confuse ports with adapters — ports define interfaces, adapters implement them per deployment mode
- Do not modify session chunks after materialization — they are immutable (INV-SF-11)
- Do not skip health checks before agent spawn — INV-SF-17 requires MCP health gate
- Do not reverse budget zone transitions — monotonic progression only (INV-SF-15)
