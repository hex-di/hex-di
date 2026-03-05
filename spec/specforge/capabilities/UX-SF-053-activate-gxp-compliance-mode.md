---
id: UX-SF-053
kind: capability
title: "Activate GxP Compliance Mode"
status: active
features: [FEAT-SF-021, FEAT-SF-028]
behaviors: [BEH-SF-370, BEH-SF-371, BEH-SF-330]
persona: [compliance-officer]
surface: [desktop, cli]
---

# Activate GxP Compliance Mode

## Use Case

A compliance officer opens the Compliance Settings in the desktop app to activate gxp compliance mode. The same operation is accessible via CLI (`specforge compliance activate gxp`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌──────────────────┐ ┌─────────────────┐ ┌─────────────┐ ┌────────────────┐
│Compliance Officer│ │   Desktop App   │ │ConfigManager│ │ComplianceEngine│
└────────┬─────────┘ └────────┬────────┘ └──────┬──────┘ └───────┬────────┘
         │               │          │                 │
         │ compliance activate gxp  │                 │
         │──────────────►│          │                 │
         │               │ validatePrerequisites()    │
         │               │───────────────────────────►│
         │               │ PrerequisitesMet            │
         │               │◄───────────────────────────│
         │               │          │                 │
         │               │ activateGxPMode()          │
         │               │─────────►│                 │
         │               │          │ Inject hooks    │
         │               │ GxPActivated               │
         │               │◄─────────│                 │
         │ GxP mode activated       │                 │
         │◄──────────────│          │                 │
         │               │          │                 │
         │ compliance status        │                 │
         │──────────────►│          │                 │
         │ GxP active, audit+esig   │                 │
         │◄──────────────│          │                 │
         │               │          │                 │
```

```mermaid
sequenceDiagram
    actor CO as Compliance Officer
    participant DesktopApp as Desktop App (Compliance Settings)
    participant Config as ConfigManager
    participant Compliance as ComplianceEngine

    CO->>+DesktopApp: specforge compliance activate gxp (BEH-SF-370)
    DesktopApp->>+Compliance: validatePrerequisites() (BEH-SF-371)
    Compliance-->>-DesktopApp: PrerequisitesMet{auditStorage, signatureInfra}

    DesktopApp->>+Config: activateGxPMode() (BEH-SF-330)
    Config->>Config: Inject compliance hooks into pipeline
    Config-->>-DesktopApp: GxPActivated
    DesktopApp-->>-CO: GxP compliance mode activated

    CO->>+DesktopApp: specforge compliance status
    DesktopApp-->>-CO: GxP active, audit trail enabled, e-signatures enabled
```

### CLI

```text
┌──────────────────┐ ┌─────┐ ┌─────────────┐ ┌────────────────┐
│Compliance Officer│ │ CLI │ │ConfigManager│ │ComplianceEngine│
└────────┬─────────┘ └──┬──┘ └──────┬──────┘ └───────┬────────┘
         │               │          │                 │
         │ compliance activate gxp  │                 │
         │──────────────►│          │                 │
         │               │ validatePrerequisites()    │
         │               │───────────────────────────►│
         │               │ PrerequisitesMet            │
         │               │◄───────────────────────────│
         │               │          │                 │
         │               │ activateGxPMode()          │
         │               │─────────►│                 │
         │               │          │ Inject hooks    │
         │               │ GxPActivated               │
         │               │◄─────────│                 │
         │ GxP mode activated       │                 │
         │◄──────────────│          │                 │
         │               │          │                 │
         │ compliance status        │                 │
         │──────────────►│          │                 │
         │ GxP active, audit+esig   │                 │
         │◄──────────────│          │                 │
         │               │          │                 │
```

```mermaid
sequenceDiagram
    actor CO as Compliance Officer
    participant CLI
    participant Config as ConfigManager
    participant Compliance as ComplianceEngine

    CO->>+CLI: specforge compliance activate gxp (BEH-SF-370)
    CLI->>+Compliance: validatePrerequisites() (BEH-SF-371)
    Compliance-->>-CLI: PrerequisitesMet{auditStorage, signatureInfra}

    CLI->>+Config: activateGxPMode() (BEH-SF-330)
    Config->>Config: Inject compliance hooks into pipeline
    Config-->>-CLI: GxPActivated
    CLI-->>-CO: GxP compliance mode activated

    CO->>+CLI: specforge compliance status
    CLI-->>-CO: GxP active, audit trail enabled, e-signatures enabled
```

## Steps

1. Open the Compliance Settings in the desktop app
2. System validates prerequisites (audit storage, signature infrastructure) (BEH-SF-371)
3. Compliance hooks are injected into the flow pipeline (BEH-SF-330)
4. All subsequent flow executions produce audit trail records
5. Electronic signature prompts appear at approval gates
6. Verify activation: `specforge compliance status`
7. GxP mode persists across sessions until explicitly deactivated

## State Model

```text
                    project        activate       prerequisites
            [*] ──────────► Inactive ──────────► Validating ──────────► Active
                              ▲                      │                  │  │
                              │   prerequisites      │                  │  │
                              │      failed          │                  │  │
                              └──────────────────────┘                  │  │
                              │                                         │  │
                              │           deactivate command            │  │
                              └─────────────────────────────────────────┘  │
                                                                          │
                                              configuration update        │
                                            Active ───────► Active ───────┘

            Active:   Audit trails enabled, E-signatures required,
                      Compliance hooks active
            Inactive: Standard mode, No compliance overhead
```

```mermaid
stateDiagram-v2
    direction LR
    [*] --> Inactive: project created
    Inactive --> Validating: activate command
    Validating --> Active: prerequisites met
    Validating --> Inactive: prerequisites failed
    Active --> Inactive: deactivate command
    Active --> Active: configuration update

    note right of Active: Audit trails enabled\nE-signatures required\nCompliance hooks active
    note right of Inactive: Standard mode\nNo compliance overhead
```

## Traceability

| Behavior   | Feature     | Role in this capability              |
| ---------- | ----------- | ------------------------------------ |
| BEH-SF-370 | FEAT-SF-021 | GxP compliance plugin activation     |
| BEH-SF-371 | FEAT-SF-021 | Compliance prerequisite validation   |
| BEH-SF-330 | FEAT-SF-028 | Compliance configuration persistence |
