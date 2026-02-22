# 10 - Supplier Assessment

> **Document Control**
>
> | Property | Value |
> |----------|-------|
> | Document ID | GXP-CC-10 |
> | Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/cross-cutting/gxp/10-supplier-assessment.md` |
> | Status | Effective |
> | Classification | Cross-Cutting GxP Framework |

---

## Purpose

EU GMP Annex 11, Section 5 requires that regulated entities assess the quality and suitability of software suppliers. This section provides the generic supplier assessment framework for `@hex-di` packages, enabling GxP organizations to evaluate any package in the ecosystem as part of their computerized system validation plan.

Per-package compliance documents may extend this with package-specific supplier information and quality controls.

---

## Supplier Information

| Field | Value |
|-------|-------|
| **Supplier** | HexDI Project (Open Source) |
| **Distribution** | npm registry (`@hex-di/*`) |
| **License** | See repository LICENSE |
| **Repository** | HexDI monorepo (pnpm workspaces + Turborepo) |

### Quality Management Representative

| Field | Value |
|-------|-------|
| **Quality Representative** | HexDI Quality Assurance Lead (see Named Representative Verification Process below) |
| **Contact Method** | Via repository issue tracker (label: `gxp-quality`) or project security contact for urgent quality matters |
| **Responsibilities** | Specification approval, change control authorization, re-qualification sign-off, deviation review, supplier audit support, FMEA review |
| **Delegation Authority** | May delegate to a named QA designee for time-bounded periods; delegation MUST be documented in the project quality log with effective dates and scope |

#### Qualification Prerequisites

The Quality Management Representative SHOULD meet the following minimum qualification criteria:

| Criterion | Minimum Threshold |
|-----------|-------------------|
| **GxP software experience** | 2+ years in a GxP-regulated software development or quality assurance role |
| **Regulatory knowledge** | Demonstrated familiarity with 21 CFR Part 11, EU GMP Annex 11, and GAMP 5 |
| **Technical competency** | Ability to review and assess TypeScript library specifications and platform API behavior |
| **Recommended certifications** | ASQ Certified Quality Auditor (CQA), ISPE GAMP, or equivalent (not mandatory) |

```
REQUIREMENT: GxP organizations conducting a supplier assessment MUST verify the identity
             and qualification of the Quality Management Representative. The representative
             MUST be able to demonstrate:

             (a) Authority to approve specification changes and version releases.
             (b) Knowledge of the GxP regulatory requirements addressed by the spec.
             (c) Access to the full revision history, test results, and validation evidence.
             (d) A documented delegation chain for periods of unavailability.

REQUIREMENT: The Quality Management Representative MUST be reachable within 5 business
             days for supplier audit inquiries and within 24 hours for urgent quality
             matters. Response time commitments MUST be documented in the SQA.

REQUIREMENT: When the Quality Management Representative changes, the change MUST be
             documented and communicated to all GxP organizations with active SQAs.
```

#### Named Representative Verification Process

The Quality Management Representative is identified by role rather than by named individual because the HexDI project is open-source and representative assignments may change independently of specification revisions. GxP organizations MUST verify the current named individual through:

1. **Issue tracker inquiry:** Submit a request via `gxp-quality` label. Response within 5 business days.
2. **Security contact:** For urgent matters. Response within 24 hours.
3. **SQA registry:** Upon SQA execution, access to confidential quality representative registry.

---

## Quality Metric Commitments

The HexDI project maintains the following quality metric targets. These are project-level targets, not contractual SLAs.

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Critical defect response** | Acknowledgment within 5 business days | Time from issue report to first response |
| **Critical security vulnerability** | Patch release within 30 calendar days | Time from CVE confirmation to npm release |
| **Specification-breaking defect** | Fix or workaround within 15 business days | Time from confirmed violation to resolution |
| **Release cadence** | At minimum, one release per quarter when changes pending | npm release frequency |
| **Specification revision lag** | Specification updated before or concurrent with code release | No code release without spec revision when behavior changes |

```
REQUIREMENT: GxP organizations MUST NOT rely on these targets as guaranteed service
             levels. Binding quality commitments are established through the bilateral
             Supplier Quality Agreement.
```

---

## Supplier Quality Agreement (SQA)

```
REQUIREMENT: GxP organizations MUST establish a formal, bilateral SQA with the HexDI
             project before deploying any @hex-di package in a GxP production environment.
             The SQA MUST be executed before commencing IQ/OQ/PQ qualification.
```

The SQA MUST address, at a minimum:

1. **Response time commitments**: Agreed-upon response times for audit inquiries and urgent matters
2. **Change notification**: Supplier obligation to notify of specification changes, releases, and security advisories
3. **Audit rights**: Consumer's right to conduct supplier audits
4. **Defect resolution**: Severity classification and target resolution timelines
5. **Quality representative availability**: Named representative with delegation chain
6. **Quality metrics**: Annual reporting of defect counts, resolution times, and release cadence
7. **Incident notification**: 24-hour notification for data integrity defects and critical vulnerabilities
8. **Termination and transition**: Procedures for transitioning to self-supported model
9. **Review schedule**: Annual SQA review and update cycle

```
REQUIREMENT: The executed SQA MUST be retained as part of the CSVP and available for
             regulatory inspection. The SQA MUST be reviewed annually.

REQUIREMENT: In the absence of a formal SQA, GxP organizations MUST NOT classify the
             deployment as GxP-validated. Pre-SQA deployments MAY be used for development
             and testing but MUST NOT process GxP-regulated data.
```

### Open-Source Self-Support Alternative

For open-source projects where a formal bilateral SQA cannot be established with a commercial entity:

1. **Internal self-support model:** The organization designates an internal team as de facto "supplier," assuming responsibility for monitoring, maintaining a fork, code review, and response time commitments.
2. **Commercial support arrangement:** The organization contracts with a third party that can execute the bilateral SQA.

```
REQUIREMENT: When the internal self-support model is used, the organization MUST
             document the arrangement in their CSVP, including: the designated team,
             their qualification evidence, response time commitments, and upstream
             monitoring procedure.
```

---

## Development Process

### Source Control

- All source code is maintained in a Git repository with full commit history
- All changes are traceable through Git commits with descriptive messages
- The `main` branch is the single source of truth for released versions

### Code Review

- All changes undergo code review before merging
- Reviews verify adherence to the project's type safety rules

### Architecture

- Hexagonal architecture (Ports and Adapters pattern)
- All external dependencies accessed through injectable ports
- Clear separation of mechanism from policy

---

## Quality Controls

### Automated Testing

| Control | Description |
|---------|------------|
| **Unit Tests** | Vitest-based unit tests for all production code paths |
| **Type-Level Tests** | `*.test-d.ts` files verifying compile-time type safety |
| **GxP-Specific Tests** | Dedicated `gxp-*.test.ts` suites covering immutability, correctness, and anti-tampering |
| **Mutation Testing** | Stryker-based mutation testing targeting >95% mutation kill rate on critical paths |

### Static Analysis

| Control | Description |
|---------|------------|
| **TypeScript Strict Mode** | `strict: true` in all `tsconfig.json` files |
| **ESLint** | Per-package `eslint.config.js` with shared root configuration |
| **No Type Casting** | Enforced by project rules: no `as X`, no non-null assertions |

### Continuous Integration

| Control | Description |
|---------|------------|
| **CI Pipeline** | Automated build, lint, typecheck, and test on every commit |
| **Lockfile Integrity** | Lock file committed and verified in CI |
| **Dependency Audit** | `pnpm audit` integrated into CI pipeline |

---

## Supplier Audit Support

```
REQUIREMENT: GxP organizations conducting a supplier assessment SHOULD review:

             (a) This supplier assessment document
             (b) The complete specification suite for the package
             (c) The requirements traceability matrix
             (d) The test organization and Definition of Done
             (e) The Git commit history for the package directory
             (f) The CI pipeline configuration and recent execution results
             (g) The IQ/OQ/PQ test execution reports from the target environment
```
