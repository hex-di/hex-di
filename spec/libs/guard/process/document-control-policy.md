# Document Control Policy

> **Extracted from:** README.md Document Control Policy section during spec restructure (CCR-GUARD-018, 2026-02-17)

## Policy

Every specification file in spec/libs/guard/ MUST carry a document control header containing: Document ID, Revision, Status, Effective Date, Author, Reviewer, Approved By, Classification, DMS Reference, and Change History.

## Status Values

| Status | Meaning |
|--------|---------|
| **Draft** | Work in progress, not yet reviewed |
| **In Review** | Under formal review |
| **Approved** | Reviewed and approved, pending effective date |
| **Effective** | Authoritative for GxP use |
| **Superseded** | Replaced by a newer version |
| **Obsolete** | No longer applicable |

Only documents in "Effective" status are authoritative for GxP use (EU GMP Annex 11 §4).

## Revision Numbering

- **MAJOR increment**: Structural changes, new REQUIREMENT blocks, removed sections, or changes affecting regulatory traceability
- **MINOR increment**: Clarifications, typo fixes, cross-reference updates, or RECOMMENDED block additions

Each revision MUST append a Change History entry with the revision number, date, and summary of changes.

## Approval Authority

See the Approval Authority Matrix in [README.md](../README.md) for role assignments.

## DMS Reference

This specification uses Git version control as the Document Management System (DMS). The DMS Reference field points to the GPG-signed Git tag that constitutes the electronic approval record. See [README.md § Git-Based Document Management System](../README.md) for full details.
