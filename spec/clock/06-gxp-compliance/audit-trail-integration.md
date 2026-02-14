# Audit Trail Integration

## 6.6 Audit Trail Integration

### TemporalContext -- Standardized Audit Timestamp Type

To ensure all audit-producing consumers use a consistent structure for temporal data, `@hex-di/clock` defines a `TemporalContext` interface and a factory function for creating instances:

```typescript
interface TemporalContext {
  readonly sequenceNumber: number;
  readonly monotonicTimestamp: number;
  readonly wallClockTimestamp: number;
}

interface TemporalContextFactory {
  readonly create: () => Result<TemporalContext, SequenceOverflowError>;
  readonly createOverflowContext: () => OverflowTemporalContext;
}
```

**Note:** `TemporalContextFactory` is a utility function (`createTemporalContextFactory()`), not a port. It is created by composing `ClockPort` and `SequenceGeneratorPort` — consumers call `createTemporalContextFactory(clock, seq)` after resolving the two ports from the container.

The `create()` method returns `Result<TemporalContext, SequenceOverflowError>` — `ok()` with a frozen `TemporalContext` on success, or `err(SequenceOverflowError)` when the sequence generator has overflowed.

```typescript
function createTemporalContextFactory(
  clock: ClockPort,
  seq: SequenceGeneratorPort
): TemporalContextFactory {
  return Object.freeze({
    create: () => {
      const seqResult = seq.next();
      if (seqResult.isErr()) {
        return err(seqResult.error);
      }
      return ok(
        Object.freeze({
          sequenceNumber: seqResult.value,
          monotonicTimestamp: clock.monotonicNow(),
          wallClockTimestamp: clock.wallClockNow(),
        })
      );
    },
    createOverflowContext: () => {
      /* see Emergency Overflow Context below */
    },
  });
}
```

REQUIREMENT: The `TemporalContext` object returned by `create()` MUST be frozen with `Object.freeze()`.

**Tamper-evidence boundary:** `Object.freeze()` prevents JavaScript-runtime mutation of `TemporalContext` objects (property reassignment, property addition/deletion). For cryptographic tamper-evidence, `@hex-di/clock` provides per-record integrity via `computeTemporalContextDigest()` (see "Self-Contained Record Integrity" below), and `@hex-di/guard` provides cross-record chain integrity via SHA-256 hash chains (guard spec section 61). Both layers complement each other: the clock library detects tampering of individual records; the guard detects record insertion, deletion, or reordering within the chain. GxP deployments MUST use both (see "Audit Trail Guarantees by Deployment Mode").

### Self-Contained Record Integrity (21 CFR 11.10(c), ALCOA+ Original)

To enable tamper detection of individual `TemporalContext` records without requiring `@hex-di/guard`, `@hex-di/clock` provides cryptographic digest utilities that compute and verify SHA-256 hashes of temporal context records.

```typescript
interface TemporalContextDigest {
  readonly _tag: "TemporalContextDigest";
  readonly algorithm: "SHA-256";
  readonly digest: string; // Hex-encoded SHA-256 hash
  readonly canonicalInput: string; // The canonical JSON string that was hashed
}

function computeTemporalContextDigest(ctx: TemporalContext): TemporalContextDigest;

function computeOverflowTemporalContextDigest(ctx: OverflowTemporalContext): TemporalContextDigest;

function verifyTemporalContextDigest(
  ctx: TemporalContext | OverflowTemporalContext,
  digest: TemporalContextDigest
): boolean;
```

**Behavioral contract:**

1. `computeTemporalContextDigest()` produces a SHA-256 hash of the canonical JSON serialization of the `TemporalContext` fields. The canonical form is defined as: `JSON.stringify({ monotonicTimestamp: ctx.monotonicTimestamp, schemaVersion: 1, sequenceNumber: ctx.sequenceNumber, wallClockTimestamp: ctx.wallClockTimestamp })` — fields in alphabetical order with `schemaVersion` included. This deterministic serialization ensures the same `TemporalContext` always produces the same digest.
2. `computeOverflowTemporalContextDigest()` uses the same algorithm with additional fields: `_tag`, `lastValidSequenceNumber`, ordered alphabetically.
3. `verifyTemporalContextDigest()` recomputes the digest from the provided context and compares it to the stored digest. Returns `true` if they match, `false` otherwise. Uses constant-time comparison to prevent timing attacks.
4. The `TemporalContextDigest` object MUST be frozen with `Object.freeze()`.
5. The `canonicalInput` field is included for auditability — it allows inspectors to verify exactly what was hashed without re-implementing the canonicalization logic.
6. The implementation MUST use `crypto.createHash('sha256')` (stable API available on all supported Node.js versions) as the primary mechanism. `crypto.subtle.digestSync` MAY be used as a performance optimization on platforms where it is available and stable (Node.js 20+). The implementation MUST NOT use JavaScript polyfills for SHA-256 — only platform-native cryptographic primitives are acceptable.

