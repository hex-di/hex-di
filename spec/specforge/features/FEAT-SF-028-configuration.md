---
id: FEAT-SF-028
kind: feature
title: "Configuration Management"
status: active
behaviors:
  [BEH-SF-330, BEH-SF-331, BEH-SF-544, BEH-SF-545, BEH-SF-546, BEH-SF-547, BEH-SF-548, BEH-SF-549]
adrs: [ADR-005]
roadmap_phases: [RM-01]
---

# Configuration Management

## Problem

SpecForge has many configurable surfaces — deployment mode, Neo4j connection, agent backends, model tiers, budget limits, flow presets, plugin settings, GxP mode — but no unified configuration system. Settings are scattered and hard to discover.

## Solution

The ConfigPort provides a layered configuration system: defaults → project config (`.specforge/config.yaml`) → environment variables (`SPECFORGE_*`) → CLI flags. Configuration is validated at startup against a schema, with clear errors for invalid or missing settings. The CLI exposes `specforge config` for viewing and editing settings. Configuration changes take effect without restart where possible (hot-reload for non-structural settings).

## Constituent Behaviors

| ID         | Summary                                           |
| ---------- | ------------------------------------------------- |
| BEH-SF-330 | CLI configuration management (`specforge config`) |

## Acceptance Criteria

- [ ] Configuration loads from defaults, project file, env vars, and CLI flags in priority order
- [ ] Invalid configuration is rejected at startup with actionable error messages
- [ ] `specforge config list` shows all active settings with their sources
- [ ] `specforge config set` persists settings to project config file
- [ ] Environment variable overrides work for all settings
- [ ] Non-structural settings hot-reload without restart
