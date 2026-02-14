# Personnel Qualification and Access Control

## Purpose

EU GMP Annex 11, Section 3 requires that personnel involved in computerized systems have appropriate qualifications and access levels. 21 CFR 11.10(d) requires limiting system access to authorized individuals. This section defines the personnel qualification requirements and operational access control requirements for `@hex-di/clock` in GxP deployments.

---

## Personnel Qualification (EU GMP Annex 11, Section 3)

### Role Definitions

REQUIREMENT: GxP organizations deploying `@hex-di/clock` MUST define and document the following roles in their computerized system validation plan:

| Role                        | Responsibilities                                                                                                                                                          | Required Qualifications                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Clock Library Developer** | Implements and maintains `@hex-di/clock` source code. Writes unit tests, type tests, and GxP test suites.                                                                 | TypeScript proficiency. Understanding of monotonic vs. wall-clock time semantics. Familiarity with platform timing APIs (`performance.now()`, `Date.now()`). |
| **GxP Validation Engineer** | Executes IQ/OQ/PQ protocols on deployment targets. Documents qualification results. Reviews re-qualification triggers.                                                    | Understanding of IQ/OQ/PQ methodology. Familiarity with GAMP 5 risk classification. Competence in executing automated test suites on target platforms.       |
| **Infrastructure Operator** | Configures NTP daemons, manages platform API freeze at application entry points, deploys `@hex-di/clock` to production. Executes deployment qualification (DQ) checklist. | Understanding of NTP synchronization, leap smear configuration, system clock management. Familiarity with Node.js/Deno/Bun runtime configuration.            |
| **QA Reviewer**             | Approves version upgrades, reviews change control documentation, signs off on re-qualification results.                                                                   | GxP regulatory knowledge (21 CFR Part 11, EU GMP Annex 11). Authority to approve or reject version changes in regulated environments.                        |
| **Application Developer**   | Consumes `ClockPort`, `SequenceGeneratorPort`, and `TemporalContextFactory` in application code. Composes temporal context with attribution context for audit entries.    | Understanding of the `@hex-di/clock` API surface. Familiarity with `TemporalContext` composition patterns (see section 6.5, Attribution Context).            |

### Training Requirements

REQUIREMENT: All personnel in the roles defined above MUST receive documented training before performing role-specific activities in GxP environments. Training records MUST be maintained and available for regulatory inspection.

