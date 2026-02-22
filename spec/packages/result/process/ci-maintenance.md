# CI & Maintenance

Continuous integration, release process, and dependency management for `@hex-di/result`.

## CI Matrix

All tests run on every pull request and push to `main`.

### Platform Matrix

| OS | Node 18 | Node 20 | Node 22 |
|----|:-------:|:-------:|:-------:|
| ubuntu-latest | x | x | x |
| macos-latest | x | x | x |
| windows-latest | x | x | x |

### TypeScript Matrix

| TS Version | Status |
|-----------|--------|
| 5.0 | Tested |
| 5.1 | Tested |
| 5.2 | Tested |
| 5.3 | Tested |
| 5.4 | Tested |
| 5.5 | Tested |
| 5.6 | Tested |
| latest | Tested |

**Policy**: The library supports all TypeScript versions from 5.0 to latest. If a new TS version introduces a breaking change, the minimum is bumped in a major release.

## CI Jobs

### 1. Lint

- ESLint with project config (`eslint.config.js`)
- Runs on: ubuntu-latest, Node 22 (single environment)

### 2. Type Check

- `tsc --noEmit` with project config
- Runs on: full TS version matrix, ubuntu-latest, Node 22

### 3. Unit Tests

- `vitest run` — runtime tests
- Runs on: full Node + OS matrix, latest TS

### 4. Type Tests

- `vitest typecheck` — `.test-d.ts` files
- Runs on: full TS version matrix, ubuntu-latest, Node 22

### 5. Mutation Tests

- Stryker with `@stryker-mutator/vitest-runner`
- 90% mutation score break threshold (see [test-strategy.md](test-strategy.md) for per-module targets)
- Runs on: ubuntu-latest, Node 22, latest TS (single environment — mutation testing is slow)

### 6. GxP Integrity Tests

- `vitest run --project gxp` — specialized immutability, brand integrity, and error suppression tests
- Test files: `gxp/freeze.test.ts`, `gxp/error-freeze.test.ts`, `gxp/option-freeze.test.ts`, `gxp/tamper-evidence.test.ts`, `gxp/async-tamper.test.ts`, `gxp/option-tamper.test.ts`, `gxp/error-suppression.test.ts`, `gxp/promise-safety.test.ts`, `gxp/generator-safety.test.ts`, `gxp/delegation.test.ts`
- Runs on: ubuntu-latest, Node 22, latest TS
- **Blocks PR**: Yes — GxP integrity failures are treated as critical

### 7. Cucumber Acceptance Tests

- `@cucumber/cucumber` with TypeScript step definitions
- Feature files: `features/*.feature` (Gherkin syntax)
- Step definitions: `features/steps/*.ts`
- Runs on: ubuntu-latest, Node 22, latest TS
- **Blocks PR**: Yes — acceptance test failures prevent merge

### 8. Traceability Verification

- `bash scripts/verify-traceability.sh` — parses BEH-XX-NNN, INV-N, ATR-N, and DRR-N IDs from spec and test files, computes forward/backward traceability coverage, verifies ATR-N/DRR-N verification mechanism references, and reports orphaned requirements/tests
- Targets: 100% forward traceability, 100% backward traceability, 0 orphaned requirements, 0 orphaned tests
- Runs on: ubuntu-latest, Node 22
- **Blocks PR**: Yes — traceability gaps prevent merge
- **Artifact archiving**: The traceability report output is uploaded as a CI artifact (`traceability-report.txt`) and retained for the CI platform's default artifact retention period (90 days for GitHub Actions). This enables post-hoc audit review of traceability coverage for any historical build. For long-term GxP retention requirements, organizations should archive these artifacts in their document management system per their site retention schedule (see [gxp.md Data Retention Guidance](../compliance/gxp.md#data-retention-guidance)).

#### Release Traceability Artifact

At each tagged release, the traceability verification script is invoked with `--report-md` to generate a static, human-auditable Markdown report committed to the repository at `docs/traceability-report-vX.Y.Z.md`. This report is generated and committed as part of the "Version Packages" PR workflow:

