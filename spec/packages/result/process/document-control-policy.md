# Document Control Policy

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-CORE-PRC-002 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- process/document-control-policy.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- process/document-control-policy.md` |
| Approval Evidence | PR merge to `main` |
| Reviewer | PR approval record — see Git merge commit |
| Change History | `git log --oneline --follow -- process/document-control-policy.md` |
| Status | Effective |

## Purpose

This document defines the document control approach for all specification documents in the `@hex-di/result` specification suite. It explains how Git-based version control satisfies document control requirements for GxP compliance.

## Scope

This policy applies to all documents in the `spec/result/` directory, including:

- Overview, glossary, invariants
- Behavior specifications (`behaviors/*.md`)
- Type system specifications (`type-system/*.md`)
- Architecture Decision Records (`decisions/*.md`)
- Process documents (`process/*.md`)
- Compliance documents (`compliance/*.md`)
- Comparison documents (`comparisons/*.md`)
- Risk assessment and traceability matrix

## Git-Based Document Control

All specification documents use **Git** as the document management system. Rather than embedding static metadata (version numbers, author names, dates) inline — which inevitably drifts from reality — each document's Document Control table provides Git commands that retrieve the authoritative metadata from the repository.

### Standard Document Control Fields

Every document includes a Document Control table with these fields:

| Field | Git Command | Purpose |
|-------|------------|---------|
| **Document ID** | Static (assigned per [requirement-id-scheme.md](requirement-id-scheme.md)) | Unique identifier |
| **Version** | `git log -1 --format="%H %ai" -- <file>` | Current version: commit hash + date |
| **Author** | `git log --format="%an" -1 -- <file>` | Most recent change author |
| **Original Author** | `git log --diff-filter=A --format="%an" -- <file>` | Author who created the file |
| **Approval Evidence** | `git log --merges --first-parent main -- <file>` | PR merge commits (approval records) |
| **Reviewer** | PR approval record in Git merge commit | Who approved the change |
| **Change History** | `git log --oneline --follow -- <file>` | Complete revision history |
| **Status** | Static: `Effective`, `Draft`, or `Superseded` | Current document state |

### Retrieving Document Metadata

To retrieve the full document control metadata for any specification file:

```bash
# Current version (commit hash + date)
git log -1 --format="%H %ai" -- spec/result/<file>.md

# Original author (who created the file)
git log --diff-filter=A --format="%an" -- spec/result/<file>.md

# Full revision history
git log --oneline --follow -- spec/result/<file>.md

# All authors who have modified this document
git log --format="%an" -- spec/result/<file>.md | sort -u

# Approval evidence (PR merge commits)
git log --merges --first-parent main -- spec/result/<file>.md

# Per-line attribution
git blame spec/result/<file>.md
```

### Advantages Over Static Metadata

| Concern | Static Metadata | Git-Based Metadata |
|---------|----------------|-------------------|
| **Accuracy** | Requires manual update on every change; frequently forgotten | Automatically accurate — Git records every change |
| **Completeness** | Only shows latest version info | Full history available via `git log` |
| **Attribution** | Single author field | Per-line attribution via `git blame` |
| **Tampering** | Text can be edited without trace | Git commits are cryptographically linked; force-push protection on `main` |
| **Approval evidence** | Manual signature fields | PR approval workflow with reviewer identity and timestamp |

### Printed or Exported Copies

> **Auditor note**: When specification documents are printed, exported to PDF, or otherwise copied outside the Git repository, the Git commands in the Document Control table must be executed and their output attached as an appendix. This ensures approval evidence and version history are available without repository access.

**Recommended export procedure**:

1. Execute each Git command in the Document Control table
2. Append the command outputs to the end of the printed document
3. Include the export date and the name of the person who generated the export
4. Mark the printed copy as "Uncontrolled Copy — refer to Git repository for current version"

### Branch Protection

The `main` branch is protected with the following controls:

- **Required PR reviews**: At least one approval required before merge
- **Required CI checks**: All CI pipeline checks must pass
- **No direct pushes**: All changes to `main` go through pull requests
- **No force push**: Force push to `main` is disabled

These controls ensure that every change to a specification document has:

- A reviewer who approved the change (Attributable)
- A timestamp of when the change was approved (Contemporaneous)
- A diff showing exactly what changed (Legible, Original)
- CI validation that the change does not break cross-references (Accurate)

## Document States

| State | Definition | Transition |
|-------|-----------|------------|
| **Draft** | Under development; not approved for use | Exists on a feature branch, not yet merged to `main` |
| **Effective** | Approved and currently in use | Merged to `main` via approved PR |
| **Superseded** | Replaced by a newer version | A newer commit on `main` modifies the file; previous versions accessible via `git log` |

All documents on the `main` branch are in the **Effective** state. Previous versions (Superseded) are accessible via Git history.

## Document Identifier Registry

The authoritative list of all assigned document identifiers is maintained in:

- [Requirement ID Scheme](requirement-id-scheme.md) — identifier formats and allocation rules
- [Traceability Matrix](../traceability.md) — cross-reference of all identifiers

New document identifiers must follow the `SPEC-CORE-{CAT}-{NNN}` format and be registered in both documents.
