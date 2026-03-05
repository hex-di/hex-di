---
id: UX-SF-026
kind: capability
title: "Register and Configure Agent Backends"
status: active
features: [FEAT-SF-020, FEAT-SF-028]
behaviors: [BEH-SF-239, BEH-SF-240, BEH-SF-330]
persona: [devops]
surface: [desktop, cli]
---

# Register and Configure Agent Backends

## Use Case

A devops engineer opens the Agent Backends in the desktop app (e.g., Claude Code instances, custom LLM endpoints) and configures their connection parameters, authentication, and capacity limits. This is required during initial setup and when scaling the system. The same operation is accessible via CLI (`specforge backends register claude-code --endpoint <url>`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌────────┐     ┌─────────────────┐     ┌─────────────────┐
│ DevOps │     │   Desktop App   │     │ BackendRegistry │
└───┬────┘     └────────┬────────┘     └────────┬────────┘
    │ Open Agent     │                │
    │─────────────►│                │
    │              │ register()      │
    │              │───────────────►│
    │              │ Registered      │
    │              │◄───────────────│
    │ Registered   │                │
    │◄─────────────│                │
    │              │                │
    │ Click    │                │
    │  --auth      │                │
    │─────────────►│                │
    │              │ configureAuth() │
    │              │───────────────►│
    │              │ AuthConfigured  │
    │              │◄───────────────│
    │ Auth done    │                │
    │◄─────────────│                │
    │              │                │
    │ configure    │                │
    │  --max 10    │                │
    │─────────────►│                │
    │              │ setCapacity()   │
    │              │───────────────►│
    │              │ CapacitySet     │
    │              │◄───────────────│
    │ Capacity set │                │
    │◄─────────────│                │
    │              │                │
    │ test         │                │
    │─────────────►│                │
    │              │ healthCheck()   │
    │              │───────────────►│
    │              │ Healthy{120ms}  │
    │              │◄───────────────│
    │ Healthy      │                │
    │◄─────────────│                │
    │              │                │
```

```mermaid
sequenceDiagram
    actor Ops as DevOps
    participant DesktopApp as Desktop App (Agent Backends)
    participant Registry as BackendRegistry

    Ops->>+DesktopApp: specforge backends register claude-code --endpoint <url>
    DesktopApp->>+Registry: register(name, endpoint) (BEH-SF-239)
    Registry-->>-DesktopApp: BackendRegistered{id: "claude-code"}
    DesktopApp-->>-Ops: Backend registered

    Ops->>+DesktopApp: specforge backends configure claude-code --auth apikey
    DesktopApp->>+Registry: configureAuth(id, credentials) (BEH-SF-240)
    Registry-->>-DesktopApp: AuthConfigured
    DesktopApp-->>-Ops: Authentication configured

    Ops->>+DesktopApp: specforge backends configure claude-code --max-sessions 10
    DesktopApp->>+Registry: setCapacity(id, limits) (BEH-SF-330)
    Registry-->>-DesktopApp: CapacitySet
    DesktopApp-->>-Ops: Capacity limits configured

    Ops->>+DesktopApp: specforge backends test claude-code
    DesktopApp->>+Registry: healthCheck(id)
    Registry-->>-DesktopApp: Healthy{latency: 120ms}
    DesktopApp-->>-Ops: Backend healthy
```

### CLI

```text
┌────────┐     ┌─────┐     ┌─────────────────┐
│ DevOps │     │ CLI │     │ BackendRegistry │
└───┬────┘     └──┬──┘     └────────┬────────┘
    │ register     │                │
    │─────────────►│                │
    │              │ register()      │
    │              │───────────────►│
    │              │ Registered      │
    │              │◄───────────────│
    │ Registered   │                │
    │◄─────────────│                │
    │              │                │
    │ configure    │                │
    │  --auth      │                │
    │─────────────►│                │
    │              │ configureAuth() │
    │              │───────────────►│
    │              │ AuthConfigured  │
    │              │◄───────────────│
    │ Auth done    │                │
    │◄─────────────│                │
    │              │                │
    │ configure    │                │
    │  --max 10    │                │
    │─────────────►│                │
    │              │ setCapacity()   │
    │              │───────────────►│
    │              │ CapacitySet     │
    │              │◄───────────────│
    │ Capacity set │                │
    │◄─────────────│                │
    │              │                │
    │ test         │                │
    │─────────────►│                │
    │              │ healthCheck()   │
    │              │───────────────►│
    │              │ Healthy{120ms}  │
    │              │◄───────────────│
    │ Healthy      │                │
    │◄─────────────│                │
    │              │                │
```

```mermaid
sequenceDiagram
    actor Ops as DevOps
    participant CLI
    participant Registry as BackendRegistry

    Ops->>+CLI: specforge backends register claude-code --endpoint <url>
    CLI->>+Registry: register(name, endpoint) (BEH-SF-239)
    Registry-->>-CLI: BackendRegistered{id: "claude-code"}
    CLI-->>-Ops: Backend registered

    Ops->>+CLI: specforge backends configure claude-code --auth apikey
    CLI->>+Registry: configureAuth(id, credentials) (BEH-SF-240)
    Registry-->>-CLI: AuthConfigured
    CLI-->>-Ops: Authentication configured

    Ops->>+CLI: specforge backends configure claude-code --max-sessions 10
    CLI->>+Registry: setCapacity(id, limits) (BEH-SF-330)
    Registry-->>-CLI: CapacitySet
    CLI-->>-Ops: Capacity limits configured

    Ops->>+CLI: specforge backends test claude-code
    CLI->>+Registry: healthCheck(id)
    Registry-->>-CLI: Healthy{latency: 120ms}
    CLI-->>-Ops: Backend healthy
```

## Steps

1. Open the Agent Backends in the desktop app
2. Configure authentication credentials (API key or OAuth) (BEH-SF-240)
3. Set capacity limits: max concurrent sessions, token rate limits (BEH-SF-330)
4. Verify connectivity: `specforge backends test claude-code`
5. Backend appears in `specforge backends list` with status indicators
6. System begins routing agent sessions to the registered backend

## Traceability

| Behavior   | Feature     | Role in this capability                       |
| ---------- | ----------- | --------------------------------------------- |
| BEH-SF-239 | FEAT-SF-020 | Agent backend registration and lifecycle      |
| BEH-SF-240 | FEAT-SF-020 | Backend authentication configuration          |
| BEH-SF-330 | FEAT-SF-028 | Configuration management for backend settings |
