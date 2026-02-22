# 17 - GxP Compliance: Validation Plan

<!-- Document Control
| Property         | Value                                    |
|------------------|------------------------------------------|
| Document ID      | GUARD-17-09                              |
| Revision         | 1.4                                      |
| Effective Date   | 2026-02-20                               |
| Author           | HexDI Engineering                        |
| Reviewer         | GxP Compliance Review                    |
| Approved By      | Regulatory Affairs Lead, Quality Assurance Manager |
| Classification   | GxP Compliance Sub-Specification         |
| Change History   | 1.4 (2026-02-20): Updated OQ-1 scope note total from 21 DoD/707 → 29 DoD/1294 tests (CCR-GUARD-045) |
|                  | 1.3 (2026-02-13): Added OQ-38 through OQ-42 (predicate rule mapping, certificate chain, algorithm migration, policy input schema, attribute accuracy) |
|                  | 1.2 (2026-02-13): Added OQ-32 through OQ-37 (negative/adversarial tests), OQ-to-test traceability, mutation testing tool, strengthened UAT criteria |
|                  | 1.1 (2026-02-13): Added PQ-10 audit write latency SLA, DR test procedure template (§67f), UAT script template (§67g) |
|                  | 1.0 (2026-02-13): Initial controlled release |
-->

_Previous: [Compliance Verification](./08-compliance-verification.md) | Next: [Risk Assessment](./10-risk-assessment.md)_

---

## 67. Validation Plan (IQ/OQ/PQ)

This section defines the formal validation plan required by GAMP 5 Category 5 (custom software) for `@hex-di/guard` deployments in GxP-regulated environments.

> **REQUIREMENT:** The validation plan MUST be linked to the site-level Validation Master Plan (VMP). Guard spec documents (`spec/guard/*.md`) serve as the Functional Specification (FS). Organizations MUST map IQ/OQ/PQ test cases back to specific spec section requirements for bi-directional traceability per WHO TRS 996 Annex 5. This ensures every requirement has corresponding test evidence and every test case traces to a documented requirement. Reference: GAMP 5, WHO TRS 996 Annex 5.

```
REQUIREMENT: The @hex-di/guard validation plan (IQ/OQ/PQ) MUST be linked to and
             approved under the site-level Validation Master Plan (VMP) before
             execution. The VMP MUST reference the guard system by name, version,
             and classification (GAMP 5 Category 5). The VMP linkage MUST be
             documented in the validation report (section 67d) with the VMP
             document identifier and approval date.
             Reference: GAMP 5 Section 4.4, WHO TRS 996 Annex 5, EU GMP Annex 11
             Section 4.3.
```

```
REQUIREMENT: Consumer organizations deploying @hex-di/guard in GxP environments
             MUST document the scope and results of their User Acceptance Testing
             (UAT) per EU GMP Annex 11 Section 4.4. The UAT documentation MUST
             include:
             (1) The UAT scope statement identifying which guard-protected ports,
                 policies, and subject personas are covered.
             (2) Representative subject scenarios (viewer, editor, admin personas)
                 with expected outcomes.
             (3) Positive test cases (authorized access granted) with evidence.
             (4) Negative test cases (unauthorized access denied) with evidence.
             (5) Audit trail review by QA confirming entries are legible and complete
                 for all test scenarios.
             (6) Sign-off by the system owner confirming fitness for intended use.
             (7) Any deviations observed during UAT and their disposition.
             UAT documentation MUST be retained alongside the IQ/OQ/PQ validation
             artifacts under the site's document control system. UAT is a consumer
             responsibility and is separate from the library-level OQ testing
             defined in section 67b.
             Reference: EU GMP Annex 11 §4.4, GAMP 5 (user acceptance testing).

REQUIREMENT: UAT scenarios MUST include, at minimum:
             (a) At least 3 distinct user personas (e.g., operator, reviewer,
                 administrator) reflecting the actual role hierarchy.
             (b) At least 5 positive test scenarios (subjects with correct
                 permissions are granted access).
             (c) At least 5 negative test scenarios (subjects without required
                 permissions are denied access).
             (d) At least 2 boundary test scenarios (subjects at the edge of
                 permission grants — e.g., expired scope, role just removed,
                 newly provisioned subject).
             (e) At least 1 audit trail verification scenario (retrieve and
                 review audit entries for a completed UAT scenario, confirming
                 all ALCOA+ principles are satisfied in the actual entry).
             (f) At least 1 electronic signature scenario (if signatures are
                 used): capture → validate → review cycle with a real
                 signerId and re-authentication flow.
             For deployments guarding more than 5 ports, the scenario count
             MUST scale proportionally: at minimum 1 positive and 1 negative
             scenario per guarded port, in addition to the baseline 5+5.
             The UAT pass threshold is: 100% of positive scenarios pass,
             100% of negative scenarios correctly deny access, and the audit
             trail verification confirms complete and accurate entries.
             Reference: GAMP 5 Category 5, EU GMP Annex 11 §4.4.

RECOMMENDED: In non-GxP environments, consumer organizations SHOULD conduct UAT
             following the same structure described above to validate the guard
             configuration against the site's specific access control requirements.
```

```
REQUIREMENT: All validation artifacts (IQ/OQ/PQ reports, the Validation Report, the FMEA,
             and the regulatory traceability matrices) MUST be subject to the site's
             document control system per 21 CFR 11.10(k). Each artifact MUST carry a
             unique document identifier (as shown in the report templates below), a version
             number, and an approval history. Superseded versions MUST be archived but
             remain accessible for the retention period. The GxP compliance specification
             itself (this document) MUST be version-controlled alongside the guard library
             source code, with changes following the policy change control process defined
             in section 64a. All guard library specification documents (chapters 01 through
             17) MUST be maintained under the site's document control system per
             21 CFR 11.10(k). When the specification documents reside in a version-controlled
             source repository, the repository itself MUST be subject to the site's change
             control process.
```

```
RECOMMENDED: Organizations SHOULD run `checkPreDeploymentCompliance()` as a
             pre-qualification step before executing IQ/OQ/PQ. This function
             validates that the organizational artifacts required by the compliance
             verification checklist (section 66) — retention policy, change control
             procedures, training records, inspector access procedures, periodic
             review schedule, SBOM, backup/DR documentation, and risk-based review
             frequency — are referenced and available. Running this check in CI
             before GxP deployments provides early detection of missing procedural
             documentation that would cause compliance verification failures.
             See 07-guard-adapter.md for the full specification.
```

### 67a. Installation Qualification (IQ)

IQ verifies that `@hex-di/guard` is correctly installed in the target environment.

#### IQ Checklist

| #     | Check                                       | Method                                                                                                                  | Pass Criteria                                                                                                    |
| ----- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| IQ-1  | Package version matches approved version    | `npm ls @hex-di/guard`                                                                                                  | Exact version match                                                                                              |
| IQ-2  | Core peer dependency satisfied              | `npm ls @hex-di/core`                                                                                                   | Version within peer range                                                                                        |
| IQ-3  | Node.js runtime version                     | `node --version`                                                                                                        | >= 18.0.0                                                                                                        |
| IQ-4  | TypeScript compiler version                 | `npx tsc --version`                                                                                                     | >= 5.0.0                                                                                                         |
| IQ-5  | TypeScript compilation passes               | `pnpm typecheck`                                                                                                        | Zero errors                                                                                                      |
| IQ-6  | ESLint passes                               | `pnpm lint`                                                                                                             | Zero errors, zero warnings                                                                                       |
| IQ-7  | No eslint-disable in production source      | `grep -r "eslint-disable" src/ --exclude-dir=tests --exclude-dir=__tests__ --exclude="*.test.ts" --exclude="*.spec.ts"` | Zero matches                                                                                                     |
| IQ-8  | Package integrity verification              | `npm audit signatures` or verify integrity hash in `pnpm-lock.yaml`                                                     | Integrity hash matches published value                                                                           |
| IQ-9  | Dependency vulnerability scan               | `pnpm audit` or equivalent (Snyk, npm audit)                                                                            | No critical or high severity vulnerabilities in production dependencies                                          |
| IQ-10 | No signing keys or secrets in source        | `grep -rE "PRIVATE KEY\|-----BEGIN\|secret.*=.*[A-Za-z0-9+/]{20}" src/`                                                 | Zero matches                                                                                                     |
| IQ-11 | Audit trail backing store encrypted at rest | Verify TDE configuration, SSE settings, or FDE status on target storage                                                 | Encryption enabled with AES-256 or equivalent NIST-approved algorithm                                            |
| IQ-12 | SBOM generation (when gxp: true)            | `npm sbom`, CycloneDX, or SPDX tool                                                                                     | Machine-readable SBOM produced listing all direct and transitive dependencies with versions and integrity hashes |

