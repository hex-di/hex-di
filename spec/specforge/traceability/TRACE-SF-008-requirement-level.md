---
id: TRACE-SF-008
title: "Requirement-Level Traceability"
kind: traceability
status: active
scope: adr
---

## Requirement-Level Traceability

Behavior ID allocation ranges and counts per specification file.

| Spec File                                                                                | BEH-SF Range             | Count |
| ---------------------------------------------------------------------------------------- | ------------------------ | ----- |
| [01-graph-operations.md](../behaviors/BEH-SF-001-graph-operations.md)                    | BEH-SF-001 -- BEH-SF-008 | 8     |
| [02-session-materialization.md](../behaviors/BEH-SF-009-session-materialization.md)      | BEH-SF-009 -- BEH-SF-016 | 8     |
| [03-agent-roles.md](../behaviors/BEH-SF-017-agent-roles.md)                              | BEH-SF-017 -- BEH-SF-024 | 8     |
| [04-agent-sessions.md](../behaviors/BEH-SF-025-agent-sessions.md)                        | BEH-SF-025 -- BEH-SF-032 | 8     |
| [05-blackboard.md](../behaviors/BEH-SF-033-blackboard.md) (superseded)                   | BEH-SF-033 -- BEH-SF-040 | 8     |
| [06-agent-communication.md](../behaviors/BEH-SF-041-agent-communication.md) (superseded) | BEH-SF-041 -- BEH-SF-048 | 8     |
| [07-flow-definitions.md](../behaviors/BEH-SF-049-flow-definitions.md)                    | BEH-SF-049 -- BEH-SF-056 | 8     |
| [08-flow-execution.md](../behaviors/BEH-SF-057-flow-execution.md)                        | BEH-SF-057 -- BEH-SF-064 | 8     |
| [09-flow-lifecycle.md](../behaviors/BEH-SF-065-flow-lifecycle.md)                        | BEH-SF-065 -- BEH-SF-072 | 8     |
| [10-token-budgeting.md](../behaviors/BEH-SF-073-token-budgeting.md)                      | BEH-SF-073 -- BEH-SF-080 | 8     |
| [11-tool-isolation.md](../behaviors/BEH-SF-081-tool-isolation.md)                        | BEH-SF-081 -- BEH-SF-086 | 6     |
| [12-extensibility.md](../behaviors/BEH-SF-087-extensibility.md)                          | BEH-SF-087 -- BEH-SF-094 | 8     |
| [13-deployment-modes.md](../behaviors/BEH-SF-095-deployment-modes.md)                    | BEH-SF-095 -- BEH-SF-100 | 6     |
| [14-authentication.md](../behaviors/BEH-SF-101-authentication.md)                        | BEH-SF-101 -- BEH-SF-106 | 6     |
| [15-cloud-services.md](../behaviors/BEH-SF-107-cloud-services.md)                        | BEH-SF-107 -- BEH-SF-112 | 6     |
| [16-cli.md](../behaviors/BEH-SF-113-cli.md)                                              | BEH-SF-113 -- BEH-SF-120 | 8     |
| [17-human-in-the-loop.md](../behaviors/BEH-SF-121-human-in-the-loop.md)                  | BEH-SF-121 -- BEH-SF-126 | 6     |
| [18-import-export.md](../behaviors/BEH-SF-127-import-export.md)                          | BEH-SF-127 -- BEH-SF-132 | 6     |
| [19-web-dashboard.md](../behaviors/BEH-SF-133-web-dashboard.md)                          | BEH-SF-133 -- BEH-SF-138 | 6     |
| [20-vscode-extension.md](../behaviors/BEH-SF-139-vscode-extension.md)                    | BEH-SF-139 -- BEH-SF-142 | 4     |
| [21-collaboration.md](../behaviors/BEH-SF-143-collaboration.md)                          | BEH-SF-143 -- BEH-SF-150 | 8     |
| [22-claude-code-adapter.md](../behaviors/BEH-SF-151-claude-code-adapter.md) (superseded) | BEH-SF-151 -- BEH-SF-160 | 10    |
| [23-hook-pipeline.md](../behaviors/BEH-SF-161-hook-pipeline.md)                          | BEH-SF-161 -- BEH-SF-168 | 8     |
| [24-cost-optimization.md](../behaviors/BEH-SF-169-cost-optimization.md)                  | BEH-SF-169 -- BEH-SF-176 | 8     |
| [25-memory-generation.md](../behaviors/BEH-SF-177-memory-generation.md)                  | BEH-SF-177 -- BEH-SF-184 | 8     |
| [26-dynamic-agents.md](../behaviors/BEH-SF-185-dynamic-agents.md)                        | BEH-SF-185 -- BEH-SF-192 | 8     |
| [27-mcp-composition.md](../behaviors/BEH-SF-193-mcp-composition.md)                      | BEH-SF-193 -- BEH-SF-200 | 8     |
| [28-permission-governance.md](../behaviors/BEH-SF-201-permission-governance.md)          | BEH-SF-201 -- BEH-SF-208 | 8     |
| [29-desktop-app.md](../behaviors/BEH-SF-273-desktop-app.md)                              | BEH-SF-273 -- BEH-SF-281 | 9     |
| [30-acp-server.md](../behaviors/BEH-SF-209-acp-server.md)                                | BEH-SF-209 -- BEH-SF-218 | 10    |
| [31-acp-client.md](../behaviors/BEH-SF-219-acp-client.md)                                | BEH-SF-219 -- BEH-SF-228 | 10    |
| [32-acp-messaging.md](../behaviors/BEH-SF-229-acp-messaging.md)                          | BEH-SF-229 -- BEH-SF-238 | 10    |
| [33-agent-backend.md](../behaviors/BEH-SF-239-agent-backend.md)                          | BEH-SF-239 -- BEH-SF-248 | 10    |

