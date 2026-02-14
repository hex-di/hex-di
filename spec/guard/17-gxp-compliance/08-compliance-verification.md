# 17 - GxP Compliance: Compliance Verification

<!-- Document Control
| Property         | Value                                    |
|------------------|------------------------------------------|
| Document ID      | GUARD-17-08                              |
| Revision         | 1.1                                      |
| Effective Date   | 2026-02-13                               |
| Author           | HexDI Engineering                        |
| Reviewer         | GxP Compliance Review                    |
| Approved By      | Regulatory Affairs Lead, Quality Assurance Manager |
| Classification   | GxP Compliance Sub-Specification         |
| Change History   | 1.1 (2026-02-13): Added readiness item 15 (predicateRuleMapping), certificate lifecycle/algorithm migration checklist items, Annex 11 Section 5/6 verification items |
|                  | 1.0 (2026-02-13): Initial controlled release |
-->

_Previous: [Electronic Signatures](./07-electronic-signatures.md) | Next: [Validation Plan](./09-validation-plan.md)_

---

## 66. Compliance Verification Checklist

This checklist is for teams validating `@hex-di/guard` for use in a GxP-regulated environment.

```
REQUIREMENT: This compliance verification checklist MUST be completed before
             @hex-di/guard is deployed in a GxP production environment. All items
             MUST be checked and documented with evidence references. Unchecked items
             MUST be documented as deviations with risk assessment and remediation plan.
             Reference: GAMP 5 Category 5 testing requirements.
```

### Audit Trail Verification

- [ ] `AuditTrailPort` adapter implements append-only storage (no UPDATE/DELETE) — _Ref: §61.1 | Evidence: OQ-6, OQ-7_
- [ ] `AuditTrail.record()` is called for every guard evaluation (allow AND deny) — _Ref: §61.3 | Evidence: OQ-7_
- [ ] `AuditEntry` contains all 10 base required fields (evaluationId, timestamp, subjectId, authenticationMethod, policy, decision, portName, scopeId, reason, durationMs); GxP mode adds 6 integrity fields — see `GxPAuditEntry` checklist item below — _Ref: §61.3 | Evidence: OQ-7_
- [ ] `AuditEntry.timestamp` uses ISO 8601 UTC from an NTP-synchronized clock — _Ref: §62 | Evidence: PQ-6_
- [ ] `NoopAuditTrail` is NOT used in production GxP environments — _Ref: §61.5 | Evidence: OQ-11_
- [ ] Audit trail write failures (ACL008) trigger operational alerts — _Ref: §61.3 | Evidence: OQ-9_
- [ ] Hash chain integrity is verifiable from genesis (`verifyAuditChain()`) — _Ref: §61.4 | Evidence: OQ-6_
- [ ] `failOnAuditError` is set to `true` in GxP-regulated environments — _Ref: §61.3 | Evidence: OQ-9_
- [ ] GxP audit trail adapters use `GxPAuditEntry` with non-optional integrity fields (`integrityHash`, `previousHash`, `sequenceNumber`, `traceDigest`, `policySnapshot`, `signature`) — _Ref: §61.4, see `GxPAuditEntry` definition in `07-guard-adapter.md` | Evidence: OQ-6, OQ-7_
- [ ] AuditTrail adapter documents its durability tier ("Durable Ok" or "Buffered Ok") in the adapter design specification — _Ref: §61.3a | Evidence: adapter design spec, OQ verification_
- [ ] Primary audit trail backing store employs data redundancy (RAID, replication, multi-AZ) sufficient to survive a single physical storage failure — _Ref: §63 | Evidence: IQ, adapter design specification_
- [ ] Non-Obscurement invariant verified: append-only + hash chain ensures modifications are detectable — _Ref: §61.6 | Evidence: OQ-6_
- [ ] Automated capacity monitoring configured with thresholds (WARNING 70%, CRITICAL 85%, EMERGENCY 95%) and hourly check interval — _Ref: §63a (Automated Capacity Monitoring) | Evidence: OQ-20_
- [ ] WAL entries include CRC-32 or SHA-256 checksum for partial write detection when `gxp: true` — _Ref: §61 (WAL Behavioral Contract) | Evidence: OQ-19_
- [ ] WAL recovery scan verifies entry integrity before processing — _Ref: §61 (WAL Behavioral Contract) | Evidence: OQ-19_
- [ ] `PolicyChangeAuditEntry` recorded before policy activation when `gxp: true` — _Ref: §64a-1 | Evidence: OQ-23_
- [ ] `PolicyChangeAuditEntry.approverId` differs from `actorId` (separation of duties) — _Ref: §64a-1 | Evidence: OQ-23_
- [ ] `PolicyChangeAuditEntry` participates in same hash chain as regular `AuditEntry` (no separate chain) — _Ref: §64a-1 | Evidence: OQ-23_
- [ ] Completeness monitoring active when `gxp: true` (`createCompletenessMonitor()` or equivalent mechanism deployed) — _Ref: §61 (R1) | Evidence: OQ-7, health check output_
- [ ] `PolicyChangeAuditEntry` hash chain uses canonical 13-field alphabetical ordering per §61.4b — _Ref: §61.4b | Evidence: OQ-27_
- [ ] `verifyAuditChain()` handles mixed `AuditEntry` + `PolicyChangeAuditEntry` chains via `_tag` discrimination — _Ref: §61.4b | Evidence: OQ-27_
- [ ] Field truncation strategy (reject or truncate) is configured and documented when `gxp` is `true` — _Ref: §61 | Evidence: OQ_
- [ ] `dataClassification` backfill writes `DataClassificationChangeEntry` to `MetaAuditTrailPort` when `gxp` is `true` — _Ref: §61 | Evidence: OQ-28_
- [ ] Completeness monitoring escalation follows the 6-step procedure with defined SLAs — _Ref: §61.3 | Evidence: OQ_