**Usage pattern for GxP audit persistence:**

```typescript
const result = temporal.create();
if (result.isErr()) {
  /* handle overflow — see TemporalContext Creation Failure Handling */
}
const ctx = result.value;
const digest = computeTemporalContextDigest(ctx);

// Persist both the context and its digest
await auditStore.append({
  temporal: ctx,
  digest: digest.digest,
  digestAlgorithm: digest.algorithm,
  // ... attribution fields
});

// Later, verify integrity during audit trail review
const storedCtx = await auditStore.read(id);
const isIntact = verifyTemporalContextDigest(storedCtx.temporal, {
  _tag: "TemporalContextDigest",
  algorithm: "SHA-256",
  digest: storedCtx.digest,
  canonicalInput: "", // recomputed internally by verify
});
```

REQUIREMENT: GxP consumers MUST compute and persist a `TemporalContextDigest` alongside every `TemporalContext` and `OverflowTemporalContext` record in the audit trail. This enables per-record tamper detection independent of `@hex-di/guard`.

REQUIREMENT: GxP consumers MUST verify record integrity using `verifyTemporalContextDigest()` when reconstructing audit trails for regulatory inspection, disaster recovery, or migration. Any verification failure MUST be logged as a critical integrity violation and escalated per the organization's deviation procedure.

**Relationship to `@hex-di/guard` hash chains:**

| Layer             | Provider        | Detects                                  | Scope                       |
| ----------------- | --------------- | ---------------------------------------- | --------------------------- |
| Per-record digest | `@hex-di/clock` | Modification of individual record fields | Single record               |
| Hash chain        | `@hex-di/guard` | Record insertion, deletion, reordering   | Entire audit trail sequence |

Both layers are necessary for complete GxP tamper-evidence. The per-record digest catches field-level modification (e.g., changing a `wallClockTimestamp` value). The hash chain catches structural-level modification (e.g., deleting an inconvenient record or inserting a fabricated one). Together, they provide defense-in-depth cryptographic integrity.

REQUIREMENT: The `create()` function MUST call `seq.next()` first, then `clock.monotonicNow()`, then `clock.wallClockNow()`, in that exact order. This ensures the sequence number is assigned before the timestamps are captured, providing a consistent happens-before relationship.

**Capture ordering rationale:** The seq-first ordering is correct for three reasons: (1) it establishes the happens-before relationship before any timestamp is captured, ensuring the sequence number is the authoritative ordering primitive; (2) the gap between `seq.next()` and `clock.monotonicNow()` is sub-microsecond in synchronous JavaScript execution, so no meaningful precision is lost; (3) if `seq.next()` returns `err(SequenceOverflowError)`, no timestamps are wasted on an event that cannot be sequenced. Wall-clock capture is last because it has the lowest precision (millisecond) and is supplementary metadata, not the ordering mechanism.

REQUIREMENT: All HexDI packages that produce audit-relevant events SHOULD use `TemporalContext` (via the factory) rather than constructing ad-hoc temporal objects. This ensures field name consistency and capture ordering across the entire ecosystem.

Consumers using `provideSystemClock()` can create a `TemporalContextFactory` by calling `createTemporalContextFactory()` with the resolved `ClockPort` and `SequenceGeneratorPort`.

### TemporalContext Creation Failure Handling (21 CFR 11.10(e))

The `create()` function calls `seq.next()` internally, which returns `err(SequenceOverflowError)` when the counter reaches `Number.MAX_SAFE_INTEGER`. Since `seq.next()` returns a `Result`, `create()` itself returns `Result<TemporalContext, SequenceOverflowError>`, making the error path explicit at the type level.

REQUIREMENT: `create()` MUST follow the capture ordering: `seq.next()` first, then `clock.monotonicNow()`, then `clock.wallClockNow()`. If `seq.next()` returns `err()`, `create()` MUST propagate the error immediately without calling any clock functions.

