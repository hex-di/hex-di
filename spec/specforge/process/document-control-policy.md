---
id: PROC-SF-004
kind: process
title: Document Control Policy
status: active
---

# Document Control Policy

Version control and approval evidence policy for the SpecForge specification.

---

## Versioning Model

SpecForge specifications are versioned at two levels:

| Level                  | Scope                                                              | Tracked In           |
| ---------------------- | ------------------------------------------------------------------ | -------------------- |
| Spec version           | Specification content (behaviors, architecture, types, governance) | `overview.md` header |
| Implementation version | Package releases (`@hex-di/specforge`)                             | `package.json`       |

These versions are independent. Spec version 3.2 may be implemented by package version 0.5.0.

---

## Git-Based Document Control

All specification documents live in `spec/specforge/` and are version-controlled via git. Git provides:

- **Authorship** — `git log --format='%an'` for each file
- **Change history** — `git log -- spec/specforge/` for full audit trail
- **Approval evidence** — PR reviews with approvals serve as sign-off records
- **Tamper evidence** — git commit hashes form an immutable history chain

---

## Approval Evidence

| Change Category | Required Evidence                                       |
| --------------- | ------------------------------------------------------- |
| Editorial       | 1 approved PR review                                    |
| Behavioral      | 2 approved PR reviews + traceability update             |
| Architectural   | 2 approved PR reviews + architecture review label       |
| Breaking        | All reviewers + impact analysis document attached to PR |

PR merge commits serve as the approval record. The merge timestamp, reviewer approvals, and CI check status are preserved in the git history.

---

## Document Metadata

Each governance document includes a Document Control table:

| Field          | Value                                 |
| -------------- | ------------------------------------- |
| Document       | Title — SpecForge                     |
| Version        | Matches spec version in `overview.md` |
| Status         | Draft, Review, Approved               |
| Classification | GAMP 5 Category 5                     |

---

## Retention

- Specification files are retained indefinitely in the git repository.
- Deleted specifications remain accessible via `git log` and `git show`.
- No specification file is permanently destroyed — deletion is a tracked git operation.

---

## Cross-References

- [change-control.md](./change-control.md) — change categories and approval workflow
- [requirement-id-scheme.md](./requirement-id-scheme.md) — ID format rules
