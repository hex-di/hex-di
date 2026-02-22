# Document Control Policy

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-CLK-PRC-005 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- process/document-control-policy.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- process/document-control-policy.md` |
| Approval Evidence | PR merge to `main` |
| Reviewer | PR approval record — see Git merge commit |
| Change History | `git log --oneline --follow -- process/document-control-policy.md` |
| Status | Effective |

## Scope

This policy governs the versioning, approval, distribution, and retirement of all specification documents in `spec/libs/clock/`.

## Versioning Model

Specification documents in `spec/libs/clock/` are version-controlled via Git. The authoritative version reference for the overall specification suite is the **suite-level revision** in `README.md` (currently **2.8**). Individual sub-documents do not carry separate version numbers.

| Version dimension | Format | Managed by |
|---|---|---|
| Suite revision | Major.Minor (e.g., `2.8`) | README.md Document Control table |
| Package version | SemVer (e.g., `0.1.0`) | `package.json` |
| Individual document | Git commit SHA + timestamp | `git log -1 --format="%H %ai" -- <file>` |

Individual document version is always derived from Git using the command in each document's Document Control header. This eliminates manual version tracking errors and provides cryptographic identity for every document state.

## Approval Workflow

### Normal change (minor revision)

1. Author opens a pull request with specification changes.
2. Designated reviewer (see distribution list in `README.md`) reviews for completeness, consistency, and regulatory accuracy.
3. PR is approved and merged to `main`.
4. The merge commit SHA serves as the approval evidence record.
5. Suite revision is incremented (minor digit) and recorded in `README.md` with a description.

### Major revision (integer revision change)

All four signatories in the Formal Specification Approval Record (`README.md`) must re-review and re-approve. Major revisions are triggered by:

- Changes to requirement IDs (`CLK-*`), invariants (`INV-CK-*`), or FMEA failure modes
- Changes to IQ/OQ/PQ protocols
- Addition or removal of public API surface
- Regulatory cross-reference updates

A completed `APPROVAL_RECORD.json` must be produced (see `README.md §DQ-5`) before GxP deployment against the new revision.

### Emergency change

Emergency changes follow the procedure in [change-control.md](change-control.md). A retrospective review by the QA Manager is required within 5 business days.

## Document Identification Scheme

All governance documents carry a `SPEC-CLK-<CAT>-<NNN>` identifier in their Document Control header.

| Category | Code | Example |
|----------|------|---------|
| Overview | OVW | SPEC-CLK-OVW-001 |
| Invariants | INV | SPEC-CLK-INV-001 |
| Traceability | TRC | SPEC-CLK-TRC-001 |
| Risk Assessment | RSK | SPEC-CLK-RSK-001 |
| GxP Compliance | GXP | GXP-CLK-001 |
| Process | PRC | SPEC-CLK-PRC-001 |
| ADR | ADR | ADR-CK-NNN |

See [requirement-id-scheme.md](requirement-id-scheme.md) for the full `CLK-*` requirement identifier scheme.

## Distribution and Access

All specification documents are publicly accessible in the monorepo. GxP organizations adopting the specification for regulated use must:

1. Archive the specification at the revision used for their deployment.
2. Maintain the completed `APPROVAL_RECORD.json` as a deployment-specific artifact (not committed to the source repo).
3. Retain all approval evidence (signed Git tag, `APPROVAL_RECORD.json`, Review Comment Logs) for the duration required by their quality system and applicable regulations.

## Document Retirement

When a specification document is superseded or removed:

1. A tombstone entry is added to the suite revision history in `README.md` describing what was removed and why.
2. The Git history preserves the document content indefinitely via commit SHA references.
3. Any requirement IDs, invariant IDs, or ADR IDs from the retired document are not reused (permanent identifier reservation per [requirement-id-scheme.md](requirement-id-scheme.md)).

## Periodic Review

The specification suite is reviewed annually or upon any of the following triggers:

- A new major release of `@hex-di/clock` (package SemVer major increment)
- A change to the applicable regulatory framework (FDA 21 CFR Part 11 revision, EU GMP Annex 11 revision)
- A GxP incident or CAPA linked to a specification gap
- A significant change to the HexDI ecosystem that affects clock dependencies

The review outcome is recorded as a minor or major revision in `README.md`.
