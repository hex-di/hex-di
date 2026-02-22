# Appendix S: Consolidated Error Recovery Runbook

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-15-S                               |
> | Revision         | 1.0                                      |
> | Effective Date   | 2026-02-15                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Appendix                             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-15): Split from consolidated 15-appendices.md (CCR-GUARD-017) |

_Previous: [Appendix R: Operational Log Event Schema](./operational-log-schema.md) | Next: [Appendix T: Implementation Verification Requirements](./implementation-verification.md)_

---

This appendix provides a consolidated operations runbook for all guard-related error conditions. It collects error handling procedures from across the specification into a single reference suitable for GxP operations teams.

### Using This Runbook

1. Identify the error code from the log entry, exception, or alert
2. Locate the error code in the table below
3. Follow the step-by-step recovery procedure
4. Document actions taken per the deviation report template (Appendix K)

### Error Recovery Procedures

#### ACL001 -- AccessDeniedError (S=2, Authorization)

**Trigger:** Policy evaluation denied the subject access.

**Immediate Actions:**

1. Review the `decision.reason` and `decision.trace` fields in the error
2. Verify the subject's current permissions and roles
3. Check if the denial is expected (no action needed) or unexpected

**Escalation:** If repeated for the same subject, investigate whether a permission or role assignment change is required. No incident report unless indicative of a broader access control issue.

**Recovery:** Grant the subject the required permission/role through the normal change control process (section 64a).

---

#### ACL002 -- CircularRoleInheritanceError (S=3, Configuration)

**Trigger:** Role inheritance graph contains a cycle.

**Immediate Actions:**

1. Read the `roleName` field and error message to identify the cycle path
2. Review role definitions in the guard configuration
3. Remove or restructure the circular inheritance

**Escalation:** Configuration review within 4 hours. Block deployment if detected in CI.

**Recovery:** Modify role definitions to break the cycle. Re-run `flattenPermissions()` to confirm resolution.

---

#### ACL003 -- PolicyEvaluationError (S=4, Evaluation)

**Trigger:** Policy evaluation failed due to a runtime error (not a deny decision).

**Immediate Actions:**

1. Check the `cause` field for the underlying error
2. Common causes: missing attribute on resource, matcher threw exception, malformed policy
3. Review the policy definition and evaluation context

**Escalation:** Major incident -- 4-hour notification, 24-hour response initiation.

**Recovery:** Fix the root cause (missing attribute, broken matcher). Redeploy and verify with OQ regression tests.

---

#### ACL008 -- AuditTrailWriteError (S=5, Compliance, CRITICAL)

**Trigger:** Audit trail write failed. If `failOnAuditError: true`, operations are halted.

**Immediate Actions:**

1. **Immediately** investigate the audit trail storage backend (database connectivity, disk space, permissions)
2. Check the `cause` field for the underlying storage error
3. If WAL is enabled, verify WAL storage is operational (entries are buffered)
4. Check completeness monitor for discrepancy count

**Escalation:** Critical incident -- immediate notification, 4-hour response initiation, 24-hour initial report.

**Recovery Steps:**

1. Restore audit trail storage connectivity
2. If WAL was active, trigger WAL replay to recover buffered entries
3. Run `verifyAuditChain()` on affected scopes
4. Verify completeness monitor shows zero discrepancy
5. Document in deviation report (Appendix K)

---

#### ACL009 -- SignatureError (S=4, Compliance)

**Trigger:** Electronic signature operation failed. Check `category` field.

**Recovery by Category:**

| Category            | Immediate Action                             | Recovery                                                     |
| ------------------- | -------------------------------------------- | ------------------------------------------------------------ |
| `capture_failed`    | Check crypto configuration, key availability | Verify HSM connectivity; retry capture                       |
| `validation_failed` | Quarantine affected entry                    | Re-validate with known-good key; investigate tampering       |
| `reauth_failed`     | Log failed attempt; check credentials        | Verify IdP connectivity; reset credentials if needed         |
| `reauth_expired`    | Normal expiry; no incident                   | Request fresh re-authentication                              |
| `key_revoked`       | Expected if key was intentionally revoked    | Use current active key; verify revocation was authorized     |
| `binding_broken`    | **Critical:** signature bound to wrong data  | Quarantine entry; investigate data integrity; FM-07 response |
| `missing_service`   | No SignatureService configured               | Configure SignatureService adapter if signatures required    |