| Training Topic                       | Applicable Roles                                              | Content                                                                                                                                                             |
| ------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@hex-di/clock` API and architecture | All roles                                                     | Package structure, port interfaces, adapter selection, TemporalContext usage, export map.                                                                           |
| GxP timing requirements              | GxP Validation Engineer, QA Reviewer                          | ALCOA+ temporal principles, 21 CFR 11.10(e) audit trail requirements, EU GMP Annex 11 Section 9 data storage.                                                       |
| IQ/OQ/PQ execution                   | GxP Validation Engineer                                       | IQ protocol steps (IQ-1 through IQ-22), OQ protocol steps (OQ-1 through OQ-5), PQ protocol steps (PQ-1 through PQ-4), deployment qualification (DQ-1 through DQ-5). |
| NTP configuration                    | Infrastructure Operator                                       | NTP daemon setup, leap smear configuration, drift threshold tuning, pre-application synchronization verification.                                                   |
| Change control procedures            | QA Reviewer, GxP Validation Engineer                          | Version pinning, re-qualification triggers, QA approval workflow, deviation log maintenance.                                                                        |
| Emergency change control             | QA Reviewer, GxP Validation Engineer, Infrastructure Operator | Emergency criteria evaluation, expedited approval authority, temporary risk acceptance, retrospective qualification, post-emergency review, CAPA process.           |

### Re-Training Frequency (21 CFR 211.25, EU GMP Annex 11, Section 3)

Personnel competency degrades over time without reinforcement, particularly when regulatory requirements, library APIs, or platform capabilities evolve between training sessions. Periodic re-training ensures that personnel remain qualified to perform their assigned tasks and are aware of changes that affect their role.

REQUIREMENT: GxP organizations MUST define and enforce a re-training schedule for all personnel in the roles defined above. The following minimum re-training frequencies MUST be observed:

| Re-Training Trigger                                | Frequency                                    | Applicable Roles                                 | Content                                                                                                                                                                                                                                                                    |
| -------------------------------------------------- | -------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Periodic refresher**                             | Annually (12 months from last training date) | All roles                                        | Refresher on role-specific training topics listed above. Includes review of any specification, API, or regulatory changes since the last training session.                                                                                                                 |
| **`@hex-di/clock` major or minor version upgrade** | Within 30 days of upgrade deployment         | All roles                                        | Delta training covering API changes, new features, removed features, and any changes to GxP-relevant behavior (timing semantics, error handling, qualification protocols).                                                                                                 |
| **Regulatory guidance update**                     | Within 90 days of publication                | QA Reviewer, GxP Validation Engineer             | Updated requirements from revised FDA guidance, EU GMP Annex 11 revisions, or new ICH guidelines affecting computerized system validation or data integrity.                                                                                                               |
| **Platform change**                                | Within 30 days of deployment                 | Infrastructure Operator, GxP Validation Engineer | Platform-specific training when the deployment target changes (e.g., Node.js LTS version upgrade, OS migration, NTP daemon replacement).                                                                                                                                   |
| **Incident-driven**                                | Within 14 days of incident closure           | Affected roles                                   | Targeted re-training when a quality deviation, audit finding, or emergency change reveals a training gap. The post-incident review (see 06/verification-and-change-control.md, Post-Emergency Review) determines which roles require re-training and the specific content. |
| **Role assignment**                                | Before performing role activities            | Newly assigned personnel                         | Full initial training for all training topics applicable to the assigned role.                                                                                                                                                                                             |

REQUIREMENT: Re-training MUST be documented with: the training date, the training topic(s), the trainer identity, the trainee identity, a competency assessment outcome (pass/fail), and the next re-training due date.

REQUIREMENT: Organizations MUST implement a training expiration tracking mechanism that prevents personnel with expired training from performing role-specific GxP activities. The mechanism MAY be procedural (supervisor verification before task assignment) or system-enforced (access control based on training status), but MUST be documented in the quality management system.

REQUIREMENT: Re-training records MUST be retained for the same duration as the computerized system validation plan (see 06/alcoa-mapping.md, Data Archival and Backup Requirements) and made available for regulatory inspection.

---

## Operational Access Control (21 CFR 11.10(d), EU GMP Annex 11, Section 12.1)

### Container Graph Registration

REQUIREMENT: In GxP deployments, modification of `ClockPort`, `SequenceGeneratorPort`, or `ClockDiagnosticsPort` registrations in the DI container graph MUST be restricted to authorized code paths. Specifically:

1. **Initial registration** MUST occur through `provideSystemClock()` or the guard's `createGuardGraph()` mechanism.
2. **Adapter override** (e.g., guard replacing `SystemClockAdapter` with `NtpClockAdapter`) MUST occur only through `createGuardGraph()`, which emits the `ClockSourceChangedEvent` audit event.
3. **Manual re-registration** of `ClockPort` with a different adapter outside of `createGuardGraph()` MUST NOT occur in GxP deployments. If an application requires custom adapter registration, it MUST implement an equivalent audit event emission mechanism.

### NTP Configuration

REQUIREMENT: Modification of NTP daemon configuration on GxP deployment targets MUST be performed only by authorized Infrastructure Operators and MUST follow the organization's change control procedures. Changes MUST trigger full IQ/OQ/PQ re-qualification (per `06/verification-and-change-control.md`).

### Platform API Freeze

REQUIREMENT: The `Object.freeze(Date)` and `Object.freeze(performance)` calls at the application entry point MUST be reviewed and approved as part of the deployment qualification. Removal or modification of these freeze calls MUST be treated as a re-qualification trigger.

### Version Upgrades

REQUIREMENT: Upgrading the `@hex-di/clock` package version in GxP deployments MUST require documented QA approval before deployment. The approval record MUST include:

1. Current validated version.
2. Target version.
3. Changelog review outcome (with specific attention to timing behavior changes).
4. Approver identity and signature.
5. Date of approval.

### Version Rollback

REQUIREMENT: If a version upgrade fails post-deployment qualification (IQ/OQ/PQ failure on target), the organization MUST:

1. Revert to the previously validated version using the exact version pin from the prior lockfile.
2. Re-execute the full IQ/OQ/PQ protocol on the reverted version to confirm it remains in a validated state.
3. Document the rollback in the deviation log, including: the failed target version, the failure mode (which IQ/OQ/PQ step failed), the root cause analysis, and the corrective action.
4. Ensure all audit trail records generated during the failed upgrade period are preserved and annotated with the rollback event context.

REQUIREMENT: Audit trail records generated between the version upgrade and the rollback MUST NOT be deleted. They MUST be retained with an annotation indicating the clock library version in use at the time of record creation. The `ClockDiagnosticsPort.getDiagnostics()` output captured at startup provides this version context.
