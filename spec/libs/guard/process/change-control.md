# Change Control

> **Extracted from:** README.md Document Control section during spec restructure (CCR-GUARD-018, 2026-02-17)

## Change Control Records (CCRs)

Every substantive modification to the guard specification is tracked via a Change Control Record (CCR). CCRs are numbered sequentially as CCR-GUARD-NNN.

### CCR Classification

| Category | Scope | Examples |
|----------|-------|---------|
| **Major** | Structural changes, new REQUIREMENT blocks, removed sections, changes affecting regulatory traceability | New behavior specs, new REQ-GUARD IDs, section reorganization |
| **Minor** | Clarifications, typo fixes, cross-reference updates, RECOMMENDED block additions | Link fixes, wording improvements, navigation updates |

### CCR Process

1. Author describes the change and assigns the next CCR number
2. All affected Document Control headers are updated with the CCR reference
3. The Document History table in README.md is appended with the CCR entry
4. Revision numbers in affected files increment per MAJOR.MINOR rules

### CCR Registry

See the Document History table in [README.md](../README.md) for the complete CCR registry (CCR-GUARD-001 through CCR-GUARD-047).

## Git-Based Change Tracking

All changes are version-controlled via Git. The GPG-signed Git tag serves as the formal approval record. See [README.md § Git-Based Document Management System](../README.md) for the full DMS policy.
