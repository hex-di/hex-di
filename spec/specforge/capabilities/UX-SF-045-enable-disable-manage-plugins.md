---
id: UX-SF-045
kind: capability
title: "Enable, Disable, and Manage Plugins"
status: active
features: [FEAT-SF-011, FEAT-SF-009]
behaviors: [BEH-SF-087, BEH-SF-089, BEH-SF-113]
persona: [developer]
surface: [desktop, cli]
---

# Enable, Disable, and Manage Plugins

## Use Case

A developer opens the Plugin Manager in the desktop app to enable, disable, and manage plugins. The same operation is accessible via CLI (`specforge plugins list`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌───────────┐     ┌─────────────────┐     ┌────────────────┐
│ Developer │     │   Desktop App   │     │ PluginRegistry │
└─────┬─────┘     └────────┬────────┘     └───────┬────────┘
      │               │               │
      │ plugins list  │               │
      │──────────────►│               │
      │               │ listInstalled │
      │               │ ()            │
      │               │──────────────►│
      │               │ PluginList    │
      │               │{plugins,      │
      │               │ statuses}     │
      │               │◄──────────────│
      │ Installed     │               │
      │ plugins with  │               │
      │ status        │               │
      │◄──────────────│               │
      │               │               │
      │ Toggle               │
      │ @specforge/   │               │
      │ security-audit│               │
      │──────────────►│               │
      │               │ disable       │
      │               │ (pluginId)    │
      │               │──────────────►│
      │               │               │──┐ Deregister
      │               │               │  │ components
      │               │               │◄─┘
      │               │               │──┐ Preserve
      │               │               │  │ config
      │               │               │◄─┘
      │               │ PluginDisabled│
      │               │◄──────────────│
      │ Plugin disabled               │
      │ config preserved              │
      │◄──────────────│               │
      │               │               │
      │ [opt: Re-enable later]        │
      │ Toggle│               │
      │ @specforge/   │               │
      │ security-audit│               │
      │──────────────►│               │
      │               │ enable        │
      │               │ (pluginId)    │
      │               │──────────────►│
      │               │               │──┐ Re-register
      │               │               │  │ components
      │               │               │◄─┘
      │               │ PluginEnabled │
      │               │◄──────────────│
      │ Plugin        │               │
      │ re-enabled    │               │
      │◄──────────────│               │
      │               │               │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Plugin Manager)
    participant Registry as PluginRegistry

    Dev->>+DesktopApp: Open Plugin Manager
    DesktopApp->>+Registry: listInstalled()
    Registry-->>-DesktopApp: PluginList{plugins, statuses}
    DesktopApp-->>-Dev: Installed plugins with status

    Dev->>+DesktopApp: Click "Disable" on plugin
    DesktopApp->>+Registry: disable(pluginId) (BEH-SF-087)
    Registry->>Registry: Deregister components (BEH-SF-089)
    Registry->>Registry: Preserve configuration
    Registry-->>-DesktopApp: PluginDisabled
    DesktopApp-->>-Dev: Plugin disabled, config preserved

    opt Re-enable later
        Dev->>+DesktopApp: Click "Enable" on plugin
        DesktopApp->>+Registry: enable(pluginId)
        Registry->>Registry: Re-register components from saved config
        Registry-->>-DesktopApp: PluginEnabled
        DesktopApp-->>-Dev: Plugin re-enabled
    end
