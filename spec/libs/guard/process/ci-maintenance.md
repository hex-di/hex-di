# CI Maintenance

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-PRC-CI                             |
> | Revision         | 1.0                                      |
> | Effective Date   | 2026-02-19                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | Technical Lead                           |
> | Approved By      | Technical Lead                           |
> | Classification   | GxP Appendices & Reference               |
> | Change History   | 1.0 (2026-02-19): Initial controlled release |

---

## 1. CI Pipeline

The monorepo uses GitHub Actions (`.github/workflows/ci.yml`). The pipeline runs on every push and pull request to `main`.

### 1.1 Job Sequence

```
lint ──┐
       ├──► test
typecheck ─┘
```

| Job | Command | Trigger |
|-----|---------|---------|
| `lint` | `pnpm lint` (runs `pnpm -r --parallel lint`) | Every push / PR |
| `typecheck` | `pnpm typecheck` (runs `pnpm -r --parallel typecheck`) | Every push / PR |
| `test` | `pnpm test` (runs `vitest run` across workspace) | After lint + typecheck pass |

### 1.2 Guard-Specific Commands

Run these locally before pushing changes to the guard packages:

```bash
# Lint
pnpm --filter @hex-di/guard lint
pnpm --filter @hex-di/guard-testing lint
pnpm --filter @hex-di/guard-validation lint

# Type check
pnpm --filter @hex-di/guard typecheck
pnpm --filter @hex-di/guard-testing typecheck

# Unit + type tests
pnpm --filter @hex-di/guard test
pnpm --filter @hex-di/guard test:types

# Full workspace type check
pnpm typecheck
```

### 1.3 Additional Quality Gates

| Check | Command | Frequency |
|-------|---------|-----------|
| Circular dependency scan | `pnpm madge:circular` | Before each release |
| Dead export detection | `pnpm knip` | Before each release |
| Mutation testing | `pnpm --filter @hex-di/guard mutation` | Per DoD item (target ≥ 90% kill rate) |
| Traceability verification | `bash spec/libs/guard/scripts/verify-traceability.sh` | Before each spec change is merged |

---

## 2. Release Process

### 2.1 Pre-Release Checklist

- [ ] All CI jobs green on `main`
- [ ] `pnpm madge:circular` reports no cycles
- [ ] `pnpm knip` reports no dead exports in guard packages
- [ ] Mutation score ≥ 90% for changed modules
- [ ] `verify-traceability.sh` exits 0
- [ ] All affected spec Document Control headers updated (Revision, Effective Date, Change History)
- [ ] README.md Document History table appended with CCR entry
- [ ] IQ/OQ runners pass: `pnpm --filter @hex-di/guard-validation run iq && pnpm --filter @hex-di/guard-validation run oq`

### 2.2 Version Tagging

Guard packages follow the monorepo versioning scheme. The Git tag serves as the formal approval record (Document Management System reference).

```bash
# Create a GPG-signed release tag (required for GxP DMS reference)
git tag -s guard/vX.Y.Z -m "guard vX.Y.Z — <summary>"
git push origin guard/vX.Y.Z
```

The tag name `guard/vX.Y.Z` is the value recorded in the `DMS Reference` field of every guard spec Document Control header.

### 2.3 Post-Release

- Update all spec Document Control headers whose `DMS Reference` field should reflect the new tag.
- Append a Document History entry in `README.md`.
- Record the OQ validation evidence in `compliance/validation-plan.md`.

---

## 3. Spec Maintenance

### 3.1 Traceability Verification

Run before merging any spec change:

```bash
bash spec/libs/guard/scripts/verify-traceability.sh

# Strict mode: SKIPs become FAILs (use when implementation exists)
bash spec/libs/guard/scripts/verify-traceability.sh --strict
```

See [scripts/verify-traceability.sh](../scripts/verify-traceability.sh) for check details.

### 3.2 Adding a New Spec Section

1. Assign the next available section number (check existing `## N.` headings across chapters for collisions — use sub-section letters `Na` if inserting mid-sequence).
2. Add a `REQ-GUARD-NNN` requirement ID for each testable requirement.
3. Update the README TOC with the new anchor.
4. Add a DoD entry in `process/definitions-of-done.md`.
5. Add a traceability row in `traceability.md`.
6. Run `verify-traceability.sh` to confirm consistency.
7. Increment the spec file's Revision and add a Change History entry.

### 3.3 Adding a New ADR

1. Assign the next number under `decisions/` (`ls decisions/ | tail -1` to find the last).
2. File as `decisions/NNN-<kebab-topic>.md`.
3. Add a row to the ADR Traceability table in `traceability.md`.
4. Reference the ADR from the behavior spec section it affects.

### 3.4 Compliance / GxP Changes

Changes to `compliance/`, `17-gxp-compliance/`, or `invariants.md` require co-approval from the Regulatory Affairs Lead in addition to the Technical Lead. See the Approval Authority Matrix in `README.md`.

---

## 4. Related Documents

| Document | Purpose |
|----------|---------|
| [change-control.md](./change-control.md) | CCR process and registry |
| [definitions-of-done.md](./definitions-of-done.md) | Acceptance criteria per feature |
| [test-strategy.md](./test-strategy.md) | Test pyramid and coverage targets |
| [scripts/verify-traceability.sh](../scripts/verify-traceability.sh) | Automated traceability validator |
| [README.md — Approval Authority Matrix](../README.md#approval-authority-matrix) | Role-based approval requirements |
