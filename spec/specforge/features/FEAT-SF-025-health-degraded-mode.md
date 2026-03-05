---
id: FEAT-SF-025
kind: feature
title: "Health & Degraded Mode"
status: active
behaviors: [BEH-SF-006]
adrs: [ADR-005]
roadmap_phases: [RM-01]
---

# Health & Degraded Mode

## Problem

SpecForge depends on Neo4j, agent backends, and MCP servers — any of which can become unavailable. Without health monitoring and graceful degradation, a single dependency failure takes down the entire system.

## Solution

The HealthCheckPort exposes liveness and readiness probes for each system dependency. When Neo4j is unavailable, the system enters degraded mode: read operations fall back to cached data, write operations queue for replay, and flows pause rather than fail. Agent backend health is monitored continuously — unhealthy backends are removed from the routing pool and restored when they recover. MCP server health checks (FEAT-SF-013) feed into the overall system health status.

## Constituent Behaviors

| ID         | Summary                                 |
| ---------- | --------------------------------------- |
| BEH-SF-006 | Degraded mode when Neo4j is unavailable |

## Acceptance Criteria

- [ ] Liveness probe reports system alive/dead status
- [ ] Readiness probe reports per-dependency health (Neo4j, backends, MCP servers)
- [ ] Degraded mode allows read-only operations when Neo4j is down
- [ ] Queued writes replay when Neo4j recovers
- [ ] Flows pause (not fail) during transient dependency outages
- [ ] Health status is exposed to CLI, dashboard, and external monitors
