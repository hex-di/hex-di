---
id: FM-SF-031
kind: risk-assessment
title: Cost and Memory Failure Modes
status: active
fm_range: 031--036
invariants: [INV-SF-1, INV-SF-2, INV-SF-4, INV-SF-5, INV-SF-6, INV-SF-7]
---

# Cost and Memory Failure Modes

Token budgets, memory generation, cost optimization, and session history failures.

| FM ID     | Failure Mode                                                      | S   | O   | D   | RPN | Risk Level   | Mitigation                                                                                                                                                                                        | Behaviors                                                                                                             |
| --------- | ----------------------------------------------------------------- | --- | --- | --- | --- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| FM-SF-031 | ACP Session history loss (append-only violation, storage failure) | 8   | 3   | 5   | 120 | Unacceptable | Append-only session history ([INV-SF-1](../invariants/INV-SF-1-acp-session-history-append-only.md)); write-ahead log for storage backend; session history checksum verification on read           | [BEH-SF-235](../behaviors/BEH-SF-229-acp-messaging.md)                                                                |
| FM-SF-032 | Agent session isolation breach (cross-session data leak)          | 8   | 2   | 3   | 48  | Acceptable   | Session-scoped context boundaries ([INV-SF-2](../invariants/INV-SF-2-agent-session-isolation.md)); session ID validated on every message exchange; isolation enforced by SessionManager           | [BEH-SF-032](../behaviors/BEH-SF-025-agent-sessions.md), [BEH-SF-048](../behaviors/BEH-SF-041-agent-communication.md) |
| FM-SF-033 | Dependency cycle in flow execution (deadlock)                     | 5   | 2   | 3   | 30  | Acceptable   | Dependency graph validated at flow registration time ([INV-SF-4](../invariants/INV-SF-4-dependency-respecting-execution.md)); cycle detection rejects invalid flow definitions before execution   | [BEH-SF-062](../behaviors/BEH-SF-057-flow-execution.md)                                                               |
| FM-SF-034 | Tool isolation bypass (unauthorized tool access)                  | 8   | 2   | 3   | 48  | Acceptable   | Tool permissions enforced per agent role ([INV-SF-5](../invariants/INV-SF-5-tool-isolation.md)); tool access requests validated against role manifest; all tool invocations audited               | [BEH-SF-081](../behaviors/BEH-SF-081-tool-isolation.md), [BEH-SF-083](../behaviors/BEH-SF-081-tool-isolation.md)      |
| FM-SF-035 | Filesystem flush interrupted mid-write (partial file on disk)     | 5   | 3   | 5   | 75  | Conditional  | Atomic write via temp file + rename ([INV-SF-6](../invariants/INV-SF-6-atomic-filesystem-flush.md)); partial writes detected on next read via content hash mismatch; idempotent re-flush recovers | [BEH-SF-016](../behaviors/BEH-SF-009-session-materialization.md)                                                      |
| FM-SF-036 | Graph data persistence failure (transaction rollback)             | 8   | 3   | 3   | 72  | Conditional  | Transactional writes with automatic rollback ([INV-SF-7](../invariants/INV-SF-7-graph-data-persistence.md)); retry with exponential backoff; bounded buffer absorbs transient failures            | [BEH-SF-001](../behaviors/BEH-SF-001-graph-operations.md), [BEH-SF-003](../behaviors/BEH-SF-001-graph-operations.md)  |
