---
id: UX-SF-023
kind: capability
title: "Approve or Reject Agent Changes (Multi-User)"
status: active
features: [FEAT-SF-017, FEAT-SF-018]
behaviors: [BEH-SF-143, BEH-SF-146, BEH-SF-121]
persona: [team-lead]
surface: [desktop, dashboard, cli]
---

# Approve or Reject Agent Changes (Multi-User)

## Use Case

A team lead opens the Approval Queue in the desktop app (e.g., a code generation flow where both a tech lead and a security reviewer must sign off), the system routes approval requests to the designated reviewers. Each reviewer independently approves or rejects, and the flow proceeds only when all required approvals are collected. The same operation is accessible via CLI for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌───────────┐ ┌──────────┐ ┌───────────┐ ┌────────────┐
│ Tech Lead │ │ Security │ │   Desktop App   │ │ FlowEngine │
└─────┬─────┘ └────┬─────┘ └─────┬─────┘ └──────┬─────┘
      │             │             │◄──────────────│
      │             │             │ MultiApproval  │
      │◄────────────────────────│  Required       │
      │ Notification │            │               │
      │             │◄───────────│                │
      │             │ Notification│               │
      │             │             │               │
      │ Review changes            │               │
      │────────────────────────►│                 │
      │ Changes + status          │               │
      │◄────────────────────────│                 │
      │             │             │               │
      │ Click "Approve"          │                │
      │────────────────────────►│                 │
      │             │             │ approve(lead)  │
      │             │             │──────────────►│
      │             │             │ Recorded{1}    │
      │             │             │◄──────────────│
      │ Waiting for security     │                │
      │◄────────────────────────│                 │
      │             │             │               │
      │             │ Review      │               │
      │             │───────────►│                │
      │             │ "Lead ok"   │               │
      │             │◄───────────│                │
      │             │             │               │
      │  [if All approved]        │               │
      │             │ Approve     │               │
      │             │───────────►│                │
      │             │             │ approve(sec)   │
      │             │             │──────────────►│
      │             │             │ AllApproved    │
      │             │             │◄──────────────│
      │             │ Proceeding  │               │
      │             │◄───────────│                │
      │  [else Any rejection]     │               │
      │             │ Reject+note │               │
      │             │───────────►│                │
      │             │             │ reject(sec)    │
      │             │             │──────────────►│
      │             │             │ FlowPaused     │
      │             │             │◄──────────────│
      │             │ Paused      │               │
      │             │◄───────────│                │
      │             │             │               │
```

```mermaid
sequenceDiagram
    actor Lead as Tech Lead
    actor Security as Security Reviewer
    participant DesktopApp as Desktop App (Approval Queue)
    participant Engine as FlowEngine

    Engine->>DesktopApp: MultiApprovalRequired{runId, reviewers} (BEH-SF-146)
    DesktopApp->>Lead: Notification: approval needed
    DesktopApp->>Security: Notification: approval needed

    Lead->>+DesktopApp: Review changes
    DesktopApp-->>-Lead: Changes + approval status (BEH-SF-143)

    Lead->>+DesktopApp: Click "Approve" (BEH-SF-121)
    DesktopApp->>+Engine: approve(runId, userId: "lead")
    Engine-->>-DesktopApp: ApprovalRecorded{remaining: 1}
    DesktopApp-->>-Lead: Approved, waiting for security

    Security->>+DesktopApp: Review changes
    DesktopApp-->>-Security: Changes + "Tech Lead approved"

    alt All approved
        Security->>+DesktopApp: Click "Approve"
        DesktopApp->>+Engine: approve(runId, userId: "security")
        Engine-->>-DesktopApp: AllApproved, FlowProceeding
        DesktopApp-->>-Security: Flow proceeding
    else Any rejection
        Security->>+DesktopApp: Click "Reject", enter feedback
        DesktopApp->>+Engine: reject(runId, userId: "security", feedback)
        Engine-->>-DesktopApp: FlowPaused{aggregatedFeedback}
        DesktopApp-->>-Security: Flow paused with feedback
    end
