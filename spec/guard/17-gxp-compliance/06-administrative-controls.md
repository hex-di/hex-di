# 17 - GxP Compliance: Administrative Controls

<!-- Document Control
| Property         | Value                                    |
|------------------|------------------------------------------|
| Document ID      | GUARD-17-06                              |
| Revision         | 1.3                                      |
| Effective Date   | 2026-02-13                               |
| Author           | HexDI Engineering                        |
| Reviewer         | GxP Compliance Review                    |
| Approved By      | Regulatory Affairs Lead, Quality Assurance Manager |
| Classification   | GxP Compliance Sub-Specification         |
| Change History   | 1.3 (2026-02-13): Added Quality Reviewer role (§64g) with EU GMP Annex 11 §1 mapping, updated incompatibility matrix |
|                  | 1.2 (2026-02-13): Added §64g-2 through §64g-5 (access reviews, provisioning lifecycle, change impact template, change freeze, role auditing), recommended maxScopeLifetimeMs |
|                  | 1.1 (2026-02-13): Added role incompatibility matrix and max role accumulation limit (§64g) |
|                  | 1.0 (2026-02-13): Initial controlled release |
-->

_Previous: [Audit Trail Review](./05-audit-trail-review.md) | Next: [Electronic Signatures](./07-electronic-signatures.md)_

---

## 64a. Policy Change Control

Per GAMP 5 and EU GMP Annex 11 Section 10, changes to computerized systems must follow a formal change control process. Since authorization policies directly control access to GxP-regulated operations, policy changes are system configuration changes that require documented change control.

### Significant Change Criteria

| #   | Change Type                                                                | Significant? | Rationale                                                                 |
| --- | -------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------- |
| 1   | Adding a new guarded port                                                  | Yes          | Introduces a new access control boundary                                  |
| 2   | Modifying an existing policy (changing combinators, permissions, or roles) | Yes          | Alters who can access regulated operations                                |
| 3   | Removing a guard from a previously guarded port                            | Yes          | Removes an access control boundary                                        |
| 4   | Changing the role hierarchy (adding/removing role inheritance)             | Yes          | Transitively affects permission sets                                      |
| 5   | Adding new permissions to an existing role                                 | Depends      | Significant if the role is used in GxP-guarded policies                   |
| 6   | Updating `failOnAuditError`, signature service, or audit trail adapter     | Yes          | Changes compliance posture                                                |
| 7   | Changing the ClockSource implementation                                    | Yes          | Affects timestamp accuracy for all audit entries (ALCOA+ Contemporaneous) |

### Change Classification Decision Tree

To determine whether a policy or configuration change is significant, follow this decision tree:

1. **Does the change affect a port that is guarded with `guard()` in a GxP environment?**
   - No → **Minor change.** Targeted testing sufficient. Document in change log.
   - Yes → Continue to step 2.
2. **Does the change alter who can access the guarded port?** (permission grants/revocations, role membership changes, policy combinator logic modifications)
   - Yes → **Significant change.** Full change control process (Minimum Documentation Artifacts below) required.
   - No → Continue to step 3.
3. **Does the change affect compliance posture?** (audit adapter, signature service, clock source, `failOnAuditError`, audit trail retention, hash chain configuration)
   - Yes → **Significant change.** Full change control process + re-validation trigger assessment required.
   - No → **Minor change.** Targeted testing sufficient. Document in change log.

```
RECOMMENDED: Organizations SHOULD document their classification decision for each
             change request, including which step of the decision tree was reached
             and the rationale for the classification. For borderline cases (e.g.,
             a permission rename that does not change effective access), the
             classification rationale SHOULD be reviewed by a second person before
             proceeding. Documenting the decision tree outcome provides audit evidence
             that the change control process was followed consistently.
```

### Minimum Documentation Artifacts

```
REQUIREMENT: Every policy change in a GxP environment MUST have a documented
             change request that includes the reason for the change, the
             affected ports and policies, and the requestor identity.

REQUIREMENT: Every policy change MUST include an impact analysis documenting
             which subjects gain or lose access as a result of the change.

REQUIREMENT: Every policy change MUST record a policy snapshot (git SHA or
             content hash) in the change record, linking the change to a
             specific version of the policy configuration. This snapshot
             populates AuditEntry.policySnapshot for entries evaluated after
             the change.

REQUIREMENT: Every policy change MUST include test evidence demonstrating
             that the new policy configuration produces the expected
             allow/deny outcomes for representative subjects.

REQUIREMENT: Every policy change MUST be approved by a person other than
             the requestor before deployment to production. This approval
             MUST be recorded with the approver's identity and timestamp.

REQUIREMENT: The approval record MUST include the following evidence as a minimum:
             (1) Approver identity (name, role, signerId or employee ID),
             (2) Approver role confirming authority to approve the change,
             (3) Timestamp of approval (ISO 8601 UTC),
             (4) Approval method (electronic signature, manual sign-off, ticketing
                 system approval action),
             (5) Justification or reference to the change request rationale.
             Reference: EU GMP Annex 11 §10, GAMP 5 Appendix O8.

RECOMMENDED: Policy change approval in GxP environments SHOULD include QA
             representation. The minimum review SHOULD include:
             (1) Requestor's technical assessment of the change,
             (2) Independent technical review by a team member who did not
                 author the change,
             (3) QA sign-off confirming the change does not require additional
                 IQ/OQ/PQ testing beyond what the re-validation triggers in
                 this section prescribe.
             Reference: EU GMP Annex 11 §10, ICH Q9.
```

### Policy Change Log

```
RECOMMENDED: Use the git commit history of the policy configuration files
             as the primary change log. Commit messages SHOULD follow a
             structured format:

             guard-policy: <change-type> <port-name>
             Reason: <brief justification>
             Impact: <subjects affected>
             Change-Request: <CR identifier>
             Approved-By: <approver identity>
```

### Re-Validation Triggers

```
REQUIREMENT: The following changes MUST trigger a full Operational
             Qualification (OQ) re-run (see section 67b):
             1. Framework version upgrade of @hex-di/guard
             2. Changes to the AuditTrailPort adapter implementation
             3. Changes to the SignatureService adapter implementation
             4. Infrastructure migration (database, cloud provider, etc.)
             5. Changes to the role hierarchy that affect GxP-guarded policies
             6. Changes to the hash chain algorithm or key material

REQUIREMENT: Deploying a change listed above to a GxP production environment
             without completing the required OQ re-run constitutes a compliance
             deviation. Such deployments MUST be documented as deviations per
             the site's quality management system, including: (1) the nature of
             the change, (2) the reason OQ was not completed before deployment,
             (3) a risk assessment of the deployment gap, and (4) a timeline for
             completing the OQ re-run. Reference: EU GMP Annex 11 §10, GAMP 5.
```

```
REQUIREMENT: Policy definitions loaded at runtime (via deserialization, configuration,
             or hot-reload) MUST be validated against the policy schema before activation.
             Invalid policies MUST be rejected with a logged error including the validation
             failure details. Under no circumstances may a policy that fails schema
             validation be applied to a guarded port. Reference: 21 CFR 11.10(h) (controls
             for operational system checks) and FM-11 mitigation (section 68).
```

```
REQUIREMENT: When gxp is true, organizations MUST define and maintain a formal JSON
             Schema (JSON Schema 2020-12 or later) for the serialized policy format
             (section 09). This schema MUST be used for runtime validation of all
             dynamically loaded policies — policies that fail schema validation MUST
             be rejected before activation (per the REQUIREMENT above). The schema
             MUST be:
             (a) Based on the Policy discriminated union defined in 04-policy-types.md,
                 covering all seven policy kinds (hasPermission, hasRole, hasAttribute,
                 hasSignature, allOf, anyOf, not).
             (b) Maintained alongside the guard spec and updated via the change control
                 process (section 64a) when policy kinds are added or modified.
             (c) Version-controlled with a schema version identifier that is checked
                 during deserialization.
             (d) Included in the validation artifacts and verified during OQ testing
                 (section 67b) by deserializing representative policies of each kind
                 and confirming schema validation accepts valid policies and rejects
                 invalid ones.
             Reference: 21 CFR 11.10(h) (controls for operational system checks),
             EU GMP Annex 11 §4.8 (input/output checking).

RECOMMENDED: In non-GxP environments, organizations SHOULD define a formal JSON Schema
             for the serialized policy format (section 09) and use it for runtime
             validation of dynamically loaded policies. A reference schema based on the
             Policy discriminated union SHOULD be maintained alongside the guard spec
             and updated when policy kinds are added or modified.
```

