# @hex-di/clock Implementation — Shaping Notes

## Scope

Implement the `@hex-di/clock` package from scratch following the fully-approved spec at
`spec/libs/clock/` (SPEC-CLK-001, Rev 2.9).

The package lives at `libs/clock/core/` with npm package name `@hex-di/clock`.

**What's being built:**

- 5 ports: `ClockPort`, `SequenceGeneratorPort`, `TimerSchedulerPort`, `CachedClockPort`,
  `ClockDiagnosticsPort` + `ClockSourceChangedSinkPort`
- Phantom-branded numeric types: `MonotonicTimestamp`, `WallClockTimestamp`, `HighResTimestamp`,
  `MonotonicDuration`, `WallClockDuration` + branding utilities
- Core utilities: `TemporalContextFactory`, signature validation, record integrity (SHA-256),
  deserialization, GxP metadata
- System adapters: `SystemClockAdapter`, `SystemSequenceGeneratorAdapter`,
  `SystemTimerSchedulerAdapter`, `SystemCachedClockAdapter` (adapter constants + factory fns)
- Platform adapters: `EdgeRuntimeClockAdapter`, `createHostBridgeClockAdapter`
- `HardwareClockAdapter` interface (air-gapped environments)
- Virtual/testing adapters: `VirtualClockAdapter` (auto-advance), `VirtualSequenceGenerator`
  (with reset), `VirtualTimerScheduler` (blockUntil, ClockTimeoutError), `VirtualCachedClock`
- Clock source override audit events: `ClockSourceChangedEvent`, `ClockSourceChangedSinkPort`
- Full public API surface: `index.ts` (Tier 1/2/3) + `testing/index.ts`
- 457 tests across 46 test files (DoD 1–26 + GxP qualification tests)

**Not in scope (v0.1.0):**

- No React sub-package (`@hex-di/clock-react`) — spec does not define one
- No vendor backends — clock has no external vendor deps
- Migration of consumer packages (`@hex-di/runtime`, `@hex-di/tracing`, etc.) to use ClockPort
  is a separate task

## Decisions

- Package location: `libs/clock/core/` (follows libs/ convention, no sub-packages needed for v0.1.0)
- Package name: `@hex-di/clock`
- The testing utilities live under `./testing` export (separate entry point) — matches spec §1.4
- `CachedClockPort` does NOT extend `ClockPort` structurally — uses `recentMonotonicNow()` /
  `recentWallClockNow()` / `recentHighResNow()` to enforce semantic distinction (spec §2.7, decision 007)
- `SequenceGeneratorPort` has no `reset()` — structural irresettability (spec §3.1, decision 006)
- All fallible operations return `Result<T, E>` from `@hex-di/result`
- Phantom brands use `unique symbol` intersection pattern (zero runtime cost)
- `SystemClockAdapter` et al. are exported as adapter constants (not `provide*` helpers) — Rev 2.8 decision

## Context

- **Visuals:** None — spec is comprehensive
- **References:** None specified — spec is self-contained
- **Product alignment:** N/A (no agent-os/product folder)

## Standards Applied

- `libs/lib-src-layout` — src/ directory structure
- `libs/lib-index-structure` — banner-sectioned index.ts
- `libs/lib-dependencies` — peerDependencies for @hex-di/* packages
- `libs/lib-sub-packages` — split rules (core/testing sub-packages)
- `ports/port-factory-api` — port() builder pattern, all metadata required
- `ports/port-category` — "clock/clock", "clock/sequence", "clock/timer", "clock/cached-clock",
  "clock/diagnostics" etc.
- `ports/port-direction` — all clock ports are outbound
- `adapters/adapter-factory-vs-class` — factory style for all adapters
- `adapters/adapter-lifetime` — singleton for system adapters, transient for virtual adapters
- `adapters/adapter-deps-access` — deps accessed by port name field
- `graph/graph-composition-flow` — GraphBuilder.create().provide().build() pattern
- `testing/test-container-setup` — full inline pipeline per test, no shared helpers
- `testing/test-memory-adapters` — virtual adapters follow same pattern (transient lifetime)
