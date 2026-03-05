---
id: FEAT-SF-008
kind: feature
title: "VS Code Extension"
status: active
behaviors: [BEH-SF-139, BEH-SF-140, BEH-SF-141, BEH-SF-142]
adrs: [ADR-010]
roadmap_phases: [RM-05]
---

# VS Code Extension

## Problem

Developers spend most of their time in VS Code and need specification insights without context-switching to a separate application or browser tab.

## Solution

A VS Code extension integrates SpecForge into the editor with a flow status sidebar, findings panel, graph query panel, and notification system. The extension communicates with the SpecForge server to show real-time flow progress, surface findings inline, and allow graph queries directly from the editor.

## Constituent Behaviors

| ID         | Summary                                  |
| ---------- | ---------------------------------------- |
| BEH-SF-139 | Flow status sidebar with live updates    |
| BEH-SF-140 | Findings panel showing agent outputs     |
| BEH-SF-141 | Graph query panel for Cypher/NLQ queries |
| BEH-SF-142 | Notification system for flow events      |

## Acceptance Criteria

- [ ] Extension activates and connects to SpecForge server
- [ ] Flow status sidebar reflects real-time flow state
- [ ] Findings panel displays relevant findings for current file
- [ ] Graph query panel executes queries and displays results
- [ ] Notifications surface important flow events non-intrusively