```
REQUIREMENT: When gxp is true, organizations MUST generate a Software Bill of
             Materials (SBOM) for the full dependency tree as part of IQ. The SBOM
             MUST be produced using a recognized standard format (CycloneDX or SPDX)
             and MUST include: all direct and transitive dependencies, their versions,
             and their integrity hashes. The SBOM MUST be archived alongside the IQ
             report and retained for the system lifecycle. This supports FDA
             cybersecurity guidance and provides traceability for vulnerability
             management.
             Reference: FDA Cybersecurity Guidance (2023), EU GMP Annex 11 §3.

RECOMMENDED: In non-GxP environments, organizations SHOULD generate an SBOM for
             the full dependency tree and verify transitive dependency integrity as
             part of IQ. SBOM generation tools (e.g., `npm sbom`, CycloneDX, SPDX)
             SHOULD produce a machine-readable inventory of all direct and transitive
             dependencies, their versions, and their integrity hashes.
```

#### IQ Report Template

```
IQ Report — @hex-di/guard
─────────────────────────────────────────
Document ID:        IQ-GUARD-[VERSION]-[SEQ]
Revision:           [revision number, e.g., 1.0]
Revision History:   [table of: revision, date, author, change description]
System:             @hex-di/guard
Version:            [installed version]
Environment:        [Node.js version, OS, architecture]
Dependency Tree:    [output of npm ls @hex-di/guard --all]
SBOM:               [attached SBOM file path and format (CycloneDX/SPDX), or "N/A — non-GxP"]
Executor:           [name and role]
Execution Date:     [ISO 8601]
Results:            [PASS/FAIL for each IQ check]
Deviations:         [list any deviations and justification]
Conclusion:         [IQ PASSED / IQ FAILED]
Signature:          [electronic or wet signature]
```

### 67b. Operational Qualification (OQ)

OQ verifies that `@hex-di/guard` operates correctly by exercising the test suite against the installed version.

#### OQ Checklist

| #     | Check                                                                       | Method                                                           | Pass Criteria                                                                                                                                                              |
| ----- | --------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OQ-1  | All unit tests pass                                                         | `pnpm test`                                                      | 100% pass rate (current baseline: 281 as of spec version 1.0; MUST be updated at each major version)                                                                       |
| OQ-2  | All type tests pass                                                         | `pnpm test:types`                                                | >= 54 type tests pass                                                                                                                                                      |
| OQ-3  | All integration tests pass                                                  | `pnpm test`                                                      | >= 51 integration tests pass                                                                                                                                               |
| OQ-4  | Mutation kill rate — core evaluation                                        | Mutation testing report                                          | 100%                                                                                                                                                                       |
| OQ-5  | Mutation kill rate — combinators                                            | Mutation testing report                                          | 100%                                                                                                                                                                       |
| OQ-6  | Hash chain validates for 1000 entries; includes scope disposal verification | Chain validation test                                            | `validateChain()` returns true; at least one scenario triggers chain verification via scope disposal (section 61)                                                          |
| OQ-7  | AuditEntry completeness for Allow/Deny                                      | Field validation test                                            | All 10 required fields populated                                                                                                                                           |
| OQ-8  | Electronic signature round-trip                                             | Signature workflow test + createSignatureServiceConformanceSuite | capture → validate round-trip succeeds; all 15 conformance suite tests pass (10 core + 5 GxP when gxpMode: true)                                                           |
| OQ-9  | failOnAuditError blocks on write failure                                    | Audit failure test                                               | AuditTrailWriteError thrown                                                                                                                                                |
| OQ-10 | Counter-signing with independent re-auth                                    | Multi-signature test                                             | Both signatures captured independently                                                                                                                                     |
| OQ-11 | NoopAuditTrail GxP detection                                                | Static analysis AND runtime startup check                        | Compile-time type error when `createNoopAuditTrailAdapter()` is passed to `createGuardGraph({ gxp: true })`; runtime `ConfigurationError` (ACL012) if detected dynamically |

> **OQ-11 clarification:** The compile-time type check is for TypeScript consumers — the type system prevents `NoopAuditTrailAdapter` from satisfying `GxPAuditTrailPort`. The runtime ACL012 check is defense-in-depth for JavaScript consumers (or TypeScript consumers bypassing the type system). The runtime check MUST NOT be elided even when TypeScript is used, because type erasure at build time removes the compile-time guard.

> **OQ-8 constant-time comparison verification:** The constant-time comparison requirement from section 65b-1 (07-electronic-signatures.md) — which mandates that signature value and token comparisons use constant-time algorithms when `gxp: true` — is verified via **code review during OQ**, not via performance measurement. Timing-based verification is unreliable due to JIT compilation, garbage collection, and OS scheduling variance. The OQ reviewer MUST confirm:
> (1) `crypto.timingSafeEqual()` (Node.js) or an equivalent constant-time comparison function is used for all signature value comparisons in the `SignatureService.validate()` implementation.
> (2) `crypto.timingSafeEqual()` or equivalent is used for all `ReauthenticationToken` credential comparisons in the `SignatureService.reauthenticate()` implementation.
> (3) No early-return short-circuit exists in the comparison path that could leak timing information (e.g., comparing lengths before comparing values is acceptable only if the length check itself does not reveal information about the expected value).
> Code review evidence (reviewer name, date, files reviewed, confirmation of constant-time usage) MUST be documented in the OQ report as part of the OQ-8 evidence. Reference: section 65b-1 (07-electronic-signatures.md), NIST SP 800-131A.

```
REQUIREMENT: Code review for SignatureService adapter implementations MUST be
             performed by a reviewer with documented cryptographic competency
             (e.g., training certificate, professional certification, or
             documented equivalent experience). The reviewer MUST NOT be the
             implementer.

             The reviewer MUST verify the following 5-item checklist:
             1. Signature comparison uses timing-safe comparison
                (crypto.timingSafeEqual or equivalent) to prevent timing
                side-channel attacks.
             2. No early-return pattern in signature verification that could
                leak information about partial matches.
             3. Buffer length check before comparison to prevent length
                extension or truncation attacks.
             4. For non-Node.js environments (e.g., Deno, Bun, Cloudflare
                Workers), WebCrypto API usage guidance is documented and
                the adapter uses the platform's recommended constant-time
                comparison.
             5. Key material is never logged, serialized to JSON, or included
                in error messages.

             The code review checklist completion MUST be documented as part
             of the OQ evidence.
             Reference: 21 CFR 11.10(a) (system validation),
             NIST SP 800-131A.
```