```
REQUIREMENT: Policy changes in GxP environments MUST include regression test evidence.
             At minimum, OQ-1 through OQ-3 (unit, type, and integration tests) plus OQ-7
             (audit completeness) MUST be re-executed for the modified policy scope.
             Targeted tests demonstrating the specific access changes (subjects who gain
             or lose access) MUST also be included. Reference: EU GMP Annex 11 Section 10.
```

> **Guidance:** Minor policy changes (e.g., adding a new non-GxP guarded port, updating a non-GxP role) may warrant targeted OQ testing rather than a full re-run. The decision should be documented in the change request impact analysis.

### 64a-1. Policy Change Audit Entry

While section 64a defines the process-level change control requirements (documentation, approval, re-validation), this subsection defines the **runtime audit record** for policy changes. When policies are modified at runtime (via `deserializePolicy()`, configuration reload, or hot-reload), the change MUST be recorded as a `PolicyChangeAuditEntry` in the audit trail.

```typescript
/**
 * Audit entry recording a policy change event.
 *
 * Follows the same structural pattern as HttpClientConfigurationAuditEntry
 * (http-client spec 18-http-transport-security.md §88). Both previousPolicyHash and newPolicyHash
 * are computed via hashPolicy() (04-policy-types.md) to detect any mutation.
 */
interface PolicyChangeAuditEntry {
  /** Discriminant tag for the audit entry type. */
  readonly _tag: "PolicyChangeAuditEntry";
  /** Unique identifier for this change event. */
  readonly changeId: string;
  /** ISO 8601 UTC timestamp of when the change was applied (or rejected). */
  readonly timestamp: string;
  /** Identity of who initiated the policy change. */
  readonly actorId: string;
  /** The port affected by the policy change. Use "*" for graph-wide changes. */
  readonly portName: string;
  /** hashPolicy() digest of the previous policy. */
  readonly previousPolicyHash: string;
  /** hashPolicy() digest of the new policy. */
  readonly newPolicyHash: string;
  /** Human-readable description of why the policy was changed. */
  readonly reason: string;
  /** Whether the policy change was successfully applied. */
  readonly applied: boolean;
  /** Identifier linking to the external change control system. */
  readonly changeRequestId: string;
  /** Identity of who approved the change (must differ from actorId). */
  readonly approverId: string;
  /** ISO 8601 UTC timestamp of when the change was approved. */
  readonly approvedAt: string;
  /** Optional: full JSON serialization of the previous policy for reconstruction. */
  readonly previousPolicySerialized?: string;
  /** Optional: full JSON serialization of the new policy for reconstruction. */
  readonly newPolicySerialized?: string;
  /** SHA-256 checksum of the policy diff report. Required in GxP mode. */
  readonly diffReportChecksum?: string;
}

/**
 * GxP-extended PolicyChangeAuditEntry with hash chain participation fields.
 *
 * When gxp: true, policy change entries participate in the same hash chain
 * as regular AuditEntry records — no separate chain is maintained.
 */
interface GxPPolicyChangeAuditEntry extends PolicyChangeAuditEntry {
  /** Monotonically increasing sequence number within the audit chain. */
  readonly sequenceNumber: number;
  /** SHA-256 integrity hash of this entry's canonical fields. */
  readonly integrityHash: string;
  /** integrityHash of the preceding entry in the chain (empty string for genesis). */
  readonly previousHash: string;
  /** Hash algorithm identifier (e.g., "SHA-256"). */
  readonly hashAlgorithm: string;
  /** SHA-256 checksum of the policy diff report. Required in GxP mode. */
  readonly diffReportChecksum: string;
}
```

> **Cross-reference (§61.4b):** The canonical field ordering for PolicyChangeAuditEntry hash chain computation is defined in 02-audit-trail-contract.md section 61.4b. The 13-field alphabetical ordering used for hash computation MUST match the fields in the PolicyChangeAuditEntry and GxPPolicyChangeAuditEntry interfaces above, including the `diffReportChecksum` field.

```
REQUIREMENT: When gxp is true, a PolicyChangeAuditEntry MUST be recorded in the
             audit trail BEFORE the new policy is activated. The entry MUST be
             recorded via the same AuditTrailPort used for authorization decisions.
             GxPPolicyChangeAuditEntry entries participate in the same hash chain
             as regular AuditEntry records — no separate chain is maintained. This
             ensures that policy changes are tamper-evident and sequenced relative
             to authorization decisions.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §10.
```

```
REQUIREMENT: Both previousPolicyHash and newPolicyHash MUST be computed via
             hashPolicy() (04-policy-types.md). The hash computation MUST use
             the same deterministic serialization as serializePolicy() to ensure
             that semantically identical policies produce identical hashes.
             Reference: 21 CFR 11.10(e) (accurate records).
```

```
REQUIREMENT: The approverId MUST NOT equal the actorId on any
             PolicyChangeAuditEntry. This enforces separation of duties for
             policy changes — the person who initiates a change cannot also
             approve it. Implementations MUST reject PolicyChangeAuditEntry
             records where approverId === actorId with an AuditTrailWriteError.
             Reference: 21 CFR 11.10(k)(2), EU GMP Annex 11 §10.
```

```
REQUIREMENT: The changeRequestId field MUST be non-empty when gxp is true.
             Empty changeRequestId in GxP mode MUST be rejected with an
             AuditTrailWriteError. This ensures every policy change is traceable
             to an external change control record.
             Reference: EU GMP Annex 11 §10 (change management traceability).
```

```
RECOMMENDED: Non-GxP environments SHOULD also record PolicyChangeAuditEntry
             for policy changes. While not regulatory-required, policy change
             audit records provide valuable operational visibility and simplify
             debugging of authorization behavior changes.
```

```
RECOMMENDED: Organizations SHOULD include the full serialized policies
             (previousPolicySerialized, newPolicySerialized) in
             PolicyChangeAuditEntry records. This enables full policy
             reconstruction during incident investigation without requiring
             access to version control history. The serialized fields use
             serializePolicy() output and are JSON strings.
```

Helper function for constructing `PolicyChangeAuditEntry` records:

````typescript
/**
 * Creates a PolicyChangeAuditEntry with computed hashes.
 *
 * Computes previousPolicyHash and newPolicyHash via hashPolicy().
 * Validates separation of duties (actorId !== approverId).
 * When gxp is true, validates non-empty changeRequestId.
 *
 * @param options - Entry fields (actorId, approverId, etc.)
 * @returns Result<PolicyChangeAuditEntry, AuditTrailWriteError>
 *
 * @example
 * ```typescript
 * const entry = createPolicyChangeAuditEntry({
 *   actorId: "admin-1",
 *   approverId: "qa-lead-1",
 *   portName: "UserRepoPort",
 *   previousPolicy: oldPolicy,
 *   newPolicy: newPolicy,
 *   reason: "Added MFA requirement for admin operations",
 *   changeRequestId: "CR-2024-042",
 * });
 *
 * if (entry.isOk()) {
 *   auditTrail.record(entry.value);
 * }
 * ```
 */
function createPolicyChangeAuditEntry(options: {
  readonly actorId: string;
  readonly approverId: string;
  readonly portName: string;
  readonly previousPolicy: PolicyConstraint;
  readonly newPolicy: PolicyConstraint;
  readonly reason: string;
  readonly changeRequestId: string;
  readonly approvedAt?: string;
  readonly includeSerialized?: boolean;
  readonly gxp?: boolean;
}): Result<PolicyChangeAuditEntry, AuditTrailWriteError>;
````

