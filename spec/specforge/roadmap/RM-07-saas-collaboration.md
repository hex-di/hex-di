---
id: RM-07
title: "Phase 7: SaaS Mode + Collaboration"
kind: roadmap
status: Planned
dependencies: []
---

## Phase 7: SaaS Mode + Collaboration

**Goal:** SaaS deployment mode, collaboration features, auth.
**Source:** [deployment-solo.md](../architecture/deployment-solo.md), [deployment-saas.md](../architecture/deployment-saas.md)

### Deliverables

| #         | Deliverable        | Package             | Behaviors      | Status  |
| --------- | ------------------ | ------------------- | -------------- | ------- |
| WI-PH-7-1 | Solo mode (polish) | `@specforge/server` | BEH-SF-095     | Planned |
| WI-PH-7-2 | SaaS mode          | `@specforge/server` | BEH-SF-096–100 | Planned |
| WI-PH-7-3 | Authentication     | `@specforge/server` | BEH-SF-101–106 | Planned |
| WI-PH-7-4 | Collaboration      | `@specforge/web`    | BEH-SF-143–150 | Planned |
| WI-PH-7-5 | Cloud services     | `@specforge/server` | BEH-SF-107–112 | Planned |

### Architecture Coverage

- [deployment-solo.md](../architecture/deployment-solo.md)
- [deployment-saas.md](../architecture/deployment-saas.md)

### Exit Criteria

- [ ] EC-PH-7-1: Solo and SaaS deployment modes functional
- [ ] EC-PH-7-2: Collaboration features work in web dashboard
- [ ] EC-PH-7-3: SaaS onboarding < 5 minutes

### Risk

- OAuth/billing integration complexity; multi-tenancy data isolation security
