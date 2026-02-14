# 03 - Sequence Generator

## 3.1 SequenceGeneratorPort Interface

```typescript
interface SequenceGeneratorPort {
  readonly next: () => Result<number, SequenceOverflowError>;
  readonly current: () => number;
}
```

A `SequenceGeneratorPort` produces a monotonically increasing integer sequence, providing **total ordering** independent of clock precision.

The production port interface deliberately excludes `reset()`. Resetting a sequence generator in production would silently corrupt audit trail ordering by reintroducing previously-issued sequence numbers. Instead, `reset()` is available only on `VirtualSequenceGenerator` (the test-only subtype in `@hex-di/clock/testing`), making production adapters **structurally incapable** of being reset.

**GxP rationale (21 CFR 11.10(d), EU GMP Annex 11 section 12.1):** Protecting sequence integrity through interface design (compile-time enforcement) is stronger than runtime environment variable checks (`process.env.NODE_ENV`), which can be bypassed by any code mutating the global `process.env` object. A structurally safe interface eliminates an entire class of data integrity risk.

### Port Definition

```typescript
const SequenceGeneratorPort = createPort<SequenceGeneratorPort>("SequenceGeneratorPort");
```

### `next(): Result<number, SequenceOverflowError>`

Returns the next integer in the sequence and advances the internal counter, wrapped in `ok()`. When the counter has reached `Number.MAX_SAFE_INTEGER`, returns `err(SequenceOverflowError)`.

**Semantic contract:**

- The first call MUST return `ok(1)` (1-indexed, not 0-indexed).
- Each subsequent call MUST return `ok(value)` where `value` is strictly greater than the previous call: for any two calls `a = next()` then `b = next()`, the unwrapped value of `b` > `a` MUST hold.
- The unwrapped return value MUST be a safe integer (`Number.isSafeInteger(value)` returns `true`).
- Overflow behavior: when the counter reaches `Number.MAX_SAFE_INTEGER` (2^53 - 1), calling `next()` MUST return `err(createSequenceOverflowError(counter))`.

REQUIREMENT: `next()` MUST be thread-safe within a single JavaScript execution context. Concurrent microtask interleaving MUST NOT produce duplicate sequence numbers.

### `current(): number`

Returns the most recently generated sequence number without advancing the counter.

**Semantic contract:**

- Before the first `next()` call, `current()` MUST return `0`.
- After a `next()` call returns `N`, `current()` MUST return `N`.
- `current()` MUST NOT advance the counter.

### SequenceOverflowError

```typescript
interface SequenceOverflowError {
  readonly _tag: "SequenceOverflowError";
  readonly lastValue: number;
  readonly message: string;
}
```

REQUIREMENT: `SequenceOverflowError` MUST be constructed via a factory function and frozen with `Object.freeze()` to satisfy GxP error immutability requirements.

At `Number.MAX_SAFE_INTEGER`, integer arithmetic loses precision. Since sequence numbers are used for audit trail ordering, producing an imprecise number would silently corrupt the ordering guarantee. Returning `err()` is the only safe behavior.

In practice, overflow is unreachable: at 1 million `next()` calls per second, `Number.MAX_SAFE_INTEGER` would be reached after ~285,000 years.

### Overflow Recovery and Post-Overflow Behavior

REQUIREMENT: When `next()` returns `err(SequenceOverflowError)`, the generator MUST remain in the overflow state permanently. All subsequent `next()` calls MUST return the same `err(SequenceOverflowError)`. The generator MUST NOT silently wrap around, return `ok(NaN)`, or return `ok()` with the same value twice.

REQUIREMENT: `current()` MUST continue to return `Number.MAX_SAFE_INTEGER` after overflow.

**Recovery path:** The production `SequenceGeneratorPort` has no recovery mechanism by design (structural irresettability). If overflow occurs, the application MUST be restarted with a new generator instance. Creating a new `SystemSequenceGenerator` via `createSystemSequenceGenerator()` produces a fresh counter starting from `0`.

**Monitoring guidance (GxP: 21 CFR 11.10(e)):** Although overflow requires ~285,000 years at sustained maximum throughput, GxP validation requires documented handling of all error paths. Consumers SHOULD implement a capacity monitoring mechanism:

```typescript
// Example: capacity warning at configurable threshold
const CAPACITY_WARNING_THRESHOLD = Number.MAX_SAFE_INTEGER * 0.9;

function nextWithMonitoring(
  seq: SequenceGeneratorPort,
  onWarning: (current: number) => void
): Result<number, SequenceOverflowError> {
  const result = seq.next();
  return result.map(value => {
    if (value >= CAPACITY_WARNING_THRESHOLD) {
      onWarning(value);
    }
    return value;
  });
}
```

This monitoring is a consumer responsibility, not a `@hex-di/clock` responsibility. The clock library provides the error; the consumer provides the monitoring and alerting infrastructure.

REQUIREMENT: When `next()` returns `err(SequenceOverflowError)`, the error MUST include the `lastValue` field set to `Number.MAX_SAFE_INTEGER`, enabling consumers to distinguish overflow from other error types for audit trail logging.

## 3.2 Ordering Guarantees

### Sequence Numbers vs. Timestamps

| Property             | Sequence Number (`next()`)        | Monotonic Time (`monotonicNow()`)     |
| -------------------- | --------------------------------- | ------------------------------------- |
| **Uniqueness**       | Guaranteed unique per generator   | NOT guaranteed (platform may coarsen) |
| **Total ordering**   | Yes (strict `>` between calls)    | Weak (may produce equal values)       |
| **Cross-process**    | No (scoped to generator instance) | No (scoped to process)                |
| **Calendar meaning** | None                              | None (relative to process start)      |

