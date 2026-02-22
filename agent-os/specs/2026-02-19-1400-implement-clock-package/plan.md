# Plan: Implement @hex-di/clock

**Spec:** SPEC-CLK-001 Rev 2.9 (`spec/libs/clock/`)
**Package:** `@hex-di/clock` at `libs/clock/core/`
**Date:** 2026-02-19

---

## Task 1: Save Spec Documentation

Create `agent-os/specs/2026-02-19-1400-implement-clock-package/` with:
- **plan.md** — this document
- **shape.md** — shaping notes and decisions
- **standards.md** — all 13 applicable standards
- **references.md** — spec section index and structural references

---

## Task 2: Scaffold Package

Create `libs/clock/core/` with all build infrastructure:

- `package.json` — `@hex-di/clock`, ESM, `sideEffects: false`, peer deps: `@hex-di/core`, `@hex-di/result`
- `tsconfig.json` + `tsconfig.build.json` — extend root tsconfig, strict mode
- `vitest.config.ts` — typecheck enabled
- `eslint.config.js` — extend shared config
- Directory skeleton: `src/ports/`, `src/adapters/`, `src/branded.ts` (placeholder), `src/testing/`, `tests/`
- Register in `pnpm-workspace.yaml` if not already auto-detected

---

## Task 3: Implement Ports

Implement all 6 port tokens in `src/ports/`:

**`src/ports/clock.ts`**
- `ClockInterface` (service interface: `monotonicNow()`, `wallClockNow()`, `highResNow()`)
- `ClockPort` — `port<ClockInterface>()({ name: "Clock", direction: "outbound", category: "clock/clock", ... })`

**`src/ports/sequence.ts`**
- `SequenceGeneratorInterface` (service interface: `next()`, `current()` — NO `reset()`)
- `SequenceOverflowError` type
- `SequenceGeneratorPort` — `port<SequenceGeneratorInterface>()(...)` with category `"clock/sequence"`

**`src/ports/timer-scheduler.ts`**
- `TimerHandle` opaque type (discriminated, not raw number)
- `TimerSchedulerInterface` (`setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`, `sleep`)
- `TimerSchedulerPort`

**`src/ports/cached-clock.ts`**
- `CachedClockInterface` (`recentMonotonicNow()`, `recentWallClockNow()`, `recentHighResNow()` — different names from ClockPort by design)
- `CachedClockLifecycle` interface (`start()`, `stop()`)
- `CachedClockPort`

**`src/ports/diagnostics.ts`**
- `ClockDiagnosticsInterface` (`getSource()`, `getSyncStatus()`, `getCapabilities()`, `getDiagnostics()`)
- `ClockCapabilities` interface
- `ClockGxPSuitability` type
- `ClockDiagnosticsPort`

**`src/ports/clock-source-changed.ts`**
- `ClockSourceChangedEvent` interface
- `ClockSourceChangedSinkInterface` (`onClockSourceChanged(event)`)
- `ClockSourceChangedSinkPort`

**`src/ports/index.ts`** — re-export all ports and interfaces

---

## Task 4: Implement Branded Types and Core Utilities

**`src/branded.ts`**
- `MonotonicTimestamp`, `WallClockTimestamp`, `HighResTimestamp` phantom brand types
- `MonotonicDuration`, `WallClockDuration` phantom brand types
- `asMonotonic()`, `asWallClock()`, `asHighRes()` — zero-cost identity branding utilities
- `toMonotonic()`, `toWallClock()`, `toHighRes()` — Result-returning validated branding
- `elapsed()` — monotonic duration computation
- Duration comparison utilities

**`src/temporal-context.ts`**
- `TemporalContext` interface (frozen)
- `OverflowTemporalContext` interface
- `SignableTemporalContext` interface (extends TemporalContext with `highResTimestamp`)
- `TemporalContextFactory` interface + `createTemporalContextFactory(clock, seq)` factory
- Capture ordering: `seq.next()` → `clock.monotonicNow()` → `clock.wallClockNow()` (spec §2.x)

**`src/signature-validation.ts`**
- `SignatureValidationError` type
- `validateSignableTemporalContext(ctx)` — MUST-enforce pre-persistence validation (21 CFR 11.50)

**`src/record-integrity.ts`**
- `TemporalContextDigest` interface (SHA-256, includes `canonicalInput`)
- `computeTemporalContextDigest(ctx)` — `Result<TemporalContextDigest, Error>`
- `computeOverflowTemporalContextDigest(ctx)` — `Result<TemporalContextDigest, Error>`
- `verifyTemporalContextDigest(ctx, digest)` — `Result<true, Error>`

**`src/deserialization.ts`**
- `deserializeTemporalContext(raw)` — `Result<TemporalContext, DeserializationError>`
- `deserializeOverflowTemporalContext(raw)` — `Result<OverflowTemporalContext, DeserializationError>`
- `deserializeClockDiagnostics(raw)` — `Result<ClockDiagnostics, DeserializationError>`

