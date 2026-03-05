---
kind: overview
title: "SpecForge Overview"
package: "@hex-di/specforge"
status: Draft
version: 4.0
---

# SpecForge — Specification Platform

**Specs that verify themselves. Zero setup.**

SpecForge is a specification platform built on two primitives: a Neo4j knowledge graph where every requirement, decision, task, test, and agent conversation is a queryable node, and persistent AI agent sessions that accumulate context across iterations.

---

## Mission

Replace disconnected spec files with a living graph database and autonomous agent sessions that continuously verify code against intent.

## Principles

1. **Graph-canonical** — Neo4j is the source of truth. Filesystem documents are derived renderings.
2. **Convergence-driven** — Phases loop until criteria are met, not just once.
3. **Persistent sessions** — Agent conversations accumulate context across iterations within a phase.
4. **Compositional knowledge** — Session chunks are materialized, embedded, and composed into future sessions.
5. **Mode-agnostic features** — All features work in all deployment modes. Mode selects adapters, not capabilities.
6. **Declarative flows** — Flows are data structures, not imperative code.

---

## Document Map

### Architecture

C4 model diagrams at multiple abstraction levels.

| File                                                                                         | Level      | Scope                                                                              |
| -------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------- |
| [architecture/index.md](./architecture/index.md)                                             | —          | Architecture overview and navigation                                               |
| [architecture/c1-system-context.md](./architecture/c1-system-context.md)                     | C1         | SpecForge + users + external systems                                               |
| [architecture/c2-containers.md](./architecture/c2-containers.md)                             | C2         | Server, Desktop App, Web Dashboard, VS Code Extension, CLI, Neo4j, Claude Code CLI |
| [architecture/c3-server.md](./architecture/c3-server.md)                                     | C3         | Server components: engines, managers, ports                                        |
| [architecture/c3-desktop-app.md](./architecture/c3-desktop-app.md)                           | C3         | Desktop App: Tauri shell, IPC bridge, server lifecycle manager, file watcher       |
| [architecture/c3-web-dashboard.md](./architecture/c3-web-dashboard.md)                       | C3         | React SPA, WebSocket events, dashboard views                                       |
| [architecture/c3-vscode-extension.md](./architecture/c3-vscode-extension.md)                 | C3         | VS Code extension, editor integration                                              |
| [architecture/c3-knowledge-graph.md](./architecture/c3-knowledge-graph.md)                   | C3         | Neo4j schema: node types, relationships                                            |
| [architecture/c3-acp-layer.md](./architecture/c3-acp-layer.md)                               | C3         | ACP protocol layer: server, client, handlers, backend, sessions                    |
| [architecture/c3-hooks.md](./architecture/c3-hooks.md)                                       | C3         | Hook pipeline system internals                                                     |
| [architecture/dynamic-flow-execution.md](./architecture/dynamic-flow-execution.md)           | Dynamic    | Flow → Phase → Stage → Convergence loop                                            |
| [architecture/dynamic-session-composition.md](./architecture/dynamic-session-composition.md) | Dynamic    | Query → Rank → Budget → Assemble → Bootstrap                                       |
| [architecture/deployment-solo.md](./architecture/deployment-solo.md)                         | Deployment | Solo mode (local everything)                                                       |
| [architecture/deployment-saas.md](./architecture/deployment-saas.md)                         | Deployment | SaaS mode (managed cloud)                                                          |
| [architecture/c3-agent-system.md](./architecture/c3-agent-system.md)                         | C3         | Agent system: roles, registry, backends                                            |
| [architecture/c3-cli.md](./architecture/c3-cli.md)                                           | C3         | CLI commands, CI integration                                                       |
| [architecture/c3-cloud-services.md](./architecture/c3-cloud-services.md)                     | C3         | Cloud services: OAuth, billing, managed Neo4j                                      |
| [architecture/c3-cost-optimization.md](./architecture/c3-cost-optimization.md)               | C3         | Cost optimization: budget zones, model routing                                     |
| [architecture/c3-extensibility.md](./architecture/c3-extensibility.md)                       | C3         | Plugin system, custom flows, custom agents                                         |
| [architecture/c3-import-export.md](./architecture/c3-import-export.md)                       | C3         | Import/export adapters and pipelines                                               |
| [architecture/c3-mcp-composition.md](./architecture/c3-mcp-composition.md)                   | C3         | MCP server composition and health                                                  |
| [architecture/c3-memory-generation.md](./architecture/c3-memory-generation.md)               | C3         | Memory generation and CLAUDE.md curation                                           |
| [architecture/c3-permission-governance.md](./architecture/c3-permission-governance.md)       | C3         | Permission governance and progressive trust                                        |
| [architecture/c3-skill-registry.md](./architecture/c3-skill-registry.md)                     | C3         | Skill Registry: 3-source loading, resolution, deduplication, role-bundle mapping   |
| [architecture/c3-structured-output.md](./architecture/c3-structured-output.md)               | C3         | Structured output schema validation                                                |
| [architecture/dynamic-hook-event-flow.md](./architecture/dynamic-hook-event-flow.md)         | Dynamic    | Hook event processing pipeline                                                     |
| [architecture/dynamic-memory-generation.md](./architecture/dynamic-memory-generation.md)     | Dynamic    | Memory generation and curation flow                                                |
| [architecture/ports-and-adapters.md](./architecture/ports-and-adapters.md)                   | —          | Port registry, adapter mapping                                                     |

### Behaviors

Formal behavioral contracts with `BEH-SF-NNN` identifiers (~413 behaviors across the BEH-SF-001 through BEH-SF-601 range, plus BEH-SF-370+ for GxP plugin).

