# Roadmap

Planned future additions and enhancements for `@hex-di/clock`.

## NTP Monitoring Adapter

**Status**: Planned

**Scope**: A separate `@hex-di/clock-monitoring` package providing the ecosystem GxP monitoring adapter with NTP drift detection, periodic adapter integrity verification, and heartbeat monitoring. Implements the NC-1 through NC-7 contracts referenced in the clock specification.

**Deliverable**: TBD — separate specification in `spec/libs/clock-monitoring/`

## Hardware Clock Adapter Implementations

**Status**: Planned

**Scope**: Concrete `HardwareClockAdapter` implementations for specific hardware timing sources (GPS, PTP, RTC, atomic clock). The interface contracts (HC-1 through HC-7) are specified; concrete adapters for popular hardware need implementation.

**Deliverable**: TBD — community or deployment-specific implementations

## Hono Framework Clock Middleware

**Status**: Planned

**Scope**: A Hono middleware that injects `TemporalContext` into request context, providing per-request temporal correlation for audit trails. Similar to the existing Hono middleware in `@hex-di/logger`.

**Deliverable**: TBD

## Clock Replay Adapter

**Status**: Planned

**Scope**: A replay adapter that reads timestamps from a pre-recorded sequence (e.g., from a production log). Enables deterministic replay of time-dependent scenarios for debugging and root cause analysis.

**Deliverable**: TBD

## Cross-Process Sequence Coordination

**Status**: Planned

**Scope**: An optional coordination mechanism for generating globally unique sequence numbers across multiple processes without the `processInstanceId` composite key. Potentially using a shared atomic counter (Redis, database, or IPC).

**Deliverable**: TBD — requires architectural decision on coordination mechanism

## Performance Benchmark Suite

**Status**: In Progress

**Scope**: A comprehensive benchmark suite (Vitest `bench` mode) measuring adapter overhead per call, `TemporalContext` creation throughput, `computeTemporalContextDigest` latency, and cached clock amortization efficiency. Validates PQ-1 performance targets.

**Deliverable**: `tests/benchmarks/` directory — specified in [09-definition-of-done.md](09-definition-of-done.md)
