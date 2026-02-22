# 6.9 Supplier Assessment — GxP Compliance

> **Part of:** [GxP Compliance (§6)](./README.md) | **Previous:** [§6.8 Requirements Traceability Matrix](./08-requirements-traceability-matrix.md) | **Next:** [§6.10 Personnel and Access Control](./10-personnel-and-access-control.md)

> For the generic supplier assessment framework (SQA template, quality metric commitments, audit support), see [../../cross-cutting/gxp/10-supplier-assessment.md](../../cross-cutting/gxp/10-supplier-assessment.md). This section contains clock-specific supplier information.

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
| **Quality Representative** | HexDI Quality Assurance Lead (see Named Representative Verification Process below for current named individual)                                       |
| **Contact Method**         | Via repository issue tracker (label: `gxp-quality`) or project security contact for urgent quality matters                                            |
| **Responsibilities**       | Specification approval, change control authorization, re-qualification sign-off, deviation review, supplier audit support, FMEA review                |
| **Delegation Authority**   | May delegate to a named QA designee for time-bounded periods; delegation MUST be documented in the project quality log with effective dates and scope |

#### Qualification Prerequisites

The Quality Management Representative SHOULD meet the following minimum qualification criteria. GxP organizations conducting a supplier assessment MAY verify these prerequisites as part of their assessment:

| Criterion | Minimum Threshold |
| --- | --- |
| **GxP software experience** | 2+ years in a GxP-regulated software development or quality assurance role |
| **Regulatory knowledge** | Demonstrated familiarity with 21 CFR Part 11, EU GMP Annex 11, and GAMP 5 (evidenced by training records, certifications, or prior audit participation) |
| **Technical competency** | Ability to review and assess TypeScript library specifications, timing semantics, and platform API behavior |
| **Recommended certifications** | ASQ Certified Quality Auditor (CQA), ISPE GAMP, or equivalent (not mandatory but strengthens qualification evidence) |

REQUIREMENT: GxP organizations conducting a supplier assessment MUST verify the identity and qualification of the Quality Management Representative as part of their assessment. The representative MUST be able to demonstrate:

1. Authority to approve specification changes and version releases for `@hex-di/clock`.
2. Knowledge of the GxP regulatory requirements addressed by the specification (21 CFR Part 11, EU GMP Annex 11, GAMP 5).
3. Access to the full revision history, test results, and validation evidence for the current validated version.
4. A documented delegation chain for periods when the primary representative is unavailable.

REQUIREMENT: The Quality Management Representative MUST be reachable within **5 business days** for supplier audit inquiries and within **24 hours** for urgent quality matters (e.g., data integrity defects, security vulnerabilities affecting clock accuracy). Response time commitments MUST be documented in the supplier quality agreement between HexDI and the consuming GxP organization.

REQUIREMENT: When the Quality Management Representative changes (new individual assumes the role), the change MUST be documented in the project quality log and communicated to all GxP organizations that have completed a supplier assessment. The notification MUST include the effective date, the outgoing representative's name, and the incoming representative's qualifications.

#### Named Representative Verification Process

The Quality Management Representative is identified by role ("HexDI Quality Assurance Lead") rather than by named individual because the HexDI project is open-source and representative assignments may change independently of specification revisions. GxP organizations conducting a supplier assessment MUST verify the current named individual holding this role through one of the following methods:

1. **Issue tracker inquiry:** Submit a request via the repository issue tracker using the `gxp-quality` label. The project MUST respond within 5 business days with the named individual's identity and qualification summary.
2. **Security contact:** For urgent quality matters or Supplier Quality Agreement execution, contact the project's security contact email. The project MUST respond within 24 hours with the named individual's identity.
3. **SQA registry:** Upon execution of a Supplier Quality Agreement, the consuming organization receives access to the confidential quality representative registry, which identifies the current named individual, their qualification evidence, and delegation chain.

REQUIREMENT: The project MUST maintain a confidential quality representative registry that identifies the current named individual holding the Quality Management Representative role, their qualification evidence (per the Qualification Prerequisites table above), and the effective date of their appointment. This registry MUST be made available to GxP organizations upon SQA execution or upon justified request through the issue tracker.

