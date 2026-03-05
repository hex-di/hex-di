---
id: UX-SF-060
kind: capability
title: "Approve Elevated Permission Requests"
status: active
features: [FEAT-SF-014, FEAT-SF-019]
behaviors: [BEH-SF-201, BEH-SF-204, BEH-SF-121]
persona: [team-lead]
surface: [desktop, dashboard, cli]
---

# Approve Elevated Permission Requests

## Use Case

A team lead opens the Approval Queue in the desktop app (e.g., a tool that can write to production systems), the system generates an elevated permission request routed to a team lead. The team lead reviews the request context and either approves (granting temporary elevated access) or denies. The same operation is accessible via CLI for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌─────────┐ ┌─────────┐ ┌───────────┐ ┌─────────────┐
│Team Lead│ │   Desktop App   │ │FlowEngine │ │AccessManager│
└────┬────┘ └────┬────┘ └─────┬─────┘ └──────┬──────┘
     │           │            │               │
     │           │ ElevatedPermissionRequest   │
     │           │◄───────────│               │
     │ Notification           │               │
     │◄──────────│            │               │
     │           │            │               │
     │ Review request         │               │
     │──────────►│            │               │
     │ Scope, justification   │               │
     │◄──────────│            │               │
     │           │            │               │
     │ [if approve]           │               │
     │ Click "Approve"        │               │
     │──────────►│            │               │
     │           │ grantTemporary()           │
     │           │───────────────────────────►│
     │           │ TemporaryGranted           │
     │           │◄───────────────────────────│
     │ Granted until expiry   │               │
     │◄──────────│            │               │
     │           │            │               │
     │ [else deny]            │               │
     │ Click "Deny" + reason  │               │
     │──────────►│            │               │
     │           │ denyEscalation()           │
     │           │───────────►│               │
     │           │ FlowPausedOrFallback       │
     │           │◄───────────│               │
     │ Denied, fallback path  │               │
     │◄──────────│            │               │
     │           │            │               │
```

```mermaid
sequenceDiagram
    actor Lead as Team Lead
    participant DesktopApp as Desktop App (Approval Queue)
    participant Engine as FlowEngine
    participant Access as AccessManager

    Engine->>DesktopApp: ElevatedPermissionRequest{scope, justification} (BEH-SF-204)
    DesktopApp->>Lead: Notification: permission escalation request

    Lead->>+DesktopApp: Review request details
    DesktopApp-->>-Lead: Scope, duration, justification, requester (BEH-SF-201)

    alt Approve
        Lead->>+DesktopApp: Click "Approve"
        DesktopApp->>+Access: grantTemporary(userId, scope, duration) (BEH-SF-121)
        Access-->>-DesktopApp: TemporaryGranted{expiry}
        DesktopApp-->>-Lead: Elevated permissions granted until expiry
    else Deny
        Lead->>+DesktopApp: Click "Deny", enter reason
        DesktopApp->>+Engine: denyEscalation(requestId, reason)
        Engine-->>-DesktopApp: FlowPausedOrFallback
        DesktopApp-->>-Lead: Request denied, flow using fallback path
    end
```

### CLI

```text
┌─────────┐ ┌─────────┐ ┌───────────┐ ┌─────────────┐
│Team Lead│ │ CLI │ │FlowEngine │ │AccessManager│
└────┬────┘ └────┬────┘ └─────┬─────┘ └──────┬──────┘
     │           │            │               │
     │           │ ElevatedPermissionRequest   │
     │           │◄───────────│               │
     │ Notification           │               │
     │◄──────────│            │               │
     │           │            │               │
     │ Review request         │               │
     │──────────►│            │               │
     │ Scope, justification   │               │
     │◄──────────│            │               │
     │           │            │               │
     │ [if approve]           │               │
     │ Click "Approve"        │               │
     │──────────►│            │               │
     │           │ grantTemporary()           │
     │           │───────────────────────────►│
     │           │ TemporaryGranted           │
     │           │◄───────────────────────────│
     │ Granted until expiry   │               │
     │◄──────────│            │               │
     │           │            │               │
     │ [else deny]            │               │
     │ Click "Deny" + reason  │               │
     │──────────►│            │               │
     │           │ denyEscalation()           │
     │           │───────────►│               │
     │           │ FlowPausedOrFallback       │
     │           │◄───────────│               │
     │ Denied, fallback path  │               │
     │◄──────────│            │               │
     │           │            │               │
