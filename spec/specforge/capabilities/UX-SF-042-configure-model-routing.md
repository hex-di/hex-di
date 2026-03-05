---
id: UX-SF-042
kind: capability
title: "Configure Model Routing per Role"
status: active
features: [FEAT-SF-010, FEAT-SF-028]
behaviors: [BEH-SF-169, BEH-SF-170, BEH-SF-330]
persona: [developer]
surface: [desktop, cli]
---

# Configure Model Routing per Role

## Use Case

A developer opens the Model Routing in the desktop app. Model routing optimizes cost while maintaining quality where it matters. The same operation is accessible via CLI (`specforge config models routing`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌───────────┐     ┌─────────────────┐     ┌───────────────┐
│ Developer │     │   Desktop App   │     │ ConfigManager │
└─────┬─────┘     └────────┬────────┘     └───────┬───────┘
      │               │               │
      │ Open Models │               │
      │ routing       │               │
      │──────────────►│               │
      │               │ getModel      │
      │               │ Routing()     │
      │               │──────────────►│
      │               │ RoutingTable  │
      │               │ {entries}     │
      │               │◄──────────────│
      │ Current role- │               │
      │ to-model      │               │
      │◄──────────────│               │
      │               │               │
      │ --role code-  │               │
      │ reviewer      │               │
      │ --model opus  │               │
      │──────────────►│               │
      │               │ setRouting    │
      │               │("code-       │
      │               │ reviewer",   │
      │               │ "opus")      │
      │               │──────────────►│
      │               │ RoutingUpdated│
      │               │◄──────────────│
      │ code-reviewer │               │
      │ → opus        │               │
      │◄──────────────│               │
      │               │               │
      │ --role        │               │
      │ formatter     │               │
      │ --fallback    │               │
      │ haiku         │               │
      │──────────────►│               │
      │               │ setFallback   │
      │               │("formatter", │
      │               │ "haiku")     │
      │               │──────────────►│
      │               │ FallbackSet   │
      │               │◄──────────────│
      │ Fallback model│               │
      │ configured    │               │
      │◄──────────────│               │
      │               │               │
      │               │ persist()     │
      │               │──────────────►│
      │               │ Saved         │
      │               │◄──────────────│
      │               │               │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Model Routing)
    participant Config as ConfigManager

    Dev->>+DesktopApp: Open Model Routing
    DesktopApp->>+Config: getModelRouting()
    Config-->>-DesktopApp: RoutingTable{entries}
    DesktopApp-->>-Dev: Current role-to-model routing

    Dev->>+DesktopApp: Open Model Routing → Select role
    DesktopApp->>+Config: setRouting("code-reviewer", "opus") (BEH-SF-170)
    Config-->>-DesktopApp: RoutingUpdated
    DesktopApp-->>-Dev: code-reviewer → opus

    Dev->>+DesktopApp: Assign model tier
    DesktopApp->>+Config: setFallback("formatter", "haiku") (BEH-SF-169)
    Config-->>-DesktopApp: FallbackSet
    DesktopApp-->>-Dev: Fallback model configured

    DesktopApp->>+Config: persist() (BEH-SF-330)
    Config-->>-DesktopApp: Saved
```

### CLI

```text
┌───────────┐     ┌─────┐     ┌───────────────┐
│ Developer │     │ CLI │     │ ConfigManager │
└─────┬─────┘     └──┬──┘     └───────┬───────┘
      │               │               │
      │ config models │               │
      │ routing       │               │
      │──────────────►│               │
      │               │ getModel      │
      │               │ Routing()     │
      │               │──────────────►│
      │               │ RoutingTable  │
      │               │ {entries}     │
      │               │◄──────────────│
      │ Current role- │               │
      │ to-model      │               │
      │◄──────────────│               │
      │               │               │
      │ --role code-  │               │
      │ reviewer      │               │
      │ --model opus  │               │
      │──────────────►│               │
      │               │ setRouting    │
      │               │("code-       │
      │               │ reviewer",   │
      │               │ "opus")      │
      │               │──────────────►│
      │               │ RoutingUpdated│
      │               │◄──────────────│
      │ code-reviewer │               │
      │ → opus        │               │
      │◄──────────────│               │
      │               │               │
      │ --role        │               │
      │ formatter     │               │
      │ --fallback    │               │
      │ haiku         │               │
      │──────────────►│               │
      │               │ setFallback   │
      │               │("formatter", │
      │               │ "haiku")     │
      │               │──────────────►│
      │               │ FallbackSet   │
      │               │◄──────────────│
      │ Fallback model│               │
      │ configured    │               │
      │◄──────────────│               │
      │               │               │
      │               │ persist()     │
      │               │──────────────►│
      │               │ Saved         │
      │               │◄──────────────│
      │               │               │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant CLI
    participant Config as ConfigManager

    Dev->>+CLI: specforge config models routing
    CLI->>+Config: getModelRouting()
    Config-->>-CLI: RoutingTable{entries}
    CLI-->>-Dev: Current role-to-model routing

    Dev->>+CLI: specforge config models routing --role code-reviewer --model opus
    CLI->>+Config: setRouting("code-reviewer", "opus") (BEH-SF-170)
    Config-->>-CLI: RoutingUpdated
    CLI-->>-Dev: code-reviewer → opus

    Dev->>+CLI: specforge config models routing --role formatter --fallback haiku
    CLI->>+Config: setFallback("formatter", "haiku") (BEH-SF-169)
    Config-->>-CLI: FallbackSet
    CLI-->>-Dev: Fallback model configured

    CLI->>+Config: persist() (BEH-SF-330)
    Config-->>-CLI: Saved
```

## Steps

1. Open the Model Routing in the desktop app
2. Set routing: `specforge config models routing --role code-reviewer --model opus` (BEH-SF-170)
3. Configure fallback models for when the primary is unavailable (BEH-SF-169)
4. Set escalation rules: auto-escalate to a better model on repeated failures
5. Persist routing configuration (BEH-SF-330)
6. View estimated cost impact of routing changes
7. Routing takes effect on the next flow execution

## Traceability

| Behavior   | Feature     | Role in this capability                     |
| ---------- | ----------- | ------------------------------------------- |
| BEH-SF-169 | FEAT-SF-010 | Cost optimization and model selection logic |
| BEH-SF-170 | FEAT-SF-010 | Role-to-model routing configuration         |
| BEH-SF-330 | FEAT-SF-028 | Configuration persistence                   |