### Access Control Verification

- [ ] All ports requiring authorization are wrapped with `guard()` — _Ref: §25-28 | Evidence: OQ-1, OQ-3_
- [ ] Subject provenance is traceable (`authenticationMethod`, `authenticatedAt`) — _Ref: §60 (Attributable) | Evidence: OQ-7_
- [ ] Separation of duties is enforced via policy composition (e.g., maker-checker patterns) — _Ref: §65 | Evidence: OQ-10_
- [ ] Least privilege: each subject has only the permissions required for their role — _Ref: §25-28 | Evidence: OQ-1_
- [ ] Counter-signing policies use distinct `signerRole` values to enforce separation of duties — _Ref: §65 | Evidence: OQ-10_
- [ ] `SignatureService.capture()` rejects same-signer duplicates within a single evaluation (per-evaluationId tracking) — _Ref: §65 | Evidence: OQ-10_
- [ ] Separation of duties enforcement is active in GxP environments (`enforceSeparation: true`) — _Ref: §65 | Evidence: OQ-10_
- [ ] Attribute sanitization active when `gxp: true` (1024 char max, control character replacement with U+FFFD) — _Ref: §06-subject.md (R2) | Evidence: OQ-7, sanitization log verification_
- [ ] `validateGxPSubject()` rejects anonymous subjects before policy evaluation when `gxp` is `true` — _Ref: §22, §25 | Evidence: OQ-26_

### Data Integrity Verification

