---
id: FEAT-SF-007
kind: feature
title: "Web Dashboard"
status: active
behaviors:
  [
    BEH-SF-133,
    BEH-SF-134,
    BEH-SF-135,
    BEH-SF-136,
    BEH-SF-137,
    BEH-SF-138,
    BEH-SF-488,
    BEH-SF-489,
    BEH-SF-490,
    BEH-SF-491,
    BEH-SF-492,
    BEH-SF-493,
    BEH-SF-494,
    BEH-SF-495,
  ]
adrs: [ADR-010]
roadmap_phases: [RM-05]
---

# Web Dashboard

## Problem

Teams need a shared, browser-accessible interface for monitoring flows, exploring the knowledge graph, and reviewing findings without installing a desktop application.

## Solution

A React SPA served from localhost (solo mode) or cloud (SaaS mode) provides four primary views: flow monitor with real-time WebSocket updates, graph explorer for visual querying, findings view for reviewing agent-generated insights, and session history. The dashboard connects to the server via WebSocket for live events and REST for queries.

## Constituent Behaviors

| ID         | Summary                                     |
| ---------- | ------------------------------------------- |
| BEH-SF-133 | Localhost server for dashboard serving      |
| BEH-SF-134 | Flow monitor with real-time updates         |
| BEH-SF-135 | Graph explorer with visual querying         |
| BEH-SF-136 | Findings view for agent outputs             |
| BEH-SF-137 | Session history browser                     |
| BEH-SF-138 | Dashboard authentication and access control |

## Acceptance Criteria

- [ ] Dashboard loads in browser from localhost or cloud URL
- [ ] Flow monitor shows live flow state via WebSocket
- [ ] Graph explorer renders nodes and supports visual querying
- [ ] Findings view displays agent-generated documents and insights
- [ ] Session history allows browsing past agent interactions
