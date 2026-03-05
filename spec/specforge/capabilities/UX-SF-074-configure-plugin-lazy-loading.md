---
id: UX-SF-074
kind: capability
title: "Configure Plugin Lazy Loading Strategy"
status: active
features: [FEAT-SF-011, FEAT-SF-032]
behaviors: [BEH-SF-090, BEH-SF-091, BEH-SF-547, BEH-SF-548, BEH-SF-549]
persona: [developer, admin]
surface: [desktop, cli]
---

# Configure Plugin Lazy Loading Strategy

## Use Case

A developer opens the Plugin Manager in the desktop app. Rather than loading the entire plugin at startup (which would add 3 seconds and 200MB of memory), the plugin declares a three-tier manifest: core logic loads at install time, UI assets load when the plugin's panel is first opened, and the ML model loads on first analysis request. The admin configures per-plugin budgets to prevent any single plugin from degrading startup performance. The same operation is accessible via CLI for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌───────────┐     ┌─────────────────┐     ┌──────────────┐
│ Developer │     │   Desktop App   │     │ PluginLoader │
└─────┬─────┘     └────────┬────────┘     └──────┬───────┘
      │               │              │
      │ plugins install│              │
      │ @sf/code-ai   │              │
      │──────────────►│              │
      │               │ parseManifest│
      │               │─────────────►│
      │               │ Manifest OK  │
      │               │ {core: 200KB,│
      │               │  assets: 1MB,│
      │               │  resources:  │
      │               │  180MB}      │
      │               │◄─────────────│
      │               │              │
      │               │ install(id)  │
      │               │ [load core   │
      │               │  only]       │
      │               │─────────────►│
      │               │──┐ Check     │
      │               │  │ budget    │
      │               │◄─┘           │
      │               │ Installed    │
      │               │ (500ms,12MB) │
      │               │◄─────────────│
      │ Installed.    │              │
      │ Core loaded.  │              │
      │ Resources:    │              │
      │ deferred.     │              │
      │◄──────────────│              │
      │               │              │
      │ [First use of │              │
      │  code analysis]              │
      │               │              │
      │ analyze code  │              │
      │──────────────►│              │
      │               │ loadTier(id, │
      │               │ "resources") │
      │               │─────────────►│
      │               │ TierLoaded   │
      │               │ {180MB,      │
      │               │  2100ms}     │
      │               │◄─────────────│
      │               │              │
      │               │ [analyze]    │
      │               │─────────────►│
      │               │ Result       │
      │               │◄─────────────│
      │ Analysis      │              │
      │ result        │              │
      │◄──────────────│              │
      │               │              │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Plugin Manager)
    participant Loader as PluginLoaderPort

    Dev->>+DesktopApp: Open Plugin Manager
    DesktopApp->>+Loader: parseManifest(manifest) (BEH-SF-547)
    Loader-->>-DesktopApp: Valid manifest — 3 tiers declared

    DesktopApp->>+Loader: install(pluginId) (BEH-SF-549)
    Note over Loader: Load core tier only (200KB, 500ms)
    Note over Loader: Check startup budget: 500ms < 2000ms limit
    Note over Loader: Assets and resources → lazy proxies
    Loader-->>-DesktopApp: Installed — core loaded, resources deferred
    DesktopApp-->>-Dev: Plugin ready (core only, resources on first use)

    Note over Dev: Later — first code analysis request

    Dev->>+DesktopApp: Open Plugin Manager → Settings
    DesktopApp->>+Loader: [Proxy triggers] loadTier(pluginId, "resources") (BEH-SF-548)
    Loader-->>-DesktopApp: TierLoadedEvent{180MB, 2100ms}
    DesktopApp-->>DesktopApp: Execute analysis with loaded resources (BEH-SF-090)
    DesktopApp-->>-Dev: Analysis results
