---
id: RM-12
title: "Phase 12: Event-Triggered Flows & Continuous Verification"
kind: roadmap
status: Planned
dependencies: []
---

## Phase 12: Event-Triggered Flows & Continuous Verification

**Goal:** Automated flow triggers from external events, CI gate integration, and continuous drift detection.
**Source:** [research/RES-10-product-vision-synthesis.md](../research/RES-10-product-vision-synthesis.md)

### Deliverables

| #          | Deliverable                | Package             | Behaviors      | Status  |
| ---------- | -------------------------- | ------------------- | -------------- | ------- |
| WI-PH-12-1 | GitHub webhook integration | `@specforge/server` | BEH-SF-432–433 | Planned |
| WI-PH-12-2 | `specforge check` CI gate  | `@specforge/cli`    | BEH-SF-598–601 | Planned |
| WI-PH-12-3 | Continuous drift detection | `@specforge/server` | BEH-SF-598–599 | Planned |
| WI-PH-12-4 | Event-triggered scheduler  | `@specforge/server` | BEH-SF-434–439 | Planned |

> **Note:** CI gate core behaviors (drift detection, scoring, gate threshold, machine-readable output) moved to BEH-SF-598--601 (FEAT-SF-029) to resolve ID collision with event-triggered flow behaviors. BEH-SF-432--439 now exclusively cover event-triggered flow behaviors (FEAT-SF-030).

### Behavior Detail (BEH-SF-432–439) — Event-Triggered Flows

| ID         | Behavior                                | Source                 |
| ---------- | --------------------------------------- | ---------------------- |
| BEH-SF-432 | Webhook endpoint registration           | research/10 §7 Phase 2 |
| BEH-SF-433 | Event-to-flow mapping rules             | research/10 §7 Phase 2 |
| BEH-SF-434 | File watcher triggers for local changes | research/10 §7 Phase 3 |
| BEH-SF-435 | Cron-style scheduled triggers           | research/10 §7 Phase 2 |
| BEH-SF-436 | Background execution queue with retry   | research/10 §7 Phase 2 |
| BEH-SF-437 | Trigger authentication and validation   | research/10 §7 Phase 2 |
| BEH-SF-438 | Event deduplication and throttling      | research/10 §7 Phase 2 |
| BEH-SF-439 | Trigger audit log                       | research/10 §7 Phase 2 |

### Behavior Detail (BEH-SF-598–601) — CI Gate & Drift Core

| ID         | Behavior                                         | Source                     |
| ---------- | ------------------------------------------------ | -------------------------- |
| BEH-SF-598 | Drift detection — code-to-spec delta computation | research/10 §7 Phase 2, §5 |
| BEH-SF-599 | Drift scoring by severity                        | research/10 §7 Phase 2     |
| BEH-SF-600 | CI gate — fail build on threshold violation      | research/10 §7 Phase 2     |
| BEH-SF-601 | Machine-readable output (JSON, JUnit XML) for CI | research/10 §7 Phase 2     |

### Exit Criteria

- [ ] EC-PH-12-1: PR open triggers a code-review flow automatically within 2 minutes
- [ ] EC-PH-12-2: `specforge check` blocks merge when drift exceeds configured threshold
- [ ] EC-PH-12-3: Continuous drift detection creates findings within 30 seconds of file save
- [ ] EC-PH-12-4: Event queue handles burst of 10 concurrent webhook events without dropping

### Risk

- Webhook security (signature verification, replay protection); event queue reliability under burst load