| OQ-12 | Policy evaluation at maximum nesting depth | Depth limit test with deeply nested combinators | Correct result or documented error; no stack overflow |
| OQ-13 | SignatureService failure handling | Service failure simulation (HSM unavailable, network timeout) | `Err(SignatureError)` returned with appropriate category; no partial state |
| OQ-14 | SubjectProvider failure during guarded evaluation | Provider failure simulation (IdP unavailable) | `PolicyEvaluationError` (ACL003) returned with diagnostic; resolution blocked |
| OQ-15 | Audit entry field boundary conditions | Oversized field test (e.g., maximum-length subjectId, portName) | Documented behavior: truncation with warning or rejection with error |
| OQ-16 | Session interruption detection effectiveness | Trigger session interruption mechanism, verify ReauthenticationToken invalidated within documented timeout | Token rejected after interruption; re-authentication required |
| OQ-17 | NTP clock drift tolerance validation (section 62; clock spec: spec/clock/06-gxp-compliance/ntp-synchronization.md §18) | Compare `ClockSource.now()` against NTP reference; inject simulated drift exceeding 1-second threshold | Drift within 1 second: health check passes; drift > 1 second: health check fails and operational alert triggered |
| OQ-18 | Backup restore and hash chain verification (section 63) | Create audit trail with hash chain → backup → restore to separate environment → run verifyAuditChain() → compare entry counts and field equality | Restore completes without errors; hash chain verification passes; entry count and field values match source |
| OQ-19 | WAL crash recovery verification (section 61) | Simulate process interruption between evaluate() and record() → restart → invoke WAL recovery scan → verify orphaned pending intent detected | getPendingIntents() returns orphaned evaluationId; reconciliation with AuditTrail confirms no matching entry; intent flagged for remediation |
| OQ-19a | Periodic WAL scan verification (section 61) | Run system with configurable WAL scan interval (shortened for test) → create orphaned pending intent without process restart → wait for periodic scan cycle → verify orphaned intent detected | Periodic scan detects orphaned intent within configured interval; getPendingIntents() returns orphaned evaluationId; intent flagged for remediation without requiring process restart |
| OQ-20 | Capacity monitoring threshold verification (section 63a) | Configure audit trail adapter with capacity monitoring enabled → simulate storage utilization at 69%, 70%, 85%, 95% → verify correct status and structured events at each threshold | 69%: status "ok", no event; 70%: status "warning", structured event logged; 85%: status "critical", structured event logged; 95%: status "emergency", structured event logged; `createGuardHealthCheck()` reports matching `storageUtilizationPct` and `capacityStatus` |
| OQ-21 | NTP service unavailability failover (section 62; clock spec: spec/clock/07-integration.md §24) | Disable NTP source → verify ClockSource falls back to local clock with reduced confidence indicator → verify WARNING log emitted → verify fallback metadata recorded in subsequent audit entries → restore NTP → verify confidence restored | Fallback to local clock within 1 second; WARNING log includes NTP endpoint and failure reason; audit entries contain fallback metadata while NTP unavailable; confidence indicator restored after NTP recovery |
| OQ-22 | Identity Provider password quality verification (section 65b) | Documentation review + IdP configuration audit confirming password complexity, expiration, history, and lockout policies per 21 CFR 11.300(d) | IdP security policy documented; password complexity rules active (minimum length, character classes); password expiration enforced; password history prevents reuse; account lockout after failed attempts verified active; evidence included in validation plan |
| OQ-23 | PolicyChangeAuditEntry recording verification (section 64a-1) | Runtime policy change test: modify a policy via `deserializePolicy()` or configuration reload → verify `PolicyChangeAuditEntry` recorded before activation → verify hash chain integrity → verify separation of duties (approverId ≠ actorId) → verify `changeRequestId` non-empty | PolicyChangeAuditEntry present in audit trail with correct `_tag`; `previousPolicyHash` and `newPolicyHash` computed via `hashPolicy()`; entry participates in same hash chain as regular AuditEntry (no separate chain); `approverId ≠ actorId` enforced; `changeRequestId` non-empty when `gxp: true`; `verifyAuditChain()` passes after policy change recording |
| OQ-24 | GxP regression test permanence verification (section 67b) | Scan OQ test suite for `@gxp-regression` annotations → compare against registry manifest (`gxp-regression-registry.json`) → verify all registered IDs present | All registered regression test IDs found; no registered IDs missing; registry is append-only |
| OQ-25 | Cross-library validation coordination (section 64a-2) | Deploy guard + http-client → verify shared ClockSource → verify shared hash chain → verify signature delegation → verify version compatibility | Shared ClockSource confirmed; hash chain verified; signature delegation valid; version matrix passes |
| OQ-26 | GxP anonymous subject rejection | Verify that when `gxp: true`, `validateGxPSubject()` rejects anonymous subjects (empty subjectId or authenticationMethod === "anonymous") BEFORE policy evaluation. The audit entry MUST record decision "deny" with ACL014. | §22 (06-subject.md), §25 (07-guard-adapter.md) | Finding #2 |
| OQ-27 | Mixed hash chain verification | Verify that `verifyAuditChain()` correctly handles mixed chains containing both AuditEntry and PolicyChangeAuditEntry entries, discriminating on `_tag` for field set selection. Chain verification MUST pass for valid mixed chains and MUST fail for tampered entries of either type. | §61.4b (02-audit-trail-contract.md) | Finding #1 |
| OQ-28 | dataClassification backfill meta-audit | Verify that when `gxp: true` and `dataClassification` is added or modified on an existing entry, a `DataClassificationChangeEntry` meta-audit record is written to the MetaAuditTrailPort with all required fields. | §61 (02-audit-trail-contract.md) | Finding #5 |
| OQ-29 | Archive and restore with chain verification | Verify the complete archival workflow: pre-archival chain verification, export to JSON Lines with manifest, post-transfer integrity verification (entry count match + chain verification + sample comparison), and restore with chain re-verification. | §63c (04-data-retention.md) | Finding #6 |
| OQ-30 | Background chain verification detects tampering | Verify that automated background chain verification (daily for active chains when `gxp: true`) detects a single tampered entry in an otherwise valid chain and triggers the Chain Break Response procedure. | §64 (05-audit-trail-review.md) | Finding #11 |
| OQ-31 | Policy rollback audit trail | Verify that a policy rollback creates a new `PolicyChangeAuditEntry` with the reverted policy content, references the original changeId, passes hash chain verification, and enforces separation of duties (rollback approver differs from original approver). | §64a-3 (06-administrative-controls.md) | Finding #16 |
| OQ-32 | Negative: Forged integrityHash accepted | Attempt to insert an audit entry with a manually computed integrityHash that does not match the canonical field ordering (§61.4). Verify `verifyAuditChain()` detects the forgery and triggers chain break response. | §61.4 (02-audit-trail-contract.md) | Adversarial |
| OQ-33 | Negative: Expired ReauthenticationToken replay | Attempt capture() with an expired ReauthenticationToken. Verify rejection with "reauth_expired" category. Then attempt with a valid but previously consumed token (when gxp:true). Verify rejection with "token_replayed" category. | §65b, §65b-4 (07-electronic-signatures.md) | Adversarial |
| OQ-34 | Negative: Role incompatibility bypass | Attempt to evaluate an administrative operation where the subject holds two incompatible roles (e.g., Guard Admin + Audit Reviewer). Verify ACL017 rejection and audit log entry. | §64g (06-administrative-controls.md) | Adversarial |
| OQ-35 | Negative: Evaluation during change freeze | When a change freeze is active, attempt guard:config:modify and guard:policy:approve operations. Verify ACL018 rejection and administrative event log entry. | §64a-5 (06-administrative-controls.md) | Adversarial |
| OQ-36 | Circuit breaker state transitions | Simulate consecutive audit backend failures exceeding threshold → verify OPEN state → wait for reset timeout → verify HALF-OPEN probe → simulate success → verify CLOSED recovery. Verify all state transitions logged. | §61.9 (02-audit-trail-contract.md) | Adversarial |
| OQ-37 | Scheduled chain re-verification | Configure `scheduleChainVerification()` with shortened interval → wait for verification cycle → verify health event emitted → inject tampered entry → wait for next cycle → verify chain break detected. | §61.4c (02-audit-trail-contract.md) | Adversarial |
| OQ-38 | Predicate rule mapping runtime verification | Configure guard graph with `gxp: true` and empty `predicateRuleMapping` → verify ConfigurationError at build time. Configure with valid mapping → run `checkGxPReadiness()` → verify item 15 passes. Remove mapping at runtime → verify `checkGxPReadiness()` reports FAIL with "guard.predicate-rule-mapping-missing". | §59 (01-regulatory-context.md), REQ-GUARD-067 | GxP Compliance |
| OQ-39 | Certificate chain validation for archival signatures | Configure `SignatureService` with certificate nearing expiry → verify 90/30/7-day threshold events emitted. Revoke signing certificate → attempt `validate()` on existing signature → verify validation result includes revocation status. Archive certificate chain alongside audit trail → verify `verifyAuditChain()` succeeds using archived chain after certificate expiry. Attempt GxP production with self-signed certificate → verify rejection. | §65c-3 (07-electronic-signatures.md), REQ-GUARD-068 | GxP Compliance |
| OQ-40 | Algorithm migration epoch boundary verification | Define two algorithm epochs (RSA → ECDSA). Create entries signed with RSA (epoch 1). Transition to dual-signing phase → create entries signed with ECDSA (epoch 2). Run `verifyAuditChain()` across epoch boundary → verify chain validates successfully with multi-algorithm verification. Verify deprecation timeline warnings at T-24mo (INFO) and T-12mo (`checkGxPReadiness()` WARNING). | §65c-4 (07-electronic-signatures.md), REQ-GUARD-069 | GxP Compliance |
| OQ-41 | Policy input schema validation (Annex 11 Section 5) | Configure guard graph with `gxp: true` and a `hasAttribute` policy referencing an attribute not in the declared schema → verify ConfigurationError at build time. Configure with incompatible matcher operand type (e.g., `inArray` on boolean) → verify ConfigurationError. Provide subject attributes with wrong type at evaluation time → verify PolicyEvaluationError (not silent coercion). | §59 (01-regulatory-context.md, Annex 11 §5), REQ-GUARD-070 | GxP Compliance |
| OQ-42 | Resource attribute accuracy check (Annex 11 Section 6) | Configure guard with `gxp: true` and resource attribute with `maxAgeMs: 5000`. Provide attribute with timestamp older than threshold → verify deny with "attribute_stale" reason. Provide attribute without provenance timestamp → verify WARNING log "guard.attribute-freshness-unknown" emitted once per attribute name. Provide fresh attribute → verify allow. | §59 (01-regulatory-context.md, Annex 11 §6), REQ-GUARD-071 | GxP Compliance |

#### OQ-to-Test-File Traceability

```
REQUIREMENT: The OQ report MUST include a traceability table mapping each OQ
             check to its implementing test file(s). This table MUST be
             maintained alongside the OQ checklist and updated whenever OQ
             items are added or test files are reorganized. The traceability
             table format is:

             | OQ # | Test File(s) | Test Name Pattern | Last Verified |
             |------|-------------|-------------------|---------------|
             | OQ-1 | packages/guard/tests/**/*.test.ts | all unit tests | [date] |
             | OQ-2 | packages/guard/tests/**/*.test-d.ts | all type tests | [date] |
             | ...  | ...         | ...               | ...           |

             Each entry MUST specify:
             (a) The OQ item number.
             (b) The file path(s) containing the test(s) that satisfy the
                 OQ item.
             (c) A test name pattern or specific test name(s) within the file.
             (d) The date the mapping was last verified.
             The traceability table ensures that OQ items can be traced to
             executable test evidence and that test file refactoring does not
             silently break OQ coverage.
             Reference: WHO TRS 996 Annex 5 (bi-directional traceability).
```

