# 6.6 Audit Trail Integration — GxP Compliance

> **Part of:** [GxP Compliance (§6)](./README.md) | **Previous:** [§6.5 ALCOA+ Mapping](./05-alcoa-mapping.md) | **Next:** [§6.7 Recovery Procedures](./07-recovery-procedures.md)

## Audit Trail Integration

### TemporalContext -- Standardized Audit Timestamp Type

To ensure all audit-producing consumers use a consistent structure for temporal data, `@hex-di/clock` defines a `TemporalContext` interface and a factory function for creating instances:

```typescript
interface TemporalContext {
  readonly sequenceNumber: number;
  readonly monotonicTimestamp: MonotonicTimestamp;
  readonly wallClockTimestamp: WallClockTimestamp;
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

REQUIREMENT (CLK-AUD-001): The `TemporalContext` object returned by `create()` MUST be frozen with `Object.freeze()`.

**Tamper-evidence boundary:** `Object.freeze()` prevents JavaScript-runtime mutation of `TemporalContext` objects (property reassignment, property addition/deletion). For cryptographic tamper-evidence, `@hex-di/clock` provides per-record integrity via `computeTemporalContextDigest()` (see "Self-Contained Record Integrity" below). For cross-record chain integrity (detecting record insertion, deletion, or reordering), GxP deployments require an ecosystem monitoring adapter that implements SHA-256 hash chains. Both layers complement each other: the clock library detects tampering of individual records; the monitoring adapter detects structural-level modifications. GxP deployments MUST use both (see "Audit Trail Guarantees by Deployment Mode").

### Self-Contained Record Integrity (21 CFR 11.10(c), ALCOA+ Original)

To enable tamper detection of individual `TemporalContext` records without requiring external dependencies, `@hex-di/clock` provides cryptographic digest utilities that compute and verify SHA-256 hashes of temporal context records.

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

1. `computeTemporalContextDigest()` produces a SHA-256 hash of the canonical JSON serialization of the `TemporalContext` fields. The canonical form is defined as: `JSON.stringify({ monotonicTimestamp: ctx.monotonicTimestamp, schemaVersion: 1, sequenceNumber: ctx.sequenceNumber, wallClockTimestamp: ctx.wallClockTimestamp })` — fields in alphabetical order with `schemaVersion` included. The `schemaVersion` field is injected during canonicalization and is not present on the runtime `TemporalContext` interface; it exists only in the serialization and digest domains. This deterministic serialization ensures the same `TemporalContext` always produces the same digest.
2. `computeOverflowTemporalContextDigest()` uses the same algorithm with additional fields: `_tag`, `lastValidSequenceNumber`, ordered alphabetically.
3. `verifyTemporalContextDigest()` recomputes the digest from the provided context and compares it to the stored digest. Returns `true` if they match, `false` otherwise. Uses constant-time comparison to prevent timing attacks.
4. The `TemporalContextDigest` object MUST be frozen with `Object.freeze()`.
5. The `canonicalInput` field is included for auditability — it allows inspectors to verify exactly what was hashed without re-implementing the canonicalization logic.
6. The implementation MUST use `crypto.createHash('sha256')` (stable API available on all supported Node.js versions) as the primary mechanism. `crypto.subtle.digestSync` MAY be used as a performance optimization on platforms where it is available and stable (Node.js 20+). The implementation MUST NOT use JavaScript polyfills for SHA-256 — only platform-native cryptographic primitives are acceptable.

**Cryptographic primitive selection rationale:** SHA-256 was selected because: (a) it is available as a platform-native primitive on all supported runtimes (Node.js `crypto`, Deno `crypto`, Bun `crypto`, browser `SubtleCrypto`) without requiring third-party dependencies; (b) it provides 256-bit collision resistance suitable for tamper-evidence (not encryption) of individual audit records; (c) it is widely recognized by regulatory bodies and audit professionals. The digests produced by `@hex-di/clock` are for **tamper-evidence** (detecting unauthorized modification of existing records), not for **confidentiality** (protecting data from disclosure). FIPS 140-2/140-3 certification of the underlying cryptographic module is an infrastructure-level concern: GxP organizations deploying on FIPS-validated platforms (e.g., FIPS-enabled OpenSSL builds, FIPS-mode Node.js) automatically inherit FIPS compliance for the SHA-256 operations. Organizations with FIPS requirements MUST verify that their deployment runtime's `crypto` module is configured in FIPS mode and document this in their computerized system validation plan. To support runtime verification, `ClockDiagnosticsPort.getDiagnostics()` includes a `cryptoFipsMode` field that reports whether the platform's crypto module is operating in FIPS mode (see § 6.1, CLK-GXP-003a). GxP organizations with FIPS requirements SHOULD check `diagnostics.cryptoFipsMode === true` at startup and fail-fast if FIPS mode is not active.

**Usage pattern for GxP audit persistence:**

```typescript
const result = temporal.create();
if (result.isErr()) {
  /* handle overflow — see TemporalContext Creation Failure Handling */
}
const ctx = result.value;
const digest = computeTemporalContextDigest(ctx);

