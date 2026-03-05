---
id: UX-SF-024
kind: capability
title: "Switch Between Projects"
status: active
features: [FEAT-SF-017]
behaviors: [BEH-SF-143, BEH-SF-147]
persona: [developer]
surface: [desktop, dashboard, vscode]
---

# Switch Between Projects

## Use Case

A developer opens the Project Switcher in the desktop app to switch context between them. Each project has its own knowledge graph, flows, and configuration. The system provides a project switcher that preserves session state and allows quick navigation between projects.

## Interaction Flow

```text
┌───────────┐     ┌───────────┐     ┌────────────┐
│ Developer │     │ Desktop App │     │ FlowEngine │
└─────┬─────┘     └─────┬─────┘     └──────┬─────┘
      │ Open switcher    │                  │
      │────────────────►│                   │
      │                  │ listProjects()    │
      │                  │─────────────────►│
      │                  │ ProjectList       │
      │                  │◄─────────────────│
      │ Projects + activity                 │
      │◄────────────────│                   │
      │                  │                  │
      │ Select project   │                  │
      │────────────────►│                   │
      │                  │ switchProject()   │
      │                  │─────────────────►│
      │                  │          ┌───────┤
      │                  │          │ Save  │
      │                  │          │ state │
      │                  │          ├───────┘
      │                  │          ┌───────┤
      │                  │          │ Load  │
      │                  │          │context│
      │                  │          ├───────┘
      │                  │ ProjectLoaded     │
      │                  │◄─────────────────│
      │ Updated view     │                  │
      │◄────────────────│                   │
      │                  │                  │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Project Switcher)
    participant Engine as FlowEngine

    Dev->>+DesktopApp: Open project switcher
    DesktopApp->>+Engine: listProjects(userId) (BEH-SF-147)
    Engine-->>-DesktopApp: ProjectList{projects, recentActivity}
    DesktopApp-->>-Dev: Projects with activity indicators

    Dev->>+DesktopApp: Select target project
    DesktopApp->>+Engine: switchProject(projectId) (BEH-SF-143)
    Engine->>Engine: Save current project state
    Engine->>Engine: Load target project context
    Engine-->>-DesktopApp: ProjectLoaded{graph, config, activeFlows}
    DesktopApp-->>-Dev: Updated view for target project
```

## Steps

1. Open the Project Switcher in the desktop app
2. View list of available projects with recent activity indicators (BEH-SF-147)
3. Select the target project
4. System loads the project's graph, configuration, and active flows (BEH-SF-143)
5. Previous project state is preserved for quick return
6. All surfaces update to reflect the selected project's context

## Traceability

| Behavior   | Feature     | Role in this capability                  |
| ---------- | ----------- | ---------------------------------------- |
| BEH-SF-143 | FEAT-SF-017 | Project-scoped collaboration context     |
| BEH-SF-147 | FEAT-SF-017 | Project switching and state preservation |