#### Mutation Testing Tool

```
REQUIREMENT: Mutation testing for OQ-4 and OQ-5 MUST be performed using
             Stryker Mutator (https://stryker-mutator.io/) with the
             following configuration:
             (a) Mutator: TypeScript-specific mutators enabled (including
                 conditional, arithmetic, string, array, and object literal
                 mutators).
             (b) Threshold: 100% mutation kill rate for core evaluation logic
                 (OQ-4) and combinator logic (OQ-5).
             (c) Report: HTML and JSON mutation reports MUST be generated and
                 archived as OQ evidence.
             (d) Baseline: The mutation report from the previous OQ MUST be
                 retained for comparison.
             Organizations MAY use an alternative mutation testing tool if
             Stryker is not suitable for their toolchain, provided the
             alternative tool supports TypeScript, produces comparable
             mutation coverage metrics, and is documented in the validation
             plan with justification for the alternative choice.
             Reference: GAMP 5 Category 5 (rigorous testing).
```

```
REQUIREMENT: The OQ-1 baseline test count MUST be updated at each major version of
             @hex-di/guard. A decrease in the baseline test count from one major
             version to the next MUST be documented as a deviation with justification
             (e.g., test consolidation, removal of deprecated functionality). The
             current baseline and its version MUST be recorded in the OQ report.
             Reference: GAMP 5 Category 5 testing requirements.
```

```
REQUIREMENT: Every GxP compliance finding remediation MUST include an OQ regression
             test that is traceable to the original finding. The regression test MUST:
             (a) Reproduce the conditions of the original finding (or a representative
                 approximation if exact reproduction is impractical).
             (b) Verify that the remediation prevents recurrence.
             (c) Be permanently retained in the OQ test suite — regression tests
                 MUST NOT be removed during test suite maintenance or refactoring.
             (d) Include a comment or annotation referencing the original finding
                 identifier (e.g., deviation ID, audit observation number).
             Reference: EU GMP Annex 11 §10, §11.
```

```
REQUIREMENT: GxP regression tests MUST be annotated with a `@gxp-regression` marker
             (Vitest meta tag or standardized comment) that includes a unique regression
             test identifier traceable to the original finding. An append-only regression
             test registry manifest (`gxp-regression-registry.json`) MUST be maintained
             alongside the test suite. The registry records each regression test ID, the
             originating finding identifier, the date of registration, and the test file
             path. The `runOQ()` programmatic runner MUST include a regression permanence
             check (OQ-24) that:
             (a) Scans the OQ test suite for all `@gxp-regression` annotations.
             (b) Compares the discovered annotations against the registry manifest.
             (c) Fails OQ if any registered regression test ID is missing from the
                 test suite (indicating a regression test was removed).
             (d) Emits a WARNING if any `@gxp-regression` annotation in the test suite
                 is not present in the registry (indicating an unregistered annotation
                 that should be added to the manifest).
             The registry manifest MUST be append-only: entries MUST NOT be removed.
             If a regression test is genuinely obsolete (e.g., the tested functionality
             was removed), the registry entry MUST be marked with a `retiredAt` date
             and `retirementJustification` rather than deleted, and the corresponding
             test MAY be removed only after the registry entry is marked retired.
             Reference: EU GMP Annex 11 §10, §11, GAMP 5 (regression testing).
```

```
REQUIREMENT: Organizations MUST classify system changes using the following
             4-tier re-validation matrix to determine the required validation
             scope:

             | Tier | Change Type | Examples | Required Validation |
             |------|------------|---------|-------------------|
             | 1 — Infrastructure | Changes to the underlying platform, OS, runtime, or database engine | Node.js major version upgrade, database engine migration, cloud provider change, OS upgrade | Full IQ + OQ + PQ |
             | 2 — Framework | Changes to @hex-di/guard or its direct dependencies | Guard version upgrade, dependency version upgrade with API changes | Full OQ + PQ |
             | 3 — Configuration | Changes to guard configuration without code changes | Policy modifications, role hierarchy changes, adapter configuration changes | Partial OQ (affected policies and ports only) |
             | 4 — Operational | Changes to operational procedures without system changes | Review frequency adjustment, training updates, personnel changes | Targeted OQ (health check + chain verification only) |

             The change classification MUST be documented in the change request
             (section 64a) and MUST determine the minimum validation scope. QA
             MAY escalate the validation scope based on risk assessment.
             Reference: GAMP 5 (change control), EU GMP Annex 11 §10.

RECOMMENDED: In addition to change-triggered re-validation, annual OQ
             re-verification SHOULD be performed. Organizations SHOULD observe
             the following minimum re-validation cadence:
             - **Annual:** Full OQ re-run (all OQ-1 through OQ-42 checks) as part of
               the periodic review (section 64).
             - **Quarterly:** Health check validation — execute createGuardHealthCheck()
               and verify all health indicators pass; review WAL orphan count; verify
               hash chain integrity on a representative sample of active scope chains.
             - **On-demand:** Triggered by any of the events listed in section 64a
               (policy change, framework upgrade, adapter change, infrastructure
               migration, security incident).
             The cadence SHOULD be documented in the validation plan (section 67) and
             adjusted based on the site's risk assessment per ICH Q9.
             Reference: EU GMP Annex 11 §10, §11, GAMP 5, ICH Q10.
```

> **OQ-1 Scope Note:** The OQ-1 baseline of 281 covers DoD items 1-8 + 13 + 15
> (core authorization engine, GxP compliance, and electronic signatures).
> Additional test coverage for React integration (DoD 9-11: 63 tests),
> cross-library integration (DoD 18: 30 tests), testing infrastructure
> (DoD 19: 42 tests), and other subsystems is verified by OQ-3 (integration
> tests) and the mutation kill rate checks (OQ-4 through OQ-5). The total
> across all 29 DoD items is 1294. (HTTP transport sections formerly in DoD 20-22
> were moved to the http-client spec in v0.1.1; DoD 20-22 were subsequently
> repopulated with new content — Array Matchers, API Ergonomics, and Cucumber BDD
> acceptance tests. DoD 25-29 cover Async Evaluation, Field-Level Union Strategy,
> ReBAC, Ecosystem Extensions, and Developer Experience.)

> **OQ-1 Baseline Decomposition (unit tests only; type tests verified by OQ-2, integration tests by OQ-3):**
>
> | DoD Item | Description           | Approximate Unit Tests |
> | -------- | --------------------- | ---------------------- |
> | DoD 1    | Permission Tokens     | ~18                    |
> | DoD 2    | Role Tokens           | ~20                    |
> | DoD 3    | Policy Data Types     | ~28                    |
> | DoD 4    | Policy Combinators    | ~15                    |
> | DoD 5    | Policy Evaluator      | ~44                    |
> | DoD 6    | Subject Port          | ~27                    |
> | DoD 7    | Guard Adapter         | ~57                    |
> | DoD 8    | Policy Serialization  | ~34                    |
> | DoD 13   | GxP Compliance        | ~57                    |
> | DoD 15   | Electronic Signatures | ~32                    |
> |          | **Approximate Total** | **~332**               |
>
> The OQ-1 baseline of 281 is the audited count from the implemented test suite.
> The DoD counts above are design-time approximations (prefixed with ~); the
> actual count is verified at qualification time by `runOQ()`. A decrease from
> 281 at the next major version MUST be documented as a deviation per the
> REQUIREMENT above.

> **Note:** OQ-12 through OQ-15 address boundary condition and error handling testing per EU GMP Annex 11 Section 4.7, which requires evidence of testing "system (process) parameter limits, data limits and error handling." OQ-16 addresses session interruption detection per 21 CFR 11.200(a)(1). OQ-17 validates clock synchronization tolerance per section 62 and clock spec §18 (21 CFR 11.10(e), ALCOA+ Contemporaneous). OQ-18 validates backup/restore integrity per EU GMP Annex 11 §7.1. OQ-19 validates WAL crash recovery per section 61 (GAMP 5, EU GMP Annex 11 §4.7). OQ-19a validates periodic WAL scan detection per section 61 (GAMP 5, FM-15 mitigation). OQ-20 validates automated capacity monitoring per section 63a (21 CFR 11.10(c), EU GMP Annex 11 §7.1). OQ-21 validates NTP service unavailability failover per section 62 and clock spec §24 (21 CFR 11.10(e), ALCOA+ Contemporaneous).

> **OQ-21 Note:** OQ-21 verifies the NTP unavailability handling defined in section 62 (guard-specific behavior) and spec/clock/07-integration.md §24 (`onFailure` modes). The test MUST simulate NTP service interruption (not merely clock drift) and verify four aspects: (1) graceful fallback to local system clock, (2) WARNING log emission with diagnostic details, (3) reduced confidence indicator propagated as metadata in subsequent audit entries, and (4) restoration of normal operation when NTP recovers. This test complements OQ-17 (drift tolerance) by covering the unavailability scenario. Reference: 21 CFR 11.10(e), ALCOA+ Contemporaneous.