- [ ] All `Decision` and `AuditEntry` objects are immutable (frozen) — _Ref: §60 (Original) | Evidence: OQ-1_
- [ ] `evaluationId` (UUID v4) uniquely identifies each evaluation — _Ref: §60 (Consistent) | Evidence: OQ-7_
- [ ] `evaluatedAt` timestamp is contemporaneous (within clock sync tolerance) — _Ref: §60 (Contemporaneous), §62 | Evidence: PQ-6_
- [ ] `EvaluationTrace` provides full decision provenance (which sub-policies passed/failed) — _Ref: §60 (Accurate) | Evidence: OQ-1_
- [ ] Policy input schema validation active when `gxp: true`: attribute types checked against declared schema at graph construction time (Annex 11 Section 5) — _Ref: §59 (REQ-GUARD-070) | Evidence: OQ-41_
- [ ] Resource attribute accuracy checks active when `gxp: true`: freshness thresholds configured for time-sensitive attributes (Annex 11 Section 6) — _Ref: §59 (REQ-GUARD-071) | Evidence: OQ-42_

### Clock and Timestamp Verification

- [ ] Production clock source is NTP-synchronized (drift < 1 second) — _Ref: §62, spec/clock/06-gxp-compliance/ntp-synchronization.md §18 | Evidence: PQ-6_
- [ ] All timestamp fields use ISO 8601 UTC format — _Ref: §62 | Evidence: OQ-7_
- [ ] Test clock source produces deterministic timestamps — _Ref: §62 | Evidence: OQ-1_
- [ ] `AuthSubject.authenticatedAt` uses ISO 8601 UTC with "Z" designator — _Ref: §06-subject.md, §62 | Evidence: OQ-7_
- [ ] Guard wrapper logs warning on malformed `authenticatedAt` format (does not block evaluation) — _Ref: §62 | Evidence: OQ-1_
- [ ] Automated clock drift monitoring is implemented and alerting is active — _Ref: §62, spec/clock/06-gxp-compliance/ntp-synchronization.md §18 | Evidence: PQ-6_
- [ ] NTP service unavailability fallback produces WARNING log and reduced confidence metadata in audit entries — _Ref: §62, spec/clock/07-integration.md §24 | Evidence: OQ-21_
- [ ] RTC availability verified at ClockSource construction when `gxp: true` (plausible range, monotonic advance) — _Ref: §62, spec/clock/04-platform-adapters.md §13 | Evidence: OQ-21, startup verification log_

### Retention and Archival Verification

- [ ] Audit records retained per regulatory requirements (minimum periods in section 63) — _Ref: §63 | Evidence: documented retention policy_
- [ ] Archived records remain queryable for the retention period — _Ref: §63 | Evidence: documented retention policy_
- [ ] Policy snapshots are version-controlled (git history) — _Ref: §64a | Evidence: change control documentation_
- [ ] Audit trail exports include manifest with checksum for independent verification — _Ref: §64 | Evidence: export format documentation_
- [ ] CSV exports sanitize cell values to prevent formula injection (prefix =, +, -, @ with single quote) — _Ref: §64e, §09-serialization.md (section 36) | Evidence: OQ export sanitization tests_
- [ ] Periodic archive readability verification scheduled (at least annually throughout retention period) — _Ref: §70 (G3) | Evidence: verification schedule, annual verification reports_

### Electronic Signature Verification

