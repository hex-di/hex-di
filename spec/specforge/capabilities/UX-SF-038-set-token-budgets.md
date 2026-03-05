---
id: UX-SF-038
kind: capability
title: "Set Token Budgets and Cost Limits"
status: active
features: [FEAT-SF-010, FEAT-SF-028]
behaviors: [BEH-SF-073, BEH-SF-075, BEH-SF-330]
persona: [developer, team-lead]
surface: [desktop, cli]
---

# Set Token Budgets and Cost Limits

## Use Case

A developer opens the Budget Settings in the desktop app. Budgets can be set per-flow, per-phase, per-session, or globally. When a budget is approached, the system warns; when exceeded, it either pauses the flow for human decision or applies the configured overflow policy. The same operation is accessible via CLI (`specforge config budgets`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌───────────┐ ┌─────────────────┐ ┌─────────────┐ ┌────────────────┐
│ Developer │ │   Desktop App   │ │ ConfigMgr   │ │ BudgetEnforcer │
└─────┬─────┘ └────────┬────────┘ └──────┬──────┘ └───────┬────────┘
      │           │           │                │
      │ config    │           │                │
      │  budgets  │           │                │
      │──────────►│           │                │
      │           │ get       │                │
      │           │ Budgets() │                │
      │           │──────────►│                │
      │           │ Budget    │                │
      │           │  Config   │                │
      │           │◄──────────│                │
      │ Current   │           │                │
      │  settings │           │                │
      │◄──────────│           │                │
      │           │           │                │
      │ Set daily   │           │                │
      │  1000000  │           │                │
      │──────────►│           │                │
      │           │ setGlobal │                │
      │           │  Budget() │                │
      │           │──────────►│                │
      │           │ BudgetSet │                │
      │           │◄──────────│                │
      │ Daily     │           │                │
      │  budget   │           │                │
      │◄──────────│           │                │
      │           │           │                │
      │ Set flow    │           │                │
      │  spec-    │           │                │
      │  verify   │           │                │
      │──────────►│           │                │
      │           │ setFlow   │                │
      │           │  Budget() │                │
      │           │──────────►│                │
      │           │ FlowBudg  │                │
      │           │  etSet    │                │
      │           │◄──────────│                │
      │ Flow      │           │                │
      │  budget   │           │                │
      │◄──────────│           │                │
      │           │           │                │
      │ Set overflow│           │                │
      │  -policy  │           │                │
      │  pause    │           │                │
      │──────────►│           │                │
      │           │ setOverflowPolicy()        │
      │           │───────────────────────────►│
      │           │ PolicySet                  │
      │           │◄───────────────────────────│
      │ Overflow  │           │                │
      │  policy:  │           │                │
      │  pause    │           │                │
      │◄──────────│           │                │
      │           │           │                │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Budget Settings)
    participant Config as ConfigManager
    participant Budget as BudgetEnforcer

    Dev->>+DesktopApp: Open Budget Settings
    DesktopApp->>+Config: getBudgets()
    Config-->>-DesktopApp: BudgetConfig{daily, perFlow}
    DesktopApp-->>-Dev: Current budget settings

    Dev->>+DesktopApp: Set daily token limit
    DesktopApp->>+Config: setGlobalBudget(daily: 1000000) (BEH-SF-330)
    Config-->>-DesktopApp: BudgetSet
    DesktopApp-->>-Dev: Daily budget set

    Dev->>+DesktopApp: Set token limits per role/flow
    DesktopApp->>+Config: setFlowBudget(flow, limit) (BEH-SF-075)
    Config-->>-DesktopApp: FlowBudgetSet
    DesktopApp-->>-Dev: Flow budget configured

    Dev->>+DesktopApp: Click "Save"
    DesktopApp->>+Budget: setOverflowPolicy("pause") (BEH-SF-073)
    Budget-->>-DesktopApp: PolicySet
    DesktopApp-->>-Dev: Overflow policy: pause on exceed
