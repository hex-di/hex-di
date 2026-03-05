---
id: PROC-SF-005
kind: process
title: Requirement ID Scheme
status: active
---

# Requirement ID Scheme

Formal identifier formats used throughout the SpecForge specification.

---

## Behavior IDs

**Format:** `BEH-SF-NNN`

- **Prefix:** `BEH` (Behavior)
- **Infix:** `SF` (SpecForge)
- **Number:** 3-digit zero-padded sequential (`001` through `601`)
- **Uniqueness:** Each ID appears exactly once across all behavior files
- **Location:** `behaviors/BEH-SF-*.md`

**Example:** `BEH-SF-057` — Convergence evaluation after each iteration.

### Allocation Ranges

| Range   | File                                             | Domain                                                                                                            |
| ------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| 001–008 | `BEH-SF-001-graph-operations.md`                 | Graph store operations                                                                                            |
| 009–016 | `BEH-SF-009-session-materialization.md`          | Session chunks and composition                                                                                    |
| 017–024 | `BEH-SF-017-agent-roles.md`                      | Agent role definitions (8 consolidated roles)                                                                     |
| 025–032 | `BEH-SF-025-agent-sessions.md`                   | Session lifecycle                                                                                                 |
| 033–040 | `BEH-SF-033-blackboard.md`                       | Blackboard architecture (superseded by ACP messaging)                                                             |
| 041–048 | `BEH-SF-041-agent-communication.md`              | Inter-agent communication                                                                                         |
| 049–056 | `BEH-SF-049-flow-definitions.md`                 | Predefined flows, custom flows, presets                                                                           |
| 057–064 | `BEH-SF-057-flow-execution.md`                   | Flow execution mechanics                                                                                          |
| 065–072 | `BEH-SF-065-flow-lifecycle.md`                   | Pause, cancel, crash recovery                                                                                     |
| 073–080 | `BEH-SF-073-token-budgeting.md`                  | Token budget enforcement, cost estimation, adaptive models                                                        |
| 081–086 | `BEH-SF-081-tool-isolation.md`                   | Tool access control                                                                                               |
| 087–094 | `BEH-SF-087-extensibility.md`                    | Custom flows, hooks, events, plugin architecture                                                                  |
| 095–100 | `BEH-SF-095-deployment-modes.md`                 | Solo, SaaS modes                                                                                                  |
| 101–106 | `BEH-SF-101-authentication.md`                   | Auth flows and org model                                                                                          |
| 107–112 | `BEH-SF-107-cloud-services.md`                   | Cloud infrastructure                                                                                              |
| 113–120 | `BEH-SF-113-cli.md`                              | CLI commands, CI, import/export                                                                                   |
| 121–126 | `BEH-SF-121-human-in-the-loop.md`                | Human feedback, approval gates, intervention                                                                      |
| 127–132 | `BEH-SF-127-import-export.md`                    | Import/export adapters                                                                                            |
| 133–138 | `BEH-SF-133-web-dashboard.md`                    | Web dashboard views and real-time updates                                                                         |
| 139–142 | `BEH-SF-139-vscode-extension.md`                 | VS Code extension panels                                                                                          |
| 143–150 | `BEH-SF-143-collaboration.md`                    | Multi-user collaboration                                                                                          |
| 151–160 | `BEH-SF-151-claude-code-adapter.md`              | ClaudeCodeAdapter wrapper                                                                                         |
| 161–168 | `BEH-SF-161-hook-pipeline.md`                    | Hook pipeline system                                                                                              |
| 169–176 | `BEH-SF-169-cost-optimization.md`                | Cost optimization and model routing                                                                               |
| 177–184 | `BEH-SF-177-memory-generation.md`                | Memory generation and curation                                                                                    |
| 185–192 | `BEH-SF-185-dynamic-agents.md`                   | Dynamic agent roles and templates                                                                                 |
| 193–200 | `BEH-SF-193-mcp-composition.md`                  | MCP server composition                                                                                            |
| 201–208 | `BEH-SF-201-permission-governance.md`            | Permission governance                                                                                             |
| 209–218 | `BEH-SF-209-acp-server.md`                       | ACP server lifecycle                                                                                              |
| 219–228 | `BEH-SF-219-acp-client.md`                       | ACP client operations                                                                                             |
| 229–238 | `BEH-SF-229-acp-messaging.md`                    | ACP messaging                                                                                                     |
| 239–248 | `BEH-SF-239-agent-backend.md`                    | Agent backend (Claude Code)                                                                                       |
| 273–281 | `BEH-SF-273-desktop-app.md`                      | Desktop app (Tauri)                                                                                               |
| 300–302 | `BEH-SF-001-graph-operations.md`                 | Idempotent graph sync (gap-fill)                                                                                  |
| 303–319 | `BEH-SF-057-flow-execution.md`                   | Budget zones, schema validation, flow errors, convergence, scheduling, analytics, infrastructure ports (gap-fill) |
| 320–324 | `BEH-SF-209-acp-server.md`                       | ACP server authentication (gap-fill)                                                                              |
| 325–329 | `BEH-SF-239-agent-backend.md`                    | Connection/session separation (gap-fill)                                                                          |
| 330–334 | `BEH-SF-113-cli.md`                              | CLI config and plugin management (gap-fill)                                                                       |
| 337–358 | `BEH-SF-057-flow-execution.md`                   | Infrastructure service behaviors (gap-fill)                                                                       |
| 353–358 | `BEH-SF-095-deployment-modes.md`                 | Mode-switched port behaviors (gap-fill)                                                                           |
| 365–366 | `BEH-SF-025-agent-sessions.md`                   | Concurrent session pause (gap-fill)                                                                               |
| 367–369 | `BEH-SF-057-flow-execution.md`                   | Convergence evaluation (renumbered from 322–324)                                                                  |
| 370–379 | `plugins/PLG-gxp.md`                             | GxP compliance plugin                                                                                             |
| 381–383 | `BEH-SF-057-flow-execution.md`                   | Phase scheduling (renumbered from 325–327)                                                                        |
| 384–386 | `BEH-SF-057-flow-execution.md`                   | Analytics and metrics (renumbered from 334–336)                                                                   |
| 387–388 | `BEH-SF-025-agent-sessions.md`                   | Session resource cleanup (renumbered from 307–308)                                                                |
| 389–391 | `BEH-SF-025-agent-sessions.md`                   | Session pause/resume/cancel (renumbered from 328–330)                                                             |
| 392–394 | `BEH-SF-009-session-materialization.md`          | Composition pipeline (renumbered from 331–333)                                                                    |
| 395–396 | `BEH-SF-209-acp-server.md`                       | Clarification timeout (renumbered from 320–321)                                                                   |
| 400–407 | _(roadmap Phase 9)_                              | Cost intelligence (reserved)                                                                                      |
| 408–423 | _(roadmap Phase 10)_                             | Agent patterns (reserved)                                                                                         |
| 424–431 | _(roadmap Phase 11)_                             | Structured output + stress (reserved)                                                                             |
| 432–439 | _(roadmap Phase 12)_                             | Event flows (reserved)                                                                                            |
| 440–447 | _(roadmap Phase 13)_                             | Ecosystem (reserved)                                                                                              |
| 448–455 | _(roadmap Phase 14)_                             | Intelligence (reserved)                                                                                           |
| 456–463 | _(roadmap Phase 15)_                             | Autonomous (reserved)                                                                                             |
| 464–471 | `BEH-SF-464-implementation-tracking.md`          | Implementation tracking & source traceability                                                                     |
| 472–479 | `BEH-SF-472-coverage-dependency-completeness.md` | Coverage, dependency graph & completeness                                                                         |
| 480–487 | `BEH-SF-480-ci-validation-issue-linkage.md`      | CI validation & issue/PR linkage                                                                                  |
| 488–495 | `BEH-SF-488-progress-dashboard.md`               | Progress dashboard                                                                                                |
| 496–503 | `BEH-SF-496-protocol-extensions.md`              | Protocol extensions                                                                                               |
| 504–511 | `BEH-SF-504-agent-registry-distribution.md`      | Agent registry distribution                                                                                       |
| 512–519 | `BEH-SF-512-dynamic-capabilities.md`             | Dynamic capabilities                                                                                              |
| 520–527 | `BEH-SF-520-session-resilience.md`               | Session resilience                                                                                                |
| 528–535 | `BEH-SF-528-permission-policy.md`                | Permission policy                                                                                                 |
| 536–543 | `BEH-SF-536-reactive-graph-pipeline.md`          | Reactive graph pipeline                                                                                           |
| 544–549 | `BEH-SF-544-project-lifecycle.md`                | Project lifecycle                                                                                                 |
| 550–557 | `BEH-SF-550-scoped-access-notifications.md`      | Scoped access & notifications                                                                                     |
| 558–565 | `BEH-SF-558-skill-registry.md`                   | Skill registry                                                                                                    |
| 566–573 | `BEH-SF-566-skill-management.md`                 | Skill management                                                                                                  |
| 574–581 | `BEH-SF-574-skill-workflows.md`                  | Skill workflows                                                                                                   |
| 582–585 | `BEH-SF-582-spec-component-graph.md`             | Spec component graph                                                                                              |
| 586–593 | `BEH-SF-586-spec-validation.md`                  | Spec structural validation                                                                                        |
| 594–597 | `BEH-SF-594-notification-engine.md`              | Notification engine                                                                                               |
| 598–601 | `BEH-SF-598-ci-gate-drift-core.md`               | CI gate & drift core                                                                                              |

