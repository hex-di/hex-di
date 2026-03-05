---
id: UX-SF-016
kind: capability
title: "Register Custom Import/Export Adapters"
status: active
features: [FEAT-SF-012, FEAT-SF-011]
behaviors: [BEH-SF-127, BEH-SF-132, BEH-SF-087]
persona: [developer]
surface: [desktop, cli]
---

# Register Custom Import/Export Adapters

## Use Case

A developer opens the Import/Export in the desktop app. Custom adapters plug into the same pipeline as built-in ones, enabling seamless integration with team-specific tools. The same operation is accessible via CLI (`specforge adapters register ./my-jira-adapter.js`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌───────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Developer │  │   Desktop App   │  │ AdapterRegistry │
└─────┬─────┘  └────────┬────────┘  └────────┬────────┘
      │ adapters   │              │
      │ register   │              │
      │───────────►│              │
      │            │ validate     │
      │            │ Interface()  │
      │            │ (132)        │
      │            │─────────────►│
      │            │ InterfaceValid│
      │            │◄─────────────│
      │            │ register()   │
      │            │ (087)        │
      │            │─────────────►│
      │            │ Registered   │
      │            │◄─────────────│
      │ Adapter    │              │
      │ "jira"     │              │
      │ registered │              │
      │◄───────────│              │
      │            │              │
      │ import jira│              │
      │───────────►│              │
      │            │ resolve      │
      │            │ Adapter()    │
      │            │─────────────►│
      │            │ Instance(127)│
      │            │◄─────────────│
      │ Import     │              │
      │ results    │              │
      │◄───────────│              │
      │            │              │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Import/Export)
    participant Registry as AdapterRegistry

    Dev->>+DesktopApp: Open Import/Export
    DesktopApp->>+Registry: validateInterface(adapter) (BEH-SF-132)
    Registry-->>-DesktopApp: InterfaceValid
    DesktopApp->>+Registry: register(adapter) (BEH-SF-087)
    Registry-->>-DesktopApp: AdapterRegistered{name: "jira"}
    DesktopApp-->>-Dev: Adapter "jira" registered

    Dev->>+DesktopApp: Open Import/Export → Click "Register Adapter"
    DesktopApp->>+Registry: resolveAdapter("jira")
    Registry-->>-DesktopApp: AdapterInstance (BEH-SF-127)
    DesktopApp-->>-Dev: Import results
```

### CLI

```text
┌───────────┐  ┌─────┐  ┌─────────────────┐
│ Developer │  │ CLI │  │ AdapterRegistry │
└─────┬─────┘  └──┬──┘  └────────┬────────┘
      │ adapters   │              │
      │ register   │              │
      │───────────►│              │
      │            │ validate     │
      │            │ Interface()  │
      │            │ (132)        │
      │            │─────────────►│
      │            │ InterfaceValid│
      │            │◄─────────────│
      │            │ register()   │
      │            │ (087)        │
      │            │─────────────►│
      │            │ Registered   │
      │            │◄─────────────│
      │ Adapter    │              │
      │ "jira"     │              │
      │ registered │              │
      │◄───────────│              │
      │            │              │
      │ import jira│              │
      │───────────►│              │
      │            │ resolve      │
      │            │ Adapter()    │
      │            │─────────────►│
      │            │ Instance(127)│
      │            │◄─────────────│
      │ Import     │              │
      │ results    │              │
      │◄───────────│              │
      │            │              │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant CLI
    participant Registry as AdapterRegistry

    Dev->>+CLI: specforge adapters register ./my-jira-adapter.js
    CLI->>+Registry: validateInterface(adapter) (BEH-SF-132)
    Registry-->>-CLI: InterfaceValid
    CLI->>+Registry: register(adapter) (BEH-SF-087)
    Registry-->>-CLI: AdapterRegistered{name: "jira"}
    CLI-->>-Dev: Adapter "jira" registered

    Dev->>+CLI: specforge import jira --project MY-PROJECT
    CLI->>+Registry: resolveAdapter("jira")
    Registry-->>-CLI: AdapterInstance (BEH-SF-127)
    CLI-->>-Dev: Import results
```

## Steps

1. Open the Import/Export in the desktop app
2. Register the adapter: `specforge adapters register ./my-jira-adapter.js` (BEH-SF-087)
3. System validates the adapter conforms to the required interface (BEH-SF-132)
4. Adapter appears in `specforge import --list-adapters` and `specforge export --list-adapters`
5. Use the adapter: `specforge import jira --project MY-PROJECT` (BEH-SF-127)
6. Custom adapter participates in the standard import/export pipeline

## Traceability

| Behavior   | Feature     | Role in this capability                |
| ---------- | ----------- | -------------------------------------- |
| BEH-SF-127 | FEAT-SF-012 | Import/export pipeline integration     |
| BEH-SF-132 | FEAT-SF-012 | Adapter interface validation           |
| BEH-SF-087 | FEAT-SF-011 | Hook pipeline for adapter registration |
