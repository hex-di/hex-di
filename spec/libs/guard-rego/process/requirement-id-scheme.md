# Requirement ID Scheme — @hex-di/guard-rego

## Document Control

| Field       | Value                                                                                 |
| ----------- | ------------------------------------------------------------------------------------- |
| Document ID | SPEC-RG-PRC-001                                                                       |
| Version     | Derived from Git — `git log -1 --format="%H %ai" -- process/requirement-id-scheme.md` |
| Status      | Effective                                                                             |

---

## ID Format

All requirement and invariant IDs in the `@hex-di/guard-rego` specification use the `RG` (Rego) infix to prevent cross-package collisions within the hex-di monorepo.

---

## Requirement IDs

Format: `RG-{DOMAIN}-NNN`

| Domain | Description                        | Spec File                      |
| ------ | ---------------------------------- | ------------------------------ |
| `PORT` | Rego engine port interface         | `02-rego-engine-port.md`       |
| `POL`  | Policy translation and conventions | `03-policy-translation.md`     |
| `INP`  | Input document mapping             | `04-input-document-mapping.md` |
| `BDL`  | Bundle management                  | `05-bundle-management.md`      |
| `DEC`  | Decision mapping                   | `06-decision-mapping.md`       |
| `ERR`  | Error handling                     | `07-error-handling.md`         |
| `CFG`  | Configuration and factory          | `08-configuration.md`          |

### Requirement count by domain

| Domain    | Range   | Count  |
| --------- | ------- | ------ |
| RG-PORT   | 001–033 | 12     |
| RG-POL    | 001–024 | 8      |
| RG-INP    | 001–034 | 11     |
| RG-BDL    | 001–031 | 8      |
| RG-DEC    | 001–061 | 16     |
| RG-ERR    | 001–064 | 14     |
| RG-CFG    | 001–042 | 14     |
| **Total** |         | **83** |

---

## Invariant IDs

Format: `INV-RG-N`

Sequential numbering starting at 1. Currently 7 invariants defined in [invariants.md](../invariants.md).

---

## ADR IDs

Format: `ADR-RG-NNN`

Sequential three-digit numbering starting at 001. Currently 3 ADRs defined in [decisions/](../decisions/).

---

## Rules

1. IDs are permanent. Withdrawn requirements keep their ID with a "Withdrawn" marker. Numbers are never reused.
2. The `RG` infix is unique to this package within the hex-di monorepo.
3. Each domain prefix maps to exactly one spec file.
4. Requirement counts in this document MUST be updated when requirements are added or withdrawn.
