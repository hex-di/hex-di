# 13 - Testing

<!-- Document Control
| Property         | Value                                    |
|------------------|------------------------------------------|
| Document ID      | GUARD-13                                 |
| Revision         | 1.0                                      |
| Effective Date   | 2026-02-13                               |
| Author           | HexDI Engineering                        |
| Reviewer         | GxP Compliance Review                    |
| Approved By      | Technical Lead, Quality Assurance Manager |
| Classification   | GxP Functional Specification             |
| Change History   | 1.0 (2026-02-13): Initial controlled release |
-->

_Previous: [12 - Inspection](./12-inspection.md)_

---

## 45. Memory Adapters

Following the established patterns of `MemoryTracer` and `MemoryLogger`, memory adapters implement the production interface while exposing inspection methods for test assertions. All use the `create*` factory convention.

### createMemoryPolicyEngine

Records all evaluations and provides query methods for assertions.

````typescript
/**
 * In-memory PolicyEngine that records all evaluations.
 *
 * Uses the real evaluate() function internally -- not a mock.
 * Captures inputs and outputs for assertion.
 *
 * @param options - Optional configuration
 * @returns A MemoryPolicyEngine instance
 *
 * @example
 * ```typescript
 * const engine = createMemoryPolicyEngine();
 *
 * engine.evaluate(hasPermission(ReadUsers), adminSubject);
 * engine.evaluate(hasRole(AdminRole), viewerSubject);
 *
 * expect(engine.getEvaluations()).toHaveLength(2);
 * expect(engine.getEvaluationsByKind("deny")).toHaveLength(1);
 *
 * engine.clear();
 * expect(engine.getEvaluations()).toHaveLength(0);
 * ```
 */
function createMemoryPolicyEngine(options?: {
  readonly maxEvaluations?: number;
}): MemoryPolicyEngine;

interface MemoryPolicyEngine {
  /** Evaluates a policy using the real evaluate() function and records the result. */
  evaluate(
    policy: PolicyConstraint,
    subject: AuthSubject,
    resource?: Resource,
    signatures?: ReadonlyArray<ValidatedSignature>
  ): Decision;
  /** Returns all recorded evaluations in chronological order. */
  getEvaluations(): ReadonlyArray<PolicyEvaluation>;
  /** Returns evaluations filtered by kind. */
  getEvaluationsByKind(kind: "allow" | "deny"): ReadonlyArray<PolicyEvaluation>;
  /** Finds the first evaluation matching a predicate. */
  findEvaluation(predicate: (e: PolicyEvaluation) => boolean): PolicyEvaluation | undefined;
  /** Clears all recorded evaluations. */
  clear(): void;
}

interface PolicyEvaluation {
  readonly policy: PolicyConstraint;
  readonly subject: AuthSubject;
  readonly resource: Resource | undefined;
  readonly decision: Decision;
  /** ISO 8601 timestamp of when the evaluation occurred. */
  readonly timestamp: string;
}
````

### createStaticSubjectProvider

Returns a fixed subject regardless of scope. Useful for unit tests that do not need scope isolation:

````typescript
/**
 * Creates a SubjectProvider that always returns the same subject.
 *
 * @param subject - The subject to return
 * @returns A SubjectProvider function
 *
 * @example
 * ```typescript
 * const provider = createStaticSubjectProvider(adminSubject);
 * expect(provider()).toBe(adminSubject);
 * expect(provider()).toBe(adminSubject); // same reference every time
 * ```
 */
function createStaticSubjectProvider(subject: AuthSubject): () => AuthSubject;
````

### createCyclingSubjectProvider

Cycles through subjects on each call. Useful for testing scope isolation where each scope gets a different subject:

````typescript
/**
 * Creates a SubjectProvider that cycles through subjects on each call.
 *
 * @param subjects - The subjects to cycle through
 * @returns A SubjectProvider function
 *
 * @example
 * ```typescript
 * const provider = createCyclingSubjectProvider(viewerSubject, adminSubject);
 * expect(provider().id).toBe("viewer-1");  // first call
 * expect(provider().id).toBe("admin-1");   // second call
 * expect(provider().id).toBe("viewer-1");  // wraps around
 * ```
 */
function createCyclingSubjectProvider(...subjects: ReadonlyArray<AuthSubject>): () => AuthSubject;
````

### createMemoryAuditTrail

Captures all authorization decisions for test assertions. In production, the audit trail would write to a database or log stream.

`MemoryAuditTrail` implements the production `AuditTrail` interface (defined in section 25). This ensures that test assertions exercise the same contract that production code uses.

````typescript
/**
 * In-memory audit trail that captures authorization decisions.
 * Implements the production AuditTrail interface.
 *
 * @warning **GxP Warning:** This adapter stores entries in memory only. Data is
 * lost on process restart. Do NOT use in GxP-regulated production environments.
 * Use a durable AuditTrail adapter that satisfies the persistence and redundancy
 * requirements in 17-gxp-compliance/02-audit-trail-contract.md section 61.
 *
 * @param options - Optional configuration
 * @returns A MemoryAuditTrail instance
 *
 * @example
 * ```typescript
 * const audit = createMemoryAuditTrail();
 * installGuardHook(container, { auditTrail: audit });
 *
 * // After resolutions...
 * const denials = audit.getEntriesByKind("deny");
 * expect(denials).toHaveLength(1);
 * expect(denials[0].subjectId).toBe("viewer-1");
 * ```
 */
function createMemoryAuditTrail(options?: { readonly maxEntries?: number }): MemoryAuditTrail;

interface MemoryAuditTrail extends AuditTrail {
  record(entry: AuditEntry): Result<void, AuditTrailWriteError>;
  getEntries(): ReadonlyArray<AuditEntry>;
  getEntriesBySubject(subjectId: string): ReadonlyArray<AuditEntry>;
  getEntriesByKind(kind: "allow" | "deny"): ReadonlyArray<AuditEntry>;
  getEntriesByPort(portName: string): ReadonlyArray<AuditEntry>;
  findEntry(predicate: (e: AuditEntry) => boolean): AuditEntry | undefined;
  clear(): void;
  /** Validates that every entry has all required fields populated (non-empty strings, valid timestamps). */
  validateAuditEntry(entry: AuditEntry): ReadonlyArray<string>;
  /** Validates a single entry's integrity hash against its predecessor. */
  validateEntry(index: number): boolean;
  /** Validates the entire hash chain from genesis. */
  validateChain(): boolean;
  /** Asserts that all recorded entries pass validation. Throws if any entry has validation errors. */
  assertAllEntriesValid(): void;
  /** Returns entries filtered by predicate. */
  query(predicate: (entry: AuditEntry) => boolean): ReadonlyArray<AuditEntry>;
}
````

> **Note:** `AuditEntry` is the production type defined in section 25 (07-guard-adapter.md). `MemoryAuditTrail` uses the same type to ensure test/production parity. For GxP testing, `MemoryAuditTrail` populates the `integrityHash`, `previousHash`, and `signature` fields on every recorded entry, making entries compatible with `GxPAuditEntry`. This allows GxP adapter tests to validate the full integrity chain without requiring a production-grade audit trail backend.

### createAuditTrailConformanceSuite

A reusable conformance test suite that validates any `AuditTrailPort` adapter against the GxP behavioral contract (17-gxp-compliance/02-audit-trail-contract.md section 61). Adapter authors run this suite as part of their adapter's OQ evidence to prove conformance without re-implementing the same test logic.

````typescript
/**
 * Runs the full AuditTrail conformance suite against a provided adapter factory.
 *
 * This suite validates the five behavioral invariants required by the GxP
 * AuditTrailPort contract (17-gxp-compliance/02-audit-trail-contract.md section 61):
 * 1. Append-only semantics
 * 2. Atomic write guarantee
 * 3. Completeness (no dropped entries)
 * 4. Hash chain integrity
 * 5. No silent defaults
 *
 * @param config.factory - Creates a fresh adapter instance for each test case.
 *   Must return a clean adapter with no pre-existing entries.
 * @param config.durabilityTier - Optional. When "durable", the suite includes
 *   a crash-recovery test that verifies entries survive adapter restart.
 *   When "buffered" or omitted, crash-recovery tests are skipped.
 * @param config.cleanup - Optional. Called after each test case to tear down
 *   adapter resources (e.g., drop test tables, delete temp files).
 *
 * @example
 * ```typescript
 * // In your PostgreSQL adapter's test file:
 * import { createAuditTrailConformanceSuite } from "@hex-di/guard-testing";
 * import { createPostgresAuditTrail } from "./postgres-audit-trail";
 *
 * describe("PostgresAuditTrail conformance", () => {
 *   createAuditTrailConformanceSuite({
 *     factory: () => createPostgresAuditTrail(testPool),
 *     durabilityTier: "durable",
 *     cleanup: async () => { await testPool.query("TRUNCATE audit_entries"); },
 *   });
 * });
 * ```
 */
