# 6.10 Personnel and Access Control — GxP Compliance

> **Part of:** [GxP Compliance (§6)](./README.md) | **Previous:** [§6.9 Supplier Assessment](./09-supplier-assessment.md) | **Next:** [§6.11 FMEA Risk Analysis](./11-fmea-risk-analysis.md)

> For the generic personnel qualification framework (roles, training requirements, competency assessment), see [../../cross-cutting/gxp/04-personnel-qualification.md](../../cross-cutting/gxp/04-personnel-qualification.md). This section contains clock-specific personnel requirements.

## Purpose

EU GMP Annex 11, Section 3 requires that personnel involved in computerized systems have appropriate qualifications and access levels. 21 CFR 11.10(d) requires limiting system access to authorized individuals. This section defines the personnel qualification requirements and operational access control requirements for `@hex-di/clock` in GxP deployments.

---

## Personnel Qualification (EU GMP Annex 11, Section 3)

### Role Definitions

REQUIREMENT (CLK-PAC-001): GxP organizations deploying `@hex-di/clock` MUST define and document the following roles in their computerized system validation plan:

| Role                        | Responsibilities                                                                                                                                                          | Required Qualifications                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Clock Library Developer** | Implements and maintains `@hex-di/clock` source code. Writes unit tests, type tests, and GxP test suites.                                                                 | TypeScript proficiency. Understanding of monotonic vs. wall-clock time semantics. Familiarity with platform timing APIs (`performance.now()`, `Date.now()`). |
| **GxP Validation Engineer** | Executes IQ/OQ/PQ protocols on deployment targets. Documents qualification results. Reviews re-qualification triggers.                                                    | Understanding of IQ/OQ/PQ methodology. Familiarity with GAMP 5 risk classification. Competence in executing automated test suites on target platforms.       |
| **Infrastructure Operator** | Configures NTP daemons, manages platform API freeze at application entry points, deploys `@hex-di/clock` to production. Executes deployment qualification (DQ) checklist. | Understanding of NTP synchronization, leap smear configuration, system clock management. Familiarity with Node.js/Deno/Bun runtime configuration.            |
| **QA Reviewer**             | Approves version upgrades, reviews change control documentation, signs off on re-qualification results.                                                                   | GxP regulatory knowledge (21 CFR Part 11, EU GMP Annex 11). Authority to approve or reject version changes in regulated environments.                        |
| **QA Manager** (CLK-PAC-017) | Authorizes emergency change control procedures (CLK-CHG-005/006). Approves CAPA deadline extensions (CLK-CHG-018). Serves as L4 escalation authority (see quick-reference.md). Approves temporary risk acceptance for emergency deployments (CLK-CHG-008). | Senior GxP regulatory authority with decision-making power over emergency changes. Authority to accept temporary residual risk during emergency deployments. Demonstrated competency in clock infrastructure risk assessment. Minimum 3 years GxP quality management experience (required); 5 years recommended. Organizations MAY adjust the experience threshold based on their own risk assessment and regulatory environment, provided the adjustment is documented in the quality management system with rationale and approved by senior management. |
| **Application Developer**   | Consumes `ClockPort`, `SequenceGeneratorPort`, and `TemporalContextFactory` in application code. Composes temporal context with attribution context for audit entries.    | Understanding of the `@hex-di/clock` API surface. Familiarity with `TemporalContext` composition patterns (see section 6.5, Attribution Context).            |

### Segregation of Duties (EU GMP Annex 11, Section 3; 21 CFR 11.10(j))

REQUIREMENT (CLK-PAC-018): GxP organizations MUST enforce the following segregation of duties to maintain independent review:

1. The **QA Reviewer** for a given specification change, version upgrade, or CAPA closeout MUST NOT be the same individual who authored the change.
2. The **GxP Validation Engineer** who executes IQ/OQ/PQ protocols SHOULD NOT be the same individual who implemented the code changes being qualified, unless an independent second reviewer verifies the qualification results.
3. Competency assessments (per CLK-PAC-010) MUST be performed by a qualified person other than the trainee — self-assessment is not acceptable.

