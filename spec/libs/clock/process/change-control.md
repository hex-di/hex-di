# Change Control

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-CLK-PRC-004 |
| Version | Derived from Git -- `git log -1 --format="%H %ai" -- process/change-control.md` |
| Author | Derived from Git -- `git log --format="%an" -1 -- process/change-control.md` |
| Approval Evidence | PR merge to `main` |
| Reviewer | PR approval record -- see Git merge commit |
| Change History | `git log --oneline --follow -- process/change-control.md` |
| Status | Effective |

## Change Categories

Changes to `@hex-di/clock` are classified into three categories based on their impact on GxP-relevant invariants and regulatory compliance. The category determines the required review depth, testing scope, and approval authority.

| Category | Impact | Examples | Required Testing | Approval |
|----------|--------|----------|-----------------|----------|
| **Critical** | Affects a GxP invariant (INV-CK-1 through INV-CK-14) or a CLK-GXP/CLK-QUA/CLK-AUD/CLK-SIG/CLK-CHG requirement | Changing freeze behavior, modifying startup self-test, altering sequence overflow logic, changing branded type structure | Full IQ/OQ/PQ re-execution on all deployment targets | QA Manager approval required |
| **Standard** | Affects non-GxP functional requirements (CLK-MON, CLK-SYS, CLK-TMR, CLK-CAC, CLK-INT, etc.) without touching an invariant | Adding a new timer scheduling mode, optimizing cached clock refresh, updating container integration events | Full unit + type + GxP integrity test suite; IQ re-execution | PR approval by code owner |
| **Administrative** | Documentation, comments, dev tooling, test utilities | Spec updates, README changes, test helper refactoring, benchmark additions | Existing CI passes (lint, typecheck, unit tests) | PR approval |

## Change Category Determination

To determine a change's category:

1. List every source file modified by the change
2. For each file, check the Source File Map in [overview.md](../overview.md) to identify affected capabilities
3. Cross-reference against the Invariant Traceability table in [traceability.md](../traceability.md) to determine if any invariant is affected
4. If any invariant is affected -> **Critical**
5. If functional requirements are affected but no invariant -> **Standard**
6. If only documentation or tooling -> **Administrative**

## Critical Change Checklist

When a change is classified as Critical:

- [ ] Identify affected invariant(s) by INV-CK-N identifier
- [ ] Review the FMEA entry for each affected invariant in [risk-assessment.md](../risk-assessment.md)
- [ ] Verify that existing GxP tests (DoD 7, DoD 9, DoD 10) still cover the changed behavior
- [ ] Add new GxP tests if the change introduces a new failure mode
- [ ] Update the FMEA in [11-fmea-risk-analysis.md](../06-gxp-compliance/11-fmea-risk-analysis.md) if risk scores change
- [ ] Execute full IQ/OQ/PQ protocol after deployment
- [ ] Document the change in the changeset with explicit mention of affected invariant(s)
- [ ] Obtain QA Manager approval before merge

## Standard Change Checklist

When a change is classified as Standard:

- [ ] Identify affected CLK-* requirements
- [ ] Verify unit tests cover both success and error paths
- [ ] Verify type tests cover any new or changed public types
- [ ] Run full GxP integrity test suite (DoD 7) to confirm no invariant regression
- [ ] Execute IQ protocol on deployment targets
- [ ] Document the change in the changeset

## GxP Deployment Change Control

For GxP-regulated deployments, additional change control requirements apply beyond the development process above. These are specified in [compliance/gxp.md](../06-gxp-compliance/README.md) and include:

- **Version pinning** (CLK-CHG-001): Exact version pinning required; no semver ranges
- **QA-approved upgrades** (CLK-CHG-002): Documented QA approval before any version upgrade
- **Full re-qualification** (CLK-CHG-003): IQ/OQ/PQ re-execution after any version change
- **Configuration management** (CLK-CHG-004): Validated version records per deployment target
- **Emergency change procedure** (CLK-CHG-005 through CLK-CHG-022): Expedited path for critical production incidents with retrospective qualification

See the [full GxP change control specification](../06-gxp-compliance/03-verification-and-change-control.md) for the complete requirements, emergency change flow, CAPA closeout criteria, and rollback verification procedures.

## Re-qualification Triggers

The following changes trigger full IQ/OQ/PQ re-execution on all deployment targets:

| Trigger | Category | Rationale |
|---------|----------|-----------|
| `@hex-di/clock` version upgrade (including patch) | Critical | Patch changes may alter timing behavior |
| Platform upgrade (Node.js, OS) | Critical | Platform APIs may behave differently |
| Hardware change on deployment target | Critical | Timing characteristics are hardware-dependent |
| NTP configuration change | Critical | Affects wall-clock accuracy and drift detection |
| Container graph changes affecting clock ports | Standard | May alter adapter resolution or lifecycle |
| Ecosystem monitoring adapter upgrade | Standard | May affect periodic integrity verification |

## Relationship to Other Process Documents

| Document | Relationship |
|----------|-------------|
| [definitions-of-done.md](definitions-of-done.md) | DoD checklists reference change categories for GxP compliance step |
| [test-strategy.md](test-strategy.md) | Test levels map to change category testing requirements |
| [requirement-id-scheme.md](requirement-id-scheme.md) | CLK-CHG-* requirements are the formal change control IDs |
| [compliance/gxp.md](../06-gxp-compliance/README.md) | Detailed GxP deployment change control with emergency procedures |
| [compliance/gxp.md](../06-gxp-compliance/README.md) | FMEA updates required for Critical changes affecting risk scores |
