---
id: UX-SF-085
kind: capability
title: "Monitor Streaming Agent Output"
status: active
features: [FEAT-SF-023, FEAT-SF-007]
behaviors: [BEH-SF-426, BEH-SF-427, BEH-SF-429, BEH-SF-133]
persona: [developer, team-lead]
surface: [desktop, dashboard]
---

# Monitor Streaming Agent Output

## Use Case

A developer opens the Streaming Monitor in the desktop app. Streaming events (`tool-call`, `tool-result`, `partial-text`, `token-update`, `error`) feed a live view showing each agent's structured JSON output as it arrives. The view highlights self-assessment confidence scores, graph writes in progress, and schema validation results — giving immediate visibility into agent decision-making during flow execution.

## Interaction Flow

```text
┌───────────┐     ┌───────────┐     ┌──────────────────┐
│ Developer │     │ Desktop App │     │ StructuredOutput │
└─────┬─────┘     └─────┬─────┘     └────────┬─────────┘
      │ Open live        │                    │
      │ output monitor   │                    │
      │────────────────►│                    │
      │                 │ subscribe          │
      │                 │ (flowId)           │
      │                 │───────────────────►│
      │                 │ StreamEvent        │
      │                 │ (tool-call)        │
      │                 │◄───────────────────│
      │ Live event      │                    │
      │ feed (429)      │                    │
      │◄────────────────│                    │
      │                 │ StreamEvent        │
      │                 │ (structured JSON)  │
      │                 │◄───────────────────│
      │ Self-assessment │                    │
      │ scores (426)    │                    │
      │◄────────────────│                    │
      │                 │ GraphWriteEvent    │
      │                 │◄───────────────────│
      │ Graph node      │                    │
      │ written (427)   │                    │
      │◄────────────────│                    │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Streaming Monitor)
    participant SO as StructuredOutput

    Dev->>+DesktopApp: Open live output monitor (BEH-SF-133)
    DesktopApp->>+SO: subscribe(flowId) (BEH-SF-429)

    loop Streaming events
        SO-->>DesktopApp: StreamEvent(tool-call, partial-text, token-update)
        DesktopApp-->>Dev: Live event feed
    end

    SO-->>DesktopApp: StructuredJSON with selfAssessment (BEH-SF-426)
    DesktopApp-->>Dev: Confidence scores and reasoning

    SO-->>DesktopApp: GraphWriteEvent (BEH-SF-427)
    DesktopApp-->>-Dev: Graph node written indicator
    deactivate DesktopApp
```

## Steps

1. Open the Streaming Monitor in the desktop app
2. View the real-time streaming event feed — tool calls, partial text, token updates (BEH-SF-429)
3. Inspect each agent's structured JSON output as it completes (BEH-SF-429)
4. Review self-assessment confidence scores and suggested next actions (BEH-SF-426)
5. Monitor graph-direct writes as structured output feeds into Neo4j (BEH-SF-427)
6. Filter events by agent role, event type, or severity

## Traceability

| Behavior   | Feature     | Role in this capability                         |
| ---------- | ----------- | ----------------------------------------------- |
| BEH-SF-429 | FEAT-SF-023 | Streaming event output for real-time monitoring |
| BEH-SF-426 | FEAT-SF-023 | Agent self-assessment in structured output      |
| BEH-SF-427 | FEAT-SF-023 | Graph-direct writes from structured output      |
| BEH-SF-133 | FEAT-SF-007 | Dashboard rendering and real-time updates       |
