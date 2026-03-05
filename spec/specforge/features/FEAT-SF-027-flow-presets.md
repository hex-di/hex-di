---
id: FEAT-SF-027
kind: feature
title: "Flow Presets & Templates"
status: active
behaviors: [BEH-SF-055]
adrs: [ADR-007]
roadmap_phases: [RM-02, RM-06]
---

# Flow Presets & Templates

## Problem

Configuring flows requires understanding convergence criteria, iteration bounds, agent assignments, and budget allocations. Most users want to trade a single knob (quick/standard/thorough) for all these settings, while power users want reusable templates for their custom configurations.

## Solution

Flow presets provide named configuration bundles (quick, standard, thorough) that set convergence thresholds, max iterations, model tiers, and budget allocations in one selection. The TemplatePort loads flow templates — both built-in presets and user-defined custom templates. Templates are composable: users can start from a preset and override specific settings. `specforge run --preset thorough` or `specforge run --template my-team-config` selects the configuration.

## Constituent Behaviors

| ID         | Summary                                             |
| ---------- | --------------------------------------------------- |
| BEH-SF-055 | Flow preset configuration (quick/standard/thorough) |

## Acceptance Criteria

- [ ] `--preset quick` runs with relaxed convergence and lower model tiers
- [ ] `--preset thorough` runs with strict convergence and premium models
- [ ] Custom templates save and load from project configuration
- [ ] Templates are composable — presets can be overridden per-setting
- [ ] Invalid template configurations are rejected with clear errors
- [ ] Preset selection is shown in flow analytics for cost comparison
