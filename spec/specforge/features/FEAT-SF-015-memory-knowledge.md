---
id: FEAT-SF-015
kind: feature
title: "Memory & Knowledge"
status: active
behaviors:
  [BEH-SF-177, BEH-SF-178, BEH-SF-179, BEH-SF-180, BEH-SF-181, BEH-SF-182, BEH-SF-183, BEH-SF-184]
adrs: [ADR-013]
roadmap_phases: [RM-10]
---

# Memory & Knowledge

## Problem

Agent-generated insights are ephemeral — they exist only within the session that created them. Project conventions, architectural decisions, and coding patterns discovered by agents are lost between sessions and cannot be shared across projects.

## Solution

A dual-memory architecture (ADR-013) combines graph-backed persistent memory with generated CLAUDE.md files. Agents produce modular rule sets that are curated (auto-generated, reviewed, approved) and materialized as knowledge nodes in the graph. These rules are then rendered into CLAUDE.md files for consumption by future agent sessions, enabling knowledge transfer across projects and time.

## Constituent Behaviors

| ID         | Summary                                        |
| ---------- | ---------------------------------------------- |
| BEH-SF-177 | Graph-backed CLAUDE.md generation              |
| BEH-SF-178 | Modular rule extraction from sessions          |
| BEH-SF-179 | Rule curation workflow (auto, review, approve) |
| BEH-SF-180 | Knowledge node materialization                 |
| BEH-SF-181 | Cross-project knowledge transfer               |
| BEH-SF-182 | Rule versioning and conflict resolution        |
| BEH-SF-183 | Memory pruning and relevance decay             |
| BEH-SF-184 | Knowledge query and retrieval                  |

## Acceptance Criteria

- [ ] CLAUDE.md files are generated from graph-backed rules
- [ ] Rules are extracted from agent sessions automatically
- [ ] Curation workflow supports auto-generate, review, and approve stages
- [ ] Knowledge transfers between projects via shared graph nodes
- [ ] Rule versioning handles conflicts when multiple sessions modify same rules
- [ ] Memory pruning removes stale or low-relevance rules over time