REQUIREMENT: When `create()` returns an `Err`, the `SequenceOverflowError` inside MUST contain the `lastValue` field set to `Number.MAX_SAFE_INTEGER`, enabling consumers to construct a degraded audit record with at least a wall-clock timestamp.

REQUIREMENT: When `create()` returns an `Err`, consumers MUST:

1. Log a critical audit event recording the overflow failure with at least a wall-clock timestamp (`clock.wallClockNow()`), the operation that triggered the failure, and the identity context (user/session).
2. Halt further audit-producing operations or transition to a fail-safe state. Continuing to produce unsequenced audit entries would create unorderable records, violating ALCOA+ Complete.

### Emergency Overflow Context (21 CFR 11.10(e), ALCOA+ Complete)

When `create()` returns `err(SequenceOverflowError)`, the overflow event itself is an audit-relevant event that needs a temporal record. However, `seq.next()` will return `err()` on all subsequent calls — creating a gap where the overflow event cannot be sequenced. This violates ALCOA+ Complete: the event that triggered the overflow has no orderable audit record.

To close this gap, `TemporalContextFactory` MUST provide a `createOverflowContext()` method that produces a degraded temporal context for the overflow audit event without requiring a sequence number:

```typescript
interface OverflowTemporalContext {
  readonly sequenceNumber: -1; // Sentinel value indicating overflow
  readonly lastValidSequenceNumber: number; // MAX_SAFE_INTEGER
  readonly monotonicTimestamp: number;
  readonly wallClockTimestamp: number;
  readonly _tag: "OverflowTemporalContext";
}

interface TemporalContextFactory {
  readonly create: () => Result<TemporalContext, SequenceOverflowError>;
  readonly createOverflowContext: () => OverflowTemporalContext;
}
```

```typescript
function createTemporalContextFactory(
  clock: ClockPort,
  seq: SequenceGeneratorPort
): TemporalContextFactory {
  return Object.freeze({
    create: () => {
      /* ... see above ... */
    },
    createOverflowContext: (): OverflowTemporalContext =>
      Object.freeze({
        sequenceNumber: -1,
        lastValidSequenceNumber: seq.current(),
        monotonicTimestamp: clock.monotonicNow(),
        wallClockTimestamp: clock.wallClockNow(),
        _tag: "OverflowTemporalContext",
      }),
  });
}
```

**Semantic contract:**

- `sequenceNumber` MUST be `-1`, a sentinel value that is never produced by `next()` (which starts at `1` and only increments). This ensures overflow contexts are distinguishable from normal contexts at both the type level (via `_tag`) and the value level (via the sentinel).
- `lastValidSequenceNumber` MUST be `seq.current()`, providing the last successfully issued sequence number for correlation with the preceding audit entry.
- The `OverflowTemporalContext` object MUST be frozen with `Object.freeze()`.
- `createOverflowContext()` MUST NOT call `seq.next()`. It reads `seq.current()` only.
- `createOverflowContext()` is designed to be callable after overflow. It has no error paths.

REQUIREMENT: `createOverflowContext()` MAY be called multiple times after overflow. Each call captures fresh timestamps but the same `lastValidSequenceNumber` (since the counter is permanently in overflow state). Consumers SHOULD call it exactly once per overflow event to record the overflow in the audit trail.

REQUIREMENT: GxP consumers MUST use the following overflow handling pattern:

```typescript
const result = temporal.create();
if (result.isErr()) {
  // Record the overflow event with a degraded temporal context
  const overflowCtx = temporal.createOverflowContext();
  auditLog.recordOverflow({
    temporal: overflowCtx,
    processInstanceId: processId.value,
    operation: currentOperation,
    userId: currentUser,
    severity: "CRITICAL",
  });
  // Transition to fail-safe state -- halt further audit-producing operations
  transitionToFailSafe("sequence-overflow");
}
```

**GxP rationale (21 CFR 11.10(e), ALCOA+ Complete):** Without `createOverflowContext()`, the overflow event itself would be the one event in the audit trail with no temporal record — a compliance gap. The degraded context provides auditable evidence that the overflow was detected, when it occurred (wall-clock and monotonic timestamps), and what the last valid sequence number was. The `-1` sentinel and `_tag` discriminator make overflow entries immediately identifiable during audit trail review. Since `create()` returns `err(SequenceOverflowError)` rather than returning a value, consumers are forced to handle the overflow at the type level — there is no code path that silently drops the overflow.