```
REQUIREMENT: When gxp is true, the diff report generated by createPolicyDiffReport()
             (section 50 in 13-testing.md) MUST be archived alongside the
             PolicyChangeAuditEntry. The archive MUST include: (1) the full diff
             report content, (2) the SHA-256 checksum (stored as
             diffReportChecksum on the audit entry), and (3) a reference linking
             the archive to the changeId. The diffReportChecksum MUST be included
             in the hash chain computation per §61.4b.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §10.
```

### 64a-2. Cross-Library Validation Coordination

When both `@hex-di/guard` and `@hex-di/http-client` are co-deployed in a GxP environment, the shared infrastructure components (ClockSource, hash chain, signature delegation) require coordinated validation to ensure end-to-end compliance.

```
REQUIREMENT: When @hex-di/guard and @hex-di/http-client are co-deployed in a GxP
             environment, organizations MUST perform coordinated validation across
             both libraries:

             1. **IQ: Version compatibility matrix verification.** The IQ process
                MUST verify that the installed versions of @hex-di/guard and
                @hex-di/http-client are within their documented compatibility
                matrix. Incompatible version combinations MUST block deployment.

             2. **OQ: Cross-library integration tests (OQ-25).** The OQ process
                MUST include integration tests that verify:
                (a) Shared ClockSource — both libraries use the same ClockSource
                    instance and produce timestamps from the same time source.
                (b) Shared hash chain — audit entries from both libraries
                    participate in a consistent hash chain when configured to
                    share an AuditTrailPort adapter.
                (c) Signature delegation — when @hex-di/http-client delegates
                    signature operations to @hex-di/guard's SignatureService,
                    the delegation produces valid signatures verifiable by
                    @hex-di/guard's validate() method.
                (d) Version compatibility — the co-deployed versions satisfy
                    the compatibility matrix verified in IQ.

             3. **Change control: Joint impact analysis.** Any change to either
                library that affects shared infrastructure (ClockSource, hash
                chain, signature service, audit trail adapter) MUST include an
                impact analysis covering both libraries. The change request MUST
                document which cross-library integration points are affected.

             4. **Periodic review: Joint review.** The periodic review cycle
                (section 64) MUST include a joint review of both libraries when
                co-deployed, covering shared infrastructure health, cross-library
                integration test results, and any version compatibility changes.

             Reference: EU GMP Annex 11 §10, GAMP 5 (integrated system validation),
             21 CFR 11.10(a).
```

### 64a-ext. Emergency Change Procedures

Standard change control (section 64a) requires full impact analysis, OQ re-verification, and dual-person approval before deployment. Emergency situations demand faster response while maintaining minimum compliance safeguards. This subsection defines the abbreviated procedure for emergency changes to guard configuration in GxP environments.

```
RECOMMENDED: Organizations SHOULD define an emergency change procedure for guard
             configuration changes that addresses the following five areas:

             (a) Emergency declaration criteria — An emergency change MAY be declared
                 when one or more of the following conditions exist:
                 (1) Active security breach affecting the guard system or its
                     backing stores (audit trail, signature service, WAL store).
                 (2) Published CVE with CVSS score >= 7.0 affecting @hex-di/guard
                     or any @hex-di/* dependency in the guard graph.
                 (3) Production outage caused by guard misconfiguration (e.g.,
                     incorrect policy denying all legitimate access, audit trail
                     write failures blocking operations with failOnAuditError: true).
                 (4) Regulatory directive requiring immediate system modification
                     (e.g., FDA warning letter, EU GMP inspection finding requiring
                     corrective action before next production batch).
                 (5) Signing key compromise requiring immediate key revocation and
                     rotation (section 65c).

             (b) Minimum pre-deployment checks — Emergency changes MUST execute a
                 minimum subset of OQ before deployment:
                 - checkGxPReadiness() MUST pass.
                 - OQ-1 (unit tests) for the modified scope MUST pass.
                 - OQ-7 (audit completeness) MUST pass.
                 - Hash chain integrity verification (verifyAuditChain) MUST pass
                   for all active scopes.
                 The full OQ suite MAY be deferred to retroactive completion (below).

             (c) Retroactive OQ completion — The full OQ suite MUST be completed
                 within 5 business days of the emergency deployment. If any OQ check
                 fails during retroactive completion, the emergency change MUST be
                 treated as a deviation and escalated to QA for impact assessment.

             (d) Documentation requirements — Emergency changes MUST be documented
                 within 48 hours of deployment. Documentation MUST include:
                 (1) Emergency Change Request (ECR) with declaration criteria met
                     and approver identity.
                 (2) Impact analysis (may be abbreviated; full analysis completed
                     retroactively with the OQ).
                 (3) Evidence of minimum pre-deployment checks (checkGxPReadiness
                     output, OQ-1 results, OQ-7 results, chain verification).
                 (4) Deployment record (timestamp, deployer identity, version
                     deployed, configuration delta).
                 (5) Post-emergency verification confirming the change resolved the
                     emergency condition.

             (e) Post-emergency reconciliation — After retroactive OQ completion,
                 the emergency change MUST be reconciled into the standard change
                 control log (section 64a). The ECR MUST be cross-referenced with
                 the standard change request created for reconciliation.

             Reference: EU GMP Annex 11 §10, 21 CFR 11.10(k)(2),
             GAMP 5 (change management).
```

```
REQUIREMENT: Emergency changes MUST be tracked separately from standard changes
             with an "emergency" flag or equivalent discriminant in the change
             control system. The periodic review (section 64) MUST include a
             summary of all emergency changes since the last review, including:
             (a) total number of emergency changes, (b) declaration criteria
             distribution (which criteria were invoked), (c) retroactive OQ
             completion status (completed on time, completed late, outstanding),
             and (d) any deviations identified during retroactive verification.
             Reference: EU GMP Annex 11 §10, ICH Q10 (change management).
```

#### §64a-ext-1. Production Policy Modification Prohibition

```
REQUIREMENT: No direct modification of production guard policies is permitted
             outside the documented change control process (§64a) or an
             approved Emergency Change Request (§64a-ext). Any attempt to
             modify a production policy without a corresponding change request
             or ECR MUST be rejected by the policy activation pipeline and
             logged as an unauthorized modification attempt in the
             administrative event log (§64b).
             Reference: EU GMP Annex 11 §10, 21 CFR 11.10(j).

REQUIREMENT: Policy changes MUST be deferred during active GxP-critical
             operations (e.g., batch processing, active electronic signature
             workflows) unless the change is classified as an Emergency Change
             Request (§64a-ext). The policy activation pipeline MUST check for
             active GxP-critical operations before applying a policy change
             and MUST queue the change for application after the current
             operations complete.
             Reference: 21 CFR 11.10(f) (permitted sequencing), GAMP 5.

REQUIREMENT: An Emergency Change Request (§64a-ext) that bypasses the standard
             change control process MUST be followed by a formal change request
             within 48 hours. If the formal change request is not created within
             48 hours, the ECR MUST be escalated as a documentation deviation
             per the site's deviation/CAPA process.
             Reference: EU GMP Annex 11 §10, GAMP 5 Appendix M3.
```

#### §64a-3. Policy Rollback Procedure