| File                                                                                                                   | IDs            | Domain                                                         |
| ---------------------------------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------- |
| [behaviors/BEH-SF-001-graph-operations.md](./behaviors/BEH-SF-001-graph-operations.md)                                 | BEH-SF-001–008 | Graph store operations                                         |
| [behaviors/BEH-SF-009-session-materialization.md](./behaviors/BEH-SF-009-session-materialization.md)                   | BEH-SF-009–016 | Session chunks and composition                                 |
| [behaviors/BEH-SF-017-agent-roles.md](./behaviors/BEH-SF-017-agent-roles.md)                                           | BEH-SF-017–024 | Agent role definitions                                         |
| [behaviors/BEH-SF-025-agent-sessions.md](./behaviors/BEH-SF-025-agent-sessions.md)                                     | BEH-SF-025–032 | Session lifecycle                                              |
| [behaviors/BEH-SF-033-blackboard.md](./behaviors/BEH-SF-033-blackboard.md)                                             | BEH-SF-033–040 | Blackboard architecture (superseded by ACP messaging, file 32) |
| [behaviors/BEH-SF-041-agent-communication.md](./behaviors/BEH-SF-041-agent-communication.md)                           | BEH-SF-041–048 | Inter-agent communication                                      |
| [behaviors/BEH-SF-049-flow-definitions.md](./behaviors/BEH-SF-049-flow-definitions.md)                                 | BEH-SF-049–056 | Predefined and custom flows                                    |
| [behaviors/BEH-SF-057-flow-execution.md](./behaviors/BEH-SF-057-flow-execution.md)                                     | BEH-SF-057–064 | Flow execution mechanics                                       |
| [behaviors/BEH-SF-065-flow-lifecycle.md](./behaviors/BEH-SF-065-flow-lifecycle.md)                                     | BEH-SF-065–072 | Pause, cancel, crash recovery                                  |
| [behaviors/BEH-SF-073-token-budgeting.md](./behaviors/BEH-SF-073-token-budgeting.md)                                   | BEH-SF-073–080 | Token budget enforcement                                       |
| [behaviors/BEH-SF-081-tool-isolation.md](./behaviors/BEH-SF-081-tool-isolation.md)                                     | BEH-SF-081–086 | Tool access control                                            |
| [behaviors/BEH-SF-087-extensibility.md](./behaviors/BEH-SF-087-extensibility.md)                                       | BEH-SF-087–094 | Custom flows, hooks, events                                    |
| [behaviors/BEH-SF-095-deployment-modes.md](./behaviors/BEH-SF-095-deployment-modes.md)                                 | BEH-SF-095–100 | Solo, SaaS modes                                               |
| [behaviors/BEH-SF-101-authentication.md](./behaviors/BEH-SF-101-authentication.md)                                     | BEH-SF-101–106 | Auth flows and org model                                       |
| [behaviors/BEH-SF-107-cloud-services.md](./behaviors/BEH-SF-107-cloud-services.md)                                     | BEH-SF-107–112 | Cloud infrastructure                                           |
| [behaviors/BEH-SF-113-cli.md](./behaviors/BEH-SF-113-cli.md)                                                           | BEH-SF-113–120 | CLI commands and CI                                            |
| [behaviors/BEH-SF-121-human-in-the-loop.md](./behaviors/BEH-SF-121-human-in-the-loop.md)                               | BEH-SF-121–126 | Human review and approval gates                                |
| [behaviors/BEH-SF-127-import-export.md](./behaviors/BEH-SF-127-import-export.md)                                       | BEH-SF-127–132 | Import/export formats and pipelines                            |
| [behaviors/BEH-SF-133-web-dashboard.md](./behaviors/BEH-SF-133-web-dashboard.md)                                       | BEH-SF-133–138 | Web Dashboard views and interactions                           |
| [behaviors/BEH-SF-139-vscode-extension.md](./behaviors/BEH-SF-139-vscode-extension.md)                                 | BEH-SF-139–142 | VS Code extension features                                     |
| [behaviors/BEH-SF-143-collaboration.md](./behaviors/BEH-SF-143-collaboration.md)                                       | BEH-SF-143–150 | Collaboration features                                         |
| [behaviors/BEH-SF-151-claude-code-adapter.md](./behaviors/BEH-SF-151-claude-code-adapter.md)                           | BEH-SF-151–160 | ClaudeCodeAdapter (refactored as backend, see 33)              |
| [behaviors/BEH-SF-161-hook-pipeline.md](./behaviors/BEH-SF-161-hook-pipeline.md)                                       | BEH-SF-161–168 | Hook pipeline system                                           |
| [behaviors/BEH-SF-169-cost-optimization.md](./behaviors/BEH-SF-169-cost-optimization.md)                               | BEH-SF-169–176 | Cost optimization and model routing                            |
| [behaviors/BEH-SF-177-memory-generation.md](./behaviors/BEH-SF-177-memory-generation.md)                               | BEH-SF-177–184 | Memory generation and curation                                 |
| [behaviors/BEH-SF-185-dynamic-agents.md](./behaviors/BEH-SF-185-dynamic-agents.md)                                     | BEH-SF-185–192 | Dynamic agent roles and templates                              |
| [behaviors/BEH-SF-193-mcp-composition.md](./behaviors/BEH-SF-193-mcp-composition.md)                                   | BEH-SF-193–200 | MCP server composition                                         |
| [behaviors/BEH-SF-201-permission-governance.md](./behaviors/BEH-SF-201-permission-governance.md)                       | BEH-SF-201–208 | Permission governance                                          |
| [behaviors/BEH-SF-273-desktop-app.md](./behaviors/BEH-SF-273-desktop-app.md)                                           | BEH-SF-273–281 | Desktop app (Tauri)                                            |
| [behaviors/BEH-SF-209-acp-server.md](./behaviors/BEH-SF-209-acp-server.md)                                             | BEH-SF-209–218 | ACP server lifecycle                                           |
| [behaviors/BEH-SF-219-acp-client.md](./behaviors/BEH-SF-219-acp-client.md)                                             | BEH-SF-219–228 | ACP client operations                                          |
| [behaviors/BEH-SF-229-acp-messaging.md](./behaviors/BEH-SF-229-acp-messaging.md)                                       | BEH-SF-229–238 | ACP messaging                                                  |
| [behaviors/BEH-SF-239-agent-backend.md](./behaviors/BEH-SF-239-agent-backend.md)                                       | BEH-SF-239–248 | Agent backend (Claude Code)                                    |
| [behaviors/BEH-SF-303-graph-concurrency.md](./behaviors/BEH-SF-303-graph-concurrency.md)                               | BEH-SF-303–304 | Graph concurrency & crash recovery                             |
| [behaviors/BEH-SF-330-configuration.md](./behaviors/BEH-SF-330-configuration.md)                                       | BEH-SF-330–331 | Configuration persistence & settings                           |
| [behaviors/BEH-SF-362-graph-transactions.md](./behaviors/BEH-SF-362-graph-transactions.md)                             | BEH-SF-362     | Atomic graph transactions                                      |
| [behaviors/BEH-SF-395-acp-clarification.md](./behaviors/BEH-SF-395-acp-clarification.md)                               | BEH-SF-395     | ACP clarification timeout handling                             |
| [behaviors/BEH-SF-400-observability.md](./behaviors/BEH-SF-400-observability.md)                                       | BEH-SF-400–407 | Observability                                                  |
| [behaviors/BEH-SF-408-session-replay.md](./behaviors/BEH-SF-408-session-replay.md)                                     | BEH-SF-408–415 | Session replay                                                 |
| [behaviors/BEH-SF-416-compliance-packs.md](./behaviors/BEH-SF-416-compliance-packs.md)                                 | BEH-SF-416–423 | Compliance packs                                               |
| [behaviors/BEH-SF-424-structured-output.md](./behaviors/BEH-SF-424-structured-output.md)                               | BEH-SF-424–431 | Structured output & schema management                          |
| [behaviors/BEH-SF-432-event-triggered-flows.md](./behaviors/BEH-SF-432-event-triggered-flows.md)                       | BEH-SF-432–439 | Event-triggered flows                                          |
| [behaviors/BEH-SF-440-third-party-integrations.md](./behaviors/BEH-SF-440-third-party-integrations.md)                 | BEH-SF-440–443 | Third-party integrations                                       |
| [behaviors/BEH-SF-444-agent-marketplace.md](./behaviors/BEH-SF-444-agent-marketplace.md)                               | BEH-SF-444–447 | Agent marketplace                                              |
| [behaviors/BEH-SF-448-predictive-analytics.md](./behaviors/BEH-SF-448-predictive-analytics.md)                         | BEH-SF-448–455 | Predictive analytics & health scoring                          |
| [behaviors/BEH-SF-456-autonomous-maintenance.md](./behaviors/BEH-SF-456-autonomous-maintenance.md)                     | BEH-SF-456–463 | Autonomous maintenance                                         |
| [behaviors/BEH-SF-464-implementation-tracking.md](./behaviors/BEH-SF-464-implementation-tracking.md)                   | BEH-SF-464–471 | Implementation tracking & source traceability                  |
| [behaviors/BEH-SF-472-coverage-dependency-completeness.md](./behaviors/BEH-SF-472-coverage-dependency-completeness.md) | BEH-SF-472–479 | Coverage, dependency graph & completeness                      |
| [behaviors/BEH-SF-480-ci-validation-issue-linkage.md](./behaviors/BEH-SF-480-ci-validation-issue-linkage.md)           | BEH-SF-480–487 | CI validation & issue/PR linkage                               |
| [behaviors/BEH-SF-488-progress-dashboard.md](./behaviors/BEH-SF-488-progress-dashboard.md)                             | BEH-SF-488–495 | Progress dashboard                                             |
| [behaviors/BEH-SF-496-protocol-extensions.md](./behaviors/BEH-SF-496-protocol-extensions.md)                           | BEH-SF-496–503 | Protocol extensions (ADR-020)                                  |
| [behaviors/BEH-SF-504-agent-registry-distribution.md](./behaviors/BEH-SF-504-agent-registry-distribution.md)           | BEH-SF-504–511 | Agent registry distribution (ADR-021)                          |
| [behaviors/BEH-SF-512-dynamic-capabilities.md](./behaviors/BEH-SF-512-dynamic-capabilities.md)                         | BEH-SF-512–519 | Dynamic capabilities (ADR-022)                                 |
| [behaviors/BEH-SF-520-session-resilience.md](./behaviors/BEH-SF-520-session-resilience.md)                             | BEH-SF-520–527 | Session resilience (ADR-023)                                   |
| [behaviors/BEH-SF-528-permission-policy.md](./behaviors/BEH-SF-528-permission-policy.md)                               | BEH-SF-528–535 | Permission policy (ADR-024)                                    |
| [behaviors/BEH-SF-536-reactive-graph-pipeline.md](./behaviors/BEH-SF-536-reactive-graph-pipeline.md)                   | BEH-SF-536–543 | Reactive graph pipeline                                        |
| [behaviors/BEH-SF-544-project-lifecycle.md](./behaviors/BEH-SF-544-project-lifecycle.md)                               | BEH-SF-544–549 | Project lifecycle                                              |
| [behaviors/BEH-SF-550-scoped-access-notifications.md](./behaviors/BEH-SF-550-scoped-access-notifications.md)           | BEH-SF-550–557 | Scoped access & notifications                                  |
| [behaviors/BEH-SF-558-skill-registry.md](./behaviors/BEH-SF-558-skill-registry.md)                                     | BEH-SF-558–565 | Skill registry (ADR-025)                                       |
| [behaviors/BEH-SF-566-skill-management.md](./behaviors/BEH-SF-566-skill-management.md)                                 | BEH-SF-566–573 | Skill management                                               |
| [behaviors/BEH-SF-574-skill-workflows.md](./behaviors/BEH-SF-574-skill-workflows.md)                                   | BEH-SF-574–581 | Skill workflows                                                |
| [behaviors/BEH-SF-582-spec-component-graph.md](./behaviors/BEH-SF-582-spec-component-graph.md)                         | BEH-SF-582–585 | Spec component graph                                           |
| [behaviors/BEH-SF-586-spec-validation.md](./behaviors/BEH-SF-586-spec-validation.md)                                   | BEH-SF-586–593 | Spec validation (ADR-026)                                      |
| [behaviors/BEH-SF-594-notification-engine.md](./behaviors/BEH-SF-594-notification-engine.md)                           | BEH-SF-594–597 | Notification engine                                            |
| [behaviors/BEH-SF-598-ci-gate-drift-core.md](./behaviors/BEH-SF-598-ci-gate-drift-core.md)                             | BEH-SF-598–601 | CI gate & drift core                                           |

