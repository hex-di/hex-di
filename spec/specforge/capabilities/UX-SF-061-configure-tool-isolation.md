---
id: UX-SF-061
kind: capability
title: "Configure Tool Isolation per Role"
status: active
features: [FEAT-SF-019, FEAT-SF-028]
behaviors: [BEH-SF-081, BEH-SF-082, BEH-SF-330]
persona: [admin]
surface: [desktop, cli]
---

# Configure Tool Isolation per Role

## Use Case

An admin opens the Tool Isolation in the desktop app. For example, the code-reviewer role might have read-only file access, while the code-generator role has write access but no network access. Isolation prevents agents from exceeding their intended capabilities. The same operation is accessible via CLI (`specforge access tools`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌──────────────┐  ┌─────────────────┐  ┌─────────────┐
│ Platform Admin│  │   Desktop App   │  │ ToolSandbox │
└──────┬───────┘  └────────┬────────┘  └──────┬──────┘
       │  access tools  │              │
       │────────────────►│              │
       │              │ getIsolation() │
       │              │───────────────►│
       │              │  Config{roles} │
       │              │◄───────────────│
       │  current cfg │              │
       │◄────────────────│              │
       │              │              │
       │  --role code-reviewer ...    │
       │────────────────►│              │
       │              │ setToolAccess()│
       │              │───────────────►│
       │              │  ┌────────────┐│
       │              │  │Validate    ││
       │              │  │role reqs   ││
       │              │  │(BEH-081)   ││
       │              │  ├────────────┤│
       │              │  │Apply sandbox││
       │              │  │(BEH-082)   ││
       │              │  └────────────┘│
       │              │ ConfigPersisted│
       │              │◄───────────────│
       │  config saved│              │
       │◄────────────────│              │
       │              │              │
```

```mermaid
sequenceDiagram
    actor Admin as Platform Admin
    participant DesktopApp as Desktop App (Tool Isolation)
    participant Sandbox as ToolSandbox

    Admin->>+DesktopApp: specforge access tools
    DesktopApp->>+Sandbox: getIsolationConfig()
    Sandbox-->>-DesktopApp: CurrentConfig{roles, rules}
    DesktopApp-->>-Admin: Display current isolation config

    Admin->>+DesktopApp: specforge access tools --role code-reviewer --allow read-file,grep --deny write-file,network
    DesktopApp->>+Sandbox: setToolAccess(role, allow, deny)
    Sandbox->>Sandbox: Validate role requirements (BEH-SF-081)
    Sandbox->>Sandbox: Apply sandbox constraints (BEH-SF-082)
    Sandbox-->>-DesktopApp: ConfigPersisted (BEH-SF-330)
    DesktopApp-->>-Admin: Isolation config saved for code-reviewer
```

### CLI

```text
┌──────────────┐  ┌─────┐  ┌─────────────┐
│ Platform Admin│  │ CLI │  │ ToolSandbox │
└──────┬───────┘  └──┬──┘  └──────┬──────┘
       │  access tools  │              │
       │────────────────►│              │
       │              │ getIsolation() │
       │              │───────────────►│
       │              │  Config{roles} │
       │              │◄───────────────│
       │  current cfg │              │
       │◄────────────────│              │
       │              │              │
       │  --role code-reviewer ...    │
       │────────────────►│              │
       │              │ setToolAccess()│
       │              │───────────────►│
       │              │  ┌────────────┐│
       │              │  │Validate    ││
       │              │  │role reqs   ││
       │              │  │(BEH-081)   ││
       │              │  ├────────────┤│
       │              │  │Apply sandbox││
       │              │  │(BEH-082)   ││
       │              │  └────────────┘│
       │              │ ConfigPersisted│
       │              │◄───────────────│
       │  config saved│              │
       │◄────────────────│              │
       │              │              │
```

```mermaid
sequenceDiagram
    actor Admin as Platform Admin
    participant CLI
    participant Sandbox as ToolSandbox

    Admin->>+CLI: specforge access tools
    CLI->>+Sandbox: getIsolationConfig()
    Sandbox-->>-CLI: CurrentConfig{roles, rules}
    CLI-->>-Admin: Display current isolation config

    Admin->>+CLI: specforge access tools --role code-reviewer --allow read-file,grep --deny write-file,network
    CLI->>+Sandbox: setToolAccess(role, allow, deny)
    Sandbox->>Sandbox: Validate role requirements (BEH-SF-081)
    Sandbox->>Sandbox: Apply sandbox constraints (BEH-SF-082)
    Sandbox-->>-CLI: ConfigPersisted (BEH-SF-330)
    CLI-->>-Admin: Isolation config saved for code-reviewer
```

## Steps

1. Open the Tool Isolation in the desktop app
2. Configure tool access: `specforge access tools --role code-reviewer --allow read-file,grep --deny write-file,network` (BEH-SF-081)
3. Set sandbox constraints: file system boundaries, network rules (BEH-SF-082)
4. System validates that tool access aligns with role requirements
5. Persist isolation configuration (BEH-SF-330)
6. Isolation is enforced when agent sessions start for the role
7. Violations are logged and optionally trigger alerts

## Traceability

| Behavior   | Feature     | Role in this capability             |
| ---------- | ----------- | ----------------------------------- |
| BEH-SF-081 | FEAT-SF-019 | Tool access control definitions     |
| BEH-SF-082 | FEAT-SF-019 | Sandbox constraint enforcement      |
| BEH-SF-330 | FEAT-SF-028 | Isolation configuration persistence |
