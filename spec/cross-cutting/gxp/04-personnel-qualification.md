# 04 - Personnel Qualification

> **Document Control**
>
> | Property | Value |
> |----------|-------|
> | Document ID | GXP-CC-04 |
> | Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/cross-cutting/gxp/04-personnel-qualification.md` |
> | Status | Effective |
> | Classification | Cross-Cutting GxP Framework |

---

## Purpose

EU GMP Annex 11, Section 3 requires that personnel involved in computerized systems have appropriate qualifications and access levels. 21 CFR 11.10(d) requires limiting system access to authorized individuals. This section defines the generic personnel qualification framework applicable to all `@hex-di` packages deployed in GxP environments.

Per-package compliance documents define package-specific role responsibilities and competency criteria. This cross-cutting document provides the shared framework.

---

## Generic Role Definitions (EU GMP Annex 11, Section 3)

```
REQUIREMENT: GxP organizations deploying any @hex-di package MUST define and document
             roles in their computerized system validation plan. The following generic
             roles represent the minimum role set; organizations MUST adapt these to
             their specific deployment context and organizational structure.
```

| Role | Responsibilities | Required Qualifications |
|------|-----------------|------------------------|
| **Library Developer** | Implements and maintains library source code. Writes unit tests, type tests, and GxP test suites. | TypeScript proficiency. Understanding of library-specific domain semantics. Familiarity with relevant platform APIs. |
| **GxP Validation Engineer** | Executes IQ/OQ/PQ protocols on deployment targets. Documents qualification results. Reviews re-qualification triggers. | Understanding of IQ/OQ/PQ methodology. Familiarity with GAMP 5 risk classification. Competence in executing automated test suites on target platforms. |
| **Infrastructure Operator** | Configures infrastructure (NTP, TLS, network), deploys libraries to production. Executes deployment qualification (DQ) checklist. | Understanding of infrastructure configuration relevant to the library. Familiarity with runtime configuration. |
| **QA Reviewer** | Approves version upgrades, reviews change control documentation, signs off on re-qualification results. | GxP regulatory knowledge (21 CFR Part 11, EU GMP Annex 11). Authority to approve or reject version changes in regulated environments. |
| **QA Manager** | Authorizes emergency change control procedures. Approves CAPA deadline extensions. Serves as escalation authority. | Senior GxP regulatory authority with decision-making power over emergency changes. Minimum 3 years GxP quality management experience (required); 5 years recommended. |
| **Application Developer** | Consumes library ports and adapters in application code. Composes library features with application-specific context. | Understanding of the library's API surface. Familiarity with composition patterns for the specific library. |

### Segregation of Duties (EU GMP Annex 11, Section 3; 21 CFR 11.10(j))

```
REQUIREMENT: GxP organizations MUST enforce the following segregation of duties to
             maintain independent review:

             (a) The QA Reviewer for a given specification change, version upgrade, or
                 CAPA closeout MUST NOT be the same individual who authored the change.
             (b) The GxP Validation Engineer who executes IQ/OQ/PQ protocols SHOULD NOT
                 be the same individual who implemented the code changes being qualified,
                 unless an independent second reviewer verifies the qualification results.
             (c) Competency assessments MUST be performed by a qualified person other
                 than the trainee — self-assessment is not acceptable.
```

One individual MAY hold multiple roles (e.g., Library Developer and Application Developer) provided the segregation constraints above are satisfied for each GxP activity. The organization MUST document which role combinations are permitted in their quality management system.

---

## Training Requirements

```
REQUIREMENT: All personnel in the roles defined above MUST receive documented training
             before performing role-specific activities in GxP environments. Training
             records MUST be maintained and available for regulatory inspection.
```

### Training Delivery and Duration Guidance (Informative)

The following minimum training durations and delivery methods are RECOMMENDED as a reference framework. Organizations MAY adjust these based on their own competency assessment results, but MUST document the rationale for any reduction below the recommended minimums.

| Training Topic | Recommended Minimum Duration | Recommended Delivery Methods | Competency Assessment Format |
|----------------|------------------------------|------------------------------|------------------------------|
| Library API and architecture | 4 hours | Instructor-led session with hands-on exercises, OR self-study with guided walkthrough and practical lab | Written or oral technical assessment; code review of sample implementation |
| GxP regulatory requirements | 2 hours | Instructor-led session with regulatory reference materials | Written assessment (minimum 80% pass score on regulatory scenario questions) |
| IQ/OQ/PQ execution | 4 hours | Supervised hands-on execution on a non-production environment | Observed execution of full protocol with assessor sign-off |
| Infrastructure configuration | 2 hours | Instructor-led with live system demonstration | Supervised execution of DQ checklist on a non-production environment |
| Change control procedures | 2 hours | Document-based review with case study discussion | Review of a sample change control package with intentional gaps |
| Emergency change control | 2 hours | Tabletop exercise simulating emergency scenario | Assessed response to simulated emergency with documented decision record |

```
REQUIREMENT: Organizations MUST adapt the training guidance above (or develop equivalent
             training materials) and retain the finalized training materials under
             configuration control. Training materials MUST be reviewed and updated when
             the specification is revised or the library API changes. Training materials
             MUST be updated within 30 calendar days of a specification revision becoming
             effective.