// Persist the context and the FULL digest object (including canonicalInput for auditor inspectability)
await auditStore.append({
  temporal: ctx,
  digest: digest, // Persist the entire TemporalContextDigest object
  // ... attribution fields
});

// Later, verify integrity during audit trail review
const storedCtx = await auditStore.read(id);
const isIntact = verifyTemporalContextDigest(storedCtx.temporal, storedCtx.digest);
```

REQUIREMENT (CLK-AUD-002): GxP consumers MUST compute and persist the full `TemporalContextDigest` object (including `canonicalInput`) alongside every `TemporalContext` and `OverflowTemporalContext` record in the audit trail. Persisting the `canonicalInput` field enables auditors to verify exactly what was hashed without re-implementing the canonicalization logic. This enables per-record tamper detection independent of external audit trail infrastructure.

REQUIREMENT (CLK-AUD-003): GxP consumers MUST verify record integrity using `verifyTemporalContextDigest()` when reconstructing audit trails for regulatory inspection, disaster recovery, or migration. Any verification failure MUST be logged as a critical integrity violation and escalated per the organization's deviation procedure.

**Relationship to cross-record chain integrity:**

| Layer             | Provider                          | Detects                                  | Scope                       |
| ----------------- | --------------------------------- | ---------------------------------------- | --------------------------- |
| Per-record digest | `@hex-di/clock`                   | Modification of individual record fields | Single record               |
| Hash chain        | Ecosystem monitoring adapter      | Record insertion, deletion, reordering   | Entire audit trail sequence |

Both layers are necessary for complete GxP tamper-evidence. The per-record digest catches field-level modification (e.g., changing a `wallClockTimestamp` value). The hash chain catches structural-level modification (e.g., deleting an inconvenient record or inserting a fabricated one). Together, they provide defense-in-depth cryptographic integrity.

REQUIREMENT (CLK-AUD-004): The `create()` function MUST call `seq.next()` first, then `clock.monotonicNow()`, then `clock.wallClockNow()`, in that exact order. This ensures the sequence number is assigned before the timestamps are captured, providing a consistent happens-before relationship.

**Capture ordering rationale:** The seq-first ordering is correct for three reasons: (1) it establishes the happens-before relationship before any timestamp is captured, ensuring the sequence number is the authoritative ordering primitive; (2) the gap between `seq.next()` and `clock.monotonicNow()` is sub-microsecond in synchronous JavaScript execution, so no meaningful precision is lost; (3) if `seq.next()` returns `err(SequenceOverflowError)`, no timestamps are wasted on an event that cannot be sequenced. Wall-clock capture is last because it has the lowest precision (millisecond) and is supplementary metadata, not the ordering mechanism.

REQUIREMENT (CLK-AUD-005): All HexDI packages that produce audit-relevant events SHOULD use `TemporalContext` (via the factory) rather than constructing ad-hoc temporal objects. This ensures field name consistency and capture ordering across the entire ecosystem.

Consumers using `SystemClockAdapter` and `SystemSequenceGeneratorAdapter` can create a `TemporalContextFactory` by calling `createTemporalContextFactory()` with the resolved `ClockPort` and `SequenceGeneratorPort`.

### TemporalContext Creation Failure Handling (21 CFR 11.10(e))

The `create()` function calls `seq.next()` internally, which returns `err(SequenceOverflowError)` when the counter reaches `Number.MAX_SAFE_INTEGER`. Since `seq.next()` returns a `Result`, `create()` itself returns `Result<TemporalContext, SequenceOverflowError>`, making the error path explicit at the type level.

REQUIREMENT (CLK-AUD-006): `create()` MUST follow the capture ordering: `seq.next()` first, then `clock.monotonicNow()`, then `clock.wallClockNow()`. If `seq.next()` returns `err()`, `create()` MUST propagate the error immediately without calling any clock functions.

REQUIREMENT (CLK-AUD-007): When `create()` returns an `Err`, the `SequenceOverflowError` inside MUST contain the `lastValue` field set to `Number.MAX_SAFE_INTEGER`, enabling consumers to construct a degraded audit record with at least a wall-clock timestamp.

REQUIREMENT (CLK-AUD-008): When `create()` returns an `Err`, consumers MUST:

1. Log a critical audit event recording the overflow failure with at least a wall-clock timestamp (`clock.wallClockNow()`), the operation that triggered the failure, and the identity context (user/session).
2. Halt further audit-producing operations or transition to a fail-safe state. Continuing to produce unsequenced audit entries would create unorderable records, violating ALCOA+ Complete.

### Emergency Overflow Context (21 CFR 11.10(e), ALCOA+ Complete)

When `create()` returns `err(SequenceOverflowError)`, the overflow event itself is an audit-relevant event that needs a temporal record. However, `seq.next()` will return `err()` on all subsequent calls — creating a gap where the overflow event cannot be sequenced. This violates ALCOA+ Complete: the event that triggered the overflow has no orderable audit record.

To close this gap, `TemporalContextFactory` MUST provide a `createOverflowContext()` method that produces a degraded temporal context for the overflow audit event without requiring a sequence number:

```typescript
interface OverflowTemporalContext {
  readonly sequenceNumber: -1; // Sentinel value indicating overflow
  readonly lastValidSequenceNumber: number; // MAX_SAFE_INTEGER
  readonly monotonicTimestamp: MonotonicTimestamp;
  readonly wallClockTimestamp: WallClockTimestamp;
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

REQUIREMENT (CLK-AUD-009): `createOverflowContext()` MAY be called multiple times after overflow. Each call captures fresh timestamps but the same `lastValidSequenceNumber` (since the counter is permanently in overflow state). Consumers SHOULD call it exactly once per overflow event to record the overflow in the audit trail.

REQUIREMENT (CLK-AUD-010): GxP consumers MUST use the following overflow handling pattern:

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

REQUIREMENT (CLK-AUD-011): `isOverflowTemporalContext` MUST be exported from the main entry point, enabling consumers to discriminate between normal and overflow contexts when processing audit trail entries.

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

REQUIREMENT (CLK-AUD-012): Audit trail reconstruction MUST use sequence numbers for event ordering, not wall-clock timestamps. When displaying or analyzing audit trails, consumers MUST sort by `sequenceNumber` (authoritative) and display `wallClockTimestamp` as informational context only. Two events with `sequenceNumber` 41 and 42 occurred in that order regardless of their wall-clock values.

REQUIREMENT (CLK-AUD-013): Consumers that detect non-monotonic wall-clock timestamps (i.e., `event[n].wallClockTimestamp > event[n+1].wallClockTimestamp` while `event[n].sequenceNumber < event[n+1].sequenceNumber`) SHOULD log this as an informational diagnostic event indicating an NTP correction occurred, not as a data integrity violation. The sequence number ordering remains authoritative.

Cross-reference: Section 3.2 ("Ordering Guarantees") defines the formal ordering properties of sequence numbers vs. timestamps. NTP drift monitoring and reporting is the responsibility of the ecosystem's GxP monitoring infrastructure.

### Audit Trail Guarantees by Deployment Mode

The audit trail integrity guarantees differ depending on whether ecosystem GxP monitoring infrastructure is deployed alongside `@hex-di/clock`:

#### Without GxP monitoring infrastructure (non-GxP / development)

| Guarantee                          | Status                   | Detail                                                                                                                                                                                  |
| ---------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sequence number uniqueness         | **Provided**             | `SequenceGeneratorPort.next()` always returns unique values within a generator instance.                                                                                                |
| Sequence number monotonicity       | **Provided**             | `next()` always returns strictly increasing values.                                                                                                                                     |
| Structural irresettability         | **Provided**             | Production `SequenceGeneratorPort` has no `reset()` method.                                                                                                                             |
| Monotonic timestamps               | **Provided**             | `monotonicNow()` guaranteed non-decreasing via `performance.now()` or clamped fallback.                                                                                                 |
| Wall-clock accuracy                | **NOT PROVIDED**         | `wallClockNow()` reads `Date.now()` without verifying NTP synchronization. Timestamps may be inaccurate if the system clock is not NTP-synced.                                          |
| Per-record cryptographic integrity | **Provided**             | `computeTemporalContextDigest()` produces SHA-256 hash of individual `TemporalContext` records. `verifyTemporalContextDigest()` detects field-level tampering.                          |
| Cross-record chain integrity       | **NOT PROVIDED**         | No hash chain linking records together. Record insertion, deletion, or reordering is not detectable without ecosystem monitoring infrastructure.                                        |
| NTP drift detection                | **NOT PROVIDED**         | No monitoring of clock drift against an NTP reference.                                                                                                                                  |
| Periodic integrity verification    | **NOT PROVIDED**         | No heartbeat confirming adapter identity or monotonicity.                                                                                                                               |
| Clock source change auditing       | **Provided (with sink)** | `ClockSourceChangedEvent` emitted via `ClockSourceChangedSinkPort` when adapter registration changes. Requires a registered sink; warns to stderr in GxP mode if no sink is registered. |

**Suitability:** Acceptable for development, testing, and non-regulated deployments. NOT acceptable for GxP-regulated environments without additional controls.

#### With GxP monitoring infrastructure (`gxp: true`)

All guarantees from the "without monitoring" column are retained, plus:

| Guarantee                       | Status       | Detail                                                                                                                          |
| ------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Wall-clock accuracy             | **Provided** | NTP validation at startup; periodic drift monitoring.                                                                           |
| Cross-record chain integrity    | **Provided** | SHA-256 hash chain on audit entries, complementing the clock library's per-record digests.                                      |
| NTP drift detection             | **Provided** | Configurable thresholds with warning/error/fail-fast escalation.                                                                |
| Periodic integrity verification | **Provided** | Adapter identity and monotonicity heartbeat (see Periodic Adapter Integrity Verification).                                      |
| Clock source change auditing    | **Provided** | `ClockSourceChanged` event emitted on adapter swap (see section 7.1).                                                           |
| Fail-fast startup validation    | **Provided** | Resolution check, NTP sync check, consistency check at startup.                                                                 |

**Suitability:** Required for GxP-regulated environments. Satisfies 21 CFR Part 11, EU GMP Annex 11, and ALCOA+ requirements when properly configured.

REQUIREMENT (CLK-AUD-014): GxP deployments MUST deploy ecosystem GxP monitoring infrastructure alongside `@hex-di/clock`. Operating `@hex-di/clock` without monitoring infrastructure in a GxP environment leaves critical compliance gaps (NTP validation, cross-record cryptographic integrity, periodic verification) that cannot be addressed by the clock library alone. Any HexDI ecosystem library that provides NTP validation, cross-record chain integrity, and periodic adapter integrity checks satisfies this requirement.

### Ecosystem Monitoring Audit Enhancement

When ecosystem GxP monitoring infrastructure is deployed, it adds NTP validation, cross-record cryptographic integrity (SHA-256 hash chains), and periodic drift monitoring. These enhancements are transparent to consumers: they continue using `TemporalContextFactory.create()`, and the monitoring adapter and audit bridge handle the rest.

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

REQUIREMENT (CLK-AUD-015): Externalized timestamps MUST use ISO 8601 format with UTC timezone (`Z` suffix). Local time offsets MUST NOT be used in audit trail timestamps.

**Timezone clarification:** `Date.prototype.toISOString()` always produces a UTC string with the `Z` suffix regardless of the system's local timezone setting. This behavior is guaranteed by the ECMAScript specification (ECMA-262, section 21.4.4.36) and is not affected by `TZ` environment variables or OS timezone configuration. Consumers MUST use `toISOString()` (not `toString()` or `toLocaleString()`) when converting `wallClockNow()` values for audit externalization.

### Audit Trail Serialization Schema (21 CFR 11.10(b), EU GMP Annex 11 Section 12.4)

21 CFR 11.10(b) requires the ability to generate accurate and complete copies of records in both human-readable and electronic form suitable for FDA inspection. EU GMP Annex 11 Section 12.4 requires that printouts of electronically stored data indicate if the printout reflects the current data. To support these requirements, `@hex-di/clock` defines standardized JSON serialization schemas for `TemporalContext` and `OverflowTemporalContext`.

**JSON Schema `$id` note:** The `$id` URIs in the schemas below (e.g., `https://hex-di.dev/schemas/temporal-context/v1`) are **namespace identifiers**, not resolvable URLs. Per the JSON Schema specification (draft 2020-12, section 8.2.1), `$id` serves as a canonical identifier for the schema and does not imply that the URI resolves to an accessible resource. These identifiers are stable and will not change across schema versions. If the `hex-di.dev` domain is registered in the future, the URIs MAY become resolvable, but schema consumers MUST NOT depend on URI resolution for schema validation.

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
      "description": "Milliseconds from monotonic clock origin (relative, not epoch-based).",
      "typeNote": "TypeScript type is MonotonicTimestamp (branded number). Serialized as plain number in JSON."
    },
    "wallClockTimestamp": {
      "type": "number",
      "minimum": 0,
      "description": "Milliseconds since Unix epoch (1970-01-01T00:00:00Z).",
      "typeNote": "TypeScript type is WallClockTimestamp (branded number). Serialized as plain number in JSON."
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
      "description": "Milliseconds from monotonic clock origin at time of overflow detection.",
      "typeNote": "TypeScript type is MonotonicTimestamp (branded number). Serialized as plain number in JSON."
    },
    "wallClockTimestamp": {
      "type": "number",
      "minimum": 0,
      "description": "Milliseconds since Unix epoch at time of overflow detection.",
      "typeNote": "TypeScript type is WallClockTimestamp (branded number). Serialized as plain number in JSON."
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
      "enum": ["performance.now", "Date.now-clamped", "host-bridge"],
      "description": "Platform API backing monotonicNow()."
    },
    "highResSource": {
      "type": "string",
      "enum": ["performance.timeOrigin+now", "Date.now", "host-bridge", "host-bridge-wallclock"],
      "description": "Platform API backing highResNow()."
    },
    "platformResolutionMs": {
      "type": ["number", "null"],
      "description": "Observed minimum non-zero delta from startup sample, or null if not measured."
    },
    "cryptoFipsMode": {
      "type": ["boolean", "null"],
      "description": "Whether the platform's cryptographic module is operating in FIPS mode. true if FIPS enabled, false if not, null if detection is unavailable on the platform."
    }
  }
}
```

REQUIREMENT (CLK-AUD-016): When serializing `TemporalContext`, `OverflowTemporalContext`, or `ClockDiagnostics` for long-term archival or external consumption, consumers MUST include the `schemaVersion` field. This enables future versions of `@hex-di/clock` to evolve the schema while maintaining backward compatibility for deserialization of archived records.

### Schema Migration Strategy (ALCOA+ Enduring, 21 CFR 11.10(b))

To ensure archived audit records remain interpretable across library version upgrades, `@hex-di/clock` defines a concrete schema migration strategy with deserialization utilities and version negotiation.

#### Schema Version Registry

Each serializable type maintains a version registry mapping `schemaVersion` to a deserializer:

| Type                      | Current Version | Supported Versions |
| ------------------------- | --------------- | ------------------ |
| `TemporalContext`         | 1               | 1                  |
| `OverflowTemporalContext` | 1               | 1                  |
| `ClockDiagnostics`        | 1               | 1                  |

REQUIREMENT (CLK-AUD-017): When a schema evolves to version N, the library MUST retain deserializers for all versions 1 through N. Removing a prior-version deserializer is a breaking change that MUST NOT occur without a documented migration plan approved by QA.

#### Schema Evolution Policy (ALCOA+ Enduring)

This policy governs how `TemporalContext`, `OverflowTemporalContext`, and `ClockDiagnostics` serialization schemas evolve across `@hex-di/clock` versions. The policy ensures that archived audit records remain deserializable for the duration of their retention period, satisfying ALCOA+ Enduring and 21 CFR 11.10(b) (accurate and complete copies of records).

**Backward-compatibility guarantee:** The library MUST support deserialization of all prior schema versions from version 1 through the current version. There is no minimum version window — all versions are supported indefinitely. This guarantee reflects the reality that GxP audit records may be retained for 15+ years (see `./05-alcoa-mapping.md`, Data Archival and Backup Requirements) and must remain interpretable across that entire period.

**Change classification:** Schema changes are classified as follows:

| Change Type | Definition | Backward Compatibility | Approval Required |
| --- | --- | --- | --- |
| **Additive** | New optional field added with a defined default value for migration from prior versions | Compatible — prior-version records are migrated by applying the default | Technical Lead |
| **Additive required** | New required field added with a computable default for prior versions | Compatible — prior-version records are migrated by computing the default | QA Reviewer |
| **Semantic** | Existing field's interpretation changes (e.g., units, precision) | Compatible only if the migration transformation is lossless | QA Reviewer |
| **Removal** | Field removed from the schema | Compatible — prior-version records retain the field during deserialization; the field is ignored in new-version serialization | QA Reviewer |
| **Type change** | Existing field's type changes (e.g., `number` to `string`) | NOT compatible without a migration transformation; requires documented justification and QA approval | QA Reviewer + Engineering Lead |

REQUIREMENT (CLK-AUD-018): Every schema version increment MUST be classified using the table above. The classification MUST be documented in the "Schema Version Upgrade Migration Path" section of this document and cross-referenced in the RTM.

REQUIREMENT (CLK-AUD-019): Schema changes classified as "Type change" MUST include a lossless migration transformation in the version-dispatching deserializer. If the transformation is lossy (information is discarded), the data loss MUST be explicitly approved by QA with a documented justification that the lost information is not GxP-relevant or is recoverable from other sources.

REQUIREMENT (CLK-AUD-020): The library MUST NOT remove support for deserializing any prior schema version. If a future circumstance makes continued support of a prior version technically infeasible, the removal MUST be treated as a breaking change requiring: (a) a documented migration tool that converts all records from the deprecated version to a supported version, (b) QA approval of the migration tool's correctness, (c) a minimum 12-month deprecation notice in the changelog before removal, and (d) re-execution of the RTM completeness audit (see `./08-requirements-traceability-matrix.md`).

REQUIREMENT (CLK-AUD-021): Schema evolution MUST NOT alter the canonical serialization of existing records. A `TemporalContext` serialized under schema version N, then deserialized and re-serialized under schema version N+1, MUST produce a byte-identical `canonicalInput` for digest computation. This ensures that `verifyTemporalContextDigest()` continues to validate records created under prior schema versions without re-computing digests.

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

REQUIREMENT (CLK-AUD-022): Each schema version upgrade MUST document:

1. **Added fields** — new fields with their default values for migration from prior versions.
2. **Removed fields** — fields that are no longer present, with justification.
3. **Changed fields** — fields with modified types or semantics, with the migration transformation.
4. **Migration safety** — confirmation that the migration is lossless (no data is discarded from prior-version records) or, if lossy, explicit QA approval of the data loss.

REQUIREMENT (CLK-AUD-023): Schema version migration documentation MUST be maintained in this section of the specification and cross-referenced in the RTM.

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

REQUIREMENT (CLK-AUD-024): GxP deployments MUST use the deserialization utilities for all audit trail reconstruction operations. Direct `JSON.parse()` without subsequent deserialization validation is NOT acceptable for GxP audit trail processing.

REQUIREMENT (CLK-AUD-025): When producing printed audit trail reports (per EU GMP Annex 11 Section 12.4), consumers MUST format `TemporalContext` records as follows:

1. `wallClockTimestamp` MUST be converted to ISO 8601 UTC format (e.g., `2026-02-13T14:30:00.123Z`).
2. `sequenceNumber` MUST be displayed as a decimal integer.
3. `monotonicTimestamp` MUST be displayed as a decimal number with explicit `ms` unit suffix.
4. The report MUST include a header identifying the `@hex-di/clock` schema version, the `ClockDiagnostics` at the time of record creation, and the date/time the report was generated.
5. If the report contains `OverflowTemporalContext` entries, they MUST be visually distinguished (e.g., highlighted or annotated) to alert reviewers to the overflow condition.

**Printed report formatting** is a consumer responsibility. `@hex-di/clock` defines the serialization schema and formatting requirements; consumers implement the rendering.

### Data Retention Responsibility Statement (21 CFR 211.180, EU GMP Annex 11 Section 17)

Retention of `TemporalContext`, `OverflowTemporalContext`, `ClockDiagnostics`, and `ClockSourceChangedEvent` records is the **responsibility of the consuming application**, not of the `@hex-di/clock` library. The clock library provides serialization/deserialization utilities (versioned JSON schemas, `deserializeTemporalContext()`, `deserializeOverflowTemporalContext()`, `deserializeClockDiagnostics()`) that support indefinite retention, but does not implement storage, archival, or retention enforcement.

REQUIREMENT (CLK-AUD-026): Consuming systems operating in GxP environments MUST define data retention periods for all clock-derived audit trail records per 21 CFR 211.180 and EU GMP Annex 11 Section 17. At minimum, retention periods MUST cover the applicable product lifecycle plus the regulatory retention period. Common industry minimums include:

| Record Type | Regulatory Basis | Minimum Retention |
|---|---|---|
| Pharmaceutical batch records | 21 CFR 211.180 | 1 year past product expiry date |
| Medical device records | 21 CFR 820.180 | 2 years past product expiry or 3 years past distribution, whichever is longer |
| Clinical trial data | ICH E6(R2) §8 | Per applicable regulatory authority (typically 15+ years) |
| Laboratory data (GLP) | 21 CFR 58.195 | Per study archive requirements |

REQUIREMENT (CLK-AUD-027): Consuming systems MUST document their retention policy in their computerized system validation plan, including: (a) the retention period for each record type, (b) the regulatory basis for the chosen period, (c) the storage mechanism and archival schedule, and (d) the procedure for record disposal after the retention period expires.

REQUIREMENT (CLK-AUD-028): Consuming systems MUST NOT rely on `@hex-di/clock` to enforce retention periods. The clock library produces temporal data; the consumer persists, archives, and retains it. Any assumption that the clock library manages retention is a compliance gap.

**Cross-reference:** See `alcoa-mapping.md` (Data Archival and Backup Requirements) for detailed archival, backup, and disaster recovery requirements applicable to clock-derived records.

### Data Retention Enforcement Utilities (21 CFR 211.180, EU GMP Annex 11 Section 17)

While data retention is a consumer responsibility (CLK-AUD-028), `@hex-di/clock` provides utility types and a validation function to help consuming applications enforce retention policies consistently. These utilities do NOT store or enforce retention — they provide a standardized structure and validation mechanism that consumers compose with their persistence layer.

```typescript
interface RetentionMetadata {
  readonly retentionPeriodDays: number;
  readonly retentionBasis: string; // e.g., '21 CFR 211.180', '21 CFR 820.180', 'ICH E6(R2)'
  readonly retentionStartDate: string; // ISO 8601 UTC date when the retention period begins
  readonly retentionExpiryDate: string; // ISO 8601 UTC computed expiry date
  readonly recordType: string; // e.g., 'batch-record', 'clinical-trial', 'laboratory'
}

