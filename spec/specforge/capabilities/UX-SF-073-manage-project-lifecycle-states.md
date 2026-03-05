---
id: UX-SF-073
kind: capability
title: "Manage Project Lifecycle States"
status: active
features: [FEAT-SF-028, FEAT-SF-017]
behaviors: [BEH-SF-143, BEH-SF-330, BEH-SF-544, BEH-SF-545, BEH-SF-546]
persona: [admin, team-lead]
surface: [desktop, dashboard, cli]
---

# Manage Project Lifecycle States

## Use Case

An admin opens the Project Lifecycle in the desktop app. The state machine enforces valid transitions, maintenance mode pauses running flows and restricts non-admin writes, and archival captures a restorable snapshot with schema migration support. The same operation is accessible via CLI for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌──────────┐     ┌───────────┐     ┌──────────────────┐
│  Admin   │     │   Desktop App   │     │ ProjectLifecycle │
└────┬─────┘     └─────┬─────┘     └────────┬─────────┘
     │                  │                    │
     │ Create project   │                    │
     │─────────────────►│                    │
     │                  │ transition(id,     │
     │                  │ "creating")        │
     │                  │───────────────────►│
     │                  │ TransitionEvent    │
     │                  │◄───────────────────│
     │ Project creating │                    │
     │◄─────────────────│                    │
     │                  │                    │
     │ Activate project │                    │
     │─────────────────►│                    │
     │                  │ transition(id,     │
     │                  │ "active")          │
     │                  │───────────────────►│
     │                  │ TransitionEvent    │
     │                  │◄───────────────────│
     │ Project active   │                    │
     │◄─────────────────│                    │
     │                  │                    │
     │ Enter maintenance│                    │
     │─────────────────►│                    │
     │                  │ transition(id,     │
     │                  │ "maintenance")     │
     │                  │───────────────────►│
     │                  │ [Flows paused,     │
     │                  │  writes restricted]│
     │                  │ TransitionEvent    │
     │                  │◄───────────────────│
     │ Maintenance mode │                    │
     │◄─────────────────│                    │
     │                  │                    │
     │ Archive project  │                    │
     │─────────────────►│                    │
     │                  │ transition(id,     │
     │                  │ "archived")        │
     │                  │───────────────────►│
     │                  │ [Snapshot created] │
     │                  │ TransitionEvent    │
     │                  │◄───────────────────│
     │ Project archived │                    │
     │◄─────────────────│                    │
     │                  │                    │
```

```mermaid
sequenceDiagram
    actor Admin
    participant DesktopApp as Desktop App (Project Lifecycle)
    participant PLC as ProjectLifecyclePort

    Admin->>+DesktopApp: Create new project
    DesktopApp->>+PLC: transition(projectId, "creating") (BEH-SF-544)
    PLC-->>-DesktopApp: ProjectTransitionEvent{pending→creating}
    DesktopApp-->>-Admin: Project in "creating" state

    Admin->>+DesktopApp: Activate project
    DesktopApp->>+PLC: transition(projectId, "active") (BEH-SF-544)
    PLC-->>-DesktopApp: ProjectTransitionEvent{creating→active}
    DesktopApp-->>-Admin: Project active — team notified (BEH-SF-143)

    Admin->>+DesktopApp: Enter maintenance for schema migration
    DesktopApp->>+PLC: transition(projectId, "maintenance") (BEH-SF-544)
    Note over PLC: Flows paused, non-admin writes blocked (BEH-SF-545)
    PLC-->>-DesktopApp: ProjectTransitionEvent{active→maintenance}
    DesktopApp-->>-Admin: Maintenance mode — flows paused

    Admin->>+DesktopApp: Archive completed project
    DesktopApp->>+PLC: transition(projectId, "archived") (BEH-SF-544)
    Note over PLC: Snapshot created with schema version (BEH-SF-546)
    PLC-->>-DesktopApp: ProjectTransitionEvent{maintenance→archived}
    DesktopApp-->>-Admin: Project archived with snapshot
