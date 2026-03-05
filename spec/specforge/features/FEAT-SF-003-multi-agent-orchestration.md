---
id: FEAT-SF-003
kind: feature
title: "Multi-Agent Orchestration"
status: active
behaviors:
  [
    BEH-SF-017,
    BEH-SF-018,
    BEH-SF-019,
    BEH-SF-020,
    BEH-SF-021,
    BEH-SF-022,
    BEH-SF-023,
    BEH-SF-024,
    BEH-SF-041,
    BEH-SF-042,
    BEH-SF-043,
    BEH-SF-044,
    BEH-SF-045,
    BEH-SF-046,
    BEH-SF-047,
    BEH-SF-048,
    BEH-SF-185,
    BEH-SF-186,
    BEH-SF-187,
    BEH-SF-188,
    BEH-SF-189,
    BEH-SF-190,
    BEH-SF-191,
    BEH-SF-192,
  ]
adrs: [ADR-015]
roadmap_phases: [RM-02, RM-10]
---

# Multi-Agent Orchestration

## Problem

Complex specification tasks require diverse expertise — discovery, authoring, review, synthesis, task decomposition, development, analysis, and coverage. A single agent cannot effectively cover all these roles, and coordinating multiple specialized agents requires structured communication and dynamic role management.

## Solution

Eight consolidated agent roles (discovery, spec-author, reviewer, synthesizer, task-decomposer, dev, analyzer, coverage) each have defined tool access, output schemas, and convergence criteria. Agents communicate through the ACP messaging layer (superseding the original blackboard pattern). Dynamic agent roles can be instantiated at runtime via role factories, activation predicates, parameterized templates, and skill injection — enabling the system to adapt its agent team composition to the task at hand.

## Constituent Behaviors

| ID         | Summary                                         |
| ---------- | ----------------------------------------------- |
| BEH-SF-017 | Discovery agent role definition and tool access |
| BEH-SF-018 | Spec-author agent role definition               |
| BEH-SF-019 | Reviewer agent role definition                  |
| BEH-SF-020 | Synthesizer agent role definition               |
| BEH-SF-021 | Task-decomposer agent role definition           |
| BEH-SF-022 | Dev agent role definition                       |
| BEH-SF-023 | Analyzer agent role definition                  |
| BEH-SF-024 | Coverage agent role definition                  |
| BEH-SF-041 | Agent-to-agent message delivery                 |
| BEH-SF-042 | Message ordering and consistency                |
| BEH-SF-043 | Broadcast messages to all agents                |
| BEH-SF-044 | Point-to-point agent messaging                  |
| BEH-SF-045 | Message acknowledgment and retry                |
| BEH-SF-046 | Agent coordination protocols                    |
| BEH-SF-047 | Conflict resolution in multi-agent writes       |
| BEH-SF-048 | Agent communication failure handling            |
| BEH-SF-185 | Dynamic role factory instantiation              |
| BEH-SF-186 | Activation predicates for role spawning         |
| BEH-SF-187 | Parameterized role templates                    |
| BEH-SF-188 | Skill injection into dynamic roles              |
| BEH-SF-189 | Dynamic role lifecycle management               |
| BEH-SF-190 | Role capability negotiation                     |
| BEH-SF-191 | Agent team composition strategies               |
| BEH-SF-192 | Dynamic role deactivation and cleanup           |

## Acceptance Criteria

- [ ] All 8 agent roles are defined with distinct tool access and output schemas
- [ ] Inter-agent messaging delivers messages reliably with ordering
- [ ] Dynamic roles can be instantiated from templates at runtime
- [ ] Activation predicates correctly trigger role spawning
- [ ] Skill injection extends role capabilities without modifying templates
- [ ] Agent teams adapt composition based on task requirements