```

### CLI

```text
┌───────────┐ ┌──────────┐ ┌───────────┐ ┌────────────┐
│ Tech Lead │ │ Security │ │ CLI │ │ FlowEngine │
└─────┬─────┘ └────┬─────┘ └─────┬─────┘ └──────┬─────┘
      │             │             │◄──────────────│
      │             │             │ MultiApproval  │
      │◄────────────────────────│  Required       │
      │ Notification │            │               │
      │             │◄───────────│                │
      │             │ Notification│               │
      │             │             │               │
      │ Review changes            │               │
      │────────────────────────►│                 │
      │ Changes + status          │               │
      │◄────────────────────────│                 │
      │             │             │               │
      │ Click "Approve"          │                │
      │────────────────────────►│                 │
      │             │             │ approve(lead)  │
      │             │             │──────────────►│
      │             │             │ Recorded{1}    │
      │             │             │◄──────────────│
      │ Waiting for security     │                │
      │◄────────────────────────│                 │
      │             │             │               │
      │             │ Review      │               │
      │             │───────────►│                │
      │             │ "Lead ok"   │               │
      │             │◄───────────│                │
      │             │             │               │
      │  [if All approved]        │               │
      │             │ Approve     │               │
      │             │───────────►│                │
      │             │             │ approve(sec)   │
      │             │             │──────────────►│
      │             │             │ AllApproved    │
      │             │             │◄──────────────│
      │             │ Proceeding  │               │
      │             │◄───────────│                │
      │  [else Any rejection]     │               │
      │             │ Reject+note │               │
      │             │───────────►│                │
      │             │             │ reject(sec)    │
      │             │             │──────────────►│
      │             │             │ FlowPaused     │
      │             │             │◄──────────────│
      │             │ Paused      │               │
      │             │◄───────────│                │
      │             │             │               │
```

```mermaid
sequenceDiagram
    actor Lead as Tech Lead
    actor Security as Security Reviewer
    participant CLI
    participant Engine as FlowEngine

    Engine->>CLI: MultiApprovalRequired{runId, reviewers} (BEH-SF-146)
    CLI->>Lead: Notification: approval needed
    CLI->>Security: Notification: approval needed

    Lead->>+CLI: specforge review <run-id>
    CLI-->>-Lead: Changes + approval status (BEH-SF-143)

    Lead->>+CLI: specforge approve <run-id> (BEH-SF-121)
    CLI->>+Engine: approve(runId, userId: "lead")
    Engine-->>-CLI: ApprovalRecorded{remaining: 1}
    CLI-->>-Lead: Approved, waiting for security

    Security->>+CLI: Review changes
    CLI-->>-Security: Changes + "Tech Lead approved"

    alt All approved
        Security->>+CLI: Click "Approve"
        CLI->>+Engine: approve(runId, userId: "security")
        Engine-->>-CLI: AllApproved, FlowProceeding
        CLI-->>-Security: Flow proceeding
    else Any rejection
        Security->>+CLI: Click "Reject", enter feedback
        CLI->>+Engine: reject(runId, userId: "security", feedback)
        Engine-->>-CLI: FlowPaused{aggregatedFeedback}
        CLI-->>-Security: Flow paused with feedback
    end
```

## Steps

1. Open the Approval Queue in the desktop app
2. System notifies all designated reviewers
3. Each reviewer accesses the changes via dashboard or CLI
4. Reviewers independently approve or reject with comments (BEH-SF-121)
5. Desktop app shows approval status: who has approved, who is pending (BEH-SF-143)
6. When all required approvals are collected, flow proceeds
7. If any reviewer rejects, flow pauses with aggregated feedback

## Decision Paths

```text
┌─────────────────────────────────────┐
│ Flow reaches multi-user approval    │
│ gate                                │
└──────────────────┬──────────────────┘
                   ▼
┌─────────────────────────────────────┐
│ Notify all designated reviewers     │
└──────────────────┬──────────────────┘
                   ▼
┌─────────────────────────────────────┐
│ Each reviewer reviews changes       │
│ independently                       │
└──────────────────┬──────────────────┘
                   ▼
            ╱             ╲
          ╱  All reviewers  ╲
         ╱   approved?       ╲
          ╲                 ╱
            ╲             ╱
         Yes │           │ No
             ▼           ▼
┌────────────────┐ ╱             ╲
│ Flow proceeds  │╱ Any reviewer   ╲
│ to next phase  │╲  rejected?     ╱
└────────────────┘  ╲            ╱
                      ╲        ╱
                  Yes │       │ No
                      ▼       ▼
          ┌────────────────┐ ┌──────────────┐
          │ Aggregate      │ │ Waiting for  │
          │ rejection      │ │ remaining    │
          │ feedback       │ │ reviewers    │
          └───────┬────────┘ └──────────────┘
                  ▼
          ┌────────────────┐
          │ Flow paused    │
          │ with feedback  │
          └────────────────┘
```

```mermaid
flowchart TD
    A[Flow reaches multi-user approval gate] --> B[Notify all designated reviewers]
    B --> C[Each reviewer reviews changes independently]
    C --> D{All reviewers approved?}
    D -->|Yes| E([Flow proceeds to next phase])
    D -->|No| F{Any reviewer rejected?}
    F -->|Yes| G[Aggregate rejection feedback]
    G --> H([Flow paused with feedback])
    F -->|No| I([Waiting for remaining reviewers])
```

## Traceability

| Behavior   | Feature     | Role in this capability                        |
| ---------- | ----------- | ---------------------------------------------- |
| BEH-SF-143 | FEAT-SF-017 | Multi-user collaboration and approval tracking |
| BEH-SF-146 | FEAT-SF-017 | Multi-reviewer approval gate mechanics         |
| BEH-SF-121 | FEAT-SF-018 | Human approval/rejection handling              |