```

### CLI

```text
┌──────────┐     ┌───────────┐     ┌──────────────────┐
│  Admin   │     │ CLI │     │ ProjectLifecycle │
└────┬─────┘     └─────┬─────┘     └────────┬─────────┘
     │                  │                    │
     │ Create project   │                    │
     │─────────────────►│                    │
     │                  │ transition(id,     │
     │                  │ "creating")        │
     │                  │───────────────────►│
     │                  │ TransitionEvent    │
     │                  │◄───────────────────│
     │ Project creating │                    │
     │◄─────────────────│                    │
     │                  │                    │
     │ Activate project │                    │
     │─────────────────►│                    │
     │                  │ transition(id,     │
     │                  │ "active")          │
     │                  │───────────────────►│
     │                  │ TransitionEvent    │
     │                  │◄───────────────────│
     │ Project active   │                    │
     │◄─────────────────│                    │
     │                  │                    │
     │ Enter maintenance│                    │
     │─────────────────►│                    │
     │                  │ transition(id,     │
     │                  │ "maintenance")     │
     │                  │───────────────────►│
     │                  │ [Flows paused,     │
     │                  │  writes restricted]│
     │                  │ TransitionEvent    │
     │                  │◄───────────────────│
     │ Maintenance mode │                    │
     │◄─────────────────│                    │
     │                  │                    │
     │ Archive project  │                    │
     │─────────────────►│                    │
     │                  │ transition(id,     │
     │                  │ "archived")        │
     │                  │───────────────────►│
     │                  │ [Snapshot created] │
     │                  │ TransitionEvent    │
     │                  │◄───────────────────│
     │ Project archived │                    │
     │◄─────────────────│                    │
     │                  │                    │
```

```mermaid
sequenceDiagram
    actor Admin
    participant CLI
    participant PLC as ProjectLifecyclePort

    Admin->>+CLI: specforge project create
    CLI->>+PLC: transition(projectId, "creating") (BEH-SF-544)
    PLC-->>-CLI: ProjectTransitionEvent{pending→creating}
    CLI-->>-Admin: Project in "creating" state

    Admin->>+CLI: specforge project activate
    CLI->>+PLC: transition(projectId, "active") (BEH-SF-544)
    PLC-->>-CLI: ProjectTransitionEvent{creating→active}
    CLI-->>-Admin: Project active — team notified (BEH-SF-143)

    Admin->>+CLI: specforge project maintenance --reason "schema migration"
    CLI->>+PLC: transition(projectId, "maintenance") (BEH-SF-544)
    Note over PLC: Flows paused, non-admin writes blocked (BEH-SF-545)
    PLC-->>-CLI: ProjectTransitionEvent{active→maintenance}
    CLI-->>-Admin: Maintenance mode — flows paused

    Admin->>+CLI: specforge project archive
    CLI->>+PLC: transition(projectId, "archived") (BEH-SF-544)
    Note over PLC: Snapshot created with schema version (BEH-SF-546)
    PLC-->>-CLI: ProjectTransitionEvent{maintenance→archived}
    CLI-->>-Admin: Project archived with snapshot
```

## Steps

1. Open the Project Lifecycle in the desktop app
2. Transition through `creating` → `active` to begin development (BEH-SF-544)
3. Team members are notified of project activation (BEH-SF-143)
4. Enter `maintenance` mode for schema migrations — flows pause, writes restricted (BEH-SF-545)
5. Perform maintenance tasks (admin-only writes allowed) (BEH-SF-545)
6. Exit maintenance back to `active` or proceed to `archived` (BEH-SF-544)
7. Archival creates a restorable snapshot with schema version metadata (BEH-SF-546)
8. Restore from archive applies schema migrations if the schema has evolved (BEH-SF-546)
9. Configuration changes are recorded in project history (BEH-SF-330)

## Decision Paths

```mermaid
flowchart TD
    A[pending] -->|Initialize| B[creating]
    B -->|Setup complete| C[active]
    C -->|Schema migration needed| D[maintenance]
    D -->|Migration complete| C
    C -->|Project complete| E[archived]
    D -->|Shutdown during maintenance| E
    E -->|Restore needed| C
    E -->|Permanent removal| F([deleted — terminal])
```

## Traceability

| Behavior   | Feature     | Role in this capability                                          |
| ---------- | ----------- | ---------------------------------------------------------------- |
| BEH-SF-143 | FEAT-SF-017 | Team notification on project state changes                       |
| BEH-SF-330 | FEAT-SF-028 | Configuration change recording in project history                |
| BEH-SF-544 | FEAT-SF-028 | Project state machine with enforced transitions                  |
| BEH-SF-545 | FEAT-SF-028 | Maintenance mode enforcement — flow pause and access restriction |
| BEH-SF-546 | FEAT-SF-028 | Archive snapshot and restore with schema migration               |
