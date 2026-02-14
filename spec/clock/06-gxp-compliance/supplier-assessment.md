# Supplier Assessment

## Purpose

EU GMP Annex 11, Section 5 requires that regulated entities assess the quality and suitability of software suppliers. This section provides the supplier assessment documentation for `@hex-di/clock`, enabling GxP organizations to evaluate the package as part of their computerized system validation plan.

---

## Supplier Information

| Field               | Value                                        |
| ------------------- | -------------------------------------------- |
| **Supplier**        | HexDI Project (Open Source)                  |
| **Package**         | `@hex-di/clock`                              |
| **Distribution**    | npm registry (`@hex-di/clock`)               |
| **License**         | See repository LICENSE                       |
| **Repository**      | HexDI monorepo (pnpm workspaces + Turborepo) |
| **GAMP 5 Category** | Category 5 (Custom Software)                 |

### Quality Management Representative

| Field                      | Value                                                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Quality Representative** | HexDI Quality Assurance Lead                                                                                                                          |
| **Contact Method**         | Via repository issue tracker (label: `gxp-quality`) or project security contact for urgent quality matters                                            |
| **Responsibilities**       | Specification approval, change control authorization, re-qualification sign-off, deviation review, supplier audit support, FMEA review                |
| **Delegation Authority**   | May delegate to a named QA designee for time-bounded periods; delegation MUST be documented in the project quality log with effective dates and scope |

REQUIREMENT: GxP organizations conducting a supplier assessment MUST verify the identity and qualification of the Quality Management Representative as part of their assessment. The representative MUST be able to demonstrate:

1. Authority to approve specification changes and version releases for `@hex-di/clock`.
2. Knowledge of the GxP regulatory requirements addressed by the specification (21 CFR Part 11, EU GMP Annex 11, GAMP 5).
3. Access to the full revision history, test results, and validation evidence for the current validated version.
4. A documented delegation chain for periods when the primary representative is unavailable.

REQUIREMENT: The Quality Management Representative MUST be reachable within **5 business days** for supplier audit inquiries and within **24 hours** for urgent quality matters (e.g., data integrity defects, security vulnerabilities affecting clock accuracy). Response time commitments MUST be documented in the supplier quality agreement between HexDI and the consuming GxP organization.

REQUIREMENT: When the Quality Management Representative changes (new individual assumes the role), the change MUST be documented in the project quality log and communicated to all GxP organizations that have completed a supplier assessment. The notification MUST include the effective date, the outgoing representative's name, and the incoming representative's qualifications.

---

## Development Process

### Source Control

- All source code is maintained in a Git repository with full commit history.
- All changes to `@hex-di/clock` are traceable through Git commits with descriptive messages.
- The `main` branch is the single source of truth for released versions.

### Code Review

- All changes undergo code review before merging to the main branch.
- Reviews verify adherence to the project's type safety rules (no `any`, no type casting, no `eslint-disable`, no non-null assertions).

### Coding Standards

- TypeScript strict mode with maximum type inference.
- ESLint enforcement per package with zero tolerance for rule violations.
- Immutability by default: all public objects are frozen with `Object.freeze()`.
- No global state, no side effects at import time.

### Architecture

- Hexagonal architecture (Ports and Adapters pattern).
- All external dependencies accessed through injectable ports.
- Clear separation of mechanism (`@hex-di/clock`) from policy (`@hex-di/guard`).
- Unidirectional dependency: guard depends on clock, never the reverse.

---

## Quality Controls

### Automated Testing

| Control                | Description                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Unit Tests**         | Vitest-based unit tests for all production code paths. Target: >95% mutation score per module.                                             |
| **Type-Level Tests**   | `*.test-d.ts` files verifying compile-time type safety using `expectTypeOf` assertions.                                                    |
| **GxP-Specific Tests** | Dedicated `gxp-*.test.ts` suites covering immutability, monotonicity, sequence uniqueness, structural irresettability, and anti-tampering. |
| **IQ Protocol Tests**  | `gxp-iq-clock.test.ts`: 22 installation qualification steps verifiable as automated tests.                                                 |
| **OQ Protocol Tests**  | `gxp-oq-clock.test.ts`: 5 operational qualification steps exercising production adapter under load.                                        |
| **PQ Protocol Tests**  | `gxp-pq-clock.test.ts`: 4 performance qualification steps for sustained real-world conditions.                                             |
| **Mutation Testing**   | Stryker-based mutation testing targeting >95% mutation kill rate on critical paths.                                                        |

### Static Analysis

| Control                    | Description                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| **TypeScript Strict Mode** | `strict: true` in all `tsconfig.json` files.                                                           |
| **ESLint**                 | Per-package `eslint.config.js` with shared root configuration. No `eslint-disable` comments permitted. |
| **No Type Casting**        | Enforced by project rules: no `as X` expressions, no non-null assertions.                              |

### Continuous Integration

| Control                | Description                                                 |
| ---------------------- | ----------------------------------------------------------- |
| **CI Pipeline**        | Automated build, lint, typecheck, and test on every commit. |
| **Lockfile Integrity** | `pnpm-lock.yaml` committed and verified in CI.              |
| **Dependency Audit**   | `pnpm audit` integrated into CI pipeline.                   |

---

## Testing Methodology

### Test Pyramid

1. **Unit Tests**: Each source file has a corresponding `*.test.ts` file testing individual functions and edge cases.
2. **Type Tests**: Each port interface has a corresponding `*.test-d.ts` file verifying type-level contracts.
3. **Integration Tests**: GxP test suites (`gxp-clock.test.ts`) verify cross-module behavior (e.g., `TemporalContextFactory` composing `ClockPort` + `SequenceGeneratorPort`).
4. **Qualification Tests**: IQ/OQ/PQ suites verify installation correctness, operational behavior under load, and sustained performance.

### Test Coverage Metrics

| Metric                      | Target |
| --------------------------- | ------ |
| Statement coverage          | >95%   |
| Branch coverage             | >95%   |
| Mutation score (unit tests) | >95%   |
| IQ/OQ/PQ pass rate          | 100%   |

### Estimated Test Count

213 tests across 23 test files, covering all specification sections (see `09-definition-of-done.md` for the complete test mapping).

---

## Defect Management

- Defects are tracked in the project issue tracker.
- Each defect resolution is linked to a specific Git commit.
- Regression tests are added for all resolved defects.

---

## Release Process

- Releases follow semantic versioning (semver).
- Each release corresponds to a tagged Git commit.
- Release artifacts are published to the npm registry with integrity checksums.
- GxP deployments MUST use exact version pinning (see `06/verification-and-change-control.md`).

---

## Supplier Audit Support

REQUIREMENT: GxP organizations conducting a supplier assessment of `@hex-di/clock` SHOULD review the following artifacts:

1. This supplier assessment document.
2. The complete specification suite (`spec/clock/`).
3. The requirements traceability matrix (`06/requirements-traceability-matrix.md`).
4. The test organization and Definition of Done (`09-definition-of-done.md`).
5. The Git commit history for the `packages/clock/` directory.
6. The CI pipeline configuration and recent execution results.
7. The IQ/OQ/PQ test execution reports from the target deployment environment.

REQUIREMENT: The HexDI project MUST maintain these artifacts in a state suitable for regulatory inspection. Documentation MUST be versioned alongside the source code and updated whenever the implementation changes.
