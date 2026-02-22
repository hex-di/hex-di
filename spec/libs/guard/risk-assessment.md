> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-68-FMEA                            |
> | Revision         | 5.0                                      |
> | Effective Date   | 2026-02-20                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Risk Assessment                      |
> | Change History   | 5.0 (2026-02-20): Added Invariant-to-FMEA Cross-Reference table mapping all 37 invariants (INV-GD-001..037) to primary failure modes with risk level and scope classification (CCR-GUARD-038) |
> |                  | 4.0 (2026-02-20): Added System Context and Risk Acceptance Criteria sections per canonical spec-authoring conventions (CCR-GUARD-033) |
> |                  | 3.0 (2026-02-20): Added Low-risk Justifications, Residual Risk Summary, Assessment Provenance, and Review Schedule sections per canonical spec-authoring conventions (CCR-GUARD-028) |
> |                  | 2.0 (2026-02-20): Normalized RPN scale to S×O×D (1–10, max 1000) per canonical spec-authoring conventions; all factor scores ×2, all RPNs ×8; thresholds updated to 1–60/61–99/100+ (CCR-GUARD-026) |
> |                  | 1.1 (2026-02-17): Extracted from compliance/gxp.md into standalone document (CCR-GUARD-018) |
> |                  | 1.0 (2026-02-13): Initial controlled release |

# @hex-di/guard — Risk Assessment (FMEA)

This document provides a Failure Mode and Effects Analysis (FMEA) for `@hex-di/guard` per ICH Q9 and GAMP 5 risk management guidance.

---

### System Context

**GAMP 5 Software Classification**: `@hex-di/guard` is classified as **Category 5 — Custom Software**. The library implements custom business logic for authorization control (policy evaluation, electronic signatures, and audit trail) assembled by the consumer through a declarative port/adapter pattern. No Category 3 (infrastructure) or Category 4 (configurable product) classification applies — the authorization logic is not delivered as a pre-configured product but is composed into a bespoke configuration by the consuming engineering team.

**System Characteristics**:

| Characteristic | Value |
|---|---|
| System Type | In-process authorization control library (Hexagonal Port-Adapter architecture) |
| Runtime Environment | Node.js ≥ 18 server-side; optional React client-side (UI gates only — not a security boundary) |
| Deployment Model | npm package assembled into consumer applications via DI graph |
| User Population | Software developers, GxP system integrators, compliance officers, regulatory reviewers |
| Criticality | Safety-critical when `gxp: true` — gates access to regulated data entry, audit functions, and electronic signature operations |
| Data Handled | Authorization decisions, subject identity tokens, electronic signatures, audit trail entries, policy configurations |
| External Interfaces | TypeScript/JavaScript programmatic API; optional MCP/A2A diagnostic endpoints (§48d, §64g) |
| GxP Applicability | Subject to 21 CFR Part 11, EU GMP Annex 11, GAMP 5 Category 5 when deployed with `gxp: true` |

**Scope of This FMEA**: This analysis covers the `@hex-di/guard` library specification v0.1.0 and all 23 packages defined in the guard specification suite (§1–§83). It is a **library-level** analysis. Site-specific failure modes (infrastructure outages, network partitions, physical security breaches, staffing failures) are the responsibility of the deploying organization's site validation plan. The deploying organization MUST extend this FMEA with site-specific failure modes before first GxP deployment. The site-level FMEA copy — incorporating site-specific modes and updated with empirical production data — is the controlled document of record for regulatory purposes.

**Regulatory Context**: See [GxP Compliance](compliance/gxp.md) for the full applicable regulatory framework. The primary regulations governing this analysis are:

- **21 CFR Part 11** — electronic signatures (§65), audit trail (§60–64), access controls (§10–12)
- **EU GMP Annex 11** — validation (§67), data integrity, backup and recovery (§61)
- **ICH Q9** — risk methodology (this document)
- **GAMP 5** — software classification (Category 5), validation lifecycle

---

### Data Flow Context

The following data flow summary provides context for the failure mode analysis. Each flow represents a trust boundary crossing or data transformation where failures can occur:

| Flow ID | Source | Destination | Data | Trust Boundary |
|---------|--------|-------------|------|----------------|
| DF-1 | Consumer Application | `evaluate()` | Subject, Policy, Resource attributes | Application → Guard core |
| DF-2 | `evaluate()` | `AuditTrailPort.record()` | AuditEntry (decision, subject, timestamp, hash) | Guard core → Persistence adapter |
| DF-3 | `SubjectProviderPort` | Guard wrapper | AuthSubject (identity, roles, permissions) | External IdP → Guard scope |
| DF-4 | `SignatureServicePort` | Audit entry | ElectronicSignature (signer, algorithm, value) | HSM/Keystore → Guard core |
| DF-5 | `ClockSource` | Audit entry timestamp | ISO 8601 UTC timestamp | Platform/NTP → Guard core |
| DF-6 | WAL Store | `AuditTrailPort` | Pending intents (crash recovery replay) | Local WAL → Persistence adapter |
| DF-7 | `AuditTrailPort` | Review Interface | Filtered audit entries (query results) | Persistence → Compliance reviewer |
| DF-8 | Admin operations | Administrative event log | Policy changes, role changes, config changes | Admin → Guard administrative layer |

> **Note:** A full visual data flow diagram (DFD) using the standard Yourdon-DeMarco notation is RECOMMENDED as part of the site's validation documentation. The table above provides the logical data flows; organizations SHOULD produce a visual DFD as part of their Design Specification (DS) for the guard deployment. Reference: GAMP 5 §D.4 (design specification).

### Scoring Methodology

| Factor                | Scale | Description                                                                                                          |
| --------------------- | ----- | -------------------------------------------------------------------------------------------------------------------- |
| **Severity (S)**      | 1–10  | 1–2 = Negligible, 3–4 = Minor, 5–6 = Moderate, 7–8 = Major, 9–10 = Critical (patient safety / data integrity)      |
| **Occurrence (O)**    | 1–10  | 1–2 = Remote, 3–4 = Unlikely, 5–6 = Possible, 7–8 = Likely, 9–10 = Frequent                                        |
| **Detectability (D)** | 1–10  | 1–2 = Immediate/automatic, 3–4 = Easy, 5–6 = Moderate, 7–8 = Difficult, 9–10 = Undetectable                        |

**Risk Priority Number (RPN)** = S × O × D. Maximum = 1000.

| RPN Range | Classification              | Required Action                                          |
|-----------|-----------------------------|----------------------------------------------------------|
| 1–60      | Acceptable                  | Routine monitoring                                       |
| 61–99     | Conditionally acceptable    | Documented risk acceptance signed by QA Reviewer         |
| 100+      | Unacceptable                | Mandatory corrective action before deployment            |

```
REQUIREMENT: All failure modes with pre-mitigation RPN >= 100 (Unacceptable) MUST have
             documented mitigations. All failure modes with post-mitigation RPN in the
             61–99 range (Conditionally acceptable) MUST have documented risk acceptance
             signed by the QA Reviewer before GxP deployment. Failure modes with Critical
             severity (S=10) MUST additionally demonstrate that no single control failure
             can restore the pre-mitigation RPN.
```

### Failure Mode Table