**Registry operational readiness:** The quality representative registry and the issue tracker `gxp-quality` label channel MUST be operational before the first stable release of `@hex-di/clock` is tagged. The establishment date of the registry MUST be recorded in the first entry. GxP organizations conducting supplier assessment before registry establishment MAY proceed with assessment using the issue tracker or security contact channels, with the registry verification deferred as a pre-deployment prerequisite documented in their CSVP.

### Quality Metric Commitments

The HexDI project maintains the following quality metric targets for `@hex-di/clock`. These are project-level targets, not contractual SLAs — organizations requiring contractual commitments MUST establish a bilateral SQA (see below) or a commercial support arrangement.

| Metric | Target | Measurement |
| --- | --- | --- |
| **Critical defect response** | Acknowledgment within 5 business days | Time from issue report (label: `gxp-quality` + `severity:critical`) to first project response |
| **Critical security vulnerability** | Patch release within 30 calendar days of confirmed vulnerability | Time from CVE confirmation to npm release |
| **Specification-breaking defect** | Fix or documented workaround within 15 business days | Time from confirmed specification violation to resolution |
| **Release cadence** | At minimum, one release per quarter when changes are pending | npm release frequency |
| **Specification revision lag** | Specification updated before or concurrent with code release | No code release without corresponding spec revision when behavior changes |

These targets are aspirational for the open-source project. GxP organizations MUST NOT rely on these targets as guaranteed service levels. Binding quality commitments are established through the bilateral Supplier Quality Agreement (see SQA Prerequisite section below), not through these unilateral aspirational targets. Organizations requiring guaranteed response times MUST use the SQA mechanism below or the commercial support arrangement alternative.

### Supplier Quality Agreement Prerequisite

REQUIREMENT: GxP organizations MUST establish a formal, bilateral Supplier Quality Agreement (SQA) with the HexDI project before deploying `@hex-di/clock` in a GxP production environment. The SQA MUST be executed before commencing IQ/OQ/PQ qualification on any deployment target.

The SQA MUST address, at a minimum:

1. **Response time commitments**: Agreed-upon response times for supplier audit inquiries (5 business days) and urgent quality matters (24 hours), with escalation paths for unresponsive periods.
2. **Change notification**: The supplier's obligation to notify the consuming organization of specification changes, version releases, and security advisories affecting `@hex-di/clock`.
3. **Audit rights**: The consuming organization's right to conduct supplier audits (remote or on-site) against the artifacts listed in the Supplier Audit Support section below.
4. **Defect resolution**: Agreed-upon severity classification and target resolution timelines for defects affecting GxP-critical functionality (clock accuracy, sequence integrity, data integrity).
5. **Quality representative availability**: Named quality representative (or role) with documented delegation chain for periods of unavailability.
6. **Termination and transition**: Procedures for transitioning to a self-supported model if the SQA is terminated, including access to source code, specification history, and validation evidence.

REQUIREMENT: The executed SQA MUST be retained as part of the consuming organization's computerized system validation package and made available for regulatory inspection. The SQA MUST be reviewed annually (at minimum) and updated when the Quality Management Representative changes or when the consuming organization's regulatory requirements change.

REQUIREMENT: In the absence of a formal SQA (e.g., during evaluation or proof-of-concept phases), GxP organizations MUST NOT classify the deployment as GxP-validated. Pre-SQA deployments MAY be used for development, testing, and qualification dry-runs, but MUST NOT process GxP-regulated data.

#### Open-Source Self-Support Alternative

The SQA requirements above assume the availability of a responsive supplier entity. For open-source projects (including HexDI) where a formal bilateral SQA cannot be established with a commercial entity, GxP organizations MUST implement one of the following alternative supplier management approaches:

1. **Internal self-support model:** The GxP organization designates an internal team as the de facto "supplier" for `@hex-di/clock`, assuming responsibility for: (a) monitoring the upstream repository for security advisories and specification changes, (b) maintaining a fork of the validated version under the organization's configuration management, (c) performing code review and impact assessment of upstream changes before adoption, (d) providing the response time commitments defined in the SQA prerequisite from their internal team rather than from the open-source project. The internal self-support team MUST meet the same qualification criteria as the external Quality Management Representative defined above.