```

### CLI

```text
┌───────────┐     ┌─────┐     ┌──────────────┐
│ Developer │     │ CLI │     │ PluginLoader │
└─────┬─────┘     └──┬──┘     └──────┬───────┘
      │               │              │
      │ plugins install│              │
      │ @sf/code-ai   │              │
      │──────────────►│              │
      │               │ parseManifest│
      │               │─────────────►│
      │               │ Manifest OK  │
      │               │ {core: 200KB,│
      │               │  assets: 1MB,│
      │               │  resources:  │
      │               │  180MB}      │
      │               │◄─────────────│
      │               │              │
      │               │ install(id)  │
      │               │ [load core   │
      │               │  only]       │
      │               │─────────────►│
      │               │──┐ Check     │
      │               │  │ budget    │
      │               │◄─┘           │
      │               │ Installed    │
      │               │ (500ms,12MB) │
      │               │◄─────────────│
      │ Installed.    │              │
      │ Core loaded.  │              │
      │ Resources:    │              │
      │ deferred.     │              │
      │◄──────────────│              │
      │               │              │
      │ [First use of │              │
      │  code analysis]              │
      │               │              │
      │ analyze code  │              │
      │──────────────►│              │
      │               │ loadTier(id, │
      │               │ "resources") │
      │               │─────────────►│
      │               │ TierLoaded   │
      │               │ {180MB,      │
      │               │  2100ms}     │
      │               │◄─────────────│
      │               │              │
      │               │ [analyze]    │
      │               │─────────────►│
      │               │ Result       │
      │               │◄─────────────│
      │ Analysis      │              │
      │ result        │              │
      │◄──────────────│              │
      │               │              │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant CLI
    participant Loader as PluginLoaderPort

    Dev->>+CLI: specforge plugins install @sf/code-ai
    CLI->>+Loader: parseManifest(manifest) (BEH-SF-547)
    Loader-->>-CLI: Valid manifest — 3 tiers declared

    CLI->>+Loader: install(pluginId) (BEH-SF-549)
    Note over Loader: Load core tier only (200KB, 500ms)
    Note over Loader: Check startup budget: 500ms < 2000ms limit
    Note over Loader: Assets and resources → lazy proxies
    Loader-->>-CLI: Installed — core loaded, resources deferred
    CLI-->>-Dev: Plugin ready (core only, resources on first use)

    Note over Dev: Later — first code analysis request

    Dev->>+CLI: specforge analyze --plugin=code-ai
    CLI->>+Loader: [Proxy triggers] loadTier(pluginId, "resources") (BEH-SF-548)
    Loader-->>-CLI: TierLoadedEvent{180MB, 2100ms}
    CLI-->>CLI: Execute analysis with loaded resources (BEH-SF-090)
    CLI-->>-Dev: Analysis results
```

## Steps

1. Open the Plugin Manager in the desktop app
2. System validates manifest structure — all three tiers must be declared (BEH-SF-547)
3. Core tier loads immediately and is checked against startup budget (BEH-SF-549)
4. If budget is exceeded, installation is rolled back with clear error (BEH-SF-549)
5. Assets and resources tiers are registered as lazy proxies (BEH-SF-548)
6. On first use, resource proxy intercepts the access and triggers lazy loading (BEH-SF-548)
7. Concurrent first accesses coalesce into a single load operation (BEH-SF-548)
8. Plugin extensibility hooks connect loaded plugin to the system (BEH-SF-090, BEH-SF-091)
9. List plugin tier status to verify what has been loaded

## Traceability

| Behavior   | Feature     | Role in this capability                               |
| ---------- | ----------- | ----------------------------------------------------- |
| BEH-SF-090 | FEAT-SF-032 | Plugin activation lifecycle and hook registration     |
| BEH-SF-091 | FEAT-SF-032 | Plugin dependency resolution and validation           |
| BEH-SF-547 | FEAT-SF-011 | Three-tier manifest parsing and validation            |
| BEH-SF-548 | FEAT-SF-011 | Lazy resource loading via proxy interception          |
| BEH-SF-549 | FEAT-SF-032 | Per-plugin startup time and memory budget enforcement |
