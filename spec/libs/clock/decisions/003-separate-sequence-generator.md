# ADR-CK-003: Separate Sequence Generator

## Status

Accepted

## Context

Audit trail event ordering requires a mechanism that produces unique, monotonically increasing identifiers. Time-based ordering is insufficient because:

1. Platform timer resolution may be coarsened (e.g., Spectre mitigations reduce `performance.now()` to 5ms granularity).
2. Two events occurring within the same millisecond would receive identical timestamps.
3. NTP step corrections can cause wall-clock time to jump backward.

The question was whether to: (a) embed a counter inside `ClockPort`, (b) create a separate `SequenceGeneratorPort`, or (c) use UUIDs or other non-sequential identifiers.

## Decision

Create a separate `SequenceGeneratorPort` with a simple integer counter, independent of `ClockPort`. The port provides `next()` returning `Result<number, SequenceOverflowError>` and `current()`.

```typescript
interface SequenceGeneratorPort {
  readonly next: () => Result<number, SequenceOverflowError>;
  readonly current: () => number;
}
```

The sequence number is the authoritative ordering mechanism (see [CLK-ORD-001](../03-sequence-generator.md)). In `TemporalContextFactory.create()`, the sequence number is captured *before* timestamps to establish the happens-before relationship.

## Consequences

**Positive**:
- Ordering is independent of time precision — even with coarsened timers, sequence numbers are unique.
- Integer comparison (`a < b`) is simpler and faster than timestamp comparison.
- Separation enables independent testing and independent lifecycle management.
- The `Result` return type makes overflow explicit — no silent integer wraparound.

**Negative**:
- Two ports to register instead of one.
- Consumers must understand that sequence number, not timestamp, is the primary ordering key.
- Sequence numbers are scoped to a single process — multi-process deployments need `processInstanceId`.

**Trade-off accepted**: The additional port registration is minimal overhead. The explicit ordering guarantee (sequence numbers are always unique and always increasing) is more valuable than the simplicity of a combined clock+counter interface.
