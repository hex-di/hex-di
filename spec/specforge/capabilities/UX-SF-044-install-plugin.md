---
id: UX-SF-044
kind: capability
title: "Install a Plugin"
status: active
features: [FEAT-SF-032, FEAT-SF-009]
behaviors: [BEH-SF-087, BEH-SF-088, BEH-SF-113]
persona: [developer]
surface: [desktop, cli]
---

# Install a Plugin

## Use Case

A developer opens the Plugin Manager in the desktop app to install a plugin. The same operation is accessible via CLI (`specforge plugins search security`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌───────────┐     ┌─────────────────┐     ┌────────────────┐
│ Developer │     │   Desktop App   │     │ PluginRegistry │
└─────┬─────┘     └────────┬────────┘     └───────┬────────┘
      │               │               │
      │ plugins search│               │
      │ security      │               │
      │──────────────►│               │
      │               │ search        │
      │               │ ("security")  │
      │               │──────────────►│
      │               │ SearchResults │
      │               │ {plugins}     │
      │               │◄──────────────│
      │ Available     │               │
      │ plugins       │               │
      │◄──────────────│               │
      │               │               │
      │ plugins install               │
      │ @specforge/   │               │
      │ security-audit│               │
      │──────────────►│               │
      │               │ download      │
      │               │ (pluginId)    │
      │               │──────────────►│
      │               │ Package       │
      │               │ Downloaded    │
      │               │◄──────────────│
      │               │               │
      │               │ validate      │
      │               │ (package)     │
      │               │──────────────►│
      │               │               │──┐ Check
      │               │               │  │ compat.
      │               │               │◄─┘
      │               │               │──┐ Resolve
      │               │               │  │ deps
      │               │               │◄─┘
      │               │ Validation    │
      │               │ Passed        │
      │               │◄──────────────│
      │               │               │
      │               │ register      │
      │               │ (package)     │
      │               │──────────────►│
      │               │ PluginInstalled
      │               │ {components}  │
      │               │◄──────────────│
      │ Installed:    │               │
      │ 2 flows,      │               │
      │ 1 role,       │               │
      │ 1 adapter     │               │
      │◄──────────────│               │
      │               │               │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Plugin Manager)
    participant Registry as PluginRegistry

    Dev->>+DesktopApp: Open Plugin Manager
    DesktopApp->>+Registry: search("security")
    Registry-->>-DesktopApp: SearchResults{plugins}
    DesktopApp-->>-Dev: Available plugins

    Dev->>+DesktopApp: Open Plugin Manager → Browse available
    DesktopApp->>+Registry: download(pluginId) (BEH-SF-087)
    Registry-->>-DesktopApp: PackageDownloaded

    DesktopApp->>+Registry: validate(package) (BEH-SF-088)
    Registry->>Registry: Check compatibility
    Registry->>Registry: Resolve dependencies
    Registry-->>-DesktopApp: ValidationPassed

    DesktopApp->>+Registry: register(package)
    Registry-->>-DesktopApp: PluginInstalled{components}
    DesktopApp-->>-Dev: Installed: 2 flows, 1 role, 1 adapter
