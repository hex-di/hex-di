---
id: UX-SF-005
kind: capability
title: "Pause, Resume, and Cancel a Flow"
status: active
features: [FEAT-SF-004, FEAT-SF-009]
behaviors: [BEH-SF-065, BEH-SF-066, BEH-SF-113]
persona: [developer]
surface: [desktop, dashboard, cli]
---

# Pause, Resume, and Cancel a Flow

## Use Case

A developer opens the Flow Control in the desktop app to interrupt a running flow. The system supports graceful pause (completing the current agent turn), resume (continuing from the paused state), and cancel (terminating with cleanup). The same operation is accessible via CLI (`specforge pause <run-id>`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌───────────┐ ┌─────────────────┐ ┌────────────┐
│ Developer │ │   Desktop App   │ │ FlowEngine │
└─────┬─────┘ └────────┬────────┘ └─────┬──────┘
      │           │           │
      │ Open Flow       │
      │──────────►│           │
      │           │ execute(flow)
      │           │──────────►│
      │           │ ProgressEvent{phase: 1}
      │           │◄──────────│
      │           │           │
      │ Click        │
      │──────────►│           │
      │           │ pause(runId)
      │           │──────────►│
      │           │           │ Complete agent turn
      │           │           │──┐
      │           │           │◄─┘
      │           │ FlowPaused{checkpoint}
      │           │◄──────────│
      │ Paused at phase 1     │
      │◄──────────│           │
      │           │           │
      │ Click       │
      │──────────►│           │
      │           │ resume(runId)
      │           │──────────►│
      │           │ FlowResumed{phase: 1}
      │           │◄──────────│
      │           │ ProgressEvent{phase: 2}
      │           │◄──────────│
      │           │ FlowResult{completed}
      │           │◄──────────│
      │           │           │
      │ Summary shown │
      │◄──────────│           │
      │           │           │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Flow Control)
    participant Engine as FlowEngine

    Dev->>+DesktopApp: Open Flow Control → Select running flow
    DesktopApp->>+Engine: execute(flow)
    Engine-->>DesktopApp: ProgressEvent{phase: 1}

    Dev->>DesktopApp: Click "Pause"
    DesktopApp->>Engine: pause(runId)
    Engine->>Engine: Complete current agent turn
    Engine-->>DesktopApp: FlowPaused{checkpoint: saved} (BEH-SF-065)
    DesktopApp-->>Dev: Flow paused at phase 1

    Dev->>DesktopApp: Click "Resume"
    DesktopApp->>Engine: resume(runId)
    Engine-->>DesktopApp: FlowResumed{phase: 1} (BEH-SF-066)
    Engine-->>DesktopApp: ProgressEvent{phase: 2}
    Engine-->>-DesktopApp: FlowResult{status: completed}
    DesktopApp-->>-Dev: Execution summary with metrics
```

### CLI

```text
┌───────────┐ ┌─────┐ ┌────────────┐
│ Developer │ │ CLI │ │ FlowEngine │
└─────┬─────┘ └──┬──┘ └─────┬──────┘
      │           │           │
      │ run spec-verify       │
      │──────────►│           │
      │           │ execute(flow)
      │           │──────────►│
      │           │ ProgressEvent{phase: 1}
      │           │◄──────────│
      │           │           │
      │ pause <run-id>        │
      │──────────►│           │
      │           │ pause(runId)
      │           │──────────►│
      │           │           │ Complete agent turn
      │           │           │──┐
      │           │           │◄─┘
      │           │ FlowPaused{checkpoint}
      │           │◄──────────│
      │ Paused at phase 1     │
      │◄──────────│           │
      │           │           │
      │ resume <run-id>       │
      │──────────►│           │
      │           │ resume(runId)
      │           │──────────►│
      │           │ FlowResumed{phase: 1}
      │           │◄──────────│
      │           │ ProgressEvent{phase: 2}
      │           │◄──────────│
      │           │ FlowResult{completed}
      │           │◄──────────│
      │           │           │
      │ Summary + exit code 0 │
      │◄──────────│           │
      │           │           │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant CLI
    participant Engine as FlowEngine

    Dev->>+CLI: specforge run spec-verify
    CLI->>+Engine: execute(flow)
    Engine-->>CLI: ProgressEvent{phase: 1}

    Dev->>CLI: specforge pause <run-id>
    CLI->>Engine: pause(runId)
    Engine->>Engine: Complete current agent turn
    Engine-->>CLI: FlowPaused{checkpoint: saved} (BEH-SF-065)
    CLI-->>Dev: Flow paused at phase 1

    Dev->>CLI: specforge resume <run-id>
    CLI->>Engine: resume(runId)
    Engine-->>CLI: FlowResumed{phase: 1} (BEH-SF-066)
    Engine-->>CLI: ProgressEvent{phase: 2}
    Engine-->>-CLI: FlowResult{status: completed}
    CLI-->>-Dev: Summary + exit code 0
```

## Steps

1. Open the Flow Control in the desktop app
2. System completes the current agent turn and checkpoints state (BEH-SF-065)
3. Flow enters `paused` state; agents are suspended
4. Resume: `specforge resume <run-id>` to continue from checkpoint
5. System restores state and resumes from the paused phase (BEH-SF-066)
6. Cancel: `specforge cancel <run-id>` to terminate
7. System runs cleanup hooks and records partial results (BEH-SF-113)

## State Model

```text
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    │  start     pause       cancel           │
           [*]────►Idle────►Running────►Paused────►Cancelled──►[*]
                            │    │       │                     │
                            │    │       │ resume              │
                            │    │       └──►Running           │
                            │    │                             │
                            │    │ finish                      │
                            │    └──►Completed─────────────────►[*]
                            │         cancel
                            └──────►Cancelled

           Notes: Paused → Checkpoint saved to disk
                  Cancelled → Cleanup hooks executed
```

```mermaid
stateDiagram-v2
    direction LR
    [*] --> Idle
    Idle --> Running: start
    Running --> Paused: pause
    Paused --> Running: resume
    Running --> Completed: finish
    Running --> Cancelled: cancel
    Paused --> Cancelled: cancel
    Completed --> [*]
    Cancelled --> [*]

    note right of Paused: Checkpoint saved to disk
    note right of Cancelled: Cleanup hooks executed
```

## Traceability

| Behavior   | Feature     | Role in this capability                 |
| ---------- | ----------- | --------------------------------------- |
| BEH-SF-065 | FEAT-SF-004 | Graceful pause with state checkpointing |
| BEH-SF-066 | FEAT-SF-004 | Resume from checkpointed state          |
| BEH-SF-113 | FEAT-SF-009 | CLI commands for pause/resume/cancel    |