- [ ] `SignatureServicePort` is registered when `hasSignature` policies are used — _Ref: §65 | Evidence: OQ-8_
- [ ] `SignatureService.capture()` rejects expired/missing `ReauthenticationToken` — _Ref: §65a, §65b | Evidence: OQ-8_
- [ ] `SignatureService.capture()` populates all `ElectronicSignature` fields including `reauthenticated: true` — _Ref: §65a | Evidence: OQ-8_
- [ ] `SignatureService.validate()` checks cryptographic integrity, binding integrity, and key status — _Ref: §65a | Evidence: OQ-8_
- [ ] `SignatureService.reauthenticate()` enforces two-component identification (signerId + credential) — _Ref: §65b | Evidence: OQ-8_
- [ ] `ReauthenticationToken` has a limited validity window (recommended 5 minutes) — _Ref: §65b | Evidence: OQ-8_
- [ ] Key rotation does not invalidate existing signatures (old keys in verify-only state) — _Ref: §65c | Evidence: OQ-8_
- [ ] Revoked keys cannot be used for new signatures (`capture()` returns Err) — _Ref: §65c | Evidence: OQ-8_
- [ ] `validate()` on revoked-key signatures returns `{ valid: true, keyActive: false }` — _Ref: §65c | Evidence: OQ-8_
- [ ] Signing keys stored in HSM/keystore/secrets manager (not env vars) when gxp: true — _Ref: §65c | Evidence: IQ-10_
- [ ] `signerName` is required (non-empty) on GxP audit entries with signatures — _Ref: §65a, §07-guard-adapter.md | Evidence: OQ-8_
- [ ] signerId registry reviewed at least annually (no reassignment, departed personnel deactivated) — _Ref: §65b | Evidence: registry review documentation_
- [ ] Asymmetric algorithm (RSA-SHA256 or ECDSA P-256) used for compliance evidence signatures — _Ref: §65c | Evidence: adapter configuration, OQ-8_
- [ ] ReauthenticationToken configured lifetime does not exceed 15 minutes — _Ref: §65b | Evidence: adapter configuration, OQ-8_
- [ ] Account lockout enforced after consecutive re-authentication failures — _Ref: §65b | Evidence: OQ-16, adapter configuration_
- [ ] Minimum cryptographic key sizes enforced (RSA 2048-bit, ECDSA P-256, HMAC 256-bit) — _Ref: §65c | Evidence: adapter configuration_
- [ ] `SignatureService` adapter passes `createSignatureServiceConformanceSuite` with `gxpMode: true` (15 tests) — _Ref: §13-testing.md | Evidence: OQ-8, conformance suite results_
- [ ] Multi-signature capture order deterministic (depth-first, left-to-right policy tree traversal) — _Ref: §65 (G2) | Evidence: OQ-8, signature ordering verification_
- [ ] HSM key ceremony requires dual-person control with documented evidence when HSM is used — _Ref: §65c-1 | Evidence: OQ_
- [ ] HSM key rotation transitions old keys to verify-only state with audit entry — _Ref: §65c-1 | Evidence: OQ_
- [ ] HSM unavailability returns `Err` with `"hsm_unavailable"` and triggers MAJOR alert — _Ref: §65c-1 | Evidence: OQ_
- [ ] Certificate lifecycle management active: automated monitoring at 90/30/7-day expiry thresholds — _Ref: §65c-3 (REQ-GUARD-068) | Evidence: OQ-39, certificate monitoring configuration_
- [ ] CRL/OCSP revocation checking implemented in `validate()` with configurable soft-fail/hard-fail (hard-fail default for GxP) — _Ref: §65c-3 (REQ-GUARD-068) | Evidence: OQ-39_
- [ ] Complete certificate chain (end-entity + intermediates + root CA) archived alongside audit trail data when `gxp: true` — _Ref: §65c-3 (REQ-GUARD-068) | Evidence: OQ-39, archival verification_
- [ ] No self-signed certificates used in GxP production environments — _Ref: §65c-3 (REQ-GUARD-068) | Evidence: IQ certificate audit_
- [ ] Algorithm migration follows epoch-based approach with three-phase sequence (verify-only → dual → primary) — _Ref: §65c-4 (REQ-GUARD-069) | Evidence: OQ-40_
- [ ] `verifyAuditChain()` supports multi-algorithm verification across epoch boundaries — _Ref: §65c-4 (REQ-GUARD-069) | Evidence: OQ-40_
- [ ] Algorithm deprecation timeline active: T-24mo INFO, T-12mo checkGxPReadiness WARNING, T-0 removed from signing — _Ref: §65c-4 (REQ-GUARD-069) | Evidence: OQ-40, deprecation monitoring_

### Testing Verification