| ID    | Component                  | Failure Mode                                                                                                                                                                                                                                         | S   | O   | D   | RPN | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Residual S | Residual O | Residual D | Mitigated RPN | Non-GxP Residual RPN |
| ----- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --- | --- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------- | ---------- | ------------- | -------------------- |
| FM-01 | Policy Evaluator           | Incorrect allow: subject granted access without required permission                                                                                                                                                                                  | 10  | 4   | 2   | 80  | 100% mutation kill rate on evaluation logic (DoD 5); exhaustive unit tests for all 10 policy kinds; `evaluate()` is deterministic with respect to policy logic, with full trace tree                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 10         | 2          | 2          | 40            | 40                   |
| FM-02 | Policy Evaluator           | Incorrect deny: subject denied access despite having required permission                                                                                                                                                                             | 6   | 4   | 2   | 48  | Same mutation testing and trace visibility as FM-01; deny decisions include reason string for diagnosis                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | 6          | 2          | 2          | 24            | 24                   |
| FM-03 | Audit Trail                | Silent entry drop: audit entry not persisted without error                                                                                                                                                                                           | 10  | 4   | 4   | 160 | `failOnAuditError: true` in GxP environments ([ADR #27](decisions/027-fail-on-audit-error-default.md)); `record()` returns `Result<void, AuditTrailWriteError>`; ACL008 triggers operational alerts; completeness requirement (section 61.3)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 10         | 2          | 2          | 40            | 40                   |
| FM-04 | Audit Trail                | Out-of-order writes break hash chain under concurrency                                                                                                                                                                                               | 8   | 6   | 4   | 192 | Per-scope chains with monotonic `sequenceNumber` (section 61.4a, [ADR #30](decisions/030-per-scope-chains-sequence-numbers.md)); serialized writes per scope; gap detection via sequence number                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 8          | 2          | 4          | 64            | 64                   |
| FM-05 | Audit Trail                | Tampered entry: audit record modified after persistence                                                                                                                                                                                              | 10  | 2   | 2   | 40  | SHA-256 hash chain (section 61.4); append-only storage (section 61.1); `verifyAuditChain()` detects any modification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 10         | 2          | 2          | 40            | 40                   |
| FM-06 | E-Signatures               | Expired re-authentication token accepted                                                                                                                                                                                                             | 10  | 4   | 2   | 80  | `capture()` MUST reject expired tokens (section 65b); `ReauthenticationToken.expiresAt` checked before capture; recommended 5-minute window                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 10         | 2          | 2          | 40            | 40                   |
| FM-07 | E-Signatures               | Signing key exposed in source code or environment variables                                                                                                                                                                                          | 10  | 4   | 6   | 240 | Key storage behavioral contract (section 65c): keys MUST NOT be in source or env vars in production; REQUIRED (when gxp: true): HSM/keystore/secrets manager ([ADR #43](decisions/043-hsm-required-gxp-key-storage.md)); IQ-10 checks for key material in source                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 10         | 2          | 2          | 40            | 80                   |
| FM-08 | Subject Provider           | Wrong-scope subject: subject from scope A used in scope B                                                                                                                                                                                            | 10  | 4   | 4   | 160 | Subject resolved once per scope and cached ([ADR #9](decisions/009-immutable-subject-within-scope.md)); scoped lifetime on SubjectProviderPort; DI container enforces scope isolation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 10         | 2          | 2          | 40            | 40                   |
| FM-09 | Clock Source               | NTP drift exceeds 1 second                                                                                                                                                                                                                           | 8   | 4   | 6   | 192 | Clock synchronization requirement (section 62); `ClockSource` interface with NTP guidance; REQUIRED monitoring when gxp: true (section 62); recommended monitoring in non-GxP deployments; cross-referenced by FM-HT-13 (http-client spec 20-http-transport-validation.md section 98)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 8          | 2          | 4          | 64            | 96                   |
| FM-10 | Clock Source               | Backward clock jump produces non-monotonic timestamps                                                                                                                                                                                                | 6   | 4   | 4   | 96  | `sequenceNumber` is the authoritative ordering mechanism (section 62, "Authoritative Ordering: sequenceNumber"); `performance.now()` used for duration (monotonic); dual-timing strategy (section 62)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 6          | 2          | 4          | 48            | 48                   |
| FM-11 | Serialization              | Malformed policy accepted by deserializer                                                                                                                                                                                                            | 10  | 4   | 2   | 80  | `deserializePolicy()` validates kind discriminant, required fields, and schema version; returns `Err(PolicyParseError)` on any mismatch (section 32)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 10         | 2          | 2          | 40            | 40                   |
| FM-12 | Guard Adapter              | Bypass via direct `resolve()` without guard wrapper                                                                                                                                                                                                  | 10  | 2   | 4   | 80  | Guard wraps at adapter level — guarded adapters replace originals in the graph; port gate hook intercepts resolution; no unguarded path exists when properly configured                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | 10         | 2          | 2          | 40            | 40                   |
| FM-13 | NoopAuditTrail             | NoopAuditTrail used in GxP production environment                                                                                                                                                                                                    | 10  | 2   | 6   | 120 | JSDoc GxP warnings on NoopAuditTrail (section 61.5); `createGuardGraph()` requires explicit adapter — no default; IQ checklist verifies adapter choice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 10         | 2          | 2          | 40            | 40                   |
| FM-14 | Hash Chain                 | Concurrent async interleave produces invalid chain                                                                                                                                                                                                   | 8   | 6   | 2   | 96  | Per-scope serialization (section 61.4a); `sequenceNumber` gap detection; `verifyAuditChain()` catches any interleave; concurrent scope tests in DoD 13                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 8          | 2          | 2          | 32            | 32                   |
| FM-15 | Audit Trail                | Crash between evaluation and audit write: decision enforced but no audit record persisted                                                                                                                                                            | 10  | 2   | 8   | 160 | `failOnAuditError: true` (default) ensures resolution fails if audit write fails; audit write happens BEFORE allow/deny action (step 5 before step 6 in execution flow); built-in WAL via `createWalAuditTrail()` when `gxp: true` (section 61, "Crash Recovery: Write-Ahead Log") using `evaluationId` as deduplication key; WAL intent is written before evaluation and marked completed after successful audit write; startup and periodic recovery scans for orphaned intents; real-time WAL orphan alerting: when `gxp: true`, WAL recovery scan MUST emit a structured health check alert immediately upon detecting an orphaned intent (not only log); completeness cross-check: the existing completeness monitor (per-port resolution vs audit write counters) provides an independent detection path | 10         | 2          | 2          | 40            | 40                   |
| FM-16 | Schema Migration           | AuditEntry schema change during framework upgrade breaks hash chain verification for pre-upgrade entries                                                                                                                                             | 8   | 4   | 6   | 192 | Version-tagged hash computation with algorithm identifier per entry; epoch boundaries at schema changes (section 61.4, "Hash Algorithm Migration"); OQ re-validation on framework version upgrade (section 64a re-validation trigger #1); hash field list is documented and stable ([ADR #29](decisions/029-hash-chain-all-fields.md), #30)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 8          | 2          | 4          | 64            | 64                   |
| FM-17 | Audit Trail (Network)      | Buffer-flush window for network audit adapters: entries in the in-memory buffer are lost on process crash before flush to remote backing store                                                                                                       | 10  | 4   | 4   | 160 | WAL crash recovery (`createWalAuditTrail()` when `gxp: true`) captures intent before evaluation; buffer size limits with backpressure (`record()` returns Err when buffer full); flush interval configuration with recommended maximum of 5 seconds; flush-on-shutdown hook; completeness monitoring (section 61.3) detects gaps                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | 10         | 2          | 2          | 40            | 40                   |
| FM-18 | Subject Provider           | External IdP unavailability causes SubjectProvider failure, blocking all guarded operations                                                                                                                                                          | 8   | 4   | 4   | 128 | Business continuity plan (section 61 BCP); IdP health monitoring; cached subject fallback for read-only operations (consumer responsibility); OQ-14 verifies failure handling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 8          | 2          | 4          | 64            | 64                   |
| FM-19 | Guard Adapter              | Stale scope permissions: subject's access revoked after scope creation, but existing scope continues to allow access with old permissions                                                                                                            | 8   | 6   | 4   | 192 | `maxScopeLifetimeMs` REQUIRED when `gxp: true` ([ADR #45](decisions/045-max-scope-lifetime-gxp.md)); forces periodic scope refresh and re-authentication; `ScopeExpiredError` (ACL013) blocks evaluation in expired scopes; `checkGxPReadiness()` item 12 verifies configuration                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 8          | 2          | 4          | 64            | 128                  |
| FM-20 | Guard Adapter              | Denial-of-service via evaluation flooding: attacker submits excessive guard evaluations to exhaust resources or fill audit trail storage                                                                                                             | 6   | 6   | 6   | 216 | `maxEvaluationsPerSecond` rate limiting REQUIRED when `gxp: true`; `RateLimitSummaryAuditEntry` records rejected evaluation counts per window for audit trail visibility; WARNING log on rate limit activation; operational monitoring of evaluation throughput                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 6          | 2          | 2          | 24            | 144                  |
| FM-21 | Guard Adapter              | evaluationId collision: two evaluations assigned the same UUID, corrupting audit trail correlation and hash chain                                                                                                                                    | 10  | 2   | 6   | 120 | CSPRNG-backed UUID v4 via `crypto.randomUUID()` (collision probability < 2^-122 per pair); evaluationId uniqueness verified per scope during chain verification; duplicate detection in audit trail adapter                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 10         | 2          | 2          | 40            | 40                   |
| FM-22 | Audit Trail (Multi-Region) | Cross-region consolidation error: deduplication failure or ordering ambiguity causes duplicate or misordered entries in global audit view                                                                                                            | 6   | 4   | 6   | 144 | evaluationId-based deduplication (section 61.4a, multi-region guidance); timestamp secondary sort with documented cross-region ordering limitation; region identifier metadata in audit entries (RECOMMENDED); PQ cross-region clock verification (section 67c)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 6          | 2          | 4          | 48            | 48                   |
| FM-23 | Policy Change Control      | Runtime policy change without audit trail record: policy modified via `deserializePolicy()`, configuration reload, or hot-reload without recording a `PolicyChangeAuditEntry`, leaving policy mutations untracked                                    | 8   | 4   | 4   | 128 | `PolicyChangeAuditEntry` REQUIRED before policy activation when `gxp: true` (section 64a-1); `createPolicyChangeAuditEntry()` helper enforces separation of duties and `changeRequestId` validation; hash chain participation ensures tamper-evident sequencing; `createPolicyDiffReport()` provides pre-deployment impact analysis (section 54); OQ-23 verifies recording                                                                                                                                                                                                                                                                                                                                                                                                                                     | 8          | 2          | 2          | 32            | 32                   |
| FM-24 | Subject Provider           | Unsanitized attribute values in audit entries: control characters or oversized values in AuthSubject attributes propagate into audit trail entries, causing storage errors, display corruption, or injection vulnerabilities in audit review tools   | 6   | 4   | 6   | 144 | Attribute sanitization (06-subject.md RECOMMENDED): max 1024 chars with truncation + WARNING log; control character replacement with U+FFFD + WARNING log; sanitization applied before policy evaluation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 6          | 2          | 4          | 48            | 48                   |
| FM-25 | Administrative Operations  | Unauthorized administrative access: unauthorized personnel modify guard configuration, export audit trail data, rotate signing keys, or approve policy changes without authority checks, compromising system compliance posture                      | 10  | 4   | 6   | 240 | AdminGuardConfig with deny-by-default (section 64g); `checkGxPReadiness()` verifies admin authority configuration; separation of duties enforcement (section 64g); all admin operations logged in administrative event log (section 64b); admin operation evaluation produces allow/deny record with subject identity; ACL017 error code for unauthorized admin operations                                                                                                                                                                                                                                                                                                                                                                                                                                     | 10         | 2          | 2          | 40            | 40                   |
| FM-26 | Completeness Monitoring    | Completeness discrepancy unescalated: a discrepancy between guard evaluations and audit entries is detected by completeness monitoring but not escalated to QA/compliance within the required SLA, allowing the gap to persist without investigation | 10  | 4   | 4   | 160 | Automated escalation procedure (section 61.3 in 02-audit-trail-contract.md): 1-minute automated alert, dual routing to ops + QA, 1-hour ack SLA, 4-hour investigation SLA, 24-hour incident report; FM-26 pre-mitigation detection score (D=2) reflects that completeness monitoring detects the discrepancy but escalation is the failure point                                                                                                                                                                                                                                                                                                                                                                                                                                                               | 10         | 2          | 2          | 40            | 40                   |
| FM-27 | Policy Input Validation    | Invalid attribute type in policy evaluation: a `hasAttribute` policy references an attribute with an incompatible matcher operand type, causing incorrect or undefined evaluation behavior                                                           | 8   | 4   | 4   | 128 | Policy input schema validation when `gxp: true` (§59, Annex 11 Section 5, REQ-GUARD-070): attribute types checked against declared schema at graph construction time; matcher operand type compatibility enforced at build time; runtime type mismatch produces PolicyEvaluationError                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 8          | 2          | 2          | 32            | 64                   |
| FM-28 | Resource Attributes        | Stale resource attribute used in authorization decision: a resource attribute has changed since it was cached, causing the guard to make a decision based on outdated data                                                                           | 8   | 6   | 6   | 288 | Resource attribute freshness thresholds when `gxp: true` (§59, Annex 11 Section 6, REQ-GUARD-071): configurable `maxAgeMs` per attribute; stale attribute produces deny with "attribute_stale" reason; WARNING log for attributes without provenance timestamps                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 8          | 2          | 4          | 64            | 64                   |
| FM-29 | Certificate Management     | Expired signing certificate used for electronic signatures: a signing certificate expires without renewal, causing signature capture failures or acceptance of signatures from expired certificates                                                  | 10  | 4   | 6   | 240 | Certificate lifecycle management (§65c-3, REQ-GUARD-068): automated monitoring at 90/30/7 day thresholds; checkGxPReadiness WARNING for certificates expiring within 30 days; CRL/OCSP revocation checking in validate(); certificate chain archival for historical verification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | 10         | 2          | 2          | 40            | 40                   |
| FM-30 | Algorithm Migration        | Signature algorithm transition breaks historical chain verification: transitioning from one signature algorithm to another causes verifyAuditChain() to fail on entries signed with the deprecated algorithm                                         | 8   | 4   | 6   | 192 | Epoch-based algorithm migration (§65c-4, REQ-GUARD-069): three-phase migration sequence (verify-only → dual → primary); multi-algorithm verification in verifyAuditChain(); deprecated algorithms retained in verification set indefinitely; 24-month deprecation timeline with graduated warnings                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 8          | 2          | 2          | 32            | 32                   |
| FM-31 | Predicate Rule Mapping     | Missing predicate rule mapping in GxP deployment: guard deployed without documenting which predicate rules apply, leaving regulatory applicability undetermined and potentially non-compliant                                                        | 8   | 4   | 4   | 128 | predicateRuleMapping enforcement when `gxp: true` (§59, REQ-GUARD-067): configuration property MUST be non-empty; checkGxPReadiness item 15 validates presence; ConfigurationError at graph construction time if missing                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 8          | 2          | 2          | 32            | 32                   |
| FM-32 | Persistence Adapter (§76)  | DBA-level audit record tampering: database administrator with superuser access bypasses REVOKE constraints on the Postgres/SQLite audit trail adapter to UPDATE or DELETE audit entries, compromising audit trail integrity                            | 10  | 2   | 2   | 40  | SHA-256 hash chain integrity verification (`verifyAuditChain()`) detects any modification regardless of database-level access (section 61.4); REVOKE DELETE, UPDATE on audit tables from application role (§76); append-only storage contract verified by OQ; row-level security policies (RECOMMENDED); scheduled chain verification (§61.4c) provides periodic automated detection                                                                                                                                                                                                                                                                                                                                                                                                                                | 10         | 2          | 2          | 40            | 40                   |
| FM-33 | PolicySyncPort (§74)       | Policy version inconsistency across distributed nodes: after a policy change, one or more replica nodes continue evaluating the previous policy version, causing inconsistent authorization decisions across the deployment                            | 8   | 4   | 6   | 192 | PolicyBundle includes contentHash for verification (§74); health check reports active policy version per node; change control verification requirement (§64a-0) mandates propagation evidence before change closure; policy version drift monitoring via createGuardHealthCheck() integration (RECOMMENDED); maximum propagation window with deviation escalation                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 8          | 2          | 2          | 32            | 64                   |
| FM-34 | Framework Middleware (§75) | Authorization bypass via middleware misconfiguration: a framework middleware (Express, Fastify, tRPC, GraphQL, NestJS) is misconfigured such that certain routes bypass guard evaluation, allowing unauthenticated or unauthorized access             | 10  | 4   | 4   | 160 | Middleware wraps the guard() adapter — core evaluation path is unchanged; OQ testing with route enumeration verifies all protected routes are guarded; middleware configuration test utility validates that all registered routes have guard coverage; guard adapter port gate hook provides defense-in-depth at DI container level (§29-30); route coverage report as part of deployment checklist (RECOMMENDED)                                                                                                                                                                                                                                                                                                                                                                                                    | 10         | 2          | 2          | 40            | 40                   |
| FM-35 | Query Conversion (§77)     | Overly permissive database filter: `policyToFilter()` generates a database filter that grants access to records that `evaluate()` would deny, causing data leakage                                                                                  | 10  | 4   | 4   | 160 | `policyToFilter()` is a pure deterministic function with no side effects (§77); OQ cross-validation: filter output compared against `evaluate()` for representative test cases (minimum 100 subject/resource combinations); round-trip property test: for each generated filter, verify that every record matching the filter would also be allowed by `evaluate()`; unsupported policy kinds (hasSignature, hasRelationship) produce `PolicyFilter { kind: "false" }` (deny-all) as safe default                                                                                                                                                                                                                                                                                                                    | 10         | 2          | 2          | 40            | 40                   |
| FM-36 | WASM Compilation (§78)     | WASM evaluation divergence: compiled WASM policy produces a different allow/deny decision than the TypeScript `evaluate()` function for the same input, causing inconsistent authorization                                                            | 10  | 4   | 2   | 80  | OQ cross-validation: TypeScript `evaluate()` and WASM `evaluate()` compared for 1000+ test cases per policy; WASM compilation limited to pure policy evaluation (no audit trail, no signature, no relationship) — GxP-critical operations remain TypeScript-only (§78 scope limitations); WASM modules carry source policy hash for traceability; divergence in any test case blocks WASM module publication                                                                                                                                                                                                                                                                                                                                                                                                      | 10         | 2          | 2          | 40            | 40                   |

> **FM-20 rate limiting note:** When `gxp: true`, `maxEvaluationsPerSecond` is REQUIRED on `createGuardGraph()`, so rate limiting is always active in GxP environments. The `RateLimitSummaryAuditEntry` ensures rate-limited evaluations are visible in the audit trail (ALCOA+ Complete). In non-GxP environments, rate limiting remains optional; organizations that do not implement rate limiting SHOULD document this in their risk assessment. The mitigated RPN for GxP mode is 6 × 2 × 2 = 24 (Occurrence = 2 and Detectability = 2 due to mandatory audit trail summary entries, automated alerting, and operational monitoring).

> **Non-GxP Residual RPN column:** The "Non-GxP Residual RPN" column reflects the residual risk when GxP-specific controls (those gated behind `gxp: true`) are not active. For most failure modes, the non-GxP residual matches the GxP mitigated RPN because the primary mitigations are not GxP-gated. Key differences: FM-07 (80 vs 40) — HSM is REQUIRED only when gxp:true, so non-GxP deployments rely on behavioral contract + IQ-10 only (D=4 instead of D=2); FM-09 (96 vs 64) — NTP monitoring is REQUIRED only when gxp:true, so non-GxP retains D=6 (RECOMMENDED monitoring); FM-19 (128 vs 64, **Unacceptable**) — maxScopeLifetimeMs is REQUIRED only when gxp:true, so non-GxP retains O=4 (no forced scope refresh); FM-20 (144 vs 24, **Unacceptable**) — rate limiting is REQUIRED only when gxp:true, so non-GxP retains O=6 D=6 (optional rate limiting and monitoring); FM-27 (64 vs 32) — policy input schema validation is enforced only when gxp:true; FM-33 (64 vs 32) — policy version health check integration is RECOMMENDED only when gxp:true. Organizations deploying without `gxp: true` MUST document acceptance of non-GxP Unacceptable RPNs (FM-19, FM-20) in their site risk assessment.

### Occurrence Score Basis

The following table documents the rationale for each failure mode's pre-mitigation Occurrence (O) score. These scores reflect engineering judgment based on the guard library's architecture, the Node.js runtime environment, and industry incident data. Organizations SHOULD update these scores with empirical production data after the first year of deployment.

| FM ID | Pre-Mitigation O | Rationale                                                                                                                       |
| ----- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| FM-01 | 4 (Unlikely)     | Deterministic pure function with full test coverage; logic errors would require simultaneous test and mutation testing failures |
| FM-02 | 4 (Unlikely)     | Same evaluation path as FM-01; false denials are more visible (users report blocked access)                                     |
| FM-03 | 4 (Unlikely)     | Requires adapter implementation error (ignoring Result type) or backing store failure without error propagation                 |
| FM-04 | 6 (Possible)     | Elevated due to async nature of Node.js; concurrent scope writes without serialization are architecturally possible             |
| FM-05 | 2 (Remote)       | Requires direct backing store access bypassing application layer; rare in properly secured environments                         |
| FM-06 | 4 (Unlikely)     | Requires implementation error in expiration check or clock manipulation; standard date comparison logic                         |
| FM-07 | 4 (Unlikely)     | Common anti-pattern in development that sometimes leaks to production; mitigated by IQ scanning                                 |
| FM-08 | 4 (Unlikely)     | DI container scope isolation is well-tested; would require container implementation defect                                      |
| FM-09 | 4 (Unlikely)     | NTP is generally reliable; drift > 1s requires network partition or misconfigured NTP client                                    |
| FM-10 | 4 (Unlikely)     | Backward clock jumps occur during VM migration, NTP step corrections, or DST transitions                                        |
| FM-11 | 4 (Unlikely)     | Requires deserializer bypass or incomplete schema validation; well-tested code path                                             |
| FM-12 | 2 (Remote)       | Requires developer to intentionally circumvent the guard wrapper pattern                                                        |
| FM-13 | 2 (Remote)       | Requires deliberate selection of NoopAuditTrail adapter in production configuration                                             |
| FM-14 | 6 (Possible)     | Elevated due to async interleaving in concurrent scope scenarios; mitigated by per-scope serialization                          |
| FM-15 | 2 (Remote)       | Requires process crash in the narrow window between evaluation start and audit write completion                                 |
| FM-16 | 4 (Unlikely)     | Occurs only during framework major version upgrades; planned and tested events                                                  |
| FM-17 | 4 (Unlikely)     | Process crash during buffer-flush window; window size is configurable (recommended max 5s)                                      |
| FM-18 | 4 (Unlikely)     | IdP unavailability depends on external infrastructure; cloud IdPs have 99.9%+ SLAs                                              |
| FM-19 | 6 (Possible)     | Elevated because scope lifetime depends on configuration; misconfigured long-lived scopes are common                            |
| FM-20 | 6 (Possible)     | Evaluation flooding is a standard attack vector; exposed APIs without rate limiting are targeted                                |
| FM-21 | 2 (Remote)       | UUID v4 collision probability < 2^-122 per pair; effectively impossible at practical volumes                                    |
| FM-22 | 4 (Unlikely)     | Multi-region deployments introduce ordering complexity; deduplication errors require evaluationId collision                     |
| FM-23 | 4 (Unlikely)     | Requires bypassing the PolicyChangeAuditEntry creation path; possible via direct config modification                            |
| FM-24 | 4 (Unlikely)     | Unsanitized attributes depend on IdP data quality; most IdPs provide clean attribute values                                     |
| FM-25 | 4 (Unlikely)     | Requires either IdP compromise or misconfigured admin role mapping; elevated severity justifies inclusion                       |
| FM-26 | 4 (Unlikely)     | Requires simultaneous failure of automated alerting and manual monitoring; dual-path detection                                  |
| FM-27 | 4 (Unlikely)     | Requires policy author to use incompatible matcher types; caught at graph construction time when gxp:true                       |
| FM-28 | 6 (Possible)     | Elevated because resource attribute staleness depends on caching layer behavior, which varies by deployment                     |
| FM-29 | 4 (Unlikely)     | Certificate expiration is predictable and monitored; requires failure of renewal process                                        |
| FM-30 | 4 (Unlikely)     | Algorithm transitions are planned events; requires skipping the verify-only phase                                               |
| FM-31 | 4 (Unlikely)     | Requires deploying without predicate rule mapping; caught by checkGxPReadiness when gxp:true                                    |
| FM-32 | 2 (Remote)       | Requires database superuser access bypassing application-level REVOKE constraints; rare in properly secured environments        |
| FM-33 | 4 (Unlikely)     | Depends on network partition or sync adapter failure; eventual consistency model tolerates transient delays                       |
| FM-34 | 4 (Unlikely)     | Requires middleware misconfiguration (missing guard wrapper on a route); caught by route coverage testing during OQ              |
| FM-35 | 4 (Unlikely)     | Pure deterministic function with comprehensive cross-validation; logic errors would require simultaneous test failures           |
| FM-36 | 4 (Unlikely)     | Compilation from same AST; divergence caught by 1000+ cross-validation test cases                                               |

```
REQUIREMENT: evaluationId MUST be generated using crypto.randomUUID() or an
             equivalent CSPRNG-backed UUID v4 generator. Non-cryptographic random
             sources (e.g., Math.random()) MUST NOT be used for evaluationId
             generation.
             Reference: 21 CFR 11.10(c) (accurate records),
             ALCOA+ Consistent principle.
```

### Invariant-to-FMEA Cross-Reference

The following table maps each invariant (INV-GD-N) to the failure modes (FM-NN) in the Failure Mode Table above that would result from its violation. This cross-reference satisfies the requirement that every invariant appear in the risk assessment. Invariants without a primary failure mode are either enforced at compile time (Negligible) or are low-risk functional guarantees covered by unit testing (Low). Full S, O, D, RPN, and mitigation detail for each FM-NN is in the Failure Mode Table.

**Risk Level derivation**: Based on the highest pre-mitigation Severity (S) across all primary FM(s): S=10 or S=8 → High; S=6 → Medium. Invariants with no FM row are classified Negligible (compile-time type-system enforcement) or Low (functional guarantee covered by unit tests).

**Scope key**: All = applies in every deployment; GxP = enforced or activated only when `gxp: true`.

| Invariant | Description | Risk Level | Primary FM(s) | Scope |
|-----------|-------------|-----------|---------------|-------|
| INV-GD-001 | Policy Immutability | High | FM-01 | All |
| INV-GD-002 | Permission Brand Integrity | High | FM-01 | All |
| INV-GD-003 | Role DAG Acyclicity | Low | — | All |
| INV-GD-004 | Subject Immutability Within Scope | High | FM-08, FM-18 | All |
| INV-GD-005 | Deny-Overrides Resolution | High | FM-01, FM-02 | All |
| INV-GD-006 | Audit Trail Completeness | High | FM-03, FM-15, FM-21, FM-26 | All |
| INV-GD-007 | Hash Chain Integrity | High | FM-05, FM-14, FM-16, FM-23, FM-32 | All |
| INV-GD-008 | Per-Scope Chain Ordering | High | FM-04, FM-22 | All |
| INV-GD-009 | Policy Serialization Round-Trip | High | FM-11, FM-33, FM-35 | All |
| INV-GD-010 | WAL Enforcement in GxP Mode | High | FM-15, FM-17 | GxP |
| INV-GD-011 | Permission Set Precomputation | Negligible | — | All |
| INV-GD-012 | Evaluation Determinism | High | FM-01, FM-02, FM-27, FM-28, FM-36 | All |
| INV-GD-013 | Guard Throws on Deny | High | FM-12, FM-20, FM-31, FM-34 | All |
| INV-GD-014 | Audit Before Throw | High | FM-03, FM-15 | All |
| INV-GD-015 | failOnAuditError GxP Enforcement | High | FM-03, FM-13 | GxP |
| INV-GD-016 | NoopAuditTrail Rejection in GxP | High | FM-13 | GxP |
| INV-GD-017 | Signature Reauthentication Requirement | High | FM-06, FM-07, FM-29, FM-30 | GxP |
| INV-GD-018 | Signature Replay Prevention | High | FM-06 | GxP |
| INV-GD-019 | Signature Binding Atomicity | High | FM-05, FM-29, FM-30 | GxP |
| INV-GD-020 | Scope Lifetime Enforcement | High | FM-08, FM-19 | GxP |
| INV-GD-021 | Subject Authentication Staleness | High | FM-08, FM-19 | GxP |
| INV-GD-022 | Anonymous Subject Rejection | High | FM-08 | GxP |
| INV-GD-023 | ReBAC Depth Limiting | High | FM-01 | All |
| INV-GD-024 | ReBAC Cycle Tolerance | High | FM-11 | All |
| INV-GD-025 | Async Evaluation Timestamp Capture | High | FM-09, FM-10 | All |
| INV-GD-026 | Per-Pass Attribute Cache | High | FM-28 | All |
| INV-GD-027 | Attribute Resolver Timeout | Low | — | All |
| INV-GD-028 | Field Intersection Semantics | High | FM-01 | All |
| INV-GD-029 | Field Union Completeness | High | FM-01 | All |
| INV-GD-030 | Not Policy Field Nullification | High | FM-01 | All |
| INV-GD-031 | anyOf Union Full Evaluation | High | FM-01 | All |
| INV-GD-032 | Policy Evaluation Depth Limit | High | FM-11 | All |
| INV-GD-033 | GxP Subject Identity Validation | High | FM-25 | GxP |
| INV-GD-034 | GxP Subject Attribute Sanitization | Medium | FM-24 | GxP |
| INV-GD-035 | Policy Tree Scan for SignaturePolicy | High | FM-07, FM-29 | GxP |
| INV-GD-036 | NoopSignatureService Rejection | High | FM-07, FM-13 | GxP |
| INV-GD-037 | guardAsync Singleton Lifetime | Negligible | — | All |

**Invariants with no primary FM — justification**:

- **INV-GD-003** (Role DAG Acyclicity, Low): `flattenPermissions()` returns `Err(CircularRoleInheritanceError)` on cycle detection via a simple O(N) visited-set traversal. A bug in cycle detection could eventually produce incorrect grants (overlapping with FM-01), but the mechanism is simple, well-tested, and self-contained. Low risk without a dedicated FMEA row is justified.
- **INV-GD-011** (Permission Set Precomputation, Negligible): Performance guarantee — O(1) `Set.has()` lookups. Violation produces O(N) performance degradation with no incorrect authorization decisions. No correctness impact; Negligible risk.
- **INV-GD-027** (Attribute Resolver Timeout, Low): Ensures slow resolvers return `Err(ACL026)` rather than hanging evaluations. Violation causes evaluation hangs, which overlaps with FM-20 (evaluation flooding/DoS). The DoS failure mode is already captured in FM-20; no separate FMEA row is needed at the invariant level. Low risk.
- **INV-GD-037** (guardAsync Singleton Lifetime, Negligible): Enforced entirely by a TypeScript conditional type (`GuardedAsyncAdapter<A>` resolves to `never` for non-singleton adapters), producing a compile-time error with no runtime failure path. Negligible risk — no runtime occurrence is possible.

---

### Risk Summary

| Risk Level | RPN Range | Count (Pre-Mitigation) | Count (Post-Mitigation, GxP mode) |
| ---------- | --------- | ---------------------- | --------------------------------- |
| **Unacceptable** | ≥ 100 | 26 (FM-03, FM-04, FM-07, FM-08, FM-09, FM-13, FM-15, FM-16, FM-17, FM-18, FM-19, FM-20, FM-21, FM-22, FM-23, FM-24, FM-25, FM-26, FM-27, FM-28, FM-29, FM-30, FM-31, FM-33, FM-34, FM-35) | 0 |
| **Conditionally acceptable** | 61–99 | 7 (FM-01, FM-06, FM-10, FM-11, FM-12, FM-14, FM-36) | 6 (FM-04, FM-09, FM-16, FM-18, FM-19, FM-28) |
| **Acceptable** | 1–60 | 3 (FM-02, FM-05, FM-32) | 30 |

All 36 failure modes reach Acceptable (residual RPN ≤ 60) or Conditionally acceptable (residual RPN 61–99) in GxP mode. The 26 failure modes with Unacceptable pre-mitigation RPN (≥ 100) (FM-03: 160, FM-04: 192, FM-07: 240, FM-08: 160, FM-09: 192, FM-13: 128, FM-15: 160, FM-16: 192, FM-17: 160, FM-18: 128, FM-19: 192, FM-20: 216, FM-21: 120, FM-22: 144, FM-23: 128, FM-24: 128, FM-25: 240, FM-26: 160, FM-27: 128, FM-28: 288, FM-29: 240, FM-30: 192, FM-31: 128, FM-33: 192, FM-34: 160, FM-35: 160) have been reduced to GxP residual RPNs of 40, 64, 40, 40, 64, 32, 40, 64, 40, 64, 64, 24, 40, 48, 32, 32, 40, 40, 32, 64, 40, 32, 32, 32, 40, and 40 respectively. FM-28 (stale resource attribute), the highest pre-mitigation RPN at 288, is mitigated to GxP residual RPN 64 by resource attribute freshness thresholds with configurable `maxAgeMs`, deny on stale attributes, and WARNING logs for missing provenance timestamps (REQ-GUARD-071). FM-29 (expired signing certificate) is mitigated from RPN 240 to GxP residual RPN 40 by automated certificate lifecycle management with 90/30/7-day renewal thresholds, CRL/OCSP revocation checking, and certificate chain archival (REQ-GUARD-068). FM-30 (algorithm migration chain break) is mitigated from RPN 192 to GxP residual RPN 32 by epoch-based algorithm transitions with multi-algorithm verification in verifyAuditChain() (REQ-GUARD-069). FM-07 (key exposure), previously the highest post-mitigation risk at RPN 80, has been reduced to GxP residual RPN 40 by elevating HSM/keystore/secrets manager from RECOMMENDED to REQUIRED when `gxp: true` ([ADR #43](decisions/043-hsm-required-gxp-key-storage.md)), bringing Detectability from 4 to 2 (HSM provides automatic tamper detection). FM-25 (unauthorized admin access), with pre-mitigation RPN 240, is mitigated to GxP residual RPN 40 by AdminGuardConfig deny-by-default enforcement, `checkGxPReadiness()` admin-authority verification, separation of duties, and administrative event logging (section 64g). FM-15 (crash window) is mitigated from RPN 160 to GxP residual RPN 40 by WAL crash recovery, real-time WAL orphan alerting (structured health check alert on orphaned intent detection when `gxp: true`), and completeness cross-check (per-port resolution vs audit write counters), bringing Detectability from 8 to 2 via two independent automated detection paths. FM-17 (buffer-flush window) is mitigated to GxP residual RPN 40 by the same WAL mechanism plus flush-interval controls and completeness monitoring. FM-18 (IdP unavailability) is mitigated from RPN 128 to GxP residual RPN 64 by business continuity planning, health monitoring, and OQ-14 failure handling verification. FM-19 (stale scope permissions) is mitigated from RPN 192 to GxP residual RPN 64 by mandatory `maxScopeLifetimeMs` when `gxp: true` ([ADR #45](decisions/045-max-scope-lifetime-gxp.md)) and `ScopeExpiredError` (ACL013). FM-20 (evaluation flooding) is mitigated from RPN 216 to GxP residual RPN 24 by mandatory rate limiting (`maxEvaluationsPerSecond` REQUIRED when `gxp: true`), `RateLimitSummaryAuditEntry` for audit trail visibility, and operational monitoring. FM-21 (evaluationId collision) is mitigated from RPN 120 to GxP residual RPN 40 by CSPRNG-backed UUID v4 generation. FM-22 (cross-region consolidation) is mitigated from RPN 144 to GxP residual RPN 48 by evaluationId-based deduplication, timestamp secondary sort, and PQ verification. FM-23 (policy change without audit) is mitigated from RPN 128 to GxP residual RPN 32 by mandatory `PolicyChangeAuditEntry` recording, separation of duties enforcement, and hash chain participation. FM-26 (completeness discrepancy unescalated) is mitigated from RPN 160 to GxP residual RPN 40 by automated escalation procedure (1-minute alert, dual routing to ops + QA, 1-hour ack SLA, 4-hour investigation SLA, 24-hour incident report). FM-27 (invalid attribute type) is mitigated from RPN 128 to GxP residual RPN 32 by policy input schema validation at graph construction time (REQ-GUARD-070). FM-31 (missing predicate rule mapping) is mitigated from RPN 128 to GxP residual RPN 32 by mandatory predicateRuleMapping when gxp:true and checkGxPReadiness item 15 (REQ-GUARD-067). FM-32 (DBA-level audit tampering) has pre-mitigation RPN 40 (already Acceptable, ≤ 60) due to Remote occurrence (O=2); the hash chain provides Immediate detection (D=2). FM-33 (policy version inconsistency across nodes) is mitigated from RPN 192 to GxP residual RPN 32 by PolicyBundle contentHash verification, health check integration, and distributed change control verification (§64a-0). FM-34 (middleware authorization bypass) is mitigated from RPN 160 to GxP residual RPN 40 by route coverage testing, port gate hook defense-in-depth, and deployment checklist integration. FM-35 (overly permissive database filter) is mitigated from RPN 160 to GxP residual RPN 40 by cross-validation against evaluate() for 100+ test cases and safe-default deny-all for unsupported policy kinds. FM-36 (WASM evaluation divergence) is mitigated from RPN 80 to GxP residual RPN 40 by 1000+ cross-validation test cases and scope limitation to pure policy evaluation only. Six failure modes remain at Conditionally acceptable residual RPN in GxP mode (FM-04, FM-09, FM-16, FM-18, FM-19, FM-28 — each at residual GxP RPN 64); these require documented QA Reviewer acceptance per the Conditionally acceptable threshold. In non-GxP mode, FM-19 (residual RPN 128) and FM-20 (residual RPN 144) remain Unacceptable without mandatory `maxScopeLifetimeMs` and `maxEvaluationsPerSecond` controls.

> **FMEA Scope Note:** This FMEA covers library-level failure modes with Severity >= 7 (Major and Critical). Low-severity operational concerns (Severity 1–6) are documented in Appendix M ([Operational Risk Guidance](./appendices/operational-risk-guidance.md)) as deployment guidance rather than formal failure modes. Organizations SHOULD incorporate Appendix M concerns into their site-level risk assessment.

> **Single-Control-Failure Analysis (S=10):** All 19 failure modes with Critical severity (S=10) (of 36 total, including FM-21, FM-25, FM-26, FM-29, FM-32, FM-34, FM-35, and FM-36) employ multiple independent mitigations. For each, the loss of any single mitigation does not restore the pre-mitigation RPN because at least one other independent control remains effective. For example: FM-03 (silent entry drop) is mitigated by four independent controls (`failOnAuditError`, `Result` return type, ACL008 alerting, completeness monitoring); FM-07 (key exposure) is mitigated by three independent controls (behavioral contract, REQUIRED HSM/keystore/secrets manager when gxp: true per [ADR #43](decisions/043-hsm-required-gxp-key-storage.md), IQ-10 source scanning); FM-17 (buffer-flush) is mitigated by four independent controls (WAL, buffer backpressure, flush-on-shutdown, completeness monitoring); FM-21 (evaluationId collision) is mitigated by three independent controls (CSPRNG UUID v4, per-scope uniqueness verification, adapter-level duplicate detection); FM-25 (unauthorized admin access) is mitigated by four independent controls (AdminGuardConfig deny-by-default, `checkGxPReadiness()` admin-authority verification, separation of duties enforcement, administrative event log recording); FM-26 (completeness discrepancy unescalated) is mitigated by three independent controls (automated 1-minute alert, dual routing to ops + QA, tiered SLA escalation with 1-hour ack / 4-hour investigation / 24-hour incident report). This layered approach satisfies the REQUIREMENT that no single control failure can restore the pre-mitigation RPN for Critical-severity failure modes.

```
REQUIREMENT: Each mitigation listed in the FMEA table MUST have at least one
             corresponding OQ or PQ test case that verifies the mitigation is
             effective. The mapping between mitigations and test cases MUST be
             documented in the OQ/PQ report. A mitigation without a corresponding
             test case is unverified and MUST NOT be counted toward the residual
             RPN calculation. Reference: ICH Q9 Section 4 (Risk Control).
```

```
RECOMMENDED: For each failure mode, the detection mechanism underlying the Detectability
             (D) score SHOULD be documented and attributable to a specific control per
             ICH Q9 Section 4 (Risk Control). Where the detection depends on a RECOMMENDED
             (not REQUIRED) control (e.g., FM-20 depends on optional rate limiting for
             detection of evaluation flooding), organizations SHOULD either implement the
             recommended control or re-score detectability upward to reflect the actual
             detection capability in their deployment. Note: FM-09 clock drift monitoring
             is REQUIRED when gxp: true (section 62), so its D=2 score is not dependent on
             a RECOMMENDED control in GxP environments. Detection mechanisms include:
             automated runtime checks (D=1), test suite verification (D=1-2), manual
             review procedures (D=3-4), and no detection mechanism (D=5).
```

```
RECOMMENDED: Upon completion of each FMEA review (initial or periodic), the deploying
             organization SHOULD produce a formal Risk Acceptance Statement signed by:
             (1) the System Owner (or designee with documented authority),
             (2) the Quality Unit representative (QA Manager or designee).
             The Risk Acceptance Statement SHOULD document:
             (a) Confirmation that the residual risk profile (all mitigated RPNs) has
                 been reviewed and is acceptable for the intended use.
             (b) Identification of any failure modes with mitigated RPN > 5 that
                 require ongoing monitoring.
             (c) Confirmation that compensating controls are in place for any
                 accepted risks.
             (d) Signature, printed name, role, and date for each signatory.
             While ICH Q9 Section 4.4 permits risk acceptance decisions to be
             "formal or informal", formal documentation strengthens audit readiness
             and provides contemporaneous evidence of risk-informed decision-making.
             Reference: ICH Q9 Section 4.4 (Risk Acceptance), ALCOA+ Attributable.
```

```
REQUIREMENT: The FMEA MUST be reviewed each periodic review cycle (section 64) and
             updated when new failure modes are identified, mitigations change, or
             re-validation triggers (section 64a) occur. Updated FMEA results MUST
             be communicated to QA and compliance teams as part of the periodic review
             report. The review MUST document: (1) any new failure modes identified,
             (2) changes to existing RPN scores, (3) new or modified mitigations, and
             (4) reviewer identity and date.
             Reference: ICH Q9 Section 4 (Risk Control, Risk Communication).

REQUIREMENT: The FMEA MUST undergo independent review at least once every 2 years
             by a reviewer who was NOT involved in authoring the FMEA or implementing
             the mitigations. The independent reviewer MUST have documented competency
             in risk assessment methodologies (ICH Q9 or equivalent). The independent
             review MUST:
             (a) Verify that each failure mode's Severity, Occurrence, and
                 Detectability scores are appropriate and consistently applied.
             (b) Validate that mitigations are sufficient to achieve the claimed
                 residual RPN.
             (c) Identify any failure modes not covered by the existing analysis.
             (d) Confirm that the single-control-failure analysis (S=10 items) is
                 valid — i.e., that mitigation independence claims are justified.
             (e) Produce a written assessment with findings, recommendations, and
                 an overall adequacy determination.
             Independent review findings MUST be tracked through the site's CAPA
             process until closure. The review report MUST be archived alongside
             the FMEA as compliance evidence.
             Reference: ICH Q9 Section 5 (Risk Review), EU GMP Annex 11 §1.
```

### Independent FMEA Review Schedule

This FMEA was first published as Revision 1.0 on 2026-02-13. Per the independent review REQUIREMENT above, the first independent review is due no later than **2028-02-13**. Organizations SHOULD schedule the independent review to coincide with the annual periodic review cycle (§64) to minimize administrative overhead.

| Review Cycle | Due Date | Reviewer | Status | Report Reference |
|-------------|----------|----------|--------|-----------------|
| Initial Independent Review | 2028-02-13 | TBD¹ (must not be FMEA author or mitigation implementer) | Planned | — |
| Second Independent Review | 2030-02-13 | TBD¹ | Planned | — |

> ¹ **Template Placeholder Note:** The TBD entries in the Reviewer column are intentional placeholders. This library-level FMEA serves as a template; the deploying organization MUST populate reviewer assignments in their site-level FMEA copy before first GxP deployment. Reviewer assignment is a consumer deployment responsibility tracked in the consumer's quality management system, not a gap in the library specification. The site-level copy — not this template — is the controlled document of record for regulatory purposes.

```
REQUIREMENT: The deploying organization MUST assign a named individual to the
             first independent FMEA review before the first GxP deployment. The
             assignment MUST be documented in the site validation plan or quality
             management system. The assigned reviewer MUST meet the competency
             requirements specified in the independent review REQUIREMENT above
             (documented ICH Q9 or equivalent competency).
             Reference: ICH Q9 Section 5 (Risk Review).
```

```
REQUIREMENT: Organizations MUST establish a consolidated incident classification
             matrix for guard-related events. The matrix MUST define severity levels
             (critical, major, minor), escalation timelines, and response procedures
             for: chain break detection, key compromise, audit write failure,
             unauthorized access pattern, and signature validation failure. The
             minimum escalation timelines are:
             - Critical (patient safety/data integrity impact): immediate notification,
               4-hour response initiation, 24-hour initial report.
             - Major (compliance impact without patient safety): 4-hour notification,
               24-hour response initiation, 72-hour initial report.
             - Minor (operational impact, no compliance violation): 24-hour notification,
               5-business-day response.
             The classification matrix MUST align with the site's existing incident
             management framework. Reference: GAMP 5 Appendix M3, EU GMP Annex 11 §13.
```

---

## 68a. STRIDE Threat Model

This section provides a STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) threat model for `@hex-di/guard`, complementing the FMEA above with an attacker-centric perspective per Microsoft SDL and OWASP threat modeling guidance.

### Scope and Trust Boundaries

The guard system operates within the following trust boundaries:

```
┌─────────────────────────────────────────────────────────────┐
│  Trust Boundary 1: Application Process                      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ SubjectProv. │  │ Guard Adapter│  │ Policy Evaluator │  │
│  │   (IdP data) │→ │  (gate)      │→ │ (decision logic) │  │
│  └──────────────┘  └──────┬───────┘  └──────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│                    ┌──────────────┐                          │
│                    │ Audit Trail  │                          │
│                    │   Adapter    │                          │
│                    └──────┬───────┘                          │
└───────────────────────────┼─────────────────────────────────┘
                            │  Trust Boundary 2
                            ▼
                     ┌──────────────┐
                     │ Backing Store│ (DB, file system, remote service)
                     └──────────────┘

                     ┌──────────────┐
                     │ External IdP │ (LDAP, OIDC, SAML)
                     └──────────────┘
                       Trust Boundary 3

                     ┌──────────────┐
                     │ MCP/A2A      │ (diagnostic endpoints)
                     │ Endpoints    │
                     └──────────────┘
                       Trust Boundary 4
```

### STRIDE Analysis

#### S — Spoofing

| ID  | Threat                                                                                                                    | Target                                   | Severity | Mitigation                                                                                                                                                                                                                         | FMEA Cross-Ref |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| S-1 | Attacker spoofs `AuthSubject` identity by providing forged `subjectId` or `authenticationMethod` to `SubjectProviderPort` | Trust Boundary 3 (IdP → SubjectProvider) | Critical | Consumer MUST validate IdP tokens (JWT signature verification, SAML assertion validation); `SubjectProviderPort` conformance suite (section 13) verifies token validation; GxP requires non-anonymous `authenticationMethod` (§22) | FM-08          |
| S-2 | Attacker replays a valid `ReauthenticationToken` to forge an electronic signature                                         | Trust Boundary 1 (SignatureService)      | Critical | Token expiration (`expiresAt` check, recommended 5-min window); CSPRNG token generation; single-use token enforcement (RECOMMENDED); constant-time comparison (§65b)                                                               | FM-06          |
| S-3 | Attacker spoofs `actorId` on `PolicyChangeAuditEntry` to attribute unauthorized policy changes to another person          | Trust Boundary 1 (Policy Change Control) | Major    | `actorId` MUST come from authenticated session, not user input; separation of duties enforcement (`actorId !== approverId`); administrative event logging (§64b)                                                                   | FM-23          |
| S-4 | Attacker spoofs administrative role to gain `guard:config:modify` or `guard:keys:rotate` access                           | Trust Boundary 1 (AdminGuardConfig)      | Critical | AdminGuardConfig deny-by-default (§64g); role claims MUST originate from authenticated IdP token; role incompatibility matrix enforcement; all admin operations logged                                                             | FM-25          |

#### T — Tampering

| ID  | Threat                                                                                        | Target                                    | Severity | Mitigation                                                                                                                                                                                                | FMEA Cross-Ref |
| --- | --------------------------------------------------------------------------------------------- | ----------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| T-1 | Attacker modifies audit trail entries in the backing store to conceal unauthorized access     | Trust Boundary 2 (Backing Store)          | Critical | SHA-256 hash chain with per-entry `integrityHash` and `previousHash` (§61.4); `verifyAuditChain()` detects any modification; append-only storage contract; data-at-rest encryption (AES-256)              | FM-05          |
| T-2 | Attacker modifies policy configuration at runtime to escalate permissions                     | Trust Boundary 1 (Policy Deserialization) | Critical | `PolicyChangeAuditEntry` REQUIRED before activation (§64a-1); hash-based policy integrity (`hashPolicy()`); schema validation for deserialized policies; production modification prohibition (§64a-ext-1) | FM-11, FM-23   |
| T-3 | Attacker tampers with WAL pending intents to inject false audit records during crash recovery | Trust Boundary 2 (WAL Store)              | Major    | WAL entries correlated via `evaluationId` to actual evaluations; orphaned intent detection and remediation (§61); completeness monitoring cross-check                                                     | FM-15          |
| T-4 | Attacker modifies `Decision` object between evaluation and audit recording                    | Trust Boundary 1 (In-Process)             | Major    | `Decision` objects are frozen (`Object.freeze`) after creation; immutable `readonly` interfaces; audit write happens in the same synchronous call chain as evaluation                                     | FM-01          |

#### R — Repudiation

| ID  | Threat                                                                  | Target                               | Severity | Mitigation                                                                                                                                                                                                                    | FMEA Cross-Ref |
| --- | ----------------------------------------------------------------------- | ------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| R-1 | Subject denies having performed a guarded operation that was authorized | Trust Boundary 1 (Audit Trail)       | Critical | `AuditEntry` records `subjectId`, `authenticationMethod`, `authenticatedAt` for every evaluation; hash chain prevents retroactive deletion; electronic signature binding (§65) provides non-repudiation for signed operations | FM-03          |
| R-2 | Administrator denies having modified guard configuration                | Trust Boundary 1 (Admin Event Log)   | Major    | Administrative event log (§64b) with append-only storage; `PolicyChangeAuditEntry` with `actorId` and `approverId`; electronic signature on policy changes (RECOMMENDED); meta-audit logging of admin data access             | FM-23, FM-25   |
| R-3 | Subject claims electronic signature was forged                          | Trust Boundary 1 (Signature Service) | Critical | Re-authentication with two-component identification (§65b); signature binding verification (cryptographic + binding + key status); HSM key protection (FIPS 140-2/3 Level 3); counter-signing for maker-checker workflows     | FM-06, FM-07   |

#### I — Information Disclosure

| ID  | Threat                                                                                             | Target                              | Severity | Mitigation                                                                                                                                                                                                               | FMEA Cross-Ref |
| --- | -------------------------------------------------------------------------------------------------- | ----------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| I-1 | Attacker extracts policy configuration via MCP/A2A diagnostic endpoints to map authorization model | Trust Boundary 4 (MCP/A2A)          | Medium   | AdminGuardConfig `guard:inspection:read` policy (§64g); endpoint authentication REQUIRED (§48d); rate limiting on diagnostic endpoints (§64f-2)                                                                          | FM-25          |
| I-2 | Signing key material leaked via error messages, logs, or serialization                             | Trust Boundary 1 (Key Management)   | Critical | Behavioral contract: keys MUST NOT appear in source, env vars, logs, or error messages (§65c); HSM REQUIRED when `gxp: true` ([ADR #43](decisions/043-hsm-required-gxp-key-storage.md)); IQ-10 source scanning; code review checklist item #5 (§67b)                      | FM-07          |
| I-3 | Audit trail data containing subject identifiers exfiltrated via bulk export                        | Trust Boundary 2 / 4 (Audit Trail)  | High     | AdminGuardConfig `guard:audit:export` policy restricts export access (§64g); meta-audit logging records all export operations; GDPR pseudonymization for subject identifiers (RECOMMENDED); TLS 1.2+ for data in transit | —              |
| I-4 | Timing side-channel reveals whether a subject has a specific permission                            | Trust Boundary 1 (Policy Evaluator) | Medium   | Constant-time evaluation duration normalization when `gxp: true` (§65b-1); configurable evaluation duration ceiling calibrated during PQ; no early-return short-circuits in comparison paths                             | —              |
| I-5 | Audit trail data (subject identifiers, decision reasons, policy snapshots) leaked through application logs, error stack traces, or debug output | Trust Boundary 1 (Application Process) | High | AuditEntry fields MUST NOT be included in application-level log messages at INFO or DEBUG level (§61); error messages MUST NOT include full AuditEntry payloads — only evaluationId and error category; `createGuardGraph({ gxp: true })` MUST suppress verbose policy evaluation traces in production (trace tree available only via diagnostic endpoints with `guard:inspection:read` authorization per §64g); log redaction RECOMMENDED for subjectId in non-GxP debug logging | FM-03, FM-24 |
| I-6 | Cross-scope audit query returns entries from unauthorized scopes, leaking authorization decisions of other tenants or business units | Trust Boundary 2 (Audit Trail Adapter) | High | Audit trail query interface (§64, 05-audit-trail-review.md) enforces scope-level access control — queries MUST be scoped to the requesting subject's authorized scopes; multi-tenant isolation (§64 multi-tenant notes) requires adapter-level scope filtering; AdminGuardConfig `guard:audit:read` policy restricts cross-scope query access (§64g); meta-audit logging records all cross-scope queries | FM-25 |

#### D — Denial of Service

| ID  | Threat                                                                                                | Target                              | Severity | Mitigation                                                                                                                                                                                       | FMEA Cross-Ref |
| --- | ----------------------------------------------------------------------------------------------------- | ----------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| D-1 | Attacker floods guard evaluations to exhaust CPU and memory                                           | Trust Boundary 1 (Guard Adapter)    | Moderate | `maxEvaluationsPerSecond` rate limiting REQUIRED when `gxp: true`; `RateLimitSummaryAuditEntry` for visibility; WARNING log on activation                                                        | FM-20          |
| D-2 | Attacker floods audit trail writes to fill backing store capacity                                     | Trust Boundary 2 (Backing Store)    | Major    | Capacity monitoring with progressive escalation (§63a): WARNING 70%, CRITICAL 85%, EMERGENCY 95%; `createGuardHealthCheck()` reports utilization; rate limiting on evaluations limits write rate | FM-20          |
| D-3 | Deeply nested policy (e.g., 10,000 levels of `allOf`/`anyOf`) causes stack overflow during evaluation | Trust Boundary 1 (Policy Evaluator) | Moderate | Policy depth limiting (OQ-12); schema validation rejects policies exceeding maximum nesting depth; documented error on depth limit hit                                                           | FM-11          |
| D-4 | External IdP unavailability blocks all guarded operations                                             | Trust Boundary 3 (IdP)              | Major    | Business continuity plan (§61 BCP); emergency bypass procedure (§64h); IdP health monitoring; cached subject fallback for read-only operations (consumer responsibility)                         | FM-18          |

#### E — Elevation of Privilege

| ID  | Threat                                                                   | Target                              | Severity | Mitigation                                                                                                                                                                                                                                            | FMEA Cross-Ref |
| --- | ------------------------------------------------------------------------ | ----------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| E-1 | Attacker bypasses guard by resolving port directly without guard wrapper | Trust Boundary 1 (DI Container)     | Critical | Guard wraps at adapter level — guarded adapters replace originals in graph; port gate hook intercepts resolution; no unguarded path when properly configured; OQ-12 verifies bypass resistance                                                        | FM-12          |
| E-2 | Attacker exploits role hierarchy cycle to gain unintended permissions    | Trust Boundary 1 (Role Hierarchy)   | Major    | `flattenPermissions()` includes cycle detection (§11, 03-role-types.md); cycles produce `RoleHierarchyCycleError` (ACL006); role hierarchy validated at graph construction time                                                                       | —              |
| E-3 | Stale scope retains permissions after subject's access is revoked        | Trust Boundary 1 (Scope Lifecycle)  | Major    | `maxScopeLifetimeMs` REQUIRED when `gxp: true` ([ADR #45](decisions/045-max-scope-lifetime-gxp.md)); `ScopeExpiredError` (ACL013) blocks evaluation in expired scopes; periodic scope refresh forces re-authentication                                                                           | FM-19          |
| E-4 | Attacker escalates from application-level role to administrative role    | Trust Boundary 1 (AdminGuardConfig) | Critical | Administrative roles are separate from application roles; AdminGuardConfig is evaluated independently from port-level guard policies; role incompatibility matrix (§64g) prevents cross-domain accumulation; deny-by-default for all admin operations | FM-25          |

#### SC — Supply Chain Threats

Supply chain threats target the guard library's dependencies, build pipeline, and distribution channels. While not a standard STRIDE category, these threats are critical for GxP compliance where software provenance must be verified.

| ID   | Threat                                                                                                                  | Target                            | Severity | Mitigation                                                                                                                                                                                                    | FMEA Cross-Ref |
| ---- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| SC-1 | Compromised npm dependency introduces malicious code into guard library                                                 | Trust Boundary 1 (Build Pipeline) | Critical | IQ-8 (package integrity verification); IQ-12 (SBOM generation when gxp:true); IQ-9 (vulnerability scanning); lockfile pinning with integrity hashes; supplier qualification per Appendix G ([Open-Source Supplier Qualification](./appendices/supplier-qualification.md)) | —              |
| SC-2 | Typosquatting attack: consumer installs a malicious package with a name similar to @hex-di/guard                        | Trust Boundary 1 (Installation)   | Major    | IQ-8 verification against official package registry; exact package name in documentation; npm organization scoping (@hex-di/ prefix)                                                                          | —              |
| SC-3 | Build pipeline compromise: CI/CD system modified to inject code not present in source repository                        | Trust Boundary 1 (Build Pipeline) | Critical | Reproducible builds (RECOMMENDED); SBOM with build provenance (IQ-12); code signing of published artifacts (RECOMMENDED); source-to-artifact hash verification                                                | —              |
| SC-4 | Transitive dependency vulnerability: a deep dependency introduces a vulnerability exploitable through the guard library | Trust Boundary 1 (Runtime)        | Major    | Automated dependency scanning (IQ-9); ad-hoc penetration testing triggered by dependency changes (§64f-1); SBOM enables rapid impact assessment when CVEs are published                                       | —              |

#### React — Client-Side Integration Threats

The `integrations/react-guard` package provides React components (`<Can>`, `<Cannot>`) and hooks (`useCan`, `usePolicy`, `useSubject`) for client-side authorization UI. These components gate UI rendering only — they do NOT enforce authorization. All authorization enforcement occurs server-side via the guard adapter and policy evaluator.

> **Key principle:** React guard components are **UI convenience gates**, NOT GxP controls. A user bypassing `<Can>` in the browser still faces server-side guard enforcement on every port resolution. Client-side threats are therefore rated Low to Moderate severity because they cannot compromise the server-side authorization boundary.

| ID        | Threat                                                                                                                              | Target                     | Severity | Mitigation                                                                                                                                                                                                                                                                                         | FMEA Cross-Ref |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| S-React-1 | Attacker spoofs `AuthSubject` in React context by manipulating `SubjectProvider` props or React DevTools                            | Trust Boundary 5 (Browser) | Low      | React guard gates are UI-only; server-side guard adapter enforces authorization independently of client state; subject in React context is NOT used for server-side decisions; server resolves subject from authenticated session/JWT                                                              | FM-08          |
| T-React-1 | Attacker tampers with policy evaluation result in browser memory to show UI elements that should be hidden                          | Trust Boundary 5 (Browser) | Low      | Revealed UI elements produce server-side AccessDeniedError on action; no sensitive data exposed via UI gate alone; `useCan`/`usePolicy` results are not security controls                                                                                                                          | —              |
| R-React-1 | User claims they did not see a warning or confirmation dialog rendered by `<Can>`/`<Cannot>` components                             | Trust Boundary 5 (Browser) | Moderate | Server-side audit trail records all authorization decisions with subjectId and timestamp regardless of client-side UI state; electronic signatures (§65) provide non-repudiation for GxP-critical actions independent of UI rendering                                                              | FM-03          |
| E-React-1 | Attacker bypasses `<Can>` component to access protected routes or UI functionality without required permissions                     | Trust Boundary 5 (Browser) | Low      | Client-side route guards are defense-in-depth only; server-side guard adapter blocks unauthorized port resolution; `<Can>` is a UX optimization, not a security boundary; all protected operations require server-side evaluation                                                                  | FM-12          |
| D-React-1 | Attacker triggers excessive `useCan`/`usePolicy` hook evaluations via rapid component re-mounting to overload the client or backend | Trust Boundary 5 (Browser) | Moderate | React hooks use memoization and deduplication; `useCanDeferred`/`usePolicyDeferred` variants never suspend (no cascading re-renders); server-side rate limiting (`maxEvaluationsPerSecond`) protects backend; client-side evaluation is pure and synchronous (no server round-trip per evaluation) | FM-20          |

#### Eco — Ecosystem Extension Threats

The ecosystem extension packages (section 18, roadmap/ecosystem-extensions.md) introduce new trust boundaries at the persistence layer, distributed sync layer, framework middleware layer, and query conversion layer. These threats complement the core STRIDE categories above.

| ID    | Threat                                                                                                                                              | Target                                          | Severity | Mitigation                                                                                                                                                                                                                                                  | FMEA Cross-Ref |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| T-5   | DBA tampers with audit records via superuser SQL bypass of REVOKE constraints on Postgres/SQLite audit trail adapter                                | Trust Boundary 2 (Persistence Adapter)          | Critical | Hash chain integrity verification detects any modification regardless of database-level access (§61.4); REVOKE constraints limit application-role access; scheduled chain verification (§61.4c); row-level security policies (RECOMMENDED)                   | FM-32          |
| T-6   | Attacker modifies PolicyBundle in transit between sync nodes to inject malicious policy                                                              | Trust Boundary 2 (PolicySyncPort)               | Critical | PolicyBundle.contentHash verified on receipt; bundle signatures (BundleSignature) provide tamper detection; TLS 1.2+ for inter-node communication (REQUIRED when gxp:true per §59)                                                                           | FM-33          |
| E-5   | Attacker bypasses guard by accessing an unguarded route in a framework middleware deployment where not all routes have guard wrapper configured      | Trust Boundary 1 (Framework Middleware)          | Critical | Middleware wraps guard() adapter; port gate hook provides defense-in-depth at DI level; route coverage test utility validates all registered routes have guard coverage; OQ route enumeration                                                                | FM-34          |
| E-6   | policyToFilter() generates an overly permissive database query allowing access to records that evaluate() would deny                                 | Trust Boundary 1 (Query Conversion)             | Critical | Pure deterministic function; OQ cross-validation against evaluate() for 100+ test cases; unsupported policy kinds produce deny-all filter; round-trip property test verifies filter ⊆ evaluate()                                                            | FM-35          |
| D-5   | Attacker triggers expensive policyToFilter() computations on deeply nested policies to cause database query timeout or resource exhaustion           | Trust Boundary 1 (Query Conversion)             | Moderate | Policy depth limiting (same as OQ-12 for evaluate()); policyToFilter() inherits the same nesting depth limit; database query timeout configuration (consumer responsibility)                                                                                 | FM-35          |

### STRIDE Summary

| Category                   | Threats Identified | Critical          | Major          | Low/Medium/Moderate     |
| -------------------------- | ------------------ | ----------------- | -------------- | ----------------------- |
| **Spoofing**               | 5                  | 3 (S-1, S-2, S-4) | 1 (S-3)        | 1 (S-React-1)           |
| **Tampering**              | 7                  | 4 (T-1, T-2, T-5, T-6) | 2 (T-3, T-4) | 1 (T-React-1)           |
| **Repudiation**            | 4                  | 2 (R-1, R-3)      | 1 (R-2)        | 1 (R-React-1)           |
| **Information Disclosure** | 6                  | 1 (I-2)           | 2 (I-3, I-5)   | 3 (I-1, I-4, I-6)       |
| **Denial of Service**      | 6                  | 0                 | 2 (D-2, D-4)   | 4 (D-1, D-3, D-5, D-React-1) |
| **Elevation of Privilege** | 7                  | 4 (E-1, E-4, E-5, E-6) | 2 (E-2, E-3) | 1 (E-React-1)           |
| **Supply Chain**           | 4                  | 2 (SC-1, SC-3)    | 2 (SC-2, SC-4) | 0                       |
| **Total**                  | **39**             | **16**            | **12**         | **11**                  |

All 39 identified threats have documented mitigations cross-referenced to FMEA failure modes (where applicable) and spec sections. The 16 Critical-severity threats all have multiple independent mitigations, consistent with the defense-in-depth principle applied in the FMEA (§68). The 5 React client-side threats are rated Low or Moderate because React guard components are UI-only gates — all authorization enforcement occurs server-side. The 5 ecosystem extension threats (T-5, T-6, E-5, E-6, D-5) are mitigated by the same defense-in-depth approach: hash chain verification, bundle signatures, route coverage testing, and cross-validation against evaluate(). The 2 additional Information Disclosure threats (I-5, I-6) address audit data leakage through logging and cross-scope query boundaries.

### OWASP Top 10 Mapping

The following table maps the OWASP Top 10 (2021) categories to the guard library's threat landscape and mitigations:

| OWASP Category                         | Guard Relevance                                                               | Mitigations                                                                                                                                                           | STRIDE Cross-Ref         |
| -------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **A01: Broken Access Control**         | Core concern — the guard library IS the access control system                 | Policy evaluation with 100% mutation kill rate; port gate hook; AdminGuardConfig deny-by-default; role incompatibility matrix                                         | E-1, E-2, E-3, E-4, S-4  |
| **A02: Cryptographic Failures**        | Signing key management, hash chain integrity, token generation                | HSM REQUIRED when `gxp: true`; CSPRNG for tokens and UUIDs; SHA-256 hash chains; constant-time comparison; PQC readiness                                              | I-2, S-2, T-1            |
| **A03: Injection**                     | Policy deserialization, audit trail display, CSV export                       | Schema validation for deserialized policies; XSS prevention in audit review (§64); CSV formula injection prevention in exports (§64e); output encoding                | T-2, D-3                 |
| **A04: Insecure Design**               | Architectural bypass paths, missing fail-safe defaults                        | Guard wraps at adapter level (no bypass path); `failOnAuditError: true` default; NoopAuditTrail detection (compile-time + runtime); WAL for crash recovery            | E-1, FM-03, FM-12, FM-13 |
| **A05: Security Misconfiguration**     | Missing AdminGuardConfig, NoopAuditTrail in production, disabled GxP controls | `checkGxPReadiness()` diagnostic; NoopAuditTrail detection (OQ-11); admin-authority verification; IQ-6 ESLint validation                                              | FM-13, FM-25             |
| **A06: Vulnerable Components**         | Dependency chain vulnerabilities                                              | IQ-9 vulnerability scanning; IQ-12 SBOM generation; supplier qualification (§64d); ad-hoc penetration testing on dependency changes                                   | —                        |
| **A07: Auth Failures**                 | Consumer authentication subsystem (out of guard scope)                        | Consumer authentication REQUIREMENT (§59, 21 CFR 11.300); OQ-22 IdP verification; re-authentication for electronic signatures (§65b)                                  | S-1, S-2                 |
| **A08: Data Integrity Failures**       | Audit trail integrity, policy integrity                                       | Hash chain verification; `hashPolicy()` integrity; SBOM with integrity hashes; deserialization schema validation                                                      | T-1, T-2, T-3            |
| **A09: Logging & Monitoring Failures** | Silent audit entry drops, unescalated discrepancies                           | `failOnAuditError: true`; completeness monitoring (§61.3); capacity monitoring (§63a); administrative event logging (§64b); meta-audit logging                        | FM-03, FM-26, R-1, R-2   |
| **A10: SSRF**                          | MCP/A2A endpoint exposure                                                     | AdminGuardConfig restricts endpoint access; endpoint authentication REQUIRED; rate limiting on diagnostic endpoints; network-level controls (consumer responsibility) | I-1, D-1                 |

```
REQUIREMENT: The STRIDE threat model MUST be reviewed alongside the FMEA during
             each periodic review cycle (section 64). New threats identified through
             penetration testing (§64f-1), incident investigation, regulatory
             guidance, or new ecosystem extension packages MUST be added to the
             STRIDE analysis with corresponding mitigations. Threats without
             adequate mitigations MUST be escalated to the FMEA with RPN scoring.
             When new ecosystem extension packages are added to the guard library,
             their trust boundaries MUST be analyzed for STRIDE threats before
             GxP deployment.
             Reference: ICH Q9 (risk identification), OWASP Threat Modeling.

REQUIREMENT: The OWASP Top 10 mapping MUST be updated when a new OWASP Top 10
             edition is released. The update MUST assess whether new categories
             introduce additional threats to the guard system and MUST document
             the assessment outcome in the periodic review report.
             Reference: OWASP Application Security Verification Standard (ASVS).
```

### Post-Quantum Cryptography (PQC) Pharma Standardization Note

The electronic signature specification (§65c-2) includes Post-Quantum Cryptography (PQC) readiness provisions, including epoch-based algorithm migration and ML-DSA/SLH-DSA algorithm support. As of 2026-02-15, PQC algorithms have been standardized by NIST (FIPS 203, 204, 205) but have not yet been mandated or explicitly endorsed by pharmaceutical regulatory bodies (FDA, EMA, MHRA) for GxP electronic signature use.

```
RECOMMENDED: Organizations SHOULD monitor PQC adoption timelines in the
             pharmaceutical sector as part of the regulatory update monitoring
             process (§64f). Specifically:
             (a) Track FDA, EMA, and MHRA guidance on PQC algorithm acceptance
                 for electronic records and signatures.
             (b) Track NIST SP 800-131A and CNSA 2.0 transition timelines for
                 SHA-256 and current signing algorithms.
             (c) Include PQC readiness assessment as a standing item in the
                 annual FMEA review until regulatory guidance is published.
             (d) Do not transition to PQC algorithms for GxP electronic signatures
                 until the relevant regulatory body provides acceptance guidance.
             The guard library's epoch-based migration mechanism (§65c-4) supports
             a phased transition when regulatory clearance is obtained.
             Reference: NIST FIPS 203/204/205, §65c-2 (PQC readiness).
```

---

### Low-risk Justifications

Three failure modes have pre-mitigation RPN in the Acceptable range (1–60). Per the canonical risk assessment conventions, an explicit prose justification is required for each.

**FM-02 — Incorrect deny (RPN 48, S=6, O=4, D=2)**

FM-02 is classified Acceptable pre-mitigation because its severity is Moderate (S=6), not Critical. An incorrect denial means a legitimately authorized user is blocked — this is a service disruption, not a data integrity or patient safety event. Unlike FM-01 (incorrect allow), false denials are self-reporting: affected users immediately report blocked access, keeping detectability high (D=2). The hash chain audit trail records all deny decisions with their trace trees, enabling rapid diagnosis. The same mutation testing and deterministic evaluation path that protects FM-01 also protects FM-02. Pre-mitigation RPN = 6 × 4 × 2 = 48 (Acceptable).

**FM-05 — Tampered entry (RPN 40, S=10, O=2, D=2)**

FM-05 is classified Acceptable pre-mitigation despite Critical severity (S=10) because the Occurrence is Remote (O=2). Tampering with a persisted audit entry requires direct backing store access bypassing the application layer — this requires database credentials or filesystem access that the application service account does not hold in a properly secured deployment. Compromising the backing store at this level implies a broader infrastructure breach that would be detected through infrastructure monitoring outside the guard library's scope. Furthermore, the SHA-256 hash chain provides Immediate detection (D=2) of any modification regardless of how access was obtained. The combination of Remote occurrence and Immediate detection keeps the pre-mitigation RPN at 10 × 2 × 2 = 40 (Acceptable).

**FM-32 — DBA-level audit tampering (RPN 40, S=10, O=2, D=2)**

FM-32 is classified Acceptable pre-mitigation for the same structural reason as FM-05: despite Critical severity (S=10), the Occurrence is Remote (O=2) because DBA-level tampering requires database superuser access specifically to execute UPDATE or DELETE against audit tables — a privilege not held by the application service account, protected by REVOKE constraints at the database level (§76), and typically restricted to a small number of named DBAs in a regulated environment. Database superuser access in a GxP deployment is itself a controlled activity subject to personnel qualification, separation of duties, and administrative event logging. The SHA-256 hash chain provides Immediate detection (D=2) via `verifyAuditChain()` regardless of whether REVOKE was bypassed. Pre-mitigation RPN = 10 × 2 × 2 = 40 (Acceptable).

---

### Residual Risk Summary

This table summarizes all failure modes whose residual RPN exceeds the Acceptable threshold (> 60) after applying mitigations. These are the residual risks that require documented risk acceptance or additional compensating controls.

#### GxP Mode — Conditionally Acceptable Residuals (RPN 61–99)

Six failure modes remain Conditionally acceptable (RPN 64) in GxP mode. Each requires documented risk acceptance signed by the QA Reviewer before GxP deployment.

| ID | Description | Residual GxP RPN | ALCOA+ Impact | Compensating Controls | Review Cadence |
|----|-------------|-----------------|--------------|----------------------|----------------|
| FM-04 | Out-of-order hash chain writes under concurrency | 64 | **Contemporaneous** (chain ordering), **Consistent** (sequence integrity) | Per-scope write serialization; monotonic `sequenceNumber` with gap detection; `verifyAuditChain()` catches any interleave; concurrent scope tests in DoD 13 | Annual §64 review; triggered by changes to concurrency model or async write paths |
| FM-09 | NTP clock drift exceeds 1 second | 64 | **Contemporaneous** (timestamp accuracy — 21 CFR 11.10(b)) | NTP monitoring REQUIRED when `gxp: true` (§62); 1-second tolerance chosen as conservative threshold per pharmaceutical practice; cross-reference to `ClockSource` requirements; `ClockPort` monitoring integration | Annual §64 review; triggered by deployment infrastructure changes or clock monitoring alerts |
| FM-16 | Audit schema migration breaks historical chain verification | 64 | **Consistent** (historical verification continuity), **Legible** (pre-upgrade entry readability) | Version-tagged hash computation with algorithm identifier per entry; epoch boundaries at schema changes (§61.4); `verifyAuditChain()` supports multi-version verification; OQ re-validation required on framework version upgrade (§64a trigger #1) | Triggered by each framework major version upgrade; annual §64 review |
| FM-18 | External IdP unavailability blocks all guarded operations | 64 | **Accurate** (subject identity), **Complete** (access control decision record) | Business continuity plan (§61 BCP) with documented IdP SLAs; IdP health monitoring with alerting; consumer-responsibility fallback documented; OQ-14 verifies failure handling behavior | Annual §64 review; triggered by IdP SLA changes or business continuity plan updates |
| FM-19 | Stale scope — revoked permissions still active in long-lived scope | 64 | **Accurate** (current permission state), **Contemporaneous** (revocation timing) | `maxScopeLifetimeMs` REQUIRED when `gxp: true` ([ADR #45](decisions/045-max-scope-lifetime-gxp.md)); `ScopeExpiredError` (ACL013) blocks evaluation; `checkGxPReadiness()` item 12 validates configuration | Annual §64 review; triggered by changes to `maxScopeLifetimeMs` policy or IdP permission model |
| FM-28 | Stale resource attribute used in authorization decision | 64 | **Accurate** (attribute state), **Contemporaneous** (attribute freshness) | Configurable `maxAgeMs` freshness threshold per attribute (REQ-GUARD-071); deny with "attribute_stale" reason on threshold breach; WARNING log for attributes without provenance timestamps; deny-by-default on missing freshness metadata | Annual §64 review; triggered by changes to resource attribute caching layer or freshness policy |

All six Conditionally acceptable residuals require a formal Risk Acceptance Statement signed by the System Owner and QA Reviewer before first GxP deployment, and renewed at each periodic review cycle (§64). See [Risk Acceptance Criteria](#risk-acceptance-criteria) below for the required evidence and authority level per classification.

#### Non-GxP Mode — Unacceptable Residuals (RPN ≥ 100)

Two failure modes have Unacceptable residual RPN in non-GxP deployments (when `gxp: true` controls are not active). Organizations deploying without `gxp: true` MUST document acceptance of these risks in their site risk assessment or apply equivalent controls.

| ID | Description | Non-GxP Residual RPN | Root Cause | Compensating Controls (if not using gxp: true) |
|----|-------------|---------------------|-----------|------------------------------------------------|
| FM-19 | Stale scope — revoked permissions still active | 128 (Unacceptable) | `maxScopeLifetimeMs` is REQUIRED only when `gxp: true`; without it, O=4 (Possible) because long-lived scopes are common in non-GxP configurations | Implement `maxScopeLifetimeMs` voluntarily, or document maximum tolerable permission propagation delay in site risk assessment; equivalent scope expiration controls acceptable |
| FM-20 | Evaluation flooding (DoS via audit trail exhaustion) | 144 (Unacceptable) | `maxEvaluationsPerSecond` and `RateLimitSummaryAuditEntry` are REQUIRED only when `gxp: true`; without them, O=6 D=6 because evaluation flooding is a standard attack vector and detection depends on optional monitoring | Implement rate limiting voluntarily; apply network-layer rate controls (API gateway, WAF); document residual DoS risk in site risk assessment |

---

### Risk Acceptance Criteria

The following criteria govern when a failure mode may be accepted for GxP deployment and what evidence is required at each residual RPN level.

| RPN Range | Classification | Acceptance Criteria | Evidence Required | Authority |
|---|---|---|---|---|
| 1–60 | **Acceptable** | May proceed to deployment without a formal acceptance statement; routine monitoring is sufficient | Annual §64 periodic review report records the failure mode as Acceptable; no separate acceptance documentation required | FMEA Owner |
| 61–99 | **Conditionally Acceptable** | May proceed to deployment ONLY after a formal Risk Acceptance Statement is documented, signed, and archived in the quality management system | Signed Risk Acceptance Statement naming the failure mode, residual RPN, compensating controls, and review cadence; renewed at each annual §64 periodic review | System Owner + QA Reviewer (co-signature required) |
| ≥ 100 | **Unacceptable** | MUST NOT proceed to GxP deployment without: (a) mandatory corrective action reducing residual RPN to < 100, OR (b) site risk assessment documenting equivalent compensating controls demonstrably achieving Conditionally Acceptable or Acceptable residual risk, OR (c) voluntary application of `gxp: true` controls activating the additional mitigations that reduce the RPN below 100 | Corrective action documentation with closed CAPA reference, OR site risk assessment with QA approval and documented control equivalence rationale | System Owner + QA Reviewer + Regulatory Affairs (tri-signature required) |

**Non-GxP Deployments**: Organizations deploying without `gxp: true` MUST document acceptance of FM-19 (stale scope) and FM-20 (evaluation flooding), whose non-GxP residual RPNs are Unacceptable (128 and 144 respectively). The minimum required evidence is a site risk assessment acknowledging the residual risk and committing to equivalent compensating controls.

**Risk Acceptance Statement Template**:

```
Risk Acceptance Statement

Failure Mode:        FM-[NN] — [Description]
Residual RPN:        [N] ([Classification: Conditionally Acceptable])
Compensating
Controls in Place:   [List all compensating controls with references to spec sections]
Review Cadence:      [Annual §64 review / Event-triggered by: ...]

System Owner:        ___________________________ Date: ___________
QA Reviewer:         ___________________________ Date: ___________
```

---

### Assessment Provenance

**Authorship**: This FMEA was authored by HexDI Engineering, the library specification authors. All 36 failure modes (FM-01 through FM-36) were identified through: static analysis of the guard library architecture, review of the specification requirements (§1–§83), STRIDE threat modeling (§68a), OWASP Top 10 mapping, and review of analogous authorization library risk assessments in the pharmaceutical software validation literature.

**Independence**: The initial FMEA (Revision 1.0, 2026-02-13) was authored by the library development team. This represents an internal risk assessment that serves as the library-level template. The **biennial independent review** (scheduled 2028-02-13 per Independent FMEA Review Schedule above) provides the ICH Q9 Section 5 required external verification by a reviewer who was not involved in authoring the FMEA or implementing the mitigations. The deploying organization's site-level FMEA copy — incorporating site-specific failure modes and updated with empirical production data — is the controlled document of record for regulatory purposes. The library-level FMEA is a starting template, not a substitute for site validation.

**Methodology**: Risk Priority Number scoring using the S × O × D formula (Severity × Occurrence × Detectability, scale 1–10 each, maximum RPN = 1000) per:
- **ICH Q9** Quality Risk Management — primary methodology reference for RPN scoring, risk communication, and risk review requirements
- **GAMP 5** (Good Automated Manufacturing Practice), especially Appendix D (software risk classification) and Appendix O (infrastructure controls)
- **FIPS 199** (NIST Standards for Security Categorization) — severity classification reference for information system failure impacts
- **OWASP ASVS** (Application Security Verification Standard) — security threat identification framework for the STRIDE and OWASP Top 10 analyses (§68a)

The Acceptable / Conditionally acceptable / Unacceptable thresholds (1–60 / 61–99 / ≥ 100) are calibrated to the maximum RPN of 1000, placing approximately 6% of the RPN range in the Acceptable band, 3.9% in Conditionally acceptable, and 90.1% in Unacceptable. This conservative calibration reflects the library's role in GxP authorization control.

**Scope**: This FMEA covers library-level failure modes for `@hex-di/guard` specification v0.1.0 (Revision 4.0 of the specification suite). It covers all 36 failure modes with Severity ≥ 7 (Major and Critical). Low-severity operational concerns (S ≤ 6) are documented separately in Appendix M ([Operational Risk Guidance](./appendices/operational-risk-guidance.md)). Site-specific failure modes (infrastructure outages, network partitions, physical security breaches) are consumer deployment responsibilities and are excluded from this library-level analysis.

**Date of Assessment by Revision**:
| Revision | Date | Scope of Changes |
|----------|------|-----------------|
| 1.0 | 2026-02-13 | Initial FMEA — 36 failure modes, FM-01 through FM-36 |
| 1.1 | 2026-02-17 | Extracted from compliance/gxp.md into standalone document (CCR-GUARD-018) |
| 2.0 | 2026-02-20 | RPN normalization to 1–10 scale; all scores ×2, all RPNs ×8; thresholds updated (CCR-GUARD-026) |
| 3.0 | 2026-02-20 | Added Low-risk Justifications, Residual Risk Summary, Assessment Provenance, Review Schedule (CCR-GUARD-028) |
| 4.0 | 2026-02-20 | Added System Context and Risk Acceptance Criteria sections (CCR-GUARD-033) |
| 5.0 | 2026-02-20 | Added Invariant-to-FMEA Cross-Reference table (CCR-GUARD-038) |

---

### Review Schedule

The FMEA MUST be reviewed and updated when any of the following triggers occur. This schedule supplements (and does not replace) the biennial independent review specified in the Independent FMEA Review Schedule section above.

| # | Trigger Category | Specific Trigger | Responsible Party | Maximum Response Timeframe |
|---|-----------------|-----------------|------------------|--------------------------|
| 1 | **New failure mode identified** | A failure mode not covered by FM-01–FM-36 is identified through testing, incident investigation, penetration testing, or threat intelligence | FMEA owner | 30 days from identification |
| 2 | **Mitigation change** | A mitigation listed in the FMEA table is added, removed, or materially modified (e.g., changing a RECOMMENDED control to REQUIRED, or vice versa) | FMEA owner | Before or concurrent with the change; blocked by §64a change control |
| 3 | **Re-validation trigger (§64a)** | Any §64a re-validation trigger fires: major version upgrade, GxP-critical module change, new integration of ClockPort or AuditTrailPort, or site-level production incident | Validation team | As part of the §64a re-validation activity (prior to return to production) |
| 4 | **Penetration testing findings** | Penetration testing (§64f-1) identifies a new attack vector, demonstrates a mitigation gap, or reveals that a claimed detection mechanism is ineffective | Security team | 30 days from pen test report sign-off |
| 5 | **Ecosystem extension package** | A new guard ecosystem extension package (§74 Distributed Evaluation, §75 Framework Middleware, §76 Persistence Adapters, §77 Query Conversion, §78 WASM, etc.) is added to the guard library — its trust boundaries MUST be analyzed for STRIDE threats before GxP deployment | FMEA owner + Security team | Before GxP deployment of the new package |
| 6 | **Regulatory guidance update** | A new or updated FDA, EMA, MHRA, or ICH guidance document is issued that affects the guard library's risk profile (e.g., new electronic signature guidance, updated ALCOA+ interpretation, revised GAMP 5 edition) | Regulatory affairs | 90 days from guidance publication date |
| 7 | **OWASP Top 10 edition** | A new OWASP Top 10 edition is released (per the OWASP Mapping REQUIREMENT above) — the OWASP mapping table and affected FMEA entries MUST be updated | Security team | 90 days from OWASP release |
| 8 | **PQC regulatory acceptance** | Pharmaceutical regulatory bodies (FDA, EMA, MHRA) issue guidance accepting or requiring Post-Quantum Cryptography algorithms for electronic records and signatures (per the PQC note above) | Regulatory affairs | 90 days from guidance publication date |
| 9 | **Production anomaly** | A production anomaly or near-miss implicates a failure mode with an Occurrence or Detectability score that appears inconsistent with observed behavior | Operations + QA | 30 days from anomaly investigation close |
| 10 | **Annual periodic review** | Annual §64 periodic review cycle — FMEA review is a standing agenda item | FMEA owner | Annually, as part of the §64 review report |

All FMEA updates require:
1. A CCR-GUARD-NNN change control reference
2. Document revision increment (Revision N.0 for new failure modes or mitigation changes; Revision N.M for editorial corrections)
3. QA Reviewer sign-off before the updated document becomes effective
4. Updated entries in the Independent FMEA Review Schedule table if the review cadence changes

---


