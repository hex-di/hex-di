---
id: FEAT-SF-009
kind: feature
title: "CLI"
status: active
behaviors:
  [BEH-SF-113, BEH-SF-114, BEH-SF-115, BEH-SF-116, BEH-SF-117, BEH-SF-118, BEH-SF-119, BEH-SF-120]
adrs: [ADR-005]
roadmap_phases: [RM-06]
---

# CLI

## Problem

CI pipelines, power users, and headless environments need a command-line interface for running flows, querying the graph, and managing spec operations without a GUI.

## Solution

The SpecForge CLI provides commands for flow execution, NLQ graph queries, analytical queries, run management, configuration, and plugin management. It supports both interactive and non-interactive modes, making it suitable for CI integration, scripting, and power-user workflows.

## Constituent Behaviors

| ID         | Summary                                  |
| ---------- | ---------------------------------------- |
| BEH-SF-113 | Flow execution command (`specforge run`) |
| BEH-SF-114 | NLQ query command (`specforge query`)    |
| BEH-SF-115 | Analytical query command                 |
| BEH-SF-116 | Run management (list, status, cancel)    |
| BEH-SF-117 | CI mode with non-interactive output      |
| BEH-SF-118 | Flow progress display                    |
| BEH-SF-119 | Import command                           |
| BEH-SF-120 | Export command                           |
| BEH-SF-330 | CLI configuration management             |
| BEH-SF-331 | Plugin installation via CLI              |
| BEH-SF-332 | Plugin listing and status                |
| BEH-SF-333 | Plugin removal                           |
| BEH-SF-334 | CLI plugin hook integration              |

## Acceptance Criteria

- [ ] `specforge run` executes flows and reports results
- [ ] `specforge query` translates NLQ and returns results
- [ ] CI mode produces parseable, non-interactive output
- [ ] Run management commands list, inspect, and cancel active runs
- [ ] Plugin management installs, lists, and removes plugins
- [ ] Configuration is persistent across CLI sessions