- [ ] Mutation testing kill rate meets targets (section 16) — _Ref: §16 (DoD) | Evidence: OQ-4, OQ-5_
- [ ] `MemoryAuditTrail.validateChain()` passes in all test scenarios — _Ref: §61 | Evidence: OQ-6_
- [ ] `MemorySignatureService` provides deterministic signature operations for testing — _Ref: §65 | Evidence: OQ-8_
- [ ] `MemorySignatureService` passes `createSignatureServiceConformanceSuite` (10 core tests) in CI on every commit — _Ref: §13-testing.md | Evidence: OQ-8, CI pipeline_
- [ ] ALCOA+ properties are verified in integration tests — _Ref: §60 | Evidence: OQ-3_
- [ ] WAL backlog does not degrade evaluation latency beyond PQ-9 thresholds — _Ref: §61 | Evidence: PQ-9_
- [ ] PQ soak test duration >= 4 hours when `gxp: true` (REQUIREMENT per §67) — _Ref: §67 (R3) | Evidence: PQ report, soak test duration_
- [ ] OQ test suite includes OQ-26 through OQ-31 (6 adversarial tests) — _Ref: §67b | Evidence: OQ-26 to OQ-31_
- [ ] OQ test suite includes OQ-38 through OQ-42 (5 GxP compliance gap closure tests) — _Ref: §67b | Evidence: OQ-38 to OQ-42_

### Rate Limiting Verification

- [ ] `maxEvaluationsPerSecond` is configured on `createGuardGraph()` when `gxp: true` — _Ref: §07-guard-adapter.md (Evaluation Rate Limiting), FM-20 | Evidence: guard graph configuration_
- [ ] Rate-limited evaluations produce `RateLimitSummaryAuditEntry` in the audit trail when `gxp: true` — _Ref: §07-guard-adapter.md (RateLimitSummaryAuditEntry) | Evidence: OQ rate limiting tests_
- [ ] `RateLimitSummaryAuditEntry` participates in the hash chain with correct canonical field ordering — _Ref: §07-guard-adapter.md, §61.4 | Evidence: OQ chain verification tests_

### Health Check Verification

- [ ] `createGuardHealthCheck()` returns `GuardHealthCheckResult` with all three sub-checks (policyEvaluationOk, auditTrailResponsive, chainIntegrityOk) — _Ref: §07-guard-adapter.md | Evidence: OQ-1_
- [ ] Health check is scheduled for daily execution in GxP production environments — _Ref: §64 (periodic review) | Evidence: operational configuration documentation_
- [ ] `maxRecentDecisions` >= 200 when `gxp: true` (`checkGxPReadiness()` validates this) — _Ref: §12-inspection.md (R4) | Evidence: readiness report_

### Multi-Region Verification (if applicable)

- [ ] Cross-region consolidation uses evaluationId as deduplication key — _Ref: §61.4a (multi-region guidance) | Evidence: FM-22 mitigation_
- [ ] Region identifier included in audit entry metadata — _Ref: §61.4a | Evidence: multi-region deployment documentation_
- [ ] Cross-region ordering strategy documented in validation plan when `gxp: true` (region identifiers, NTP hierarchy, accepted variance, deduplication, ordering guarantees) — _Ref: §61.4a (Cross-Region Ordering REQUIREMENT when gxp:true) | Evidence: validation plan, IQ review_

### GxP Readiness Verification