One individual MAY hold multiple roles (e.g., Clock Library Developer and Application Developer) provided the segregation constraints above are satisfied for each GxP activity. The organization MUST document which role combinations are permitted in their quality management system.

### Training Requirements

REQUIREMENT (CLK-PAC-002): All personnel in the roles defined above MUST receive documented training before performing role-specific activities in GxP environments. Training records MUST be maintained and available for regulatory inspection.

#### Training Delivery and Duration Guidance (Informative)

The following minimum training durations and delivery methods are RECOMMENDED as a reference framework. Organizations MAY adjust these based on their own competency assessment results, but MUST document the rationale for any reduction below the recommended minimums.

| Training Topic | Recommended Minimum Duration | Recommended Delivery Methods | Competency Assessment Format |
| --- | --- | --- | --- |
| `@hex-di/clock` API and architecture | 4 hours | Instructor-led session with hands-on exercises, OR self-study with guided walkthrough and practical lab | Written or oral technical assessment; code review of sample implementation |
| GxP timing requirements | 2 hours | Instructor-led session with regulatory reference materials | Written assessment (minimum 80% pass score on regulatory scenario questions) |
| IQ/OQ/PQ execution | 4 hours | Supervised hands-on execution on a non-production environment | Observed execution of full IQ/OQ/PQ protocol with assessor sign-off |
| NTP configuration | 2 hours | Instructor-led with live system demonstration | Supervised execution of DQ-1 and DQ-2 on a non-production environment |
| Change control procedures | 2 hours | Document-based review with case study discussion | Review of a sample change control package with intentional gaps |
| Emergency change control | 2 hours | Tabletop exercise simulating emergency scenario | Assessed response to simulated emergency with documented decision record |