> **Reserved ranges:** BEH-SF-249--272 reserved (gap between file 33 and 29). BEH-SF-335--336 and BEH-SF-359--364 available for future gap-fill. BEH-SF-367--369 and BEH-SF-381--396 are now allocated to renumbered collision-fix behaviors. BEH-SF-380 and BEH-SF-397--399 reserved for future plugin behaviors. BEH-SF-602+ available for future allocation.

---

## Invariant IDs

**Format:** `INV-SF-N`

- **Prefix:** `INV` (Invariant)
- **Infix:** `SF` (SpecForge)
- **Number:** Sequential (`1` through `37`)
- **Location:** `./invariants/index.md`

**Example:** `INV-SF-3` — Convergence bound: every phase terminates.

---

## ADR IDs

**Format:** `ADR-NNN`

- **Prefix:** `ADR` (Architecture Decision Record)
- **Number:** 3-digit zero-padded sequential (`001` through `026`)
- **Location:** `decisions/ADR-NNN-slug.md`

**Example:** `ADR-005` — Graph-first architecture.

---

## Failure Mode IDs

**Format:** `FM-SF-NNN`

- **Prefix:** `FM` (Failure Mode)
- **Infix:** `SF` (SpecForge)
- **Number:** 3-digit zero-padded sequential
- **Location:** `risk-assessment/index.md`

