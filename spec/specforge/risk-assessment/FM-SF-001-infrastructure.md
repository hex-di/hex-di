---
id: FM-SF-001
kind: risk-assessment
title: Infrastructure Failure Modes
status: active
fm_range: 001--005
invariants: [INV-SF-10, INV-SF-3]
---

# Infrastructure Failure Modes

Neo4j, agent subprocess, CLI, disk, and network failure modes.

| FM ID     | Failure Mode                                         | S   | O   | D   | RPN | Risk Level   | Mitigation                                                                                                | Behaviors                                                 |
| --------- | ---------------------------------------------------- | --- | --- | --- | --- | ------------ | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| FM-SF-001 | Neo4j unavailable during flow execution              | 8   | 5   | 3   | 120 | Unacceptable | Bounded buffer + replay on reconnect ([INV-SF-10](../invariants/INV-SF-10-graph-acp-sync-consistency.md)) | [BEH-SF-004](../behaviors/BEH-SF-001-graph-operations.md) |
| FM-SF-002 | Agent subprocess crash (OOM, unexpected termination) | 5   | 5   | 3   | 75  | Conditional  | Crash recorded as finding, re-spawn on next iteration                                                     | [BEH-SF-070](../behaviors/BEH-SF-065-flow-lifecycle.md)   |
| FM-SF-003 | Claude Code CLI subprocess failure                   | 8   | 3   | 3   | 72  | Conditional  | Exponential backoff (5 retries), auto-pause flow                                                          | [BEH-SF-065](../behaviors/BEH-SF-065-flow-lifecycle.md)   |
| FM-SF-004 | Token budget exhausted mid-phase                     | 5   | 5   | 3   | 75  | Conditional  | BudgetExceededError signal, agent wraps up gracefully                                                     | [BEH-SF-077](../behaviors/BEH-SF-073-token-budgeting.md)  |
| FM-SF-005 | Convergence never reached (oscillating findings)     | 5   | 3   | 5   | 75  | Conditional  | Max iteration bound ([INV-SF-3](../invariants/INV-SF-3-convergence-bound.md))                             | [BEH-SF-058](../behaviors/BEH-SF-057-flow-execution.md)   |