### Features

User-facing capabilities grouping related behaviors into the "why" layer. Each feature references the behaviors it comprises and the roadmap phases it spans.

| File                                                                                                     | ID          | Title                               | Phases       |
| -------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------- | ------------ |
| [features/FEAT-SF-001-graph-store.md](./features/FEAT-SF-001-graph-store.md)                             | FEAT-SF-001 | Graph-First Knowledge Store         | RM-01        |
| [features/FEAT-SF-002-session-composition.md](./features/FEAT-SF-002-session-composition.md)             | FEAT-SF-002 | Session Composition Pipeline        | RM-01, RM-03 |
| [features/FEAT-SF-003-multi-agent-orchestration.md](./features/FEAT-SF-003-multi-agent-orchestration.md) | FEAT-SF-003 | Multi-Agent Orchestration           | RM-02, RM-10 |
| [features/FEAT-SF-004-flow-engine.md](./features/FEAT-SF-004-flow-engine.md)                             | FEAT-SF-004 | Flow Engine                         | RM-01, RM-02 |
| [features/FEAT-SF-005-acp-protocol.md](./features/FEAT-SF-005-acp-protocol.md)                           | FEAT-SF-005 | ACP Protocol                        | RM-02        |
| [features/FEAT-SF-006-desktop-app.md](./features/FEAT-SF-006-desktop-app.md)                             | FEAT-SF-006 | Desktop App                         | RM-04        |
| [features/FEAT-SF-007-web-dashboard.md](./features/FEAT-SF-007-web-dashboard.md)                         | FEAT-SF-007 | Web Dashboard                       | RM-05        |
| [features/FEAT-SF-008-vscode-extension.md](./features/FEAT-SF-008-vscode-extension.md)                   | FEAT-SF-008 | VS Code Extension                   | RM-05        |
| [features/FEAT-SF-009-cli.md](./features/FEAT-SF-009-cli.md)                                             | FEAT-SF-009 | CLI                                 | RM-06        |
| [features/FEAT-SF-010-cost-token-management.md](./features/FEAT-SF-010-cost-token-management.md)         | FEAT-SF-010 | Cost & Token Management             | RM-09        |
| [features/FEAT-SF-011-hook-pipeline.md](./features/FEAT-SF-011-hook-pipeline.md)                         | FEAT-SF-011 | Hook Pipeline & Extensibility       | RM-08, RM-09 |
| [features/FEAT-SF-012-import-export.md](./features/FEAT-SF-012-import-export.md)                         | FEAT-SF-012 | Import / Export                     | RM-08        |
| [features/FEAT-SF-013-mcp-composition.md](./features/FEAT-SF-013-mcp-composition.md)                     | FEAT-SF-013 | MCP Composition                     | RM-10        |
| [features/FEAT-SF-014-permission-governance.md](./features/FEAT-SF-014-permission-governance.md)         | FEAT-SF-014 | Permission Governance               | RM-11        |
| [features/FEAT-SF-015-memory-knowledge.md](./features/FEAT-SF-015-memory-knowledge.md)                   | FEAT-SF-015 | Memory & Knowledge                  | RM-10        |
| [features/FEAT-SF-016-auth-cloud.md](./features/FEAT-SF-016-auth-cloud.md)                               | FEAT-SF-016 | Authentication & Cloud              | RM-07        |
| [features/FEAT-SF-017-collaboration.md](./features/FEAT-SF-017-collaboration.md)                         | FEAT-SF-017 | Collaboration                       | RM-07        |
| [features/FEAT-SF-018-human-in-the-loop.md](./features/FEAT-SF-018-human-in-the-loop.md)                 | FEAT-SF-018 | Human-in-the-Loop                   | RM-06        |
| [features/FEAT-SF-019-tool-isolation.md](./features/FEAT-SF-019-tool-isolation.md)                       | FEAT-SF-019 | Tool Isolation & Security           | RM-06        |
| [features/FEAT-SF-020-agent-backends.md](./features/FEAT-SF-020-agent-backends.md)                       | FEAT-SF-020 | Agent Backends                      | RM-01, RM-02 |
| [features/FEAT-SF-021-gxp-compliance.md](./features/FEAT-SF-021-gxp-compliance.md)                       | FEAT-SF-021 | GxP Compliance                      | RM-11        |
| [features/FEAT-SF-022-nlq-interface.md](./features/FEAT-SF-022-nlq-interface.md)                         | FEAT-SF-022 | Natural Language Queries            | RM-03        |
| [features/FEAT-SF-023-structured-output.md](./features/FEAT-SF-023-structured-output.md)                 | FEAT-SF-023 | Structured Output                   | RM-11        |
| [features/FEAT-SF-024-observability.md](./features/FEAT-SF-024-observability.md)                         | FEAT-SF-024 | Observability & Telemetry           | RM-09        |
| [features/FEAT-SF-025-health-degraded-mode.md](./features/FEAT-SF-025-health-degraded-mode.md)           | FEAT-SF-025 | Health & Degraded Mode              | RM-01        |
| [features/FEAT-SF-026-notification-engine.md](./features/FEAT-SF-026-notification-engine.md)             | FEAT-SF-026 | Notification Engine                 | RM-05, RM-07 |
| [features/FEAT-SF-027-flow-presets.md](./features/FEAT-SF-027-flow-presets.md)                           | FEAT-SF-027 | Flow Presets & Templates            | RM-02, RM-06 |
| [features/FEAT-SF-028-configuration.md](./features/FEAT-SF-028-configuration.md)                         | FEAT-SF-028 | Configuration Management            | RM-01        |
| [features/FEAT-SF-029-ci-gate-drift.md](./features/FEAT-SF-029-ci-gate-drift.md)                         | FEAT-SF-029 | CI Gate & Drift Detection           | RM-12        |
| [features/FEAT-SF-030-event-triggered-flows.md](./features/FEAT-SF-030-event-triggered-flows.md)         | FEAT-SF-030 | Webhook & Event-Triggered Flows     | RM-12        |
| [features/FEAT-SF-031-third-party-integrations.md](./features/FEAT-SF-031-third-party-integrations.md)   | FEAT-SF-031 | Third-Party Integrations            | RM-13        |
| [features/FEAT-SF-032-agent-marketplace.md](./features/FEAT-SF-032-agent-marketplace.md)                 | FEAT-SF-032 | Agent Marketplace                   | RM-13        |
| [features/FEAT-SF-033-predictive-analytics.md](./features/FEAT-SF-033-predictive-analytics.md)           | FEAT-SF-033 | Predictive Analytics & Intelligence | RM-14        |
| [features/FEAT-SF-034-autonomous-maintenance.md](./features/FEAT-SF-034-autonomous-maintenance.md)       | FEAT-SF-034 | Autonomous Maintenance              | RM-15        |
| [features/FEAT-SF-035-session-replay.md](./features/FEAT-SF-035-session-replay.md)                       | FEAT-SF-035 | Session Replay & Debugging          | RM-10        |
| [features/FEAT-SF-036-compliance-packs.md](./features/FEAT-SF-036-compliance-packs.md)                   | FEAT-SF-036 | Compliance Packs                    | RM-13        |
| [features/FEAT-SF-037-skill-management.md](./features/FEAT-SF-037-skill-management.md)                   | FEAT-SF-037 | Skill Management                    | RM-10        |
| [features/FEAT-SF-038-spec-validation.md](./features/FEAT-SF-038-spec-validation.md)                     | FEAT-SF-038 | Spec Validation                     | RM-01        |