> **OQ-6 Scope Note:** OQ-6 (hash chain validation for 1000 entries) also covers the scope disposal path. When `gxp: true` and a scope is disposed, `verifyAuditChain()` MUST be invoked on the scope's audit entries as part of disposal cleanup (section 61). The OQ-6 test MUST include at least one scenario where chain verification is triggered by scope disposal, not only by explicit `verifyAuditChain()` invocation.

> **OQ-24 Note:** OQ-24 provides dual enforcement of regression test permanence: (1) **registry completeness** — the append-only `gxp-regression-registry.json` manifest ensures that every registered regression test ID corresponds to an extant test in the suite, preventing accidental or intentional removal of compliance-critical regression tests during refactoring; (2) **annotation traceability** — the `@gxp-regression` annotation on each test provides forward traceability from finding to test, while the registry provides backward traceability from test to finding. Together, these mechanisms ensure that GxP compliance findings remain permanently covered by regression tests throughout the system lifecycle. Reference: EU GMP Annex 11 §10, §11.

> **OQ-25 Note:** OQ-25 applies only when `@hex-di/http-client` is co-deployed with `@hex-di/guard` in the same GxP environment. When http-client is not co-deployed, OQ-25 MUST be marked "skip" in the OQ report with the justification "http-client not co-deployed; cross-library validation not applicable." When http-client is co-deployed, all four verification areas (shared ClockSource, shared hash chain, signature delegation, version compatibility) MUST pass. Reference: section 64a-2, GAMP 5 (integrated system validation).

#### OQ Report Template

```
OQ Report — @hex-di/guard
─────────────────────────────────────────
Document ID:        OQ-GUARD-[VERSION]-[SEQ]
Revision:           [revision number, e.g., 1.0]
Revision History:   [table of: revision, date, author, change description]
System:             @hex-di/guard
Version:            [installed version]
Test Suite Version: [git commit hash]
Executor:           [name and role]
Execution Date:     [ISO 8601]
Results:            [PASS/FAIL for each OQ check with evidence]
Test Output:        [attached or referenced test run log]
Deviations:         [list any deviations and justification]
Conclusion:         [OQ PASSED / OQ FAILED]
Signature:          [electronic or wet signature]
```

### 67c. Performance Qualification (PQ)

PQ verifies that `@hex-di/guard` meets performance requirements under production-representative conditions.

#### PQ Checklist

| #     | Check                          | Method                                                                                                           | Pass Criteria                                                                                                                                                                                                                   |
| ----- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PQ-1  | Evaluation latency (p50)       | Benchmark: 10,000 evaluations                                                                                    | < 1ms                                                                                                                                                                                                                           |
| PQ-2  | Evaluation latency (p99)       | Benchmark: 10,000 evaluations                                                                                    | < 5ms                                                                                                                                                                                                                           |
| PQ-3  | Audit write throughput         | Benchmark: sequential writes                                                                                     | >= 100 entries/sec                                                                                                                                                                                                              |
| PQ-4  | Concurrent chain integrity     | 10 scopes x 100 entries each                                                                                     | All 10 chains validate independently                                                                                                                                                                                            |
| PQ-5  | Memory stability               | 10,000 evaluations, measure heap                                                                                 | < 10% heap delta after GC                                                                                                                                                                                                       |
| PQ-6  | Timestamp monotonicity         | 1,000 sequential entries                                                                                         | Each timestamp >= previous                                                                                                                                                                                                      |
| PQ-7  | Sustained throughput           | Continuous evaluation at peak expected throughput for the configured soak duration (RECOMMENDED minimum: 1 hour) | No memory growth > 20% over baseline; all hash chains valid; no audit trail write failures; p99 latency does not degrade > 50% from PQ-2 baseline; sequenceNumber strictly monotonic within each scope throughout soak duration |
| PQ-8  | Audit trail query latency      | Query 100,000 production-representative entries (see PQ-8 Data Characteristics below) by subjectId + date range  | < 5 seconds for filtered result set; ensures regulatory review queries complete in reasonable timeframe                                                                                                                         |
| PQ-9  | WAL backlog evaluation latency | Populate WAL with 1,000 pending intents → measure evaluation latency (p50, p99) for 1,000 new evaluations        | p50 < 2ms; p99 < 10ms; no WAL-related errors during evaluation; pending intent count does not affect evaluation correctness                                                                                                     |
| PQ-10 | Audit write latency (p99)      | Benchmark: 10,000 sequential `record()` calls with hash chain computation                                        | p99 < 50ms per individual audit write; no write exceeds 200ms; ensures audit trail does not become a bottleneck in the guard evaluation pipeline                                                                                |