**Type guard:**

```typescript
function isOverflowTemporalContext(
  ctx: TemporalContext | OverflowTemporalContext
): ctx is OverflowTemporalContext {
  return "_tag" in ctx && ctx._tag === "OverflowTemporalContext";
}
```

REQUIREMENT: `isOverflowTemporalContext` MUST be exported from the main entry point, enabling consumers to discriminate between normal and overflow contexts when processing audit trail entries.

### How Consumers Use Clock for Audit

```typescript
// HTTP client introspection using TemporalContext
function recordHttpOperation(
  temporal: TemporalContextFactory
): Result<HttpHistoryEntry, SequenceOverflowError> {
  return temporal.create().map(ctx => ({
    ...ctx,
    // ... other domain-specific fields
  }));
}
```

Every audit-relevant event captures both a sequence number and timestamps via `TemporalContext`, providing:

1. **Total ordering** via sequence number (authoritative).
2. **Absolute positioning** via wall-clock timestamp (for human inspection and cross-system correlation).
3. **Duration context** via monotonic timestamp (for elapsed-time computation).

### Wall-Clock Rollback Handling

Sequence numbers are the PRIMARY ordering mechanism for audit trail events. Wall-clock timestamps (`wallClockTimestamp` in `TemporalContext`) are supplementary metadata providing calendar-time context for human inspection and cross-system correlation.

NTP synchronization corrections may cause wall-clock values to be non-monotonic: a subsequent `wallClockNow()` call may return a value less than a previous call if the OS NTP daemon applied a step correction between the two calls. This is expected behavior, not a defect. The `monotonicNow()` function is immune to NTP corrections (it uses `performance.now()`, which is monotonic by platform guarantee), and the sequence number is immune by construction (simple integer increment).

REQUIREMENT: Audit trail reconstruction MUST use sequence numbers for event ordering, not wall-clock timestamps. When displaying or analyzing audit trails, consumers MUST sort by `sequenceNumber` (authoritative) and display `wallClockTimestamp` as informational context only. Two events with `sequenceNumber` 41 and 42 occurred in that order regardless of their wall-clock values.

REQUIREMENT: Consumers that detect non-monotonic wall-clock timestamps (i.e., `event[n].wallClockTimestamp > event[n+1].wallClockTimestamp` while `event[n].sequenceNumber < event[n+1].sequenceNumber`) SHOULD log this as an informational diagnostic event indicating an NTP correction occurred, not as a data integrity violation. The sequence number ordering remains authoritative.

Cross-reference: Section 3.2 ("Ordering Guarantees") defines the formal ordering properties of sequence numbers vs. timestamps. For NTP drift monitoring and reporting, see `spec/guard/17-gxp-compliance/03-clock-synchronization.md`.

### Audit Trail Guarantees by Deployment Mode

The audit trail integrity guarantees differ depending on whether `@hex-di/guard` is deployed alongside `@hex-di/clock`:

#### Without `@hex-di/guard` (non-GxP / development)

| Guarantee                          | Status                   | Detail                                                                                                                                                                                  |
| ---------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sequence number uniqueness         | **Provided**             | `SequenceGeneratorPort.next()` always returns unique values within a generator instance.                                                                                                |
| Sequence number monotonicity       | **Provided**             | `next()` always returns strictly increasing values.                                                                                                                                     |
| Structural irresettability         | **Provided**             | Production `SequenceGeneratorPort` has no `reset()` method.                                                                                                                             |
| Monotonic timestamps               | **Provided**             | `monotonicNow()` guaranteed non-decreasing via `performance.now()` or clamped fallback.                                                                                                 |
| Wall-clock accuracy                | **NOT PROVIDED**         | `wallClockNow()` reads `Date.now()` without verifying NTP synchronization. Timestamps may be inaccurate if the system clock is not NTP-synced.                                          |
| Per-record cryptographic integrity | **Provided**             | `computeTemporalContextDigest()` produces SHA-256 hash of individual `TemporalContext` records. `verifyTemporalContextDigest()` detects field-level tampering.                          |
| Cross-record chain integrity       | **NOT PROVIDED**         | No hash chain linking records together. Record insertion, deletion, or reordering is not detectable without the guard.                                                                  |
| NTP drift detection                | **NOT PROVIDED**         | No monitoring of clock drift against an NTP reference.                                                                                                                                  |
| Periodic integrity verification    | **NOT PROVIDED**         | No heartbeat confirming adapter identity or monotonicity.                                                                                                                               |
| Clock source change auditing       | **Provided (with sink)** | `ClockSourceChangedEvent` emitted via `ClockSourceChangedSinkPort` when adapter registration changes. Requires a registered sink; warns to stderr in GxP mode if no sink is registered. |