2. **Commercial support arrangement:** The GxP organization contracts with a third party (consultancy, system integrator, or commercial entity providing enterprise support for HexDI) that can execute the bilateral SQA on behalf of the open-source project.

REQUIREMENT: When the internal self-support model (option 1) is used, the organization MUST document the self-support arrangement in their CSVP, including: the designated internal team, their qualification evidence, the response time commitments they will maintain, and the upstream monitoring procedure. The self-support arrangement MUST be reviewed annually as part of the SQA review cycle.

**Team-based qualification:** The self-support qualification criteria (same as the external Quality Management Representative prerequisites) MAY be met by a **combination of qualified individuals** whose collective expertise covers all prerequisite areas, rather than requiring a single individual to satisfy every criterion. For example, one team member may provide GxP regulatory knowledge while another provides TypeScript technical competency. When team-based qualification is used, the organization MUST document: (a) the named individuals constituting the self-support team, (b) which qualification criteria each individual satisfies, (c) a coverage matrix demonstrating that all criteria are collectively met, and (d) a designated team lead who serves as the single point of contact for supplier audit inquiries and urgent quality matters. The team lead MUST satisfy the response time commitments (5 business days / 24 hours) even if they escalate technical questions to other team members.

#### Supplier Quality Agreement Template

The following template defines the minimum content sections for a bilateral SQA between a GxP organization and the HexDI project (or its commercial support representative). Organizations MUST address all mandatory sections; additional sections MAY be added.

```json
{
  "schemaVersion": 1,
  "sqaIdentifier": "SQA-CLK-YYYY-NNN",
  "effectiveDate": "YYYY-MM-DD",
  "parties": {
    "consumer": {
      "organizationName": "",
      "contactName": "",
      "contactTitle": "",
      "contactEmail": ""
    },
    "supplier": {
      "organizationName": "HexDI Project",
      "qualityRepresentative": "HexDI Quality Assurance Lead",
      "contactMethod": "Repository issue tracker (label: gxp-quality)"
    }
  },
  "sections": {
    "scope": {
      "mandatory": true,
      "content": "Define the packages covered (at minimum @hex-di/clock), the specification revision validated against, and the deployment scope (production, staging, DR environments)."
    },
    "responsibilities": {
      "mandatory": true,
      "content": "Define supplier responsibilities (specification maintenance, defect resolution, security advisory publication, audit support) and consumer responsibilities (version pinning, IQ/OQ/PQ execution, NTP configuration, retention policy, compensating controls)."
    },
    "responseTimeCommitments": {
      "mandatory": true,
      "content": "Supplier audit inquiries: 5 business days. Urgent quality matters (data integrity defects, security vulnerabilities): 24 hours. Change notifications: within 5 business days of release."
    },
    "changeNotification": {
      "mandatory": true,
      "content": "Supplier MUST notify consumer of: specification revisions, package version releases, security advisories, quality representative changes, and any changes affecting GxP-critical functionality."
    },
    "auditRights": {
      "mandatory": true,
      "content": "Consumer has the right to conduct supplier audits (remote or on-site) against the artifacts listed in the Supplier Audit Support section. Audit frequency: at minimum annually or upon cause. Supplier MUST provide requested artifacts within 10 business days."
    },
    "defectResolution": {
      "mandatory": true,
      "content": "Severity classification: Critical (data integrity, patient safety) — target resolution 5 business days; Major (functional regression) — target resolution 15 business days; Minor (documentation, non-critical) — target resolution 30 business days."
    },
    "qualityRepresentativeAvailability": {
      "mandatory": true,
      "content": "Named quality representative (or role) with documented delegation chain. Delegation periods MUST be communicated to consumer within 2 business days."
    },
    "qualityMetrics": {
      "mandatory": true,
      "content": "Supplier MUST report annually: open defect count by severity, mean time to resolution by severity, specification revision count, security advisory count, and IQ/OQ/PQ pass rate across known consumer deployments (anonymized)."
    },
    "incidentNotification": {
      "mandatory": true,
      "content": "Supplier MUST notify consumer within 24 hours of discovering: data integrity defects, security vulnerabilities (CVSS >= 7.0), specification errors affecting GxP compliance, or any issue that may require emergency change control."
    },
    "terminationAndTransition": {
      "mandatory": true,
      "content": "Upon SQA termination: consumer retains access to source code (open-source license), specification history (Git repository), and validation evidence (published test results). Supplier MUST provide a 90-day transition support period."
    },
    "reviewSchedule": {
      "mandatory": true,
      "content": "SQA MUST be reviewed annually (at minimum) and updated when: quality representative changes, consumer regulatory requirements change, or specification undergoes major revision."
    },
    "confidentiality": {
      "mandatory": false,
      "content": "Define confidentiality obligations for quality metrics, audit findings, and quality representative registry information."
    }
  },
  "signatures": {
    "consumerSignatory": {
      "printedName": "",
      "title": "",
      "signature": "",
      "date": ""
    },
    "supplierSignatory": {
      "printedName": "",
      "title": "",
      "signature": "",
      "date": ""
    }
  }
}
```