**`src/gxp-metadata.ts`**
- `ClockGxPMetadata` interface (`clockVersion`, `specRevision`, `requiredMonitoringVersion`)
- `getClockGxPMetadata()` — returns current metadata constants

---

## Task 5: Implement System Adapters (Core)

**`src/adapters/system-clock.ts`**
- `createSystemClock(options?)` — captures `performance.now`, `Date.now`, `performance.timeOrigin` at construction; anti-tampering closure; startup self-test (ST-1..ST-6); returns `Result<ClockInterface, StartupError>`
- `SystemClockAdapter` — exported adapter constant (singleton)
- `createSystemClockAdapter(options?)` — factory function for configured instances
- `SystemSequenceGeneratorAdapter` — exported adapter constant (singleton)
- `createSystemSequenceGenerator()` — creates frozen sequence generator

**Platform detection** (inline in adapter):
- Node.js, Browser (crossOriginIsolated detection), Deno, Bun detection
- `ClockCapabilities` population: `hasMonotonicTime`, `hasHighResOrigin`, `crossOriginIsolated`, `estimatedResolutionMs`, `platform`, `highResDegraded`, `monotonicDegraded`

**GxP source attestation** via `ClockDiagnosticsPort`:
- `SystemClockDiagnosticsAdapter` — adapter constant implementing `ClockDiagnosticsPort`

---

## Task 6: Implement Extended Adapters

**`src/adapters/system-timer.ts`**
- `SystemTimerSchedulerAdapter` — exported adapter constant (singleton)
- Anti-tampering: captures `globalThis.setTimeout`, `clearTimeout`, etc. at module load
- `TimerHandle` wraps internal ID

**`src/adapters/cached-clock.ts`**
- `SystemCachedClockAdapter` — exported adapter constant, requires `[ClockPort]`
- `createSystemCachedClockAdapter(options?)` — configurable cache interval
- Implements `CachedClockLifecycle` (start/stop interval)

**`src/adapters/edge-runtime-clock.ts`**
- `EdgeRuntimeClockAdapter` — exported adapter constant (singleton)
- `createEdgeRuntimeClockAdapter(options?)` — for Cloudflare Workers / Vercel Edge
- `highResNow()` degrades to `Date.now()` (no `performance.timeOrigin` in V8 isolates)
- ST-5 (startup implausibility check) skipped for edge adapters
- `ClockCapabilities`: `highResDegraded: true`, `monotonicDegraded: false`

**`src/adapters/host-bridge-clock.ts`**
- `HostClockBridge` interface (`monotonicNowMs()`, `wallClockNowMs()`)
- `createHostBridgeClockAdapter(bridge, options?)` — for React Native / WASM / embedded
- Behavioral contracts HB-1..HB-6

**`src/adapters/hardware-clock.ts`** (interface only, per spec §4.3)
- `HardwareClockAdapter` interface — for GPS/PTP/RTC air-gapped environments

**`src/adapters/index.ts`** — re-export all adapter constants and factory functions

---

## Task 7: Implement Virtual/Testing Adapters

**`src/testing/virtual-clock.ts`**
- `createVirtualClock(options?)` — manual time control
- `VirtualClockInterface` extends `ClockInterface` with: `advance(ms)`, `setTime(epoch)`, `setAutoAdvance(bool)`, `getAutoAdvance()`
- `createVirtualClock()` factory (transient)
- `VirtualClockAdapter` — adapter constant (transient)

**`src/testing/virtual-sequence.ts`**
- `VirtualSequenceGeneratorInterface` extends `SequenceGeneratorInterface` with `reset()`
- `createVirtualSequenceGenerator(options?)` — resets to 0, configurable start
- `VirtualSequenceGeneratorAdapter` — adapter constant (transient)

**`src/testing/virtual-timer.ts`**
- `VirtualTimerSchedulerInterface` — `blockUntil(predicate, options?)`, `runAllTimers()`, `runNextTimer()`
- `ClockTimeoutError` — thrown when `blockUntil` times out
- `createVirtualTimerScheduler(virtualClock)` — linked to VirtualClockAdapter time
- `VirtualTimerSchedulerAdapter` — adapter constant (transient, requires `[ClockPort]`)

**`src/testing/virtual-cached-clock.ts`**
- `VirtualCachedClockAdapter` — deterministic cached clock linked to VirtualClockAdapter
- `createVirtualCachedClock(virtualClock)` — factory

**`src/testing/index.ts`** — re-export all virtual adapters and factories

---

## Task 8: Wire Public API Surface

**`src/index.ts`** — banner-sectioned exports following `lib-index-structure` standard:

```
// Ports
// Core Types (branded types, TemporalContext, etc.)
// Adapters (Tier 1 + Tier 2 adapter constants)
// Utilities (branding utilities, TemporalContextFactory, GxP metadata)
// Testing Utilities (assertXxx helpers only — no virtual adapters here)
```