### Capabilities

91 user capabilities: UX-SF-001 through UX-SF-091. Each capability maps to one or more personas and surfaces.

| File                                                                                                                                                 | ID        | Title                                           | Persona                                  | Surface                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------- | ---------------------------------------- | ------------------------------- |
| [capabilities/UX-SF-001-run-predefined-flow.md](./capabilities/UX-SF-001-run-predefined-flow.md)                                                     | UX-SF-001 | Run a Predefined Flow                           | developer                                | desktop, cli                    |
| [capabilities/UX-SF-002-run-flow-with-preset.md](./capabilities/UX-SF-002-run-flow-with-preset.md)                                                   | UX-SF-002 | Run a Flow with Preset                          | developer                                | desktop, cli                    |
| [capabilities/UX-SF-003-estimate-flow-cost.md](./capabilities/UX-SF-003-estimate-flow-cost.md)                                                       | UX-SF-003 | Estimate Flow Cost Before Execution             | developer                                | desktop, cli                    |
| [capabilities/UX-SF-004-monitor-running-flow.md](./capabilities/UX-SF-004-monitor-running-flow.md)                                                   | UX-SF-004 | Monitor a Running Flow in Real-Time             | developer, team-lead                     | desktop, dashboard              |
| [capabilities/UX-SF-005-pause-resume-cancel-flow.md](./capabilities/UX-SF-005-pause-resume-cancel-flow.md)                                           | UX-SF-005 | Pause, Resume, and Cancel a Flow                | developer                                | desktop, dashboard, cli         |
| [capabilities/UX-SF-006-view-flow-history.md](./capabilities/UX-SF-006-view-flow-history.md)                                                         | UX-SF-006 | View Flow History and Compare Runs              | developer, team-lead                     | desktop, dashboard              |
| [capabilities/UX-SF-007-run-batch-flow-in-ci.md](./capabilities/UX-SF-007-run-batch-flow-in-ci.md)                                                   | UX-SF-007 | Run a Batch Flow in CI                          | devops                                   | cli                             |
| [capabilities/UX-SF-008-register-custom-flow.md](./capabilities/UX-SF-008-register-custom-flow.md)                                                   | UX-SF-008 | Register and Run a Custom Flow                  | developer                                | desktop, cli                    |
| [capabilities/UX-SF-009-query-graph-natural-language.md](./capabilities/UX-SF-009-query-graph-natural-language.md)                                   | UX-SF-009 | Query Graph Using Natural Language              | developer, team-lead                     | desktop, dashboard, vscode, cli |
| [capabilities/UX-SF-010-run-analytical-graph-queries.md](./capabilities/UX-SF-010-run-analytical-graph-queries.md)                                   | UX-SF-010 | Run Analytical Graph Queries                    | developer                                | desktop, cli                    |
| [capabilities/UX-SF-011-explore-graph-visually.md](./capabilities/UX-SF-011-explore-graph-visually.md)                                               | UX-SF-011 | Explore Graph Visually                          | developer, team-lead                     | desktop, dashboard              |
| [capabilities/UX-SF-012-run-ad-hoc-cypher.md](./capabilities/UX-SF-012-run-ad-hoc-cypher.md)                                                         | UX-SF-012 | Run Ad-Hoc Cypher Queries                       | developer                                | desktop, dashboard, vscode, cli |
| [capabilities/UX-SF-013-import-markdown-specs.md](./capabilities/UX-SF-013-import-markdown-specs.md)                                                 | UX-SF-013 | Import Markdown Specs into Graph                | developer                                | desktop, cli                    |
| [capabilities/UX-SF-014-import-openapi-specs.md](./capabilities/UX-SF-014-import-openapi-specs.md)                                                   | UX-SF-014 | Import OpenAPI Specs into Graph                 | developer                                | desktop, cli                    |
| [capabilities/UX-SF-015-export-graph-content.md](./capabilities/UX-SF-015-export-graph-content.md)                                                   | UX-SF-015 | Export Graph Content to Files                   | developer                                | desktop, cli                    |
| [capabilities/UX-SF-016-register-custom-import-export-adapters.md](./capabilities/UX-SF-016-register-custom-import-export-adapters.md)               | UX-SF-016 | Register Custom Import/Export Adapters          | developer                                | desktop, cli                    |
| [capabilities/UX-SF-017-inject-feedback-into-flow.md](./capabilities/UX-SF-017-inject-feedback-into-flow.md)                                         | UX-SF-017 | Inject Feedback into a Running Flow             | developer, team-lead                     | desktop, cli                    |
| [capabilities/UX-SF-018-approve-reject-phase-transition.md](./capabilities/UX-SF-018-approve-reject-phase-transition.md)                             | UX-SF-018 | Approve or Reject a Phase Transition            | team-lead                                | desktop, dashboard, cli         |
| [capabilities/UX-SF-019-respond-to-agent-clarification.md](./capabilities/UX-SF-019-respond-to-agent-clarification.md)                               | UX-SF-019 | Respond to Agent Clarification Request          | developer                                | desktop, dashboard, cli         |
| [capabilities/UX-SF-020-force-convergence-or-extra-iteration.md](./capabilities/UX-SF-020-force-convergence-or-extra-iteration.md)                   | UX-SF-020 | Force Convergence or Extra Iteration            | developer                                | desktop, cli                    |
| [capabilities/UX-SF-021-observe-shared-flow.md](./capabilities/UX-SF-021-observe-shared-flow.md)                                                     | UX-SF-021 | Observe a Shared Flow with Team                 | team-lead                                | desktop, dashboard              |
| [capabilities/UX-SF-022-comment-on-findings.md](./capabilities/UX-SF-022-comment-on-findings.md)                                                     | UX-SF-022 | Comment on Findings and Artifacts               | team-lead, developer                     | desktop, dashboard, vscode      |
| [capabilities/UX-SF-023-approve-reject-multi-user.md](./capabilities/UX-SF-023-approve-reject-multi-user.md)                                         | UX-SF-023 | Approve or Reject Agent Changes (Multi-User)    | team-lead                                | desktop, dashboard, cli         |
| [capabilities/UX-SF-024-switch-between-projects.md](./capabilities/UX-SF-024-switch-between-projects.md)                                             | UX-SF-024 | Switch Between Projects                         | developer                                | desktop, dashboard, vscode      |
| [capabilities/UX-SF-025-hand-off-flow-ownership.md](./capabilities/UX-SF-025-hand-off-flow-ownership.md)                                             | UX-SF-025 | Hand Off Flow Ownership                         | team-lead                                | desktop, cli                    |
| [capabilities/UX-SF-026-register-configure-agent-backends.md](./capabilities/UX-SF-026-register-configure-agent-backends.md)                         | UX-SF-026 | Register and Configure Agent Backends           | devops                                   | desktop, cli                    |
| [capabilities/UX-SF-027-monitor-agent-backend-health.md](./capabilities/UX-SF-027-monitor-agent-backend-health.md)                                   | UX-SF-027 | Monitor Agent Backend Health                    | devops                                   | desktop, dashboard, cli         |
| [capabilities/UX-SF-028-configure-mcp-servers-per-role.md](./capabilities/UX-SF-028-configure-mcp-servers-per-role.md)                               | UX-SF-028 | Configure MCP Servers per Agent Role            | devops                                   | desktop, cli                    |
| [capabilities/UX-SF-029-create-dynamic-agent-roles.md](./capabilities/UX-SF-029-create-dynamic-agent-roles.md)                                       | UX-SF-029 | Create Dynamic Agent Roles from Templates       | developer                                | desktop, cli                    |
| [capabilities/UX-SF-030-view-agent-decision-log.md](./capabilities/UX-SF-030-view-agent-decision-log.md)                                             | UX-SF-030 | View Agent Decision Log and Tool Calls          | developer                                | desktop, dashboard              |
| [capabilities/UX-SF-031-inspect-session-context.md](./capabilities/UX-SF-031-inspect-session-context.md)                                             | UX-SF-031 | Inspect Session Context and Composed Chunks     | developer                                | desktop, dashboard              |
| [capabilities/UX-SF-032-replay-completed-session.md](./capabilities/UX-SF-032-replay-completed-session.md)                                           | UX-SF-032 | Replay a Completed Session Step-by-Step         | developer                                | desktop, dashboard              |
| [capabilities/UX-SF-033-diff-two-sessions.md](./capabilities/UX-SF-033-diff-two-sessions.md)                                                         | UX-SF-033 | Diff Two Sessions Side-by-Side                  | developer                                | desktop, dashboard              |
| [capabilities/UX-SF-034-view-token-usage-breakdown.md](./capabilities/UX-SF-034-view-token-usage-breakdown.md)                                       | UX-SF-034 | View Token Usage Breakdown per Tool Call        | developer                                | desktop, dashboard              |
| [capabilities/UX-SF-035-export-session-replay-report.md](./capabilities/UX-SF-035-export-session-replay-report.md)                                   | UX-SF-035 | Export Session Replay as Report                 | developer, team-lead                     | desktop, dashboard              |
| [capabilities/UX-SF-036-onboard-new-project.md](./capabilities/UX-SF-036-onboard-new-project.md)                                                     | UX-SF-036 | Onboard a New Project                           | developer                                | desktop, cli                    |
| [capabilities/UX-SF-037-configure-deployment-mode.md](./capabilities/UX-SF-037-configure-deployment-mode.md)                                         | UX-SF-037 | Configure Deployment Mode                       | admin                                    | desktop, cli                    |
| [capabilities/UX-SF-038-set-token-budgets.md](./capabilities/UX-SF-038-set-token-budgets.md)                                                         | UX-SF-038 | Set Token Budgets and Cost Limits               | developer, team-lead                     | desktop, cli                    |
| [capabilities/UX-SF-039-manage-cli-settings.md](./capabilities/UX-SF-039-manage-cli-settings.md)                                                     | UX-SF-039 | Manage CLI Settings                             | developer                                | cli                             |
| [capabilities/UX-SF-040-configure-notification-preferences.md](./capabilities/UX-SF-040-configure-notification-preferences.md)                       | UX-SF-040 | Configure Notification Preferences              | developer                                | desktop, dashboard, cli         |
| [capabilities/UX-SF-041-view-cost-analytics.md](./capabilities/UX-SF-041-view-cost-analytics.md)                                                     | UX-SF-041 | View Cost Analytics and Budget Zones            | developer, team-lead                     | desktop, dashboard              |
| [capabilities/UX-SF-042-configure-model-routing.md](./capabilities/UX-SF-042-configure-model-routing.md)                                             | UX-SF-042 | Configure Model Routing per Role                | developer                                | desktop, cli                    |
| [capabilities/UX-SF-043-review-model-escalation-events.md](./capabilities/UX-SF-043-review-model-escalation-events.md)                               | UX-SF-043 | Review Model Escalation Events                  | developer                                | desktop, dashboard              |
| [capabilities/UX-SF-044-install-plugin.md](./capabilities/UX-SF-044-install-plugin.md)                                                               | UX-SF-044 | Install a Plugin                                | developer                                | desktop, cli                    |
| [capabilities/UX-SF-045-enable-disable-manage-plugins.md](./capabilities/UX-SF-045-enable-disable-manage-plugins.md)                                 | UX-SF-045 | Enable, Disable, and Manage Plugins             | developer                                | desktop, cli                    |
| [capabilities/UX-SF-046-register-flows-agents-via-plugin.md](./capabilities/UX-SF-046-register-flows-agents-via-plugin.md)                           | UX-SF-046 | Register Custom Flows and Agents via Plugin     | developer                                | desktop, cli                    |
| [capabilities/UX-SF-047-browse-search-marketplace.md](./capabilities/UX-SF-047-browse-search-marketplace.md)                                         | UX-SF-047 | Browse and Search Agent Marketplace             | developer                                | desktop, dashboard, cli         |
| [capabilities/UX-SF-048-publish-custom-agent-pack.md](./capabilities/UX-SF-048-publish-custom-agent-pack.md)                                         | UX-SF-048 | Publish a Custom Agent Pack                     | developer                                | desktop, cli                    |
| [capabilities/UX-SF-049-set-up-ci-gate-drift.md](./capabilities/UX-SF-049-set-up-ci-gate-drift.md)                                                   | UX-SF-049 | Set Up CI Gate for Drift Detection              | devops                                   | cli                             |
| [capabilities/UX-SF-050-configure-webhook-triggers.md](./capabilities/UX-SF-050-configure-webhook-triggers.md)                                       | UX-SF-050 | Configure Webhook Triggers for Flows            | devops                                   | cli                             |
| [capabilities/UX-SF-051-run-drift-check-in-ci.md](./capabilities/UX-SF-051-run-drift-check-in-ci.md)                                                 | UX-SF-051 | Run Drift Check in CI Pipeline                  | devops                                   | cli                             |
| [capabilities/UX-SF-052-schedule-recurring-flows.md](./capabilities/UX-SF-052-schedule-recurring-flows.md)                                           | UX-SF-052 | Schedule Recurring Verification Flows           | devops                                   | cli                             |
| [capabilities/UX-SF-053-activate-gxp-compliance-mode.md](./capabilities/UX-SF-053-activate-gxp-compliance-mode.md)                                   | UX-SF-053 | Activate GxP Compliance Mode                    | compliance-officer                       | desktop, cli                    |
| [capabilities/UX-SF-054-generate-compliance-audit-report.md](./capabilities/UX-SF-054-generate-compliance-audit-report.md)                           | UX-SF-054 | Generate Compliance Audit Report                | compliance-officer                       | desktop, dashboard, cli         |
| [capabilities/UX-SF-055-view-audit-trail.md](./capabilities/UX-SF-055-view-audit-trail.md)                                                           | UX-SF-055 | View Audit Trail for a Flow                     | compliance-officer                       | desktop, dashboard              |
| [capabilities/UX-SF-056-install-configure-compliance-packs.md](./capabilities/UX-SF-056-install-configure-compliance-packs.md)                       | UX-SF-056 | Install and Configure Compliance Packs          | compliance-officer                       | desktop, cli                    |
| [capabilities/UX-SF-057-run-validation-protocol.md](./capabilities/UX-SF-057-run-validation-protocol.md)                                             | UX-SF-057 | Run Validation Protocol (IQ/OQ/PQ)              | compliance-officer                       | desktop, cli                    |
| [capabilities/UX-SF-058-configure-access-matrix.md](./capabilities/UX-SF-058-configure-access-matrix.md)                                             | UX-SF-058 | Configure Role-Based Access Matrix              | admin                                    | desktop, cli                    |
| [capabilities/UX-SF-059-preview-permissions-before-execution.md](./capabilities/UX-SF-059-preview-permissions-before-execution.md)                   | UX-SF-059 | Preview Permissions Before Execution            | developer                                | desktop, cli                    |
| [capabilities/UX-SF-060-approve-elevated-permissions.md](./capabilities/UX-SF-060-approve-elevated-permissions.md)                                   | UX-SF-060 | Approve Elevated Permission Requests            | team-lead                                | desktop, dashboard, cli         |
| [capabilities/UX-SF-061-configure-tool-isolation.md](./capabilities/UX-SF-061-configure-tool-isolation.md)                                           | UX-SF-061 | Configure Tool Isolation per Role               | admin                                    | desktop, cli                    |
| [capabilities/UX-SF-062-view-curate-claude-md.md](./capabilities/UX-SF-062-view-curate-claude-md.md)                                                 | UX-SF-062 | View and Curate Generated CLAUDE.md             | developer                                | desktop, cli                    |
| [capabilities/UX-SF-063-diff-memory-versions.md](./capabilities/UX-SF-063-diff-memory-versions.md)                                                   | UX-SF-063 | Diff Memory Versions                            | developer                                | desktop, cli                    |
| [capabilities/UX-SF-064-transfer-knowledge-across-projects.md](./capabilities/UX-SF-064-transfer-knowledge-across-projects.md)                       | UX-SF-064 | Transfer Knowledge Across Projects              | developer                                | desktop, cli                    |
| [capabilities/UX-SF-065-view-structured-logs.md](./capabilities/UX-SF-065-view-structured-logs.md)                                                   | UX-SF-065 | View Structured Logs with Correlation           | devops                                   | desktop, dashboard, cli         |
| [capabilities/UX-SF-066-export-traces-to-external-platform.md](./capabilities/UX-SF-066-export-traces-to-external-platform.md)                       | UX-SF-066 | Export Traces to External Platform              | devops                                   | desktop, cli                    |
| [capabilities/UX-SF-067-monitor-system-health.md](./capabilities/UX-SF-067-monitor-system-health.md)                                                 | UX-SF-067 | Monitor System Health                           | devops                                   | desktop, dashboard, cli         |
| [capabilities/UX-SF-068-login-manage-api-tokens.md](./capabilities/UX-SF-068-login-manage-api-tokens.md)                                             | UX-SF-068 | Log In and Manage API Tokens                    | developer, admin                         | desktop, cli                    |
| [capabilities/UX-SF-069-configure-saas-org-billing.md](./capabilities/UX-SF-069-configure-saas-org-billing.md)                                       | UX-SF-069 | Configure SaaS Organization and Billing         | admin                                    | desktop, dashboard              |
| [capabilities/UX-SF-070-subscribe-reactive-graph-queries.md](./capabilities/UX-SF-070-subscribe-reactive-graph-queries.md)                           | UX-SF-070 | Subscribe to Reactive Graph Queries             | developer, team-lead                     | desktop, dashboard, api         |
| [capabilities/UX-SF-071-configure-graph-mutation-pipeline.md](./capabilities/UX-SF-071-configure-graph-mutation-pipeline.md)                         | UX-SF-071 | Configure Graph Mutation Pipeline               | developer, admin                         | desktop, dashboard, cli         |
| [capabilities/UX-SF-072-resolve-graph-concurrency-conflicts.md](./capabilities/UX-SF-072-resolve-graph-concurrency-conflicts.md)                     | UX-SF-072 | Resolve Graph Concurrency Conflicts             | developer, team-lead                     | desktop, dashboard              |
| [capabilities/UX-SF-073-manage-project-lifecycle-states.md](./capabilities/UX-SF-073-manage-project-lifecycle-states.md)                             | UX-SF-073 | Manage Project Lifecycle States                 | admin, team-lead                         | desktop, dashboard, cli         |
| [capabilities/UX-SF-074-configure-plugin-lazy-loading.md](./capabilities/UX-SF-074-configure-plugin-lazy-loading.md)                                 | UX-SF-074 | Configure Plugin Lazy Loading                   | developer, admin                         | desktop, cli                    |
| [capabilities/UX-SF-075-configure-scoped-permission-boundaries.md](./capabilities/UX-SF-075-configure-scoped-permission-boundaries.md)               | UX-SF-075 | Configure Scoped Permission Boundaries          | admin, team-lead                         | desktop, dashboard, cli         |
| [capabilities/UX-SF-076-configure-notification-classification-routing.md](./capabilities/UX-SF-076-configure-notification-classification-routing.md) | UX-SF-076 | Configure Notification Classification & Routing | admin, developer                         | desktop, dashboard, cli         |
| [capabilities/UX-SF-077-browse-manage-skill-registry.md](./capabilities/UX-SF-077-browse-manage-skill-registry.md)                                   | UX-SF-077 | Browse and Manage Skill Registry                | developer, team-lead                     | desktop, dashboard              |
| [capabilities/UX-SF-078-author-custom-skills.md](./capabilities/UX-SF-078-author-custom-skills.md)                                                   | UX-SF-078 | Author Custom Skills                            | developer, team-lead                     | desktop, dashboard, cli         |
| [capabilities/UX-SF-079-explore-skill-orchestration-graph.md](./capabilities/UX-SF-079-explore-skill-orchestration-graph.md)                         | UX-SF-079 | Explore Skill Orchestration Graph               | developer, team-lead                     | desktop, dashboard              |
| [capabilities/UX-SF-080-define-skill-workflows.md](./capabilities/UX-SF-080-define-skill-workflows.md)                                               | UX-SF-080 | Define Skill Workflows                          | developer, team-lead                     | desktop, dashboard, cli         |
| [capabilities/UX-SF-081-share-discover-skill-workflows.md](./capabilities/UX-SF-081-share-discover-skill-workflows.md)                               | UX-SF-081 | Share and Discover Skill Workflows              | developer, team-lead                     | desktop, dashboard              |
| [capabilities/UX-SF-082-run-monitor-skill-workflows.md](./capabilities/UX-SF-082-run-monitor-skill-workflows.md)                                     | UX-SF-082 | Run and Monitor Skill Workflows                 | developer, team-lead                     | desktop, dashboard, cli         |
| [capabilities/UX-SF-083-explore-spec-component-traceability-graph.md](./capabilities/UX-SF-083-explore-spec-component-traceability-graph.md)         | UX-SF-083 | Explore Spec Component Traceability Graph       | developer, team-lead, compliance-officer | desktop, dashboard              |
| [capabilities/UX-SF-084-configure-agent-output-schemas.md](./capabilities/UX-SF-084-configure-agent-output-schemas.md)                               | UX-SF-084 | Configure Agent Output Schemas                  | developer                                | desktop, dashboard, cli         |
| [capabilities/UX-SF-085-monitor-streaming-agent-output.md](./capabilities/UX-SF-085-monitor-streaming-agent-output.md)                               | UX-SF-085 | Monitor Streaming Agent Output                  | developer, team-lead                     | desktop, dashboard              |
| [capabilities/UX-SF-086-connect-third-party-integration.md](./capabilities/UX-SF-086-connect-third-party-integration.md)                             | UX-SF-086 | Connect Third-Party Integration                 | developer, devops                        | desktop, dashboard, cli         |
| [capabilities/UX-SF-087-monitor-integration-sync-status.md](./capabilities/UX-SF-087-monitor-integration-sync-status.md)                             | UX-SF-087 | Monitor Integration Sync Status                 | developer, team-lead                     | desktop, dashboard              |
| [capabilities/UX-SF-088-view-architecture-health-score.md](./capabilities/UX-SF-088-view-architecture-health-score.md)                               | UX-SF-088 | View Architecture Health Score                  | developer, team-lead                     | desktop, dashboard              |
| [capabilities/UX-SF-089-review-predictive-drift-alerts.md](./capabilities/UX-SF-089-review-predictive-drift-alerts.md)                               | UX-SF-089 | Review Predictive Drift Alerts                  | developer, team-lead                     | desktop, dashboard              |
| [capabilities/UX-SF-090-configure-autonomous-maintenance.md](./capabilities/UX-SF-090-configure-autonomous-maintenance.md)                           | UX-SF-090 | Configure Autonomous Maintenance                | developer, devops                        | desktop, cli                    |
| [capabilities/UX-SF-091-review-autonomous-update-proposals.md](./capabilities/UX-SF-091-review-autonomous-update-proposals.md)                       | UX-SF-091 | Review Autonomous Update Proposals              | developer, team-lead                     | desktop, dashboard              |

