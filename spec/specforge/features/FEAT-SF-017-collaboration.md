---
id: FEAT-SF-017
kind: feature
title: "Collaboration"
status: active
behaviors:
  [BEH-SF-143, BEH-SF-144, BEH-SF-145, BEH-SF-146, BEH-SF-147, BEH-SF-148, BEH-SF-149, BEH-SF-150]
adrs: [ADR-009]
roadmap_phases: [RM-07]
---

# Collaboration

## Problem

Specification work is inherently collaborative — multiple team members need to observe flows, comment on findings, approve changes, and work across multiple projects. Single-user workflows don't scale to team adoption.

## Solution

Collaboration features enable shared flow observation (multiple users watching a flow in real time), comment threads on findings and spec artifacts, approval workflows for accepting or rejecting agent-generated changes, and multi-project switching for teams managing several codebases.

## Constituent Behaviors

| ID         | Summary                                        |
| ---------- | ---------------------------------------------- |
| BEH-SF-143 | Shared flow observation (real-time multi-user) |
| BEH-SF-144 | Comment threads on findings                    |
| BEH-SF-145 | Comment threads on spec artifacts              |
| BEH-SF-146 | Approval workflow for agent changes            |
| BEH-SF-147 | Rejection workflow with feedback               |
| BEH-SF-148 | Multi-project switching                        |
| BEH-SF-149 | Team member presence indicators                |
| BEH-SF-150 | Activity feed for team updates                 |

## Acceptance Criteria

- [ ] Multiple users can observe the same flow simultaneously
- [ ] Comment threads attach to specific findings and artifacts
- [ ] Approval workflow gates agent changes behind human review
- [ ] Rejected changes include feedback that agents can act on
- [ ] Multi-project switching preserves per-project state
- [ ] Activity feed shows recent team actions across projects
