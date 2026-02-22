# Appendix V: Consumer Integration Validation Checklist

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-15-V                               |
> | Revision         | 1.0                                      |
> | Effective Date   | 2026-02-15                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Appendix                             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-15): Split from consolidated 15-appendices.md (CCR-GUARD-017) |

_Previous: [Appendix U: Cross-Enhancement Composition Examples](./composition-examples.md) | Next: [Appendices Index](./README.md)_

---

This appendix consolidates all consumer-side GxP requirements from across the guard specification into a single actionable checklist. Use this as a pre-deployment validation guide when deploying `@hex-di/guard` in a GxP-regulated environment. Every item references the authoritative specification section for full details.

> **Scope:** This checklist covers consumer integration responsibilities only. Library-level validation (IQ/OQ/PQ) is covered by the programmatic runners in §67. This checklist addresses the gap between library validation and production deployment.

### Phase 1: System Classification and Guard Configuration

| # | Requirement | Spec Section | Consumer Action | Verification Method |
|---|-------------|-------------|-----------------|---------------------|
| V-01 | Classify system as "closed" or "open" per 21 CFR 11.3 | §59 (01-regulatory-context.md) | Document classification and rationale in the validation plan | Review classification document |
| V-02 | Set `gxp: true` on `createGuardGraph()` | §66 (08-compliance-verification.md) | Configure guard graph with `gxp: true` | `checkGxPReadiness()` item 1 |
| V-03 | Provide a durable `AuditTrailPort` adapter (not Noop, not Memory) | §61 (02-audit-trail-contract.md) | Deploy a production-grade audit trail adapter with documented durability tier | `checkGxPReadiness()` items 2-3; adapter conformance suite |
| V-04 | Configure `failOnAuditError: true` | §07 (07-guard-adapter.md), [ADR #27](../decisions/027-fail-on-audit-error-default.md) | Set `failOnAuditError: true` on `createGuardGraph()` (default) | `checkGxPReadiness()` item 4 |
| V-05 | Provide a `WalStore` implementation | §61 (02-audit-trail-contract.md), [ADR #32](../decisions/032-built-in-wal-gxp-enforcement.md) | Deploy a durable WAL store for crash recovery | `checkGxPReadiness()` item 5 |
| V-06 | Set `maxScopeLifetimeMs` | §07 (07-guard-adapter.md), [ADR #45](../decisions/045-max-scope-lifetime-gxp.md) | Configure maximum scope lifetime (e.g., 3,600,000 for 1 hour) | `checkGxPReadiness()` item 12 |

### Phase 2: Clock and Cryptography

| # | Requirement | Spec Section | Consumer Action | Verification Method |
|---|-------------|-------------|-----------------|---------------------|
| V-07 | Provide an NTP-synchronized `ClockSource` | §62 (03-clock-synchronization.md) | Deploy a clock source synchronized to a traceable NTP server | `checkGxPReadiness()` item 8; verify drift < 1 second |
| V-08 | Configure `SignatureService` with asymmetric algorithms (if using e-signatures) | §65c (07-electronic-signatures.md), [ADR #38](../decisions/038-asymmetric-algorithms-gxp.md) | Deploy RSA-SHA256 (2048-bit min) or ECDSA P-256 | `checkGxPReadiness()` item 9 |
| V-09 | Store signing keys in HSM/keystore/secrets manager | §65c (07-electronic-signatures.md), [ADR #43](../decisions/043-hsm-required-gxp-key-storage.md) | Deploy HSM or cloud KMS for key storage | Verify key storage in IQ |
| V-10 | Configure account lockout on `SignatureService.reauthenticate()` | §65b (07-electronic-signatures.md) | Set lockout threshold (e.g., 5 consecutive failures) | OQ test case |

### Phase 3: Audit Trail Infrastructure

| # | Requirement | Spec Section | Consumer Action | Verification Method |
|---|-------------|-------------|-----------------|---------------------|
| V-11 | Ensure primary storage has data redundancy (RAID, replication, multi-AZ) | §63 (04-data-retention.md), [ADR #42](../decisions/042-audit-trail-storage-redundancy.md) | Deploy audit trail backend on redundant storage | IQ verification |
| V-12 | Document port-to-record-type mapping with retention periods | §63 (04-data-retention.md) | Map each guarded port to its electronic record type and minimum retention period | Validation plan review |
| V-13 | Configure backup with documented RPO and RTO | §63 (04-data-retention.md) | Establish backup frequency, RPO, RTO, and annual restore test schedule | PQ test case |
| V-14 | Verify audit trail adapter via conformance suite | §13 (13-testing.md), [ADR #36](../decisions/036-audit-trail-conformance-suite.md) | Run `createAuditTrailConformanceSuite()` against production adapter | OQ evidence |
| V-15 | Configure completeness monitoring | §61 (02-audit-trail-contract.md) | Deploy sequence number gap detection and alerting | OQ test case |

### Phase 4: Incident Management and Monitoring

| # | Requirement | Spec Section | Consumer Action | Verification Method |
|---|-------------|-------------|-----------------|---------------------|
| V-16 | Configure GxP incident event handling for ACL008, ACL018, ACL009, ACL014 | §37 (10-cross-library.md) | Register a `GuardEventSinkPort` adapter that forwards `GuardErrorEvent` instances to SIEM/alerting infrastructure | Verify alert delivery in OQ |
| V-17 | Schedule daily health checks via `createGuardHealthCheck()` | §07 (07-guard-adapter.md), §64 (05-audit-trail-review.md) | Schedule `createGuardHealthCheck()` in production job scheduler | Verify health check execution in PQ |
| V-18 | Schedule automated chain verification (daily for active, weekly for archived) | §64 (05-audit-trail-review.md) | Configure `verifyAuditChain()` on documented schedule | Verify chain verification execution in PQ |
| V-19 | Establish Chain Break Response procedure | §61.4 (02-audit-trail-contract.md) | Document response SLAs, escalation matrix, and quarantine procedure | Review SOP |

### Phase 5: Administrative Controls and Personnel

| # | Requirement | Spec Section | Consumer Action | Verification Method |
|---|-------------|-------------|-----------------|---------------------|
| V-20 | Assign administrative roles per §64g | §64g (06-administrative-controls.md) | Configure `AdminGuardConfig` with role assignments | Review admin configuration |
| V-21 | Verify role incompatibility enforcement | §64g (06-administrative-controls.md) | Confirm that Guard Administrator, Key Custodian, and Quality Reviewer are held by different personnel | Access review |
| V-22 | Complete training for all guard operators (4 training areas + competency assessment) | §64c (06-administrative-controls.md) | Conduct training, execute competency assessments, retain records | Review training records |
| V-23 | Establish periodic user access review schedule | §64g-2 (06-administrative-controls.md) | Schedule at least annual access review for all active subjects | Review schedule document |

### Phase 6: Pre-Deployment Diagnostics

| # | Requirement | Spec Section | Consumer Action | Verification Method |
|---|-------------|-------------|-----------------|---------------------|
| V-24 | Run `checkGxPReadiness()` with 0 FAIL results | §07 (07-guard-adapter.md) | Execute readiness check against production configuration | All 15 items pass |
| V-25 | Run `checkPreDeploymentCompliance()` with all artifacts satisfied | §66 (08-compliance-verification.md) | Execute pre-deployment compliance check | All 8 artifact references satisfied |
| V-26 | Execute IQ, OQ, PQ and retain reports | §67 (09-validation-plan.md) | Run `runIQ()`, `runOQ()`, `runPQ()` | All qualification protocols pass |
| V-27 | Include library in supplier qualification register | §64d (06-administrative-controls.md) | Document supplier assessment outcome in vendor register | Review vendor register |

### Phase 7: Ongoing Operations

| # | Requirement | Spec Section | Consumer Action | Verification Method |
|---|-------------|-------------|-----------------|---------------------|
| V-28 | Schedule annual periodic review (max 12 months between cycles) | §64 (05-audit-trail-review.md) | Schedule 6-item annual review | Periodic Review Report |
| V-29 | Review FMEA each periodic review cycle | §68 (10-risk-assessment.md) | Re-assess failure modes for changed risk profiles | Updated FMEA document |
| V-30 | Monitor regulatory updates | §64f (06-administrative-controls.md) | Establish annual regulatory review process | Regulatory monitoring log |
| V-31 | Re-validate on significant changes (per decision tree §64a) | §64a (06-administrative-controls.md) | Follow change classification decision tree for every change | Change control records |
| V-32 | Verify data migration integrity when changing storage backends | §63 (04-data-retention.md) | Execute 6-step migration verification procedure | Migration documentation |

```
REQUIREMENT: Organizations deploying @hex-di/guard in GxP-regulated environments MUST
             complete all items in Phase 1 through Phase 6 of the Consumer Integration
             Validation Checklist (this appendix) before first GxP deployment. Phase 7
             items define ongoing operational obligations. Each checklist item MUST be
             verified and the verification evidence retained in the validation file.
             Reference: GAMP 5 §4.4, EU GMP Annex 11 §2, 21 CFR 11.10(a).
```

---

_Previous: [Appendix U: Cross-Enhancement Composition Examples](./composition-examples.md) | Next: [Appendices Index](./README.md)_