```
REQUIREMENT: Organizations MUST maintain a documented policy rollback procedure
             that addresses:

             (a) Rollback criteria: Conditions under which a policy rollback is
                 warranted (e.g., post-deployment defect, unintended access
                 grant, regulatory audit finding).

             (b) Rollback mechanism: A rollback MUST be implemented as a new
                 PolicyChangeAuditEntry with the reverted policy content — NOT
                 as a deletion or modification of the original change entry.
                 The rollback entry MUST reference the original changeId being
                 reverted and MUST include reason: "rollback" with the
                 justification for the reversion.

             (c) Separation of duties: The person approving the rollback MUST
                 NOT be the same person who approved the original change, unless
                 the rollback is executed under an Emergency Change Request
                 (§64a-ext) with documented justification for the exception.

             (d) Post-rollback verification: After a rollback is applied, the
                 following OQ checks MUST be executed:
                 - Verify the reverted policy produces the expected allow/deny
                   decisions for a representative set of test subjects.
                 - Verify the PolicyChangeAuditEntry for the rollback is present
                   in the hash chain and passes chain verification.
                 - Verify that the policy version active after rollback matches
                   the intended target version.

             (e) Incident documentation: Every policy rollback MUST be
                 documented as a planned deviation or corrective action,
                 including: original changeId, rollback changeId, reason for
                 rollback, subjects and ports affected, and post-rollback
                 verification results.

             Reference: EU GMP Annex 11 §10, 21 CFR 11.10(j), GAMP 5.
```

---

## 64b. Administrative Activity Monitoring

Per EU GMP Annex 11 Section 12.3 and PIC/S PI 011-3 Section 9.5, administrative activities on computerized systems must be monitored and logged. Guard runtime configuration changes are administrative activities that affect the compliance posture of the system.

```
REQUIREMENT: Runtime guard configuration changes — including policy modifications,
             role hierarchy changes, adapter swaps (e.g., changing the AuditTrailPort
             or SignatureServicePort adapter), and changes to failOnAuditError — MUST
             be logged as administrative events. Each administrative event log entry
             MUST include: (1) operator identity, (2) timestamp (ISO 8601 UTC),
             (3) nature of the change (what was changed), (4) previous state,
             and (5) new state.

REQUIREMENT: Administrative event logs MUST be append-only and MUST be subject to
             the same retention and access control requirements as the audit trail
             (sections 63 and 64). Administrative event logs MUST NOT be modifiable
             by the operator whose actions they record.

REQUIREMENT: Administrative event log retention periods MUST match the audit trail
             retention periods for the same port scope. If administrative events apply
             to multiple ports with different retention periods, the longest applicable
             period MUST be used. This ensures administrative context remains available
             for the full duration that corresponding audit entries are retained.
             Reference: EU GMP Annex 11 §9, §17.
```

```
RECOMMENDED: Organizations SHOULD cross-reference administrative monitoring with
             training records (section 64c) to verify that operators performing
             administrative changes have received appropriate training.
```

```
RECOMMENDED: Administrative monitoring events SHOULD be emitted in a
             SIEM-compatible structured format to enable automated correlation
             and alerting. Supported formats include:
             1. **CEF (Common Event Format):** For ArcSight-compatible SIEMs.
                Example: CEF:0|hex-di|guard|1.0|ADMIN_POLICY_CHANGE|Policy Modified|7|src=admin@example.com dst=BatchReleasePort
             2. **LEEF (Log Event Extended Format):** For QRadar-compatible SIEMs.
             3. **JSON structured log:** For Splunk, Elasticsearch, and cloud-native
                SIEM solutions. Fields SHOULD include: timestamp (ISO 8601),
                eventType (AdminEventType discriminant), actorId, targetResource,
                outcome (success/failure), and correlationId.
             The log format SHOULD be configurable via the guard graph options.
             When multiple SIEM systems are in use, the adapter SHOULD support
             emitting to multiple formats simultaneously.
             Reference: EU GMP Annex 11 §12.3, PIC/S PI 011-3 §9.5.
```

---

## 64c. Training and Competency Requirements

Per EU GMP Annex 11 Section 2, GAMP 5 Appendix O3, and 21 CFR 11.10(i), personnel involved in the operation and maintenance of computerized systems must have appropriate training and competency.

```
REQUIREMENT: Personnel who configure guard policies, manage signing keys, review
             audit trail data, or respond to security/compliance incidents MUST
             receive documented training covering:
             1. The guard authorization model (policy kinds, combinators, evaluation
                semantics, guard wrapper behavior)
             2. ALCOA+ principles as they apply to guard audit entries (section 60)
             3. Key management procedures (section 65c) including key rotation,
                revocation, and compromise response
             4. Incident response procedures including chain break response
                (section 61, "Chain Break Response") and key compromise emergency
                response (section 65c)
```

```
REQUIREMENT: In GxP environments, training records MUST be maintained per the site's
             training management system. Training MUST be refreshed when significant
             changes occur to the guard configuration (per section 64a re-validation
             triggers) or when new personnel are assigned to guard administration
             roles. Each training record MUST include: (1) personnel identity,
             (2) training date, (3) training content covered (referencing the four
             areas in the REQUIREMENT above), (4) competency assessment result, and
             (5) trainer identity. Personnel MUST NOT be granted change-control
             approval privileges (section 64a) until their training record confirms
             completion of all four training areas.
             Reference: EU GMP Annex 11 §2, 21 CFR 11.10(i), GAMP 5 Appendix O3.

RECOMMENDED: In non-GxP environments, training records SHOULD be maintained per the
             site's training management system. Training SHOULD be refreshed when
             significant changes occur to the guard configuration or when new
             personnel are assigned to guard administration roles.
```

---

## 64d. Supplier Qualification

Per WHO TRS 996 Annex 5, GAMP 5 Appendix M5, and EU GMP Annex 11 §3, organizations using custom or configurable software components in GxP-regulated systems MUST assess the supplier's quality management practices.

```
REQUIREMENT: Organizations MUST include `@hex-di/guard` in their supplier
             qualification process. The following artifacts serve as supplier
             qualification evidence:
             1. This specification document (GAMP 5 Category 5: URS + FS + DS)
             2. Test execution reports from the library's CI pipeline (713 tests
                across 21 Definition of Done items — section 16)
             3. FMEA risk assessment (section 68) with mitigation evidence
             4. IQ/OQ/PQ validation reports generated by the programmatic runners
                (section 67)
             5. Software Bill of Materials (SBOM) and provenance attestations
                (http-client spec 20-http-transport-validation.md section 99)
             Organizations MUST document the supplier assessment outcome in their
             vendor qualification register and MUST review it when upgrading to new
             major versions of the library.
             Reference: WHO TRS 996 Annex 5, GAMP 5 Appendix M5, EU GMP Annex 11 §3,
             PIC/S PI 011-3 §7.
```

---

## 64f. Regulatory Update Monitoring

Regulatory requirements evolve over time. Organizations deploying `@hex-di/guard` in GxP environments must monitor for regulatory changes that may affect their compliance posture.

```
RECOMMENDED: Organizations SHOULD establish a regulatory update monitoring process
             with the following elements:

             1. **Annual regulatory review:** At minimum annually (aligned with the
                periodic review cycle in section 64), review applicable regulations
                (21 CFR Part 11, EU GMP Annex 11, GAMP 5, ICH Q9/Q10) for updates,
                draft guidance, or enforcement trends that affect the guard system.

             2. **Structured impact assessment:** For each identified regulatory
                change, perform a structured impact assessment documenting:
                - The regulatory change (citation, effective date)
                - Affected guard components (audit trail, electronic signatures,
                  access control, hash chain, etc.)
                - Required specification updates (section references)
                - Required implementation changes (if any)
                - Timeline for compliance

             3. **Specification update triggers:** Regulatory changes that affect
                normative REQUIREMENT or RECOMMENDED blocks in this specification
                MUST trigger a specification update via the change control process
                (section 64a) before the regulatory change effective date.

             4. **Tracking:** Maintain a periodic review log entry for each
                regulatory review cycle, recording the regulations reviewed,
                changes identified, and disposition of each change.

             Reference: EU GMP Annex 11 §1 (risk management), GAMP 5
             (operational phase), ICH Q10 (pharmaceutical quality system).
```

## 64f-1. Periodic Security Assessment