#### Gap-Fill Behaviors (BEH-SF-300+)

Behaviors added during gap analysis remediation.

| Spec File                                                                           | BEH-SF Range                         | Count |
| ----------------------------------------------------------------------------------- | ------------------------------------ | ----- |
| [01-graph-operations.md](../behaviors/BEH-SF-001-graph-operations.md)               | BEH-SF-300 -- BEH-SF-302             | 3     |
| [08-flow-execution.md](../behaviors/BEH-SF-057-flow-execution.md)                   | BEH-SF-303 -- BEH-SF-319             | 17    |
| [30-acp-server.md](../behaviors/BEH-SF-209-acp-server.md)                           | BEH-SF-320 -- BEH-SF-324             | 5     |
| [33-agent-backend.md](../behaviors/BEH-SF-239-agent-backend.md)                     | BEH-SF-325 -- BEH-SF-329             | 5     |
| [16-cli.md](../behaviors/BEH-SF-113-cli.md)                                         | BEH-SF-330 -- BEH-SF-334             | 5     |
| [13-deployment-modes.md](../behaviors/BEH-SF-095-deployment-modes.md)               | BEH-SF-DEPLOY-01 -- BEH-SF-DEPLOY-21 | 21    |
| [08-flow-execution.md](../behaviors/BEH-SF-057-flow-execution.md)                   | BEH-SF-337 -- BEH-SF-358             | 22    |
| [04-agent-sessions.md](../behaviors/BEH-SF-025-agent-sessions.md)                   | BEH-SF-365 -- BEH-SF-366             | 2     |
| [08-flow-execution.md](../behaviors/BEH-SF-057-flow-execution.md)                   | BEH-SF-367 -- BEH-SF-369             | 3     |
| [08-flow-execution.md](../behaviors/BEH-SF-057-flow-execution.md)                   | BEH-SF-381 -- BEH-SF-383             | 3     |
| [08-flow-execution.md](../behaviors/BEH-SF-057-flow-execution.md)                   | BEH-SF-384 -- BEH-SF-386             | 3     |
| [04-agent-sessions.md](../behaviors/BEH-SF-025-agent-sessions.md)                   | BEH-SF-387 -- BEH-SF-388             | 2     |
| [04-agent-sessions.md](../behaviors/BEH-SF-025-agent-sessions.md)                   | BEH-SF-389 -- BEH-SF-391             | 3     |
| [02-session-materialization.md](../behaviors/BEH-SF-009-session-materialization.md) | BEH-SF-392 -- BEH-SF-394             | 3     |
| [30-acp-server.md](../behaviors/BEH-SF-209-acp-server.md)                           | BEH-SF-395 -- BEH-SF-396             | 2     |

#### Plugin Behaviors (BEH-SF-370+)