### References

External tool documentation used as implementation reference.

| File                                                 | Tool        | Scope                                                             |
| ---------------------------------------------------- | ----------- | ----------------------------------------------------------------- |
| [references/index.md](./references/index.md)         | —           | Reference index and navigation                                    |
| [references/claude-code/](./references/claude-code/) | Claude Code | Agent SDK, CLI, hooks, settings, permissions                      |
| [references/acp/](./references/acp/)                 | ACP         | Agent Communication Protocol spec, lifecycle, sessions, messaging |
| [references/zed/](./references/zed/)                 | Zed Editor  | ACP implementation patterns, extension system, agent registry     |
| [references/huly/](./references/huly/)               | Huly        | Collaboration platform patterns, plugin system, data model        |

### Research

Exploration documents recording findings from technology and pattern investigations.

| File                                                                                                         | ID     | Topic                                  |
| ------------------------------------------------------------------------------------------------------------ | ------ | -------------------------------------- |
| [research/RES-00-consolidated-synthesis.md](./research/RES-00-consolidated-synthesis.md)                     | RES-00 | Consolidated synthesis of all research |
| [research/RES-01-agent-teams-orchestration.md](./research/RES-01-agent-teams-orchestration.md)               | RES-01 | Agent teams and orchestration          |
| [research/RES-02-hooks-event-architecture.md](./research/RES-02-hooks-event-architecture.md)                 | RES-02 | Hooks and event architecture           |
| [research/RES-03-memory-knowledge-architecture.md](./research/RES-03-memory-knowledge-architecture.md)       | RES-03 | Memory and knowledge architecture      |
| [research/RES-04-structured-output-pipeline.md](./research/RES-04-structured-output-pipeline.md)             | RES-04 | Structured output pipeline             |
| [research/RES-05-mcp-tool-ecosystem.md](./research/RES-05-mcp-tool-ecosystem.md)                             | RES-05 | MCP tool ecosystem                     |
| [research/RES-06-permissions-governance.md](./research/RES-06-permissions-governance.md)                     | RES-06 | Permissions and governance             |
| [research/RES-07-session-composition-patterns.md](./research/RES-07-session-composition-patterns.md)         | RES-07 | Session composition patterns           |
| [research/RES-08-model-strategy-cost-optimization.md](./research/RES-08-model-strategy-cost-optimization.md) | RES-08 | Model strategy and cost optimization   |
| [research/RES-09-subagent-architecture-patterns.md](./research/RES-09-subagent-architecture-patterns.md)     | RES-09 | Subagent architecture patterns         |
| [research/RES-10-product-vision-synthesis.md](./research/RES-10-product-vision-synthesis.md)                 | RES-10 | Product vision synthesis               |