REQUIREMENT (CLK-SUP-001): GxP organizations MUST use this template (or an equivalent that addresses all mandatory sections) when establishing a Supplier Quality Agreement for `@hex-di/clock`. All mandatory sections MUST be completed with organization-specific content before the SQA is considered executed.

REQUIREMENT (CLK-SUP-002): The executed SQA MUST be retained for the duration of the GxP deployment plus the applicable data retention period and MUST be available for regulatory inspection within 24 hours of request.

---

## Supplier Assessment Scope

This supplier assessment covers the `@hex-di/clock` package and its relationship to both internal dependencies (other `@hex-di` packages) and external platform APIs. The scope distinction affects which components require independent supplier assessment versus which are validated as part of the integrated system.

### Internal Dependencies (Not External Suppliers)

The following `@hex-di` packages are direct dependencies of `@hex-di/clock`. Per GAMP 5, these are **not treated as external suppliers** because they are developed, maintained, and released within the same monorepo under the same quality management process. They are validated as part of the integrated system during IQ/OQ/PQ execution.

| Package | Relationship | Validation Approach |
|---|---|---|
| `@hex-di/core` | Port definition patterns (`createPort`) | Validated through `@hex-di/clock` IQ (port registration verification) and type-level tests |
| `@hex-di/result` | Return types for fallible operations (`Result`, `ok`, `err`) | Validated through `@hex-di/clock` unit tests (all `Result`-returning functions exercised) |

These packages share the same coding standards, CI pipeline, code review process, and version control history as `@hex-di/clock`. Changes to these dependencies are subject to the same change control process described in `verification-and-change-control.md`. Any version change to these packages triggers full IQ/OQ/PQ re-qualification of `@hex-di/clock` (per the re-qualification triggers in section 6.3).

### External Platform APIs (Assessed per Compatibility Matrix)

The following platform APIs are external to the `@hex-di` ecosystem. They are assessed through the platform compatibility matrix (section 4.2) and verified during IQ/OQ/PQ execution on each deployment target.

| Platform API | Assessment Basis | Verification |
|---|---|---|
| `performance.now()` | ECMAScript / Web Performance specification; platform runtime release notes | IQ-7, OQ-1 (monotonicity under load), PQ-1 (sustained throughput) |
| `performance.timeOrigin` | ECMAScript / Web Performance specification | IQ-8, IQ-19 (high-res/wall-clock consistency) |
| `Date.now()` | ECMAScript specification | IQ-14 (startup self-test), OQ-2 (accuracy under load) |
| `crypto.createHash('sha256')` | Node.js Crypto API (stable) | IQ-20 (per-record cryptographic integrity) |

Platform APIs are not "suppliers" in the EU GMP Annex 11 Section 3 sense (they are not organizations providing software services). They are infrastructure components verified through deployment qualification. Platform version changes (Node.js, OS) are re-qualification triggers per section 6.3.

### External Platform API Risk Assessment (ICH Q9)