function createAuditTrailConformanceSuite(config: {
  readonly factory: () => AuditTrail;
  readonly durabilityTier?: "durable" | "buffered";
  readonly cleanup?: () => void | Promise<void>;
}): void;
````

> **Note:** The `cleanup` parameter supports `Promise<void>` for async teardown operations (e.g., database truncation, temp file deletion). The conformance suite test assertions themselves are synchronous, matching the synchronous `AuditTrail.record()` contract. The async cleanup support is for test infrastructure convenience only.

The suite registers the following 17 test cases:

| #   | Test Case                                             | Invariant  | Description                                                                                                                                                                                        |
| --- | ----------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Append-only: record returns Ok                        | §61.1      | `record()` returns `Ok` for a valid entry.                                                                                                                                                         |
| 2   | Append-only: no update/delete                         | §61.1      | The adapter does not expose update or delete operations; a second record with the same `evaluationId` either appends a new entry or is rejected (no overwrite).                                    |
| 3   | Atomic write: partial writes rejected                 | §61.2      | When forced to write an entry with a deliberately oversized field (simulating a write boundary), the adapter either persists the complete entry or returns `Err` — no partial entry is observable. |
| 4   | Completeness: allow entries recorded                  | §61.3      | An "allow" decision entry is persisted and retrievable.                                                                                                                                            |
| 5   | Completeness: deny entries recorded                   | §61.3      | A "deny" decision entry is persisted and retrievable.                                                                                                                                              |
| 6   | Hash chain: genesis entry valid                       | §61.4      | The first entry has `previousHash` set to empty string and `integrityHash` matching the expected SHA-256 computation.                                                                              |
| 7   | Hash chain: subsequent entries chain correctly        | §61.4      | The second entry's `previousHash` matches the first entry's `integrityHash`, and `verifyAuditChain()` passes for both entries.                                                                     |
| 8   | No silent defaults: explicit adapter required         | §61.5      | The adapter does not silently discard entries (distinguishes from `NoopAuditTrail`).                                                                                                               |
| 9   | Concurrent write ordering within scope                | §61.4a     | Multiple concurrent `record()` calls within the same scope produce entries with monotonically increasing `sequenceNumber` and valid hash chain linkage.                                            |
| 10  | Field size limit enforcement                          | §67b OQ-15 | Entries with maximum-length field values (subjectId, portName) are either persisted correctly or rejected with `AuditTrailWriteError` — no truncation without warning.                             |
| 11  | Hash chain verification across 1000+ entries          | §67b OQ-6  | A chain of 1,000 entries validates successfully via `verifyAuditChain()`.                                                                                                                          |
| 12  | Durability tier behavior under simulated crash        | §61.3a     | Durable Ok adapters retain entries after simulated crash; Buffered Ok adapters may lose unflushed entries (WAL recovery is consumer responsibility).                                               |
| 13  | WAL recovery integration for Buffered Ok adapters     | §61        | When `durabilityTier` is "buffered" and a WAL is provided, orphaned pending intents are recovered on startup and reconciled with the audit trail.                                                  |
| 14  | Sequence number monotonicity across concurrent writes | §61.4a     | Across 100 concurrent writes to the same scope, all `sequenceNumber` values are strictly monotonically increasing with no gaps.                                                                    |
| 15  | GxPAuditEntry field completeness validation           | §61.4      | When `gxp: true`, all GxPAuditEntry-required fields (`integrityHash`, `previousHash`, `hashAlgorithm`, `sequenceNumber`, `traceDigest`, `policySnapshot`) are non-empty on every recorded entry.   |
| 16  | Boundary-exact field values                           | §67b OQ-15 | Fields at exactly the maximum length per the field size limits table are persisted successfully (not rejected).                                                                                    |
| 17  | Unicode/multibyte content integrity                   | §67b OQ-15 | CJK, accented, and emoji characters in string fields are persisted without corruption; character count (not byte count) determines field length compliance.                                        |

```
REQUIREMENT: When developing AuditTrailPort adapters for GxP environments, authors
             MUST run the createAuditTrailConformanceSuite() against their adapter
             and include the results as OQ evidence. All 17 test cases MUST pass.
             This conformance suite is the minimum validation requirement; adapter
             authors MAY add additional adapter-specific tests.
             Reference: GAMP 5 Category 5, 21 CFR 11.10(e).
```

```
REQUIREMENT: The createAuditTrailConformanceSuite MUST include the
             createBufferedAuditTrailExample() and createDurableAuditTrailExample()
             reference adapters as built-in test targets. Running the conformance
             suite with no arguments MUST execute against all three adapters:
             MemoryAuditTrail, BufferedAuditTrailExample, and
             DurableAuditTrailExample. This ensures both reference adapters are
             continuously validated against the behavioral contract.
```

```
REQUIREMENT: All three reference adapters (MemoryAuditTrail,
             BufferedAuditTrailExample, DurableAuditTrailExample) MUST pass the
             createAuditTrailConformanceSuite() in CI on every commit. Conformance
             suite failures for any reference adapter MUST block merge. This
             provides continuous validation that the behavioral contract
             (17-gxp-compliance/02-audit-trail-contract.md section 61) is correctly implemented and that
             spec changes do not silently break reference adapter compliance.
             Reference: GAMP 5 Category 5 (continuous validation of reference
             implementations).
```

### createDurableAuditTrailExample

A reference adapter demonstrating the synchronous write-through pattern for durable audit trail implementations. Uses `better-sqlite3` (dev dependency) for SQLite-backed synchronous writes with fsync.

````typescript
/**
 * Reference adapter demonstrating the "Durable Ok" audit trail pattern.
 *
 * Uses SQLite (better-sqlite3) for synchronous, fsync-backed writes.
 * When record() returns Ok, the entry is durably persisted — it survives
 * process crash without WAL assistance.
 *
 * This is a documentation and learning aid, NOT a production adapter.
 * Production durable adapters should use PostgreSQL, EventStoreDB, or
 * equivalent production-grade storage (see Appendix H).
 *
 * @param options - Configuration for the durable adapter
 * @param options.dbPath - Path to the SQLite database file. Default: ":memory:"
 *   for testing. Use a file path for durability demonstration.
 * @returns A DurableAuditTrailExample instance that passes the conformance
 *   suite with durabilityTier: "durable"
 *
 * @example
 * ```typescript
 * import { createDurableAuditTrailExample } from "@hex-di/guard-testing";
 *
 * // File-backed durable adapter
 * const audit = createDurableAuditTrailExample({ dbPath: "./test-audit.db" });
 *
 * // Record an entry — Ok means durably persisted (fsync completed)
 * const result = audit.record(entry);
 * expect(result.isOk()).toBe(true);
 *
 * // Verify hash chain integrity
 * expect(audit.validateChain()).toBe(true);
 *
 * // Run conformance suite
 * createAuditTrailConformanceSuite({
 *   factory: () => createDurableAuditTrailExample({ dbPath: ":memory:" }),
 *   durabilityTier: "durable",
 * });
 * ```
 */
function createDurableAuditTrailExample(options?: {
  /** Path to SQLite database file. Default: ":memory:". */
  readonly dbPath?: string;
}): DurableAuditTrailExample;

interface DurableAuditTrailExample extends AuditTrail {
  /** Records an entry with synchronous fsync-backed write. */
  record(entry: AuditEntry): Result<void, AuditTrailWriteError>;
  /** Returns all persisted entries in insertion order. */
  getEntries(): ReadonlyArray<AuditEntry>;
  /** Validates the entire hash chain from genesis. */
  validateChain(): boolean;
  /** Closes the SQLite database connection. */
  close(): void;
}
````

> **Note:** `better-sqlite3` is a **dev dependency** of `@hex-di/guard-testing`, not a production dependency. It is used solely for the reference adapter. The `DurableAuditTrailExample` demonstrates the ADR #47 field set distinction: the hash chain uses 14 fields (including `previousHash`), while the signature canonical payload uses 13 fields (excluding `previousHash`). On I/O failure (e.g., disk full, permission denied), `record()` returns `Err(AuditTrailWriteError)` with category `storage_unavailable`.

### Production SQLite Adapter: @hex-di/guard-sqlite

A production-ready SQLite-backed audit trail adapter shipped as the separate `@hex-di/guard-sqlite` package. Unlike `createDurableAuditTrailExample()` (which is a learning aid in dev dependencies), `createSqliteAuditTrail()` is designed for production GxP deployments using SQLite as the backing store.

````typescript
/**
 * Production SQLite audit trail adapter for GxP deployments.
 *
 * Differences from createDurableAuditTrailExample():
 * - Schema migrations: versioned migration system for AuditEntry schema evolution
 * - WAL mode: SQLite WAL journal mode for concurrent read/write performance
 * - Connection pooling: configurable pool for multi-scope concurrent access
 * - Capacity monitoring: built-in storage utilization tracking with threshold alerts
 * - GxPAuditEntry support: all GxP integrity fields populated automatically
 *
 * @param options - Production configuration
 * @returns A SqliteAuditTrail instance
 *
 * @example
 * ```typescript
 * import { createSqliteAuditTrail } from "@hex-di/guard-sqlite";
 *
 * const auditTrail = createSqliteAuditTrail({
 *   dbPath: "/var/lib/guard/audit.db",
 *   walMode: true,
 *   maxConnections: 4,
 *   capacityMonitoring: { warningPct: 70, criticalPct: 85, emergencyPct: 95 },
 * });
 * ```
 */
