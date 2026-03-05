---
id: UX-SF-059
kind: capability
title: "Preview Permissions Before Execution"
status: active
features: [FEAT-SF-014, FEAT-SF-009]
behaviors: [BEH-SF-201, BEH-SF-203, BEH-SF-113]
persona: [developer]
surface: [desktop, cli]
---

# Preview Permissions Before Execution

## Use Case

A developer opens the Permission Preview in the desktop app to preview permissions before execution. The same operation is accessible via CLI (`specforge run spec-verify --dry-run --show-permissions`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌─────────┐ ┌─────────────────┐ ┌─────────────┐ ┌───────────┐
│Developer│ │   Desktop App   │ │AccessManager│ │FlowEngine │
└────┬────┘ └────────┬────────┘ └──────┬──────┘ └─────┬─────┘
     │          │           │              │
     │ run --dry-run --show-permissions    │
     │─────────►│           │              │
     │          │ analyzePermissions()     │
     │          │─────────────────────────►│
     │          │ PermissionManifest       │
     │          │◄─────────────────────────│
     │ Required permissions                │
     │◄─────────│           │              │
     │          │           │              │
     │          │ checkCurrentRole()       │
     │          │──────────►│              │
     │          │ RoleCheck │              │
     │          │◄──────────│              │
     │          │           │              │
     │ [if all permissions within role]    │
     │ Ready to run         │              │
     │◄─────────│           │              │
     │          │           │              │
     │ [else escalation needed]            │
     │ Elevated permissions needed         │
     │◄─────────│           │              │
     │          │           │              │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Permission Preview)
    participant Access as AccessManager
    participant Engine as FlowEngine

    Dev->>+DesktopApp: Open Permission Preview
    DesktopApp->>+Engine: analyzePermissions(flowId) (BEH-SF-203)
    Engine-->>-DesktopApp: PermissionManifest{perAgent, perPhase}
    DesktopApp-->>-Dev: Required permissions by agent and phase

    DesktopApp->>+Access: checkCurrentRole(permissions) (BEH-SF-201)
    Access-->>-DesktopApp: RoleCheck{granted, escalationNeeded}

    alt All permissions within role
        DesktopApp-->>Dev: All permissions available, ready to run
    else Escalation needed
        DesktopApp-->>Dev: Elevated permissions needed for: [list]
        Note over Dev: Request elevation or adjust flow
    end
```

### CLI

```text
┌─────────┐ ┌─────┐ ┌─────────────┐ ┌───────────┐
│Developer│ │ CLI │ │AccessManager│ │FlowEngine │
└────┬────┘ └──┬──┘ └──────┬──────┘ └─────┬─────┘
     │          │           │              │
     │ run --dry-run --show-permissions    │
     │─────────►│           │              │
     │          │ analyzePermissions()     │
     │          │─────────────────────────►│
     │          │ PermissionManifest       │
     │          │◄─────────────────────────│
     │ Required permissions                │
     │◄─────────│           │              │
     │          │           │              │
     │          │ checkCurrentRole()       │
     │          │──────────►│              │
     │          │ RoleCheck │              │
     │          │◄──────────│              │
     │          │           │              │
     │ [if all permissions within role]    │
     │ Ready to run         │              │
     │◄─────────│           │              │
     │          │           │              │
     │ [else escalation needed]            │
     │ Elevated permissions needed         │
     │◄─────────│           │              │
     │          │           │              │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant CLI
    participant Access as AccessManager
    participant Engine as FlowEngine

    Dev->>+CLI: specforge run spec-verify --dry-run --show-permissions (BEH-SF-113)
    CLI->>+Engine: analyzePermissions(flowId) (BEH-SF-203)
    Engine-->>-CLI: PermissionManifest{perAgent, perPhase}
    CLI-->>-Dev: Required permissions by agent and phase

    CLI->>+Access: checkCurrentRole(permissions) (BEH-SF-201)
    Access-->>-CLI: RoleCheck{granted, escalationNeeded}

    alt All permissions within role
        CLI-->>Dev: All permissions available, ready to run
    else Escalation needed
        CLI-->>Dev: Elevated permissions needed for: [list]
        Note over Dev: Request elevation or adjust flow
    end
```

## Steps

1. Open the Permission Preview in the desktop app
2. System analyzes the flow definition and agent role tool mappings (BEH-SF-203)
3. Displays required permissions grouped by agent and phase
4. Highlights any permissions that exceed the developer's current role (BEH-SF-201)
5. Shows which approvals will be needed during execution
6. Developer reviews and decides whether to proceed
7. Optionally request elevated permissions before starting

## Traceability

| Behavior   | Feature     | Role in this capability        |
| ---------- | ----------- | ------------------------------ |
| BEH-SF-201 | FEAT-SF-014 | Permission governance checks   |
| BEH-SF-203 | FEAT-SF-014 | Permission preview computation |
| BEH-SF-113 | FEAT-SF-009 | CLI dry-run mode and output    |