**Suitability:** Acceptable for development, testing, and non-regulated deployments. NOT acceptable for GxP-regulated environments without additional controls.

#### With `@hex-di/guard` (`gxp: true`)

All guarantees from the "without guard" column are retained, plus:

| Guarantee                       | Status       | Detail                                                                                                             |
| ------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| Wall-clock accuracy             | **Provided** | NTP validation at startup; periodic drift monitoring.                                                              |
| Cross-record chain integrity    | **Provided** | SHA-256 hash chain on audit entries (guard spec section 61), complementing the clock library's per-record digests. |
| NTP drift detection             | **Provided** | Configurable thresholds with warning/error/fail-fast (guard spec section 62).                                      |
| Periodic integrity verification | **Provided** | Adapter identity and monotonicity heartbeat (see Periodic Adapter Integrity Verification).                         |
| Clock source change auditing    | **Provided** | `ClockSourceChanged` event emitted on adapter swap (see section 7.1).                                              |
| Fail-fast startup validation    | **Provided** | Resolution check, NTP sync check, consistency check at startup.                                                    |

**Suitability:** Required for GxP-regulated environments. Satisfies 21 CFR Part 11, EU GMP Annex 11, and ALCOA+ requirements when properly configured.

REQUIREMENT: GxP deployments MUST deploy `@hex-di/guard` alongside `@hex-di/clock`. Operating `@hex-di/clock` without the guard in a GxP environment leaves critical compliance gaps (NTP validation, cryptographic integrity, periodic verification) that cannot be addressed by the clock library alone.

### Guard's Audit Enhancement

When `@hex-di/guard` is deployed, it adds NTP validation, cross-record cryptographic integrity (SHA-256 hash chains), and periodic drift monitoring. These enhancements are transparent to consumers: they continue using `TemporalContextFactory.create()`, and the guard's adapter and audit bridge handle the rest. See `spec/guard/17-gxp-compliance/03-clock-synchronization.md` for details.

### Timestamp Format for Externalization

When audit entries are serialized for external consumption (log aggregation, audit database), timestamps SHOULD be converted to ISO 8601 UTC:

```typescript
const seqResult = seq.next(); // ok(42)
const entry = {
  timestamp: new Date(clock.wallClockNow()).toISOString(),
  monotonicMs: clock.monotonicNow(),
  sequenceNumber: seqResult.value,
};
// { timestamp: "2026-02-12T14:30:00.123Z", monotonicMs: 45123.456, sequenceNumber: 42 }
```

REQUIREMENT: Externalized timestamps MUST use ISO 8601 format with UTC timezone (`Z` suffix). Local time offsets MUST NOT be used in audit trail timestamps.

**Timezone clarification:** `Date.prototype.toISOString()` always produces a UTC string with the `Z` suffix regardless of the system's local timezone setting. This behavior is guaranteed by the ECMAScript specification (ECMA-262, section 21.4.4.36) and is not affected by `TZ` environment variables or OS timezone configuration. Consumers MUST use `toISOString()` (not `toString()` or `toLocaleString()`) when converting `wallClockNow()` values for audit externalization.

### Audit Trail Serialization Schema (21 CFR 11.10(b), EU GMP Annex 11 Section 12.4)

21 CFR 11.10(b) requires the ability to generate accurate and complete copies of records in both human-readable and electronic form suitable for FDA inspection. EU GMP Annex 11 Section 12.4 requires that printouts of electronically stored data indicate if the printout reflects the current data. To support these requirements, `@hex-di/clock` defines standardized JSON serialization schemas for `TemporalContext` and `OverflowTemporalContext`.