**Example:** `FM-SF-001` — Neo4j unavailable during flow execution.

---

## Feature IDs

**Format:** `FEAT-SF-NNN`

- **Prefix:** `FEAT` (Feature)
- **Infix:** `SF` (SpecForge)
- **Number:** 3-digit zero-padded sequential (`001` through `037`)
- **Uniqueness:** Each ID appears exactly once across all feature files
- **Location:** `features/FEAT-SF-*.md`

**Example:** `FEAT-SF-004` — Flow Engine.

### Allocation

| Range | File                                       | Domain                              |
| ----- | ------------------------------------------ | ----------------------------------- |
| 001   | `FEAT-SF-001-graph-store.md`               | Graph-First Knowledge Store         |
| 002   | `FEAT-SF-002-session-composition.md`       | Session Composition Pipeline        |
| 003   | `FEAT-SF-003-multi-agent-orchestration.md` | Multi-Agent Orchestration           |
| 004   | `FEAT-SF-004-flow-engine.md`               | Flow Engine                         |
| 005   | `FEAT-SF-005-acp-protocol.md`              | ACP Protocol                        |
| 006   | `FEAT-SF-006-desktop-app.md`               | Desktop App                         |
| 007   | `FEAT-SF-007-web-dashboard.md`             | Web Dashboard                       |
| 008   | `FEAT-SF-008-vscode-extension.md`          | VS Code Extension                   |
| 009   | `FEAT-SF-009-cli.md`                       | CLI                                 |
| 010   | `FEAT-SF-010-cost-token-management.md`     | Cost & Token Management             |
| 011   | `FEAT-SF-011-hook-pipeline.md`             | Hook Pipeline & Extensibility       |
| 012   | `FEAT-SF-012-import-export.md`             | Import / Export                     |
| 013   | `FEAT-SF-013-mcp-composition.md`           | MCP Composition                     |
| 014   | `FEAT-SF-014-permission-governance.md`     | Permission Governance               |
| 015   | `FEAT-SF-015-memory-knowledge.md`          | Memory & Knowledge                  |
| 016   | `FEAT-SF-016-auth-cloud.md`                | Authentication & Cloud              |
| 017   | `FEAT-SF-017-collaboration.md`             | Collaboration                       |
| 018   | `FEAT-SF-018-human-in-the-loop.md`         | Human-in-the-Loop                   |
| 019   | `FEAT-SF-019-tool-isolation.md`            | Tool Isolation & Security           |
| 020   | `FEAT-SF-020-agent-backends.md`            | Agent Backends                      |
| 021   | `FEAT-SF-021-gxp-compliance.md`            | GxP Compliance                      |
| 022   | `FEAT-SF-022-nlq-interface.md`             | Natural Language Queries            |
| 023   | `FEAT-SF-023-structured-output.md`         | Structured Output                   |
| 024   | `FEAT-SF-024-observability.md`             | Observability & Telemetry           |
| 025   | `FEAT-SF-025-health-degraded-mode.md`      | Health & Degraded Mode              |
| 026   | `FEAT-SF-026-notification-engine.md`       | Notification Engine                 |
| 027   | `FEAT-SF-027-flow-presets.md`              | Flow Presets & Templates            |
| 028   | `FEAT-SF-028-configuration.md`             | Configuration Management            |
| 029   | `FEAT-SF-029-ci-gate-drift.md`             | CI Gate & Drift Detection           |
| 030   | `FEAT-SF-030-event-triggered-flows.md`     | Webhook & Event-Triggered Flows     |
| 031   | `FEAT-SF-031-third-party-integrations.md`  | Third-Party Integrations            |
| 032   | `FEAT-SF-032-agent-marketplace.md`         | Agent Marketplace                   |
| 033   | `FEAT-SF-033-predictive-analytics.md`      | Predictive Analytics & Intelligence |
| 034   | `FEAT-SF-034-autonomous-maintenance.md`    | Autonomous Maintenance              |
| 035   | `FEAT-SF-035-session-replay.md`            | Session Replay & Debugging          |
| 036   | `FEAT-SF-036-compliance-packs.md`          | Compliance Packs                    |
| 037   | `FEAT-SF-037-skill-management.md`          | Skill Management                    |