```

### CLI

```text
┌───────────┐     ┌─────┐     ┌────────────────┐
│ Developer │     │ CLI │     │ PluginRegistry │
└─────┬─────┘     └──┬──┘     └───────┬────────┘
      │               │               │
      │ plugins search│               │
      │ security      │               │
      │──────────────►│               │
      │               │ search        │
      │               │ ("security")  │
      │               │──────────────►│
      │               │ SearchResults │
      │               │ {plugins}     │
      │               │◄──────────────│
      │ Available     │               │
      │ plugins       │               │
      │◄──────────────│               │
      │               │               │
      │ plugins install               │
      │ @specforge/   │               │
      │ security-audit│               │
      │──────────────►│               │
      │               │ download      │
      │               │ (pluginId)    │
      │               │──────────────►│
      │               │ Package       │
      │               │ Downloaded    │
      │               │◄──────────────│
      │               │               │
      │               │ validate      │
      │               │ (package)     │
      │               │──────────────►│
      │               │               │──┐ Check
      │               │               │  │ compat.
      │               │               │◄─┘
      │               │               │──┐ Resolve
      │               │               │  │ deps
      │               │               │◄─┘
      │               │ Validation    │
      │               │ Passed        │
      │               │◄──────────────│
      │               │               │
      │               │ register      │
      │               │ (package)     │
      │               │──────────────►│
      │               │ PluginInstalled
      │               │ {components}  │
      │               │◄──────────────│
      │ Installed:    │               │
      │ 2 flows,      │               │
      │ 1 role,       │               │
      │ 1 adapter     │               │
      │◄──────────────│               │
      │               │               │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant CLI
    participant Registry as PluginRegistry

    Dev->>+CLI: specforge plugins search security (BEH-SF-113)
    CLI->>+Registry: search("security")
    Registry-->>-CLI: SearchResults{plugins}
    CLI-->>-Dev: Available plugins

    Dev->>+CLI: specforge plugins install @specforge/security-audit
    CLI->>+Registry: download(pluginId) (BEH-SF-087)
    Registry-->>-CLI: PackageDownloaded

    CLI->>+Registry: validate(package) (BEH-SF-088)
    Registry->>Registry: Check compatibility
    Registry->>Registry: Resolve dependencies
    Registry-->>-CLI: ValidationPassed

    CLI->>+Registry: register(package)
    Registry-->>-CLI: PluginInstalled{components}
    CLI-->>-Dev: Installed: 2 flows, 1 role, 1 adapter
```

## Steps

1. Open the Plugin Manager in the desktop app
2. Install: `specforge plugins install @specforge/security-audit` (BEH-SF-087)
3. System downloads and validates the plugin package (BEH-SF-088)
4. Plugin dependencies are resolved and installed
5. Plugin components are registered (flows, roles, adapters)
6. CLI displays installed components summary
7. Plugin is ready to use immediately

## Decision Paths

```text
┌─────────────────────────────────┐
│ Developer runs install command  │
└────────────────┬────────────────┘
                 ▼
┌─────────────────────────────────┐
│    Download plugin package      │
└────────────────┬────────────────┘
                 ▼
          ╱ Compatibility ╲
         ╱    check?       ╲
        ╱                   ╲
       Yes                  No
        │                    │
        ▼                    ▼
  ╱ Dependencies ╲   ┌──────────────────┐
 ╱  resolved?     ╲  │  Installation    │
╱                  ╲ │  aborted with    │
Yes                No│  reason          │
 │                  │ └──────────────────┘
 │                  ▼          ▲
 │       ╱ Auto-resolve ╲     │
 │      ╱  possible?     ╲    │
 │     ╱                  ╲   │
 │    Yes                 No──┘
 │     │
 │     ▼
 │  ┌─────────────────────────┐
 │  │  Install dependencies   │
 │  └────────────┬────────────┘
 │               │
 ▼               ▼
┌─────────────────────────────────┐
│   Register plugin components    │
└────────────────┬────────────────┘
                 ▼
┌─────────────────────────────────┐
│   Plugin installed and ready    │
└─────────────────────────────────┘
```

```mermaid
flowchart TD
    A[Developer runs install command] --> B[Download plugin package]
    B --> C{Compatibility check}
    C -->|Compatible| D{Dependencies resolved?}
    C -->|Incompatible| E([Installation aborted with reason])
    D -->|Yes| F[Register plugin components]
    D -->|No| G{Auto-resolve possible?}
    G -->|Yes| H[Install dependencies] --> F
    G -->|No| E
    F --> I([Plugin installed and ready])
```

## Traceability

| Behavior   | Feature     | Role in this capability                     |
| ---------- | ----------- | ------------------------------------------- |
| BEH-SF-087 | FEAT-SF-032 | Plugin registration via extensibility hooks |
| BEH-SF-088 | FEAT-SF-032 | Plugin validation and dependency resolution |
| BEH-SF-113 | FEAT-SF-009 | CLI plugin management commands              |