#### TemporalContext JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://hex-di.dev/schemas/temporal-context/v1",
  "title": "TemporalContext",
  "description": "Standardized audit timestamp triple from @hex-di/clock v0.1.0",
  "type": "object",
  "required": ["schemaVersion", "sequenceNumber", "monotonicTimestamp", "wallClockTimestamp"],
  "additionalProperties": false,
  "properties": {
    "schemaVersion": {
      "const": 1,
      "description": "Schema version for forward compatibility. Consumers MUST check this field when deserializing archived records."
    },
    "sequenceNumber": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991,
      "description": "Monotonically increasing sequence number (authoritative ordering)."
    },
    "monotonicTimestamp": {
      "type": "number",
      "minimum": 0,
      "description": "Milliseconds from monotonic clock origin (relative, not epoch-based)."
    },
    "wallClockTimestamp": {
      "type": "number",
      "minimum": 0,
      "description": "Milliseconds since Unix epoch (1970-01-01T00:00:00Z)."
    }
  }
}
```

#### OverflowTemporalContext JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://hex-di.dev/schemas/overflow-temporal-context/v1",
  "title": "OverflowTemporalContext",
  "description": "Degraded temporal context for sequence overflow audit event from @hex-di/clock v0.1.0",
  "type": "object",
  "required": [
    "schemaVersion",
    "_tag",
    "sequenceNumber",
    "lastValidSequenceNumber",
    "monotonicTimestamp",
    "wallClockTimestamp"
  ],
  "additionalProperties": false,
  "properties": {
    "schemaVersion": {
      "const": 1,
      "description": "Schema version for forward compatibility."
    },
    "_tag": {
      "const": "OverflowTemporalContext",
      "description": "Discriminator tag for type identification."
    },
    "sequenceNumber": {
      "const": -1,
      "description": "Sentinel value indicating overflow."
    },
    "lastValidSequenceNumber": {
      "type": "integer",
      "description": "Last successfully issued sequence number (MAX_SAFE_INTEGER)."
    },
    "monotonicTimestamp": {
      "type": "number",
      "minimum": 0,
      "description": "Milliseconds from monotonic clock origin at time of overflow detection."
    },
    "wallClockTimestamp": {
      "type": "number",
      "minimum": 0,
      "description": "Milliseconds since Unix epoch at time of overflow detection."
    }
  }
}
```

#### ClockDiagnostics JSON Schema (Versioned)

To ensure historical audit records remain interpretable across library version upgrades (addressing ALCOA+ Enduring), the `ClockDiagnostics` serialization includes a schema version:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://hex-di.dev/schemas/clock-diagnostics/v1",
  "title": "ClockDiagnostics",
  "description": "Clock source attestation snapshot from @hex-di/clock v0.1.0",
  "type": "object",
  "required": ["schemaVersion", "adapterName", "monotonicSource", "highResSource"],
  "additionalProperties": false,
  "properties": {
    "schemaVersion": {
      "const": 1,
      "description": "Schema version for forward compatibility."
    },
    "adapterName": {
      "type": "string",
      "description": "Human-readable identifier for the active clock adapter."
    },
    "monotonicSource": {
      "type": "string",
      "enum": ["performance.now", "Date.now-clamped"],
      "description": "Platform API backing monotonicNow()."
    },
    "highResSource": {
      "type": "string",
      "enum": ["performance.timeOrigin+now", "Date.now"],
      "description": "Platform API backing highResNow()."
    },
    "platformResolutionMs": {
      "type": ["number", "null"],
      "description": "Observed minimum non-zero delta from startup sample, or null if not measured."
    }
  }
}
```

REQUIREMENT: When serializing `TemporalContext`, `OverflowTemporalContext`, or `ClockDiagnostics` for long-term archival or external consumption, consumers MUST include the `schemaVersion` field. This enables future versions of `@hex-di/clock` to evolve the schema while maintaining backward compatibility for deserialization of archived records.

### Schema Migration Strategy (ALCOA+ Enduring, 21 CFR 11.10(b))

To ensure archived audit records remain interpretable across library version upgrades, `@hex-di/clock` defines a concrete schema migration strategy with deserialization utilities and version negotiation.

#### Schema Version Registry

Each serializable type maintains a version registry mapping `schemaVersion` to a deserializer:

| Type                      | Current Version | Supported Versions |
| ------------------------- | --------------- | ------------------ |
| `TemporalContext`         | 1               | 1                  |
| `OverflowTemporalContext` | 1               | 1                  |
| `ClockDiagnostics`        | 1               | 1                  |

REQUIREMENT: When a schema evolves to version N, the library MUST retain deserializers for all versions 1 through N. Removing a prior-version deserializer is a breaking change that MUST NOT occur without a documented migration plan approved by QA.

#### Deserialization Utilities

`@hex-di/clock` exports typed deserialization functions that validate schema version and structural integrity:

```typescript
interface DeserializationError {
  readonly _tag: "DeserializationError";
  readonly schemaType: string;
  readonly expectedVersions: ReadonlyArray<number>;
  readonly actualVersion: number | undefined;
  readonly field: string | undefined;
  readonly message: string;
}