### Types

TypeScript interface definitions split by domain.

| File                                                       | Domain                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [types/graph.md](./types/graph.md)                         | Neo4j config, graph nodes, edges, query results                                      |
| [types/agent.md](./types/agent.md)                         | Agent roles, sessions, tools, conversations                                          |
| [types/acp.md](./types/acp.md)                             | ACP messages, runs, sessions, manifests                                              |
| [types/blackboard.md](./types/blackboard.md)               | Documents, findings, messages, events (superseded by [types/acp.md](./types/acp.md)) |
| [types/flow.md](./types/flow.md)                           | Flow input/result, phases, metrics, convergence                                      |
| [types/auth.md](./types/auth.md)                           | Credentials, sessions, tokens                                                        |
| [types/cloud.md](./types/cloud.md)                         | Plans, billing, graph requests, analytics                                            |
| [types/extensibility.md](./types/extensibility.md)         | Hooks, events, custom agents, plugins                                                |
| [types/ports.md](./types/ports.md)                         | Port definitions, adapter factories, port registry                                   |
| [types/errors.md](./types/errors.md)                       | All error types with `_tag` discriminants                                            |
| [types/import-export.md](./types/import-export.md)         | Import/export formats, transformation pipelines                                      |
| [types/hooks.md](./types/hooks.md)                         | Hook events, pipeline, compliance gates                                              |
| [types/structured-output.md](./types/structured-output.md) | Per-role output schemas, streaming events                                            |
| [types/memory.md](./types/memory.md)                       | Memory artifacts, knowledge patterns, curation                                       |
| [types/mcp.md](./types/mcp.md)                             | MCP server config, health checks, credentials                                        |
| [types/audit.md](./types/audit.md)                         | Audit records, permission decisions, trust scores                                    |
| [types/skill.md](./types/skill.md)                         | Skill sources, bundles, resolution, registry port                                    |
| [types/api.md](./types/api.md)                             | REST endpoint schemas, WebSocket envelope, SSE events, error wire format             |
| [types/tracking.md](./types/tracking.md)                   | Implementation status, test coverage, completeness schemas                           |