| Training Topic                       | Applicable Roles                                              | Content                                                                                                                                                             |
| ------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@hex-di/clock` API and architecture | All roles                                                     | Package structure, port interfaces, adapter selection, TemporalContext usage, export map.                                                                           |
| GxP timing requirements              | GxP Validation Engineer, QA Reviewer                          | ALCOA+ temporal principles, 21 CFR 11.10(e) audit trail requirements, EU GMP Annex 11 Section 9 data storage.                                                       |
| IQ/OQ/PQ execution                   | GxP Validation Engineer                                       | IQ protocol steps (IQ-1 through IQ-30), OQ protocol steps (OQ-1 through OQ-8), PQ protocol steps (PQ-1 through PQ-5), deployment qualification (DQ-1 through DQ-5). |
| NTP configuration                    | Infrastructure Operator                                       | NTP daemon setup, leap smear configuration, drift threshold tuning, pre-application synchronization verification.                                                   |
| Change control procedures            | QA Reviewer, GxP Validation Engineer                          | Version pinning, re-qualification triggers, QA approval workflow, deviation log maintenance.                                                                        |
| Emergency change control             | QA Reviewer, GxP Validation Engineer, Infrastructure Operator | Emergency criteria evaluation, expedited approval authority, temporary risk acceptance, retrospective qualification, post-emergency review, CAPA process.           |

### Training Materials Outline (Informative)

The following training module outlines provide a structured curriculum for each training topic. Organizations SHOULD adapt these outlines into training decks, e-learning modules, or instructor guides appropriate to their training delivery methods.

**Module 1: `@hex-di/clock` API and Architecture (4 hours)**

| Section | Duration | Content | Hands-on Exercise |
|---|---|---|---|
| 1.1 Package overview | 30 min | Port/adapter architecture, export map, `@hex-di/clock` vs `@hex-di/clock/testing` | Explore the API reference (§ 8) |
| 1.2 Clock semantics | 45 min | Monotonic vs. wall-clock vs. high-resolution time; branded timestamp types; when to use each | Create a `TemporalContext` using `VirtualClockAdapter` |
| 1.3 Sequence generation | 30 min | `SequenceGeneratorPort`, overflow handling, `createOverflowContext()` | Implement overflow detection using `Result` pattern |
| 1.4 Temporal context composition | 45 min | `createTemporalContextFactory()`, capture ordering, attribution context | Compose `TemporalContext` with audit attribution fields |
| 1.5 Electronic signatures | 30 min | `SignableTemporalContext`, `validateSignableTemporalContext()`, 21 CFR 11.50 | Validate signed and unsigned contexts |
| 1.6 Record integrity | 30 min | `computeTemporalContextDigest()`, `verifyTemporalContextDigest()`, tamper detection | Compute digest, modify field, verify returns false |
| 1.7 Assessment | 30 min | Written or oral technical assessment covering modules 1.1–1.6 | — |

**Module 2: GxP Timing Requirements (2 hours)**

| Section | Duration | Content |
|---|---|---|
| 2.1 ALCOA+ temporal principles | 30 min | How `@hex-di/clock` maps to each ALCOA+ principle (reference: alcoa-mapping.md) |
| 2.2 21 CFR Part 11 requirements | 30 min | Audit trail requirements (11.10(e)), device checks (11.10(h)), system access controls (11.10(d)) |
| 2.3 EU GMP Annex 11 requirements | 30 min | Periodic evaluation (§11), data storage (§9), change control (§10) |
| 2.4 Assessment | 30 min | Written assessment: regulatory scenario questions (minimum 80% pass score) |

**Module 3: IQ/OQ/PQ Execution (4 hours)**

| Section | Duration | Content |
|---|---|---|
| 3.1 Qualification methodology | 30 min | GAMP 5 IQ/OQ/PQ lifecycle; DQ prerequisites; APPROVAL_RECORD.json |
| 3.2 IQ protocol walkthrough | 60 min | IQ-1 through IQ-30 step-by-step; interpreting results; common failure modes |
| 3.3 OQ protocol walkthrough | 45 min | OQ-1 through OQ-8; configurable thresholds; boundary conditions |
| 3.4 PQ protocol walkthrough | 30 min | PQ-1 through PQ-5; long-running tests; environment-specific parameters |
| 3.5 Supervised practice | 60 min | Execute full IQ/OQ/PQ on a non-production environment with assessor oversight |
| 3.6 Assessment | 15 min | Assessor sign-off on supervised execution |

**Competency Assessment Template:**

| Criterion | Pass/Fail | Assessor Notes |
|---|---|---|
| Demonstrates understanding of port/adapter architecture | — | — |
| Can identify correct `ClockPort` function for a given audit scenario | — | — |
| Can compose `TemporalContext` with attribution context | — | — |
| Can implement `Result`-based overflow handling | — | — |
| Can execute IQ/OQ/PQ protocols independently (GxP Validation Engineer only) | — | — |
| Can verify NTP synchronization and platform freeze (Infrastructure Operator only) | — | — |
| Can review change control documentation for completeness (QA Reviewer only) | — | — |

REQUIREMENT (CLK-PAC-019): Organizations MUST adapt the training module outlines above (or develop equivalent training materials) and retain the finalized training materials under configuration control. Training materials MUST be reviewed and updated when the specification is revised or the `@hex-di/clock` API changes. Training materials MUST be updated within **30 calendar days** of a specification revision becoming effective in the organization's deployment. Personnel who complete training on pre-update materials within this 30-day grace period MUST receive delta training covering the specification changes within 30 days of the training material update completion.

Organizations SHOULD maintain a training-to-requirement mapping that documents which training modules cover which CLK-PAC competency criteria (lines 97–107 above). This mapping enables rapid audit response when an inspector asks "does your training cover requirement X?" — the organization can produce the mapping rather than manually tracing from training materials to competency criteria.

### Re-Training Frequency (21 CFR 211.25, EU GMP Annex 11, Section 3)

Personnel competency degrades over time without reinforcement, particularly when regulatory requirements, library APIs, or platform capabilities evolve between training sessions. Periodic re-training ensures that personnel remain qualified to perform their assigned tasks and are aware of changes that affect their role.

REQUIREMENT (CLK-PAC-003): GxP organizations MUST define and enforce a re-training schedule for all personnel in the roles defined above. The following minimum re-training frequencies MUST be observed:

| Re-Training Trigger                                | Frequency                                    | Applicable Roles                                 | Content                                                                                                                                                                                                                                                                    |
| -------------------------------------------------- | -------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Periodic refresher**                             | Annually (12 months from last training date) | All roles                                        | Refresher on role-specific training topics listed above. Includes review of any specification, API, or regulatory changes since the last training session.                                                                                                                 |
| **`@hex-di/clock` major or minor version upgrade** | Within 30 days of upgrade deployment         | All roles                                        | Delta training covering API changes, new features, removed features, and any changes to GxP-relevant behavior (timing semantics, error handling, qualification protocols).                                                                                                 |
| **Regulatory guidance update**                     | Within 90 days of publication                | QA Reviewer, GxP Validation Engineer             | Updated requirements from revised FDA guidance, EU GMP Annex 11 revisions, or new ICH guidelines affecting computerized system validation or data integrity.                                                                                                               |
| **Platform change**                                | Within 30 days of deployment                 | Infrastructure Operator, GxP Validation Engineer | Platform-specific training when the deployment target changes (e.g., Node.js LTS version upgrade, OS migration, NTP daemon replacement).                                                                                                                                   |
| **Incident-driven**                                | Within 14 days of incident closure           | Affected roles                                   | Targeted re-training when a quality deviation, audit finding, or emergency change reveals a training gap. The post-incident review (see ./03-verification-and-change-control.md, Post-Emergency Review) determines which roles require re-training and the specific content. |
| **Role assignment**                                | Before performing role activities            | Newly assigned personnel                         | Full initial training for all training topics applicable to the assigned role.                                                                                                                                                                                             |

REQUIREMENT (CLK-PAC-004): Re-training MUST be documented with: the training date, the training topic(s), the trainer identity, the trainee identity, a competency assessment outcome (pass/fail), and the next re-training due date.

REQUIREMENT (CLK-PAC-005): Organizations MUST implement a training expiration tracking mechanism that prevents personnel with expired training from performing role-specific GxP activities. The mechanism MAY be procedural (supervisor verification before task assignment) or system-enforced (access control based on training status), but MUST be documented in the quality management system.

REQUIREMENT (CLK-PAC-006): Re-training records MUST be retained for the same duration as the computerized system validation plan (see ./05-alcoa-mapping.md, Data Archival and Backup Requirements) and made available for regulatory inspection.

### Minimum Competency Criteria (EU GMP Annex 11, Section 3)

Training alone does not demonstrate competency. GxP organizations MUST assess personnel competency after initial training and each re-training session to verify that knowledge has been retained and can be applied to role-specific tasks.

REQUIREMENT (CLK-PAC-007): Each training session (initial and re-training) MUST conclude with a competency assessment. The assessment MUST evaluate the trainee's ability to perform the specific tasks listed in their role definition (see Role Definitions above). The assessment outcome MUST be recorded as pass or fail, and personnel who fail MUST NOT perform role-specific GxP activities until they pass a reassessment.

REQUIREMENT (CLK-PAC-008): GxP organizations MUST define and document minimum competency criteria for each role. The following criteria are the minimum acceptable thresholds; organizations MAY define stricter criteria:

| Role                        | Minimum Competency Criteria                                                                                                                                                                                                                                             | Assessment Method                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Clock Library Developer** | (1) Can explain the difference between monotonic, wall-clock, and high-resolution time semantics. (2) Can identify which `ClockPort` function to use for a given use case. (3) Can implement a correct `Result`-based error handling path for `SequenceOverflowError`. | Written or oral technical assessment; code review of a sample implementation.                        |
| **GxP Validation Engineer** | (1) Can execute the full IQ/OQ/PQ protocol independently on a deployment target. (2) Can interpret IQ/OQ/PQ test results and identify failures. (3) Can document re-qualification triggers and deviation log entries.                                                  | Supervised execution of IQ/OQ/PQ on a non-production environment; review of documentation produced. |
| **Infrastructure Operator** | (1) Can verify NTP synchronization status using `chronyc tracking` or equivalent. (2) Can configure leap smear settings. (3) Can verify `Object.freeze()` calls at the application entry point. (4) Can execute and interpret DQ-1 through DQ-5.                       | Supervised execution of DQ checklist on a non-production environment.                                |
| **QA Reviewer**             | (1) Can identify which specification changes require re-qualification. (2) Can review FMEA risk scores and risk acceptance justifications. (3) Can verify RTM completeness against regulatory clauses.                                                                 | Review of a sample change control package with intentional gaps; assessor verifies gaps are caught.  |
| **Application Developer**   | (1) Can compose `TemporalContext` with attribution context for a GxP audit entry. (2) Can implement the overflow handling pattern using `createOverflowContext()`. (3) Can use `validateSignableTemporalContext()` before persisting signed records.                   | Code review of a sample audit entry implementation.                                                  |

REQUIREMENT (CLK-PAC-009): Competency assessment records MUST document: the assessment date, the assessor identity, the trainee identity, the role assessed, each criterion evaluated with pass/fail, and the overall outcome. Failed criteria MUST include a remediation plan with a reassessment date.

REQUIREMENT (CLK-PAC-010): Competency assessments MUST be performed by a person who is qualified in the same role or a supervisory role. Self-assessment is NOT acceptable for GxP competency verification.

---

## Operational Access Control (21 CFR 11.10(d), EU GMP Annex 11, Section 12.1)

### Container Graph Registration

REQUIREMENT (CLK-PAC-011): In GxP deployments, modification of `ClockPort`, `SequenceGeneratorPort`, or `ClockDiagnosticsPort` registrations in the DI container graph MUST be restricted to authorized code paths. Specifically:

1. **Initial registration** MUST occur through `GraphBuilder` + `SystemClockAdapter` (or `createSystemClockAdapter(options)`) or an ecosystem library's graph construction mechanism.
2. **Adapter override** (e.g., an ecosystem monitoring adapter replacing `SystemClockAdapter` with `NtpClockAdapter`) MUST occur only through the ecosystem library's graph construction mechanism, which emits the `ClockSourceChangedEvent` audit event.
3. **Manual re-registration** of `ClockPort` with a different adapter outside of the ecosystem library's graph construction MUST NOT occur in GxP deployments. If an application requires custom adapter registration, it MUST implement an equivalent audit event emission mechanism.

### NTP Configuration

REQUIREMENT (CLK-PAC-012): Modification of NTP daemon configuration on GxP deployment targets MUST be performed only by authorized Infrastructure Operators and MUST follow the organization's change control procedures. Changes MUST trigger full IQ/OQ/PQ re-qualification (per `./03-verification-and-change-control.md`).

### Platform API Freeze

REQUIREMENT (CLK-PAC-013): The `Object.freeze(Date)` and `Object.freeze(performance)` calls at the application entry point MUST be reviewed and approved as part of the deployment qualification. Removal or modification of these freeze calls MUST be treated as a re-qualification trigger.

### Version Upgrades

REQUIREMENT (CLK-PAC-014): Upgrading the `@hex-di/clock` package version in GxP deployments MUST require documented QA approval before deployment. The approval record MUST include:

1. Current validated version.
2. Target version.
3. Changelog review outcome (with specific attention to timing behavior changes).
4. Approver identity and signature.
5. Date of approval.

### Version Rollback

REQUIREMENT (CLK-PAC-015): If a version upgrade fails post-deployment qualification (IQ/OQ/PQ failure on target), the organization MUST:

1. Revert to the previously validated version using the exact version pin from the prior lockfile.
2. Re-execute the full IQ/OQ/PQ protocol on the reverted version to confirm it remains in a validated state.
3. Document the rollback in the deviation log, including: the failed target version, the failure mode (which IQ/OQ/PQ step failed), the root cause analysis, and the corrective action.
4. Ensure all audit trail records generated during the failed upgrade period are preserved and annotated with the rollback event context.

REQUIREMENT (CLK-PAC-016): Audit trail records generated between the version upgrade and the rollback MUST NOT be deleted. They MUST be retained with an annotation indicating the clock library version in use at the time of record creation. The `ClockDiagnosticsPort.getDiagnostics()` output captured at startup provides this version context.

---