> **PQ-8 Data Characteristics:** The 100,000 test entries for PQ-8 MUST be production-representative, not uniformly distributed. Specifically:
>
> - **scopeId distribution:** 10-100 distinct scopeIds, reflecting the expected number of concurrent or historical scopes in production.
> - **subjectId distribution:** 100-1,000 distinct subjectIds following a Zipf distribution (80/20 rule: ~20% of subjects generate ~80% of entries), matching the typical access pattern where a few high-activity subjects dominate.
> - **Date range:** Entries MUST span 1-365 days, distributed across the range (not clustered on a single day), to exercise time-based query filtering realistically.
> - **portName distribution:** Port names MUST reflect expected production port access frequency (e.g., frequently accessed ports like `UserRepoPort` appearing more often than rarely accessed ports like `BatchReleasePort`).
> - **Decision distribution:** A mix of Allow and Deny decisions reflecting the expected production ratio (typically 90-99% Allow, 1-10% Deny, adjusted to the deployment's security profile).
>
> Organizations SHOULD document the actual data distribution parameters used in the PQ report.

> **PQ-8 Scalability Note:** The PQ-8 threshold of 5 seconds for 100,000 entries is a baseline. Organizations SHOULD scale PQ-8 to their expected production volume. Deployments expecting > 1 million entries SHOULD define deployment-specific latency criteria documented in the PQ report. For inspection readiness, ad-hoc queries on full production data SHOULD complete within a timeframe acceptable to the regulatory authority. Reference: 21 CFR 11.10(b).

> **PQ-9 WAL Backlog Note:** PQ-9 measures the performance impact of a large WAL backlog on new evaluations. The 1,000 pending intents simulate a worst-case crash recovery scenario. The latency thresholds (2ms p50, 10ms p99) are intentionally higher than PQ-1/PQ-2 (1ms/5ms) to account for WAL write overhead during backlog processing. Organizations SHOULD scale the pending intent count to their expected peak crash recovery volume. Reference: GAMP 5 PQ guidance.

> **Multi-Region Addendum:** When `gxp: true` and the deployment spans multiple regions, the validation plan MUST include a documented cross-region ordering strategy per section 61.4a. This document MUST be reviewed during IQ and referenced in the Validation Report. The cross-region ordering strategy covers: region identifiers, NTP source hierarchy, accepted cross-region variance, consolidation deduplication strategy, and ordering guarantees for regulatory review. See section 61.4a (Multi-Region Deployment Guidance) for the full REQUIREMENT.

```
REQUIREMENT: The PQ-7 soak test MUST run for a minimum of 1 hour for standard
             deployments. The test duration MUST be configurable via the
             @hex-di/guard-validation programmatic runner. The chosen duration
             MUST be documented in the PQ report with justification based on
             the deployment's operational profile.

RECOMMENDED: For high-availability or mission-critical deployments (e.g.,
             manufacturing execution systems, continuous batch processing),
             organizations SHOULD increase the soak duration to 8-24 hours to
             match the expected operational run period. For systems requiring
             24/7 availability, a 72-hour soak test SHOULD be considered during
             initial validation.
             Reference: GAMP 5 PQ guidance.
```

```
REQUIREMENT: When gxp is true on the guard graph, the minimum soak duration
             MUST be 4 hours (14,400,000 ms). The runPQ() programmatic runner
             MUST default to a 4-hour soak when the guard graph has gxp: true,
             and 1-hour soak otherwise. This elevated default reflects the higher
             assurance requirements of GxP environments — 1 hour is insufficient
             to detect slow memory leaks, gradual hash chain drift, or
             low-probability concurrency issues in the audit trail pipeline.
             The 8-24 hour guidance above for mission-critical deployments remains
             unchanged and takes precedence over this default when applicable.
             Organizations MAY override the default via the runPQ() duration
             parameter with documented justification in the validation report.
             Reference: GAMP 5 PQ guidance, 21 CFR 11.10(a).
```

#### PQ Report Template

```
PQ Report — @hex-di/guard
─────────────────────────────────────────
Document ID:        PQ-GUARD-[VERSION]-[SEQ]
Revision:           [revision number, e.g., 1.0]
Revision History:   [table of: revision, date, author, change description]
System:             @hex-di/guard
Version:            [installed version]
Hardware:           [CPU, RAM, disk type]
Environment:        [Node.js version, OS, load conditions]
Executor:           [name and role]
Execution Date:     [ISO 8601]
Results:            [measured values for each PQ check]
Benchmark Logs:     [attached or referenced]
Deviations:         [list any deviations and justification]
Conclusion:         [PQ PASSED / PQ FAILED]
Signature:          [electronic or wet signature]
```

### 67c-1. Performance Benchmark Targets

The PQ checks (PQ-1 through PQ-9) require measurable pass criteria. The following concrete benchmarks define the minimum acceptable performance for GxP deployments:

```
REQUIREMENT: PQ benchmarks MUST be measured on production-representative hardware
             and load conditions. Results below these thresholds MUST be treated as
             PQ failures requiring investigation and remediation before GxP deployment.
             Reference: 21 CFR 11.10(a), GAMP 5 (performance qualification).
```

| Metric                             | Benchmark                                         | PQ Check | Measurement Method                                                                                           |
| ---------------------------------- | ------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| **Evaluation throughput**          | >= 10,000 evaluations/sec (single-threaded)       | PQ-1     | Sustained 60-second burst with `allOf(hasPermission, hasRole)` policy                                        |
| **P99 evaluation latency**         | <= 5ms                                            | PQ-2     | 10,000 evaluations; 99th percentile of `durationMs`                                                          |
| **P99.9 evaluation latency**       | <= 15ms                                           | PQ-2     | 10,000 evaluations; 99.9th percentile of `durationMs`                                                        |
| **Audit trail write throughput**   | >= 5,000 writes/sec                               | PQ-3     | Sequential `record()` calls with hash chain computation                                                      |
| **Memory stability (RSS delta)**   | <= 50MB over soak duration                        | PQ-4     | RSS measurement at start and end of soak test; delta must not exceed threshold                               |
| **Memory stability (heap growth)** | <= 10% heap growth over soak duration             | PQ-4     | Heap snapshot comparison at 10% and 90% of soak duration                                                     |
| **Hash chain verification rate**   | >= 50,000 entries/sec                             | PQ-5     | `verifyAuditChain()` on a 100,000-entry chain                                                                |
| **Concurrent scope scaling**       | Linear to 100 concurrent scopes                   | PQ-6     | Throughput with N scopes should be >= 0.8 _ N _ single-scope throughput                                      |
| **WAL recovery time**              | <= 1 second for 1,000 pending intents             | PQ-8     | Time from `getPendingIntents()` to all intents replayed                                                      |
| **Audit write latency (p99)**      | <= 50ms per individual `record()` call            | PQ-10    | 10,000 sequential `record()` calls with hash chain computation; 99th percentile of individual write duration |
| **Audit write latency (max)**      | <= 200ms per individual `record()` call           | PQ-10    | Maximum observed latency across all 10,000 writes; no single write should exceed this ceiling                |
| **Soak test duration**             | `max(4h, expectedPeakOperatingPeriod * 0.25, 8h)` | PQ-7     | Continuous operation under representative load; no memory leaks, no chain breaks, no dropped entries         |

> **Soak test formula:** The soak duration is the maximum of: (a) the 4-hour GxP minimum per REQUIREMENT §67c, (b) 25% of the expected peak continuous operating period (e.g., 8 hours for a 32-hour batch processing window), and (c) 8 hours as a general best practice for production-bound systems. Organizations MAY use longer soak durations based on their risk assessment.

```
RECOMMENDED: Organizations SHOULD establish site-specific benchmark targets that
             exceed the minimums above, calibrated to their actual production
             workload. The site-specific targets SHOULD be documented in the PQ
             protocol (§67c) and used as the pass criteria for ongoing PQ
             re-verification.
```

### 67d. Validation Report Template

The final Validation Report consolidates IQ, OQ, and PQ results into a single document for regulatory submission.

```
Validation Report — @hex-di/guard
─────────────────────────────────────────
Document ID:        VR-GUARD-[VERSION]-[SEQ]
Revision:           [revision number, e.g., 1.0]
Revision History:   [table of: revision, date, author, change description]
System Name:        @hex-di/guard
Version:            [version]
Date:               [ISO 8601]
Executed By:        [name, role, organization]
Reviewed By:        [name, role, organization]

Acceptance Criteria: All IQ checks PASS. All OQ checks PASS.
                    All PQ checks meet specified pass criteria.
                    No unresolved Major deviations remain open.
                    Hash chain integrity verified for all test scopes.

IQ Results:         [PASSED / FAILED — reference IQ report ID]
OQ Results:         [PASSED / FAILED — reference OQ report ID]
PQ Results:         [PASSED / FAILED — reference PQ report ID]

Deviations:         [consolidated list with resolution status]

Conclusion:         [VALIDATED / NOT VALIDATED]
                    The system is / is not qualified for use in
                    GxP-regulated environments.

Signatures:
  Executor:         ____________________  Date: __________
  Reviewer:         ____________________  Date: __________
  QA Approver:      ____________________  Date: __________
```

```
REQUIREMENT: The QA Approver on the Validation Report MUST be independent of the
             development and testing teams. The QA Approver MUST NOT have authored
             code under test, executed the IQ/OQ/PQ test cases being approved, or
             reported to the same line management as the development team during the
             validation period. The approver's authority MUST be documented in the
             site Quality Management System (e.g., delegation of authority matrix,
             organizational chart with reporting lines). The QA Approver MUST confirm:
             (a) All IQ, OQ, and PQ checks have been executed and evidence is attached.
             (b) All deviations have been assessed, root-caused, and resolved or
                 accepted with documented justification.
             (c) All acceptance criteria defined in the validation plan (section 67)
                 have been met.
             Reference: EU GMP Annex 11 §4.3, 21 CFR 11.10(j).
```

### 67e. Programmatic Validation Runners

The `@hex-di/guard-validation` package provides programmatic IQ/OQ/PQ runners that produce auditable, timestamped qualification reports. These replace manual checklist execution with automated, reproducible tooling.

```
REQUIREMENT: Programmatic validation runners (runIQ(), runOQ(), runPQ()) MUST verify
             version compatibility between @hex-di/guard and @hex-di/guard-validation
             at startup. If the guard-validation package version is older than the
             installed guard package version, the runner MUST fail immediately with a
             diagnostic error identifying the version mismatch. This prevents false
             negatives from running a stale validation suite against a newer library
             version. The version check compares major.minor — patch-level differences
             are permitted. Reference: GAMP 5 (validation tool qualification).
```

```typescript
/**
 * A single qualification check result.
 */
interface QualificationCheck {
  /** Unique identifier for the check (e.g., "IQ-01", "OQ-03"). */
  readonly id: string;
  /** Which qualification phase this check belongs to. */
  readonly category: "IQ" | "OQ" | "PQ";
  /** Human-readable description of what is being checked. */
  readonly description: string;
  /** Whether the check passed, failed, or was skipped. */
  readonly status: "pass" | "fail" | "skip";
  /** Detailed result or failure explanation. */
  readonly detail: string;
  /** Duration of the check in milliseconds. */
  readonly durationMs: number;
}

/**
 * Result of running Installation Qualification checks.
 */
interface IQResult {
  /** Individual check results. */
  readonly checks: ReadonlyArray<QualificationCheck>;
  /** True if all checks passed (no failures, skips are acceptable). */
  readonly passed: boolean;
  /** Human-readable summary of the IQ run. */
  readonly summary: string;
}

/**
 * Result of running Operational Qualification checks.
 */
interface OQResult {
  /** Individual check results. */
  readonly checks: ReadonlyArray<QualificationCheck>;
  /** True if all checks passed. */
  readonly passed: boolean;
  /** Total number of tests executed. */
  readonly testCount: number;
  /** Number of failed tests. */
  readonly failedCount: number;
  /** Human-readable summary of the OQ run. */
  readonly summary: string;
}

/**
 * Runs Installation Qualification checks.
 *
 * Checks:
 * - Package version matches expected version
 * - All peer dependencies are installed and version-compatible
 * - TypeScript compiler version meets minimum requirement
 * - ESLint configuration is present and valid
 * - No known vulnerable dependencies (via npm audit)
 *
 * @returns Promise resolving to the IQ result
 */
function runIQ(): Promise<IQResult>;

/**
 * Runs Operational Qualification checks.
 *
 * Executes the full test suite programmatically via vitest's
 * Node API and reports pass/fail counts for each test file.
 *
 * @returns Promise resolving to the OQ result
 */
function runOQ(): Promise<OQResult>;

/**
 * Generates the regulatory traceability matrix.
 *
 * Produces the 72-row regulatory mapping from section 69,
 * linking each regulatory requirement to spec sections,
 * DoD items, and test references.
 *
 * @returns The traceability matrix as a structured object
 */
function generateTraceabilityMatrix(): TraceabilityMatrix;
```

```typescript
/**
 * Result of running Performance Qualification checks.
 */
interface PQResult {
  /** Individual check results (PQ-1 through PQ-10). */
  readonly checks: ReadonlyArray<QualificationCheck>;
  /** True if all checks passed. */
  readonly passed: boolean;
  /** Human-readable summary of the PQ run. */
  readonly summary: string;
  /** Total soak duration in milliseconds. */
  readonly soakDurationMs: number;
  /** Peak memory usage delta (percentage) during soak. */
  readonly peakMemoryDeltaPercent: number;
}

/**
 * Runs Performance Qualification checks.
 *
 * Executes PQ-1 through PQ-10 including the sustained throughput soak test, WAL backlog latency test, and audit write latency measurement.
 * The soak duration, concurrent scope count, and entries per scope are
 * configurable to match the deployment's operational profile.
 *
 * @param options.soakDurationMs - Duration of the PQ-7 soak test in
 *   milliseconds (default: 3_600_000 = 1 hour).
 * @param options.concurrentScopes - Number of concurrent scopes for PQ-4
 *   and the soak test (default: 10).
 * @param options.entriesPerScope - Number of entries per scope for PQ-4
 *   (default: 100).
 *
 * @returns Promise resolving to the PQ result
 */
function runPQ(options?: {
  readonly soakDurationMs?: number;
  readonly concurrentScopes?: number;
  readonly entriesPerScope?: number;
}): Promise<PQResult>;
```

> **Package:** These functions are exported from `@hex-di/guard-validation` (see 01-overview.md for package structure). The validation package depends on `@hex-di/guard` and `vitest` as peer dependencies. It is a development/qualification tool, not a runtime dependency.

---

### 67f. Disaster Recovery Test Procedure Template

The following procedure template addresses the disaster recovery gap identified in the FMEA (FM-15, FM-17) and aligns with EU GMP Annex 11 §7.1 (backup/restore) and §16 (business continuity).

```
REQUIREMENT: Organizations deploying @hex-di/guard in GxP environments MUST
             execute the disaster recovery test procedure at least annually,
             aligned with the periodic review cycle (section 64). The test
             MUST be documented using the template below or an equivalent
             procedure approved by the quality unit.
             Reference: EU GMP Annex 11 §7.1, §16, GAMP 5.
```

```
Disaster Recovery Test Procedure — @hex-di/guard
─────────────────────────────────────────────────
Document ID:        DR-GUARD-[VERSION]-[SEQ]
Revision:           [revision number]
System:             @hex-di/guard
Version:            [installed version]
Environment:        [production-equivalent test environment description]
Executor:           [name and role]
Witness:            [name and role — MUST be different from executor]
Execution Date:     [ISO 8601]

PRE-REQUISITES
  [ ] Production-equivalent test environment provisioned
  [ ] Backup of audit trail backing store available (age < 24 hours)
  [ ] Backup of WAL store available (if applicable)
  [ ] Backup of signing key material available (HSM backup or key escrow)
  [ ] Guard configuration artifacts (policies, role hierarchy) available
  [ ] Test subjects with known permissions available

PHASE 1 — BASELINE CAPTURE (before simulated disaster)
  Step 1.1: Record current audit trail entry count per scope
            Result: ________________
  Step 1.2: Record last sequenceNumber per scope
            Result: ________________
  Step 1.3: Execute verifyAuditChain() on all active scopes
            Result: [ ] PASS  [ ] FAIL
  Step 1.4: Execute createGuardHealthCheck() canary evaluation
            Result: [ ] PASS  [ ] FAIL
  Step 1.5: Record 3 representative guard evaluations (1 allow, 1 deny,
            1 signed) and note their evaluationIds
            evaluationIds: ________________

PHASE 2 — SIMULATED DISASTER
  Step 2.1: Stop all application processes using @hex-di/guard
            Timestamp: ________________
  Step 2.2: [If applicable] Simulate backing store failure
            (shutdown database, corrupt storage, or network partition)
            Method: ________________

PHASE 3 — RECOVERY
  Step 3.1: Restore audit trail backing store from backup
            Restore start: ________________
            Restore end:   ________________
  Step 3.2: Restore WAL store from backup (if applicable)
            Result: ________________
  Step 3.3: Restore signing key material (HSM restore or key escrow retrieval)
            Result: ________________
  Step 3.4: Deploy guard configuration artifacts
            Result: ________________
  Step 3.5: Start application processes
            Timestamp: ________________
  Step 3.6: Total recovery time (Step 3.5 timestamp − Step 2.1 timestamp)
            Duration: ________________
            Acceptable: [ ] Yes (< site RTO)  [ ] No

PHASE 4 — POST-RECOVERY VERIFICATION
  Step 4.1: Execute verifyAuditChain() on all restored scopes
            Result: [ ] PASS  [ ] FAIL
  Step 4.2: Compare restored entry count per scope with Phase 1 baseline
            Match: [ ] Yes  [ ] No (document discrepancy)
  Step 4.3: Retrieve the 3 representative evaluationIds from Phase 1.5
            and verify all fields match the pre-disaster records
            Match: [ ] Yes  [ ] No (document discrepancy)
  Step 4.4: Execute createGuardHealthCheck() canary evaluation
            Result: [ ] PASS  [ ] FAIL
  Step 4.5: Execute 3 new guard evaluations (1 allow, 1 deny, 1 signed)
            and verify audit entries are recorded correctly
            Result: [ ] PASS  [ ] FAIL
  Step 4.6: Verify hash chain continuity — new entries chain correctly
            after restored entries (no chain break at recovery boundary)
            Result: [ ] PASS  [ ] FAIL
  Step 4.7: Verify WAL recovery scan — trigger scan and confirm no
            orphaned pending intents from pre-disaster evaluations
            Result: [ ] PASS  [ ] FAIL
  Step 4.8: Verify electronic signature validation — validate a pre-disaster
            signature using the restored signing key material
            Result: [ ] PASS  [ ] FAIL

PHASE 5 — RESULTS AND DISPOSITION
  Overall Result:   [ ] DR TEST PASSED  [ ] DR TEST FAILED
  Deviations:       [list any deviations with root cause and corrective action]
  Recovery Time:    [actual vs. site RTO]
  Data Loss:        [actual vs. site RPO — entries lost between backup and disaster]
  Recommendations:  [improvements for next DR cycle]

  Executor Signature:  ____________________  Date: __________
  Witness Signature:   ____________________  Date: __________
  QA Review:           ____________________  Date: __________
```

```
RECOMMENDED: Organizations SHOULD conduct an unannounced DR test at least once
             every 3 years to verify that DR procedures work under realistic
             conditions (i.e., without advance preparation by operations staff).
             Reference: EU GMP Annex 11 §16, GAMP 5 (business continuity).
```

### 67g. User Acceptance Testing (UAT) Script Template

The following UAT script template addresses the EU GMP Annex 11 §4.4 requirement for documented user acceptance testing. This template provides the structured format referenced in the UAT REQUIREMENT at the beginning of section 67.

```
REQUIREMENT: Consumer organizations deploying @hex-di/guard in GxP environments
             MUST complete UAT using this template (or an equivalent procedure
             approved by the quality unit) before production deployment. UAT
             is a CONSUMER responsibility, separate from the library-level
             OQ testing in section 67b.
             Reference: EU GMP Annex 11 §4.4, GAMP 5 Category 5.
```

```
User Acceptance Testing Script — @hex-di/guard
───────────────────────────────────────────────
Document ID:        UAT-GUARD-[VERSION]-[SEQ]
Revision:           [revision number]
System:             @hex-di/guard
Version:            [installed version]
Environment:        [UAT environment description]
System Owner:       [name and role]
UAT Lead:           [name and role]
Execution Date:     [ISO 8601]

SCOPE STATEMENT
  Guarded ports under test:     [list all guard-protected ports]
  Policies under test:          [list all policies applied to guarded ports]
  Subject personas:             [minimum 3 personas — see table below]
  Excluded from UAT scope:      [any ports/policies excluded with justification]

PERSONA DEFINITIONS

  | Persona | Role(s) | Permissions | Representative Of |
  |---------|---------|-------------|-------------------|
  | [e.g., Operator] | [e.g., "production-operator"] | [e.g., "batch:read", "batch:execute"] | [e.g., Production floor operators] |
  | [e.g., Reviewer] | [e.g., "qa-reviewer"] | [e.g., "batch:read", "batch:approve"] | [e.g., QA review staff] |
  | [e.g., Administrator] | [e.g., "system-admin"] | [e.g., "batch:*", "config:*"] | [e.g., System administrators] |

POSITIVE TEST SCENARIOS (minimum 5)

  | # | Persona | Port | Action | Expected Result | Actual Result | Pass? |
  |---|---------|------|--------|-----------------|---------------|-------|
  | P-1 | [Persona] | [Port] | [Operation] | Access GRANTED | | [ ] |
  | P-2 | | | | | | [ ] |
  | P-3 | | | | | | [ ] |
  | P-4 | | | | | | [ ] |
  | P-5 | | | | | | [ ] |
  [Add rows for additional scenarios: minimum 1 per guarded port]

NEGATIVE TEST SCENARIOS (minimum 5)

  | # | Persona | Port | Action | Expected Result | Actual Result | Pass? |
  |---|---------|------|--------|-----------------|---------------|-------|
  | N-1 | [Persona] | [Port] | [Operation] | Access DENIED | | [ ] |
  | N-2 | | | | | | [ ] |
  | N-3 | | | | | | [ ] |
  | N-4 | | | | | | [ ] |
  | N-5 | | | | | | [ ] |
  [Add rows for additional scenarios: minimum 1 per guarded port]

AUDIT TRAIL VERIFICATION

  Step A-1: For each positive test scenario, verify an AuditEntry exists
            with decision "allow" and correct subjectId, portName, timestamp.
            Result: [ ] PASS  [ ] FAIL
  Step A-2: For each negative test scenario, verify an AuditEntry exists
            with decision "deny" and correct subjectId, portName, timestamp,
            and denial reason.
            Result: [ ] PASS  [ ] FAIL
  Step A-3: Verify audit entries are legible — review 5 representative
            entries in the audit review interface and confirm all fields
            are human-readable and correctly formatted.
            Result: [ ] PASS  [ ] FAIL
  Step A-4: Verify audit entry completeness — compare the count of UAT
            evaluations performed with the count of audit entries recorded.
            Match: [ ] Yes  [ ] No (document discrepancy)
  Step A-5: [If electronic signatures tested] Verify signature entries
            include signerId, signerName, signerRole, signedAt, and
            signature meaning. Verify signature validation succeeds.
            Result: [ ] PASS  [ ] FAIL  [ ] N/A

DEVIATIONS

  | # | Scenario | Expected | Actual | Severity | Disposition |
  |---|----------|----------|--------|----------|-------------|
  | | | | | | |

RESULTS AND SIGN-OFF

  Total Positive Scenarios:    _____ Passed / _____ Total
  Total Negative Scenarios:    _____ Passed / _____ Total
  Audit Trail Verification:    [ ] PASS  [ ] FAIL
  Open Deviations:             _____ (list critical/major deviations)

  Overall UAT Result:          [ ] UAT PASSED  [ ] UAT FAILED

  UAT Lead Signature:          ____________________  Date: __________
  System Owner Signature:      ____________________  Date: __________
  QA Review Signature:         ____________________  Date: __________
```

```
RECOMMENDED: Organizations SHOULD supplement the scripted UAT scenarios above
             with exploratory testing — unscripted evaluation of the guard system
             by end users performing their normal workflows. Exploratory testing
             findings SHOULD be documented as supplementary evidence in the UAT
             report, even when no defects are found.
             Reference: EU GMP Annex 11 §4.4, GAMP 5 Category 5.
```

---

### Appendix: Validated Multi-Process Audit Trail Example

> **Source:** This example originates from the `@hex-di/clock` specification (section 10) and is preserved here as a GxP validation reference for organizations implementing multi-process audit systems.

The following example demonstrates a complete multi-process audit trail lifecycle, including process startup, event recording, process crash, restart, and audit trail reconstruction.

**Scenario:** Two Node.js processes (API server pods in Kubernetes) handle user requests. Process A crashes and is replaced by Process C.

```
Timeline:
  t=0ms     Process A starts (pid-a = "a1b2c3d4-...")
  t=0ms     Process B starts (pid-b = "e5f6g7h8-...")
  t=100ms   Process A: user "alice" creates record (seq=1)
  t=150ms   Process B: user "bob" reads record (seq=1)
  t=200ms   Process A: user "alice" updates record (seq=2)
  t=250ms   Process B: user "charlie" creates record (seq=2)
  t=300ms   Process A crashes
  t=350ms   Process C starts (pid-c = "i9j0k1l2-...")
  t=400ms   Process C: user "alice" reads record (seq=1)  <- seq resets to 1
  t=450ms   Process B: user "bob" updates record (seq=3)
```

**Raw audit trail entries (across all processes):**

```typescript
interface MultiProcessAuditEntry {
  readonly temporal: TemporalContext;
  readonly processInstanceId: string;
  readonly userId: string;
  readonly operation: string;
}

const auditTrail: ReadonlyArray<MultiProcessAuditEntry> = [
  // Process A events
  {
    temporal: { sequenceNumber: 1, monotonicTimestamp: 100, wallClockTimestamp: 1707753600100 },
    processInstanceId: "a1b2c3d4",
    userId: "alice",
    operation: "create",
  },
  {
    temporal: { sequenceNumber: 2, monotonicTimestamp: 200, wallClockTimestamp: 1707753600200 },
    processInstanceId: "a1b2c3d4",
    userId: "alice",
    operation: "update",
  },

  // Process B events
  {
    temporal: { sequenceNumber: 1, monotonicTimestamp: 150, wallClockTimestamp: 1707753600150 },
    processInstanceId: "e5f6g7h8",
    userId: "bob",
    operation: "read",
  },
  {
    temporal: { sequenceNumber: 2, monotonicTimestamp: 250, wallClockTimestamp: 1707753600250 },
    processInstanceId: "e5f6g7h8",
    userId: "charlie",
    operation: "create",
  },
  {
    temporal: { sequenceNumber: 3, monotonicTimestamp: 450, wallClockTimestamp: 1707753600450 },
    processInstanceId: "e5f6g7h8",
    userId: "bob",
    operation: "update",
  },

  // Process C events (after restart)
  {
    temporal: { sequenceNumber: 1, monotonicTimestamp: 50, wallClockTimestamp: 1707753600400 },
    processInstanceId: "i9j0k1l2",
    userId: "alice",
    operation: "read",
  },
];
```

**Audit trail reconstruction algorithm:**

```typescript
function reconstructTimeline(
  entries: ReadonlyArray<MultiProcessAuditEntry>
): ReadonlyArray<MultiProcessAuditEntry> {
  // Step 1: Group by processInstanceId
  const byProcess = Map.groupBy(entries, e => e.processInstanceId);

  // Step 2: Within each process group, sort by sequenceNumber (authoritative ordering)
  const sortedGroups = [...byProcess.values()].map(group =>
    [...group].sort((a, b) => a.temporal.sequenceNumber - b.temporal.sequenceNumber)
  );

  // Step 3: Verify per-process sequence continuity (no gaps)
  for (const group of sortedGroups) {
    for (let i = 1; i < group.length; i++) {
      const expected = group[i - 1].temporal.sequenceNumber + 1;
      const actual = group[i].temporal.sequenceNumber;
      if (actual !== expected) {
        // Gap detected: possible data loss during this process lifetime
        reportAuditGap(group[i - 1], group[i]);
      }
    }
  }

  // Step 4: Interleave across processes using wallClockTimestamp (best-effort global ordering)
  const allSorted = sortedGroups
    .flat()
    .sort((a, b) => a.temporal.wallClockTimestamp - b.temporal.wallClockTimestamp);

  return allSorted;
}
```

**Reconstructed timeline (sorted by wallClockTimestamp):**

| Global Order | Process      | Seq | Wall Clock | User    | Operation |
| ------------ | ------------ | --- | ---------- | ------- | --------- |
| 1            | A (a1b2c3d4) | 1   | ...600100  | alice   | create    |
| 2            | B (e5f6g7h8) | 1   | ...600150  | bob     | read      |
| 3            | A (a1b2c3d4) | 2   | ...600200  | alice   | update    |
| 4            | B (e5f6g7h8) | 2   | ...600250  | charlie | create    |
| 5            | C (i9j0k1l2) | 1   | ...600400  | alice   | read      |
| 6            | B (e5f6g7h8) | 3   | ...600450  | bob     | update    |

**Key observations for auditors:**

1. Process A events (seq 1-2) and Process C events (seq 1) both have `sequenceNumber: 1`, but different `processInstanceId` values — no ambiguity.
2. Within each process, `sequenceNumber` provides guaranteed total ordering. Cross-process ordering relies on `wallClockTimestamp` with NTP-dependent precision.
3. The gap between Process A's last event (seq=2) and Process C's first event (seq=1) corresponds to Process A's crash at t=300ms — no events were lost, the sequence simply restarted in a new process.
4. `monotonicTimestamp` values are NOT comparable across processes (Process C's 50ms is unrelated to Process B's 450ms).

REQUIREMENT: GxP organizations MUST implement and validate an audit trail reconstruction procedure equivalent to the algorithm above. The procedure MUST:

1. Group entries by `processInstanceId` before applying sequence-based ordering.
2. Verify per-process sequence continuity and flag gaps.
3. Use `wallClockTimestamp` for cross-process interleaving (acknowledging NTP-dependent precision).
4. Produce a human-readable timeline that includes the `processInstanceId` for every entry.

REQUIREMENT: The reconstruction procedure MUST be documented in the computerized system validation plan and tested with representative data volumes during PQ.

---

_Previous: [Compliance Verification](./08-compliance-verification.md) | Next: [Risk Assessment](./10-risk-assessment.md)_