### Plugins

Extensibility plugins for domain-specific workflows.

| File                                       | Description                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| [plugins/PLG-gxp.md](./plugins/PLG-gxp.md) | GxP compliance plugin — audit trails, electronic signatures, validation protocols |

### Governance

| File                                                                       | Description                                             |
| -------------------------------------------------------------------------- | ------------------------------------------------------- |
| [./invariants/index.md](./invariants/index.md)                             | INV-SF-1 through INV-SF-43                              |
| [decisions/](./decisions/)                                                 | ADR-001 through ADR-026                                 |
| [glossary.md](./glossary.md)                                               | Domain terminology                                      |
| [traceability/index.md](./traceability/index.md)                           | Requirement → behavior → ADR → invariant                |
| [risk-assessment/index.md](./risk-assessment/index.md)                     | FMEA for key failure modes                              |
| [roadmap/index.md](./roadmap/index.md)                                     | Implementation phases                                   |
| [process/requirement-id-scheme.md](./process/requirement-id-scheme.md)     | BEH-SF, INV-SF, ADR, FM-SF formats                      |
| [process/definitions-of-done.md](./process/definitions-of-done.md)         | DoD per document type                                   |
| [process/change-control.md](./process/change-control.md)                   | Change categories, approval workflow, versioning        |
| [process/test-strategy.md](./process/test-strategy.md)                     | Test pyramid, coverage targets, qualification protocols |
| [process/document-control-policy.md](./process/document-control-policy.md) | Git-based versioning, approval evidence, retention      |
| [process/spec-validation-rules.md](./process/spec-validation-rules.md)     | 53 structural validation rules (VAL-001–053)            |
| [process/ci-maintenance.md](./process/ci-maintenance.md)                   | CI pipeline stages, automated checks, release process   |
| [scripts/verify-traceability.sh](./scripts/verify-traceability.sh)         | Automated traceability verification script              |
| [product/pitch.md](./product/pitch.md)                                     | Product pitch                                           |
| [product/competitive-analysis.md](./product/competitive-analysis.md)       | Market positioning and competitive landscape analysis   |

