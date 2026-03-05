---
id: FEAT-SF-002
kind: feature
title: "Session Composition Pipeline"
status: active
behaviors:
  [
    BEH-SF-009,
    BEH-SF-010,
    BEH-SF-011,
    BEH-SF-012,
    BEH-SF-013,
    BEH-SF-014,
    BEH-SF-015,
    BEH-SF-016,
    BEH-SF-025,
    BEH-SF-026,
    BEH-SF-027,
    BEH-SF-028,
    BEH-SF-029,
    BEH-SF-030,
    BEH-SF-031,
    BEH-SF-032,
    BEH-SF-520,
    BEH-SF-521,
    BEH-SF-522,
    BEH-SF-523,
    BEH-SF-524,
    BEH-SF-525,
    BEH-SF-526,
    BEH-SF-527,
  ]
adrs: [ADR-006, ADR-009]
roadmap_phases: [RM-01, RM-03]
---

# Session Composition Pipeline

## Problem

AI agent sessions lose context between invocations. Previous insights, decisions, and reasoning are discarded, leading to redundant work and inconsistent outputs across iterations.

## Solution

Session chunks are materialized as immutable graph nodes after each agent interaction. These chunks carry metadata (role, phase, timestamp, embeddings) and are composed into future sessions via a query-rank-budget-assemble pipeline. The composition pipeline queries relevant prior chunks, ranks them by relevance, fits them within token budgets, and assembles optimized context for new sessions. This enables persistent, accumulating knowledge across agent iterations.

## Constituent Behaviors

| ID         | Summary                                            |
| ---------- | -------------------------------------------------- |
| BEH-SF-009 | Materialize session output as immutable chunk node |
| BEH-SF-010 | Attach metadata (role, phase, timestamp) to chunks |
| BEH-SF-011 | Enforce chunk immutability — no post-write edits   |
| BEH-SF-012 | Query chunks by similarity, recency, and role      |
| BEH-SF-013 | Rank chunks by composite relevance score           |
| BEH-SF-014 | Budget-aware chunk selection within token limits   |
| BEH-SF-015 | Assemble composed context from selected chunks     |
| BEH-SF-016 | Bootstrap new sessions with composed context       |
| BEH-SF-025 | Agent session creation                             |
| BEH-SF-026 | Session bootstrap with composed context            |
| BEH-SF-027 | Session persistence to graph                       |
| BEH-SF-028 | Session pause                                      |
| BEH-SF-029 | Session resume from paused state                   |
| BEH-SF-030 | Session cancel                                     |
| BEH-SF-031 | Session timeout handling                           |
| BEH-SF-032 | Session cleanup on completion                      |
| BEH-SF-365 | Concurrent session pause                           |
| BEH-SF-366 | Concurrent session resume                          |
| BEH-SF-387 | Session resource cleanup                           |
| BEH-SF-388 | Session resource leak detection                    |
| BEH-SF-389 | Session pause/resume state machine                 |
| BEH-SF-390 | Session cancel with cleanup                        |
| BEH-SF-391 | Session lifecycle event emission                   |
| BEH-SF-392 | Composition pipeline query stage                   |
| BEH-SF-393 | Composition pipeline ranking stage                 |
| BEH-SF-394 | Composition pipeline assembly stage                |

## Acceptance Criteria

- [ ] Every agent session produces at least one immutable chunk node
- [ ] Chunks carry complete metadata for downstream queries
- [ ] Composition pipeline produces relevant context within budget
- [ ] New sessions bootstrap with prior knowledge from composed chunks
- [ ] Chunk immutability is enforced — mutations are rejected