function createSqliteAuditTrail(options: {
  /** Path to SQLite database file. Required for production use. */
  readonly dbPath: string;
  /** Enable SQLite WAL journal mode. Default: true. */
  readonly walMode?: boolean;
  /** Maximum concurrent database connections. Default: 4. */
  readonly maxConnections?: number;
  /** Capacity monitoring thresholds (percentage). */
  readonly capacityMonitoring?: {
    readonly warningPct?: number;
    readonly criticalPct?: number;
    readonly emergencyPct?: number;
  };
}): SqliteAuditTrail;

interface SqliteAuditTrail extends AuditTrail {
  /** Records an entry with synchronous fsync-backed write. Populates GxPAuditEntry fields. */
  record(entry: AuditEntry): Result<void, AuditTrailWriteError>;
  /** Returns all persisted entries in insertion order. */
  getEntries(): ReadonlyArray<AuditEntry>;
  /** Validates the entire hash chain from genesis. */
  validateChain(): boolean;
  /** Returns current storage utilization as a percentage. */
  getStorageUtilization(): number;
  /** Runs pending schema migrations. Returns the number of migrations applied. */
  migrate(): number;
  /** Closes all database connections. */
  close(): void;
}
````

```
REQUIREMENT: The @hex-di/guard-sqlite adapter MUST pass the
             createAuditTrailConformanceSuite() with durabilityTier: "durable".
             Conformance suite results MUST be included as OQ evidence for any
             GxP deployment using this adapter.
             Reference: GAMP 5 Category 5, 21 CFR 11.10(e).
```

```
REQUIREMENT: The @hex-di/guard-sqlite adapter MUST support GxPAuditEntry with
             all integrity fields (integrityHash, previousHash, sequenceNumber,
             traceDigest, policySnapshot, hashAlgorithm). Schema migrations MUST
             preserve existing hash chain integrity — migrated entries MUST
             continue to validate via verifyAuditChain().
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9.
```

> **Note:** `@hex-di/guard-sqlite` is an optional production adapter. Organizations may implement custom `AuditTrailPort` adapters using PostgreSQL, EventStoreDB, or other production-grade storage. Any custom adapter MUST pass the `createAuditTrailConformanceSuite()` and include the results as OQ evidence. The guard-sqlite adapter provides a validated reference for teams that prefer SQLite-based deployments.

### createMemoryWalStore

In-memory WAL store for testing crash recovery scenarios. Unlike a production `WalStore` (which must use durable storage), this implementation uses an in-memory array. The `simulateCrash()` method leaves pending intents in their current state, simulating a process crash between evaluation and audit write.

````typescript
/**
 * In-memory WalStore for testing WAL crash recovery scenarios.
 *
 * Uses an in-memory array — NOT suitable for production use.
 * The simulateCrash() method leaves pending intents unresolved,
 * enabling tests to verify recovery behavior.
 *
 * @returns A MemoryWalStore instance
 *
 * @example
 * ```typescript
 * const walStore = createMemoryWalStore();
 * const auditTrail = createWalAuditTrail(createMemoryAuditTrail(), walStore);
 *
 * // Normal flow: intent is written and completed
 * auditTrail.record(entry);
 * expect(walStore.getPendingIntents().value).toHaveLength(0);
 *
 * // Crash simulation: intent stays pending
 * walStore.simulateCrash();
 * expect(walStore.getPendingIntents().value).toHaveLength(1);
 * ```
 */
function createMemoryWalStore(): MemoryWalStore;

interface MemoryWalStore extends WalStore {
  /** Returns all intents (pending and completed) in chronological order. */
  getAllIntents(): ReadonlyArray<WalIntent>;
  /** Returns pending (non-completed) intents. */
  getPendingIntents(): Result<ReadonlyArray<WalIntent>, WalError>;
  /**
   * Simulates a crash by leaving all current pending intents
   * in their "pending" state. Subsequent writeIntent() calls
   * work normally. Use this to test recovery behavior.
   */
  simulateCrash(): void;
  /** Clears all intents (pending and completed). */
  clear(): void;
}
````

### createMemorySignatureService

In-memory signature service for testing electronic signature workflows. Uses HMAC-SHA256 with ephemeral keys. Tracks all operations for assertions.

````typescript
/**
 * In-memory SignatureService for testing electronic signature workflows.
 *
 * Uses HMAC-SHA256 with ephemeral keys generated at construction time.
 * All operations are recorded and queryable for test assertions.
 *
 * @param options - Optional configuration
 * @returns A MemorySignatureService instance
 *
 * @example
 * ```typescript
 * const sigService = createMemorySignatureService();
 *
 * // Re-authenticate before signing
 * const reauthResult = sigService.reauthenticate({
 *   signerId: "reviewer-1",
 *   credential: "test-password",
 *   method: "password",
 * });
 * expect(reauthResult.isOk()).toBe(true);
 *
 * // Capture a signature
 * const captureResult = sigService.capture({
 *   signerId: "reviewer-1",
 *   meaning: "reviewed",
 *   reauthToken: reauthResult.value,
 *   payload: '{"evaluationId":"abc","decision":"allow"}',
 * });
 * expect(captureResult.isOk()).toBe(true);
 *
 * // Validate the signature
 * const validateResult = sigService.validate(
 *   captureResult.value,
 *   { evaluationId: "abc", decision: "allow" },
 * );
 * expect(validateResult.isOk()).toBe(true);
 * expect(validateResult.value.valid).toBe(true);
 *
 * // Assert on captured operations
 * expect(sigService.getOperations()).toHaveLength(3);
 * expect(sigService.getOperationsByKind("capture")).toHaveLength(1);
 * ```
 */
function createMemorySignatureService(options?: {
  /** Token validity in milliseconds. Default: 300_000 (5 minutes). */
  readonly tokenValidityMs?: number;
  /** Accept any credential for re-authentication. Default: true. */
  readonly acceptAnyCredential?: boolean;
}): MemorySignatureService;

interface MemorySignatureService extends SignatureService {
  /** Returns all recorded operations in chronological order. */
  getOperations(): ReadonlyArray<SignatureOperation>;
  /** Returns operations filtered by kind. */
  getOperationsByKind(
    kind: "capture" | "validate" | "reauthenticate"
  ): ReadonlyArray<SignatureOperation>;
  /** Revokes a signing key, causing subsequent captures to fail and validates to return keyActive: false. */
  revokeKey(keyId: string): void;
  /** Clears all recorded operations and resets state. */
  clear(): void;
}

interface SignatureOperation {
  readonly kind: "capture" | "validate" | "reauthenticate";
  readonly signerId: string;
  readonly timestamp: string;
  readonly success: boolean;
  readonly details: Readonly<Record<string, unknown>>;
}
````

> **Note:** `MemorySignatureService` uses real HMAC-SHA256 via Node.js `crypto` module for signature generation and verification. Keys are ephemeral (generated at construction, lost on `clear()`). This is a real implementation, not a mock -- it validates the same contract that production adapters must satisfy.

> **WARNING:** `createMemorySignatureService` uses HMAC-SHA256, which is a symmetric algorithm. HMAC-SHA256 provides message authentication (integrity and authenticity) but does **not** provide non-repudiation — the same key that creates the signature can also create a forgery. For production GxP environments requiring 21 CFR 11.70 non-repudiation, use an asymmetric algorithm (RSA-SHA256, ECDSA-P256) where the signing key is controlled by the individual signer. `createMemorySignatureService` is suitable for testing workflows and verifying integration correctness, but its HMAC signatures MUST NOT be relied upon for regulatory non-repudiation.

```
RECOMMENDED: OQ-8 (electronic signature round-trip) and OQ-13 (SignatureService failure
             handling) SHOULD be executed against both the memory test adapter
             (`createMemorySignatureService`) and the production SignatureService adapter.
             Organizations SHOULD document which OQ test cases used production adapters
             versus memory adapters in the OQ report. For GxP deployments, at least OQ-8
             and OQ-13 SHOULD include production adapter evidence to demonstrate that the
             production cryptographic implementation (e.g., HSM-backed RSA-SHA256 or
             ECDSA-P256) satisfies the same behavioral contract validated by the memory
             adapter tests. This addresses the GAMP 5 Category 5 requirement for testing
             configured software in its production context.
             Reference: GAMP 5 Category 5, EU GMP Annex 11 §4.6.
```

### createSignatureServiceConformanceSuite