---

## User Capability IDs

**Format:** `UX-SF-NNN`

- **Prefix:** `UX` (User Experience / User Capability)
- **Infix:** `SF` (SpecForge)
- **Number:** 3-digit zero-padded sequential (`001` through `091`)
- **Uniqueness:** Each ID appears exactly once across all capability files
- **Location:** `capabilities/UX-SF-*.md`

**Example:** `UX-SF-001` — Run a Predefined Flow.

### Allocation

| Range   | Group                               | Domain                                                                                            |
| ------- | ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| 001–008 | Flow Operations                     | Run, preset, estimate, monitor, pause/resume, history, CI batch, custom flows                     |
| 009–012 | Graph & Knowledge Queries           | NLQ, analytics, visual explorer, ad-hoc Cypher                                                    |
| 013–016 | Import & Export                     | Markdown import, OpenAPI import, export, custom adapters                                          |
| 017–020 | Human-in-the-Loop                   | Feedback injection, phase approval, clarification, convergence override                           |
| 021–025 | Collaboration                       | Shared observation, comments, multi-user approval, project switching, handoff                     |
| 026–030 | Agent Management                    | Backend registration, health, MCP config, dynamic roles, decision log                             |
| 031–035 | Session & Debugging                 | Context inspection, replay, diff, token breakdown, report export                                  |
| 036–040 | Configuration & Setup               | Onboarding, deployment mode, budgets, CLI settings, notifications                                 |
| 041–043 | Cost Management                     | Analytics, model routing, escalation events                                                       |
| 044–048 | Plugin & Marketplace                | Install, manage, register via plugin, browse, publish                                             |
| 049–052 | CI/CD & Automation                  | CI gate, webhooks, drift check, scheduled flows                                                   |
| 053–057 | Compliance & Governance             | GxP activation, audit reports, audit trail, compliance packs, IQ/OQ/PQ                            |
| 058–061 | Permission & Security               | Access matrix, permission preview, elevated approval, tool isolation                              |
| 062–064 | Memory & Knowledge                  | CLAUDE.md curation, memory diff, cross-project transfer                                           |
| 065–067 | Observability                       | Structured logs, trace export, system health                                                      |
| 068–069 | Authentication                      | Login/tokens, SaaS org/billing                                                                    |
| 070–072 | Reactive Graph & Pipelines          | Reactive queries, mutation pipelines, concurrency conflicts                                       |
| 073–076 | Configuration & Setup (ext.)        | Project lifecycle, plugin lazy loading, scoped boundaries, notification routing                   |
| 077–083 | Skill & Workflow Management         | Skill registry, authoring, orchestration graph, workflows, sharing, monitoring, spec traceability |
| 084–085 | Structured Output & Streaming       | Output schema config, streaming monitor                                                           |
| 086–087 | Third-Party Integrations            | Connect integration, sync status monitor                                                          |
| 088–089 | Predictive Analytics & Intelligence | Health score, predictive drift alerts                                                             |
| 090–091 | Autonomous Maintenance              | Maintenance config, update proposal review                                                        |

