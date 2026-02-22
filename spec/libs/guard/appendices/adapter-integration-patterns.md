# Appendix H: Reference Adapter Integration Patterns

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-15-H                               |
> | Revision         | 1.0                                      |
> | Effective Date   | 2026-02-15                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Appendix                             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-15): Split from consolidated 15-appendices.md (CCR-GUARD-017) |

_Previous: [Appendix G: Open-Source Supplier Qualification](./supplier-qualification.md) | Next: [Appendix I: Regulatory Inspector Walkthrough Script](./inspector-walkthrough.md)_

---

This appendix provides reference architectures for integrating `@hex-di/guard` with three common persistence backends. Each pattern includes schema design, adapter skeleton, and GxP compliance notes.

### H.1 PostgreSQL with Row-Level Security (RLS)

**Schema:**

```sql
-- Append-only audit trail table with RLS
CREATE TABLE guard_audit_entries (
  evaluation_id    UUID PRIMARY KEY,
  timestamp        TIMESTAMPTZ NOT NULL,
  subject_id       VARCHAR(255) NOT NULL,
  authentication_method VARCHAR(64) NOT NULL,
  policy           VARCHAR(512) NOT NULL,
  decision         VARCHAR(5) NOT NULL CHECK (decision IN ('allow', 'deny')),
  port_name        VARCHAR(128) NOT NULL,
  scope_id         UUID NOT NULL,
  reason           VARCHAR(2048) NOT NULL DEFAULT '',
  duration_ms      NUMERIC NOT NULL,
  schema_version   INTEGER NOT NULL DEFAULT 1,
  -- GxP fields (required when gxp: true)
  trace_digest     TEXT,
  integrity_hash   VARCHAR(128),
  previous_hash    VARCHAR(128),
  hash_algorithm   VARCHAR(32),
  sequence_number  BIGINT,
  policy_snapshot  VARCHAR(64),
  signature_json   JSONB,
  -- Enforce append-only: no UPDATE or DELETE
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for regulatory queries
CREATE INDEX idx_audit_subject_date ON guard_audit_entries (subject_id, timestamp);
CREATE INDEX idx_audit_scope ON guard_audit_entries (scope_id, sequence_number);

-- RLS: only the guard service role can INSERT; no role can UPDATE or DELETE
ALTER TABLE guard_audit_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_insert_only ON guard_audit_entries
  FOR INSERT TO guard_service_role
  WITH CHECK (true);
-- No SELECT policy for guard_service_role; read access via separate audit_reviewer_role
CREATE POLICY audit_read ON guard_audit_entries
  FOR SELECT TO audit_reviewer_role
  USING (true);
```

**Adapter skeleton:**

```typescript
function createPostgresAuditTrailAdapter(pool: Pool): Adapter<typeof AuditTrailPort> {
  return createAdapter(AuditTrailPort, {
    record(entry: AuditEntry): Result<void, AuditTrailWriteError> {
      // INSERT INTO guard_audit_entries ...
      // ON CONFLICT (evaluation_id) DO NOTHING is NOT correct for GxP:
      // a duplicate evaluationId indicates a replay or bug, not a benign retry.
      // Instead: detect the conflict and return Err(AuditTrailWriteError) with
      // message indicating the duplicate evaluationId.
      // Return Ok(undefined) on success, Err(AuditTrailWriteError) on failure
    },
  });
}
```

```
RECOMMENDED: PostgreSQL audit trail adapters SHOULD run
             createAuditTrailConformanceSuite() (13-testing.md) as part of
             adapter OQ evidence. The RLS configuration SHOULD be verified
             during IQ to confirm that UPDATE and DELETE are blocked.
```

### H.2 AWS QLDB (Quantum Ledger Database)

**Table definition:**

```json
{
  "TableName": "GuardAuditEntries",
  "Indexes": [
    { "IndexName": "SubjectDateIndex", "Expression": "[subjectId, timestamp]" },
    { "IndexName": "ScopeIndex", "Expression": "[scopeId, sequenceNumber]" }
  ]
}
```