```
REQUIREMENT: Organizations deploying @hex-di/guard in GxP environments MUST
             conduct periodic security assessments of the audit trail infrastructure
             and any web-based audit trail review interfaces. Assessments MUST
             include:

             1. **Penetration testing:** At minimum annually (aligned with the
                periodic review cycle in section 64), a qualified security assessor
                MUST perform penetration testing against the audit trail backing
                store, audit trail review interface, and any exposed MCP/A2A
                endpoints (section 12-inspection.md). Testing MUST cover OWASP
                Top 10 vulnerabilities including injection, broken authentication,
                sensitive data exposure, and security misconfiguration.

             2. **Web application security:** Web-based audit trail review interfaces
                MUST implement Content Security Policy (CSP) headers as a
                defense-in-depth control alongside the output encoding requirements
                in section 64. The CSP policy MUST restrict script sources,
                disable inline scripts, and prevent framing by untrusted origins.

             3. **Infrastructure review:** The network configuration, access controls,
                and encryption settings of the audit trail backing store MUST be
                reviewed for compliance with the organization's security baseline.

             4. **Vulnerability management:** Known vulnerabilities in the audit trail
                technology stack (database, web server, Node.js runtime) MUST be
                tracked and remediated per the organization's vulnerability
                management policy. Critical vulnerabilities MUST be remediated
                within 30 days of disclosure.

             Assessment results MUST be documented and retained alongside the
             validation artifacts. Identified vulnerabilities MUST be tracked
             through the organization's CAPA process (section 68).

             The scope and depth of the security assessment MAY be scaled based on
             the site's risk assessment per ICH Q9, but a minimum annual assessment
             covering items 1-4 above is REQUIRED.
             Reference: 21 CFR 11.10(a), OWASP Application Security Verification
             Standard (ASVS), NIST SP 800-53 (Security and Privacy Controls).
```

```
REQUIREMENT: In addition to the annual penetration testing cycle, ad-hoc
             penetration testing MUST be triggered by any of the following events:
             1. Major architecture change (e.g., migration from monolith to
                microservices, database platform change, new cloud provider).
             2. Post-incident: after any security incident classified as
                Severity >= 3 per the incident classification matrix (§68).
             3. New MCP/A2A endpoint exposure: when new diagnostic or audit
                access endpoints are deployed.
             4. Audit trail backend migration: when the AuditTrailPort adapter
                is changed to a different storage technology.
             5. Key management infrastructure change: when the HSM, secrets
                manager, or key storage solution is replaced or upgraded.
             Ad-hoc testing MUST be scoped to the affected components and
             documented with the same rigor as annual assessments.
             Reference: NIST SP 800-53 CA-8 (Penetration Testing).
```

### 64f-2. Rate Limiting Guidance

Rate limiting is a defense-in-depth control that protects the guard pipeline and audit trail infrastructure from abuse, accidental denial-of-service, and resource exhaustion.

```
RECOMMENDED: Organizations SHOULD configure rate limiting at two levels:
             1. **Guard evaluation rate:** Use the maxEvaluationsPerSecond option
                on createGuardGraph() to cap per-scope evaluation throughput.
                Recommended default: 1,000 evaluations/sec/scope for API-facing
                deployments; 10,000 for internal batch processing.
             2. **Audit trail write rate:** The AuditTrailPort adapter SHOULD
                implement write-side rate limiting or backpressure to prevent
                thundering-herd scenarios from overwhelming the backing store.
                When backpressure is applied, the adapter SHOULD return
                Err(AuditTrailWriteError) with a "rate_limited" category rather
                than silently dropping entries.
             3. **Re-authentication rate:** Per §65b, the reauthenticate()
                method SHOULD enforce rate limiting (default: 5 attempts per
                15-minute window per signerId) to prevent credential brute-force.
             4. **MCP/A2A endpoint rate:** When MCP resources and A2A skills
                are exposed (§12-inspection.md), HTTP-level rate limiting SHOULD
                be applied to prevent audit data exfiltration via rapid queries.
             Rate limit thresholds SHOULD be documented in the PQ protocol (§67c)
             and verified during PQ-6 (concurrent scope scaling).
             Reference: OWASP ASVS V11 (Business Logic Security).
```

---

## 64g. Administrative Authority Checks

Per 21 CFR 11.10(g), systems must employ "authority checks to ensure that only authorized individuals can use the system, electronically sign a record, access the operation or computer system input or output device, alter a record, or perform the operation at hand." While sections 25-30 (07-guard-adapter.md) and 08-port-gate-hook.md address authority checks for **application-level** operations (port resolution, method invocation), this section addresses authority checks for **system administration** operations on the guard infrastructure itself.

### Scope

Administrative operations are operations that modify or inspect the guard system's own configuration, audit data, or compliance posture. Unlike application-level operations (which are enforced by guard policies on business ports), administrative operations target the guard infrastructure itself and require a distinct authorization model.

### Administrative Operation Categories

| Category                     | Operations                                                                                                                                                                                                           | Risk Level                                     |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Guard Configuration**      | Policy modification (`deserializePolicy()`, hot-reload), adapter swap (AuditTrailPort, SignatureServicePort, SubjectProviderPort), `failOnAuditError` toggle, `maxScopeLifetimeMs` changes, rate limit configuration | Critical — directly affects compliance posture |
| **Audit Trail Query/Export** | `AuditQueryPort` queries, `exportEntries()`, `hexdi://guard/audit` MCP resource, `guard.audit-review` A2A skill                                                                                                      | High — access to regulated records             |
| **Meta-Audit Access**        | `MetaAuditTrailPort` queries, meta-audit chain verification                                                                                                                                                          | High — access to access records                |
| **Key Management**           | Key rotation, key revocation, HSM configuration, algorithm migration                                                                                                                                                 | Critical — affects signature integrity         |
| **Policy Change Approval**   | `PolicyChangeAuditEntry` creation, change request approval, emergency change authorization                                                                                                                           | Critical — controls what access is permitted   |
| **Inspection Data**          | `hexdi://guard/snapshot`, `hexdi://guard/policies`, `hexdi://guard/decisions`, `hexdi://guard/stats` MCP resources, `guard.inspect-policies` A2A skill                                                               | Medium — exposes authorization model           |

```
REQUIREMENT: In GxP environments (gxp: true), every administrative operation category
             listed above MUST be restricted to authorized personnel only. Access
             MUST be enforced programmatically — reliance on procedural controls alone
             (e.g., "only admins should call this function") is insufficient.
             Reference: 21 CFR 11.10(g), EU GMP Annex 11 §12.1.
```

### Administrative Roles

Organizations MUST define and document administrative roles that map to the operation categories above. The following role taxonomy is RECOMMENDED as a starting point:

| Role                    | Permitted Operations                                                                         | Separation of Duties Constraint                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Guard Administrator** | Guard configuration, adapter management, rate limit configuration                            | MUST NOT also hold Audit Reviewer or Key Custodian role                                           |
| **Audit Reviewer**      | Audit trail queries, exports, meta-audit access, inspection data                             | MUST NOT also hold Guard Administrator role                                                       |
| **Key Custodian**       | Key rotation, key revocation, HSM configuration, algorithm migration                         | MUST NOT also hold Guard Administrator role; dual-person control RECOMMENDED for key revocation   |
| **Policy Approver**     | Policy change approval, emergency change authorization                                       | MUST NOT be the same person who authored the policy change (separation of duties per section 64a) |
| **Compliance Officer**  | All read-only operations across all categories; periodic review execution                    | No write access to configuration or keys                                                          |
| **Quality Reviewer**    | Policy change review, OQ/PQ report review, deviation review, periodic access review sign-off | MUST NOT also hold Guard Administrator or Key Custodian role                                      |

### Role Incompatibility Matrix

The following matrix defines which administrative role pairs MUST NOT be held simultaneously by the same person. Incompatible pairs are marked with **X**. These constraints enforce defense-in-depth separation of duties — no single compromised account should be able to both alter access controls and conceal the alteration.

