---
id: FEAT-SF-035
kind: feature
title: "Session Replay & Debugging"
status: active
behaviors:
  [BEH-SF-408, BEH-SF-409, BEH-SF-410, BEH-SF-411, BEH-SF-412, BEH-SF-413, BEH-SF-414, BEH-SF-415]
adrs: [ADR-006]
roadmap_phases: [RM-10]
---

# Session Replay & Debugging

## Problem

When a flow fails to converge or produces unexpected results, debugging is difficult. Agent decision-making is opaque — there is no way to see what context was provided, what tools were called, what tokens were consumed, or why the agent chose a particular action.

## Solution

The SessionSnapshotStorePort persists full session snapshots including context assembly, tool calls, outputs, token usage, and convergence signals. Session replay allows operators to step through a completed or failed session like a debugger — seeing each tool call, its input/output, and the agent's reasoning. The replay view highlights convergence evaluation points, showing why a phase terminated or continued. Debugging tools include session diff (compare two sessions), context inspection (what chunks were composed), and decision tracing (follow the agent's action chain).

## Constituent Behaviors

| ID         | Summary                                          |
| ---------- | ------------------------------------------------ |
| BEH-SF-408 | Session snapshot persistence                     |
| BEH-SF-409 | Session replay — step through tool calls         |
| BEH-SF-410 | Context inspection — view composed chunks        |
| BEH-SF-411 | Decision tracing — follow agent action chain     |
| BEH-SF-412 | Session diff — compare two sessions side-by-side |
| BEH-SF-413 | Token usage breakdown per tool call              |
| BEH-SF-414 | Convergence signal visualization                 |
| BEH-SF-415 | Export session replay as shareable report        |

## Acceptance Criteria

- [ ] Full session snapshots are persisted for replay
- [ ] Replay UI steps through tool calls chronologically
- [ ] Context inspection shows exactly which chunks were composed into the session
- [ ] Decision tracing links agent actions to their causes
- [ ] Session diff highlights differences between successful and failed runs
- [ ] Token usage is visible per tool call and per phase