AWS QLDB provides built-in immutability (append-only journal with cryptographic verification). This eliminates the need for application-level hash chaining, though `@hex-di/guard` hash chains provide an additional layer of defense-in-depth.

**Adapter skeleton:**

```typescript
function createQldbAuditTrailAdapter(driver: QldbDriver): Adapter<typeof AuditTrailPort> {
  return createAdapter(AuditTrailPort, {
    record(entry: AuditEntry): Result<void, AuditTrailWriteError> {
      // driver.executeLambda(txn => txn.execute("INSERT INTO GuardAuditEntries ?", entry))
      // QLDB rejects duplicate document IDs automatically
    },
  });
}
```

```
RECOMMENDED: QLDB adapters SHOULD run createAuditTrailConformanceSuite() as part
             of adapter OQ evidence. QLDB's built-in digest verification SHOULD
             be used alongside @hex-di/guard's verifyAuditChain() for defense-in-depth.
```

### H.3 EventStoreDB

**Stream naming convention:** `guard-audit-{scopeId}`

Each scope maps to a separate stream, aligning with `@hex-di/guard`'s per-scope chain model. EventStoreDB's append-only streams and built-in ordering provide natural alignment with the audit trail contract.

**Adapter skeleton:**

```typescript
function createEventStoreAuditTrailAdapter(
  client: EventStoreDBClient
): Adapter<typeof AuditTrailPort> {
  return createAdapter(AuditTrailPort, {
    record(entry: AuditEntry): Result<void, AuditTrailWriteError> {
      // const streamName = `guard-audit-${entry.scopeId}`;
      // client.appendToStream(streamName, jsonEvent({ type: "AuditEntry", data: entry }))
      // Use expectedRevision for optimistic concurrency control
    },
  });
}
```

```
RECOMMENDED: EventStoreDB adapters SHOULD run createAuditTrailConformanceSuite()
             as part of adapter OQ evidence. EventStoreDB's WAL integration provides
             natural crash recovery, reducing the need for @hex-di/guard's WalStore
             (though WalStore remains REQUIRED when gxp: true per the type system).
```

### HSM Reference Adapter Pattern

The following pattern demonstrates the behavioral contract for a `SignatureServicePort` adapter backed by a Hardware Security Module (HSM):

```typescript
/**
 * HSM-backed SignatureService reference pattern.
 * Demonstrates the behavioral contract for §65c-1 (HSM integration).
 *
 * Key characteristics:
 * - Private keys never leave the HSM boundary
 * - Key ceremony requires dual-person control
 * - Key rotation transitions old keys to verify-only state
 * - HSM unavailability returns Err with "hsm_unavailable" category
 */
interface HsmSignatureServicePattern {
  /** HSM health check — returns Ok if HSM is reachable and responsive. */
  readonly checkHsmHealth: () => Result<{ latencyMs: number }, SignatureError>;

  /** Key ceremony initiation — requires two authorized personnel. */
  readonly initiateKeyCeremony: (
    initiator: GxPAuthSubject,
    witness: GxPAuthSubject
  ) => Result<KeyCeremonyRecord, SignatureError>;

  /** Key rotation — generates new key on HSM, transitions old key to verify-only. */
  readonly rotateSigningKey: (
    ceremony: KeyCeremonyRecord
  ) => Result<KeyRotationAuditEntry, SignatureError>;
}

interface KeyCeremonyRecord {
  readonly _tag: "KeyCeremonyRecord";
  readonly ceremonyId: string;
  readonly initiatorId: string;
  readonly witnessId: string;
  readonly initiatedAt: string;
  readonly purpose: "initial_generation" | "rotation" | "recovery";
}

interface KeyRotationAuditEntry {
  readonly _tag: "KeyRotationAuditEntry";
  readonly previousKeyId: string;
  readonly newKeyId: string;
  readonly rotatedAt: string;
  readonly ceremonyId: string;
}
```

---

_Previous: [Appendix G: Open-Source Supplier Qualification](./supplier-qualification.md) | Next: [Appendix I: Regulatory Inspector Walkthrough Script](./inspector-walkthrough.md)_
