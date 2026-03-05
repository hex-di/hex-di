---
id: FEAT-SF-029
kind: feature
title: "CI Gate & Drift Detection"
status: active
behaviors:
  [
    BEH-SF-598,
    BEH-SF-599,
    BEH-SF-600,
    BEH-SF-601,
    BEH-SF-464,
    BEH-SF-465,
    BEH-SF-466,
    BEH-SF-467,
    BEH-SF-468,
    BEH-SF-469,
    BEH-SF-470,
    BEH-SF-471,
    BEH-SF-472,
    BEH-SF-473,
    BEH-SF-474,
    BEH-SF-475,
    BEH-SF-476,
    BEH-SF-477,
    BEH-SF-478,
    BEH-SF-479,
    BEH-SF-480,
    BEH-SF-481,
    BEH-SF-482,
    BEH-SF-483,
    BEH-SF-484,
    BEH-SF-485,
    BEH-SF-486,
    BEH-SF-487,
  ]
adrs: [ADR-005, ADR-026]
roadmap_phases: [RM-12]
---

# CI Gate & Drift Detection

## Problem

Code-to-spec drift accumulates silently between releases. Teams discover specification violations only during manual reviews — by which time the drift is too large to fix economically. CI pipelines have no automated spec-compliance check.

## Solution

`specforge check` runs as a CI gate that compares the current codebase against the knowledge graph and fails the build when drift exceeds configurable thresholds. Drift detection computes a delta between code artifacts and their corresponding spec nodes, scoring drift by severity (missing requirement coverage, stale specs, broken traceability links). The gate produces machine-readable output (JSON, JUnit XML) for CI integration and human-readable summaries for PR comments.

## Constituent Behaviors

| ID         | Summary                                          |
| ---------- | ------------------------------------------------ |
| BEH-SF-598 | Drift detection — code-to-spec delta computation |
| BEH-SF-599 | Drift scoring by severity                        |
| BEH-SF-600 | CI gate — fail build on threshold violation      |
| BEH-SF-601 | Machine-readable output (JSON, JUnit XML) for CI |

## Acceptance Criteria

- [ ] `specforge check` exits non-zero when drift exceeds threshold
- [ ] Drift score quantifies missing coverage, stale specs, broken links
- [ ] Thresholds are configurable per severity level
- [ ] Output formats include JSON and JUnit XML for CI consumption
- [ ] PR comments summarize drift findings in human-readable format
- [ ] Incremental mode checks only files changed in the PR
