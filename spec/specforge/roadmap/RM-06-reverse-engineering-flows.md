---
id: RM-06
title: "Phase 6: Reverse Engineering & Additional Flows"
kind: roadmap
status: Planned
dependencies: []
---

## Phase 6: Reverse Engineering & Additional Flows

**Goal:** Remaining predefined flows, full CLI, tool isolation.
**Source:** [ports-and-adapters.md](../architecture/ports-and-adapters.md)

### Deliverables

| #         | Deliverable              | Package             | Behaviors      | Status  |
| --------- | ------------------------ | ------------------- | -------------- | ------- |
| WI-PH-6-1 | Reverse Engineering flow | `@specforge/server` | BEH-SF-050     | Planned |
| WI-PH-6-2 | Code Review flow         | `@specforge/server` | BEH-SF-051     | Planned |
| WI-PH-6-3 | Risk Assessment flow     | `@specforge/server` | BEH-SF-052     | Planned |
| WI-PH-6-4 | Onboarding flow          | `@specforge/server` | BEH-SF-053     | Planned |
| WI-PH-6-5 | Tool isolation           | `@specforge/server` | BEH-SF-081–086 | Planned |
| WI-PH-6-6 | Full CLI                 | `@specforge/cli`    | BEH-SF-113–120 | Planned |

### Architecture Coverage

- [ports-and-adapters.md](../architecture/ports-and-adapters.md) — Full port registry

### Exit Criteria

- [ ] EC-PH-6-1: All predefined flows run successfully
- [ ] EC-PH-6-2: `specforge reverse .` extracts specs from codebase
- [ ] EC-PH-6-3: CI integration works via GitHub Actions

### Risk

- Codebase parsing edge cases across languages and frameworks