- [ ] `checkGxPReadiness()` returns a passing report for the production guard configuration — _Ref: §07-guard-adapter.md | Evidence: pre-deployment check output_
- [ ] `checkGxPReadiness()` emits warning if hasSignature policies use symmetric-only algorithm — _Ref: §07-guard-adapter.md | Evidence: readiness report_
- [ ] All 15 readiness items pass (gxp flag, non-Noop audit trail, non-MemoryAuditTrail, failOnAuditError, WalStore, policies, SignatureService, ClockSource, asymmetric algorithm check, clock drift monitoring, MemoryAuditTrail production escalation, maxScopeLifetimeMs, port gate hook detection, maxRecentDecisions >= 200, predicateRuleMapping non-empty) — _Ref: §07-guard-adapter.md, §12-inspection.md, §59 (REQ-GUARD-067) | Evidence: readiness report_
- [ ] `checkGxPReadiness()` item 15 (`predicateRuleMapping` non-empty when `gxp: true`) passes — _Ref: §59 (REQ-GUARD-067) | Evidence: readiness report, OQ-38_
- [ ] `checkGxPReadiness()` item 10 (clock drift monitoring) passes — _Ref: §07-guard-adapter.md | Evidence: readiness report_
- [ ] `checkGxPReadiness()` item 11 (MemoryAuditTrail production detection) passes — _Ref: §07-guard-adapter.md | Evidence: readiness report_
- [ ] `checkGxPReadiness()` item 12 (`maxScopeLifetimeMs` configured when `gxp: true`) passes — _Ref: §07-guard-adapter.md | Evidence: readiness report_
- [ ] `checkGxPReadiness()` item 13 (no ports with PortGateHook-only, no `guard()`) passes — _Ref: §07-guard-adapter.md, §08-port-gate-hook.md | Evidence: readiness report_
- [ ] Guard adapter emits one-time diagnostic warning (`guard.gxp-readiness-unchecked`) on first evaluation when `gxp: true` and `checkGxPReadiness()` has not been called — _Ref: §59 (System Validation RECOMMENDED) | Evidence: diagnostic log verification_
- [ ] `SubjectProviderPort` adapter passes `createSubjectProviderConformanceSuite` (12 tests) — _Ref: §13-testing.md | Evidence: OQ conformance suite results_
- [ ] `SignatureService` adapter passes `createSignatureServiceConformanceSuite` (15 tests with gxpMode: true) — _Ref: §13-testing.md | Evidence: OQ-8, conformance suite results_
- [ ] Audit trail export includes `AuditExportManifest` with SHA-256 checksum — _Ref: §09-serialization.md (section 36) | Evidence: export format verification_
- [ ] `checkPreDeploymentCompliance()` returns a passing report for the production deployment artifacts — _Ref: §07-guard-adapter.md (checkPreDeploymentCompliance) | Evidence: pre-deployment compliance report_

### Backing Store Availability Verification

- [ ] Documented minimum availability target for audit trail backing store defined in validation plan — _Ref: §61.7 | Evidence: validation plan, availability target documentation_
- [ ] Automated health check interval ≤ 5 minutes for backing store availability monitoring when `gxp: true` — _Ref: §61.7 | Evidence: health check configuration, monitoring dashboard_
- [ ] Escalation thresholds configured: WARNING (1 min), CRITICAL (5 min), EMERGENCY (15 min) — _Ref: §61.7 | Evidence: alerting configuration, escalation procedure documentation_
- [ ] Rolling 30-day uptime percentage tracked and reported in periodic review — _Ref: §61.7 | Evidence: monitoring reports, periodic review report_

### Infrastructure Security Verification

- [ ] Connections between application layer and audit trail backing store use encrypted transport (TLS 1.2+ or equivalent) — _Ref: §63 (In-Transit Encryption REQUIREMENT when gxp:true) | Evidence: IQ, network configuration documentation_
- [ ] Geographically separate DR site maintained for Critical-severity deployments (if applicable) — _Ref: §63 (Disaster Recovery RECOMMENDED) | Evidence: DR site documentation, restore test results_
- [ ] Periodic security assessment conducted at least annually — _Ref: §64f-1 (Periodic Security Assessment REQUIREMENT) | Evidence: penetration test report, security assessment documentation_
- [ ] Web-based audit trail review interfaces implement Content Security Policy (CSP) headers — _Ref: §64f-1 (Periodic Security Assessment REQUIREMENT) | Evidence: CSP header configuration_
- [ ] SBOM generated in CycloneDX or SPDX format covering all direct and transitive dependencies when `gxp: true` — _Ref: §67a (IQ-12, SBOM REQUIREMENT when gxp:true) | Evidence: SBOM file, IQ report_

