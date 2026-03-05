---
id: UX-SF-006
kind: capability
title: "View Flow History and Compare Runs"
status: active
features: [FEAT-SF-004, FEAT-SF-007]
behaviors: [BEH-SF-057, BEH-SF-133, BEH-SF-134]
persona: [developer, team-lead]
surface: [desktop, dashboard]
---

# View Flow History and Compare Runs

## Use Case

A developer opens the Flow History in the desktop app to review past flow executions to understand trends, identify regressions, or compare two runs side-by-side. The dashboard provides a history view with filtering, sorting, and a diff mode that highlights differences in convergence metrics, token usage, and outcomes between selected runs.

## Interaction Flow

```text
┌───────────┐ ┌───────────┐ ┌────────────┐
│ Developer │ │ Desktop App │ │ FlowEngine │
└─────┬─────┘ └─────┬─────┘ └─────┬──────┘
      │              │              │
      │ Open Flow History           │
      │─────────────►│              │
      │              │ listRuns(filters)
      │              │─────────────►│
      │              │ RunHistory[] │
      │              │◄─────────────│
      │ History table│              │
      │◄─────────────│              │
      │              │              │
      │ Select run for detail       │
      │─────────────►│              │
      │              │ getRunDetail(runId)
      │              │─────────────►│
      │              │ RunDetail    │
      │              │◄─────────────│
      │ Timeline + metrics          │
      │◄─────────────│              │
      │              │              │
      │ Compare run A vs run B      │
      │─────────────►│              │
      │              │ compareRuns(A, B)
      │              │─────────────►│
      │              │ RunDiff      │
      │              │◄─────────────│
      │ Side-by-side comparison     │
      │◄─────────────│              │
      │              │              │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Flow History)
    participant Engine as FlowEngine

    Dev->>+DesktopApp: Open Flow History
    DesktopApp->>+Engine: listRuns(filters)
    Engine-->>-DesktopApp: RunHistory[]{id, flow, status, date, tokens}
    DesktopApp-->>-Dev: History table with filters (BEH-SF-133)

    Dev->>+DesktopApp: Select run for detail view
    DesktopApp->>+Engine: getRunDetail(runId)
    Engine-->>-DesktopApp: RunDetail{phases[], metrics, agents}
    DesktopApp-->>-Dev: Execution timeline and metrics (BEH-SF-057)

    Dev->>+DesktopApp: Compare run A vs run B
    DesktopApp->>+Engine: compareRuns(runA, runB)
    Engine-->>-DesktopApp: RunDiff{metrics, convergence, outcomes}
    DesktopApp-->>-Dev: Side-by-side comparison (BEH-SF-134)
```

## Steps

1. Open the Flow History in the desktop app
2. Browse completed runs with filters (flow type, date range, status) (BEH-SF-133)
3. Select a run to view its detailed execution timeline
4. View per-phase metrics, agent interactions, and convergence data (BEH-SF-057)
5. Select two runs and activate Compare mode (BEH-SF-134)
6. Desktop app highlights differences in metrics, duration, and outcomes
7. Export comparison as a report if needed

## Traceability

| Behavior   | Feature     | Role in this capability                 |
| ---------- | ----------- | --------------------------------------- |
| BEH-SF-057 | FEAT-SF-004 | Flow execution data and metrics storage |
| BEH-SF-133 | FEAT-SF-007 | Dashboard history view and filtering    |
| BEH-SF-134 | FEAT-SF-007 | Dashboard comparison and diff rendering |