|                         | Guard Admin | Audit Reviewer | Key Custodian | Policy Approver | Compliance Officer | Quality Reviewer |
| ----------------------- | ----------- | -------------- | ------------- | --------------- | ------------------ | ---------------- |
| **Guard Administrator** | —           | **X**          | **X**         | **X**           | —                  | **X**            |
| **Audit Reviewer**      | **X**       | —              | —             | —               | —                  | —                |
| **Key Custodian**       | **X**       | —              | —             | —               | —                  | **X**            |
| **Policy Approver**     | **X**       | —              | —             | —               | —                  | —                |
| **Compliance Officer**  | —           | —              | —             | —               | —                  | —                |
| **Quality Reviewer**    | **X**       | —              | **X**         | —               | —                  | —                |

**Rationale for each incompatibility:**

| Pair                             | Rationale                                                                                                                                                                                          |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guard Admin + Audit Reviewer     | An administrator who modifies guard configuration must not be able to review (and potentially dismiss) audit evidence of their own changes. Reference: 21 CFR 11.10(g), EU GMP Annex 11 §12.1.     |
| Guard Admin + Key Custodian      | A single person controlling both policy configuration and signing keys could alter access controls and forge signatures to conceal the change. Reference: 21 CFR 11.300(b).                        |
| Guard Admin + Policy Approver    | The person who implements configuration changes must not be the same person who approves them. This is the foundational maker-checker control. Reference: 21 CFR 11.10(k)(2), EU GMP Annex 11 §10. |
| Guard Admin + Quality Reviewer   | The person who modifies guard configuration must not be the same person who reviews and approves validation evidence (OQ/PQ reports) for those changes. Reference: EU GMP Annex 11 §1, ICH Q10.    |
| Key Custodian + Quality Reviewer | The person who manages cryptographic keys must not review the quality evidence for key management operations, preventing self-certification. Reference: EU GMP Annex 11 §1.                        |

> **Note:** The Compliance Officer role is intentionally compatible with all other roles because it has **read-only** access across all categories. No write access to configuration or keys means no maker-checker conflict exists.

```
REQUIREMENT: No person MUST hold more than 2 administrative roles simultaneously.
             This maximum role accumulation limit prevents concentration of privileges
             that could undermine separation of duties, even among compatible role pairs.
             Exceptions MUST be documented with a risk assessment per ICH Q9 and approved
             by the quality unit. The exception documentation MUST include:
             (1) the specific roles held by the individual,
             (2) the business justification for the exception,
             (3) compensating controls (e.g., enhanced audit review of the individual's
                 activities, periodic access review at increased frequency),
             (4) an expiration date for the exception (maximum 12 months, renewable).
             Reference: 21 CFR 11.10(g), EU GMP Annex 11 §12.1,
             PIC/S PI 011-3 §9.5.

REQUIREMENT: The role incompatibility matrix above MUST be enforced programmatically
             when AdminGuardConfig is active. The withAdminGuard() combinator MUST
             reject subject role assignments that violate the incompatibility matrix
             at evaluation time — returning AccessDeniedError with code ACL017 and
             a diagnostic identifying the incompatible role pair. Organizations MAY
             extend the matrix with additional site-specific incompatibilities.
             Reference: 21 CFR 11.10(g).
```

```
REQUIREMENT: Organizations MUST document the mapping of personnel to administrative
             roles in a controlled document (e.g., access control matrix or role
             assignment register). The mapping MUST be reviewed during each periodic
             review cycle (section 64) and updated within 5 business days of any
             personnel change (role assignment, departure, transfer). Stale role
             assignments (personnel no longer requiring access) MUST be revoked
             within 24 hours of identification.
             Reference: 21 CFR 11.10(g), EU GMP Annex 11 §12.4,
             PIC/S PI 011-3 §9.5.

REQUIREMENT: Separation of duties MUST be enforced for administrative roles.
             At minimum:
             (1) The person who modifies a guard configuration MUST NOT be the same
                 person who approves the change (per section 64a).
             (2) The person who manages signing keys MUST NOT be the same person who
                 administers guard policies. This prevents a single compromised
                 account from both altering access controls and forging signatures.
             (3) Personnel with audit trail write access (application service
                 accounts) MUST NOT have audit trail query/export access. Reviewers
                 MUST have read-only access (per section 64, "Audit Trail Access
                 Control").
             Exceptions to separation of duties MUST be documented with a risk
             assessment per ICH Q9 and approved by the quality unit.
             Reference: 21 CFR 11.10(g), 21 CFR 11.300(b),
             EU GMP Annex 11 §12.1.
```

### Enforcement Mechanism

The guard library provides the `AdminOperationPolicy` type and `withAdminGuard()` combinator to enforce authority checks on administrative operations. This uses the same policy evaluation infrastructure as application-level guard policies, ensuring consistent enforcement semantics.

```typescript
/**
 * Administrative operation identifiers used as discriminants for
 * admin-level authority checks.
 */
type AdminOperation =
  | "guard:config:modify"
  | "guard:config:read"
  | "guard:audit:query"
  | "guard:audit:export"
  | "guard:meta-audit:query"
  | "guard:keys:rotate"
  | "guard:keys:revoke"
  | "guard:policy:approve"
  | "guard:policy:emergency"
  | "guard:inspection:read";

/**
 * Policy governing access to a specific administrative operation.
 */
interface AdminOperationPolicy {
  readonly operation: AdminOperation;
  readonly policy: PolicyConstraint;
}

/**
 * Configuration for administrative authority checks.
 *
 * Maps each administrative operation to a policy that must be satisfied
 * before the operation is permitted. Unlisted operations are denied by
 * default (deny-by-default).
 */
interface AdminGuardConfig {
  readonly policies: readonly AdminOperationPolicy[];
}

/**
 * Multi-tenant deployments: when a single @hex-di/guard installation
 * serves multiple tenants (e.g., SaaS platform with per-tenant policies),
 * each tenant SHOULD have an isolated AdminGuardConfig. Cross-tenant
 * administrative operations (e.g., Tenant A admin modifying Tenant B policies)
 * MUST be prevented by the AdminGuardConfig policy rules.
 */
```

```
REQUIREMENT: When gxp is true, administrative operations MUST be deny-by-default.
             Any administrative operation not explicitly listed in AdminGuardConfig
             MUST be rejected with an AccessDeniedError containing error code ACL017
             ("administrative operation not authorized"). This deny-by-default posture
             ensures that new administrative operations added in future library versions
             are not accidentally unprotected.
             Reference: 21 CFR 11.10(g).

REQUIREMENT: When gxp is true, the checkGxPReadiness() diagnostic MUST verify that
             an AdminGuardConfig is registered and that all Critical and High risk-level
             operation categories (guard configuration, audit trail query/export,
             meta-audit access, key management, policy change approval) have at least
             one policy entry. Missing policy entries for these categories MUST cause
             checkGxPReadiness() to report a FAIL result with diagnostic code
             "guard.admin-authority-unconfigured".
             Reference: 21 CFR 11.10(g), 21 CFR 11.10(a).

REQUIREMENT: Every administrative operation — whether permitted or denied — MUST be
             recorded in the administrative event log (section 64b). The log entry
             MUST include: (1) the AdminOperation identifier, (2) the subject identity
             of the person or service account attempting the operation, (3) the
             evaluation result (allow/deny), (4) the policy that governed the decision,
             (5) timestamp (ISO 8601 UTC), and (6) for denied operations, the denial
             reason. This ensures full traceability of who attempted what administrative
             action and whether it was authorized.
             Reference: 21 CFR 11.10(e), 21 CFR 11.10(g),
             EU GMP Annex 11 §12.3, PIC/S PI 011-3 §9.5.
```

````
RECOMMENDED: In non-GxP environments, organizations SHOULD still configure
             AdminGuardConfig to restrict sensitive operations (audit trail export,
             key management, policy modification). The deny-by-default behavior MAY
             be relaxed to allow-by-default in non-GxP environments by setting
             defaultAction: "allow" in AdminGuardConfig, but this is NOT RECOMMENDED
             for any environment handling sensitive data.

