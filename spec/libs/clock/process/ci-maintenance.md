# CI Maintenance

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-CLK-PRC-005 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- process/ci-maintenance.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- process/ci-maintenance.md` |
| Approval Evidence | PR merge to `main` |
| Reviewer | PR approval record — see Git merge commit |
| Change History | `git log --oneline --follow -- process/ci-maintenance.md` |
| Status | Effective |

## CI Pipeline Overview

All CI for `@hex-di/clock` runs via GitHub Actions in the monorepo's `.github/workflows/` directory. The pipeline is scoped to changes in `libs/clock/core/` and `spec/libs/clock/`. Each stage is a discrete job; later stages depend on earlier ones.

```
┌─────────────────────────────────────────────────┐
│  On push / PR to main (libs/clock/** changed)   │
└────────────────┬────────────────────────────────┘
                 │
         ┌───────▼────────┐
         │   lint         │  ESLint — libs/clock/core/
         └───────┬────────┘
                 │
         ┌───────▼────────┐
         │   typecheck    │  tsc --noEmit
         └───────┬────────┘
                 │
         ┌───────▼────────┐
         │   unit tests   │  vitest run
         └───────┬────────┘
                 │
         ┌───────▼────────┐
         │   type tests   │  vitest typecheck
         └───────┬────────┘
                 │
         ┌───────▼────────┐
         │   mutation     │  stryker run (on src/** changes)
         └───────┬────────┘
                 │
         ┌───────▼────────┐
         │   traceability │  scripts/verify-traceability.sh
         └───────┬────────┘
                 │
         ┌───────▼────────┐
         │   benchmarks   │  vitest bench (on main merge only)
         └─────────────────┘
```

## Pipeline Stages

### Lint

```bash
pnpm --filter @hex-di/clock lint
```

- Runs ESLint with the package-level `eslint.config.js`
- Blocks merge on any error; warnings are reported but non-blocking
- Must pass before typecheck runs

### Typecheck

```bash
pnpm --filter @hex-di/clock typecheck
```

- Runs `tsc --noEmit` against `tsconfig.json`
- Validates all source files and test files
- Must pass before unit tests run

### Unit Tests

```bash
pnpm --filter @hex-di/clock test
```

- Runs all `*.test.ts` files under `libs/clock/core/tests/`
- Coverage targets enforced (see [test-strategy.md](test-strategy.md)):
  - Line coverage ≥ 95%
  - Branch coverage ≥ 90%
- CI fails if either threshold is not met

### Type Tests

```bash
pnpm --filter @hex-di/clock test:types
```

- Runs Vitest in `--typecheck` mode against `*.test-d.ts` files
- 100% of public API types must have type-level assertions
- Must run after unit tests (shared Vitest configuration)

### Mutation Testing

```bash
pnpm --filter @hex-di/clock test:mutation
```

- Runs Stryker using `stryker.config.mjs` in `libs/clock/core/`
- Triggers only when `libs/clock/core/src/**` files change (not test-only changes)
- Thresholds: `high: 95`, `low: 90`, `break: 90`
- CI step uses `--reporters clear-text,json`
- The JSON report (`reports/mutation/mutation.json`) is persisted as a CI artifact and retained for GxP audit trail purposes
- PRs with mutation score below 95% require written justification in the PR description, approved by the code owner before merge

See [09-definition-of-done.md §Mutation Testing Tooling and CI Enforcement](../09-definition-of-done.md#mutation-testing-tooling-and-ci-enforcement) for the full enforcement specification and risk-proportional threshold guidance.

### Traceability Verification

```bash
bash spec/libs/clock/scripts/verify-traceability.sh
```

- Runs on every PR that modifies `spec/libs/clock/**`
- Checks: spec file existence, invariant completeness, ADR completeness
- With `--strict`: additionally fails if the implementation package is absent
- Exits 0 only when all checks pass or skip; exits 1 on any failure

### Benchmarks

```bash
pnpm --filter @hex-di/clock bench
```

- Runs Vitest `bench` mode against `tests/benchmarks/*.bench.ts`
- Executes on merge to `main` only (not on every PR) to avoid noise
- Validates PQ-1 performance targets from [02-qualification-protocols.md](../06-gxp-compliance/02-qualification-protocols.md)
- Results are archived as CI artifacts; regressions exceeding 20% from the established baseline are flagged for QA review

## PQ Re-Execution Trigger Matrix

Per Rev 2.0, the following CI events trigger full PQ re-execution on deployment targets:

| Trigger | CI Event | PQ Re-Execution Scope |
|---------|----------|----------------------|
| `@hex-di/clock` version published to npm | Release workflow completes | Full IQ/OQ/PQ on all deployment targets |
| Platform version change (Node.js minor or major) | CI matrix run against new Node.js version | IQ + OQ on affected targets |
| Stryker mutation score drops below `thresholds.high` (95%) | Mutation CI step | Code review + remediation before PQ |
| Benchmark regression > 20% vs baseline | Benchmark CI step on `main` merge | PQ-1 (performance gate) re-execution |
| Spec revision change (integer bump, e.g. 2.x → 3.0) | `README.md` revision history commit | Full IQ/OQ/PQ re-execution per [change-control.md](change-control.md) |

## Release Process

### Version Bump

1. Update the package version in `libs/clock/core/package.json`
2. If the spec content has changed, update `specRevision` in `src/gxp-metadata.ts` to match the current `README.md` revision — IQ-21 verifies this correspondence at installation
3. Update `overview.md` package metadata table if the version field has changed
4. Run the full CI pipeline locally before opening the release PR:
   ```bash
   pnpm --filter @hex-di/clock lint
   pnpm --filter @hex-di/clock typecheck
   pnpm --filter @hex-di/clock test
   pnpm --filter @hex-di/clock test:types
   bash spec/libs/clock/scripts/verify-traceability.sh --strict
   ```

### Release Checklist

- [ ] All CI stages green on the release branch
- [ ] `specRevision` in `src/gxp-metadata.ts` matches `README.md` revision
- [ ] `CHANGELOG.md` entry describes behavioral changes, new requirements, and any invariant modifications
- [ ] If a Critical change was included, the FMEA in [11-fmea-risk-analysis.md](../06-gxp-compliance/11-fmea-risk-analysis.md) has been updated
- [ ] If a new invariant was added, `invariants.md`, `risk-assessment.md`, and `traceability.md` have been updated
- [ ] `overview.md` API surface table and source file map are current
- [ ] Release PR has been approved by a code owner

### Signed Git Tags

Each release is tagged with a signed Git tag (GPG or SSH):

```bash
git tag -s v0.1.0 -m "Release @hex-di/clock v0.1.0 (spec rev 2.8)"
git push origin v0.1.0
```

For GxP deployments, the signed tag provides cryptographic proof of the approval state as described in [README.md §Approval Enforcement Mechanism](../README.md#approval-enforcement-mechanism-21-cfr-1110j).

### npm Publish

Publishing is handled by the monorepo's release workflow. The `@hex-di/clock` package is published as an ESM-only package. No CommonJS build is produced.

## Spec Publication Workflow

Spec documents in `spec/libs/clock/` are version-controlled alongside the package source. The spec revision and package version are independent tracks (see [README.md §Version Relationship Policy](../README.md#version-relationship-policy)).

### Spec-Only Changes

Spec changes that do not modify source code (`libs/clock/core/`) are merged via an **Administrative** change (per [change-control.md](change-control.md)):

1. Open a PR modifying only `spec/libs/clock/**`
2. CI runs: traceability verification script, lint on spec (markdown linting if configured)
3. The spec revision in `README.md` is bumped (minor increment, e.g. 2.8 → 2.9)
4. No source code changes; no re-qualification required for Administrative changes

### Spec + Code Changes

When spec and code change together (Standard or Critical change):

1. Spec files and source files are modified in the same PR
2. Full CI pipeline runs (all stages above)
3. The spec revision is bumped to reflect the new requirements
4. `specRevision` in `src/gxp-metadata.ts` is updated to match
5. For Critical changes, re-qualification is required per [change-control.md](change-control.md#critical-change-checklist)

## Relationship to Other Process Documents

| Document | Relationship |
|----------|-------------|
| [change-control.md](change-control.md) | Defines change categories (Critical/Standard/Administrative) that determine which CI stages are mandatory |
| [test-strategy.md](test-strategy.md) | Defines coverage targets enforced by the unit test and mutation CI stages |
| [definitions-of-done.md](definitions-of-done.md) | DoD items reference CI stage names; all DoD items must be green before a release is cut |
| [09-definition-of-done.md](../09-definition-of-done.md) | Stryker configuration and CI enforcement specification |
| [compliance/gxp.md](../06-gxp-compliance/02-qualification-protocols.md) | PQ re-execution protocol triggered by CI events above |
| [scripts/verify-traceability.sh](../scripts/verify-traceability.sh) | The traceability CI stage; updated when spec structure changes |