REQUIREMENT: When both a sequence number and a monotonic timestamp are captured for the same event (e.g., an HTTP audit history entry), the `sequenceNumber` MUST be the authoritative ordering mechanism. The monotonic timestamp is supplementary metadata.

This addresses GxP finding m-01: even when `performance.now()` is coarsened to 1ms or 2ms (Spectre mitigation), the sequence number provides unambiguous ordering.

### Happens-Before Relationship

If event A calls `next()` and then event B calls `next()` within the same generator instance, event A's sequence number is strictly less than event B's. This provides a **happens-before** relationship for events within a scope.

For events across different generator instances (e.g., different containers or different scopes), no ordering guarantee exists. Cross-scope ordering requires wall-clock timestamps and the consumer MUST accept the reduced precision.

## 3.3 Scoped Sequences

### Per-Container Sequences

Each HexDI container scope MAY have its own `SequenceGeneratorPort` instance. When a child container is created, it receives a **new** sequence generator starting from `1`, not a continuation of the parent's sequence.

This design choice reflects the fact that sequence numbers provide ordering within a scope, and child container operations are logically independent from parent container operations.

### Shared Sequences

When cross-scope ordering is required (e.g., a global HTTP audit trail), a single `SequenceGeneratorPort` instance SHOULD be registered in the root container and shared across all scopes via container inheritance.

```typescript
// Root container: shared global sequence
const graph = createGraph().provide(SequenceGeneratorPort, () => createSystemSequenceGenerator());

// All child containers inherit the same SequenceGeneratorPort instance
// because SequenceGeneratorPort is registered as singleton in root
```

### Naming Convention

When multiple sequence generators coexist (e.g., one for HTTP audit, one for tracing spans), they SHOULD be distinguished via named registrations or wrapper ports:

```typescript
const HttpAuditSequence = createPort<SequenceGeneratorPort>("HttpAuditSequence");
const TracingSequence = createPort<SequenceGeneratorPort>("TracingSequence");
```

### Multi-Process Deployments

Sequence numbers produced by `SequenceGeneratorPort` are scoped to a single generator instance within a single process. In horizontally scaled GxP deployments (multiple Node.js processes, Kubernetes pods, or serverless invocations), independent generator instances will produce overlapping sequence ranges. Multi-process disambiguation requires a process-unique identifier. This is a consumer responsibility — the clock library provides per-process temporal ordering; the consumer provides the cross-process disambiguation layer.

REQUIREMENT: Horizontally scaled GxP consumers MUST include a process-unique identifier alongside the `TemporalContext` in every audit entry to disambiguate events from different generator instances.

**Identifier options:**

| Identifier   | Source                                    | Pros                                       | Cons                                                                  |
| ------------ | ----------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------- |
| Hostname     | `os.hostname()`                           | Stable within a VM/container               | Not unique across container restarts with same hostname               |
| Container ID | `/proc/self/cgroup` or `HOSTNAME` env var | Unique per container instance              | Platform-specific, not available in all runtimes                      |
| Startup UUID | `crypto.randomUUID()` at process init     | Universally unique, no platform dependency | No human-readable meaning; must be logged at startup for traceability |

REQUIREMENT: The process-unique identifier MUST be captured once at process startup and reused for the entire process lifetime. Generating a new identifier per-request would defeat the purpose of correlating events within a process.

### Process Recovery and Sequence Continuity

After a process restart, a new `SystemSequenceGenerator` created via `createSystemSequenceGenerator()` starts from 1. This is expected behavior, not a defect. The production sequence generator has no persistence layer and no recovery mechanism — each process lifetime gets an independent sequence space.

REQUIREMENT: Consumers MUST use the composite key `(processInstanceId, sequenceNumber)` for globally unique event ordering across process lifetimes. The `processInstanceId` disambiguates events from different process lifetimes, while the `sequenceNumber` provides total ordering within a single process lifetime.

Gaps in the global sequence space across process lifetimes are expected and do not violate ALCOA+ Complete. ALCOA+ Complete requires that all events are recorded; it does not require that sequence numbers form a contiguous global series. Each process lifetime produces a contiguous series starting from 1, and the `processInstanceId` identifies which series an event belongs to.

REQUIREMENT: Process restart events SHOULD be logged in the audit trail with the new process instance identifier and the wall-clock timestamp of the restart. This enables auditors to correlate sequence number resets with process lifecycle events and verify that no events were lost during the restart window.

### Multi-Process Audit Trail Reconstruction

The audit trail reconstruction algorithm for multi-process deployments follows these steps:

1. **Group** entries by `processInstanceId` before applying sequence-based ordering.
2. **Sort** within each process group by `sequenceNumber` (authoritative ordering).
3. **Verify** per-process sequence continuity and flag gaps (possible data loss).
4. **Interleave** across processes using `wallClockTimestamp` for best-effort global ordering (acknowledging NTP-dependent precision).

The full worked example — including a 3-process scenario with crash/restart, raw audit entries, reconstruction code, and reconstructed timeline table — is maintained in `spec/guard/17-gxp-compliance/09-validation-plan.md` (appendix "Validated Multi-Process Audit Trail Example").

REQUIREMENT: GxP organizations MUST implement and validate an audit trail reconstruction procedure equivalent to the algorithm described above and demonstrated in the guard validation plan appendix.

REQUIREMENT: The reconstruction procedure MUST be documented in the computerized system validation plan and tested with representative data volumes during PQ.

**Scope note:** Full distributed sequencing (e.g., Snowflake IDs, ULID-based ordering) is outside the scope of `@hex-di/clock` v0.1.0. A consumer-provided process instance identifier provides sufficient disambiguation for multi-process GxP deployments; globally coordinated sequencing may be considered in future versions if demand warrants it.