A reusable conformance test suite that validates any `SignatureService` adapter against the behavioral contract (07-guard-adapter.md section 25, 17-gxp-compliance/07-electronic-signatures.md sections 65a-65d). Adapter authors run this suite as part of their adapter's OQ evidence to prove conformance without re-implementing the same test logic.

````typescript
/**
 * Runs the full SignatureService conformance suite against a provided adapter factory.
 *
 * This suite validates the behavioral invariants required by the SignatureService
 * contract (07-guard-adapter.md) and GxP electronic signature requirements
 * (17-gxp-compliance/07-electronic-signatures.md sections 65a-65d):
 * 1. Signature capture and validation round-trip
 * 2. Re-authentication enforcement
 * 3. Key management (revocation, rotation)
 * 4. Separation of duties
 * 5. GxP-specific cryptographic requirements (when gxpMode: true)
 *
 * @param config.factory - Creates a fresh SignatureService instance for each test case.
 *   Must return a clean adapter with no pre-existing state.
 * @param config.testCredential - A valid credential for re-authentication in tests.
 * @param config.testSignerId - Primary signer ID for test cases.
 * @param config.secondSignerId - Secondary signer ID for separation-of-duties tests.
 * @param config.gxpMode - When true, enables the 5 GxP-only test cases that validate
 *   constant-time comparison, key size enforcement, and configuration immutability.
 *   Default: false.
 * @param config.cleanup - Optional. Called after each test case to tear down adapter
 *   resources (e.g., HSM session cleanup, temp key deletion).
 *
 * @example
 * ```typescript
 * // In your HSM-backed adapter's test file:
 * import { createSignatureServiceConformanceSuite } from "@hex-di/guard-testing";
 * import { createHsmSignatureService } from "./hsm-signature-service";
 *
 * describe("HsmSignatureService conformance", () => {
 *   createSignatureServiceConformanceSuite({
 *     factory: () => createHsmSignatureService(testHsmConfig),
 *     testCredential: "test-password-123",
 *     testSignerId: "signer-1",
 *     secondSignerId: "signer-2",
 *     gxpMode: true,
 *     cleanup: async () => { await testHsm.clearTestKeys(); },
 *   });
 * });
 * ```
 */
function createSignatureServiceConformanceSuite(config: {
  readonly factory: () => SignatureService;
  readonly testCredential: string;
  readonly testSignerId: string;
  readonly secondSignerId: string;
  readonly gxpMode?: boolean;
  readonly cleanup?: () => void | Promise<void>;
}): void;
````

The suite registers the following 15 test cases (10 core + 5 GxP-only):

| #   | Test Case                                              | Category | Description                                                                                                                                                                           |
| --- | ------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | capture() returns valid ElectronicSignature            | Core     | `capture()` with valid `ReauthenticationToken` returns `Ok(ElectronicSignature)` with all required fields populated (signerId, signedAt, meaning, value, algorithm, reauthenticated). |
| 2   | capture() rejects expired ReauthenticationToken        | Core     | A `ReauthenticationToken` past its validity window causes `capture()` to return `Err(SignatureError)` with category `reauth_expired`.                                                 |
| 3   | capture() rejects missing ReauthenticationToken        | Core     | Calling `capture()` without a `ReauthenticationToken` returns `Err(SignatureError)` with category `reauth_required`.                                                                  |
| 4   | validate() verifies cryptographic integrity            | Core     | `validate()` on a freshly captured signature returns `{ valid: true, keyActive: true }`.                                                                                              |
| 5   | validate() detects tampered payload (binding broken)   | Core     | Modifying the signed payload after capture causes `validate()` to return `{ valid: false }` with category `binding_broken`.                                                           |
| 6   | validate() detects revoked key                         | Core     | After `revokeKey()`, `validate()` on a previously valid signature returns `{ valid: true, keyActive: false }`.                                                                        |
| 7   | capture() rejects revoked key                          | Core     | After `revokeKey()`, `capture()` returns `Err(SignatureError)` with category `key_revoked`.                                                                                           |
| 8   | reauthenticate() enforces two-component identification | Core     | `reauthenticate()` requires both `signerId` and `credential`; omitting either returns `Err(SignatureError)` with category `reauth_failed`.                                            |
| 9   | reauthenticate() returns time-limited token            | Core     | The returned `ReauthenticationToken` has an expiration timestamp within the configured validity window.                                                                               |
| 10  | Separation of duties: same-signer rejection            | Core     | `capture()` rejects a second signature from the same signer within a single evaluation (same `evaluationId`), returning `Err(SignatureError)` with category `separation_violation`.   |
| 11  | Constant-time signature comparison                     | GxP      | Statistical timing test: `validate()` execution time does not vary measurably between valid and invalid signatures. Mean difference < 5% across 1000 iterations.                      |
| 12  | Constant-time reauth comparison                        | GxP      | Statistical timing test: `reauthenticate()` execution time does not vary measurably between valid and invalid credentials. Mean difference < 5% across 1000 iterations.               |
| 13  | Key size enforcement                                   | GxP      | Adapter construction with below-minimum key sizes (RSA < 2048, ECDSA < P-256, HMAC < 256-bit) is rejected with `ConfigurationError`.                                                  |
| 14  | signerName validation                                  | GxP      | `capture()` rejects signatures where `signerName` is empty or undefined when the adapter is in GxP mode.                                                                              |
| 15  | enforceSeparation cannot be disabled                   | GxP      | Setting `enforceSeparation: false` on a GxP-mode adapter produces `ConfigurationError` at construction.                                                                               |

```
REQUIREMENT: When developing SignatureService adapters for GxP environments, authors
             MUST run the createSignatureServiceConformanceSuite() with gxpMode: true
             against their adapter and include the results as OQ evidence. All 15 test
             cases (10 core + 5 GxP) MUST pass. This conformance suite is the minimum
             validation requirement; adapter authors MAY add additional adapter-specific
             tests for HSM integration, key ceremony procedures, etc.
             Reference: GAMP 5 Category 5, 21 CFR 11.50-11.300.
```

```
REQUIREMENT: The createSignatureServiceConformanceSuite MUST include
             createMemorySignatureService() as a built-in test target. Running the
             conformance suite with no arguments MUST execute all 10 core tests
             against MemorySignatureService. This ensures the reference test adapter
             is continuously validated against the behavioral contract.
             Reference: GAMP 5 Category 5 (continuous validation of reference
             implementations).
```

> **Note on Timing Tests (Tests 11-12):** The constant-time comparison tests use statistical analysis over 1000 iterations to detect timing side channels. The 5% mean difference threshold is a practical heuristic — it balances sensitivity with test stability across different hardware. Organizations running on constrained hardware (e.g., embedded systems) MAY adjust the threshold with documented justification. The test methodology follows the approach described in "A Lesson In Timing Attacks" (Brumley & Boneh, 2003): measure wall-clock time for valid vs invalid inputs, compute the ratio of means, and flag ratios outside [0.95, 1.05]. False positives from system load variability are mitigated by running 1000 iterations and using mean (not individual) comparisons.

### createSubjectProviderConformanceSuite

A reusable conformance test suite that validates any `SubjectProviderPort` adapter against the behavioral contract (06-subject.md). Adapter authors run this suite as part of their adapter's OQ evidence.

```typescript
/**
 * Runs the full SubjectProvider conformance suite against a provided adapter factory.
 *
 * Test cases (12):
 * 1.  getSubject returns an AuthSubject object
 * 2.  Subject has a non-empty id string
 * 3.  Subject has a roles array (readonly string[])
 * 4.  Subject has a permissions ReadonlySet<string>
 * 5.  Subject has an attributes record (Readonly<Record<string, unknown>>)
 * 6.  Subject has an authenticationMethod string
 * 7.  authenticatedAt uses ISO 8601 UTC format (ends with "Z" suffix)
 * 8.  getSubject returns synchronously (not a Promise)
 * 9.  Idempotent within scope: calling getSubject twice returns the same reference
 * 10. Returned subject is frozen (Object.isFrozen returns true)
 * 11. Permissions follow "resource:action" format (every entry contains ":")
 * 12. IdP field mapping accuracy: subject fields match the source identity provider
 *     attributes (validated via a user-provided assertion callback)
 *
 * @param config.factory - Factory function that creates a SubjectProvider instance
 * @param config.expectedSubject - An AuthSubject representing the expected test subject
 * @param config.validateIdpMapping - Optional callback to validate IdP field mapping
 */
function createSubjectProviderConformanceSuite(config: {
  readonly factory: () => SubjectProvider;
  readonly expectedSubject: AuthSubject;
  readonly validateIdpMapping?: (subject: AuthSubject) => void;
}): void;
```

```
REQUIREMENT: All SubjectProviderPort adapter implementations used in GxP environments
             MUST run the createSubjectProviderConformanceSuite as part of their test
             suite. Conformance suite results MUST be included as OQ evidence alongside
             the AuditTrail conformance suite results. For non-GxP environments, running
             the conformance suite is RECOMMENDED but not required.
             Reference: ALCOA+ Attributable (subject provenance).
```

