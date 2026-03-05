---
id: UX-SF-067
kind: capability
title: "Monitor System Health"
status: active
features: [FEAT-SF-025]
behaviors: [BEH-SF-239, BEH-SF-133, BEH-SF-113]
persona: [devops]
surface: [desktop, dashboard, cli]
---

# Monitor System Health

## Use Case

A devops engineer opens the System Health in the desktop app. The health dashboard provides at-a-glance system status with drill-down into individual components. The same operation is accessible via CLI (`specforge health`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌────────────────┐ ┌─────────────────┐ ┌──────────┐ ┌───────────────┐
│ DevOps Engineer│ │   Desktop App   │ │   Desktop App   │ │HealthMonitor  │
└───────┬────────┘ └────────┬────────┘ └────┬─────┘ └───────┬───────┘
        │           │       │           │
   [if Via CLI]     │       │           │
        │ health    │       │           │
        │───────────►│       │           │
        │           │ checkAll()        │
        │           │──────────────────►│
        │           │  HealthReport{}   │
        │           │◄──────────────────│
        │  status   │       │           │
        │◄───────────│       │           │
   [else Via Dashboard]     │           │
        │ open health│       │           │
        │───────────────────►│           │
        │           │       │streamHealth│
        │           │       │──────────►│
        │           │       │HealthStream│
        │           │       │◄──────────│
        │  live dash│       │           │
        │◄───────────────────│           │
   [end]            │       │           │
        │           │       │           │
        │      ── Continuous monitoring ──
        │           │       │  ┌───────┐│
        │           │       │  │Check  ││
        │           │       │  │backends││
        │           │       │  │BEH-239││
        │           │       │  └───────┘│
        │           │       │ Degraded  │
        │           │       │◄──────────│
        │           │       │           │
```

```mermaid
sequenceDiagram
    actor Ops as DevOps Engineer
    participant DesktopApp as Desktop App (System Health)
    participant Health as HealthMonitor

    Ops->>+DesktopApp: Open System Health → View service status
    DesktopApp->>+Health: checkAll()
    Health-->>-DesktopApp: HealthReport{server, neo4j, agents, mcp}
    DesktopApp-->>-Ops: Component status with health indicators (BEH-SF-113)

    Ops->>+DesktopApp: Select component for details
    DesktopApp->>+Health: streamHealth()
    Health-->>-DesktopApp: HealthStream{components, metrics}
    DesktopApp-->>-Ops: Live health dashboard (BEH-SF-133)

    Note over Health: Continuous monitoring
    Health->>Health: Check agent backends (BEH-SF-239)
    Health-->>DesktopApp: DegradedAlert{component, reason, impact}
```

### CLI

```text
┌────────────────┐ ┌─────┐ ┌──────────┐ ┌───────────────┐
│ DevOps Engineer│ │ CLI │ │HealthMonitor  │
└───────┬────────┘ └──┬──┘ └────┬─────┘ └───────┬───────┘
        │           │       │           │
   [if Via CLI]     │       │           │
        │ health    │       │           │
        │───────────►│       │           │
        │           │ checkAll()        │
        │           │──────────────────►│
        │           │  HealthReport{}   │
        │           │◄──────────────────│
        │  status   │       │           │
        │◄───────────│       │           │
   [else Via Dashboard]     │           │
        │ open health│       │           │
        │───────────────────►│           │
        │           │       │streamHealth│
        │           │       │──────────►│
        │           │       │HealthStream│
        │           │       │◄──────────│
        │  live dash│       │           │
        │◄───────────────────│           │
   [end]            │       │           │
        │           │       │           │
        │      ── Continuous monitoring ──
        │           │       │  ┌───────┐│
        │           │       │  │Check  ││
        │           │       │  │backends││
        │           │       │  │BEH-239││
        │           │       │  └───────┘│
        │           │       │ Degraded  │
        │           │       │◄──────────│
        │           │       │           │
```

```mermaid
sequenceDiagram
    actor Ops as DevOps Engineer
    participant CLI
    participant CLI
    participant Health as HealthMonitor

    alt Via CLI
        Ops->>+CLI: specforge health
        CLI->>+Health: checkAll()
        Health-->>-CLI: HealthReport{server, neo4j, agents, mcp}
        CLI-->>-Ops: Component status table (BEH-SF-113)
    else Continuous monitoring
        Ops->>+CLI: specforge health --watch
        CLI->>+Health: streamHealth()
        Health-->>-CLI: HealthStream{components, metrics}
        CLI-->>-Ops: Live health stream (BEH-SF-133)
    end

    Note over Health: Continuous monitoring
    Health->>Health: Check agent backends (BEH-SF-239)
    Health-->>CLI: DegradedAlert{component, reason, impact}
```

## Steps

1. Open the System Health in the desktop app
2. Or Open the desktop app system health panel (BEH-SF-133)
3. View component health: server, Neo4j, agent backends, MCP servers
4. Backend health includes latency, error rate, and session counts (BEH-SF-239)
5. Degraded components are flagged with reason and impact assessment
6. Historical health data shows uptime and incident trends
7. Set up alerts for health state transitions

## Traceability

| Behavior   | Feature     | Role in this capability         |
| ---------- | ----------- | ------------------------------- |
| BEH-SF-239 | FEAT-SF-025 | Agent backend health monitoring |
| BEH-SF-133 | FEAT-SF-025 | Dashboard health visualization  |
| BEH-SF-113 | FEAT-SF-025 | CLI health check command        |
