# Appendix N: STRIDE Threat Model

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-15-N                               |
> | Revision         | 1.0                                      |
> | Effective Date   | 2026-02-15                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Appendix                             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-15): Split from consolidated 15-appendices.md (CCR-GUARD-017) |

_Previous: [Appendix M: Operational Risk Guidance](./operational-risk-guidance.md) | Next: [Appendix O: Condensed Clock Specification Summary](./clock-spec-summary.md)_

---

This appendix provides a formal STRIDE threat model for `@hex-di/guard`, identifying threat actors, attack surfaces, trust boundaries, and mapping each threat to existing FMEA mitigations and spec controls.

### Trust Boundaries

| Boundary | Description               | Components Inside                                            | Components Outside                                        |
| -------- | ------------------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| TB-1     | Guard evaluation pipeline | Policy evaluator, audit trail writer, WAL, hash chain engine | Subject provider, external IdP, audit trail backing store |
| TB-2     | DI container scope        | Scoped subject, guarded adapters, scope-local audit chain    | Parent scope, sibling scopes, external systems            |
| TB-3     | Signature service         | Key management, re-authentication, capture/validate          | HSM/keystore, external credential store                   |
| TB-4     | Audit trail persistence   | In-memory buffer, WAL intent log                             | Durable backing store (PostgreSQL, SQLite, EventStoreDB)  |
| TB-5     | Administrative operations | AdminGuardConfig, policy change control                      | External change management system, operator workstation   |

### Threat Actors

| Actor | Description                   | Capability Level                                         | Motivation                                    |
| ----- | ----------------------------- | -------------------------------------------------------- | --------------------------------------------- |
| TA-1  | Malicious insider (developer) | High: source code access, DI container manipulation      | Privilege escalation, audit trail tampering   |
| TA-2  | Compromised service account   | Medium: runtime access to container scope                | Unauthorized data access, silent audit bypass |
| TA-3  | External attacker (network)   | Low-Medium: no direct code access, network-level attacks | Data exfiltration, denial of service          |
| TA-4  | Malicious administrator       | High: admin role access, policy change authority         | Policy manipulation, evidence destruction     |
| TA-5  | Compromised dependency        | High: transitive code execution within process           | Supply chain attack, cryptographic key theft  |

### STRIDE Analysis

