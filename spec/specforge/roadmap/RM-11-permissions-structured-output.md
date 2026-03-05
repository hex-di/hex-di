---
id: RM-11
title: "Phase 11: Permission Governance + Structured Output + Stress Testing"
kind: roadmap
status: Planned
dependencies: []
---

## Phase 11: Permission Governance + Structured Output + Stress Testing

**Goal:** Layered permission governance, progressive trust, sandboxed execution, structured output pipeline, and adversarial stress testing.
**Source:** [research/RES-04-structured-output-pipeline.md](../research/RES-04-structured-output-pipeline.md), [research/RES-09-subagent-architecture-patterns.md](../research/RES-09-subagent-architecture-patterns.md)

### Deliverables

| #          | Deliverable                    | Package                    | Behaviors                | Status  |
| ---------- | ------------------------------ | -------------------------- | ------------------------ | ------- |
| WI-PH-11-1 | Permission governance          | `@specforge/server`        | BEH-SF-201–208           | Planned |
| WI-PH-11-2 | Structured output pipeline     | `@specforge/server`        | BEH-SF-424–427           | Planned |
| WI-PH-11-3 | Adversarial stress testing     | `@specforge/server`        | BEH-SF-428–431           | Planned |
| WI-PH-11-4 | Permission policy architecture | `@specforge/orchestration` | BEH-SF-528–535 (ADR-024) | Planned |

### Structured Output Detail (BEH-SF-424–427)

| ID         | Behavior                                                                                                         | Source         |
| ---------- | ---------------------------------------------------------------------------------------------------------------- | -------------- |
| BEH-SF-424 | Per-Role JSON Schema Registry — each agent role has a tailored output schema enforcing artifact type constraints | research/04 §2 |
| BEH-SF-425 | Schema Validation Pipeline — compile-time schema compatibility checks across flow stages                         | research/04 §4 |
| BEH-SF-426 | Error-as-Data Structured Reporting — agent errors flow as typed JSON with `_tag` discriminants, not exceptions   | research/04 §5 |
| BEH-SF-427 | Schema Versioning and Migration — versioned schemas with auto-migration chains for evolving output formats       | research/04 §9 |

### Adversarial Stress Testing Detail (BEH-SF-428–431)

| ID         | Behavior                                                                                                | Source                |
| ---------- | ------------------------------------------------------------------------------------------------------- | --------------------- |
| BEH-SF-428 | Red Team Adversarial Spec Generation — generate deliberately flawed specs to test reviewer detection    | research/09 Pattern 5 |
| BEH-SF-429 | Blue Team Defense Evaluation — measure reviewer/validator detection rates against adversarial inputs    | research/09 Pattern 5 |
| BEH-SF-430 | Stress Test Result Synthesis — aggregate red/blue results into system resilience metrics                | research/09 Pattern 5 |
| BEH-SF-431 | Auto-Hardening Proposal Generation — propose prompt/tool/schema hardening based on stress test findings | research/09 Pattern 5 |

### Exit Criteria

- [ ] EC-PH-11-1: Agents start at `restricted` tier and earn capabilities through clean iterations
- [ ] EC-PH-11-2: GxP mode blocks destructive git operations and mandates review gates
- [ ] EC-PH-11-3: `specforge estimate --permissions` produces zero-cost permission report
- [ ] EC-PH-11-4: Blast radius analysis gates elevated access requests
- [ ] EC-PH-11-5: Per-role schemas enforce output constraints — reviewer cannot produce Task nodes
- [ ] EC-PH-11-6: Schema validation catches stage-to-stage type mismatches at flow registration time
- [ ] EC-PH-11-7: Red team generates adversarial specs that expose at least 3 detection gaps per run
- [ ] EC-PH-11-8: Auto-hardening proposals close 80%+ of identified detection gaps

### Risk

- Permission model complexity; overly strict permissions may block legitimate agent actions