```

```mermaid
sequenceDiagram
    actor Lead as Team Lead
    participant CLI
    participant Engine as FlowEngine
    participant Access as AccessManager

    Engine->>CLI: ElevatedPermissionRequest{scope, justification} (BEH-SF-204)
    CLI->>Lead: Notification: permission escalation request

    Lead->>+CLI: specforge permissions requests --list
    CLI-->>-Lead: Scope, duration, justification, requester (BEH-SF-201)

    alt Approve
        Lead->>+CLI: specforge permissions grant <request-id>
        CLI->>+Access: grantTemporary(userId, scope, duration) (BEH-SF-121)
        Access-->>-CLI: TemporaryGranted{expiry}
        CLI-->>-Lead: Elevated permissions granted until expiry
    else Deny
        Lead->>+CLI: specforge permissions deny <request-id> --reason "..."
        CLI->>+Engine: denyEscalation(requestId, reason)
        Engine-->>-CLI: FlowPausedOrFallback
        CLI-->>-Lead: Request denied, flow using fallback path
    end
```

## Steps

1. Open the Approval Queue in the desktop app
2. Elevated permission request is created and routed to approvers (BEH-SF-204)
3. Team lead receives notification via CLI or dashboard
4. Review the request: scope, duration, justification (BEH-SF-201)
5. Approve: temporary elevated permissions are granted (BEH-SF-121)
6. Or deny with reason: flow pauses or falls back to lower-privilege path
7. Decision is recorded in the audit trail with approver identity

## Decision Paths

```text
    ┌───────────────────────────────┐
    │ Permission escalation detected│
    └───────────────┬───────────────┘
                    ▼
    ┌───────────────────────────────┐
    │ Route request to approvers   │
    └───────────────┬───────────────┘
                    ▼
    ┌───────────────────────────────┐
    │ Team lead reviews request    │
    └───────────────┬───────────────┘
                    ▼
             ╱─────────────╲
            ╱   Approve     ╲
           ╱    escalation?  ╲
           ╲                 ╱
            ╲               ╱
             ╲─────────────╱
           Yes │       │ No
               ▼       │
  ┌────────────────────┐│
  │Grant temporary     ││
  │elevated access     ││
  └─────────┬──────────┘│
            ▼           │
  ┌────────────────────┐│
  │Flow continues with ││
  │elevated permissions││
  └────────────────────┘│
                        ▼
            ┌──────────────────┐
            │Record denial     │
            │reason            │
            └────────┬─────────┘
                     ▼
              ╱────────────╲
             ╱  Fallback    ╲
            ╱   path avail?  ╲
            ╲                ╱
             ╲              ╱
              ╲────────────╱
          Yes │        │ No
              ▼        ▼
  ┌──────────────┐ ┌──────────────┐
  │Flow continues│ │Flow paused,  │
  │lower-priv    │ │awaiting      │
  │path          │ │resolution    │
  └──────────────┘ └──────────────┘
```

```mermaid
flowchart TD
    A[Permission escalation detected] --> B[Route request to approvers]
    B --> C[Team lead reviews request]
    C --> D{Approve escalation?}
    D -->|Yes| E[Grant temporary elevated access]
    E --> F([Flow continues with elevated permissions])
    D -->|No| G[Record denial reason]
    G --> H{Fallback path available?}
    H -->|Yes| I([Flow continues on lower-privilege path])
    H -->|No| J([Flow paused, awaiting resolution])
```

## Traceability

| Behavior   | Feature     | Role in this capability              |
| ---------- | ----------- | ------------------------------------ |
| BEH-SF-201 | FEAT-SF-014 | Permission governance and escalation |
| BEH-SF-204 | FEAT-SF-019 | Elevated permission request routing  |
| BEH-SF-121 | FEAT-SF-014 | Human approval handling              |
