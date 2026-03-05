---
id: UX-SF-090
kind: capability
title: "Configure Autonomous Maintenance"
status: active
features: [FEAT-SF-034, FEAT-SF-004]
behaviors: [BEH-SF-456, BEH-SF-459, BEH-SF-460, BEH-SF-461, BEH-SF-463, BEH-SF-057]
persona: [developer, devops]
surface: [desktop, cli]
---

# Configure Autonomous Maintenance

## Use Case

A developer opens the Maintenance Settings in the desktop app. They set up scheduled audit triggers, configure proactive specification thresholds based on change velocity, and ensure all autonomous actions have human approval gates before merging. The same operation is accessible via CLI for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌───────────┐     ┌───────────┐     ┌──────────────────┐
│ Developer │     │   Desktop App   │     │ MaintenancePort  │
└─────┬─────┘     └─────┬─────┘     └────────┬─────────┘
      │ Open auto-       │                    │
      │ maintenance      │                    │
      │ config           │                    │
      │────────────────►│                    │
      │                 │ getConfig()        │
      │                 │───────────────────►│
      │                 │  MaintenanceConfig │
      │                 │◄───────────────────│
      │ Current policy  │                    │
      │◄────────────────│                    │
      │                 │                    │
      │ Set drift       │                    │
      │ threshold       │                    │
      │────────────────►│                    │
      │                 │ setThreshold       │
      │                 │ (score: 0.3)       │
      │                 │───────────────────►│
      │                 │  Updated           │
      │                 │◄───────────────────│
      │ Auto-trigger    │                    │
      │ at 0.3 (456)    │                    │
      │◄────────────────│                    │
      │                 │                    │
      │ Configure       │                    │
      │ approval gate   │                    │
      │────────────────►│                    │
      │                 │ setApprovalGate    │
      │                 │ (required: true)   │
      │                 │───────────────────►│
      │                 │  Updated           │
      │                 │◄───────────────────│
      │ Human approval  │                    │
      │ required (459)  │                    │
      │◄────────────────│                    │
      │                 │                    │
      │ Schedule audit  │                    │
      │ trigger         │                    │
      │────────────────►│                    │
      │                 │ setSchedule        │
      │                 │ (cron: "0 2 * * 1")│
      │                 │───────────────────►│
      │                 │  Scheduled         │
      │                 │◄───────────────────│
      │ Weekly audit    │                    │
      │ at 2am (461)    │                    │
      │◄────────────────│                    │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Maintenance Settings)
    participant MP as MaintenancePort

    Dev->>+DesktopApp: Open autonomous maintenance config
    DesktopApp->>+MP: getConfig()
    MP-->>-DesktopApp: MaintenanceConfig{threshold, schedule, approvalRequired}
    DesktopApp-->>-Dev: Current maintenance policy

    Dev->>+DesktopApp: Set drift threshold to 0.3
    DesktopApp->>+MP: setThreshold(0.3) (BEH-SF-456)
    MP-->>-DesktopApp: Updated
    DesktopApp-->>-Dev: Auto-trigger configured at drift score 0.3

    Dev->>+DesktopApp: Configure approval gate
    DesktopApp->>+MP: setApprovalGate(required: true) (BEH-SF-459)
    MP-->>-DesktopApp: Updated
    DesktopApp-->>-Dev: Human approval required for all autonomous changes

    Dev->>+DesktopApp: Schedule weekly audit trigger
    DesktopApp->>+MP: setSchedule("0 2 * * 1") (BEH-SF-461)
    MP-->>-DesktopApp: Scheduled
    DesktopApp-->>-Dev: Weekly audit at 2am Monday

    Dev->>+DesktopApp: Enable proactive mode
    DesktopApp->>+MP: setProactive(threshold: 0.7) (BEH-SF-460)
    MP-->>-DesktopApp: Enabled
    DesktopApp-->>-Dev: Proactive spec updates above 0.7 change velocity
