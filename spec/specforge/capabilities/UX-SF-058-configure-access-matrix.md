---
id: UX-SF-058
kind: capability
title: "Configure Role-Based Access Matrix"
status: active
features: [FEAT-SF-014, FEAT-SF-028]
behaviors: [BEH-SF-201, BEH-SF-202, BEH-SF-330]
persona: [admin]
surface: [desktop, cli]
---

# Configure Role-Based Access Matrix

## Use Case

An admin opens the Access Matrix in the desktop app. Roles (developer, team-lead, devops, compliance-officer, admin) are mapped to permissions (run flows, approve changes, configure backends, etc.). The matrix is enforced at every operation boundary. The same operation is accessible via CLI (`specforge access matrix`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌───────┐ ┌─────────────────┐ ┌─────────────┐
│ Admin │ │   Desktop App   │ │AccessManager│
└───┬───┘ └────────┬────────┘ └──────┬──────┘
    │         │           │
    │ access matrix       │
    │────────►│           │
    │         │ getMatrix()
    │         │──────────►│
    │         │ AccessMatrix
    │         │◄──────────│
    │ Current matrix      │
    │◄────────│           │
    │         │           │
    │ grant --role team-lead
    │ --permission approve.phases
    │────────►│           │
    │         │ grant()   │
    │         │──────────►│
    │         │ Granted   │
    │         │◄──────────│
    │ Permission granted  │
    │◄────────│           │
    │         │           │
    │ revoke --role developer
    │ --permission configure.backends
    │────────►│           │
    │         │ revoke()  │
    │         │──────────►│
    │         │    validateConsistency()
    │         │ Revoked   │
    │         │◄──────────│
    │ Permission revoked  │
    │◄────────│           │
    │         │           │
    │         │ persist() │
    │         │──────────►│
    │         │ MatrixSaved
    │         │◄──────────│
    │         │           │
```

```mermaid
sequenceDiagram
    actor Admin
    participant DesktopApp as Desktop App (Access Matrix)
    participant Access as AccessManager

    Admin->>+DesktopApp: specforge access matrix
    DesktopApp->>+Access: getMatrix()
    Access-->>-DesktopApp: AccessMatrix{roles, permissions}
    DesktopApp-->>-Admin: Current access matrix

    Admin->>+DesktopApp: specforge access grant --role team-lead --permission approve.phases
    DesktopApp->>+Access: grant("team-lead", "approve.phases") (BEH-SF-201)
    Access-->>-DesktopApp: PermissionGranted
    DesktopApp-->>-Admin: Permission granted

    Admin->>+DesktopApp: specforge access revoke --role developer --permission configure.backends
    DesktopApp->>+Access: revoke("developer", "configure.backends")
    Access->>Access: validateConsistency() (BEH-SF-202)
    Access-->>-DesktopApp: PermissionRevoked
    DesktopApp-->>-Admin: Permission revoked

    DesktopApp->>+Access: persist() (BEH-SF-330)
    Access-->>-DesktopApp: MatrixSaved
```

### CLI

```text
┌───────┐ ┌─────┐ ┌─────────────┐
│ Admin │ │ CLI │ │AccessManager│
└───┬───┘ └──┬──┘ └──────┬──────┘
    │         │           │
    │ access matrix       │
    │────────►│           │
    │         │ getMatrix()
    │         │──────────►│
    │         │ AccessMatrix
    │         │◄──────────│
    │ Current matrix      │
    │◄────────│           │
    │         │           │
    │ grant --role team-lead
    │ --permission approve.phases
    │────────►│           │
    │         │ grant()   │
    │         │──────────►│
    │         │ Granted   │
    │         │◄──────────│
    │ Permission granted  │
    │◄────────│           │
    │         │           │
    │ revoke --role developer
    │ --permission configure.backends
    │────────►│           │
    │         │ revoke()  │
    │         │──────────►│
    │         │    validateConsistency()
    │         │ Revoked   │
    │         │◄──────────│
    │ Permission revoked  │
    │◄────────│           │
    │         │           │
    │         │ persist() │
    │         │──────────►│
    │         │ MatrixSaved
    │         │◄──────────│
    │         │           │
```

```mermaid
sequenceDiagram
    actor Admin
    participant CLI
    participant Access as AccessManager

    Admin->>+CLI: specforge access matrix
    CLI->>+Access: getMatrix()
    Access-->>-CLI: AccessMatrix{roles, permissions}
    CLI-->>-Admin: Current access matrix

    Admin->>+CLI: specforge access grant --role team-lead --permission approve.phases
    CLI->>+Access: grant("team-lead", "approve.phases") (BEH-SF-201)
    Access-->>-CLI: PermissionGranted
    CLI-->>-Admin: Permission granted

    Admin->>+CLI: specforge access revoke --role developer --permission configure.backends
    CLI->>+Access: revoke("developer", "configure.backends")
    Access->>Access: validateConsistency() (BEH-SF-202)
    Access-->>-CLI: PermissionRevoked
    CLI-->>-Admin: Permission revoked

    CLI->>+Access: persist() (BEH-SF-330)
    Access-->>-CLI: MatrixSaved
```

## Steps

1. Open the Access Matrix in the desktop app
2. Modify permissions: `specforge access grant --role team-lead --permission approve.phases` (BEH-SF-201)
3. Revoke permissions: `specforge access revoke --role developer --permission configure.backends`
4. System validates the matrix for consistency (no orphaned permissions) (BEH-SF-202)
5. Persist the matrix (BEH-SF-330)
6. Changes take effect immediately for all active sessions
7. Audit trail records all access matrix changes

## Traceability

| Behavior   | Feature     | Role in this capability                     |
| ---------- | ----------- | ------------------------------------------- |
| BEH-SF-201 | FEAT-SF-014 | Permission governance model                 |
| BEH-SF-202 | FEAT-SF-014 | Access matrix validation                    |
| BEH-SF-330 | FEAT-SF-028 | Configuration persistence for access matrix |