**Escalation:** Major incident for `capture_failed`, `validation_failed`, `binding_broken`. Critical for `binding_broken`.

---

#### ACL010 -- WalError (S=5, CRITICAL)

**Trigger:** Write-ahead log operation failed.

**Immediate Actions:**

1. **Immediately** investigate WAL durable storage (disk, network storage)
2. Check write permissions on WAL storage path
3. Verify WAL file integrity (not corrupted)

**Escalation:** Critical incident -- immediate notification, 4-hour response.

**Recovery Steps:**

1. Restore WAL storage availability
2. Run WAL integrity check
3. If WAL is corrupted, initiate manual recovery per §61 WAL recovery procedure
4. **Do NOT discard WAL entries** -- they may contain unrecovered audit data
5. Document in deviation report

---

#### ACL011 -- ConfigurationError: failOnAuditError (S=4, Configuration)

**Trigger:** `gxp: true` with `failOnAuditError: false`.

**Recovery:** Remove explicit `failOnAuditError: false` from configuration. The default (`true`) is correct for GxP. Block deployment until corrected.

---

#### ACL012 -- ConfigurationError: NoopAuditTrail in GxP (S=5, CRITICAL)

**Trigger:** `NoopAuditTrail` used with `gxp: true`.

**Recovery:** Replace `NoopAuditTrail` with a persistent audit trail adapter (PostgreSQL, EventStoreDB, etc.). This is a compile-time and runtime check -- this error should never reach production.

---

#### ACL013 -- ScopeExpiredError (S=3, Authorization)

**Trigger:** Scope lifetime exceeded `maxScopeLifetimeMs`.

**Recovery:** This is expected behavior. Create a new scope with a fresh subject. Monitor for excessive frequency, which may indicate `maxScopeLifetimeMs` is set too low for the workload.

---

#### ACL014 -- AuditEntryParseError (S=3, Serialization)

**Trigger:** Audit entry deserialization failed.

**Immediate Actions:**

1. Check the `field` and `category` fields
2. Common causes: unknown `schemaVersion`, missing required field, invalid UUID

**Recovery:** Investigate the data source producing malformed entries. May indicate schema version mismatch after a framework upgrade without proper migration.

---

#### ACL015 -- RateLimitExceededError (S=2, Authorization)

**Trigger:** Evaluation rate exceeded `maxEvaluationsPerSecond`.

**Recovery:** Reduce request frequency or increase rate limit. Monitor the source -- high frequency may indicate a DoS attempt. Review `RateLimitSummaryAuditEntry` in the audit trail for patterns.

---

#### ACL016 -- AuditTrailReadError (S=3, Audit Trail)

**Trigger:** Audit trail read/query operation failed.

**Recovery:** Check storage adapter connectivity and read permissions. This does not affect write operations or guard evaluation.

---

#### ACL017 -- AdminOperationDeniedError (S=4, Authorization)

**Trigger:** Administrative operation denied.

**Immediate Actions:**

1. Verify the subject's administrative roles (section 64g)
2. Check if the denial is expected (unauthorized attempt) or unexpected (role misconfiguration)

**Escalation:** Repeated denials may indicate an unauthorized access attempt. Escalate per site security incident procedure.

---

#### ACL018 -- HashChainBreakError (S=5, CRITICAL)

**Trigger:** Hash chain integrity verification failed.

**Immediate Actions:**

1. **Quarantine** the affected scope immediately
2. Identify the specific entry where the chain breaks
3. Compare stored hash with recomputed hash

**Escalation:** Critical -- 1-hour alert, 4-hour quarantine confirmation, 24-hour incident report (per §61.4 SLA).