```

### CLI

```text
┌───────────┐     ┌───────────┐     ┌──────────────────┐
│ Developer │     │ CLI │     │ MaintenancePort  │
└─────┬─────┘     └─────┬─────┘     └────────┬─────────┘
      │ Open auto-       │                    │
      │ maintenance      │                    │
      │ config           │                    │
      │────────────────►│                    │
      │                 │ getConfig()        │
      │                 │───────────────────►│
      │                 │  MaintenanceConfig │
      │                 │◄───────────────────│
      │ Current policy  │                    │
      │◄────────────────│                    │
      │                 │                    │
      │ Set drift       │                    │
      │ threshold       │                    │
      │────────────────►│                    │
      │                 │ setThreshold       │
      │                 │ (score: 0.3)       │
      │                 │───────────────────►│
      │                 │  Updated           │
      │                 │◄───────────────────│
      │ Auto-trigger    │                    │
      │ at 0.3 (456)    │                    │
      │◄────────────────│                    │
      │                 │                    │
      │ Configure       │                    │
      │ approval gate   │                    │
      │────────────────►│                    │
      │                 │ setApprovalGate    │
      │                 │ (required: true)   │
      │                 │───────────────────►│
      │                 │  Updated           │
      │                 │◄───────────────────│
      │ Human approval  │                    │
      │ required (459)  │                    │
      │◄────────────────│                    │
      │                 │                    │
      │ Schedule audit  │                    │
      │ trigger         │                    │
      │────────────────►│                    │
      │                 │ setSchedule        │
      │                 │ (cron: "0 2 * * 1")│
      │                 │───────────────────►│
      │                 │  Scheduled         │
      │                 │◄───────────────────│
      │ Weekly audit    │                    │
      │ at 2am (461)    │                    │
      │◄────────────────│                    │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant CLI
    participant MP as MaintenancePort

    Dev->>+CLI: specforge maintenance config
    CLI->>+MP: getConfig()
    MP-->>-CLI: MaintenanceConfig{threshold, schedule, approvalRequired}
    CLI-->>-Dev: Current maintenance policy

    Dev->>+CLI: specforge maintenance config --threshold 0.3
    CLI->>+MP: setThreshold(0.3) (BEH-SF-456)
    MP-->>-CLI: Updated
    CLI-->>-Dev: Auto-trigger configured at drift score 0.3

    Dev->>+CLI: specforge maintenance config --approval required
    CLI->>+MP: setApprovalGate(required: true) (BEH-SF-459)
    MP-->>-CLI: Updated
    CLI-->>-Dev: Human approval required for all autonomous changes

    Dev->>+CLI: specforge maintenance schedule "0 2 * * 1"
    CLI->>+MP: setSchedule("0 2 * * 1") (BEH-SF-461)
    MP-->>-CLI: Scheduled
    CLI-->>-Dev: Weekly audit at 2am Monday

    Dev->>+CLI: specforge maintenance config --proactive --velocity 0.7
    CLI->>+MP: setProactive(threshold: 0.7) (BEH-SF-460)
    MP-->>-CLI: Enabled
    CLI-->>-Dev: Proactive spec updates above 0.7 change velocity
```

## Steps

1. Open the Maintenance Settings in the desktop app
2. Set the drift threshold that triggers automatic maintenance flows (BEH-SF-456)
3. Configure the human approval gate — all autonomous changes require approval before merge (BEH-SF-459)
4. Set up scheduled audit triggers (daily, weekly, or custom cron) (BEH-SF-461)
5. Enable proactive specification mode with change velocity threshold (BEH-SF-460)
6. Configure which flow template is used for autonomous maintenance runs (BEH-SF-057)
7. View the autonomous maintenance audit trail (BEH-SF-463)
8. Test the configuration with a dry-run maintenance flow

## Traceability

| Behavior   | Feature     | Role in this capability                        |
| ---------- | ----------- | ---------------------------------------------- |
| BEH-SF-456 | FEAT-SF-034 | Drift-triggered auto-update flow configuration |
| BEH-SF-459 | FEAT-SF-034 | Human approval gate for autonomous changes     |
| BEH-SF-460 | FEAT-SF-034 | Proactive specification from change velocity   |
| BEH-SF-461 | FEAT-SF-034 | Self-maintenance trigger from scheduled audits |
| BEH-SF-463 | FEAT-SF-034 | Autonomous maintenance audit trail             |
| BEH-SF-057 | FEAT-SF-004 | Flow execution mechanics for maintenance runs  |
