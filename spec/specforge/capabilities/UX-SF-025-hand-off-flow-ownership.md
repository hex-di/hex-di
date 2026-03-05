---
id: UX-SF-025
kind: capability
title: "Hand Off Flow Ownership"
status: active
features: [FEAT-SF-017, FEAT-SF-004]
behaviors: [BEH-SF-143, BEH-SF-148, BEH-SF-065]
persona: [team-lead]
surface: [desktop, cli]
---

# Hand Off Flow Ownership

## Use Case

A team lead opens the Flow Control in the desktop app to transfer ownership of a running or paused flow to another team member. The handoff transfers notification routing, approval authority, and monitoring responsibility. The same operation is accessible via CLI (`specforge pause <run-id>`) for scripted/CI workflows.

## Related Capabilities

| Capability                                      | Relationship                                     |
| ----------------------------------------------- | ------------------------------------------------ |
| [UX-SF-021](./UX-SF-021-observe-shared-flow.md) | Enables — new owner can observe before accepting |

## Interaction Flow

### Desktop App

```text
┌───────────┐     ┌─────────────────┐     ┌────────────┐
│ Team Lead │     │   Desktop App   │     │ FlowEngine │
└─────┬─────┘     └────────┬────────┘     └──────┬─────┘
      │ pause <id>    │               │
      │──────────────►│               │
      │               │ pause(runId)   │
      │               │──────────────►│
      │               │ FlowPaused     │
      │               │◄──────────────│
      │ Flow paused   │               │
      │◄──────────────│               │
      │               │               │
      │ transfer --to alice           │
      │──────────────►│               │
      │               │ transferOwner()│
      │               │──────────────►│
      │               │       ┌───────┤
      │               │       │Update │
      │               │       │routing│
      │               │       ├───────┘
      │               │       ┌───────┤
      │               │       │Xfer   │
      │               │       │auth   │
      │               │       ├───────┘
      │               │ Transferred    │
      │               │◄──────────────│
      │ Transferred   │               │
      │◄──────────────│               │
      │               │               │
      │  [alice receives notification] │
      │               │               │
```

```mermaid
sequenceDiagram
    actor Lead as Team Lead
    participant DesktopApp as Desktop App (Flow Control)
    participant Engine as FlowEngine

    Lead->>+DesktopApp: specforge pause <run-id>
    DesktopApp->>+Engine: pause(runId) (BEH-SF-065)
    Engine-->>-DesktopApp: FlowPaused
    DesktopApp-->>-Lead: Flow paused

    Lead->>+DesktopApp: specforge transfer <run-id> --to alice
    DesktopApp->>+Engine: transferOwnership(runId, "alice") (BEH-SF-148)
    Engine->>Engine: Update notification routing (BEH-SF-143)
    Engine->>Engine: Transfer approval authority
    Engine-->>-DesktopApp: OwnershipTransferred{newOwner: "alice"}
    DesktopApp-->>-Lead: Ownership transferred to alice

    Note over Engine: alice receives notification with flow context
```

### CLI

```text
┌───────────┐     ┌─────┐     ┌────────────┐
│ Team Lead │     │ CLI │     │ FlowEngine │
└─────┬─────┘     └──┬──┘     └──────┬─────┘
      │ pause <id>    │               │
      │──────────────►│               │
      │               │ pause(runId)   │
      │               │──────────────►│
      │               │ FlowPaused     │
      │               │◄──────────────│
      │ Flow paused   │               │
      │◄──────────────│               │
      │               │               │
      │ transfer --to alice           │
      │──────────────►│               │
      │               │ transferOwner()│
      │               │──────────────►│
      │               │       ┌───────┤
      │               │       │Update │
      │               │       │routing│
      │               │       ├───────┘
      │               │       ┌───────┤
      │               │       │Xfer   │
      │               │       │auth   │
      │               │       ├───────┘
      │               │ Transferred    │
      │               │◄──────────────│
      │ Transferred   │               │
      │◄──────────────│               │
      │               │               │
      │  [alice receives notification] │
      │               │               │
```

```mermaid
sequenceDiagram
    actor Lead as Team Lead
    participant CLI
    participant Engine as FlowEngine

    Lead->>+CLI: specforge pause <run-id>
    CLI->>+Engine: pause(runId) (BEH-SF-065)
    Engine-->>-CLI: FlowPaused
    CLI-->>-Lead: Flow paused

    Lead->>+CLI: specforge transfer <run-id> --to alice
    CLI->>+Engine: transferOwnership(runId, "alice") (BEH-SF-148)
    Engine->>Engine: Update notification routing (BEH-SF-143)
    Engine->>Engine: Transfer approval authority
    Engine-->>-CLI: OwnershipTransferred{newOwner: "alice"}
    CLI-->>-Lead: Ownership transferred to alice

    Note over Engine: alice receives notification with flow context
```

## Steps

1. Open the Flow Control in the desktop app
2. Transfer ownership: `specforge transfer <run-id> --to <username>` (BEH-SF-148)
3. System updates notification routing and approval authority (BEH-SF-143)
4. New owner receives a notification with flow context and current state
5. New owner can resume the flow: `specforge resume <run-id>`
6. Handoff is recorded in the audit trail

## Related Capabilities

| Capability                                      | Relationship                                     |
| ----------------------------------------------- | ------------------------------------------------ |
| [UX-SF-021](./UX-SF-021-observe-shared-flow.md) | Enables — new owner can observe before accepting |

## Traceability

| Behavior   | Feature     | Role in this capability                    |
| ---------- | ----------- | ------------------------------------------ |
| BEH-SF-143 | FEAT-SF-017 | Collaboration infrastructure for ownership |
| BEH-SF-148 | FEAT-SF-017 | Ownership transfer mechanics               |
| BEH-SF-065 | FEAT-SF-004 | Flow pause for safe handoff                |
