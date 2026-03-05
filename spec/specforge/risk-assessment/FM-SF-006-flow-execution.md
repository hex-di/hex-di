---
id: FM-SF-006
kind: risk-assessment
title: Flow Execution Failure Modes
status: active
fm_range: 006--012
invariants: []
---

# Flow Execution Failure Modes

Flow convergence, scheduling, phase execution, and state management failures.

| FM ID     | Failure Mode                                  | S   | O   | D   | RPN | Risk Level   | Mitigation                                                    | Behaviors                                                 |
| --------- | --------------------------------------------- | --- | --- | --- | --- | ------------ | ------------------------------------------------------------- | --------------------------------------------------------- |
| FM-SF-006 | Concurrent ACP message write conflict         | 3   | 5   | 3   | 45  | Acceptable   | Write serialization via ACP session append-only semantics     | [BEH-SF-238](../behaviors/BEH-SF-229-acp-messaging.md)    |
| FM-SF-007 | Graph sync conflict (concurrent mutations)    | 5   | 3   | 5   | 75  | Conditional  | Last-writer-wins with conflict logging                        | [BEH-SF-005](../behaviors/BEH-SF-001-graph-operations.md) |
| FM-SF-008 | Session snapshot corruption                   | 8   | 3   | 8   | 192 | Unacceptable | Re-spawn from last successful turn, compose from prior chunks | [BEH-SF-029](../behaviors/BEH-SF-025-agent-sessions.md)   |
| FM-SF-009 | Partial materialization on cancel             | 3   | 5   | 3   | 45  | Acceptable   | Chunks carry `partial: true` metadata                         | [BEH-SF-067](../behaviors/BEH-SF-065-flow-lifecycle.md)   |
| FM-SF-010 | Clarification request deadlock (no responder) | 5   | 3   | 5   | 75  | Conditional  | Timeout -- flow continues without response                    | [BEH-SF-232](../behaviors/BEH-SF-229-acp-messaging.md)    |
| FM-SF-011 | Custom flow definition invalid                | 3   | 5   | 3   | 45  | Acceptable   | Validation at registration time                               | [BEH-SF-055](../behaviors/BEH-SF-049-flow-definitions.md) |
| FM-SF-012 | OAuth token expired during flow               | 5   | 5   | 3   | 75  | Conditional  | Refresh token rotation (30-day lifetime)                      | [BEH-SF-104](../behaviors/BEH-SF-101-authentication.md)   |