### createAdminGuardConformanceSuite

A reusable conformance test suite that validates administrative guard operations against the behavioral contract defined in 17-gxp-compliance/06-administrative-controls.md sections 64a-64g. This suite validates the `AdminGuardConfig` deny-by-default enforcement, administrative role authorization, policy change control, and separation of duties for administrative operations.

````typescript
/**
 * Runs the full AdminGuard conformance suite against a provided guard graph factory.
 *
 * This suite validates the behavioral invariants required by the administrative
 * controls contract (17-gxp-compliance/06-administrative-controls.md sections 64a-64g):
 * 1. AdminGuardConfig deny-by-default enforcement
 * 2. Administrative role authorization (§64g)
 * 3. Policy change control recording (§64a)
 * 4. Administrative activity monitoring (§64b)
 * 5. Separation of duties for admin operations
 * 6. Emergency bypass procedures (§64h)
 *
 * @param config.factory - Creates a fresh guard graph with AdminGuardConfig for each
 *   test case. Must return a graph with gxp: true and AdminGuardConfig configured.
 * @param config.adminSubject - An AuthSubject with administrative roles for positive tests.
 * @param config.nonAdminSubject - An AuthSubject without administrative roles for negative tests.
 * @param config.secondAdminSubject - A second admin subject for separation-of-duties tests.
 * @param config.auditTrail - A MemoryAuditTrail instance for verifying admin operation recording.
 * @param config.cleanup - Optional. Called after each test case to tear down resources.
 *
 * @example
 * ```typescript
 * import { createAdminGuardConformanceSuite } from "@hex-di/guard-testing";
 *
 * describe("AdminGuard conformance", () => {
 *   createAdminGuardConformanceSuite({
 *     factory: () => createGuardGraph({
 *       gxp: true,
 *       auditTrailAdapter: createMemoryAuditTrail(),
 *       walStore: createMemoryWalStore(),
 *       adminGuard: {
 *         adminRoles: ["guard_admin"],
 *         requireSeparationOfDuties: true,
 *         emergencyBypassEnabled: true,
 *       },
 *     }),
 *     adminSubject: createSubject({ id: "admin-1", roles: ["guard_admin"] }),
 *     nonAdminSubject: createSubject({ id: "viewer-1", roles: ["viewer"] }),
 *     secondAdminSubject: createSubject({ id: "admin-2", roles: ["guard_admin"] }),
 *     auditTrail: createMemoryAuditTrail(),
 *   });
 * });
 * ```
 */
function createAdminGuardConformanceSuite(config: {
  readonly factory: () => GuardGraph;
  readonly adminSubject: AuthSubject;
  readonly nonAdminSubject: AuthSubject;
  readonly secondAdminSubject: AuthSubject;
  readonly auditTrail: MemoryAuditTrail;
  readonly cleanup?: () => void | Promise<void>;
}): void;
````

The suite registers the following 14 test cases:

| #   | Test Case                                                                      | Section | Description                                                                                                                               |
| --- | ------------------------------------------------------------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Deny-by-default: unauthenticated admin operation rejected                      | §64g    | An admin operation without a subject returns ACL017 (AdminOperationDeniedError).                                                          |
| 2   | Deny-by-default: non-admin role rejected                                       | §64g    | A subject without admin roles is denied all admin operations with ACL017.                                                                 |
| 3   | Admin role authorization: valid admin role accepted                            | §64g    | A subject with a configured admin role is allowed administrative operations.                                                              |
| 4   | Policy change recording: change produces PolicyChangeAuditEntry                | §64a    | A policy change via admin operation produces a `PolicyChangeAuditEntry` in the audit trail with all required fields.                      |
| 5   | Policy change separation of duties: same subject cannot propose and approve    | §64a    | A policy change proposed and approved by the same subject is rejected when `requireSeparationOfDuties: true`.                             |
| 6   | Policy change separation of duties: different subjects can propose and approve | §64a    | A policy change proposed by one admin and approved by another succeeds.                                                                   |
| 7   | Administrative activity logging: all admin operations produce log entries      | §64b    | Every administrative operation (policy change, export, key rotation, config change) produces a structured administrative event log entry. |
| 8   | Admin operation audit: allow and deny decisions both recorded                  | §64b    | Both successful and unsuccessful admin operations produce audit trail entries with the admin subject's identity.                          |
| 9   | Emergency bypass: activated with valid admin role                              | §64h    | Emergency bypass can be activated by a subject with admin role when `emergencyBypassEnabled: true`.                                       |
| 10  | Emergency bypass: produces audit entry with emergency flag                     | §64h    | Emergency bypass activation produces an audit entry with an emergency indicator for post-incident review.                                 |
| 11  | Emergency bypass: rejected when disabled                                       | §64h    | Emergency bypass activation is rejected when `emergencyBypassEnabled: false`.                                                             |
| 12  | Admin config immutability: runtime modification rejected                       | §64g    | Attempting to modify `AdminGuardConfig` after graph construction is rejected (frozen object).                                             |
| 13  | Multiple admin roles: subject with any configured admin role is authorized     | §64g    | When `adminRoles` contains multiple roles, a subject with any one of them is authorized for admin operations.                             |
| 14  | Admin operations recorded in hash chain                                        | §64b    | Administrative operation audit entries participate in the hash chain with valid integrityHash and previousHash linkage.                   |

```
REQUIREMENT: When deploying @hex-di/guard with AdminGuardConfig in GxP environments,
             organizations MUST run the createAdminGuardConformanceSuite() against
             their guard graph configuration and include the results as OQ evidence.
             All 14 test cases MUST pass. This conformance suite validates the
             administrative controls required by 21 CFR 11.10(d) (limiting system
             access to authorized individuals), 21 CFR 11.10(g) (authority checks),
             and EU GMP Annex 11 §12 (security).
             Reference: GAMP 5 Category 5, 21 CFR 11.10(d), 21 CFR 11.10(g).
```

```
REQUIREMENT: The createAdminGuardConformanceSuite MUST be included in CI alongside
             the AuditTrail, SignatureService, and SubjectProvider conformance suites.
             Conformance suite failures MUST block merge. This provides continuous
             validation that the administrative controls contract is correctly
             implemented and that spec changes do not silently break admin guard
             compliance.
             Reference: GAMP 5 Category 5 (continuous validation).
```

---

## 46. Custom Matchers

`setupGuardMatchers()` registers custom Vitest matchers for asserting on guard decisions. Follows the `setupResultMatchers` pattern from `@hex-di/result-testing`.

### setupGuardMatchers

````typescript
/**
 * Registers custom Vitest matchers for @hex-di/guard Decision assertions.
 *
 * Call once per test file (typically in a setup file or at the top of the suite).
 *
 * Matchers:
 * - toAllow()          -- asserts kind is "allow"
 * - toDeny()           -- asserts kind is "deny"
 * - toDenyWith(reason) -- asserts kind is "deny" and reason contains substring
 * - toHaveEvaluated(path) -- asserts trace tree contains the given path
 *
 * @example
 * ```typescript
 * import { setupGuardMatchers } from "@hex-di/guard-testing";
 * setupGuardMatchers();
 *
 * expect(decision).toAllow();
 * expect(decision).toDeny();
 * expect(decision).toDenyWith("users:delete");
 * expect(decision).toHaveEvaluated("allOf > hasPermission");
 * ```
 */
function setupGuardMatchers(): void;
````

### Type Augmentation

Full Vitest type augmentation so matchers are type-safe:

```typescript
declare module "vitest" {
  interface Assertion<T> {
    /** Asserts that a Decision kind is "allow". */
    toAllow(): void;
    /** Asserts that a Decision kind is "deny". */
    toDeny(): void;
    /** Asserts that a Decision is "deny" with reason containing the given string. */
    toDenyWith(expectedReason: string): void;
    /** Asserts that the evaluation trace contains a path matching the given description. */
    toHaveEvaluated(path: string): void;
  }
  interface AsymmetricMatchersContaining {
    toAllow(): void;
    toDeny(): void;
    toDenyWith(expectedReason: string): void;
    toHaveEvaluated(path: string): void;
  }
}
```

### Matcher Behavior

#### toAllow

Passes when `decision.kind === "allow"`. On failure, includes the denial reason:

```
expected decision to allow, but it denied: subject 'viewer-1' does not have permission 'user:delete'
```

#### toDeny

Passes when `decision.kind === "deny"`. On failure:

```
expected decision to deny, but it allowed
```

#### toDenyWith

Passes when `decision.kind` is `"deny"` AND `decision.reason` includes the expected substring:

```
expected denial reason to contain "user:delete", but got: "subject 'viewer-1' does not have role 'admin'"
```

#### toHaveEvaluated

Matches against the trace tree using `" > "` as a path separator. Matches against the `kind` field of trace nodes:

```typescript
expect(decision).toHaveEvaluated("allOf > hasPermission");
// Passes if the trace tree contains an allOf node with a hasPermission child
```