```

### CLI

```text
┌───────────┐     ┌─────┐     ┌────────────────┐
│ Developer │     │ CLI │     │ PluginRegistry │
└─────┬─────┘     └──┬──┘     └───────┬────────┘
      │               │               │
      │ plugins list  │               │
      │──────────────►│               │
      │               │ listInstalled │
      │               │ ()            │
      │               │──────────────►│
      │               │ PluginList    │
      │               │{plugins,      │
      │               │ statuses}     │
      │               │◄──────────────│
      │ Installed     │               │
      │ plugins with  │               │
      │ status        │               │
      │◄──────────────│               │
      │               │               │
      │ plugins disable               │
      │ @specforge/   │               │
      │ security-audit│               │
      │──────────────►│               │
      │               │ disable       │
      │               │ (pluginId)    │
      │               │──────────────►│
      │               │               │──┐ Deregister
      │               │               │  │ components
      │               │               │◄─┘
      │               │               │──┐ Preserve
      │               │               │  │ config
      │               │               │◄─┘
      │               │ PluginDisabled│
      │               │◄──────────────│
      │ Plugin disabled               │
      │ config preserved              │
      │◄──────────────│               │
      │               │               │
      │ [opt: Re-enable later]        │
      │ plugins enable│               │
      │ @specforge/   │               │
      │ security-audit│               │
      │──────────────►│               │
      │               │ enable        │
      │               │ (pluginId)    │
      │               │──────────────►│
      │               │               │──┐ Re-register
      │               │               │  │ components
      │               │               │◄─┘
      │               │ PluginEnabled │
      │               │◄──────────────│
      │ Plugin        │               │
      │ re-enabled    │               │
      │◄──────────────│               │
      │               │               │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant CLI
    participant Registry as PluginRegistry

    Dev->>+CLI: specforge plugins list (BEH-SF-113)
    CLI->>+Registry: listInstalled()
    Registry-->>-CLI: PluginList{plugins, statuses}
    CLI-->>-Dev: Installed plugins with status

    Dev->>+CLI: specforge plugins disable @specforge/security-audit
    CLI->>+Registry: disable(pluginId) (BEH-SF-087)
    Registry->>Registry: Deregister components (BEH-SF-089)
    Registry->>Registry: Preserve configuration
    Registry-->>-CLI: PluginDisabled
    CLI-->>-Dev: Plugin disabled, config preserved

    opt Re-enable later
        Dev->>+CLI: specforge plugins enable @specforge/security-audit
        CLI->>+Registry: enable(pluginId)
        Registry->>Registry: Re-register components from saved config
        Registry-->>-CLI: PluginEnabled
        CLI-->>-Dev: Plugin re-enabled
    end
```

## Steps

1. Open the Plugin Manager in the desktop app
2. Disable a plugin: `specforge plugins disable @specforge/security-audit` (BEH-SF-087)
3. Plugin components are deregistered; configuration is preserved (BEH-SF-089)
4. Re-enable: `specforge plugins enable @specforge/security-audit`
5. Update: `specforge plugins update @specforge/security-audit`
6. Remove: `specforge plugins remove @specforge/security-audit`
7. View plugin details: `specforge plugins info @specforge/security-audit`

## State Model

```text
                                          ┌──────────────┐
              install         enable      │   Updating   │
 [*] ──────────────► Installed ────► Enabled ──update──►│              │
                                     ▲  │  │  ▲         │update        │
                                     │  │  │  │         │complete      │
                               enable│  │  │  └─────────┘              │
                                     │  │  │
                                Disabled │  │  remove
                                  │ disable│  │
                                  │  ◄─────┘  │
                                  │           ▼
                  (Config         │ remove   Removed ──────────► [*]
                   preserved)     └────────►  (Config deleted)
```

```mermaid
stateDiagram-v2
    direction LR
    [*] --> Installed: install
    Installed --> Enabled: enable
    Enabled --> Disabled: disable
    Disabled --> Enabled: enable
    Enabled --> Updating: update
    Updating --> Enabled: update complete
    Disabled --> Removed: remove
    Enabled --> Removed: remove
    Removed --> [*]

    note right of Disabled: Config preserved
    note right of Removed: Config deleted
```

## Traceability

| Behavior   | Feature     | Role in this capability                       |
| ---------- | ----------- | --------------------------------------------- |
| BEH-SF-087 | FEAT-SF-011 | Plugin lifecycle management                   |
| BEH-SF-089 | FEAT-SF-011 | Plugin enable/disable with state preservation |
| BEH-SF-113 | FEAT-SF-009 | CLI plugin management interface               |
