# @hex-di/http-client-react — CI Maintenance

## Document Control

| Field | Value |
| --- | --- |
| Document ID | SPEC-HCR-PRC-005 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/react/process/ci-maintenance.md` |
| Approval Evidence | PR merge to `main` |
| Status | Effective |

---

## Overview

This document describes the Continuous Integration pipeline for `@hex-di/http-client-react`, the automated gates that must pass before merging, and the release process. For the core `@hex-di/http-client` CI pipeline, see [`../process/ci-maintenance.md`](../process/ci-maintenance.md).

---

## 1. CI Pipeline Stages

The following stages run on every pull request and push to `main`. All stages must pass for a PR to be merged.

| Stage | Command | Scope | Gate |
| --- | --- | --- | --- |
| **Typecheck** | `pnpm --filter @hex-di/http-client-react typecheck` | TypeScript compilation with strict settings | Required |
| **Lint** | `pnpm --filter @hex-di/http-client-react lint` | ESLint — no `any`, no non-null assertions, no `eslint-disable` | Required |
| **Unit tests** | `pnpm --filter @hex-di/http-client-react test` | All `tests/unit/*.test.ts` and `tests/integration/*.test.ts` | Required |
| **Type tests** | `pnpm --filter @hex-di/http-client-react test:types` | All `tests/*.test-d.ts` via `vitest typecheck` | Required |
| **Build** | `pnpm --filter @hex-di/http-client-react build` | `tsc -p tsconfig.build.json` — no unintended new exports | Required |
| **Traceability** | `spec/libs/http-client/react/scripts/verify-traceability.sh` | Spec ↔ test file consistency | Required when spec files changed |

---

## 2. Test Execution Details

### Unit and Integration Tests

```bash
# Run all tests for the package:
pnpm --filter @hex-di/http-client-react test

# Run with coverage report:
pnpm --filter @hex-di/http-client-react test:coverage

# Run a specific test file:
pnpm --filter @hex-di/http-client-react test tests/unit/provider.test.ts
```

Coverage targets (enforced via Vitest `coverage` threshold configuration):

| Metric | Target | Config |
| --- | --- | --- |
| Line coverage | ≥ 90% | `thresholds.lines: 90` |
| Branch coverage | ≥ 85% | `thresholds.branches: 85` |

### Type Tests

```bash
# Run type-level assertions (vitest typecheck):
pnpm --filter @hex-di/http-client-react test:types
```

Type tests live in `tests/*.test-d.ts` and verify compile-time contracts: hook return types, Result-typed state shapes, and Context type safety.

### Traceability Verification

```bash
# Manual run:
./spec/libs/http-client/react/scripts/verify-traceability.sh

# Strict mode (used in CI when implementation is present):
./spec/libs/http-client/react/scripts/verify-traceability.sh --strict
```

Five checks are performed:
1. All spec files listed in the Capability-Level Traceability table exist on disk
2. Every `INV-HCR-N` in `invariants.md` has an entry in the Invariant Traceability table
3. Every `decisions/NNN-*.md` file has an entry in the ADR Traceability table
4. Every test file in the Test File Map exists under `tests/`
5. Every `*.test.ts` and `*.test-d.ts` file appears in the Test File Map

---

## 3. Release Process

### Pre-Release Checklist

Before publishing a new version to npm:

- [ ] All CI stages pass on the release commit
- [ ] `pnpm changeset` has been run and the changeset file is present
- [ ] `specRevision` constant in source matches the current specification revision
- [ ] `README.md` §Revision History has been updated for any spec changes in this release
- [ ] `process/change-control.md` change category checklist completed
- [ ] `scripts/verify-traceability.sh --strict` passes
- [ ] Core `@hex-di/http-client` peer dependency version range verified

### Versioning

Version bumps follow the change classification in [`process/change-control.md`](./change-control.md):

| Change Category | Version Bump | Example |
| --- | --- | --- |
| Minor — clarification, prose fix | Patch | `0.1.0` → `0.1.1` |
| Moderate — new hook option, new export | Minor | `0.1.0` → `0.2.0` |
| Major — breaking API change | Major | `0.1.0` → `1.0.0` |

### Publishing

```bash
# Create changeset:
pnpm changeset

# Version packages (updates package.json and CHANGELOG):
pnpm changeset version

# Publish to npm registry:
pnpm changeset publish
```

The release is tagged in Git as `@hex-di/http-client-react@<version>`.

---

## 4. Maintenance Triggers

| Trigger | Action Required |
| --- | --- |
| New invariant added to `invariants.md` | Add FMEA entry to `risk-assessment.md`; add row to Invariant Traceability in `traceability.md` |
| New ADR added to `decisions/` | Add row to ADR Traceability in `traceability.md` |
| New test file added | Add row to Test File Map in `traceability.md`; re-run traceability script |
| New hook added | Add spec section in `03-hooks.md`; add test IDs in `05-definition-of-done.md`; update `traceability.md` |
| Core `@hex-di/http-client` breaking change | Review affected invariants (INV-HCR-N with core `**Related**` links); update `overview.md` API tables |
| React major version bump (18 → 19) | Review Context API usage; assess INV-HCR-1 (Context availability) and INV-HCR-2 (hook invariants); update peer dependency range |