```

### CLI

```text
┌───────────┐ ┌─────┐ ┌─────────────┐ ┌────────────────┐
│ Developer │ │ CLI │ │ ConfigMgr   │ │ BudgetEnforcer │
└─────┬─────┘ └──┬──┘ └──────┬──────┘ └───────┬────────┘
      │           │           │                │
      │ config    │           │                │
      │  budgets  │           │                │
      │──────────►│           │                │
      │           │ get       │                │
      │           │ Budgets() │                │
      │           │──────────►│                │
      │           │ Budget    │                │
      │           │  Config   │                │
      │           │◄──────────│                │
      │ Current   │           │                │
      │  settings │           │                │
      │◄──────────│           │                │
      │           │           │                │
      │ --daily   │           │                │
      │  1000000  │           │                │
      │──────────►│           │                │
      │           │ setGlobal │                │
      │           │  Budget() │                │
      │           │──────────►│                │
      │           │ BudgetSet │                │
      │           │◄──────────│                │
      │ Daily     │           │                │
      │  budget   │           │                │
      │◄──────────│           │                │
      │           │           │                │
      │ --flow    │           │                │
      │  spec-    │           │                │
      │  verify   │           │                │
      │──────────►│           │                │
      │           │ setFlow   │                │
      │           │  Budget() │                │
      │           │──────────►│                │
      │           │ FlowBudg  │                │
      │           │  etSet    │                │
      │           │◄──────────│                │
      │ Flow      │           │                │
      │  budget   │           │                │
      │◄──────────│           │                │
      │           │           │                │
      │ --overflow│           │                │
      │  -policy  │           │                │
      │  pause    │           │                │
      │──────────►│           │                │
      │           │ setOverflowPolicy()        │
      │           │───────────────────────────►│
      │           │ PolicySet                  │
      │           │◄───────────────────────────│
      │ Overflow  │           │                │
      │  policy:  │           │                │
      │  pause    │           │                │
      │◄──────────│           │                │
      │           │           │                │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant CLI
    participant Config as ConfigManager
    participant Budget as BudgetEnforcer

    Dev->>+CLI: specforge config budgets
    CLI->>+Config: getBudgets()
    Config-->>-CLI: BudgetConfig{daily, perFlow}
    CLI-->>-Dev: Current budget settings

    Dev->>+CLI: specforge config budgets --daily 1000000
    CLI->>+Config: setGlobalBudget(daily: 1000000) (BEH-SF-330)
    Config-->>-CLI: BudgetSet
    CLI-->>-Dev: Daily budget set

    Dev->>+CLI: specforge config budgets --flow spec-verify --max-tokens 500000
    CLI->>+Config: setFlowBudget(flow, limit) (BEH-SF-075)
    Config-->>-CLI: FlowBudgetSet
    CLI-->>-Dev: Flow budget configured

    Dev->>+CLI: specforge config budgets --overflow-policy pause
    CLI->>+Budget: setOverflowPolicy("pause") (BEH-SF-073)
    Budget-->>-CLI: PolicySet
    CLI-->>-Dev: Overflow policy: pause on exceed
```

## Steps

1. Open the Budget Settings in the desktop app
2. Set a global daily limit: `specforge config budgets --daily 1000000` (BEH-SF-330)
3. Set per-flow limits: `specforge config budgets --flow spec-verify --max-tokens 500000`
4. Configure overflow policy: warn, pause, or cancel (BEH-SF-073)
5. System enforces budgets during flow execution (BEH-SF-075)
6. View budget utilization: `specforge config budgets --usage`
7. Adjust limits based on observed usage patterns

## Traceability

| Behavior   | Feature     | Role in this capability                        |
| ---------- | ----------- | ---------------------------------------------- |
| BEH-SF-073 | FEAT-SF-010 | Token budget enforcement and overflow policies |
| BEH-SF-075 | FEAT-SF-010 | Budget zone allocation and tracking            |
| BEH-SF-330 | FEAT-SF-028 | Configuration storage for budget settings      |