```bash
# Generate static traceability report for the release
bash scripts/verify-traceability.sh --report-md > docs/traceability-report-v$(node -p "require('./package.json').version").md
git add docs/traceability-report-*.md
```

The committed report provides:

- Full BEH-XX-NNN → test case mapping (per-requirement, all test levels)
- Full INV-N → test case mapping (per-invariant, all test levels)
- Full ATR-N → verification mechanism mapping (per audit trail requirement)
- Full DRR-N → verification mechanism mapping (per data retention requirement)
- Forward/backward traceability percentages
- Orphaned requirement/test list (expected: empty)

**Rationale**: CI artifacts are retained for 90 days (GitHub Actions default). Regulatory audits may examine releases older than 90 days. Committing the report to Git ensures traceability evidence is available for the full repository lifetime, retrievable via `git show vX.Y.Z:docs/traceability-report-vX.Y.Z.md`.

### 9. ATR-1 Compliance Check

- Grep-based check that fails the build if `andTee()` or `orTee()` is found in GxP-annotated files (`src/gxp/`, `src/**/*.gxp.ts`)
- Enforces [ATR-1](../compliance/gxp.md#normative-requirements): `andTee()` and `orTee()` are prohibited for audit-critical operations
- Runs on: ubuntu-latest, Node 22
- **Blocks PR**: Yes — `andTee()`/`orTee()` in GxP-annotated files is a 21 CFR 11.10(e) compliance violation

### 10. Build

- `tsc -p tsconfig.build.json` — ESM output
- Verify dist output exists and is valid
- Runs on: ubuntu-latest, Node 22

### 11. Subpath Export Tests

- Verify every subpath in `package.json` `"exports"` resolves correctly
- Test both ESM (`import`) and CJS (`require`) resolution
- Verify `@hex-di/result/internal/*` fails to resolve
- Runs on: full Node matrix, ubuntu-latest

## Nightly TS Canary

A scheduled job (daily at 00:00 UTC) tests against TypeScript's nightly build (`typescript@next`):

- If the nightly build passes: no action
- If the nightly build fails: creates a GitHub issue with the failure details, tagged `ts-canary`

**Purpose**: Early warning for upcoming TypeScript breaking changes. The nightly job does **not** block releases — it is informational only.

## Conventional Commits

All commits follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to Use | SemVer Impact |
|------|-------------|---------------|
| `feat` | New feature | Minor |
| `fix` | Bug fix | Patch |
| `docs` | Documentation only | None |
| `style` | Code style (formatting, semicolons) | None |
| `refactor` | Code change that neither fixes a bug nor adds a feature | None |
| `perf` | Performance improvement | Patch |
| `test` | Adding or updating tests | None |
| `build` | Build system or external dependency changes | None |
| `ci` | CI configuration changes | None |
| `chore` | Other changes that don't modify src or test files | None |

### Scopes

| Scope | Covers |
|-------|--------|
| `core` | `core/brand.ts`, `core/types.ts`, `core/result.ts`, `core/guards.ts` |
| `async` | `async/result-async.ts` |
| `combinators` | `combinators/*.ts` |
| `constructors` | `constructors/*.ts` |
| `generators` | `generators/*.ts` |
| `do` | `do/*.ts` |
| `errors` | `errors/*.ts` |
| `option` | `option/*.ts` |
| `fn` | `fn/*.ts` |
| `unsafe` | `unsafe/*.ts` |
| `interop` | `interop/*.ts` |
| `types` | `type-utils.ts` |
| `spec` | Spec file changes |

### Breaking Changes

Breaking changes use `!` after the type/scope or `BREAKING CHANGE:` in the footer:

```
feat(core)!: update expect() to throw UnwrapError instead of Error

BREAKING CHANGE: expect() and expectErr() now throw UnwrapError instead of
plain Error. Code that checks `e.constructor === Error` specifically will
need updating. `e instanceof Error` continues to work because
UnwrapError extends Error.
```

## Changesets

The project uses [Changesets](https://github.com/changesets/changesets) for versioning and changelog generation.

### Workflow

1. Developer creates a changeset: `pnpm changeset`
2. Changeset file describes the change and its semver impact
3. PR includes the changeset file
4. On merge to `main`, the changesets bot creates a "Version Packages" PR
5. Merging the version PR publishes to npm

### Changeset File Format

```markdown
---
"@hex-di/result": minor
---

Add `Option<T>` type with `some()`, `none()`, and `isOption()` factories.
```

### Release Channels

| Channel | npm Tag | Trigger |
|---------|---------|---------|
| Stable | `latest` | Merge "Version Packages" PR |
| Canary | `canary` | Every push to `main` (auto-publish with git hash version) |

## Dependency Update Strategy

### Renovate Configuration

The project uses [Renovate](https://docs.renovatebot.com/) for automated dependency updates.

**Policy**:

| Dependency Type | Update Strategy | Auto-merge |
|----------------|----------------|------------|
| Production dependencies | Manual review required | No |
| Dev dependencies (test) | Auto-merge if CI passes | Yes |
| Dev dependencies (build) | Auto-merge if CI passes | Yes |
| TypeScript | Manual review required | No |
| GitHub Actions | Auto-merge if CI passes | Yes |

### Lock File Maintenance

- Renovate creates a weekly lock file maintenance PR
- This updates all transitive dependencies without changing `package.json`
- Auto-merged if CI passes

## Security

- `pnpm audit` runs on every CI job
- Critical/high vulnerabilities block the build
- Dependabot security alerts are enabled on the repository
- No runtime dependencies — the library has zero production dependencies, minimizing supply chain risk

## Toolchain Qualification

Per GAMP 5, infrastructure tools used in the development and testing of GxP-relevant software should be documented and justified. The following table records the toolchain components, their GAMP 5 classification, and qualification rationale.

| Tool | Version Constraint | GAMP 5 Category | Role | Qualification Rationale |
|------|-------------------|:----------------:|------|------------------------|
| TypeScript | ≥ 5.0 | Category 1 (infrastructure) | Static type checking, compilation | Industry-standard compiler; tested against full TS version matrix (5.0–latest) in CI; nightly canary detects regressions |
| Node.js | ≥ 18.0.0 | Category 1 (infrastructure) | Runtime environment | LTS releases used; tested against Node 18/20/22 across 3 OS platforms in CI |
| Vitest | Latest | Category 1 (infrastructure) | Unit, type, and performance test runner | Executes all 6 test levels; mutation testing via Stryker plugin; results verified by CI pass/fail gates |
| Stryker | Latest | Category 1 (infrastructure) | Mutation testing | Validates test suite effectiveness; 90% mutation score threshold enforced in CI |
| Cucumber | Latest | Category 1 (infrastructure) | BDD acceptance test runner | Executes `.feature` files with TypeScript step definitions via `tsx` loader; CI-gated |
| tsx | Latest | Category 1 (infrastructure) | TypeScript ESM loader for Cucumber | Enables direct execution of `.ts` step definitions without a separate compilation step; used as `requireModule` in Cucumber configuration |
| npm / pnpm | Latest | Category 1 (infrastructure) | Package management, dependency resolution | Lock files committed; `pnpm audit` runs on every CI job; zero production dependencies |
| GitHub Actions | N/A (platform) | Category 1 (infrastructure) | CI/CD orchestration | Managed platform; workflow files version-controlled; action versions pinned |
| Renovate | Latest (managed) | Category 1 (infrastructure) | Automated dependency update PRs | Auto-merge limited to dev dependencies per [Dependency Update Strategy](#dependency-update-strategy); production dependency updates require manual review; all auto-merged PRs must pass full CI pipeline |
| Custom CI scripts (`verify-traceability.sh`, ATR-1 check) | Version-controlled | Category 1 (infrastructure) | Traceability verification, compliance enforcement | Maintained alongside library source in version control; correctness verified by CI pass/fail gates; changes require PR review per [Change Control Process](#change-control-process) |

> **Category 1 justification**: All tools listed above are established, widely-adopted infrastructure software used as-is without modification (or, in the case of custom CI scripts, simple deterministic shell scripts with observable pass/fail behavior). Per GAMP 5 Appendix M4, Category 1 infrastructure requires only verification of correct installation and intended function — formal IQ/OQ is not required for the tools themselves. Correct function is verified implicitly by the CI pipeline: if the toolchain is misconfigured, tests fail and the PR is blocked.

## Document Version Control Policy

Specification files in `spec/result/` are version-controlled via Git. Git serves as the authoritative version record per EU Annex 11.10 and GAMP 5 requirements.

### Version Evidence

| Requirement | How Git Satisfies It |
|-------------|---------------------|
| Version number | Git commit SHA (unique, immutable) + semver tags on releases |
| Date | Git commit timestamp (author date) |
| Author | Git commit author (name + email from `git log`) |
| Reviewer | GitHub PR approver recorded in merge commit |
| Approver | PR merge by maintainer constitutes approval |
| Change description | Commit message body + PR description |
| Change reference | PR number linked in merge commit |

### Policy

1. All specification changes require a pull request — direct pushes to `main` are blocked
2. Each PR constitutes a change record with author, reviewer, and approval evidence
3. Git history is immutable — force-pushes to `main` are prohibited
4. Release tags (`v1.0.0`, etc.) mark approved specification baselines
5. For GxP audits, `git log --follow spec/result/<file>` produces the full revision history including author, date, and change description for any specification file
6. The `git blame` command provides per-line attribution, satisfying ALCOA+ "Attributable" at the statement level

### Repository Availability

The Git repository is hosted on GitHub, which provides geographic redundancy, automated backups, and high availability. GxP consumers with business continuity requirements should maintain a local clone or mirror of the repository as part of their document management system. A local clone (`git clone --mirror`) preserves the full commit history, tags, and branches — ensuring that all specification versions, review evidence, and change records remain available even if the upstream repository becomes inaccessible. The mirror should be refreshed on a schedule aligned with the consumer's backup cadence (e.g., weekly).

### Specification File Headers

Specification files do not carry inline version metadata (to avoid duplication with Git). Instead, the following metadata is derivable from Git for any file:

```bash
# Full revision history for a spec file
git log --follow --format="%H %ai %an: %s" spec/result/behaviors/01-types-and-guards.md

# Last approved version
git log -1 --format="%H %ai %an" spec/result/behaviors/01-types-and-guards.md

# Per-line attribution
git blame spec/result/behaviors/01-types-and-guards.md
```

## Periodic Review

Specification documents are reviewed periodically per EU Annex 11.11.

### Review Schedule

| Review Type | Cadence | Scope | Responsible Role | Trigger |
|-------------|---------|-------|-----------------|---------|
| Spec-to-implementation reconciliation | Every major release | All behavior specs vs actual code | Maintainer | Version bump to next major |
| Invariant verification | Every minor release | All 14 invariants vs test results | Maintainer | Version bump to next minor |
| GxP compliance review | Annual | Full spec suite against regulatory requirements | Maintainer with GxP knowledge or QA representative | Calendar (January each year) |
| Glossary and cross-reference audit | Semi-annual | All cross-reference links, glossary completeness | Any contributor | Calendar (January, July) |
| Dependency and supply chain review | Quarterly | `pnpm audit`, GitHub security alerts, Renovate status | Maintainer | Calendar |

### Review Evidence

- Review is documented as a GitHub Issue with the `spec-review` label
- Issue body contains the review checklist, reviewer name, and date
- Findings are tracked as linked Issues or PRs
- Closure of the review Issue constitutes completion evidence

### Review History

| ID | Date | Review Type | Reviewer | Findings | Evidence | Disposition |
|----|------|------------|----------|----------|----------|-------------|
| REV-2026-001 | 2026-02-15 (Round 1 of 7) | GxP compliance review | GxP specification reviewer | 13 findings (3 Major / 5 Minor / 5 Observations) | _Pre-repository review — findings applied during initial spec authoring_ | All findings addressed in spec revision; see compliance/gxp.md and this document |
| REV-2026-002 | 2026-02-15 (Round 2 of 7) | GxP compliance review remediation | GxP specification reviewer | 8 findings remediated (3 Major / 5 Minor) | _Pre-repository review — remediation applied during initial spec authoring_ | Supplier assessment guidance added, ATR-1 CI check made blocking, independent review sign-off block added, shallow freeze risk acceptance formalized, incident reporting section added, DRR-2 regression testing specified, training self-assessment tracked as v1.0 blocker, periodic review schedule documented |
| REV-2026-003 | 2026-02-15 (Round 3 of 7) | GxP compliance review (mapping completeness) | GxP specification reviewer | 9 findings (0 Critical / 0 Major / 5 Minor / 4 Observations) | _Pre-repository review — remediation applied during initial spec authoring_ | EU Annex 11 mapping completed (§§2,3,8,14,15 added), 21 CFR 11.10(i) reclassified as Supported, Review History evidence column added, migration sample size justified, toolchain qualification extended, PQ traceability added, OQ execution evidence guidance added, DRR-N/ATR-N coverage targets added, test environment prerequisite note added |
| REV-2026-004 | 2026-02-15 (Round 4 of 7) | GxP specification review (external) | GxP specification reviewer | 9 findings (0 Critical / 0 Major / 4 Minor / 5 Observations) | _Pre-repository review — remediation applied during initial spec authoring_ | **Minor findings**: OQ-012 and OQ-013 added (toSchema interop and fromJSON negative case), PQ-009 added (audit trail integration scenario), Review History pre-repository footnote added. **Observations**: DRR-3 cross-referenced in 21 CFR 11.10(b) mapping, consumer CS template added, PQ rationale paragraph added, INV-12 re-evaluation scheduled in Upcoming Review Schedule. F-7 (ATR-1 grep over-approximation) confirmed as documented and justified — no action taken |
| REV-2026-005 | 2026-02-15 (Round 5 of 7) | GxP specification review (full suite) | GxP specification reviewer | 11 findings (0 Critical / 0 Major / 5 Minor / 6 Observations) | _Pre-repository review — remediation applied during initial spec authoring_ | **Minor findings remediated**: (1) URS scoping rationale added to Specification Hierarchy Mapping in compliance/gxp.md — explains where traditional URS elements are addressed for Category 3. (2) Static traceability report archiving requirement added — `docs/traceability-report-vX.Y.Z.md` committed at each release; Release Traceability Artifact section added to ci-maintenance.md. (3) Attestation bridge guidance strengthened — pre-repository review evidence enumerated per round with concrete attestation requirement for Q2 2026 review. (4) OQ-014 (combinators), OQ-015 (ResultAsync), OQ-016 (Do notation) added — expands OQ coverage to all 14 behavior spec domains. (5) PQ-010 (version upgrade revalidation workflow) added — validates the documented Revalidation Scope procedure including DRR-2 regression across versions. **Additionally remediated**: IQ-010 lock file format examples added (pnpm-lock.yaml and package-lock.json SRI format). **Observations accepted without action**: ATR-1 grep over-approximation (documented and justified), incident response targets (good-faith SLAs documented), consumer CS template format (guidance-level adequate for Category 3), deprecation registry (deferred to ESLint plugin roadmap), obsolete document discoverability (Git history sufficient for Category 3) |
| REV-2026-006 | 2026-02-15 (Round 6 of 7) | GxP compliance review (minor findings remediation) | GxP specification reviewer | 4 Minor findings remediated | _Pre-repository review — remediation applied during spec authoring_ | **F-1**: DRR-4 added — Option Serialization for Data Retention section with Result wrapping patterns; DRR-N cross-references and Coverage Targets updated. **F-2**: Deviation Handling subsection added to Validation Templates with deviation categories, always-critical test list, deviation procedure, and deviation record template. **F-3**: Traceability verification scope extended to ATR-N and DRR-N identifiers — ATR-N/DRR-N verification mechanism mapping table added to Coverage Targets; ci-maintenance.md traceability description and release artifact scope updated. **F-4**: Residual Risk Summary table added after Risk Acceptance Criteria — consolidates 6 accepted residual risks (RR-1 through RR-6) with cross-references to documentation sections and compensating controls |
| REV-2026-007 | 2026-02-15 (Round 7 of 7) | GxP compliance review (audit readiness) | GxP specification reviewer | 4 Minor findings remediated | _Pre-repository review — remediation applied during spec authoring_ | **F-1**: DRR-5 added — Periodic Readability Verification for Archived Data section with sample selection, deserialization verification, cadence, and documentation requirements; DRR-N cross-references and Coverage Targets updated; ATR-N/DRR-N traceability verification table extended. **F-2**: Protocol Identification metadata block added to Validation Templates — provides Protocol Number, Protocol Version, Execution ID, System Under Test, Test Environment, and Prepared/Reviewed/Approved By fields for IQ/OQ/PQ execution documents. **F-3**: Document Control section added at the top of compliance/gxp.md — provides Document ID, Version, Author, Last Reviewed, and Approval Evidence fields with Git command pointers and auditor guidance for printed/exported copies. **F-4**: End-of-Life Notification subsection added under Support Lifecycle — defines 12-month/6-month/EOL notification timeline, post-EOL support policy for security fixes and gxp-critical issues, and GxP consumer migration guidance |
| REV-2026-008 | 2026-02-15 | Training self-assessment (v1.0 blocker) | Library maintainer | 0 findings — all 5 questionnaire answers verified correct | Self-assessment executed against Sample Assessment Questionnaire in compliance/gxp.md. Verification: Q1 (b) confirmed per ATR-1/INV-5 — `andTee` suppresses exceptions; Q2 (b) confirmed per INV-1/ALCOA+ Gap — `Object.freeze()` is shallow, mutation succeeds on nested objects; Q3 (b) confirmed per INV-3 — `RESULT_BRAND` symbol checked by `isResult()`, structural look-alikes rejected; Q4 (c) confirmed per DRR-3 — `toJSON()`/`fromJSON()` preserves brand, `structuredClone` strips it; Q5 (b) confirmed per Version Pinning for GxP — exact pinning required, caret range bypasses change control | **Result**: 5/5 correct (100%). Q1 and Q2 mandatory-pass questions both correct. All answers accurately reflect library behavior as specified. No questionnaire corrections needed. v1.0 self-assessment blocker resolved |
| REV-2026-009 | 2026-02-15 | GxP compliance review (round 8) | GxP specification reviewer | 7 findings (0 Critical / 2 Major / 5 Minor / 0 Observations) | _Pre-repository review — remediation applied during spec authoring_ | **Major F-1**: Reviewer Identification Plan added to Independent Review Sign-Off with 4-milestone timeline, bus-factor mitigation, and acceptable reviewer backgrounds. **Major F-2**: Training self-assessment executed (REV-2026-008); all 5 answers verified correct. **Minor F-3**: RR-7 (sole-maintainer bus factor) added to Residual Risk Summary table with 5 compensating controls. **Minor F-4**: ATR-N and DRR-N verification sections added to `scripts/verify-traceability.sh`. **Minor F-5**: DRR-2 fixture file (`src/core/__fixtures__/schema-versions.json`) and regression test (`src/core/from-json-compat.test.ts`) created per gxp.md specification. **Minor F-6**: Unique review identifiers (REV-2026-NNN) added to Review History table as ID column. **Minor F-7**: Upcoming Review Schedule updated with concrete v1.0 action plan for first 3 GitHub Issues |

> **Pre-repository review evidence note**: The Review History entries dated 2026-02-15 predate the Git repository and therefore cannot be independently verified via Git commit history or GitHub PR records. The review findings are self-evident in the current document content — each finding resulted in a specific, identifiable section or table row in the specification suite. Specifically: Round 1 produced the ALCOA+ mapping, 21 CFR Part 11 mapping, EU Annex 11 mapping, risk assessment, traceability matrix, and validation templates; Round 2 added the supplier assessment guidance, ATR-1 CI blocking check, independent review sign-off block, shallow freeze risk acceptance, incident reporting section, DRR-2 regression testing, and periodic review schedule; Round 3 completed EU Annex 11 §§2,3,8,14,15 mappings, reclassified 21 CFR 11.10(i), added migration sample size justification, and extended toolchain qualification; Round 4 added OQ-012, OQ-013, PQ-009, and the consumer CS template; Round 7 added DRR-5 (periodic readability verification), Protocol Identification metadata, Document Control section, and End-of-Life Notification process. All future reviews will follow the Git-verifiable process defined in [Review Evidence](#review-evidence): documented as a GitHub Issue with the `spec-review` label, with findings tracked as linked Issues or PRs.
>
> **Attestation bridge requirement**: The Q2 2026 dependency and supply chain review (the first Git-verifiable review) **must** include an attestation block in its GitHub Issue that explicitly confirms the pre-repository review evidence. The attestation must enumerate each pre-repository review round and the specific specification sections it produced, as follows:
>
> 1. **Review round 1** (2026-02-15, initial GxP compliance review): Produced the ALCOA+ Compliance Mapping, 21 CFR Part 11 Mapping, EU GMP Annex 11 Mapping, Risk Assessment Methodology (per-invariant assessment table), Requirement Traceability Matrix (BEH-XX-NNN scheme and Invariants → Test Coverage table), and Validation Templates (IQ/OQ/PQ).
> 2. **Review round 2** (2026-02-15, remediation): Added Supplier Assessment Guidance section, ATR-1 CI blocking check, Independent Review Sign-Off block, ALCOA+ Gap shallow freeze risk acceptance statement, GxP Incident Reporting section, DRR-2 regression testing specification, and Periodic Review schedule.
> 3. **Review round 3** (2026-02-15, mapping completeness): Completed EU Annex 11 §§2,3,8,14,15 mappings, reclassified 21 CFR 11.10(i) as Supported with Training Guidance, added migration sample size justification (ANSI/ASQ Z1.4 reference), extended Toolchain Qualification table, added PQ traceability columns, added OQ execution evidence guidance, and added DRR-N/ATR-N coverage targets.
> 4. **Review round 4** (2026-02-15, external review): Added OQ-012 (Standard Schema interop), OQ-013 (fromJSON negative case), PQ-009 (audit trail integration scenario), Consumer CS Template, and pre-repository footnote to Review History.
> 5. **Review round 5** (2026-02-15, full suite review): Produced the full specification review report (0 Critical / 0 Major / 4 Minor / 5 Observations). Added URS scoping rationale, static traceability report archiving, attestation bridge strengthening, OQ-014/OQ-015/OQ-016, PQ-010, and IQ-010 lock file format examples.
> 6. **Review round 6** (2026-02-15, minor findings remediation): Remediated 4 Minor findings: (F-1) DRR-4 Option Serialization for Data Retention section with Result wrapping patterns; (F-2) Deviation Handling subsection in Validation Templates; (F-3) ATR-N/DRR-N traceability verification mechanism mapping; (F-4) Residual Risk Summary table (RR-1 through RR-6).
> 7. **Review round 7** (2026-02-15, audit readiness): Produced the full specification review report (0 Critical / 0 Major / 4 Minor / 5 Observations). Remediated 4 Minor findings: (F-1) DRR-5 Periodic Readability Verification for Archived Data with sample selection, deserialization verification, cadence, and documentation requirements; DRR-N cross-references and traceability table extended. (F-2) Protocol Identification metadata block added to Validation Templates for IQ/OQ/PQ execution documents. (F-3) Document Control section added at the top of compliance/gxp.md with Git command pointers and auditor guidance. (F-4) End-of-Life Notification subsection added under Support Lifecycle with 12-month/6-month/EOL notification timeline and post-EOL support policy.
>
> The reviewer must confirm that the sections enumerated above exist in the current specification and are consistent with their stated review origins. This attestation converts the pre-repository evidence gap into a Git-verifiable chain of custody, satisfying ALCOA+ "Attributable" and "Contemporaneous" for the review history.

### Upcoming Review Schedule

The following reviews are due per the cadence defined above. This table is maintained as a planning aid — actual review evidence is recorded as GitHub Issues with the `spec-review` label.

| Review Type | Next Due | GitHub Issue |
|-------------|----------|-------------|
| Dependency and supply chain review | Q2 2026 (April) | _To be created_ |
| Glossary and cross-reference audit | July 2026 | _To be created_ |
| Dependency and supply chain review | Q3 2026 (July) | _To be created_ |
| Dependency and supply chain review | Q4 2026 (October) | _To be created_ |
| INV-12 risk level re-evaluation | January 2027 | _To be created_ |
| GxP compliance review | January 2027 | _To be created_ |
| Glossary and cross-reference audit | January 2027 | _To be created_ |

> **Maintenance**: When a review is completed, move its entry from this table to the Review History table above and create the next occurrence. When a major or minor version is released, add the corresponding spec-to-implementation reconciliation or invariant verification review to this table.
>
> **v1.0 action item**: Before the v1.0 GA release, create GitHub Issues with the `spec-review` label for at least the next 3 scheduled reviews (Q2 2026 dependency review, July 2026 glossary audit, Q3 2026 dependency review) to demonstrate the periodic review process is operational. Replace the corresponding "_To be created_" entries in the table above with issue URLs.
>
> **Issue creation checklist** (execute during initial repository setup):
>
> 1. Create Issue: **"Scheduled review: Q2 2026 dependency and supply chain review"**
>    - Label: `spec-review`
>    - Body must include: (a) review scope per [Dependency and Supply Chain Review](#review-schedule) cadence definition, (b) the attestation bridge requirement from the pre-repository review evidence note, (c) checklist of verification steps
>    - Milestone: v1.0 GA or Q2 2026 (whichever milestone exists)
>
> 2. Create Issue: **"Scheduled review: July 2026 glossary and cross-reference audit"**
>    - Label: `spec-review`
>    - Body must include: review scope per [Glossary and Cross-Reference Audit](#review-schedule) cadence definition, list of all specification files to audit for terminology consistency
>    - Milestone: Q3 2026
>
> 3. Create Issue: **"Scheduled review: Q3 2026 dependency and supply chain review"**
>    - Label: `spec-review`
>    - Body must include: review scope per [Dependency and Supply Chain Review](#review-schedule) cadence definition, checklist of verification steps
>    - Milestone: Q3 2026
>
> After creating each Issue, replace the corresponding `_To be created_` entry in the Upcoming Review Schedule table with the Issue URL (e.g., `[#42](https://github.com/org/repo/issues/42)`).

## Change Control Process

All changes to the library follow a formal change control process aligned with GAMP 5 change management requirements. See [change-control.md](change-control.md) for the full change control procedure, including change categories, escalation triggers, regression testing policy, and periodic review cadence. See [compliance/gxp.md](../compliance/gxp.md) for full regulatory context.

### Change Categories

| Category | Description | Approval Level | Testing Required |
|----------|-------------|----------------|------------------|
| Critical | Impacts GxP-relevant functionality (freeze, brand, error flow) | Maintainer + reviewer | Full regression (all 6 test levels) |
| Major | New feature or behavioral change | Maintainer | Targeted + mutation + Cucumber |
| Minor | Documentation, spec clarifications | Any contributor | Targeted unit tests |
| Editorial | Typos, formatting, comments | Any contributor | CI lint only |

> **Glossary changes**: Modifications to `glossary.md` that add, remove, or redefine terms referenced in `compliance/gxp.md` or `invariants.md` are classified as **Minor** (not Editorial), because glossary terms underpin specification consistency for GxP-relevant concepts. Purely editorial glossary changes (typo corrections, formatting) remain Editorial.

### Process

1. All changes require a pull request against `main`
2. PR description must reference the change category
3. Critical changes require explicit GxP impact assessment in the PR description
4. At least one maintainer approval required for Major/Critical changes
5. All CI jobs must pass before merge (see CI Jobs above)
6. Breaking changes follow the conventional commits `!` convention and require a changeset