### Administrative and Lifecycle Verification

- [ ] Runtime guard configuration changes produce admin event log entries — _Ref: §64b | Evidence: OQ-3_
- [ ] Admin event logs are append-only with same retention and access controls as the audit trail — _Ref: §64b | Evidence: OQ-3_
- [ ] Decommissioning export tested and produces self-contained archive with intact hash chains and signature key material — _Ref: §70 | Evidence: decommissioning test report_
- [ ] Access rights lifecycle is defined and integrated with identity management (annual review, prompt revocation) — _Ref: §64 (REQUIREMENT) | Evidence: access lifecycle documentation_
- [ ] Risk-based audit trail review frequency is documented per port category — _Ref: §64 (REQUIREMENT) | Evidence: validation plan_
- [ ] Annual OQ re-verification is scheduled and documented — _Ref: §64 (REQUIREMENT) | Evidence: periodic review schedule_
- [ ] FMEA is reviewed each periodic review cycle with documented updates — _Ref: §68 (REQUIREMENT) | Evidence: periodic review report_
- [ ] WAL recovery events reported to QA/compliance as data integrity incidents — _Ref: §61 (WAL recovery) | Evidence: incident reporting procedures_
- [ ] Documented procedure for providing audit trail data to regulatory inspectors on demand — _Ref: §64 | Evidence: inspector access procedure document_
- [ ] Validation plan linked to site-level VMP with document identifier and approval date — _Ref: §67 | Evidence: VMP reference, validation report_
- [ ] Multi-tenant audit trail isolation verified (if applicable) — _Ref: §64 | Evidence: access control documentation_
- [ ] UTF-8 encoding for audit trail storage and exports; non-ASCII content renders correctly in review interfaces — _Ref: §64 (G1) | Evidence: export format verification, i18n test results_
- [ ] Digital inspector access procedure documented and tested, if provided (time-limited credentials, meta-audit logging, revocation) — _Ref: §64 (G5) | Evidence: inspector access procedure document, OQ test results_
- [ ] GxP regression test permanence verification passes (all registered regression test IDs present in OQ test suite) — _Ref: §67b (OQ-24) | Evidence: OQ-24 results, gxp-regression-registry.json_
- [ ] No direct production policy modification outside change control or ECR — _Ref: §64a-ext-1 | Evidence: OQ_
- [ ] Policy rollback implemented as new `PolicyChangeAuditEntry` with reverted policy — _Ref: §64a-3 | Evidence: OQ-31_
- [ ] `diffReportChecksum` included in `GxPPolicyChangeAuditEntry` and hash chain computation — _Ref: §64a-1 | Evidence: OQ-27_

### Cross-Library Validation Verification (if @hex-di/http-client co-deployed)

- [ ] Version compatibility matrix verified between @hex-di/guard and @hex-di/http-client — _Ref: §64a-2 (OQ-25) | Evidence: IQ version compatibility check, OQ-25 results_
- [ ] Shared ClockSource confirmed: both libraries use the same ClockSource instance — _Ref: §64a-2 (OQ-25) | Evidence: OQ-25 shared ClockSource test results_
- [ ] Shared hash chain verified: audit entries from both libraries participate in consistent hash chain — _Ref: §64a-2 (OQ-25) | Evidence: OQ-25 hash chain integration test results_
- [ ] Signature delegation verified: http-client signature delegation produces valid signatures verifiable by guard's validate() — _Ref: §64a-2 (OQ-25) | Evidence: OQ-25 signature delegation test results_
- [ ] Joint change control process documented for changes affecting shared infrastructure — _Ref: §64a-2 | Evidence: change control procedure documentation_
- [ ] Joint periodic review includes both libraries when co-deployed — _Ref: §64a-2 | Evidence: periodic review schedule, joint review documentation_

---

---

_Previous: [Electronic Signatures](./07-electronic-signatures.md) | Next: [Validation Plan](./09-validation-plan.md)_
