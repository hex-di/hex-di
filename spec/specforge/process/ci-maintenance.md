---
id: PROC-SF-002
kind: process
title: CI Maintenance
status: active
---

# CI Maintenance

Continuous integration pipeline for specification quality assurance.

---

## Pipeline Stages

| Stage        | Trigger                       | Checks                                      | Blocking |
| ------------ | ----------------------------- | ------------------------------------------- | -------- |
| Spec Lint    | PR opened/updated             | Link validation, markdown formatting        | Yes      |
| Traceability | PR opened/updated             | ID uniqueness, cross-reference completeness | Yes      |
| Build        | PR merged to main             | Type-check, unit tests, integration tests   | Yes      |
| Release      | Git tag `spec/specforge/vN.N` | Full test suite, coverage thresholds        | Yes      |

---

## Automated Checks

### Link Validation

Verify all markdown cross-references resolve to existing files.

```
Check: Every [text](./path) link in spec/specforge/**/*.md points to an existing file.
Tool: scripts/verify-traceability.sh (link check section)
Failure: PR blocked until broken links are fixed.
```

### BEH-SF ID Uniqueness

Verify no duplicate behavior IDs exist across behavior files.

```
Check: Each BEH-SF-NNN appears exactly once across behaviors/*.md.
Tool: grep + sort + uniq -d
Failure: PR blocked if duplicate IDs detected.
```

### INV-SF Completeness

Verify every invariant in `./invariants/index.md` appears in `traceability/index.md`.

```
Check: All INV-SF-N IDs from ./invariants/index.md are present in traceability/index.md.
Tool: scripts/verify-traceability.sh (invariant completeness section)
Failure: PR blocked if invariant is missing from traceability matrix.
```

### ADR Completeness

Verify every ADR file in `decisions/` is referenced in `traceability/index.md`.

```
Check: All decisions/NNN-*.md files have a row in the ADR -> Behavior table.
Tool: scripts/verify-traceability.sh (ADR completeness section)
Failure: PR blocked if ADR is missing from traceability matrix.
```

### Spec File Existence

Verify all files referenced in `overview.md` Document Map actually exist.

```
Check: Every file path in overview.md Document Map tables resolves to an existing file.
Tool: scripts/verify-traceability.sh (spec file existence section)
Failure: PR blocked if referenced file is missing.
```

---

## Release Process

1. All CI checks pass on `main`.
2. Spec version in `overview.md` is updated.
3. Git tag created: `spec/specforge/vN.N`.
4. Release stage runs full verification suite.
5. Release notes generated from `git log` since previous tag.

---

## Cross-References

- [change-control.md](./change-control.md) — change categories and approval workflow
- [test-strategy.md](./test-strategy.md) — testing approach and coverage targets
- [../traceability/index.md](../traceability/index.md) — traceability matrix verified by CI
