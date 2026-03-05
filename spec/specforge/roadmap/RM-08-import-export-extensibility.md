---
id: RM-08
title: "Phase 8: Import/Export + Extensibility Plugins"
kind: roadmap
status: Planned
dependencies: []
---

## Phase 8: Import/Export + Extensibility Plugins

**Goal:** Plugin architecture, import/export pipelines, pluggable CLI agent tool support.
**Source:** —

### Deliverables

| #         | Deliverable                   | Package                    | Behaviors                | Status  |
| --------- | ----------------------------- | -------------------------- | ------------------------ | ------- |
| WI-PH-8-1 | Import/export pipelines       | `@specforge/server`        | BEH-SF-127–132           | Planned |
| WI-PH-8-2 | Custom flows                  | `@specforge/server`        | BEH-SF-087               | Planned |
| WI-PH-8-3 | Custom agents                 | `@specforge/server`        | BEH-SF-088–089           | Planned |
| WI-PH-8-4 | Phase hooks                   | `@specforge/server`        | BEH-SF-091–092           | Planned |
| WI-PH-8-5 | Event protocol                | `@specforge/server`        | BEH-SF-094               | Planned |
| WI-PH-8-6 | Plugin architecture           | `@specforge/server`        | BEH-SF-090               | Planned |
| WI-PH-8-7 | GxP plugin                    | `@specforge/server`        | —                        | Planned |
| WI-PH-8-8 | CLI agent tool abstraction    | `@specforge/cli`           | BEH-SF-093               | Planned |
| WI-PH-8-9 | Agent registry & distribution | `@specforge/orchestration` | BEH-SF-504–511 (ADR-021) | Planned |

### Exit Criteria

- [ ] EC-PH-8-1: Custom flow registered and executed via CLI
- [ ] EC-PH-8-2: Import/export round-trips preserve fidelity
- [ ] EC-PH-8-3: GxP plugin activates compliance features when installed
- [ ] EC-PH-8-4: Phase hooks execute without disrupting flow

### Risk

- Plugin isolation security; malicious or buggy plugins must not compromise host process