On failure, prints the full trace for debugging:

```
expected trace to contain path "allOf > not", but it was not found.
Trace:
  allOf [deny]: all sub-policies must pass
    hasPermission [allow]: user:read
    hasRole [deny]: admin
```

### Usage

```typescript
import { describe, it, expect } from "vitest";
import { hasPermission, hasRole, allOf, not } from "@hex-di/guard";
import { setupGuardMatchers, testPolicy, createTestSubject } from "@hex-di/guard-testing";

setupGuardMatchers();

const AdminRole = createRole({ name: "admin", permissions: [] });
const WriteUsers = createPermission({ resource: "user", action: "write" });

describe("custom matchers", () => {
  it("toAllow passes for allowed decisions", () => {
    const subject = createTestSubject({ permissions: [WriteUsers] });
    const decision = testPolicy(hasPermission(WriteUsers), { subject });
    expect(decision).toAllow();
  });

  it("toDenyWith checks the reason substring", () => {
    const subject = createTestSubject();
    const decision = testPolicy(hasPermission(WriteUsers), { subject });
    expect(decision).toDenyWith("user:write");
  });

  it("toHaveEvaluated checks the trace tree", () => {
    const policy = allOf(hasPermission(WriteUsers), hasRole(AdminRole));
    const subject = createTestSubject({ permissions: [WriteUsers] });
    const decision = testPolicy(policy, { subject });
    expect(decision).toDeny();
    expect(decision).toHaveEvaluated("allOf > hasRole");
  });
});
```

---

## 47. Subject Fixtures

Pre-built subject factories and fixture constants for deterministic, ergonomic test setup.

### createTestSubject

````typescript
/**
 * Creates a test subject with sensible defaults.
 *
 * Accepts arrays (not Sets) for ergonomics. The factory converts
 * arrays to ReadonlySet internally.
 *
 * Default values:
 * - id: "test-subject-{counter}"
 * - roles: []
 * - permissions: Set(0)
 * - attributes: {}
 * - authenticationMethod: "test"
 * - authenticatedAt: "2024-01-01T00:00:00.000Z"
 *
 * @param options - Partial subject properties. Omitted fields get defaults.
 * @returns A frozen AuthSubject instance
 *
 * @example Minimal subject
 * ```typescript
 * const anonymous = createTestSubject();
 * // {
 * //   id: "test-subject-0",
 * //   roles: [],
 * //   permissions: Set(0),
 * //   attributes: {},
 * //   authenticationMethod: "test",
 * //   authenticatedAt: "2024-01-01T00:00:00.000Z",
 * // }
 * ```
 *
 * @example Admin with permissions
 * ```typescript
 * const admin = createTestSubject({
 *   id: "admin-1",
 *   roles: [AdminRole],
 *   permissions: [ReadUsers, WriteUsers, DeleteUsers],
 *   attributes: { department: "engineering" },
 *   authenticationMethod: "mfa",
 *   authenticatedAt: "2024-06-15T09:00:00.000Z",
 * });
 * ```
 */
function createTestSubject(options?: TestSubjectOptions): AuthSubject;

interface TestSubjectOptions {
  readonly id?: string;
  readonly roles?: ReadonlyArray<RoleConstraint>;
  readonly permissions?: ReadonlyArray<PermissionConstraint>;
  readonly attributes?: Record<string, unknown>;
  /** How the test subject authenticated. Default: "test". */
  readonly authenticationMethod?: string;
  /** ISO 8601 timestamp of authentication. Default: "2024-01-01T00:00:00.000Z". */
  readonly authenticatedAt?: string;
}
````

### resetSubjectCounter

````typescript
/**
 * Resets the subject counter for deterministic IDs.
 * Call in beforeEach/afterEach.
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   resetSubjectCounter();
 * });
 *
 * it("produces predictable IDs", () => {
 *   const a = createTestSubject();
 *   expect(a.id).toBe("test-subject-0");
 * });
 * ```
 */
function resetSubjectCounter(): void;
````

### Pre-built Fixtures

Export named constants for common test personas:

```typescript
import { createPermissionGroup, createRole, createTestSubject } from "@hex-di/guard";

// -- Permissions --
const UserPerms = createPermissionGroup("user", ["read", "write", "delete"]);
const ReportPerms = createPermissionGroup("report", ["read"]);
const SettingsPerms = createPermissionGroup("settings", ["manage"]);

// -- Roles --
const ViewerRole = createRole({
  name: "viewer",
  permissions: [UserPerms.read, ReportPerms.read],
});
const EditorRole = createRole({
  name: "editor",
  permissions: [UserPerms.write],
  inherits: [ViewerRole],
});
const AdminRole = createRole({
  name: "admin",
  permissions: [UserPerms.delete, SettingsPerms.manage],
  inherits: [EditorRole],
});

// -- Subjects --
const anonymousSubject = createTestSubject({
  id: "anon",
  authenticationMethod: "anonymous",
  authenticatedAt: "2024-01-01T00:00:00.000Z",
});

const viewerSubject = createTestSubject({
  id: "viewer-1",
  roles: [ViewerRole],
  permissions: [UserPerms.read, ReportPerms.read],
  authenticationMethod: "password",
  authenticatedAt: "2024-01-15T08:00:00.000Z",
});

const editorSubject = createTestSubject({
  id: "editor-1",
  roles: [EditorRole],
  permissions: [UserPerms.read, ReportPerms.read, UserPerms.write],
  authenticationMethod: "password",
  authenticatedAt: "2024-01-15T08:00:00.000Z",
});

const adminSubject = createTestSubject({
  id: "admin-1",
  roles: [AdminRole],
  permissions: [
    UserPerms.read,
    ReportPerms.read,
    UserPerms.write,
    UserPerms.delete,
    SettingsPerms.manage,
  ],
  attributes: { department: "engineering" },
  authenticationMethod: "mfa",
  authenticatedAt: "2024-01-15T08:00:00.000Z",
});
```

---

## 48. testPolicy and testGuard

Pure evaluation utilities for testing policies and guard metadata in isolation -- no container, no scope, no mocks.

### testPolicy

````typescript
/**
 * Evaluates a single policy against a subject in complete isolation.
 *
 * No container or scope required. Calls the same evaluate() function
 * that the production PolicyEngine uses.
 *
 * @param policy - The policy to evaluate
 * @param options - Subject and optional resource context
 * @returns The evaluation Decision
 *
 * @example
 * ```typescript
 * const canEdit = allOf(
 *   hasPermission(UserPerms.write),
 *   hasAttribute("ownerId", eq(subject("id"))),
 * );
 *
 * const decision = testPolicy(canEdit, {
 *   subject: editorSubject,
 *   resource: { type: "user", id: "u-42", ownerId: "editor-1" },
 * });
 *
 * expect(decision).toAllow();
 * ```
 */
function testPolicy(
  policy: PolicyConstraint,
  options: {
    readonly subject: AuthSubject;
    readonly resource?: Resource;
    readonly signatures?: ReadonlyArray<ValidatedSignature>;
  }
): Decision;
````

### testGuard

````typescript
/**
 * Tests a guard adapter's authorization decision without a container.
 *
 * Resolves the effective policy for the given method (falling back to
 * the adapter-level policy), evaluates it against the subject, and
 * returns the Decision.
 *
 * @param guardMeta - The guard metadata (policy + optional method policies)
 * @param options - Subject, method, optional resource context
 * @returns The evaluation Decision
 *
 * @example Adapter-level policy
 * ```typescript
 * const meta = { policy: hasRole(AdminRole) };
 * const decision = testGuard(meta, { subject: viewerSubject });
 * expect(decision).toDeny();
 * ```
 *
 * @example Method-level policy
 * ```typescript
 * const meta = {
 *   policy: hasPermission(UserPerms.read),
 *   methodPolicies: {
 *     delete: hasRole(AdminRole),
 *   },
 * };
 * const decision = testGuard(meta, { subject: viewerSubject, method: "delete" });
 * expect(decision).toDenyWith("admin");
 * ```
 */
function testGuard<T>(
  guardMeta: {
    readonly policy: PolicyConstraint;
    readonly methodPolicies?: MethodPolicyMap<keyof T & string>;
  },
  options: {
    readonly subject: AuthSubject;
    readonly method?: keyof T & string;
    readonly resource?: Resource;
    readonly signatures?: ReadonlyArray<ValidatedSignature>;
  }
): Decision;
````

### Key Property

Both utilities use the **real** `evaluate()` function. They are not mocks. The only simplification is constructing the evaluation context automatically from the options:

```typescript
// testPolicy implementation sketch
function testPolicy(policy, options) {
  return evaluate(policy, {
    subject: options.subject,
    resource: options.resource ?? { type: "unknown", id: "unknown" },
    signatures: options.signatures,
  });
}

// testGuard implementation sketch
function testGuard(guardMeta, options) {
  const method = options.method;
  let effectivePolicy = guardMeta.policy;

  if (method !== undefined && guardMeta.methodPolicies !== undefined) {
    const methodPolicy = guardMeta.methodPolicies[method];
    if (methodPolicy !== undefined) {
      effectivePolicy = methodPolicy;
    }
  }

  return evaluate(effectivePolicy, {
    subject: options.subject,
    resource: options.resource ?? { type: "unknown", id: "unknown" },
    signatures: options.signatures,
  });
}
```

---

## 49. Anti-Patterns

Nine documented anti-patterns for guard testing, each with the harmful pattern, the correct alternative, and the rationale.

### 49.1 Global Subject Mutation

```typescript
// BAD: Mutable global subject
let currentSubject = adminSubject;
beforeEach(() => {
  currentSubject = viewerSubject;
});

// GOOD: Per-test subject via factory
it("viewer cannot delete", () => {
  const decision = testPolicy(deletePolicy, { subject: viewerSubject });
  expect(decision).toDeny();
});
```

**Why:** Global mutable state causes test order dependencies. The `testPolicy` function's explicit `subject` parameter eliminates this class of bugs.

### 49.2 Testing Policy Logic Through the Container

```typescript
// BAD: Full container setup to test a policy rule
const graph = GraphBuilder.create().provide(guardedAdapter).provide(subjectAdapter).build();
const container = createContainer({ graph, name: "Test" });
const result = scope.tryResolve(UserRepoPort);
expect(result.isErr()).toBe(true);

// GOOD: Direct policy evaluation
const decision = testPolicy(deletePolicy, { subject: viewerSubject });
expect(decision).toDeny();
```

**Why:** Unit testing a policy should not require building a graph and creating a container. Use `testPolicy` for unit tests; reserve container tests for integration suites.

### 49.3 Mocking the Evaluate Function

```typescript
// BAD: Mocking evaluate
vi.mock("@hex-di/guard", () => ({
  evaluate: vi.fn().mockReturnValue({ kind: "allow", reason: "", trace: [] }),
}));

// GOOD: Use real evaluation with controlled inputs
const decision = testPolicy(policy, { subject: adminSubject });
expect(decision).toAllow();
```

**Why:** Mocking `evaluate` destroys the test's value. The point is to verify that the policy data structure produces correct decisions.

### 49.4 String-Based Permission Checks

```typescript
// BAD: Checking permissions by string name
expect(subject.permissions.has("users:delete")).toBe(true);

// GOOD: Checking permissions by branded token
expect(subject.permissions.has(DeleteUsers)).toBe(true);
```

**Why:** String-based checks bypass branding. A typo silently passes with an unhelpful error message.

### 49.5 Asserting on Decision Internals

```typescript
// BAD: Reaching into decision internals
expect(decision.kind).toBe("deny");
expect(decision.reason).toContain("users:delete");

// GOOD: Using custom matchers
expect(decision).toDeny();
expect(decision).toDenyWith("users:delete");
```

**Why:** Custom matchers provide better error messages on failure.

### 49.6 Module-Scope Mutable State

```typescript
// BAD: Shared engine across describe blocks
const engine = createMemoryPolicyEngine();

describe("suite A", () => {
  it("test 1", () => {
    engine.evaluate(policy, subject);
  });
});
describe("suite B", () => {
  it("test 2", () => {
    expect(engine.getEvaluations()).toHaveLength(0); // FAILS
  });
});

// GOOD: Fresh engine per test
let engine: ReturnType<typeof createMemoryPolicyEngine>;
beforeEach(() => {
  engine = createMemoryPolicyEngine();
});
```

**Why:** Memory adapters accumulate state. Without clearing between tests, assertions depend on execution order.

### 49.7 vi.mock on Guard React Components

```typescript
// BAD: Mocking Can/Cannot
vi.mock("@hex-di/guard/react", () => ({
  Can: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// GOOD: Provide subject and let real components evaluate
const wrapper = createTestGuardWrapper({ subject: adminSubject });
render(<Can permission={WriteUsers}>Edit</Can>, { wrapper });
```

**Why:** Mocking the component under test means you are no longer testing it.

### 49.8 Not Testing Denial Reasons

```typescript
// BAD: Only checking verdict
expect(decision).toDeny();

// GOOD: Also verifying the reason is actionable
expect(decision).toDeny();
expect(decision).toDenyWith("users:delete");
```

**Why:** Testing that the reason contains relevant information ensures production error messages are useful for debugging.

### 49.9 Exhaustive Permission Enumeration

```typescript
// BAD: Manually checking every inherited permission
expect(admin.permissions.has(ReadUsers)).toBe(true);
expect(admin.permissions.has(WriteUsers)).toBe(true);
expect(admin.permissions.has(DeleteUsers)).toBe(true);
// ... 20 more lines

// GOOD: Test role resolution, then test policies against subjects
const allPerms = flattenPermissions(AdminRole);
expect(allPerms).toContain(ReadUsers);
expect(allPerms).toContain(DeleteUsers);

const decision = testPolicy(hasRole(AdminRole), { subject: adminSubject });
expect(decision).toAllow();
```

**Why:** Enumerating permissions by hand is fragile and duplicates the role definition. Test `flattenPermissions` once, then test policies against subjects.

---

## 50. Policy Change Testing Utilities

When authorization policies change (e.g., adding a new permission requirement, modifying role mappings, or restructuring composite policies), teams need visibility into how the change affects authorization decisions across subjects. The `createPolicyDiffReport()` utility compares old and new policies against a set of test subjects and produces a structured diff report.

```
REQUIREMENT: In GxP environments, createPolicyDiffReport() MUST be run before
             deploying any policy change to production. The diff report provides the
             mandatory impact analysis evidence required by the policy change control
             process (17-gxp-compliance/06-administrative-controls.md section 64a). The report MUST be reviewed
             and approved by a second individual before deployment proceeds. For
             non-GxP environments, running the diff report is RECOMMENDED.
             Reference: EU GMP Annex 11 §10, 21 CFR 11.10(k)(2).
```

### createPolicyDiffReport

````typescript
/**
 * Compares two policies across a set of test subjects and reports
 * which subjects gain or lose access.
 *
 * @param config - The old policy, new policy, and test subjects
 * @returns A PolicyDiffReport with per-subject verdicts
 *
 * @example
 * ```typescript
 * const report = createPolicyDiffReport({
 *   oldPolicy: hasPermission(UserPerms.read),
 *   newPolicy: allOf(hasPermission(UserPerms.read), hasRole(EditorRole)),
 *   subjects: [viewerSubject, editorSubject, adminSubject],
 * });
 *
 * // Subjects who lost access:
 * const revoked = report.entries.filter(e => e.change === "revoked");
 * expect(revoked).toHaveLength(1);
 * expect(revoked[0].subjectId).toBe("viewer-1");
 * ```
 */
function createPolicyDiffReport(config: {
  readonly oldPolicy: PolicyConstraint;
  readonly newPolicy: PolicyConstraint;
  readonly subjects: ReadonlyArray<AuthSubject>;
  readonly resource?: Resource;
}): PolicyDiffReport;

/**
 * Structured report of policy change impact.
 */
interface PolicyDiffReport {
  /** Per-subject diff entries. */
  readonly entries: ReadonlyArray<PolicyDiffEntry>;
  /** Summary counts. */
  readonly summary: {
    readonly unchanged: number;
    readonly granted: number;
    readonly revoked: number;
    readonly total: number;
  };
}

/**
 * A single entry in the policy diff report.
 */
interface PolicyDiffEntry {
  readonly subjectId: string;
  /** "unchanged" = same verdict, "granted" = deny→allow, "revoked" = allow→deny. */
  readonly change: "unchanged" | "granted" | "revoked";
  readonly oldDecision: "allow" | "deny";
  readonly newDecision: "allow" | "deny";
  readonly oldReason: string;
  readonly newReason: string;
}
````

### createTestPolicyChangeAuditEntry

Test helper for constructing `PolicyChangeAuditEntry` instances with sensible defaults. Useful for testing policy change audit recording, hash chain participation, and separation-of-duties validation.

````typescript
/**
 * Creates a PolicyChangeAuditEntry with sensible defaults for testing.
 *
 * All fields have deterministic defaults suitable for unit tests.
 * Override any field via the options parameter.
 *
 * @param options - Partial PolicyChangeAuditEntry fields. Omitted fields get defaults.
 * @returns A frozen PolicyChangeAuditEntry instance
 *
 * @example
 * ```typescript
 * import { createTestPolicyChangeAuditEntry } from "@hex-di/guard-testing";
 *
 * // Minimal — all defaults
 * const entry = createTestPolicyChangeAuditEntry();
 * expect(entry._tag).toBe("PolicyChangeAuditEntry");
 * expect(entry.actorId).not.toBe(entry.approverId); // separation of duties
 *
 * // Custom overrides
 * const custom = createTestPolicyChangeAuditEntry({
 *   portName: "UserRepoPort",
 *   reason: "Added MFA requirement for admin operations",
 *   changeRequestId: "CR-2024-042",
 * });
 * ```
 */