| ID   | Category                   | Threat Description                                                        | Attack Surface | Threat Actor(s) | FMEA Mapping | Spec Controls                                                                                                                                                                               | Residual Risk | GxP Residual |
| ---- | -------------------------- | ------------------------------------------------------------------------- | -------------- | --------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------ |
| S-01 | **S**poofing               | Forge AuthSubject identity by registering a rogue SubjectProvider adapter | TB-1, TB-2     | TA-1, TA-2      | FM-08        | [ADR #9](../decisions/009-immutable-subject-within-scope.md) (immutable subject per scope); audit trail records subject attributes (ALCOA+ Attributable); security test §56.3 scenario 7                                                          | Low           | Low          |
| S-02 | **S**poofing               | Replay a valid ReauthenticationToken to forge electronic signatures       | TB-3           | TA-2, TA-3      | FM-06        | Token expiration (§65b, 15-min max lifetime [ADR #39](../decisions/039-max-reauth-token-lifetime.md)); one-time-use tokens; security test §56.2 scenario 4                                                                                   | Low           | Low          |
| T-01 | **T**ampering              | Modify audit trail entries after persistence                              | TB-4           | TA-1, TA-4      | FM-05        | SHA-256 hash chain (§61.4); append-only storage (§61.1); `verifyAuditChain()` detects modification                                                                                          | Low           | Low          |
| T-02 | **T**ampering              | Alter policy definition at runtime without audit record                   | TB-1, TB-5     | TA-4            | FM-23        | PolicyChangeAuditEntry REQUIRED (§64a); separation of duties; hash chain participation; `createPolicyDiffReport()` (§54)                                                                    | Low           | Low          |
| T-03 | **T**ampering              | Splice entries from different chains to fabricate audit history           | TB-4           | TA-1, TA-4      | FM-04        | Per-scope chains with scopeId ([ADR #30](../decisions/030-per-scope-chains-sequence-numbers.md)); sequenceNumber monotonicity; previousHash linkage; cross-scope splicing detectable                                                                 | Low           | Low          |
| R-01 | **R**epudiation            | Signer denies having approved a record (no non-repudiation)               | TB-3           | TA-2            | FM-07        | Asymmetric algorithms REQUIRED for GxP compliance evidence ([ADR #38](../decisions/038-asymmetric-algorithms-gxp.md)); HSM REQUIRED when gxp:true ([ADR #43](../decisions/043-hsm-required-gxp-key-storage.md)); re-authentication before signing (§65b)                                         | Low           | Low          |
| R-02 | **R**epudiation            | Administrator denies policy change responsibility                         | TB-5           | TA-4            | FM-25        | AdminGuardConfig with deny-by-default (§64g); all admin ops logged (§64b); separation of duties (§64a); ACL017 for unauthorized attempts                                                    | Low           | Low          |
| I-01 | **I**nformation Disclosure | Timing side-channel reveals permission set membership                     | TB-1           | TA-3            | --            | Constant-time evaluation REQUIRED when gxp:true (§DoD security, §65b-1); constant-time padding normalizes evaluation duration; constant-time signature comparison REQUIRED in GxP (§65b-1)  | Low           | Low          |
| I-02 | **I**nformation Disclosure | Signing key exposure via source code or environment variables             | TB-3           | TA-1, TA-5      | FM-07        | HSM/keystore REQUIRED when gxp:true ([ADR #43](../decisions/043-hsm-required-gxp-key-storage.md)); IQ-10 key material scan; NIST SP 800-57 compliance                                                                                           | Low           | Low          |
| I-03 | **I**nformation Disclosure | Audit trail data leaked via unsecured export                              | TB-4           | TA-3, TA-4      | --            | Export manifest with SHA-256 checksum (§64e); digital signatures for open systems (§59); encrypted transport REQUIRED for open systems (§63)                                                | Low           | Low          |
| D-01 | **D**enial of Service      | Evaluation flooding exhausts resources                                    | TB-1           | TA-3            | FM-20        | `maxEvaluationsPerSecond` rate limiting (optional in non-GxP; REQUIRED when gxp:true); `RateLimitSummaryAuditEntry` for audit visibility; WARNING log on activation; operational monitoring | Medium        | **Low**      |
| D-02 | **D**enial of Service      | Audit trail backend unavailability blocks all operations                  | TB-4           | TA-3            | FM-03, FM-17 | `failOnAuditError: true` (fail-closed); WAL crash recovery; business continuity plan (§61 BCP); completeness monitoring                                                                     | Low           | Low          |
| E-01 | **E**levation of Privilege | Bypass guard() via direct port resolution                                 | TB-1, TB-2     | TA-1            | FM-12        | Guard wraps at adapter level ([ADR #8](../decisions/008-guard-wraps-at-adapter-level.md)); port gate hook intercepts resolution; security test §56.3 scenario 9                                                                                 | Low           | Low          |
| E-02 | **E**levation of Privilege | Escalate to admin operations without admin role                           | TB-5           | TA-2, TA-3      | FM-25        | AdminGuardConfig deny-by-default (§64g); ACL017 error code; admin operation audit (§64b)                                                                                                    | Low           | Low          |
| E-03 | **E**levation of Privilege | Exploit stale scope permissions after access revocation                   | TB-2           | TA-2            | FM-19        | `maxScopeLifetimeMs` REQUIRED when gxp:true ([ADR #45](../decisions/045-max-scope-lifetime-gxp.md)); `ScopeExpiredError` (ACL013); periodic scope refresh                                                                                 | Low           | Low          |

### Threat Summary

The "Residual Risk" column reflects the general (non-GxP) deployment posture. The "GxP Residual" column reflects the residual risk when `gxp: true`, where additional REQUIRED controls are active.

| Category               | Threat Count | High Residual | Medium Residual | Low Residual | GxP: Medium | GxP: Low |
| ---------------------- | ------------ | ------------- | --------------- | ------------ | ----------- | -------- |
| Spoofing               | 2            | 0             | 0               | 2            | 0           | 2        |
| Tampering              | 3            | 0             | 0               | 3            | 0           | 3        |
| Repudiation            | 2            | 0             | 0               | 2            | 0           | 2        |
| Information Disclosure | 3            | 0             | 0               | 3            | 0           | 3        |
| Denial of Service      | 2            | 0             | 1 (D-01)        | 1            | 0           | **2**    |
| Elevation of Privilege | 3            | 0             | 0               | 3            | 0           | 3        |
| **Total**              | **15**       | **0**         | **1**           | **14**       | **0**       | **15**   |

> **GxP Residual Risk Note:** When `gxp: true`, all 15 threats have Low residual risk. D-01 (evaluation flooding) drops from Medium to Low because `maxEvaluationsPerSecond` is REQUIRED when `gxp: true`, making rate limiting mandatory with `RateLimitSummaryAuditEntry` for audit trail visibility (mitigated RPN = 3 per FM-20 note). I-01 (timing side-channel) is Low in both columns because constant-time evaluation padding is REQUIRED when `gxp: true` (GCR-2026-001). For non-GxP deployments, D-01 remains Medium because rate limiting is optional; organizations SHOULD implement rate limiting and document the decision in their risk assessment per ICH Q9.

---

_Previous: [Appendix M: Operational Risk Guidance](./operational-risk-guidance.md) | Next: [Appendix O: Condensed Clock Specification Summary](./clock-spec-summary.md)_
