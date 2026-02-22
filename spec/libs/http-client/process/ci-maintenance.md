# @hex-di/http-client — CI Maintenance

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HTTP-PRC-006 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/process/ci-maintenance.md` |
| Approval Evidence | PR merge to `main` |
| Status | Effective |

---

## Overview

This document describes the Continuous Integration pipeline for `@hex-di/http-client`, the automated gates that must pass before merging, and the release process. It covers: test execution, type checking, linting, traceability verification, and mutation testing.

---

## 1. CI Pipeline Stages

The following stages run on every pull request and push to `main`. All stages must pass for a PR to be merged.

| Stage | Command | Scope | Gate |
|-------|---------|-------|------|
| **Typecheck** | `pnpm --filter @hex-di/http-client typecheck` | TypeScript compilation with strict settings | Required |
| **Lint** | `pnpm --filter @hex-di/http-client lint` | ESLint — no `any`, no non-null assertions, no `eslint-disable` | Required |
| **Unit tests** | `pnpm --filter @hex-di/http-client test` | All `tests/unit/*.test.ts` and `tests/integration/*.test.ts` | Required |
| **Type tests** | `pnpm --filter @hex-di/http-client test:types` | All `tests/*.test-d.ts` via `vitest typecheck` | Required |
| **Build** | `pnpm --filter @hex-di/http-client build` | `tsc -p tsconfig.build.json` — no unintended new exports | Required |
| **Traceability** | `spec/libs/http-client/scripts/verify-traceability.sh` | Spec ↔ test file consistency (6 checks) | Required when spec files changed |
| **Mutation tests** | `pnpm --filter @hex-di/http-client test:mutation` | Stryker mutation score ≥ 88% aggregate, ≥ 95% High-risk | Required — `main` merge only (not every PR; see §3) |
| **Performance benchmarks** | `pnpm --filter @hex-di/http-client bench` | Combinator overhead latency baselines | Required — `main` merge only |

---

## 2. Test Execution Details

### Unit and Integration Tests

```bash
# Run all tests for the package:
pnpm --filter @hex-di/http-client test

# Run with coverage report:
pnpm --filter @hex-di/http-client test:coverage

# Run a specific test file:
pnpm --filter @hex-di/http-client test tests/unit/headers.test.ts
```

Coverage targets (enforced in CI via Vitest `coverage` threshold configuration):

| Metric | Target | Config |
|--------|--------|--------|
| Line coverage | ≥ 95% | `thresholds.lines: 95` |
| Branch coverage | ≥ 90% | `thresholds.branches: 90` |

### Type Tests

```bash
# Run type-level assertions (vitest typecheck):
pnpm --filter @hex-di/http-client test:types
```

Type tests live in `tests/*.test-d.ts` and use `expectTypeOf` and `assertType` from Vitest. They verify compile-time contracts: return types, error union exhaustiveness, and port inference utilities.

### Traceability Verification

The traceability script runs automatically when any file matching `spec/libs/http-client/**` is changed:

```bash
# Manual run:
./spec/libs/http-client/scripts/verify-traceability.sh

# Strict mode (used in CI when package implementation is present):
./spec/libs/http-client/scripts/verify-traceability.sh --strict
```

Six checks are performed:
1. All spec files listed in the Capability-Level Traceability table exist on disk
2. Every `INV-HC-N` in `invariants.md` has an entry in the Invariant Traceability table
3. Every `decisions/NNN-*.md` file has an entry in the ADR Traceability table
4. Every test file in the Test File Map exists under `tests/`
5. Every numbered chapter (02-13) has at least one test file in the Test File Map
6. Every `*.test.ts` and `*.test-d.ts` file appears in the Test File Map

---

## 3. Mutation Testing

Mutation testing using Stryker covers High-risk invariants.

```bash
# Run mutation tests:
pnpm --filter @hex-di/http-client test:mutation
```

Coverage targets per risk level:

| Invariant Risk | Mutation Score Target | Files |
|---|---|---|
| High (INV-HC-3) | ≥ 95% | `tests/unit/gxp-body-consumption.test.ts` |
| Medium (INV-HC-1, INV-HC-7, INV-HC-8, INV-HC-10) | ≥ 88% | `tests/unit/request.test.ts`, `tests/unit/client.test.ts` |
| Low (remaining) | ≥ 80% | Aggregate across all unit tests |

The Stryker configuration will exclude `tests/unit/gxp-*.test.ts` from mutation (GxP tests are verification tests, not mutation targets) and will use the `@stryker-mutator/vitest-runner`.

---

## 4. Release Process

### Pre-Release Checklist

Before publishing a new version to npm:

- [ ] All CI stages pass on the release commit
- [ ] `pnpm changeset` has been run and the changeset file is present
- [ ] `specRevision` constant in source matches the current specification revision
- [ ] `README.md` §Revision History has been updated for any spec changes in this release
- [ ] GxP-impacting changes have QA approval in the Revision History `QA Approval` column
- [ ] `process/change-control.md` change category checklist completed
- [ ] `scripts/verify-traceability.sh --strict` passes

### Versioning

Version bumps follow the change classification in `process/change-control.md`:

| Change Category | Version Bump | Example |
|---|---|---|
| Category 1 — Minor fix or documentation | Patch | `0.1.0` → `0.1.1` |
| Category 2 — New feature, non-breaking | Minor | `0.1.0` → `0.2.0` |
| Category 3 — Breaking API change | Major | `0.1.0` → `1.0.0` |

GxP-impacting changes (any category) require the `README.md` §Revision History to be updated with a QA approval entry before the release is tagged.

### Publishing

```bash
# Create changeset:
pnpm changeset

# Version packages (updates package.json and CHANGELOG):
pnpm changeset version

# Publish to npm registry:
pnpm changeset publish
```

The release is tagged in Git as `@hex-di/http-client@<version>`. For GxP releases (Category 2 or 3 with GxP-impacting changes), an additional spec tag is created: `spec/http-client/v<spec-revision>`.

---

## 5. Maintenance Triggers

The following events require spec and/or CI updates:

| Trigger | Action Required |
|---------|----------------|
| New invariant added to `invariants.md` | Add FMEA entry to `risk-assessment.md`; add row to Invariant Traceability in `traceability.md`; add GxP test if High-risk |
| New ADR added to `decisions/` | Add row to ADR Traceability in `traceability.md` |
| New test file added | Add row to Test File Map in `traceability.md`; re-run traceability script |
| Transport adapter package added | Update §08 Transport Adapters chapter; update ADR-HC-007 |
| New combinator added to `07-client-combinators.md` | Add CM-NNN test IDs to `17-definition-of-done.md`; update traceability |
| npm dependency major version bump | Review ADR-HC-007; reassess transport adapter supplier assessment in §108a |
| GxP regulation update (21 CFR Part 11, EU GMP Annex 11) | Review `compliance/gxp.md` §79; initiate Category 2 or Category 3 change request per `process/change-control.md` |