function createTestPolicyChangeAuditEntry(options?: {
  readonly changeId?: string;
  readonly timestamp?: string;
  readonly actorId?: string;
  readonly portName?: string;
  readonly previousPolicyHash?: string;
  readonly newPolicyHash?: string;
  readonly reason?: string;
  readonly applied?: boolean;
  readonly changeRequestId?: string;
  readonly approverId?: string;
  readonly approvedAt?: string;
  readonly previousPolicySerialized?: string;
  readonly newPolicySerialized?: string;
}): PolicyChangeAuditEntry;
````

> **Note:** Default values: `changeId` = `"test-change-0"` (incrementing counter), `timestamp` = `"2024-01-01T00:00:00.000Z"`, `actorId` = `"test-actor"`, `portName` = `"*"`, `previousPolicyHash` / `newPolicyHash` = deterministic SHA-256 hashes, `reason` = `"Test policy change"`, `applied` = `true`, `changeRequestId` = `"CR-TEST-001"`, `approverId` = `"test-approver"` (distinct from `actorId` to satisfy separation of duties), `approvedAt` = `"2024-01-01T00:00:00.000Z"`. The `previousPolicySerialized` and `newPolicySerialized` fields are omitted by default.

---

## 51. Test Data Management for GxP

In GxP-regulated environments, test data requires careful management to prevent contamination of production audit trails and to ensure that test evidence is reproducible.

```
REQUIREMENT: Test datasets MUST NOT contain production data (real patient identifiers,
             real user credentials, real audit entries). All test subjects MUST be
             created using createTestSubject() (section 47) or equivalent synthetic
             data factories. Using production data in test environments risks GDPR
             violations and audit trail contamination.
             Reference: GDPR Article 5(1)(b) (purpose limitation), GAMP 5 Appendix D4.

REQUIREMENT: Test audit entries MUST be distinguishable from production audit entries.
             Implementations MUST use one of the following strategies: (a) a dedicated
             test scopeId prefix (e.g., "test-scope-*") that is excluded from production
             audit trail queries, or (b) a separate test partition/table/database that
             is physically isolated from the production audit trail. The chosen strategy
             MUST be documented in the validation plan (17-gxp-compliance/09-validation-plan.md section 67).
             Reference: GAMP 5 Appendix D4.
```

```
RECOMMENDED: Test data sets used for Operational Qualification (OQ) and Performance
             Qualification (PQ) SHOULD be version-controlled alongside the test suite.
             Each OQ/PQ execution report SHOULD reference the git SHA of the test data
             set used, enabling reproducibility and traceability. This supports the
             ALCOA+ "Original" and "Enduring" principles for test evidence.

RECOMMENDED: Organizations SHOULD establish a test data governance policy that defines:
             (a) prohibited data categories (real PII, real credentials, production
             identifiers), (b) approved synthetic data generators (createTestSubject,
             createMemoryAuditTrail, createMemorySignatureService), (c) sanitization
             procedures for any data derived from production systems, and (d) retention
             policies for test data and test audit trails. The policy SHOULD be reviewed
             annually and referenced in the validation plan.
             Reference: GDPR Article 5(1)(b), GAMP 5 Appendix D4, HIPAA Safe Harbor
             (45 CFR §164.514(b)).
```

```
RECOMMENDED: @hex-di/guard-testing SHOULD provide a createPqTestDataset() utility
             for generating realistic PQ test data with the following
             characteristics:

             (a) Zipf distribution: Subject access patterns SHOULD follow a Zipf
                 distribution where a small number of subjects generate the
                 majority of evaluations, simulating real-world access patterns.
             (b) Configurable dimensions: The utility SHOULD accept configuration
                 for scope count (default: 10), subject count (default: 50),
                 and port count (default: 20).
             (c) Valid hash chains: Generated entries MUST form valid hash chains
                 per scope (verifyAuditChain() MUST pass on the generated data).
             (d) Mixed decisions: The dataset SHOULD include both allow and deny
                 decisions in a configurable ratio (default: 80% allow, 20% deny).
             (e) Deterministic: Given the same seed, the utility MUST produce
                 identical output for reproducible PQ runs.

             Reference: GAMP 5 Category 5 (testing requirements).
```

---

## 52. Security Test Plan

This section defines adversarial security test scenarios for `@hex-di/guard`. These tests go beyond functional correctness to validate resilience against intentional misuse and attack patterns.

### 52.1 Race Condition Tests

| #   | Scenario                                                                                  | Expected Behavior                                                                                                                |
| --- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Concurrent evaluation + subject mutation: start evaluation, mutate subject mid-evaluation | Subject is frozen at scope creation (ADR #9); mutation throws TypeError in strict mode; evaluation uses original subject         |
| 2   | TOCTOU on permission set: resolve subject, revoke permission, evaluate policy             | Subject's precomputed permission set is immutable (O(1) Set.has()); revocation only takes effect in new scopes                   |
| 3   | Concurrent audit writes to same scope: 10 parallel evaluations in one scope               | Per-scope serialization ensures monotonic sequenceNumber; all 10 entries have consecutive sequence numbers; hash chain validates |

### 52.2 Replay Attack Tests

| #   | Scenario                                                                                | Expected Behavior                                                                                                                |
| --- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 4   | ReauthenticationToken replay: reuse a consumed token for a second signature capture     | Token is one-time-use; second capture returns Err(SignatureError) with category "reauth_expired"                                 |
| 5   | AuditEntry replay: insert a duplicate audit entry (same evaluationId) into the trail    | Adapter detects duplicate evaluationId; returns Err(AuditTrailWriteError); hash chain remains intact                             |
| 6   | Signature replay: copy a valid signature from one entry and attach to a different entry | validate() checks binding integrity (signature is bound to specific data); returns { valid: false } with binding_broken category |

### 52.3 DI Manipulation Tests

| #   | Scenario                                                                                           | Expected Behavior                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7   | Rogue adapter: register an adapter that provides SubjectProviderPort with an always-admin subject  | guard() evaluates the subject as provided; audit entry records the rogue subject's attributes; detection relies on audit trail review (ALCOA+ Attributable) |
| 8   | NoopAuditTrail swap: replace a real audit trail adapter with NoopAuditTrail at runtime in GxP mode | createGuardGraph({ gxp: true }) rejects NoopAuditTrail at type level (ACL012) and runtime; swap requires container rebuild which triggers checkGxPReadiness |
| 9   | Guard bypass via direct port resolution: resolve a guarded port's inner adapter directly           | guard() wraps at the adapter level; the inner adapter is not registered separately; resolution always goes through the guard wrapper                        |

### 52.4 Input Validation Tests

| #   | Scenario                                                                               | Expected Behavior                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10  | Oversized subjectId (>255 chars)                                                       | AuditTrail.record() returns Err(AuditTrailWriteError) per field size limits (07-guard-adapter.md)                                                       |
| 11  | Unicode normalization attack: subjectId with NFC vs NFD encoding of same visual string | Subjects with different byte representations of the same visual string are treated as different subjects; audit entries record the exact bytes received |
| 12  | Deeply nested policy (1000 levels of allOf/anyOf)                                      | evaluate() handles recursion up to documented depth limit; returns PolicyEvaluationError if limit exceeded (OQ-12)                                      |

### 52.5 Penetration Testing Guidance

```
RECOMMENDED: Organizations deploying @hex-di/guard in GxP environments SHOULD
             conduct annual penetration testing of the guard integration. The
             penetration test scope SHOULD include:
             (1) Attempting to bypass guard() via direct container resolution
             (2) Attempting to forge or replay electronic signatures
             (3) Attempting to tamper with audit trail entries and verifying
                 hash chain detection
             (4) Attempting to exploit race conditions in concurrent evaluations
             (5) Attempting to escalate privileges via subject attribute manipulation
             Penetration test results SHOULD be documented and included in the
             periodic review report (17-gxp-compliance/05-audit-trail-review.md section 64).
             Reference: GAMP 5 Appendix M3, NIST SP 800-53 CA-8.
```

### Security Test Summary

| Category                    | Scenarios     | Test Count |
| --------------------------- | ------------- | ---------- |
| Race Conditions (§52.1)     | 3             | 3          |
| Replay Attacks (§52.2)      | 3             | 3          |
| DI Manipulation (§52.3)     | 3             | 3          |
| Input Validation (§52.4)    | 3             | 3          |
| Penetration Testing (§52.5) | Guidance only | 0 (manual) |
| **Total**                   | **12**        | **12**     |

> **Note:** The 12 automated security test scenarios above are in addition to the functional test suite. They target adversarial behaviors that the functional tests do not cover. The 3 penetration testing recommendations are manual activities outside the automated test suite.

---

_Previous: [12 - Inspection](./12-inspection.md) | Next: [14 - API Reference](./14-api-reference.md)_
