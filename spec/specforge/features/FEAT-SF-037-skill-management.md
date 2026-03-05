---
id: FEAT-SF-037
kind: feature
title: "Skill Management"
status: active
behaviors:
  [
    BEH-SF-558,
    BEH-SF-559,
    BEH-SF-560,
    BEH-SF-561,
    BEH-SF-562,
    BEH-SF-563,
    BEH-SF-564,
    BEH-SF-565,
    BEH-SF-566,
    BEH-SF-567,
    BEH-SF-568,
    BEH-SF-569,
    BEH-SF-570,
    BEH-SF-571,
    BEH-SF-572,
    BEH-SF-573,
    BEH-SF-574,
    BEH-SF-575,
    BEH-SF-576,
    BEH-SF-577,
    BEH-SF-578,
    BEH-SF-579,
    BEH-SF-580,
    BEH-SF-581,
    BEH-SF-582,
    BEH-SF-583,
    BEH-SF-584,
    BEH-SF-585,
  ]
adrs: [ADR-025, ADR-007, ADR-005]
roadmap_phases: [RM-10]
---

# Skill Management

## Problem

Users cannot manage, author, compose, or visualize skills beyond the backend-only registry (BEH-SF-558--565). There is no UI for browsing the skill catalog, no way to author custom system or role skills, no mechanism to compose skills into reusable workflows, no visibility into the skill dependency graph, and no way to share skill workflows across teams. Additionally, there is no unified view of how spec components (capabilities, features, behaviors, invariants, ADRs) trace to each other, making it difficult to assess coverage and change impact.

## Solution

A complete user-facing Skill Management layer covering: a dashboard for browsing and filtering skills by type (system vs role) and source; an authoring interface for creating custom skills with versioning and dependency declaration; an interactive skill DAG visualizer showing orchestration relationships; a workflow composer for defining ordered skill steps with conditions and failure policies; a sharing system with visibility scoping (private/project/public); a workflow execution monitor with real-time WebSocket events; and a spec component traceability graph explorer for navigating, assessing coverage, and analyzing change impact across all spec artifacts.

## Constituent Behaviors

| ID         | Summary                                                        |
| ---------- | -------------------------------------------------------------- |
| BEH-SF-558 | Builtin skill loading (5 bundles, embedded)                    |
| BEH-SF-559 | Graph skill loading (Neo4j, EXTRACTED_FROM)                    |
| BEH-SF-560 | Project skill loading (.claude/skills/\*.md)                   |
| BEH-SF-561 | Skill resolution algorithm (filter, deduplicate, trim)         |
| BEH-SF-562 | Role-to-bundle assignment (8 built-in roles)                   |
| BEH-SF-563 | Skill graph sync (Neo4j persistence)                           |
| BEH-SF-564 | Skill lifecycle and evolution (stale detection, re-seeding)    |
| BEH-SF-565 | Composition engine skill injection (system prompt assembly)    |
| BEH-SF-566 | Skill type classification (system vs role taxonomy)            |
| BEH-SF-567 | Skill CRUD (create, read, update, delete custom skills)        |
| BEH-SF-568 | Skill versioning (content-hash versions, diff)                 |
| BEH-SF-569 | Skill dependency declaration (DEPENDS_ON, cycle detection)     |
| BEH-SF-570 | Skill orchestration graph assembly (DAG visualization)         |
| BEH-SF-571 | Skill search and discovery (full-text, faceted filtering)      |
| BEH-SF-572 | Skill role assignment (ASSIGNED_TO edges)                      |
| BEH-SF-573 | Skill import/export (transfer with conflict strategies)        |
| BEH-SF-574 | Workflow definition (ordered steps, conditions, parameters)    |
| BEH-SF-575 | Workflow validation (references, order, dependencies)          |
| BEH-SF-576 | Workflow execution engine (step-by-step with failure policies) |
| BEH-SF-577 | Workflow visibility scoping (private/project/public)           |
| BEH-SF-578 | Workflow discovery and clone (gallery, deep-copy)              |
| BEH-SF-579 | Workflow execution monitoring (WebSocket, per-step progress)   |
| BEH-SF-580 | Workflow template library (4+ predefined templates)            |
| BEH-SF-581 | Workflow versioning and rollback (step history, restore)       |
| BEH-SF-582 | Spec component graph assembly (DAG from all spec artifacts)    |
| BEH-SF-583 | Spec component traceability navigation (upstream/downstream)   |
| BEH-SF-584 | Spec component coverage overlay (implementation + test status) |
| BEH-SF-585 | Spec component impact analysis (blast radius, severity)        |

## Acceptance Criteria

- [ ] Skills are classified as system or role type with appropriate badges in the dashboard
- [ ] Users can create, update, delete, and version custom skills via dashboard and CLI
- [ ] Skill dependency graph is visualized as an interactive DAG with clusters
- [ ] Full-text search and faceted filtering work across the skill catalog
- [ ] Skill workflows can be defined with ordered steps, conditions, and failure policies
- [ ] Workflow validation catches broken references, order gaps, and dependency violations
- [ ] Workflow execution engine processes steps with condition evaluation and retry policies
- [ ] Workflows support private/project/public visibility with discovery gallery
- [ ] Real-time execution monitoring shows per-step progress via WebSocket
- [ ] 4+ workflow templates are available for common patterns
- [ ] Skills can be imported/exported between projects with conflict resolution
- [ ] Spec component graph visualizes all spec artifacts with traceability navigation
- [ ] Coverage overlay colors nodes by implementation and test status
- [ ] Impact analysis computes blast radius with severity scoring