```

---

## Re-Training Frequency (21 CFR 211.25, EU GMP Annex 11, Section 3)

```
REQUIREMENT: GxP organizations MUST define and enforce a re-training schedule. The
             following minimum re-training frequencies MUST be observed:
```

| Re-Training Trigger | Frequency | Applicable Roles | Content |
|---------------------|-----------|-------------------|---------|
| **Periodic refresher** | Annually (12 months from last training date) | All roles | Refresher on role-specific training topics. Includes review of any specification, API, or regulatory changes since last session. |
| **Major or minor version upgrade** | Within 30 days of upgrade deployment | All roles | Delta training covering API changes, new features, removed features, and changes to GxP-relevant behavior. |
| **Regulatory guidance update** | Within 90 days of publication | QA Reviewer, GxP Validation Engineer | Updated requirements from revised FDA guidance, EU GMP Annex 11 revisions, or new ICH guidelines. |
| **Platform change** | Within 30 days of deployment | Infrastructure Operator, GxP Validation Engineer | Platform-specific training when the deployment target changes (e.g., runtime version upgrade, OS migration). |
| **Incident-driven** | Within 14 days of incident closure | Affected roles | Targeted re-training when a quality deviation, audit finding, or emergency change reveals a training gap. |
| **Role assignment** | Before performing role activities | Newly assigned personnel | Full initial training for all training topics applicable to the assigned role. |

```
REQUIREMENT: Re-training MUST be documented with: the training date, the training
             topic(s), the trainer identity, the trainee identity, a competency
             assessment outcome (pass/fail), and the next re-training due date.

REQUIREMENT: Organizations MUST implement a training expiration tracking mechanism
             that prevents personnel with expired training from performing role-specific
             GxP activities.

REQUIREMENT: Re-training records MUST be retained for the same duration as the
             computerized system validation plan and made available for regulatory
             inspection.
```

---

## Competency Assessment (EU GMP Annex 11, Section 3)

```
REQUIREMENT: Each training session (initial and re-training) MUST conclude with a
             competency assessment. The assessment MUST evaluate the trainee's ability
             to perform the specific tasks listed in their role definition. The
             assessment outcome MUST be recorded as pass or fail, and personnel who
             fail MUST NOT perform role-specific GxP activities until they pass a
             reassessment.

REQUIREMENT: GxP organizations MUST define and document minimum competency criteria
             for each role. Per-package compliance documents provide package-specific
             criteria.

REQUIREMENT: Competency assessment records MUST document: the assessment date, the
             assessor identity, the trainee identity, the role assessed, each criterion
             evaluated with pass/fail, and the overall outcome. Failed criteria MUST
             include a remediation plan with a reassessment date.

REQUIREMENT: Competency assessments MUST be performed by a person who is qualified in
             the same role or a supervisory role. Self-assessment is NOT acceptable for
             GxP competency verification.
```

### Competency Assessment Template

| Criterion | Pass/Fail | Assessor Notes |
|-----------|-----------|----------------|
| Demonstrates understanding of port/adapter architecture | — | — |
| Can identify correct port function for a given use case | — | — |
| Can compose library output with attribution context | — | — |
| Can implement Result-based error handling paths | — | — |
| Can execute IQ/OQ/PQ protocols independently (Validation Engineer only) | — | — |
| Can verify infrastructure configuration (Infrastructure Operator only) | — | — |
| Can review change control documentation for completeness (QA Reviewer only) | — | — |

---

## Operational Access Control (21 CFR 11.10(d), EU GMP Annex 11, Section 12.1)

### Version Upgrades

```
REQUIREMENT: Upgrading any @hex-di package version in GxP deployments MUST require
             documented QA approval before deployment. The approval record MUST include:

             (a) Current validated version
             (b) Target version
             (c) Changelog review outcome (with specific attention to behavior changes)
             (d) Approver identity and signature
             (e) Date of approval
```

### Version Rollback

```
REQUIREMENT: If a version upgrade fails post-deployment qualification (IQ/OQ/PQ
             failure on target), the organization MUST:

             (a) Revert to the previously validated version using the exact version
                 pin from the prior lockfile.
             (b) Re-execute the full IQ/OQ/PQ protocol on the reverted version to
                 confirm it remains in a validated state.
             (c) Document the rollback in the deviation log, including: the failed
                 target version, the failure mode, the root cause analysis, and the
                 corrective action.
             (d) Ensure all records generated during the failed upgrade period are
                 preserved and annotated with the rollback event context.
```