interface RetentionValidationError {
  readonly _tag: "RetentionValidationError";
  readonly field: string;
  readonly message: string;
}

function validateRetentionMetadata(
  metadata: RetentionMetadata
): Result<RetentionMetadata, RetentionValidationError>;

function calculateRetentionExpiryDate(
  startDate: string,
  retentionPeriodDays: number
): string; // Returns ISO 8601 UTC date
```

**Behavioral contract:**

1. `validateRetentionMetadata()` verifies: (a) `retentionPeriodDays` is a positive integer, (b) `retentionBasis` is a non-empty string, (c) `retentionStartDate` and `retentionExpiryDate` are valid ISO 8601 dates, (d) `retentionExpiryDate` equals `retentionStartDate` + `retentionPeriodDays`, (e) `recordType` is a non-empty string. On failure, returns `Err(RetentionValidationError)`.
2. `calculateRetentionExpiryDate()` computes `startDate + retentionPeriodDays` and returns the result as an ISO 8601 UTC date string.
3. Both `RetentionMetadata` and `RetentionValidationError` objects MUST be frozen with `Object.freeze()`.

REQUIREMENT (CLK-AUD-029): `RetentionMetadata`, `RetentionValidationError`, `validateRetentionMetadata()`, and `calculateRetentionExpiryDate()` MUST be exported from the main entry point (`@hex-di/clock`).

REQUIREMENT (CLK-AUD-030): GxP consumers SHOULD compose `RetentionMetadata` with `TemporalContext` when persisting audit trail records:

```typescript
interface RetainableAuditEntry {
  readonly temporal: TemporalContext;
  readonly retention: RetentionMetadata;
  readonly digest: TemporalContextDigest;
  // ... attribution fields
}
```

REQUIREMENT (CLK-AUD-031): GxP consumers SHOULD call `validateRetentionMetadata()` before persisting any `RetainableAuditEntry` to ensure retention policy fields are structurally valid before the record enters the audit trail.

### Retention Policy Registration Port (21 CFR 211.180, EU GMP Annex 11 Section 17)

While data retention enforcement is a consumer responsibility (CLK-AUD-028), GxP deployments benefit from a compile-time and runtime mechanism that verifies retention policies are configured before audit-producing operations begin. `@hex-di/clock` provides a `RetentionPolicyPort` that consumers implement and register, enabling the clock library to verify at initialization that retention is addressed.

```typescript
interface RetentionPolicyPort {
  readonly getRetentionPeriodDays: (recordType: string) => number;
  readonly isRetentionConfigured: () => boolean;
  readonly getSupportedRecordTypes: () => ReadonlyArray<string>;
}
```

```typescript
const RetentionPolicyPort = createPort<RetentionPolicyPort>("RetentionPolicyPort");
```

**Behavioral contract:**

1. `getRetentionPeriodDays(recordType)` MUST return the retention period in days for the given record type, or throw `TypeError` synchronously if the record type is not configured. This is an exceptional case (programming error — the consumer passed a record type that was never registered) rather than a runtime failure, justifying the use of synchronous exceptions over `Result` types.
2. `isRetentionConfigured()` MUST return `true` if at least one record type has a retention policy configured, `false` otherwise.
3. `getSupportedRecordTypes()` MUST return a frozen array of all configured record types.
4. The `RetentionPolicyPort` implementation MUST be frozen with `Object.freeze()`.

REQUIREMENT (CLK-AUD-031a): `RetentionPolicyPort` MUST be exported from the `@hex-di/clock` main entry point as a port definition.

REQUIREMENT (CLK-AUD-031b): GxP consumers MUST register a `RetentionPolicyPort` implementation in their DI container. When `createSystemClockAdapter({ gxp: true })` is used, the library SHOULD emit a warning to stderr if `RetentionPolicyPort` is not registered in the container, alerting operators that retention enforcement is not configured.

REQUIREMENT (CLK-AUD-031c): The `RetentionPolicyPort` is an **advisory mechanism**, not a blocking requirement. The absence of a registered `RetentionPolicyPort` does NOT prevent `TemporalContextFactory.create()` from operating. The warning serves as a deployment-time reminder for GxP operators to verify that retention policies are in place.

#### Retention Enforcement Consumption Example (Informative)

The following consumer-implemented pattern demonstrates how to compose `RetentionMetadata` with `TemporalContext` for a pharmaceutical batch record:

```typescript
// Consumer-implemented: compose retention metadata with audit entry
function createRetainableAuditEntry(
  factory: TemporalContextFactory,
  recordType: string,
  regulatoryBasis: string,
  retentionDays: number
): Result<RetainableAuditEntry, SequenceOverflowError | RetentionValidationError> {
  const contextResult = factory.create();
  if (contextResult._tag === "Err") return contextResult;

  const startDate = new Date(contextResult.value.wallClockTimestamp).toISOString();

  const retention: RetentionMetadata = Object.freeze({
    retentionPeriodDays: retentionDays,
    retentionBasis: regulatoryBasis,
    retentionStartDate: startDate,
    retentionExpiryDate: calculateRetentionExpiryDate(startDate, retentionDays),
    recordType,
  });

  // Validate before persisting (CLK-AUD-031)
  const validationResult = validateRetentionMetadata(retention);
  if (validationResult._tag === "Err") return validationResult;

  const digest = computeTemporalContextDigest(contextResult.value);

  return ok(Object.freeze({
    temporal: contextResult.value,
    retention: validationResult.value,
    digest,
  }));
}

