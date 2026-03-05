---
id: UX-SF-034
kind: capability
title: "View Token Usage Breakdown per Tool Call"
status: active
features: [FEAT-SF-010, FEAT-SF-035]
behaviors: [BEH-SF-073, BEH-SF-074, BEH-SF-133]
persona: [developer]
surface: [desktop, dashboard]
---

# View Token Usage Breakdown per Tool Call

## Use Case

A developer opens the Session Inspector in the desktop app. This reveals which tools are consuming the most tokens (e.g., a large file read vs. a simple API call) and helps optimize prompts, tool configurations, and session composition.

## Interaction Flow

```text
┌───────────┐  ┌───────────┐  ┌────────────────┐
│ Developer │  │ Desktop App │  │ TokenAnalytics │
└─────┬─────┘  └─────┬─────┘  └───────┬────────┘
      │               │               │
      │ Select Token  │               │
      │  Usage tab    │               │
      │──────────────►│               │
      │               │ getToken      │
      │               │  Breakdown()  │
      │               │──────────────►│
      │               │ TokenReport   │
      │               │◄──────────────│
      │ Per-turn      │               │
      │  breakdown    │               │
      │◄──────────────│               │
      │               │               │
      │ Expand tool   │               │
      │  call entry   │               │
      │──────────────►│               │
      │ Input/output  │               │
      │  token counts │               │
      │◄──────────────│               │
      │               │               │
      │ Sort by token │               │
      │  consumption  │               │
      │──────────────►│               │
      │ Expensive ops │               │
      │  highlighted  │               │
      │◄──────────────│               │
      │               │               │
      │ View chart    │               │
      │──────────────►│               │
      │ Token usage   │               │
      │  vs. budget   │               │
      │◄──────────────│               │
      │               │               │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Session Inspector)
    participant Analytics as TokenAnalytics

    Dev->>+DesktopApp: Open session detail, select "Token Usage" tab (BEH-SF-133)
    DesktopApp->>+Analytics: getTokenBreakdown(sessionId)
    Analytics-->>-DesktopApp: TokenReport{perTurn, perToolCall}
    DesktopApp-->>-Dev: Per-turn token breakdown

    Dev->>+DesktopApp: Expand tool call entry (BEH-SF-073)
    DesktopApp-->>-Dev: Input/output token counts for tool call

    Dev->>+DesktopApp: Sort by token consumption (BEH-SF-074)
    DesktopApp-->>-Dev: Expensive operations highlighted

    Dev->>+DesktopApp: View cumulative chart
    DesktopApp-->>-Dev: Token usage over time vs. budget
```

## Steps

1. Open the Session Inspector in the desktop app
2. Select the "Token Usage" tab (BEH-SF-133)
3. View per-turn token breakdown: input tokens, output tokens, tool call tokens
4. Expand individual tool calls to see their token contribution (BEH-SF-073)
5. Sort by token consumption to identify expensive operations (BEH-SF-074)
6. View cumulative token chart over the session timeline
7. Compare against the session's budget allocation

## Traceability

| Behavior   | Feature     | Role in this capability             |
| ---------- | ----------- | ----------------------------------- |
| BEH-SF-073 | FEAT-SF-010 | Token budget tracking per operation |
| BEH-SF-074 | FEAT-SF-010 | Token usage analytics and breakdown |
| BEH-SF-133 | FEAT-SF-035 | Dashboard token usage visualization |