| Spec File                                   | BEH-SF Range             | Count |
| ------------------------------------------- | ------------------------ | ----- |
| [plugins/PLG-gxp.md](../plugins/PLG-gxp.md) | BEH-SF-370 -- BEH-SF-379 | 10    |

#### Roadmap Expansion Behaviors (BEH-SF-400+)

Reserved for future implementation phases. See [roadmap/index.md](../roadmap/index.md) for allocation.

| Phase                                                                               | BEH-SF Range             | Count |
| ----------------------------------------------------------------------------------- | ------------------------ | ----- |
| Phase 9 (Cost Intelligence)                                                         | BEH-SF-400 -- BEH-SF-407 | 8     |
| Phase 10 (Agent Patterns)                                                           | BEH-SF-408 -- BEH-SF-423 | 16    |
| Phase 11 (Structured Output + Stress)                                               | BEH-SF-424 -- BEH-SF-431 | 8     |
| Phase 12 (Event Flows)                                                              | BEH-SF-432 -- BEH-SF-439 | 8     |
| [BEH-SF-594-notification-engine.md](../behaviors/BEH-SF-594-notification-engine.md) | BEH-SF-594 -- BEH-SF-597 | 4     |
| [BEH-SF-598-ci-gate-drift-core.md](../behaviors/BEH-SF-598-ci-gate-drift-core.md)   | BEH-SF-598 -- BEH-SF-601 | 4     |
| Phase 13 (Ecosystem)                                                                | BEH-SF-440 -- BEH-SF-447 | 8     |
| Phase 14 (Intelligence)                                                             | BEH-SF-448 -- BEH-SF-455 | 8     |
| Phase 15 (Autonomous)                                                               | BEH-SF-456 -- BEH-SF-463 | 8     |

**Total:** ~353 active behaviors across the BEH-SF-001 through BEH-SF-601 range, plus 64 roadmap-reserved behaviors in the BEH-SF-400--463 range. 3 behavior files are superseded (05, 06, 22).

> **Behavior Count:** The specification contains ~353 active behavioral requirements. This total excludes behaviors in superseded files (05, 06, 22) and the reserved ID range 249--272. Gap-fill behaviors use the BEH-SF-300+ range. Plugin behaviors use BEH-SF-370+. Renumbered collision-fix behaviors use BEH-SF-367--369, BEH-SF-381--396. Roadmap expansion behaviors use BEH-SF-400+. Collision-fix behaviors for notification engine (BEH-SF-594--597) and CI gate core (BEH-SF-598--601) use BEH-SF-594+.

> **Reserved Range:** BEH-SF-249 through BEH-SF-272 are reserved IDs. These IDs were originally allocated for the gap between file 33 (`BEH-SF-239--248`) and file 29 (`BEH-SF-273--281`). They are held in reserve for future behavior files and MUST NOT be assigned to existing files. BEH-SF-380--399 were previously reserved for future plugin behaviors; BEH-SF-381--396 are now allocated to renumbered behaviors (collision fixes).

### Superseded Files

The following behavior files have been superseded by architectural changes and are retained for historical reference only. Their behaviors are no longer active but remain in the traceability chain for audit purposes.

| File                                                                        | Status     | Superseded By                                                   | Reason                                                                                                                       |
| --------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [05-blackboard.md](../behaviors/BEH-SF-033-blackboard.md)                   | Superseded | [32-acp-messaging.md](../behaviors/BEH-SF-229-acp-messaging.md) | Blackboard communication replaced by ACP messaging ([ADR-018](../decisions/ADR-018-acp-agent-protocol.md))                   |
| [06-agent-communication.md](../behaviors/BEH-SF-041-agent-communication.md) | Superseded | [32-acp-messaging.md](../behaviors/BEH-SF-229-acp-messaging.md) | Inter-agent communication now routed through ACP messages ([ADR-018](../decisions/ADR-018-acp-agent-protocol.md))            |
| [22-claude-code-adapter.md](../behaviors/BEH-SF-151-claude-code-adapter.md) | Superseded | [33-agent-backend.md](../behaviors/BEH-SF-239-agent-backend.md) | ClaudeCodeAdapter refactored as AgentBackendService behind ACP layer ([ADR-018](../decisions/ADR-018-acp-agent-protocol.md)) |