### Metadata

Each capability file includes:

- **`persona`**: Target user persona (`developer`, `team-lead`, `devops`, `compliance-officer`, `admin`)
- **`surface`**: Interaction surface (`cli`, `dashboard`, `vscode`, `desktop`, `api`)
- **`features`**: Referenced `FEAT-SF-NNN` IDs (many-to-many)
- **`behaviors`**: Referenced `BEH-SF-NNN` IDs (many-to-many)

---

## Cross-Reference Rules

1. Every `BEH-SF-NNN` MUST link to at least one `INV-SF-N` or `ADR-NNN`
2. Every `BEH-SF-NNN` MUST appear in at least one `FEAT-SF-NNN` behaviors list
3. Every `FEAT-SF-NNN` MUST reference at least one `BEH-SF-NNN`
4. Every `INV-SF-N` MUST appear in `traceability/index.md`
5. Every `ADR-NNN` MUST be referenced by at least one behavior file
6. Every `UX-SF-NNN` MUST reference at least one `FEAT-SF-NNN` and at least one `BEH-SF-NNN`
7. Every `FEAT-SF-NNN` SHOULD be referenced by at least one `UX-SF-NNN`
8. IDs are never reused — deleted requirements keep their number reserved
9. New behaviors append to the end of their allocation range or start a new file
