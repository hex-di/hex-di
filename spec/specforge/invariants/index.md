# Invariants

Runtime guarantees that SpecForge maintains at all times.

| ID        | Invariant                                     | File                                                                                                                       |
| --------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| INV-SF-1  | ACP Session History Append-Only               | [INV-SF-1-acp-session-history-append-only.md](./INV-SF-1-acp-session-history-append-only.md)                               |
| INV-SF-2  | Agent Session Isolation                       | [INV-SF-2-agent-session-isolation.md](./INV-SF-2-agent-session-isolation.md)                                               |
| INV-SF-3  | Convergence Bound                             | [INV-SF-3-convergence-bound.md](./INV-SF-3-convergence-bound.md)                                                           |
| INV-SF-4  | Dependency-Respecting Execution               | [INV-SF-4-dependency-respecting-execution.md](./INV-SF-4-dependency-respecting-execution.md)                               |
| INV-SF-5  | Tool Isolation                                | [INV-SF-5-tool-isolation.md](./INV-SF-5-tool-isolation.md)                                                                 |
| INV-SF-6  | Atomic Filesystem Flush                       | [INV-SF-6-atomic-filesystem-flush.md](./INV-SF-6-atomic-filesystem-flush.md)                                               |
| INV-SF-7  | Graph Data Persistence                        | [INV-SF-7-graph-data-persistence.md](./INV-SF-7-graph-data-persistence.md)                                                 |
| INV-SF-8  | Rendering Fidelity                            | [INV-SF-8-rendering-fidelity.md](./INV-SF-8-rendering-fidelity.md)                                                         |
| INV-SF-9  | Flow Determinism                              | [INV-SF-9-flow-determinism.md](./INV-SF-9-flow-determinism.md)                                                             |
| INV-SF-10 | Graph-ACP Sync Consistency                    | [INV-SF-10-graph-acp-sync-consistency.md](./INV-SF-10-graph-acp-sync-consistency.md)                                       |
| INV-SF-11 | Session Chunk Immutability                    | [INV-SF-11-session-chunk-immutability.md](./INV-SF-11-session-chunk-immutability.md)                                       |
| INV-SF-12 | Hook Pipeline Ordering                        | [INV-SF-12-hook-pipeline-ordering.md](./INV-SF-12-hook-pipeline-ordering.md)                                               |
| INV-SF-13 | Structured Output Schema Compliance           | [INV-SF-13-structured-output-schema-compliance.md](./INV-SF-13-structured-output-schema-compliance.md)                     |
| INV-SF-14 | Memory Artifact Traceability                  | [INV-SF-14-memory-artifact-traceability.md](./INV-SF-14-memory-artifact-traceability.md)                                   |
| INV-SF-15 | Budget Zone Monotonicity                      | [INV-SF-15-budget-zone-monotonicity.md](./INV-SF-15-budget-zone-monotonicity.md)                                           |
| INV-SF-16 | Permission Escalation Requires Explicit Grant | [INV-SF-16-permission-escalation-requires-explicit-grant.md](./INV-SF-16-permission-escalation-requires-explicit-grant.md) |
| INV-SF-17 | MCP Server Health Gate                        | [INV-SF-17-mcp-server-health-gate.md](./INV-SF-17-mcp-server-health-gate.md)                                               |
| INV-SF-18 | ACP Run State Consistency                     | [INV-SF-18-acp-run-state-consistency.md](./INV-SF-18-acp-run-state-consistency.md)                                         |
| INV-SF-19 | Degraded Mode                                 | [INV-SF-19-degraded-mode.md](./INV-SF-19-degraded-mode.md)                                                                 |
| INV-SF-20 | Idempotent Graph Sync                         | [INV-SF-20-idempotent-graph-sync.md](./INV-SF-20-idempotent-graph-sync.md)                                                 |
| INV-SF-21 | Flow Definition Capability Validation         | [INV-SF-21-flow-definition-capability-validation.md](./INV-SF-21-flow-definition-capability-validation.md)                 |
| INV-SF-22 | ACP Message Ordering                          | [INV-SF-22-acp-message-ordering.md](./INV-SF-22-acp-message-ordering.md)                                                   |
| INV-SF-23 | Session Resource Cleanup Deadline             | [INV-SF-23-session-resource-cleanup-deadline.md](./INV-SF-23-session-resource-cleanup-deadline.md)                         |
| INV-SF-24 | Mode Detection Determinism                    | [INV-SF-24-mode-detection-determinism.md](./INV-SF-24-mode-detection-determinism.md)                                       |
| INV-SF-25 | Error Object Immutability                     | [INV-SF-25-error-object-immutability.md](./INV-SF-25-error-object-immutability.md)                                         |
| INV-SF-26 | Graph Mutation Schema Validation              | [INV-SF-26-graph-mutation-schema-validation.md](./INV-SF-26-graph-mutation-schema-validation.md)                           |
| INV-SF-27 | ACP Message Delivery Guarantee                | [INV-SF-27-acp-message-delivery-guarantee.md](./INV-SF-27-acp-message-delivery-guarantee.md)                               |
| INV-SF-28 | Clarification Timeout Bound                   | [INV-SF-28-clarification-timeout-bound.md](./INV-SF-28-clarification-timeout-bound.md)                                     |
| INV-SF-29 | Server Startup Atomicity                      | [INV-SF-29-server-startup-atomicity.md](./INV-SF-29-server-startup-atomicity.md)                                           |
| INV-SF-30 | Session History Bounded Growth                | [INV-SF-30-session-history-bounded-growth.md](./INV-SF-30-session-history-bounded-growth.md)                               |
| INV-SF-31 | Graph Sync Rebuild Atomicity                  | [INV-SF-31-graph-sync-rebuild-atomicity.md](./INV-SF-31-graph-sync-rebuild-atomicity.md)                                   |
| INV-SF-32 | GxP Hash Chain Continuity                     | [INV-SF-32-gxp-hash-chain-continuity.md](./INV-SF-32-gxp-hash-chain-continuity.md)                                         |