RECOMMENDED: Organizations SHOULD use the hasRole() policy variant for administrative
             authority checks, mapping the role taxonomy above to guard roles:
             ```
             const adminConfig: AdminGuardConfig = {
               policies: [
                 { operation: "guard:config:modify", policy: hasRole("guard-admin") },
                 { operation: "guard:audit:query", policy: hasRole("audit-reviewer") },
                 { operation: "guard:audit:export", policy: hasRole("audit-reviewer") },
                 { operation: "guard:meta-audit:query", policy: hasRole("compliance-officer") },
                 { operation: "guard:keys:rotate", policy: hasRole("key-custodian") },
                 { operation: "guard:keys:revoke", policy: allOf(hasRole("key-custodian"), hasRole("guard-admin")) },
                 { operation: "guard:policy:approve", policy: hasRole("policy-approver") },
                 { operation: "guard:policy:emergency", policy: hasRole("compliance-officer") },
                 { operation: "guard:inspection:read", policy: anyOf(hasRole("audit-reviewer"), hasRole("compliance-officer")) },
               ],
             };
             ```
             This example uses dual-role authorization for key revocation (requiring
             both key-custodian and guard-admin), reflecting the dual-person control
             recommendation for key management operations.
````

````
RECOMMENDED: Organizations operating under EU GMP Annex 11 §1 — which requires
             that the quality management system include the computerized system
             lifecycle and that the quality unit (QA/QP) has oversight of all
             computerized system activities — SHOULD include a "quality-reviewer"
             role in their AdminGuardConfig. The quality-reviewer role provides
             QA with read access to validation artifacts and write access to
             review/approval workflows without granting operational control:

             ```
             // Quality Reviewer role in AdminGuardConfig
             { operation: "guard:audit:query", policy: hasRole("quality-reviewer") },
             { operation: "guard:inspection:read", policy: hasRole("quality-reviewer") },
             { operation: "guard:policy:approve", policy: anyOf(hasRole("policy-approver"), hasRole("quality-reviewer")) },
             ```

             This role maps to EU GMP Annex 11 §1 requirements by ensuring:
             (a) QA can independently review audit trail data and guard
                 configuration without depending on Guard Administrators for
                 access.
             (b) QA can participate in policy change approval workflows,
                 fulfilling the "QA sign-off" recommended in §64a.
             (c) QA maintains independence from operational roles (Guard
                 Administrator, Key Custodian) per the incompatibility matrix.
             (d) The Qualified Person (QP) or QA delegate has sufficient
                 system access to fulfill their Annex 11 §1 oversight
                 responsibilities for batch release and deviation review.
             Reference: EU GMP Annex 11 §1, ICH Q10 (pharmaceutical quality
             system), PIC/S PI 011-3 §7.2.
````

### Integration with Existing Sections

Administrative authority checks integrate with the following existing spec sections:

- **Section 64 (Audit Trail Review Interface):** The existing REQUIREMENT for access lifecycle controls (periodic reviews, prompt revocation) applies to administrative roles as defined here. The `AdminGuardConfig` provides the programmatic enforcement mechanism for the access control requirements already specified in section 64.
- **Section 64a (Policy Change Control):** The separation of duties requirements in section 64a (change author ≠ change approver) are enforced by the `guard:policy:approve` operation policy. The `AdminGuardConfig` makes this enforcement programmatic rather than purely procedural.
- **Section 64b (Administrative Activity Monitoring):** All administrative operation evaluations (allow and deny) are recorded in the administrative event log. The `AdminOperation` identifier provides structured categorization for the "nature of the change" field already required by section 64b.
- **Section 64c (Training and Competency):** Personnel MUST NOT be assigned to administrative roles until their training record confirms completion of the training areas relevant to their role (e.g., key custodians must complete key management training per section 65c).
- **Section 12-inspection.md (MCP Resources / A2A Skills):** The existing authentication REQUIREMENT for MCP/A2A endpoints (section 44d) is extended by the `guard:inspection:read`, `guard:audit:query`, and `guard:meta-audit:query` operation policies, which provide operation-specific authorization in addition to endpoint-level authentication.

### 64h. Emergency Bypass Procedure ("Break Glass")

In pharmaceutical manufacturing and other GxP-critical contexts, a guard system failure could halt production or prevent required quality decisions. This section defines the emergency bypass procedure for situations where the guard system itself becomes unavailable or critically misconfigured.

#### Activation Conditions

```
REQUIREMENT: The emergency bypass procedure MUST only be activated when ALL of
             the following conditions are met:
             1. The guard system is confirmed unavailable or critically
                misconfigured (not merely degraded).
             2. A GxP-critical operation requires an authorization decision
                that cannot be deferred (e.g., batch release, safety decision,
                deviation investigation).
             3. Two authorized personnel (one with the "emergency-responder"
                administrative role, one with the "security-officer" or
                "qa-auditor" role) jointly confirm the activation.
             Reference: EU GMP Annex 11 §14, 21 CFR 11.10(a).
```

#### Manual Authorization During Bypass

```
REQUIREMENT: During an active bypass period, all authorization decisions MUST be
             recorded using a pre-approved paper-based or offline-electronic
             procedure that captures:
             - Subject identity (who requested access)
             - Resource/operation requested
             - Decision (allow/deny) and rationale
             - Authorizer identity (who approved the manual decision)
             - Timestamp (wall-clock, witnessed by second authorized person)
             - Bypass activation reference (linking to the activation record)
             The paper-based procedure MUST be defined, approved, and tested
             as part of the organization's SOPs before any bypass is needed.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §14.
```

#### Maximum Bypass Duration

```
REQUIREMENT: The maximum bypass duration MUST NOT exceed 4 hours. If the guard
             system cannot be restored within 4 hours, the situation MUST be
             escalated to senior management and regulatory affairs for a
             risk-based extension decision. Any extension MUST be documented
             with justification and capped at 24 hours total. Beyond 24 hours,
             the organization MUST initiate formal deviation and CAPA
             procedures.
             Reference: EU GMP Annex 11 §14, ICH Q9 (risk-based decision).
```

#### Post-Bypass Reconciliation

```
REQUIREMENT: Upon guard system restoration, ALL manual authorization decisions
             recorded during the bypass period MUST be retroactively entered
             into the electronic audit trail within 24 hours. Each reconciled
             entry MUST:
             - Include the original manual decision details
             - Be flagged with a "bypass_reconciliation" metadata tag
             - Reference the bypass activation and deactivation records
             - Be reviewed and counter-signed by a QA Auditor
             The reconciliation MUST be verified by comparing the count of
             paper-based records against the count of reconciled electronic
             entries. Any discrepancy MUST trigger an incident investigation.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9.
```

#### Regulatory Notification Assessment

```
REQUIREMENT: After every bypass event, the organization MUST perform a regulatory
             notification assessment to determine whether the event constitutes
             a reportable incident under applicable regulations (e.g., FDA field
             alert, EMA variation, national authority notification). The
             assessment MUST be completed within 5 business days of bypass
             deactivation and documented in the CAPA record.
             Reference: 21 CFR 11.10(a), EU GMP Annex 11 §14.
```

#### Bypass Procedure Validation

```
REQUIREMENT: The emergency bypass procedure MUST be validated annually through a
             tabletop exercise that tests activation, manual authorization,
             reconciliation, and deactivation. The exercise results MUST be
             documented and any deficiencies remediated before the next
             exercise cycle.
             Reference: GAMP 5 Category 5, EU GMP Annex 11 §4.
```

---

### 64g-2. Periodic User Access Review

In addition to the administrative role mapping review (§64g), organizations must periodically review standard subject access to guarded ports.

