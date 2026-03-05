---
id: FEAT-SF-031
kind: feature
title: "Third-Party Integrations"
status: active
behaviors: [BEH-SF-440, BEH-SF-441, BEH-SF-442, BEH-SF-443]
adrs: [ADR-005]
roadmap_phases: [RM-13]
---

# Third-Party Integrations

## Problem

Requirements and tasks live in external tools — Jira, Linear, Confluence, Notion, GitHub Issues. Import/Export (FEAT-SF-012) handles one-time file conversion, but teams need bidirectional live sync so the knowledge graph stays current as external tools are updated.

## Solution

Integration adapters provide bidirectional sync between the knowledge graph and third-party tools. Each adapter maps external entities (Jira issues, Linear tickets, Confluence pages) to graph nodes with typed relationships. Sync runs incrementally on change events (webhooks from the external tool) or on a configurable schedule. Conflict resolution handles cases where both sides changed the same entity. The adapter registry allows community-contributed integrations.

## Constituent Behaviors

| ID         | Summary                                       |
| ---------- | --------------------------------------------- |
| BEH-SF-440 | Third-party adapter contract and registry     |
| BEH-SF-441 | Bidirectional sync with conflict resolution   |
| BEH-SF-442 | Incremental sync via external webhooks        |
| BEH-SF-443 | Entity mapping (external entity → graph node) |

## Acceptance Criteria

- [ ] Jira/Linear issues sync bidirectionally with graph requirement nodes
- [ ] Confluence/Notion pages sync with graph spec nodes
- [ ] Incremental sync processes only changed entities
- [ ] Conflicts are detected and resolved with configurable strategy (last-write-wins, manual)
- [ ] New integration adapters can be registered without core changes
- [ ] Sync status and errors are visible in dashboard
