---
id: TRACE-SF-003
title: "ADR -> Behavior Traceability"
kind: traceability
status: active
scope: adr
---

## ADR -> Behavior Traceability

Every ADR is justified by one or more behaviors.

| ADR                                                                   | Title                                                              | Related Behaviors                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| [ADR-001](../decisions/ADR-001-hexdi-as-di-foundation.md)             | hex-di as DI foundation                                            | BEH-SF-001, BEH-SF-002, BEH-SF-007                |
| [ADR-002](../decisions/ADR-002-tauri-over-electron.md)                | Tauri over Electron (reinstated by ADR-016, amended by ADR-017)    | BEH-SF-273--281                                   |
| [ADR-003](../decisions/ADR-003-blackboard-communication.md)           | Blackboard communication (superseded by ADR-018)                   | BEH-SF-033--040                                   |
| [ADR-004](../decisions/ADR-004-claude-code-sdk.md)                    | Claude Code CLI as opaque agent subprocess (superseded by ADR-018) | BEH-SF-025--032, BEH-SF-081--086, BEH-SF-151--160 |
| [ADR-005](../decisions/ADR-005-graph-first-architecture.md)           | Graph-first architecture                                           | BEH-SF-001--008, BEH-SF-095--097                  |
| [ADR-006](../decisions/ADR-006-persistent-agent-sessions.md)          | Persistent agent sessions                                          | BEH-SF-025--032                                   |
| [ADR-007](../decisions/ADR-007-flow-based-orchestration.md)           | Flow-based orchestration                                           | BEH-SF-049--072                                   |
| [ADR-008](../decisions/ADR-008-gxp-optional-mode.md)                  | GxP optional plugin                                                | BEH-SF-090 (plugin architecture)                  |
| [ADR-009](../decisions/ADR-009-compositional-sessions.md)             | Compositional sessions                                             | BEH-SF-009--016                                   |
| [ADR-010](../decisions/ADR-010-web-dashboard-vscode-over-desktop.md)  | Web dashboard + VS Code over desktop (superseded by ADR-016)       | BEH-SF-133--142                                   |
| [ADR-011](../decisions/ADR-011-hooks-as-event-bus.md)                 | Hooks as event bus                                                 | BEH-SF-161--168, BEH-SF-201--208                  |
| [ADR-012](../decisions/ADR-012-json-first-structured-output.md)       | JSON-first structured output                                       | BEH-SF-155--159 (strengthened)                    |
| [ADR-013](../decisions/ADR-013-dual-memory-architecture.md)           | Dual-memory architecture                                           | BEH-SF-177--184                                   |
| [ADR-014](../decisions/ADR-014-role-adaptive-model-routing.md)        | Role-adaptive model routing                                        | BEH-SF-169--176                                   |
| [ADR-015](../decisions/ADR-015-agent-teams-hybrid-integration.md)     | Agent Teams hybrid integration                                     | BEH-SF-185--200                                   |
| [ADR-016](../decisions/ADR-016-desktop-app-primary-client.md)         | Desktop App as primary local client                                | BEH-SF-273--281                                   |
| [ADR-017](../decisions/ADR-017-standalone-server-over-sidecar.md)     | Standalone Server over Sidecar                                     | BEH-SF-281                                        |
| [ADR-018](../decisions/ADR-018-acp-agent-protocol.md)                 | ACP as Primary Agent Protocol (supersedes ADR-003, ADR-004)        | BEH-SF-209--248                                   |
| [ADR-019](../decisions/ADR-019-zed-inspired-architecture.md)          | Zed-Inspired Architecture                                          | BEH-SF-209--248, BEH-SF-300--305, BEH-SF-325--329 |
| [ADR-020](../decisions/ADR-020-protocol-extension-observability.md)   | Protocol Extension & Observability Framework                       | BEH-SF-496--503                                   |
| [ADR-021](../decisions/ADR-021-schema-driven-agent-registry.md)       | Schema-Driven Agent Registry & Distribution                        | BEH-SF-504--511                                   |
| [ADR-022](../decisions/ADR-022-dynamic-agent-capabilities.md)         | Dynamic Agent Capabilities & Streaming                             | BEH-SF-512--519                                   |
| [ADR-023](../decisions/ADR-023-session-resilience-mcp-integration.md) | Session Resilience & MCP Integration                               | BEH-SF-520--527                                   |
| [ADR-024](../decisions/ADR-024-permission-policy-architecture.md)     | Permission Policy Architecture                                     | BEH-SF-528--535                                   |
| [ADR-025](../decisions/ADR-025-skill-registry-architecture.md)        | Skill Registry Architecture                                        | BEH-SF-558--565                                   |
| [ADR-026](../decisions/ADR-026-spec-structural-validation.md)         | Spec Structural Validation                                         | BEH-SF-586--593                                   |