Virtual adapters (`VirtualClockAdapter`, etc.) are exported ONLY from `./testing` entry point.

**`src/testing/index.ts`** — all virtual adapters, factories, `ClockTimeoutError`

**`package.json` exports map:**
```json
{
  ".": "./src/index.ts",
  "./testing": "./src/testing/index.ts"
}
```

---

## Task 9: Write Core Tests (DoD 1–16)

Implement all tests for DoD groups 1–16 across 28 test files:

| DoD | File(s) | Coverage |
|---|---|---|
| 1 | `clock-port.test.ts`, `clock-port.test-d.ts` | ClockPort interface, port token |
| 2 | `sequence-generator.test.ts`, `sequence-generator.test-d.ts` | SequenceGeneratorPort, overflow |
| 3 | `system-clock.test.ts`, `system-clock-startup.test.ts`, `system-clock-fallback.test.ts`, `system-clock.test-d.ts` | SystemClockAdapter, startup self-test |
| 4 | `virtual-clock.test.ts` | VirtualClockAdapter, advance, auto-advance |
| 5 | `virtual-sequence.test.ts` | VirtualSequenceGenerator, reset |
| 6 | `clock-diagnostics.test.ts`, `clock-diagnostics.test-d.ts` | ClockDiagnosticsPort |
| 7 | `temporal-context.test.ts`, `temporal-context.test-d.ts` | TemporalContextFactory, capture ordering |
| 8 | `clock-source-change.test.ts`, `clock-source-change.test-d.ts` | ClockSourceChangedSinkPort audit event |
| 9 | `clock-source-bridge.test.ts`, `clock-source-bridge.test-d.ts` | Sink resilience (21 CFR 11.10(e)) |
| 10 | `graph-integration.test.ts`, `graph-integration.test-d.ts` | Graph registration, DI container |
| 11 | `signature-validation.test.ts`, `signature-validation.test-d.ts` | validateSignableTemporalContext |
| 12 | `record-integrity.test.ts`, `record-integrity.test-d.ts` | SHA-256 digest compute/verify |
| 13 | `deserialization.test.ts`, `deserialization.test-d.ts` | Deserialization utilities |
| 14 | `gxp-metadata.test.ts`, `gxp-metadata.test-d.ts` | getClockGxPMetadata() |
| 15 | `hardware-clock.test-d.ts` | HardwareClockAdapter interface (type-level only) |
| 16 | `gxp-clock.test.ts` | GxP startup self-test integration |

---

## Task 10: Write Extended Tests (DoD 17–26)

Implement tests for DoD groups 17–26 across 14 test files:

| DoD | File(s) | Coverage |
|---|---|---|
| 17 | `branded-timestamps.test.ts`, `branded-timestamps.test-d.ts` | All 5 phantom brands, branding utilities |
| 18 | `system-timer.test.ts`, `system-timer.test-d.ts` | SystemTimerSchedulerAdapter |
| 19–20 | `virtual-timer.test.ts`, `virtual-timer.test-d.ts` | VirtualTimerScheduler, blockUntil, ClockTimeoutError |
| 21–23 | `cached-clock.test.ts`, `cached-clock.test-d.ts` | SystemCachedClock + VirtualCachedClock |
| 24 | `clock-capabilities.test.ts`, `clock-capabilities.test-d.ts` | ClockCapabilities introspection |
| 25 | `edge-runtime-clock.test.ts`, `edge-runtime-clock.test-d.ts` | EdgeRuntimeClockAdapter |
| 26 | `host-bridge-clock.test.ts`, `host-bridge-clock.test-d.ts` | HostBridgeClockAdapter |

---

## Task 11: Write GxP Qualification Tests

Implement GxP-specific test files:

| File | Coverage |
|---|---|
| `gxp-iq-clock.test.ts` | IQ-1 through IQ-25: installation qualification steps |
| `gxp-oq-clock.test.ts` | OQ-1 through OQ-8: operational qualification (incl. negative cases OQ-6/7/8) |
| `gxp-pq-clock.test.ts` | PQ-1 through PQ-5: performance qualification |

These map to the qualification protocols in `spec/libs/clock/06-gxp-compliance/02-qualification-protocols.md`.

---

## Task 12: Workspace Integration

- Confirm `libs/clock/core` is in `pnpm-workspace.yaml` (auto-detected if `libs/**` is listed)
- Run `pnpm install` to link workspace package
- Add `@hex-di/clock` to the turbo pipeline if needed
- Run `pnpm --filter @hex-di/clock typecheck` — verify zero TypeScript errors
- Run `pnpm --filter @hex-di/clock test` — verify all 457 tests pass
- Run `pnpm --filter @hex-di/clock test:types` — verify all type-level tests pass