// Usage: pharmaceutical batch record (21 CFR 211.180 — 1 year post-expiry)
const entry = createRetainableAuditEntry(
  factory,
  "batch-record",
  "21 CFR 211.180",
  365 + 1095 // 1 year post-expiry; assuming 3-year product shelf life = 4 years total
);

// Usage: clinical trial record (ICH E6(R2) — 2 years post-approval)
const trialEntry = createRetainableAuditEntry(
  factory,
  "clinical-trial",
  "ICH E6(R2)",
  730 // 2 years minimum
);
```

### Audit Trail Review Procedures (21 CFR 11.10(e), EU GMP Annex 11 Section 9)

21 CFR 11.10(e) requires procedures for generating accurate and complete copies of records for FDA inspection. EU GMP Annex 11 Section 9 requires regular checks of audit trail content. This section provides guidance on audit trail review frequency and methodology for consumers using `@hex-di/clock`-derived temporal data.

REQUIREMENT (CLK-AUD-032): GxP organizations MUST define audit trail review procedures in their SOPs that address:

1. **Review frequency**: Routine audit trail reviews MUST occur at intervals commensurate with the criticality of the data:

| Data Criticality | Recommended Review Frequency | Example |
|---|---|---|
| GxP-critical batch records | Per batch release (before release) | Pharmaceutical manufacturing records |
| GxP-critical continuous processes | Weekly | Continuous manufacturing, environmental monitoring |
| Supporting GxP records | Monthly | System administration logs, configuration changes |
| Development/non-GxP | Quarterly or on-demand | Development and testing environments |

2. **Review methodology**: Each review MUST include:
   - Verification that all `TemporalContext` records within the review period have valid sequence number ordering (no gaps, no duplicates).
   - Verification of per-record integrity using `verifyTemporalContextDigest()` on a representative sample (RECOMMENDED: at least 10% of records or 100 records, whichever is greater).
   - Identification of any `OverflowTemporalContext` entries (search for `_tag: "OverflowTemporalContext"` or `sequenceNumber: -1`).
   - Verification that NTP wall-clock timestamps are plausible (no dates before deployment, no future-dated records).
   - Review of any non-monotonic wall-clock timestamp sequences (informational — see CLK-AUD-013).

3. **Review documentation**: Each review MUST produce a signed review record containing: the reviewer identity, review date, review period covered, number of records reviewed, number of integrity checks performed, findings (if any), and disposition.

REQUIREMENT (CLK-AUD-033): GxP organizations MUST designate qualified personnel (QA Reviewer or GxP Validation Engineer) to perform audit trail reviews. The reviewer MUST NOT be the same individual who generated the records being reviewed.

### Data Migration Procedures (ALCOA+ Enduring, 21 CFR 11.10(b))

When migrating `TemporalContext` records between storage systems (e.g., database migration, cloud provider migration, archival to long-term storage), the following procedures ensure data integrity is maintained throughout the migration.

REQUIREMENT (CLK-AUD-034): Data migration of clock-derived audit trail records MUST follow a documented migration plan that includes:

1. **Pre-migration validation**: Compute and record aggregate statistics (total record count, min/max sequence numbers, first/last wall-clock timestamps) before migration begins. Verify per-record integrity on a representative sample using `verifyTemporalContextDigest()`.
2. **Schema version preservation**: All `schemaVersion` fields MUST be preserved exactly. Records MUST NOT be "upgraded" to a newer schema version during migration — schema version upgrades are a separate, controlled process requiring the deserialization utilities (see Schema Migration Strategy above).
3. **Digest preservation**: `TemporalContextDigest` records (including `canonicalInput`) MUST be migrated alongside their associated `TemporalContext` records. The migration MUST NOT recompute digests.
4. **Post-migration validation**: After migration, re-verify aggregate statistics (record count, sequence number range, timestamp range) against the pre-migration baseline. Re-verify per-record integrity on the same sample using `verifyTemporalContextDigest()`. Any discrepancy MUST halt the migration and trigger investigation.
5. **Migration audit record**: The migration itself MUST be recorded as an audit trail event with: migration source, migration target, migration date, record count, validation results, and migrator identity.
6. **Rollback capability**: The migration plan MUST include a rollback procedure that restores the original data store if post-migration validation fails.

REQUIREMENT (CLK-AUD-035): Data migrations MUST be approved through the organization's change control process (see § 6.3) before execution. The change control record MUST reference the migration plan and the post-migration validation results.

---


