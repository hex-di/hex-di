# CI & Maintenance

Continuous integration, release process, and dependency management for `@hex-di/result-react`.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-REACT-PRC-006 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- process/ci-maintenance.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- process/ci-maintenance.md` |
| Approval Evidence | PR merge to `main` |
| Reviewer | PR approval record — see Git merge commit |
| Change History | `git log --oneline --follow -- process/ci-maintenance.md` |
| Status | Effective |

> This document covers CI configuration specific to `@hex-di/result-react`. For monorepo-wide CI infrastructure (GitHub Actions workflows, Renovate configuration, security policy, conventional commits), see the [core library's CI & Maintenance](../../process/ci-maintenance.md). For the change control procedure, see [change-control.md](change-control.md).

## CI Matrix

All tests run on every pull request and push to `main`.

### Platform Matrix

| OS | Node 18 | Node 20 | Node 22 |
|----|:-------:|:-------:|:-------:|
| ubuntu-latest | x | x | x |
| macos-latest | — | x | x |
| windows-latest | — | x | x |

> **Reduced matrix**: macOS and Windows are tested on Node 20+ only. React rendering behavior is OS-independent; the reduced matrix catches Node-version-specific issues without multiplying CI time.

### React Version Matrix

| React Version | Status | Notes |
|--------------|--------|-------|
| 18.2 | Tested | Latest React 18 stable |
| 18.3 | Tested | React 18 maintenance |
| 19.0 | Tested | React 19 GA |
| latest | Tested | Tracks latest React release |

**Policy**: The package supports React 18.2+ and React 19.0+. React 19-only features (`useOptimisticResult`, `useResultTransition`) are gated by INV-R11 (React Version Fail-Fast). If a new React major version introduces breaking changes to hook lifecycle semantics, the minimum is bumped in a major release.

### TypeScript Matrix

| TS Version | Status |
|-----------|--------|
| 5.0 | Tested |
| 5.4 | Tested |
| 5.6 | Tested |
| latest | Tested |

> **Reduced matrix vs core**: The React package tests a representative subset of TS versions (oldest supported, mid-range, latest stable, latest). The core library tests every minor TS version. React-specific type inference is less sensitive to TS minor version differences than the core library's advanced conditional types.

## CI Jobs

### 1. Lint

- ESLint with project config (`eslint.config.js`)
- Includes `eslint-plugin-react-hooks` for Rules of Hooks enforcement
- Runs on: ubuntu-latest, Node 22 (single environment)

### 2. Type Check

- `tsc --noEmit` with project config
- Runs on: full TS version matrix, ubuntu-latest, Node 22
- Verifies type compatibility across supported TypeScript versions

### 3. Unit Tests

- `vitest run` — runtime tests for hooks, components, adapters, utilities, and server exports
- Uses `@testing-library/react` for component and hook testing
- Uses `jsdom` environment for DOM simulation
- Runs on: full Node + OS matrix × full React version matrix × latest TS

### 4. Type Tests

- `vitest typecheck` — `.test-d.ts` / `.test-d.tsx` files
- Verifies generic inference, render prop type narrowing, hook return type shapes
- Runs on: full TS version matrix, ubuntu-latest, Node 22, latest React

### 5. Integration Tests

- `vitest run --project integration` — full component tree tests
- Tests cross-hook interactions, async flows, Suspense integration, retry flows, server-client boundaries
- Uses `@testing-library/react` with `act()` for async state management
- Runs on: ubuntu-latest, Node 22, latest TS × full React version matrix

### 6. GxP Integrity Tests

- `vitest run --project gxp` — high-risk invariant verification under adversarial conditions
- Test files: `gxp/stale-data-prevention.test.tsx` (INV-R3), `gxp/error-as-value.test.tsx` (INV-R4), `gxp/adapter-envelope.test.ts` (DRR-R3)
- Verifies generation guard prevents stale data display and no exception promotion occurs
- Runs on: ubuntu-latest, Node 22, latest TS × full React version matrix
- **Blocks PR**: Yes — GxP integrity failures are treated as critical

### 7. Traceability Verification

- `bash spec/packages/result/react/scripts/verify-traceability.sh` — parses BEH-RXX-NNN, INV-RN, ATR-RN, and DRR-RN IDs from spec and test files
- Targets: 100% forward traceability, 100% backward traceability, 0 orphaned requirements, 0 orphaned tests
- Runs on: ubuntu-latest, Node 22
- **Blocks PR**: Yes — traceability gaps prevent merge

### 8. Build

- `tsc -p tsconfig.build.json` — ESM output
- Verify dist output exists and is valid
- Verify `"use client"` directive is present in client-side entry points
- Verify `"use client"` directive is absent from `/server` subpath exports
- Runs on: ubuntu-latest, Node 22

### 9. Subpath Export Tests

- Verify every subpath in `package.json` `"exports"` resolves correctly
- Test ESM resolution
- Verify `@hex-di/result-react/internal/*` fails to resolve
- Verify `/server` exports are importable without React runtime
- Verify `/testing` exports are importable in test environments
- Verify `/adapters` exports are importable with and without peer dependencies (TanStack Query, SWR)
- Runs on: full Node matrix, ubuntu-latest

## Nightly React Canary

A scheduled job (daily at 00:00 UTC) tests against React's canary channel (`react@canary`):

- If the canary build passes: no action
- If the canary build fails: creates a GitHub issue with the failure details, tagged `react-canary`

**Purpose**: Early warning for upcoming React breaking changes to hook lifecycle, Suspense protocol, or concurrent mode behavior. The canary job does **not** block releases — it is informational only.

## Conventional Commits

All commits follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. See the [core library's CI & Maintenance](../../process/ci-maintenance.md#conventional-commits) for the full format specification.

### Scopes

| Scope | Covers |
|-------|--------|
| `match` | `components/match.tsx` |
| `hooks` | `hooks/*.ts` (all hooks) |
| `use-result-async` | `hooks/use-result-async.ts` |
| `use-result-action` | `hooks/use-result-action.ts` |
| `use-result-suspense` | `hooks/use-result-suspense.ts` |
| `use-result` | `hooks/use-result.ts` |
| `use-optimistic` | `hooks/use-optimistic-result.ts` |
| `use-safe-try` | `hooks/use-safe-try.ts` |
| `use-transition` | `hooks/use-result-transition.ts` |
| `resource` | `hooks/create-result-resource.ts` |
| `adapters` | `adapters/*.ts` |
| `server` | `server/*.ts` |
| `testing` | `testing/*.ts` |
| `utilities` | `utilities/*.ts` |
| `spec` | Spec file changes |

## Changesets

The project uses [Changesets](https://github.com/changesets/changesets) for versioning and changelog generation. See the [core library's CI & Maintenance](../../process/ci-maintenance.md#changesets) for the full workflow.

### Changeset File Format

```markdown
---
"@hex-di/result-react": minor
---

Add `useResultTransition` hook for React 19 concurrent transitions.
```

## Dependency Management

### Peer Dependencies

| Dependency | Version Range | Notes |
|-----------|--------------|-------|
| `react` | `^18.2.0 \|\| ^19.0.0` | Required |
| `react-dom` | `^18.2.0 \|\| ^19.0.0` | Required |
| `@hex-di/result` | `^1.0.0` | Required — core Result types |

### Optional Peer Dependencies

| Dependency | Version Range | Required For |
|-----------|--------------|-------------|
| `@tanstack/react-query` | `^5.0.0` | `/adapters` subpath — `toQueryFn`, `toQueryOptions`, `toMutationFn`, `toMutationOptions` |
| `swr` | `^2.0.0` | `/adapters` subpath — `toSwrFetcher` |

### Dev Dependencies

Managed via the monorepo-wide Renovate configuration. See [core CI & Maintenance](../../process/ci-maintenance.md#dependency-update-strategy).

## Toolchain Qualification

Per GAMP 5, infrastructure tools used in the development and testing of GxP-relevant software should be documented and justified.

| Tool | Version Constraint | GAMP 5 Category | Role | Qualification Rationale |
|------|-------------------|:----------------:|------|------------------------|
| React | ^18.2.0 \|\| ^19.0.0 | Category 1 (infrastructure) | UI rendering framework | Industry-standard; tested against React 18+19 version matrix in CI |
| React Testing Library | Latest | Category 1 (infrastructure) | Component and hook test utilities | `renderHook`, `render`, `act` — standard testing approach for React; results verified by CI pass/fail gates |
| jsdom | Latest | Category 1 (infrastructure) | DOM simulation for unit/integration tests | Provides DOM APIs for non-browser test environments; behavior differences from real browsers are mitigated by integration tests |
| Vitest | Latest | Category 1 (infrastructure) | Test runner (unit, type, integration, GxP integrity) | Executes all 4 test levels; results verified by CI pass/fail gates |
| TypeScript | >= 5.0 | Category 1 (infrastructure) | Static type checking, compilation | Tested against TS version matrix in CI |
| Node.js | >= 18.0.0 | Category 1 (infrastructure) | Runtime environment | LTS releases; tested against Node 18/20/22 in CI |
| Custom CI scripts (`verify-traceability.sh`) | Version-controlled | Category 1 (infrastructure) | Traceability verification | Maintained in version control; correctness verified by CI pass/fail gates |

> **Category 1 justification**: See [core CI & Maintenance](../../process/ci-maintenance.md#toolchain-qualification) for the GAMP 5 Category 1 rationale.

## Document Version Control Policy

Specification files in `spec/packages/result/react/` are version-controlled via Git. The version control policy is identical to the core library's policy — see [core CI & Maintenance](../../process/ci-maintenance.md#document-version-control-policy) for the full specification, including version evidence mapping, Git-based metadata retrieval commands, and printed copy procedures.

For the `@hex-di/result-react`-specific document control policy (scope, ID format, document states), see [document-control-policy.md](document-control-policy.md).

## Periodic Review

Specification documents are reviewed periodically per EU Annex 11.11. The review schedule aligns with the core library's schedule with additional React-specific triggers.

### Review Schedule

| Review Type | Cadence | Scope | Trigger |
|-------------|---------|-------|---------|
| Spec-to-implementation reconciliation | Every major release | All 7 behavior specs vs actual code | Version bump to next major |
| Invariant verification | Every minor release | All 12 invariants vs test results | Version bump to next minor |
| GxP compliance review | Annual (January) | Full spec suite against regulatory requirements | Calendar |
| React version compatibility | On each React major release | INV-R2, INV-R6, INV-R7, INV-R11; all hooks | React major release tag |
| Core library version compatibility | On each core major release | INV-R4, INV-R5; all hooks and components | Core major release tag |
| Glossary and cross-reference audit | Semi-annual (January, July) | All cross-reference links, glossary completeness | Calendar |
| Dependency and supply chain review | Quarterly | `pnpm audit`, peer dependency compatibility | Calendar |

### Review Evidence

Reviews are documented as GitHub Issues with the `spec-review` label — identical process to the core library. See [core CI & Maintenance](../../process/ci-maintenance.md#review-evidence) for the full procedure.

### Review History

| ID | Date | Review Type | Reviewer | Findings | Evidence |
|----|------|------------|----------|----------|----------|
| _RREV-YYYY-NNN_ | _Date_ | _Type_ | _Name_ | _Summary_ | _GitHub Issue/PR_ |

> Reviews will be recorded here as they occur. The first review entry is expected after the initial implementation is complete and the package is released.

## Change Control Process

All changes to the package follow a formal change control process. See [change-control.md](change-control.md) for the full procedure, including change categories, escalation triggers, regression testing policy, and periodic review cadence.

### Summary

| Category | Testing Required |
|----------|-----------------|
| Critical | Full regression: unit + type + integration + GxP integrity (all React versions) |
| Major | Targeted tests + regression for affected capabilities |
| Minor | Targeted tests for changed modules |
| Editorial | CI lint and build only |
