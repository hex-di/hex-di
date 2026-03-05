# Requirement ID Scheme — @hex-di/guard-cedar

## Document Control

| Field       | Value                                                                                 |
| ----------- | ------------------------------------------------------------------------------------- |
| Document ID | SPEC-CD-PRC-001                                                                       |
| Version     | Derived from Git — `git log -1 --format="%H %ai" -- process/requirement-id-scheme.md` |
| Status      | Effective                                                                             |

---

## ID Format

All requirement and invariant IDs in the `@hex-di/guard-cedar` specification use the `CD` (Cedar) infix to prevent cross-package collisions within the hex-di monorepo.

---

## Requirement IDs

Format: `CD-{DOMAIN}-NNN`

| Domain | Description                  | Spec File                  |
| ------ | ---------------------------- | -------------------------- |
| `PORT` | Cedar engine port interface  | `02-cedar-engine-port.md`  |
| `POL`  | Policy translation and store | `03-policy-translation.md` |
| `ENT`  | Entity mapping               | `04-entity-mapping.md`     |
| `SCH`  | Schema management            | `05-schema-management.md`  |
| `DEC`  | Decision mapping             | `06-decision-mapping.md`   |
| `ERR`  | Error handling               | `07-error-handling.md`     |
| `CFG`  | Configuration and factory    | `08-configuration.md`      |

### Requirement count by domain

| Domain    | Range   | Count  |
| --------- | ------- | ------ |
| CD-PORT   | 001–042 | 14     |
| CD-POL    | 001–024 | 8      |
| CD-ENT    | 001–042 | 14     |
| CD-SCH    | 001–031 | 10     |
| CD-DEC    | 001–031 | 10     |
| CD-ERR    | 001–073 | 12     |
| CD-CFG    | 001–042 | 12     |
| **Total** |         | **80** |

---

## Invariant IDs

Format: `INV-CD-N`

Sequential numbering starting at 1. Currently 7 invariants defined in [invariants.md](../invariants.md).

---

## ADR IDs

Format: `ADR-CD-NNN`

Sequential three-digit numbering starting at 001. Currently 3 ADRs defined in [decisions/](../decisions/).

---

## Rules

1. IDs are permanent. Withdrawn requirements keep their ID with a "Withdrawn" marker. Numbers are never reused.
2. The `CD` infix is unique to this package within the hex-di monorepo.
3. Each domain prefix maps to exactly one spec file.
4. Requirement counts in this document MUST be updated when requirements are added or withdrawn.