### Decisions

| ADR     | Title                                              | Status                                               |
| ------- | -------------------------------------------------- | ---------------------------------------------------- |
| ADR-001 | hex-di as DI Foundation                            | Accepted                                             |
| ADR-002 | Tauri over Electron                                | Accepted (reinstated by ADR-016, amended by ADR-017) |
| ADR-003 | Blackboard Communication (superseded)              | Superseded by ADR-018                                |
| ADR-004 | Claude Code CLI as Opaque Agent Subprocess         | Superseded by ADR-018                                |
| ADR-005 | Graph-First Architecture                           | Accepted                                             |
| ADR-006 | Persistent Agent Sessions                          | Superseded by ADR-005                                |
| ADR-007 | Flow-Based Orchestration                           | Superseded by ADR-005                                |
| ADR-008 | GxP as Optional Mode                               | Accepted                                             |
| ADR-009 | Compositional Sessions                             | Accepted                                             |
| ADR-010 | Web Dashboard + VS Code Extension over Desktop App | Superseded by ADR-016                                |
| ADR-011 | Hooks as Event Bus                                 | Accepted                                             |
| ADR-012 | JSON-First Structured Output                       | Accepted                                             |
| ADR-013 | Dual-Memory Architecture                           | Accepted                                             |
| ADR-014 | Role-Adaptive Model Routing                        | Accepted                                             |
| ADR-015 | Agent Teams Hybrid Integration                     | Accepted                                             |
| ADR-016 | Desktop App as Primary Local Client                | Accepted                                             |
| ADR-017 | Standalone Server over Sidecar                     | Accepted                                             |
| ADR-018 | ACP as Primary Agent Protocol                      | Accepted (supersedes ADR-003, ADR-004)               |
| ADR-019 | Zed-Inspired Architecture                          | Accepted                                             |
| ADR-020 | Protocol Extension & Observability Framework       | Accepted                                             |
| ADR-021 | Schema-Driven Agent Registry & Distribution        | Accepted                                             |
| ADR-022 | Dynamic Agent Capabilities & Streaming             | Accepted                                             |
| ADR-023 | Session Resilience & MCP Integration               | Accepted                                             |
| ADR-024 | Permission Policy Architecture                     | Accepted                                             |
| ADR-025 | Skill Registry Architecture                        | Accepted                                             |
| ADR-026 | Spec Structural Validation                         | Accepted                                             |