**Recovery Steps:**

1. Determine root cause (data tampering, concurrent write race, storage corruption)
2. If storage corruption: restore from backup, re-verify chain
3. If tampering suspected: preserve evidence, notify security team, file regulatory report if required
4. Document in deviation report with full forensic analysis

---

#### ACL020 -- HashChainIntegrityError (S=5, GxP, CRITICAL)

**Trigger:** Hash chain recomputation mismatch at write time.

**Recovery:** Same as ACL018 but detected proactively at write time. Halt writes to the affected scope. Follow FM-04 response procedure.

---

#### ACL021 -- ClockDriftViolationError (S=4, GxP)

**Trigger:** Clock drift exceeded GxP tolerance (default 500ms).

**Immediate Actions:**

1. Check NTP infrastructure health
2. Verify NTP server connectivity
3. Suspend GxP writes until drift is resolved

**Recovery:** Restore NTP synchronization. Verify drift is within tolerance. Resume operations.

---

#### ACL022 -- SignatureVerificationError (S=5, GxP, CRITICAL)

**Trigger:** Signature failed cryptographic validation during chain verification.

**Immediate Actions:**

1. **Quarantine** affected entries
2. Investigate potential key compromise (FM-07)
3. Check for algorithm downgrade (FM-08)

**Escalation:** Critical -- immediate key compromise investigation. Revoke compromised key within 1 hour.

**Recovery Steps:**

1. Revoke potentially compromised key
2. Issue new signing key via HSM key ceremony
3. Re-sign affected entries if possible, or document gap
4. File regulatory notification if required

---

#### ACL023 -- WalReplayError (S=5, GxP, CRITICAL)

**Trigger:** WAL replay encountered unrecoverable inconsistency.

**Immediate Actions:**

1. **Do NOT discard WAL entries**
2. Identify the inconsistent intent (evaluationId, scopeId)
3. Manual QA review required

**Recovery:** Follow §61 WAL recovery procedure. Requires manual reconciliation of the inconsistent intent with the audit trail state. Document all recovery actions.

---

#### ACL024 -- CompletenessGapError (S=4, GxP)

**Trigger:** Discrepancy between guard evaluations and audit entries.

**Immediate Actions:**

1. Check completeness monitor output: `resolutions` vs `auditEntries`
2. Review recent audit write failures (ACL008)
3. Check WAL for pending intents

**Escalation:** Follow §61 completeness monitoring escalation (1-minute alert, 1-hour ack, 4-hour investigation, 24-hour report).

**Recovery:** Identify and recover missing entries. If entries are unrecoverable, document the gap in a deviation report.

---

#### ACL025 -- RetentionPolicyViolationError (S=4, GxP)

**Trigger:** Audit entry deleted or made inaccessible before retention period expired.

**Immediate Actions:**

1. Identify the affected entries and their required retention periods
2. Check for unauthorized deletion or storage lifecycle policy misconfiguration
3. Restore from backup if possible

**Recovery:** Restore the entries. Review and correct any automated storage lifecycle policies that may have caused premature deletion. Document in deviation report.

### Incident Classification Quick Reference

| Severity                                     | Notification | Response Initiation | Initial Report | Error Codes                                                    |
| -------------------------------------------- | ------------ | ------------------- | -------------- | -------------------------------------------------------------- |
| **Critical** (patient safety/data integrity) | Immediate    | 4 hours             | 24 hours       | ACL008, ACL010, ACL012, ACL018, ACL020, ACL022, ACL023         |
| **Major** (compliance impact)                | 4 hours      | 24 hours            | 72 hours       | ACL003, ACL009, ACL011, ACL017, ACL021, ACL024, ACL025         |
| **Minor** (operational)                      | 24 hours     | 5 business days     | N/A            | ACL001, ACL002, ACL006, ACL007, ACL013, ACL014, ACL015, ACL016 |

---

_Previous: [Appendix R: Operational Log Event Schema](./operational-log-schema.md) | Next: [Appendix T: Implementation Verification Requirements](./implementation-verification.md)_
