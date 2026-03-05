---
id: UX-SF-018
kind: capability
title: "Approve or Reject a Phase Transition"
status: active
features: [FEAT-SF-018, FEAT-SF-017]
behaviors: [BEH-SF-123, BEH-SF-124, BEH-SF-133]
persona: [team-lead]
surface: [desktop, dashboard, cli]
---

# Approve or Reject a Phase Transition

## Use Case

A team lead opens the Approval Queue in the desktop app to approve or reject a phase transition. The same operation is accessible via CLI (`specforge approve <run-id>`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌───────────┐     ┌───────────┐     ┌────────────┐
│ Team Lead │     │   Desktop App   │     │ FlowEngine │
└─────┬─────┘     └─────┬─────┘     └──────┬─────┘
      │                 │  ApprovalRequired │
      │                 │◄─────────────────│
      │ Notification:   │                  │
      │ review needed   │                  │
      │◄────────────────│                  │
      │                 │                  │
      │ Open phase      │                  │
      │ review          │                  │
      │────────────────►│                  │
      │ Phase outputs + │                  │
      │ metrics (133)   │                  │
      │◄────────────────│                  │
      │                 │                  │
      │  [if Approved]  │                  │
      │ Click "Approve" │                  │
      │────────────────►│                  │
      │                 │ approve() (123)  │
      │                 │─────────────────►│
      │                 │ PhaseAdvanced{3} │
      │                 │◄─────────────────│
      │ Proceeding to   │                  │
      │ phase 3         │                  │
      │◄────────────────│                  │
      │                 │                  │
      │  [else Rejected]│                  │
      │ Click "Reject"  │                  │
      │────────────────►│                  │
      │                 │ reject() (124)   │
      │                 │─────────────────►│
      │                 │ PhaseReentered{2}│
      │                 │◄─────────────────│
      │ Phase 2         │                  │
      │ re-entered      │                  │
      │◄────────────────│                  │
      │                 │                  │
```

```mermaid
sequenceDiagram
    actor Lead as Team Lead
    participant DesktopApp as Desktop App (Approval Queue)
    participant Engine as FlowEngine

    Engine->>DesktopApp: ApprovalRequired{runId, phase: 2}
    DesktopApp->>Lead: Notification: phase review needed

    Lead->>+DesktopApp: Open phase review
    DesktopApp-->>-Lead: Phase outputs + convergence metrics (BEH-SF-133)

    alt Approved
        Lead->>+DesktopApp: Click "Approve"
        DesktopApp->>+Engine: approve(runId) (BEH-SF-123)
        Engine-->>-DesktopApp: PhaseAdvanced{phase: 3}
        DesktopApp-->>-Lead: Flow proceeding to phase 3
    else Rejected with feedback
        Lead->>+DesktopApp: Click "Reject", enter feedback
        DesktopApp->>+Engine: reject(runId, feedback) (BEH-SF-124)
        Engine-->>-DesktopApp: PhaseReentered{phase: 2}
        DesktopApp-->>-Lead: Phase 2 re-entered with feedback
    end
```

### CLI

```text
┌───────────┐     ┌───────────┐     ┌────────────┐
│ Team Lead │     │ CLI │     │ FlowEngine │
└─────┬─────┘     └─────┬─────┘     └──────┬─────┘
      │                 │  ApprovalRequired │
      │                 │◄─────────────────│
      │ Notification:   │                  │
      │ review needed   │                  │
      │◄────────────────│                  │
      │                 │                  │
      │ Open phase      │                  │
      │ review          │                  │
      │────────────────►│                  │
      │ Phase outputs + │                  │
      │ metrics (133)   │                  │
      │◄────────────────│                  │
      │                 │                  │
      │  [if Approved]  │                  │
      │ Click "Approve" │                  │
      │────────────────►│                  │
      │                 │ approve() (123)  │
      │                 │─────────────────►│
      │                 │ PhaseAdvanced{3} │
      │                 │◄─────────────────│
      │ Proceeding to   │                  │
      │ phase 3         │                  │
      │◄────────────────│                  │
      │                 │                  │
      │  [else Rejected]│                  │
      │ Click "Reject"  │                  │
      │────────────────►│                  │
      │                 │ reject() (124)   │
      │                 │─────────────────►│
      │                 │ PhaseReentered{2}│
      │                 │◄─────────────────│
      │ Phase 2         │                  │
      │ re-entered      │                  │
      │◄────────────────│                  │
      │                 │                  │
```

```mermaid
sequenceDiagram
    actor Lead as Team Lead
    participant CLI
    participant Engine as FlowEngine

    Engine->>CLI: ApprovalRequired{runId, phase: 2}
    CLI->>Lead: Notification: phase review needed

    Lead->>+CLI: specforge approve --list
    CLI-->>-Lead: Phase outputs + convergence metrics (BEH-SF-133)

    alt Approved
        Lead->>+CLI: specforge approve <run-id> --phase 2
        CLI->>+Engine: approve(runId) (BEH-SF-123)
        Engine-->>-CLI: PhaseAdvanced{phase: 3}
        CLI-->>-Lead: Flow proceeding to phase 3
    else Rejected with feedback
        Lead->>+CLI: specforge reject <run-id> --phase 2 --reason "..."
        CLI->>+Engine: reject(runId, feedback) (BEH-SF-124)
        Engine-->>-CLI: PhaseReentered{phase: 2}
        CLI-->>-Lead: Phase 2 re-entered with feedback
    end
```

## Steps

1. Open the Approval Queue in the desktop app
2. Team lead receives notification via CLI prompt or dashboard alert
3. Review the phase's outputs, agent findings, and convergence metrics (BEH-SF-133)
4. Approve: `specforge approve <run-id>` (flow proceeds to next phase) (BEH-SF-123)
5. Or reject with feedback: `specforge reject <run-id> "Insufficient coverage analysis"` (BEH-SF-124)
6. On rejection, flow re-enters the phase with the feedback as additional context
7. Approval/rejection decision is recorded in the audit trail

## Decision Paths

```text
┌─────────────────────────────┐
│ Flow reaches approval gate  │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ Team lead reviews outputs   │
└──────────────┬──────────────┘
               ▼
         ╱ Approve  ╲
        ╱   phase?   ╲
       ╱               ╲
   Yes ╲               ╱ No
        ╲             ╱
    ┌────▼────┐  ┌────▼──────────────────┐
    │ Flow    │  │ Enter rejection       │
    │ advances│  │ feedback              │
    │ to next │  └───────────┬───────────┘
    │ phase   │              ▼
    └─────────┘  ┌───────────────────────┐
                 │ Phase re-entered      │
                 │ with feedback         │
                 └───────────────────────┘
```

```mermaid
flowchart TD
    A[Flow reaches approval gate] --> B[Team lead reviews outputs]
    B --> C{Approve phase?}
    C -->|Yes| D([Flow advances to next phase])
    C -->|No| E[Enter rejection feedback]
    E --> F([Phase re-entered with feedback])
```

## Traceability

| Behavior   | Feature     | Role in this capability                       |
| ---------- | ----------- | --------------------------------------------- |
| BEH-SF-123 | FEAT-SF-018 | Approval gate mechanics and phase advancement |
| BEH-SF-124 | FEAT-SF-018 | Rejection handling with feedback loop         |
| BEH-SF-133 | FEAT-SF-017 | Dashboard review interface for phase outputs  |