function deserializeTemporalContext(raw: unknown): Result<TemporalContext, DeserializationError>;

function deserializeOverflowTemporalContext(
  raw: unknown
): Result<OverflowTemporalContext, DeserializationError>;

function deserializeClockDiagnostics(raw: unknown): Result<ClockDiagnostics, DeserializationError>;
```

**Behavioral contract:**

1. The function MUST check `schemaVersion` first. If `schemaVersion` is missing or not a supported version number, return `Err` with `expectedVersions` listing all supported versions and `actualVersion` set to the parsed value (or `undefined` if missing).
2. For each supported version, the function MUST validate all required fields per that version's JSON schema (type checks, range checks, enum membership).
3. On success, the function MUST return a frozen `TemporalContext` (or `OverflowTemporalContext`, or `ClockDiagnostics`) object identical in structure to what the library would produce at runtime.
4. The function MUST NOT use type casting. Validation uses type guards and structural checks.
5. The `DeserializationError` object MUST be frozen.

#### Version Upgrade Migration Path

When the schema evolves (e.g., `TemporalContext` v1 → v2), the v2 deserializer MUST handle both v1 and v2 inputs:

```typescript
// Example: TemporalContext v2 adds a 'processInstanceId' field
function deserializeTemporalContext(raw: unknown): Result<TemporalContextV2, DeserializationError> {
  // Dispatch on schemaVersion
  // v1: migrate by setting processInstanceId to undefined (safe default)
  // v2: validate directly
}
```

REQUIREMENT: Each schema version upgrade MUST document:

1. **Added fields** — new fields with their default values for migration from prior versions.
2. **Removed fields** — fields that are no longer present, with justification.
3. **Changed fields** — fields with modified types or semantics, with the migration transformation.
4. **Migration safety** — confirmation that the migration is lossless (no data is discarded from prior-version records) or, if lossy, explicit QA approval of the data loss.

REQUIREMENT: Schema version migration documentation MUST be maintained in this section of the specification and cross-referenced in the RTM.

#### Deserialization in Audit Trail Reconstruction

When reconstructing audit trails from archived records (e.g., for regulatory inspection or disaster recovery), consumers MUST use the deserialization utilities rather than raw JSON parsing:

```typescript
// Correct: validates schema version and structural integrity
const result = deserializeTemporalContext(JSON.parse(archivedRecord));
if (result.isErr()) {
  auditLog.recordDeserializationFailure({
    error: result.error,
    sourceRecord: archivedRecord,
    archiveLocation: archivePath,
  });
}

// Incorrect: bypasses version validation, no structural guarantee
const ctx = JSON.parse(archivedRecord);
```

REQUIREMENT: GxP deployments MUST use the deserialization utilities for all audit trail reconstruction operations. Direct `JSON.parse()` without subsequent deserialization validation is NOT acceptable for GxP audit trail processing.

REQUIREMENT: When producing printed audit trail reports (per EU GMP Annex 11 Section 12.4), consumers MUST format `TemporalContext` records as follows:

1. `wallClockTimestamp` MUST be converted to ISO 8601 UTC format (e.g., `2026-02-13T14:30:00.123Z`).
2. `sequenceNumber` MUST be displayed as a decimal integer.
3. `monotonicTimestamp` MUST be displayed as a decimal number with explicit `ms` unit suffix.
4. The report MUST include a header identifying the `@hex-di/clock` schema version, the `ClockDiagnostics` at the time of record creation, and the date/time the report was generated.
5. If the report contains `OverflowTemporalContext` entries, they MUST be visually distinguished (e.g., highlighted or annotated) to alert reviewers to the overflow condition.

**Printed report formatting** is a consumer responsibility. `@hex-di/clock` defines the serialization schema and formatting requirements; consumers implement the rendering.
