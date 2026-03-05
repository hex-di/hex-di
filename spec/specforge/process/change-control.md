---
id: PROC-SF-001
kind: process
title: Change Control
status: active
---

# Change Control

Policy for proposing, reviewing, and approving changes to the SpecForge specification.

---

## Change Categories

| Category      | Scope                                                               | Examples                                    | Approval                            |
| ------------- | ------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------- |
| Editorial     | Typos, formatting, link fixes                                       | Fix broken cross-reference, reword sentence | Single reviewer                     |
| Behavioral    | New or modified BEH-SF requirements                                 | Add BEH-SF-141, modify BEH-SF-057 contract  | Two reviewers + traceability update |
| Architectural | ADR changes, C4 diagram modifications                               | New ADR-010, restructure C3 components      | Two reviewers + architecture review |
| Breaking      | Removes or renames existing BEH-SF IDs, changes invariant semantics | Delete BEH-SF-040, modify INV-SF-3 bound    | All reviewers + impact analysis     |

---

## Approval Workflow

1. **Author** creates a PR against the `main` branch with spec changes.
2. **Category assessment** — author labels the PR with the change category.
3. **Review** — required reviewers per category (see table above).
4. **Traceability check** — for behavioral and architectural changes, author updates `traceability/index.md` and `risk-assessment/index.md` as needed.
5. **CI validation** — automated checks pass (link validation, ID uniqueness, traceability verification).
6. **Merge** — squash merge into `main`. The merge commit becomes the change record.

---

## Versioning Rules

- **Spec version** increments on behavioral or architectural changes:
  - Minor version (3.0 -> 3.1): new behaviors, new ADRs, new architecture files
  - Major version (3.0 -> 4.0): breaking changes to existing BEH-SF contracts or invariants
- **Editorial changes** do not increment the spec version.
- The spec version is recorded in `overview.md` header.
- Git tags mark spec version milestones: `spec/specforge/v3.1`

---

## ID Reservation Rules

- Deleted BEH-SF IDs are never reused. The number is permanently reserved.
- New behaviors append to the end of an allocation range or start a new behavior file.
- Renumbering existing IDs is a breaking change and requires the breaking change workflow.

---

## Change History

All change history is maintained via `git log` on the `spec/specforge/` directory. No separate changelog file is maintained — git is the single source of truth for change provenance.

---

## Cross-References

- [requirement-id-scheme.md](./requirement-id-scheme.md) — ID format rules
- [definitions-of-done.md](./definitions-of-done.md) — completion criteria per document type
- [document-control-policy.md](./document-control-policy.md) — versioning and approval evidence
