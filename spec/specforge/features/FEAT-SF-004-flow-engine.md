---
id: FEAT-SF-004
kind: feature
title: "Flow Engine"
status: active
behaviors:
  [
    BEH-SF-049,
    BEH-SF-050,
    BEH-SF-051,
    BEH-SF-052,
    BEH-SF-053,
    BEH-SF-054,
    BEH-SF-055,
    BEH-SF-056,
    BEH-SF-057,
    BEH-SF-058,
    BEH-SF-059,
    BEH-SF-060,
    BEH-SF-061,
    BEH-SF-062,
    BEH-SF-063,
    BEH-SF-064,
    BEH-SF-065,
    BEH-SF-066,
    BEH-SF-067,
    BEH-SF-068,
    BEH-SF-069,
    BEH-SF-070,
    BEH-SF-071,
    BEH-SF-072,
    BEH-SF-303,
    BEH-SF-304,
    BEH-SF-362,
  ]
adrs: [ADR-007]
roadmap_phases: [RM-01, RM-02]
---

# Flow Engine

## Problem

Specification workflows involve multi-phase processes (discovery, authoring, review, synthesis) that must converge to quality criteria. Manual orchestration of these phases is error-prone, with no guarantee of termination or quality bounds.

## Solution

Flows are declarative data structures defining sequences of phases, each with convergence criteria, agent assignments, and iteration bounds. The flow engine executes phases in order, looping each until convergence criteria are met or iteration limits are reached. Five predefined flows cover common workflows (spec-writing, reverse-engineering, code-review, risk-assessment, onboarding), with extensibility for custom flows. The engine handles progressive and batch execution modes, budget zones, schema validation, scheduling, analytics, and infrastructure service ports.

## Constituent Behaviors

| ID             | Summary                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| BEH-SF-049     | Spec-writing flow definition                                                                           |
| BEH-SF-050     | Reverse-engineering flow definition                                                                    |
| BEH-SF-051     | Code-review flow definition                                                                            |
| BEH-SF-052     | Risk-assessment flow definition                                                                        |
| BEH-SF-053     | Onboarding flow definition                                                                             |
| BEH-SF-054     | Custom flow registration                                                                               |
| BEH-SF-055     | Flow preset configuration                                                                              |
| BEH-SF-056     | Flow validation at registration                                                                        |
| BEH-SF-057     | Convergence evaluation after each iteration                                                            |
| BEH-SF-058     | Phase termination on convergence or max iterations                                                     |
| BEH-SF-059     | Progressive execution within a phase                                                                   |
| BEH-SF-060     | Batch execution mode                                                                                   |
| BEH-SF-061     | Flow-level error handling                                                                              |
| BEH-SF-062     | Phase transition logic                                                                                 |
| BEH-SF-063     | Iteration context accumulation                                                                         |
| BEH-SF-064     | Flow completion and result assembly                                                                    |
| BEH-SF-065     | Flow pause                                                                                             |
| BEH-SF-066     | Flow resume from paused state                                                                          |
| BEH-SF-067     | Flow cancellation                                                                                      |
| BEH-SF-068     | Crash recovery and state reconstruction                                                                |
| BEH-SF-069     | Failed phase retry                                                                                     |
| BEH-SF-070     | Flow timeout enforcement                                                                               |
| BEH-SF-071     | Flow event emission                                                                                    |
| BEH-SF-072     | Flow audit trail                                                                                       |
| BEH-SF-303–319 | Budget zones, schema validation, flow errors, convergence, scheduling, analytics, infrastructure ports |
| BEH-SF-337–352 | Infrastructure service behaviors                                                                       |
| BEH-SF-367–369 | Convergence evaluation mechanics                                                                       |
| BEH-SF-381–383 | Phase scheduling                                                                                       |
| BEH-SF-384–386 | Analytics and metrics collection                                                                       |

## Acceptance Criteria

- [ ] All 5 predefined flows execute to convergence
- [ ] Custom flows can be registered and validated
- [ ] Convergence evaluation correctly terminates phases
- [ ] Pause/resume/cancel lifecycle works reliably
- [ ] Crash recovery reconstructs flow state from persisted data
- [ ] Budget zones enforce token limits per phase
- [ ] Analytics capture execution metrics for all flows