The following risk assessment evaluates the potential for behavioral changes in external platform APIs that could affect `@hex-di/clock` validation continuity.

| Platform API | Risk of Behavioral Change | Detection Mechanism | Mitigation |
|---|---|---|---|
| `performance.now()` | **Low.** Specified by W3C High Resolution Time. Behavior stable across major runtime versions. Breaking changes would affect the entire web/Node.js ecosystem. | ST-1 (negative monotonic), ST-3 (monotonic regression), OQ-1 (monotonicity under load) detect behavioral regressions at deployment time. | Pin runtime version (e.g., Node.js LTS). Re-qualify after any runtime version change per section 6.3 re-qualification triggers. |
| `performance.timeOrigin` | **Low-Medium.** Specified by W3C. However, the relationship between `timeOrigin` and NTP synchronization is implementation-dependent — some runtimes may adjust `timeOrigin` after NTP step corrections. | ST-5 (high-res/wall-clock divergence) detects inconsistency at startup. Ecosystem periodic consistency monitoring detects post-startup drift. | DQ-2 (NTP pre-sync before process start) prevents the most common drift trigger. Pin runtime version. |
| `Date.now()` | **Low.** Specified by ECMAScript. Behavior unchanged since ES5. | ST-2 (implausible wall-clock), IQ-14 (startup self-test) detect gross anomalies. | Pin runtime version. Verify NTP synchronization via DQ-2. |
| `crypto.createHash('sha256')` | **Very Low.** SHA-256 is a cryptographic standard (FIPS 180-4). Implementation bugs would be security vulnerabilities affecting all Node.js consumers. | IQ-22 (per-record cryptographic integrity — compute and verify round-trip). | Pin runtime version. Monitor Node.js security advisories for crypto module CVEs. |

REQUIREMENT: GxP organizations MUST include platform runtime version in their configuration management documentation (per CLK-CHG-004) and treat runtime version changes as re-qualification triggers. Platform API behavioral changes are detected through the IQ/OQ/PQ protocols executed after each re-qualification trigger.

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
- Clear separation of mechanism (`@hex-di/clock`) from policy (ecosystem GxP monitoring infrastructure).
- Unidirectional dependency: monitoring libraries depend on clock, never the reverse.

---

## Quality Controls

### Automated Testing

| Control                | Description                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Unit Tests**         | Vitest-based unit tests for all production code paths. Target: >95% mutation score per module.                                             |
| **Type-Level Tests**   | `*.test-d.ts` files verifying compile-time type safety using `expectTypeOf` assertions.                                                    |
| **GxP-Specific Tests** | Dedicated `gxp-*.test.ts` suites covering immutability, monotonicity, sequence uniqueness, structural irresettability, and anti-tampering. |
| **IQ Protocol Tests**  | `gxp-iq-clock.test.ts`: 30 installation qualification steps verifiable as automated tests.                                                 |
| **OQ Protocol Tests**  | `gxp-oq-clock.test.ts`: 8 operational qualification steps exercising production adapter under load (5 positive, 3 negative).               |
| **PQ Protocol Tests**  | `gxp-pq-clock.test.ts`: 5 performance qualification steps for sustained real-world conditions.                                             |
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

457 tests across 46 test files, covering all specification sections (see `09-definition-of-done.md` for the complete test mapping).

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
- GxP deployments MUST use exact version pinning (see `./03-verification-and-change-control.md`).

---

## Supplier Audit Support

REQUIREMENT: GxP organizations conducting a supplier assessment of `@hex-di/clock` SHOULD review the following artifacts:

1. This supplier assessment document.
2. The complete specification suite (`spec/clock/`).
3. The requirements traceability matrix (`./08-requirements-traceability-matrix.md`).
4. The test organization and Definition of Done (`09-definition-of-done.md`).
5. The Git commit history for the `packages/clock/` directory.
6. The CI pipeline configuration and recent execution results.
7. The IQ/OQ/PQ test execution reports from the target deployment environment.

REQUIREMENT: The HexDI project MUST maintain these artifacts in a state suitable for regulatory inspection. Documentation MUST be versioned alongside the source code and updated whenever the implementation changes.

---