```
REQUIREMENT: When gxp is true, organizations MUST conduct periodic user access
             reviews covering ALL subjects with access to guarded ports — not
             only administrative roles. The review cadence MUST be:
             (a) Quarterly: Review all subjects with access to GxP-critical
                 guarded ports (ports protecting patient safety data, batch
                 release decisions, or regulatory submissions).
             (b) Semi-annually: Review all other subjects with access to
                 guarded ports in GxP-validated systems.
             (c) On-demand: Immediately upon organizational changes (mergers,
                 reorganizations, team transfers) that affect access patterns.
             Each review MUST document:
             (1) Reviewer identity and date.
             (2) Total subjects reviewed and total active access grants.
             (3) Subjects whose access was confirmed as appropriate (with
                 justification category: job role, project assignment, etc.).
             (4) Subjects whose access was revoked (with revocation reason).
             (5) Subjects whose access was modified (with change description).
             Revocations identified during the review MUST be executed within
             5 business days of the review completion.
             Reference: EU GMP Annex 11 §12.4, 21 CFR 11.10(d),
             PIC/S PI 011-3 §9.6.

RECOMMENDED: In non-GxP environments, organizations SHOULD conduct annual
             user access reviews following the same documentation standard.
```

### 64g-3. Account Provisioning and Deprovisioning Lifecycle

```
REQUIREMENT: When gxp is true, organizations MUST define and follow a formal
             account provisioning and deprovisioning lifecycle for all subjects
             that access guarded ports:

             **Provisioning (onboarding):**
             (a) Access requests MUST be submitted via a documented approval
                 workflow (e.g., ticket system, electronic form).
             (b) Each request MUST specify: the subject identity, the guarded
                 ports requiring access, the role(s) to be assigned, and the
                 business justification.
             (c) Access MUST be approved by the subject's manager AND the
                 guard system owner (or delegate) before provisioning.
             (d) The provisioning event MUST be recorded in the administrative
                 event log (§64b) with: subject identity, roles assigned,
                 approver identity, and effective date.
             (e) The subject MUST complete role-specific training (§64c)
                 before access is activated.

             **Deprovisioning (offboarding):**
             (f) Upon employment termination, role transfer, or project
                 completion, access MUST be revoked within 24 hours.
             (g) For immediate terminations (e.g., cause, security incident),
                 access MUST be revoked within 1 hour.
             (h) The deprovisioning event MUST be recorded in the administrative
                 event log with: subject identity, roles revoked, revoker
                 identity, reason, and effective timestamp.
             (i) Active scopes for deprovisioned subjects MUST be invalidated
                 via maxScopeLifetimeMs expiration or explicit scope disposal.
             (j) A confirmation audit MUST verify that all access has been
                 removed within 5 business days of deprovisioning.

             Reference: EU GMP Annex 11 §12.4, 21 CFR 11.10(d),
             PIC/S PI 011-3 §9.6.

RECOMMENDED: Organizations SHOULD integrate the guard access lifecycle with
             their enterprise identity management system (e.g., SCIM, LDAP
             sync) to automate provisioning and deprovisioning. Manual
             processes are acceptable but SHOULD be supplemented with periodic
             reconciliation against the IdP directory.
```

### 64g-4. Recommended maxScopeLifetimeMs for GxP

```
REQUIREMENT: When gxp is true, maxScopeLifetimeMs MUST be configured on
             the guard graph (per §07-guard-adapter.md). The following
             values are RECOMMENDED based on the risk profile of the
             deployment:

             | Risk Profile | Recommended maxScopeLifetimeMs | Rationale |
             |-------------|-------------------------------|-----------|
             | High-risk (batch release, regulatory submission) | 300,000 (5 minutes) | Aligns with re-authentication token ceiling (§65b) |
             | Standard GxP (routine manufacturing, lab operations) | 900,000 (15 minutes) | Balances security with operational usability |
             | Low-risk GxP (read-only monitoring, reporting) | 3,600,000 (1 hour) | Minimizes scope refresh disruption for read-only ops |

             The configured value MUST be documented in the validation plan
             (section 67) with justification based on the deployment's risk
             assessment. The absolute maximum for any GxP deployment MUST NOT
             exceed 3,600,000 ms (1 hour).
             Reference: 21 CFR 11.10(d), EU GMP Annex 11 §12.
```

### 64a-4. Change Impact Assessment Template

```
REQUIREMENT: When gxp is true, every policy change request (per §64a) MUST
             include a structured impact assessment using the following
             template:

             **Change Impact Assessment**
             | Field | Description |
             |-------|-------------|
             | Change Request ID | Unique identifier (e.g., CR-GUARD-2025-042) |
             | Change Description | Concise description of what is being changed |
             | Affected Ports | List of guarded ports affected by the change |
             | Affected Subjects | Categories of subjects whose access will change |
             | Risk Classification | Low / Medium / High (per ICH Q9) |
             | Reversibility | Fully reversible / Partially reversible / Irreversible |
             | Rollback Plan | Steps to revert the change if issues are detected |
             | OQ Re-run Required | Yes / No (per §64a re-validation triggers) |
             | Cross-Library Impact | Does this change affect @hex-di/http-client or other co-deployed libraries? |
             | Testing Evidence | Reference to test execution that validates the change |
             | Author | Identity of the person who prepared the assessment |
             | Approver | Identity of the person who approved the assessment (MUST NOT be the author) |
             | Date | Assessment date |

             The completed assessment MUST be archived alongside the
             PolicyChangeAuditEntry. Impact assessments for High-risk changes
             MUST additionally be reviewed by the Compliance Officer before
             deployment.
             Reference: EU GMP Annex 11 §10, GAMP 5 (change management),
             ICH Q9.

RECOMMENDED: Organizations SHOULD maintain an electronic form or template
             system that enforces completion of all mandatory fields before
             a change request can be submitted for approval.
```

### 64a-5. Change Freeze Periods

```
REQUIREMENT: When gxp is true, organizations MUST define and enforce change
             freeze periods during which no guard policy or configuration
             changes are permitted (except emergency changes per §64a-ext).
             At minimum, the following change freeze periods MUST be observed:
             (a) During GxP batch release operations: No guard configuration
                 changes from batch start to batch disposition.
             (b) During regulatory inspections or audits: No guard
                 configuration changes from inspection start to close-out.
             (c) During PQ soak testing: No guard configuration changes for
                 the duration of the soak test (minimum 4 hours per §67c).
             (d) During disaster recovery procedures: No guard configuration
                 changes until the recovery is verified and normal operations
                 are restored.
             Change freeze periods MUST be communicated to all personnel with
             guard:config:modify or guard:policy:approve access. Changes
             attempted during a freeze MUST be rejected with code ACL018
             ("Configuration change blocked: change freeze period active")
             and logged in the administrative event log (§64b).
             Reference: EU GMP Annex 11 §10, GAMP 5.

RECOMMENDED: Organizations SHOULD implement automated change freeze
             enforcement via a changeFreezeUntil configuration parameter
             on AdminGuardConfig that programmatically blocks configuration
             changes until the specified timestamp.
```

### 64g-5. Role Assignment and Revocation Auditing

```
REQUIREMENT: When gxp is true, ALL role assignment and revocation events
             for subjects accessing guarded ports MUST be recorded in the
             administrative event log (§64b). Each role change event MUST
             include:
             (a) Subject identity (subjectId) whose roles changed.
             (b) Roles added and/or roles removed.
             (c) Actor identity (the person who performed the change).
             (d) Approver identity (if different from actor, per approval
                 workflow).
             (e) Reason for the change (e.g., onboarding, role transfer,
                 access review finding, security incident).
             (f) Timestamp (ISO 8601 UTC).
             (g) Whether the change was a standard provisioning, periodic
                 review adjustment, or emergency revocation.
             These events MUST be included in periodic access review reports
             (§64g-2) and MUST be retained for the same period as
             administrative event log entries (§64b).
             Reference: EU GMP Annex 11 §12.4, 21 CFR 11.10(g),
             PIC/S PI 011-3 §9.5.

REQUIREMENT: Role change events MUST be queryable by subject, by actor,
             by date range, and by change type (assignment/revocation) to
             support access review and incident investigation workflows.
             Reference: ALCOA+ Available.
```

---

---

_Previous: [Audit Trail Review](./05-audit-trail-review.md) | Next: [Electronic Signatures](./07-electronic-signatures.md)_
