---
id: FEAT-SF-010
kind: feature
title: "Cost & Token Management"
status: active
behaviors:
  [
    BEH-SF-073,
    BEH-SF-074,
    BEH-SF-075,
    BEH-SF-076,
    BEH-SF-077,
    BEH-SF-078,
    BEH-SF-079,
    BEH-SF-080,
    BEH-SF-169,
    BEH-SF-170,
    BEH-SF-171,
    BEH-SF-172,
    BEH-SF-173,
    BEH-SF-174,
    BEH-SF-175,
    BEH-SF-176,
  ]
adrs: [ADR-014]
roadmap_phases: [RM-09]
---

# Cost & Token Management

## Problem

Unrestricted AI agent usage leads to unpredictable costs. Flows can consume excessive tokens without bounds, and different tasks require different model capabilities — using the most expensive model for every task wastes budget.

## Solution

A two-tier cost management system: token budgeting enforces hard limits at flow, phase, and agent levels with configurable warning thresholds, while role-adaptive model routing (ADR-014) automatically selects the optimal model tier for each agent role. Budget zones partition available tokens across phases, cost prediction estimates consumption before execution, and effort escalation upgrades models only when simpler ones fail to converge.

## Constituent Behaviors

| ID         | Summary                                           |
| ---------- | ------------------------------------------------- |
| BEH-SF-073 | Flow-level token budget allocation                |
| BEH-SF-074 | Phase-level token budget allocation               |
| BEH-SF-075 | Agent-level token budget allocation               |
| BEH-SF-076 | Budget warning thresholds                         |
| BEH-SF-077 | Budget enforcement (hard stop on exhaustion)      |
| BEH-SF-078 | Token usage tracking and reporting                |
| BEH-SF-079 | Budget carryover between phases                   |
| BEH-SF-080 | Budget estimation before execution                |
| BEH-SF-169 | Role-adaptive model routing                       |
| BEH-SF-170 | Budget zone partitioning                          |
| BEH-SF-171 | Cost prediction algorithms                        |
| BEH-SF-172 | Effort escalation — model tier upgrade on failure |
| BEH-SF-173 | Cost reporting and analytics                      |
| BEH-SF-174 | Model routing configuration                       |
| BEH-SF-175 | Cost optimization recommendations                 |
| BEH-SF-176 | Budget alert notifications                        |

## Acceptance Criteria

- [ ] Token budgets are enforced at flow, phase, and agent levels
- [ ] Budget exhaustion triggers hard stop with clear error
- [ ] Warnings fire at configurable thresholds before exhaustion
- [ ] Role-adaptive routing selects appropriate model tiers
- [ ] Effort escalation upgrades model tier on convergence failure
- [ ] Cost analytics report actual vs. estimated consumption
