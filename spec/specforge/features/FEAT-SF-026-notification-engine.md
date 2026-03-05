---
id: FEAT-SF-026
kind: feature
title: "Notification Engine"
status: active
behaviors: [BEH-SF-594, BEH-SF-595, BEH-SF-596, BEH-SF-597]
adrs: [ADR-011]
roadmap_phases: [RM-05, RM-07]
---

# Notification Engine

## Problem

SpecForge generates events across many subsystems — flow completions, findings, approval requests, drift alerts, budget warnings, backend failures — but there is no unified notification system. Users must actively poll the dashboard or CLI to discover what happened.

## Solution

A cross-cutting notification engine aggregates events from the EventBusPort and routes them to user-facing channels: OS notifications (desktop app), browser notifications (web dashboard), VS Code notification panel, email digests (SaaS mode), and webhook callbacks (CI integrations). Users configure notification preferences per event type and severity. The engine deduplicates, batches, and prioritizes notifications to avoid alert fatigue.

## Constituent Behaviors

| ID         | Summary                                              |
| ---------- | ---------------------------------------------------- |
| BEH-SF-594 | Notification event aggregation from EventBusPort     |
| BEH-SF-595 | Notification routing to user-configured channels     |
| BEH-SF-596 | Notification preference configuration per event type |
| BEH-SF-597 | Notification deduplication and batching              |

## Acceptance Criteria

- [ ] Flow completions, findings, and approval requests trigger notifications
- [ ] Users configure which events and severities produce notifications
- [ ] Desktop app receives OS notifications
- [ ] Web dashboard receives browser/in-app notifications
- [ ] Notifications deduplicate — repeated events don't spam users
- [ ] Notification preferences persist across sessions
