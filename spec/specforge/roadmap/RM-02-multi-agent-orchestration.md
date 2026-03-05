---
id: RM-02
title: "Phase 2: Multi-Agent Orchestration"
kind: roadmap
status: Planned
dependencies: []
---

## Phase 2: Multi-Agent Orchestration

**Goal:** Full flow execution with 8 agent roles, convergence loops, scheduling.
**Source:** [dynamic-flow-execution.md](../architecture/dynamic-flow-execution.md), [c3-server.md](../architecture/c3-server.md)

### Deliverables

| #         | Deliverable                  | Package               | Behaviors                | Status  |
| --------- | ---------------------------- | --------------------- | ------------------------ | ------- |
| WI-PH-2-1 | Scheduler                    | `@specforge/server`   | BEH-SF-062–064           | Planned |
| WI-PH-2-2 | Agent roles (8)              | `@specforge/server`   | BEH-SF-017–024           | Planned |
| WI-PH-2-3 | Inter-agent communication    | `@specforge/server`   | BEH-SF-041–048           | Planned |
| WI-PH-2-4 | Convergence loops            | `@specforge/server`   | BEH-SF-057–058           | Planned |
| WI-PH-2-5 | Spec Writing flow            | `@specforge/server`   | BEH-SF-049               | Planned |
| WI-PH-2-6 | Token budgeting              | `@specforge/server`   | BEH-SF-073–080           | Planned |
| WI-PH-2-7 | Protocol extension framework | `@specforge/protocol` | BEH-SF-496–503 (ADR-020) | Planned |

### Architecture Coverage

- [dynamic-flow-execution.md](../architecture/dynamic-flow-execution.md) — Full flow lifecycle
- [c3-server.md](../architecture/c3-server.md) — Session Manager, Scheduler

### Exit Criteria

- [ ] EC-PH-2-1: Spec Writing flow runs end-to-end with convergence
- [ ] EC-PH-2-2: Multiple agents execute concurrently within a stage
- [ ] EC-PH-2-3: Token budget limits enforce correctly

### Risk

- LLM convergence reliability; flows may not converge within budget — mitigate with configurable iteration caps
