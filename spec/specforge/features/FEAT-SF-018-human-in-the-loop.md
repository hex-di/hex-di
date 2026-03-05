---
id: FEAT-SF-018
kind: feature
title: "Human-in-the-Loop"
status: active
behaviors: [BEH-SF-121, BEH-SF-122, BEH-SF-123, BEH-SF-124, BEH-SF-125, BEH-SF-126]
adrs: [ADR-007]
roadmap_phases: [RM-06]
---

# Human-in-the-Loop

## Problem

Fully autonomous agent workflows can produce incorrect or inappropriate outputs. Humans need structured intervention points to provide feedback, correct course, and approve critical decisions without breaking the flow execution model.

## Solution

Human-in-the-loop (HITL) integrates structured feedback mechanisms into the flow engine. Humans can inject feedback messages that agents prioritize in subsequent iterations, use CLI commands to provide real-time guidance, intervene at phase boundaries, and gate critical transitions behind approval. The synthesizer agent prioritizes human feedback above other inputs to ensure corrections are acted on.

## Constituent Behaviors

| ID         | Summary                                     |
| ---------- | ------------------------------------------- |
| BEH-SF-121 | Human feedback message injection            |
| BEH-SF-122 | CLI feedback command (`specforge feedback`) |
| BEH-SF-123 | Synthesizer priority for human feedback     |
| BEH-SF-124 | Phase intervention (pause at boundary)      |
| BEH-SF-125 | Approval gates at phase transitions         |
| BEH-SF-126 | HITL timeout and escalation                 |

## Acceptance Criteria

- [ ] Human feedback messages are delivered to the active agent session
- [ ] CLI feedback command works during active flow execution
- [ ] Synthesizer agent prioritizes human feedback over agent-generated input
- [ ] Phase intervention pauses flow at the correct boundary
- [ ] Approval gates block transition until human approves
- [ ] Timeout escalation handles unresponsive human reviewers
