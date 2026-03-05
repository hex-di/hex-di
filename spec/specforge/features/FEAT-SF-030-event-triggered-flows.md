---
id: FEAT-SF-030
kind: feature
title: "Webhook & Event-Triggered Flows"
status: active
behaviors:
  [BEH-SF-432, BEH-SF-433, BEH-SF-434, BEH-SF-435, BEH-SF-436, BEH-SF-437, BEH-SF-438, BEH-SF-439]
adrs: [ADR-007, ADR-011]
roadmap_phases: [RM-12]
---

# Webhook & Event-Triggered Flows

## Problem

Flows are manually triggered via CLI or UI. Automated workflows — PR opened triggers code-review flow, main branch push triggers drift check, scheduled daily verification — require external scripting with no built-in support.

## Solution

A declarative event-to-flow mapping engine triggers flows from external events. Webhook endpoints receive events from GitHub, GitLab, and generic HTTP sources. File watchers detect local spec/code changes. Cron-style schedules trigger periodic verification. Each trigger maps to a flow with configurable presets and budget limits. A background execution queue handles burst events with retry and backoff, ensuring no triggers are dropped.

## Constituent Behaviors

| ID         | Summary                                 |
| ---------- | --------------------------------------- |
| BEH-SF-432 | Webhook endpoint registration           |
| BEH-SF-433 | Event-to-flow mapping rules             |
| BEH-SF-434 | File watcher triggers for local changes |
| BEH-SF-435 | Cron-style scheduled triggers           |
| BEH-SF-436 | Background execution queue with retry   |
| BEH-SF-437 | Trigger authentication and validation   |
| BEH-SF-438 | Event deduplication and throttling      |
| BEH-SF-439 | Trigger audit log                       |

## Acceptance Criteria

- [ ] GitHub webhook triggers code-review flow on PR open
- [ ] File watcher triggers incremental verification on spec file change
- [ ] Scheduled triggers run at configured intervals
- [ ] Event-to-flow mappings are configurable via YAML
- [ ] Background queue handles burst events without dropping triggers
- [ ] Trigger authentication rejects unauthorized webhook calls
