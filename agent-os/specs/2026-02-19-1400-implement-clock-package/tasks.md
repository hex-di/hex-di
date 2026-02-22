# Task Breakdown: Implement @hex-di/clock

## Overview

**Spec:** SPEC-CLK-001 Rev 2.9 (`spec/libs/clock/`)
**Package:** `@hex-di/clock` at `libs/clock/core/`
**Total Tasks:** 12

---

## Task List

### Infrastructure

#### Task 1: Save Spec Documentation
**Dependencies:** None

- [x] 1.0 Confirm spec folder is fully populated
  - [x] 1.1 Verify `agent-os/specs/2026-02-19-1400-implement-clock-package/` contains:
    - `plan.md` — implementation plan (this document's source)
    - `shape.md` — shaping notes and decisions
    - `standards.md` — all 13 applicable standards
    - `tasks.md` — this file
  - [x] 1.2 Verify references to spec sections are consistent:
    - `spec/libs/clock/01-overview.md`
    - `spec/libs/clock/02-clock-port.md`
    - `spec/libs/clock/03-sequence-generator.md`
    - `spec/libs/clock/04-platform-adapters.md`
    - `spec/libs/clock/05-testing-support.md`
    - `spec/libs/clock/07-integration.md`
    - `spec/libs/clock/08-api-reference.md`
    - `spec/libs/clock/09-definition-of-done.md`

**Acceptance Criteria:**
- All spec artifacts are in place and accessible

---

#### Task 2: Scaffold Package
**Dependencies:** Task 1

- [x] 2.0 Create `libs/clock/core/` package scaffold
  - [x] 2.1 Create `libs/clock/core/package.json`
    - `name`: `"@hex-di/clock"`
    - `version`: `"0.1.0"`
    - `type`: `"module"`
    - `sideEffects`: `false`
    - `peerDependencies`: `{ "@hex-di/core": "workspace:*", "@hex-di/result": "workspace:*" }`
    - `devDependencies`: `{ "@hex-di/graph": "workspace:*", "@hex-di/runtime": "workspace:*" }`
    - `scripts`: `build`, `lint`, `test`, `test:watch`, `test:types`, `typecheck`
    - `exports`:
      ```json
      {
        ".": { "import": { "types": "./src/index.ts", "default": "./src/index.ts" } },
        "./testing": { "import": { "types": "./src/testing/index.ts", "default": "./src/testing/index.ts" } }
      }
      ```
    - `engines`: `{ "node": ">=18.0.0" }`
  - [x] 2.2 Create `libs/clock/core/tsconfig.json`
    - Extend root tsconfig
    - Strict mode
    - `"include": ["src", "tests"]`
  - [x] 2.3 Create `libs/clock/core/tsconfig.build.json`
    - Extend `tsconfig.json`
    - `"include": ["src"]`, `"exclude": ["tests"]`
    - Output to `dist/`
  - [x] 2.4 Create `libs/clock/core/vitest.config.ts`
    - Typecheck enabled (`typecheck: { enabled: true }`)
    - Include `tests/**/*.test.ts` and `tests/**/*.test-d.ts`
  - [x] 2.5 Create `libs/clock/core/eslint.config.js`
    - Extend shared root ESLint config
  - [x] 2.6 Create directory skeleton:
    - `libs/clock/core/src/ports/`
    - `libs/clock/core/src/adapters/`
    - `libs/clock/core/src/testing/`
    - `libs/clock/core/tests/`
    - `libs/clock/core/tests/benchmarks/`
  - [x] 2.7 Verify `libs/**` glob in `pnpm-workspace.yaml` covers `libs/clock/core` (auto-detected; no manual addition needed unless workspace file uses explicit paths)
  - [x] 2.8 Run `pnpm install` to link the workspace package and verify no resolution errors

**Acceptance Criteria:**
- `pnpm --filter @hex-di/clock typecheck` resolves without "package not found" errors
- Directory structure matches `spec/libs/clock/01-overview.md §1.4`
- `sideEffects: false` and `"type": "module"` are set

---

### Core Implementation

#### Task 3: Implement Ports
**Dependencies:** Task 2

- [x] 3.0 Write 4 focused tests for port structure, then implement all 6 port tokens
  - [x] 3.1 Write 4 focused tests covering critical port behaviors
    - `libs/clock/core/tests/clock-port.test.ts`: ClockPort is a directed port with name `"Clock"`, has the 3 expected methods
    - `libs/clock/core/tests/sequence-generator.test.ts`: SequenceGeneratorPort has `next` and `current` but NOT `reset`
    - Keep to 4 tests maximum at this stage — do not write exhaustive coverage yet
  - [x] 3.2 Implement `libs/clock/core/src/ports/clock.ts`
    - `ClockInterface`: `{ readonly monotonicNow: () => MonotonicTimestamp; readonly wallClockNow: () => WallClockTimestamp; readonly highResNow: () => HighResTimestamp; }`
    - `ClockPort` using `port<ClockInterface>()({ name: "Clock", direction: "outbound", category: "clock/clock", description: "...", tags: ["clock", "timing", "monotonic"] })`
    - Note: the port token variable is named `ClockPort`; the service interface is also named `ClockInterface` internally but re-exported as the shape of the port
  - [x] 3.3 Implement `libs/clock/core/src/ports/sequence.ts`
    - `SequenceGeneratorInterface`: `{ readonly next: () => Result<number, SequenceOverflowError>; readonly current: () => number; }` — NO `reset()` method
    - `SequenceOverflowError` interface: `{ readonly _tag: "SequenceOverflowError"; readonly lastValue: number; readonly message: string; }`
    - `SequenceGeneratorPort` using `port<SequenceGeneratorInterface>()({ name: "SequenceGenerator", direction: "outbound", category: "clock/sequence", ... })`
  - [x] 3.4 Implement `libs/clock/core/src/ports/timer-scheduler.ts`
    - `TimerHandle` interface: `{ readonly _tag: "TimerHandle"; readonly id: number; }` (opaque, frozen at creation)
    - `TimerSchedulerInterface`: `{ setTimeout, setInterval, clearTimeout, clearInterval, sleep }`
    - `TimerSchedulerPort` using `port<TimerSchedulerInterface>()({ name: "TimerScheduler", direction: "outbound", category: "clock/timer", ... })`
  - [x] 3.5 Implement `libs/clock/core/src/ports/cached-clock.ts`
    - `CachedClockInterface`: `{ readonly recentMonotonicNow: () => MonotonicTimestamp; readonly recentWallClockNow: () => WallClockTimestamp; }` — intentionally DIFFERENT method names from `ClockInterface`, NO `recentHighResNow()`
    - `CachedClockLifecycle`: `{ readonly start: () => void; readonly stop: () => void; readonly isRunning: () => boolean; }`
    - `CachedClockAdapter` type alias: `CachedClockInterface & CachedClockLifecycle`
    - `CachedClockPort` using `port<CachedClockInterface>()({ name: "CachedClock", direction: "outbound", category: "clock/cached-clock", ... })`
  - [x] 3.6 Implement `libs/clock/core/src/ports/diagnostics.ts`
    - `ClockDiagnostics` interface: `{ readonly adapterName: string; readonly monotonicSource: "performance.now" | "Date.now-clamped" | "host-bridge"; readonly highResSource: "performance.timeOrigin+now" | "Date.now" | "host-bridge" | "host-bridge-wallclock"; readonly platformResolutionMs: number | undefined; readonly cryptoFipsMode: boolean | undefined; }`
    - `ClockCapabilities` interface: 7 fields (`hasMonotonicTime`, `hasHighResOrigin`, `crossOriginIsolated`, `estimatedResolutionMs`, `platform`, `highResDegraded`, `monotonicDegraded`)
    - `ClockGxPSuitability` type: `"suitable" | "suitable-degraded" | "not-suitable"`
    - `ClockDiagnosticsInterface`: `{ readonly getDiagnostics: () => ClockDiagnostics; readonly getCapabilities: () => ClockCapabilities; }`
    - `ClockDiagnosticsPort` using `port<ClockDiagnosticsInterface>()({ name: "ClockDiagnostics", direction: "outbound", category: "clock/diagnostics", ... })`
  - [x] 3.7 Implement `libs/clock/core/src/ports/clock-source-changed.ts`
    - `ClockSourceChangedEvent` interface: `{ readonly _tag: "ClockSourceChanged"; readonly previousAdapter: string; readonly newAdapter: string; readonly timestamp: string; readonly reason: string; }`
    - `ClockSourceChangedSinkInterface`: `{ readonly onClockSourceChanged: (event: ClockSourceChangedEvent) => void; }`
    - `ClockSourceChangedSinkPort` using `port<ClockSourceChangedSinkInterface>()({ name: "ClockSourceChangedSink", direction: "outbound", category: "clock/source-changed", ... })`
  - [x] 3.8 Implement `libs/clock/core/src/ports/retention-policy.ts`
    - `RetentionPolicyInterface`: `{ readonly getRetentionPeriodDays: (recordType: string) => number; readonly isRetentionConfigured: () => boolean; readonly getSupportedRecordTypes: () => ReadonlyArray<string>; }`
    - `RetentionPolicyPort` using `port<RetentionPolicyInterface>()({ name: "RetentionPolicy", direction: "outbound", category: "clock/retention", ... })`
  - [x] 3.9 Create `libs/clock/core/src/ports/index.ts`
    - Re-export all port tokens and their associated interfaces/types
  - [x] 3.10 Ensure port tests pass
    - Run only the 4 tests written in 3.1
    - Verify TypeScript compiles cleanly for `src/ports/`

**Acceptance Criteria:**
- The 4 tests from 3.1 pass
- All 6 port tokens use `port<T>()({...})` builder pattern
- All port categories follow `"clock/<role>"` format
- All port directions are `"outbound"`
- `CachedClockInterface` is NOT structurally assignable to `ClockInterface` (different method names)
- `SequenceGeneratorInterface` has no `reset()` method

---

#### Task 4: Implement Branded Types and Core Utilities
**Dependencies:** Task 3

- [x] 4.0 Write 6 focused tests for branded types and core utilities, then implement
  - [x] 4.1 Write 6 focused tests covering critical utility behaviors
    - `libs/clock/core/tests/branded-timestamps.test.ts` (3 tests): `asMonotonic` is identity at runtime, cross-domain assignment blocked at type level, `asMonotonicValidated` returns `err` for negative ms
    - `libs/clock/core/tests/temporal-context.test.ts` (2 tests): `createTemporalContextFactory().create()` returns sequence before monotonic before wallClock (capture ordering), returns `err(SequenceOverflowError)` when sequence is exhausted
    - `libs/clock/core/tests/record-integrity.test.ts` (1 test): `computeTemporalContextDigest` and `verifyTemporalContextDigest` roundtrip
  - [x] 4.2 Implement `libs/clock/core/src/branded.ts`
    - Phantom brand declarations using `unique symbol` (zero runtime cost):
      ```typescript
      declare const MonotonicBrand: unique symbol;
      declare const WallClockBrand: unique symbol;
      declare const HighResBrand: unique symbol;
      declare const MonotonicDurationBrand: unique symbol;
      declare const WallClockDurationBrand: unique symbol;
      ```
    - Type aliases: `MonotonicTimestamp`, `WallClockTimestamp`, `HighResTimestamp`, `MonotonicDuration`, `WallClockDuration`
    - Identity branding functions (zero-cost): `asMonotonic(ms)`, `asWallClock(ms)`, `asHighRes(ms)`, `asMonotonicDuration(ms)`, `asWallClockDuration(ms)`
    - Validated branding functions returning `Result<BrandedType, BrandingValidationError>`: `asMonotonicValidated(ms)` (checks `ms >= 0 && ms < 1e12`), `asWallClockValidated(ms)` (checks >= Y2K, <= now+1day), `asHighResValidated(ms)` (same as wallClock)
    - `BrandingValidationError` interface: `{ readonly _tag: "BrandingValidationError"; readonly expectedDomain: "monotonic" | "wallClock" | "highRes"; readonly value: number; readonly message: string; }`
    - `createBrandingValidationError(expectedDomain, value, message)` factory — returns `Object.freeze(...)` result
    - Duration utilities: `elapsed(clock: ClockPort, since: MonotonicTimestamp): MonotonicDuration`
    - Duration comparison: `durationGt(a, b)`, `durationLt(a, b)`, `durationBetween(value, min, max)`
  - [x] 4.3 Implement `libs/clock/core/src/temporal-context.ts`
    - `TemporalContext` interface: `{ readonly sequenceNumber: number; readonly monotonicTimestamp: MonotonicTimestamp; readonly wallClockTimestamp: WallClockTimestamp; }`
    - `OverflowTemporalContext` interface: `{ readonly _tag: "OverflowTemporalContext"; readonly sequenceNumber: -1; readonly lastValidSequenceNumber: number; readonly monotonicTimestamp: MonotonicTimestamp; readonly wallClockTimestamp: WallClockTimestamp; }`
    - `SignableTemporalContext` interface: extends `TemporalContext` with optional `signature: { readonly signerName: string; readonly signerId: string; readonly signedAt: string; readonly meaning: string; readonly method: string; }`
    - `TemporalContextFactory` interface: `{ readonly create: () => Result<TemporalContext, SequenceOverflowError>; readonly createOverflowContext: () => OverflowTemporalContext; }`
    - `createTemporalContextFactory(clock: ClockInterface, seq: SequenceGeneratorInterface): TemporalContextFactory` — capture ordering MUST be: `seq.next()` first, then `clock.monotonicNow()`, then `clock.wallClockNow()`; return `Object.freeze(context)`
    - `isOverflowTemporalContext(ctx)` type guard
  - [x] 4.4 Implement `libs/clock/core/src/signature-validation.ts`
    - `SignatureValidationError` interface: `{ readonly _tag: "SignatureValidationError"; readonly field: string; readonly message: string; }`
    - `createSignatureValidationError(field, message)` — returns `Object.freeze(...)`
    - `validateSignableTemporalContext(ctx: SignableTemporalContext): Result<SignableTemporalContext, SignatureValidationError>` — validates all 5 signature fields are non-empty strings when signature is present; returns `ok(ctx)` for unsigned contexts; enforces 21 CFR 11.50
  - [x] 4.5 Implement `libs/clock/core/src/record-integrity.ts`
    - `TemporalContextDigest` interface: `{ readonly _tag: "TemporalContextDigest"; readonly algorithm: "SHA-256"; readonly digest: string; readonly canonicalInput: string; }`
    - `computeTemporalContextDigest(ctx: TemporalContext): TemporalContextDigest` — canonical JSON serialization → SHA-256 hex → `Object.freeze(...)`
    - `computeOverflowTemporalContextDigest(ctx: OverflowTemporalContext): TemporalContextDigest`
    - `verifyTemporalContextDigest(ctx, digest): boolean` — constant-time comparison where feasible
    - Note: use `crypto.subtle.digest` (Web Crypto API, available Node 18+) or `node:crypto` `createHash`
  - [x] 4.6 Implement `libs/clock/core/src/deserialization.ts`
    - `DeserializationError` interface: `{ readonly _tag: "DeserializationError"; readonly schemaType: string; readonly expectedVersions: ReadonlyArray<number>; readonly actualVersion: number | undefined; readonly field: string | undefined; readonly message: string; }`
    - `createDeserializationError(...)` factory — `Object.freeze(...)`
    - `deserializeTemporalContext(raw: unknown): Result<TemporalContext, DeserializationError>` — validates shape, brands numeric fields
    - `deserializeOverflowTemporalContext(raw: unknown): Result<OverflowTemporalContext, DeserializationError>`
    - `deserializeClockDiagnostics(raw: unknown): Result<ClockDiagnostics, DeserializationError>`
  - [x] 4.7 Implement `libs/clock/core/src/gxp-metadata.ts`
    - `ClockGxPMetadata` interface: `{ readonly clockVersion: string; readonly specRevision: string; readonly requiredMonitoringVersion: string | undefined; }`
    - `getClockGxPMetadata(): ClockGxPMetadata` — returns `Object.freeze({ clockVersion: "0.1.0", specRevision: "2.9", requiredMonitoringVersion: undefined })`
  - [x] 4.8 Implement `libs/clock/core/src/retention.ts`
    - `RetentionMetadata` interface: `{ readonly retentionPeriodDays: number; readonly retentionBasis: string; readonly retentionStartDate: string; readonly retentionExpiryDate: string; readonly recordType: string; }`
    - `RetentionValidationError` interface: `{ readonly _tag: "RetentionValidationError"; readonly field: string; readonly message: string; }`
    - `createRetentionValidationError(field, message)` factory
    - `validateRetentionMetadata(metadata: RetentionMetadata): Result<RetentionMetadata, RetentionValidationError>`
    - `calculateRetentionExpiryDate(startDate: string, retentionPeriodDays: number): string`
  - [x] 4.9 Implement `libs/clock/core/src/process-instance.ts`
    - `createProcessInstanceId(): string` — format: `{hostname}-{timestamp}-{uuid}`; fallback when `os.hostname()` or `crypto.randomUUID()` is unavailable (see CLK-MPC-008); freeze result
  - [x] 4.10 Implement `libs/clock/core/src/async-combinators.ts`
    - `delay(scheduler: TimerSchedulerInterface, ms: number): Promise<void>` — delegates to `scheduler.sleep(ms)`; rejects `TypeError` for negative/NaN/Infinity
    - `timeout<T>(scheduler, promise, ms): Promise<T>` — races against timer; rejects with `ClockTimeoutError` (exported from testing); cleans up timer handle on settlement
    - `measure<T>(clock: ClockInterface, fn: () => T | Promise<T>): Promise<{ result: T; durationMs: number }>` — uses `monotonicNow()` for duration
    - `RetryOptions` interface: `{ maxAttempts: number; delayMs: number; backoffMultiplier?: number; maxDelayMs?: number; }`
    - `retry<T>(scheduler, fn, options): Promise<T>` — uses `scheduler.sleep()` between attempts; exponential backoff with `maxDelayMs` cap
  - [x] 4.11 Implement `libs/clock/core/src/temporal-interop.ts`
    - `toTemporalInstant(timestamp: WallClockTimestamp | HighResTimestamp): Temporal.Instant` — lazy Temporal detection at call time; throws `TypeError` if unavailable
    - `fromTemporalInstant(instant: Temporal.Instant): WallClockTimestamp` — `Number(instant.epochMilliseconds)` branded as `WallClockTimestamp`
  - [x] 4.12 Implement `libs/clock/core/src/clock-context.ts`
    - `ClockContext` interface: `{ readonly clock: ClockInterface; readonly sequenceGenerator: SequenceGeneratorInterface; }`
    - `createClockContext()` — creates `AsyncLocalStorage<ClockContext>`; lazy import of `node:async_hooks`; throws descriptive `TypeError` on unavailable platforms; `run()` calls `Object.freeze(ctx)` before storage
  - [x] 4.13 Ensure utility tests pass
    - Run only the 6 tests written in 4.1
    - Verify TypeScript compiles cleanly for all new source files

**Acceptance Criteria:**
- The 6 tests from 4.1 pass
- `asMonotonic`, `asWallClock`, `asHighRes` are identity functions at runtime (no wrapping, no validation)
- `asMonotonicValidated` etc. return `Result` types, never throw
- `TemporalContextFactory.create()` capture ordering: `seq.next()` → `monotonicNow()` → `wallClockNow()`
- All error objects are created via factory functions and frozen with `Object.freeze()`
- `computeTemporalContextDigest` roundtrips through `verifyTemporalContextDigest`

---

#### Task 5: Implement System Adapters (Core)
**Dependencies:** Task 4

- [x] 5.0 Write 6 focused tests for system adapters, then implement
  - [x] 5.1 Write 6 focused tests covering critical system adapter behaviors
    - `libs/clock/core/tests/system-clock.test.ts` (3 tests): `createSystemClock()` returns `ok()` on a healthy system; `monotonicNow()` returns non-decreasing values; `wallClockNow()` is within 10ms of `Date.now()`
    - `libs/clock/core/tests/system-clock-startup.test.ts` (2 tests): startup self-test ST-1 fails when monotonic is negative (mock); ST-2 fails when wall clock is before 2020 (mock)
    - `libs/clock/core/tests/system-clock-fallback.test.ts` (1 test): clamped fallback enforces monotonicity when `Date.now()` regresses
  - [x] 5.2 Implement `libs/clock/core/src/adapters/system-clock.ts`
    - `getPerformance(): PerformanceLike | undefined` — internal; uses `typeof` checks only (no try/catch)
    - `PerformanceLike` interface: `{ readonly now: () => number; readonly timeOrigin?: number; }`
    - `createClampedFallback(capturedDateNow: () => number): () => number` — internal; clamped monotonic fallback using captured reference
    - `SystemClockOptions` interface: `{ readonly gxp?: boolean; }`
    - `ClockStartupError` interface: `{ readonly _tag: "ClockStartupError"; readonly check: "ST-1" | "ST-2" | "ST-3" | "ST-4" | "ST-5"; readonly message: string; readonly observedValue: number; }`
    - `createClockStartupError(check, observedValue, message)` factory — `Object.freeze(...)`
    - `createSystemClock(options?: SystemClockOptions): Result<ClockInterface & ClockDiagnosticsInterface, ClockStartupError>`:
      - Capture `performance` and `Date.now` at construction time (SEC-1 anti-tampering)
      - Startup self-tests ST-1 through ST-5 (ST-4 only when `options?.gxp === true`; ST-5 skipped when no `timeOrigin`)
      - Populate `ClockCapabilities`: detect platform (`"node"`, `"browser"`, `"deno"`, `"bun"`, `"unknown"`), `crossOriginIsolated`, `estimatedResolutionMs`
      - Return `ok(Object.freeze({ monotonicNow, wallClockNow, highResNow, getDiagnostics, getCapabilities }))` or `err(ClockStartupError)`
    - `createSystemSequenceGenerator(): SequenceGeneratorInterface` — integer counter starting at 0; `next()` returns `ok(++counter)` or `err(SequenceOverflowError)` at `MAX_SAFE_INTEGER`; no `reset()`; `Object.freeze(...)`
    - `SystemClockAdapter` — pre-wired `createAdapter` constant:
      ```
      provides: ClockPort
      requires: []
      lifetime: "singleton"
      factory: () => { result = createSystemClock(); if err, throw; return result.value }
      ```
    - `SystemSequenceGeneratorAdapter` — pre-wired `createAdapter` constant:
      ```
      provides: SequenceGeneratorPort
      requires: []
      lifetime: "singleton"
      factory: () => createSystemSequenceGenerator()
      ```
    - `SystemClockDiagnosticsAdapter` — pre-wired `createAdapter` constant:
      ```
      provides: ClockDiagnosticsPort
      requires: [ClockPort]
      lifetime: "singleton"
      factory: (deps) => deps.Clock as ClockInterface & ClockDiagnosticsInterface
      ```
    - `createSystemClockAdapter(options?)` — factory function returning a configured `createAdapter(...)` constant
  - [x] 5.3 Ensure system adapter tests pass
    - Run only the 6 tests written in 5.1
    - Verify no TypeScript errors in `src/adapters/system-clock.ts`

**Acceptance Criteria:**
- The 6 tests from 5.1 pass
- `createSystemClock()` returns `ok()` on Node.js 18+ with valid system clock
- Platform API references captured at construction time, not at call time
- `createClampedFallback` accepts captured `Date.now` reference, does NOT access global `Date.now` directly
- `SystemClockAdapter` is `"singleton"` lifetime
- `SystemSequenceGeneratorAdapter` has no `reset()` on the returned object
- All returned objects frozen with `Object.freeze()`

---

#### Task 6: Implement Extended Adapters
**Dependencies:** Task 5

- [x] 6.0 Write 6 focused tests for extended adapters, then implement
  - [x] 6.1 Write 6 focused tests covering critical extended adapter behaviors
    - `libs/clock/core/tests/system-timer.test.ts` (2 tests): `TimerHandle` is frozen with `_tag: "TimerHandle"`; `clearTimeout` is idempotent on already-fired handle
    - `libs/clock/core/tests/cached-clock.test.ts` (2 tests): `recentMonotonicNow()` returns initial snapshot value before `start()`; `isRunning()` returns `true` after `start()` and `false` after `stop()`
    - `libs/clock/core/tests/edge-runtime-clock.test.ts` (1 test): `ClockCapabilities.highResDegraded` is `true`
    - `libs/clock/core/tests/host-bridge-clock.test.ts` (1 test): throws `TypeError` when `monotonicNowMs` is not a function
  - [x] 6.2 Implement `libs/clock/core/src/adapters/system-timer.ts`
    - `createSystemTimerScheduler(): TimerSchedulerInterface`:
      - Capture `globalThis.setTimeout/setInterval/clearTimeout/clearInterval` at construction (SEC-2 anti-tampering)
      - Internal `handleMap: Map<number, ReturnType<typeof capturedSetTimeout>>`
      - `setTimeout(callback, ms): TimerHandle` — validates ms non-negative; returns `Object.freeze({ _tag: "TimerHandle", id })`
      - `setInterval(callback, ms): TimerHandle` — validates ms positive (throws `TypeError` for 0/negative/Infinity)
      - `clearTimeout(handle): void` — idempotent; no-op for unknown/fired handles
      - `clearInterval(handle): void` — idempotent
      - `sleep(ms): Promise<void>` — uses captured `setTimeout`, not raw platform
      - `Object.freeze(...)` the returned scheduler
    - `SystemTimerSchedulerAdapter` — pre-wired `createAdapter` constant:
      ```
      provides: TimerSchedulerPort
      requires: []
      lifetime: "singleton"
      factory: () => createSystemTimerScheduler()
      ```
  - [x] 6.3 Implement `libs/clock/core/src/adapters/cached-clock.ts`
    - `CachedClockOptions` interface: `{ readonly source: ClockInterface; readonly updateIntervalMs?: number; }`
    - `createCachedClock(options: CachedClockOptions): CachedClockAdapter`:
      - `updateIntervalMs` defaults to `1`; throws `TypeError` for `<= 0`, `NaN`, `Infinity`
      - Perform one synchronous read of source at construction (CLK-CAC-008)
      - `start()`: begins background `setInterval`; no-op if already running
      - `stop()`: clears interval; no-op if already stopped
      - `isRunning()`: returns running state
      - `recentMonotonicNow()` and `recentWallClockNow()` return branded types
      - `Object.freeze(...)` the returned adapter (CLK-CAC-009)
    - `SystemCachedClockAdapter` — pre-wired `createAdapter` constant:
      ```
      provides: CachedClockPort
      requires: [ClockPort]
      lifetime: "singleton"
      factory: (deps) => { const adapter = createCachedClock({ source: deps.Clock }); adapter.start(); return adapter; }
      ```
  - [x] 6.4 Implement `libs/clock/core/src/adapters/edge-runtime-clock.ts`
    - `EdgeRuntimeClockOptions` interface: `{ readonly gxp?: boolean; }`
    - `createEdgeRuntimeClock(options?: EdgeRuntimeClockOptions): Result<ClockInterface & ClockDiagnosticsInterface, ClockStartupError>`:
      - Capture platform APIs at construction (same SEC-1 pattern)
      - `highResNow` degrades to `Date.now()` — no `timeOrigin` on V8 isolates
      - Runs ST-1, ST-2, ST-3, ST-4 (if GxP); skips ST-5 (highRes === wallClock by design)
      - `ClockCapabilities.highResDegraded`: `true`; `platform`: `"edge-worker"`
      - `ClockDiagnostics.adapterName`: `"EdgeRuntimeClockAdapter"`; `highResSource`: `"Date.now"`
      - `Object.freeze(...)` the returned adapter
    - `EdgeRuntimeClockAdapter` — pre-wired `createAdapter` constant (singleton)
    - `createEdgeRuntimeClockAdapter(options?)` — factory function returning a configured adapter constant
  - [x] 6.5 Implement `libs/clock/core/src/adapters/host-bridge-clock.ts`
    - `HostClockBridge` interface: `{ readonly monotonicNowMs: () => number; readonly wallClockNowMs: () => number; readonly highResNowMs?: () => number; }`
    - `HostBridgeClockOptions` interface: `{ readonly adapterName: string; readonly platform: "react-native" | "wasm" | "unknown"; readonly gxp?: boolean; }`
    - `createHostBridgeClock(bridge: HostClockBridge, options: HostBridgeClockOptions): Result<ClockInterface & ClockDiagnosticsInterface, ClockStartupError>`:
      - Validate `bridge.monotonicNowMs` and `bridge.wallClockNowMs` are functions at construction; throw `TypeError` if not
      - Capture bridge function references (HB-5)
      - Fallback `highResNow` to `bridge.wallClockNowMs` when `bridge.highResNowMs` is `undefined`
      - Startup self-tests: ST-1, ST-2, ST-3; ST-4 checks `Object.isFrozen(bridge)` in GxP mode; ST-5 only when `highResNowMs` provided
      - `ClockDiagnostics.monotonicSource`: `"host-bridge"`; `highResSource`: `"host-bridge"` or `"host-bridge-wallclock"`
      - `Object.freeze(...)` the returned adapter
    - `createHostBridgeClockAdapter(bridge, options)` — factory function returning a configured adapter constant
  - [x] 6.6 Implement `libs/clock/core/src/adapters/hardware-clock.ts`
    - Interface-only file (per spec §4.3 — no concrete implementation in v0.1.0)
    - `HardwareClockAdapterOptions` interface: `{ readonly adapterName: string; readonly gxp?: boolean; }`
    - `HardwareClockStatus` interface: `{ readonly locked: boolean; readonly estimatedAccuracyMs: number | undefined; readonly sourceType: "gps" | "ptp" | "rtc" | "atomic" | "custom"; readonly lastSyncCheckAt: number | undefined; }`
    - `HardwareClockAdapter` interface: extends `ClockInterface & ClockDiagnosticsInterface` + `readonly getHardwareStatus: () => HardwareClockStatus`
  - [x] 6.7 Create `libs/clock/core/src/adapters/index.ts`
    - Re-export all adapter constants, factory functions, and option types
  - [x] 6.8 Implement `libs/clock/core/src/periodic-evaluation.ts`
    - `PeriodicEvaluationConfig` interface
    - `setupPeriodicClockEvaluation(clock, diagnostics, timer, config): { readonly stop: () => void }` — uses `TimerSchedulerInterface` for interval; EU GMP Annex 11 Section 11 compliance
  - [x] 6.9 Ensure extended adapter tests pass
    - Run only the 6 tests written in 6.1

**Acceptance Criteria:**
- The 6 tests from 6.1 pass
- `SystemTimerSchedulerAdapter` is `"singleton"` lifetime
- `SystemCachedClockAdapter` calls `start()` automatically on resolution
- `EdgeRuntimeClockAdapter` has `highResDegraded: true` in capabilities
- `createHostBridgeClock` throws `TypeError` when bridge functions are not functions
- `HardwareClockAdapter` is interface-only — no factory function exported

---

#### Task 7: Implement Virtual/Testing Adapters
**Dependencies:** Task 5

- [x] 7.0 Write 6 focused tests for virtual adapters, then implement
  - [x] 7.1 Write 6 focused tests covering critical virtual adapter behaviors
    - `libs/clock/core/tests/virtual-clock.test.ts` (2 tests): `advance(100)` increments all three time functions by 100; `advance(-1)` returns `err(ClockRangeError)`
    - `libs/clock/core/tests/virtual-sequence.test.ts` (2 tests): `reset()` returns counter to 0 so next `next()` returns `ok(1)`; `setCounter(MAX_SAFE_INTEGER)` followed by `next()` returns `err(SequenceOverflowError)`
    - `libs/clock/core/tests/virtual-timer.test.ts` (2 tests): advancing clock fires pending `setTimeout` callbacks synchronously; `blockUntil(1)` resolves when a timer is registered
  - [x] 7.2 Implement `libs/clock/core/src/testing/virtual-clock.ts`
    - `VirtualClockOptions` interface: `{ readonly initialMonotonic?: number; readonly initialWallClock?: number; readonly initialHighRes?: number; readonly autoAdvance?: number; }`
    - `VirtualClockValues` interface: `{ readonly monotonic: number; readonly wallClock: number; readonly highRes: number; }`
    - `ClockRangeError` interface: `{ readonly _tag: "ClockRangeError"; readonly parameter: string; readonly value: number; readonly message: string; }`
    - `createClockRangeError(parameter, value, message)` factory — `Object.freeze(...)`
    - `VirtualClockAdapter` interface: extends `ClockInterface` with `advance(ms): Result<void, ClockRangeError>`, `set(values: Partial<VirtualClockValues>): void`, `jumpWallClock(ms): void`, `setAutoAdvance(ms): void`, `getAutoAdvance(): number`
    - `createVirtualClock(options?: VirtualClockOptions): VirtualClockAdapter`:
      - Throws `TypeError` for `NaN`, `Infinity`, `-Infinity` in options (NOT for negatives — those are valid test scenarios)
      - Default `initialWallClock`: `1707753600000` (2024-02-12T12:00:00Z)
      - `advance(ms)` rejects negative via `err(ClockRangeError)`
      - `set()` accepts any finite number; rejects `NaN/Infinity/-Infinity` with `TypeError`
      - `jumpWallClock(ms)` moves wall-clock and high-res without affecting monotonic
      - Auto-advance: when > 0, each time read advances after returning
      - NOT frozen (mutable state needed for control methods)
    - `VirtualClockAdapter` export (adapter constant — `"transient"` lifetime)
  - [x] 7.3 Implement `libs/clock/core/src/testing/virtual-sequence.ts`
    - `VirtualSequenceOptions` interface: `{ readonly startAt?: number; }`
    - `VirtualSequenceGenerator` interface: extends `SequenceGeneratorInterface` with `setCounter(value: number): void`, `reset(): void`
    - `createVirtualSequenceGenerator(options?: VirtualSequenceOptions): VirtualSequenceGenerator`:
      - `startAt` must be finite integer; throws `TypeError` for `NaN`, `Infinity`, non-integer
      - `reset()` returns counter to `startAt` (default 0) so next `next()` returns `ok(1)`
      - `setCounter(value)` accepts any finite value including negatives; rejects non-finite with `TypeError`
    - `VirtualSequenceGeneratorAdapter` export (adapter constant — `"transient"` lifetime)
  - [x] 7.4 Implement `libs/clock/core/src/testing/virtual-timer.ts`
    - `BlockUntilOptions` interface: `{ readonly timeoutMs?: number; }`
    - `ClockTimeoutError` interface: `{ readonly _tag: "ClockTimeoutError"; readonly expected: number; readonly actual: number; readonly timeoutMs: number; readonly message: string; }`
    - `createClockTimeoutError(expected, actual, timeoutMs)` factory — `Object.freeze(...)`
    - `VirtualTimerScheduler` interface: extends `TimerSchedulerInterface` with `pendingCount(): number`, `advanceTime(ms): void`, `runAll(): void`, `runNext(): void`, `blockUntil(n, options?): Promise<void>`
    - `createVirtualTimerScheduler(clock: VirtualClockAdapter): VirtualTimerScheduler`:
      - Maintains internal priority queue of pending timers
      - Registers `onAdvance` callback with the virtual clock
      - When clock advances by N ms, fires all timers with `scheduledTime <= currentTime + N` in chronological order (FIFO for ties)
      - `setInterval` fires multiple times within the advanced range
      - `blockUntil(n, options)`: resolves immediately if `pendingCount() >= n`; uses real `setTimeout` for its own timeout (not virtual time); rejects with `ClockTimeoutError` on timeout
      - `runAll()`: fires all pending timers; advances clock to last scheduled time
      - `runNext()`: fires next timer; advances clock to its scheduled time
  - [x] 7.5 Implement `libs/clock/core/src/testing/virtual-cached-clock.ts`
    - `createVirtualCachedClock(clock: VirtualClockAdapter): CachedClockAdapter`:
      - `recentMonotonicNow()` reads `clock.monotonicNow()` directly (no background updater)
      - `recentWallClockNow()` reads `clock.wallClockNow()` directly
      - `start()` and `stop()` are no-ops
      - `isRunning()` always returns `true`
      - Returns branded types
      - `Object.freeze(...)` the returned adapter
  - [x] 7.6 Implement `libs/clock/core/src/testing/assertions.ts`
    - `assertMonotonic(values: ReadonlyArray<MonotonicTimestamp>, label?: string): void` — throws `AssertionError` on first non-strictly-increasing pair
    - `assertTimeBetween(actual: MonotonicDuration, min: MonotonicDuration, max: MonotonicDuration, label?: string): void` — inclusive bounds
    - `assertWallClockPlausible(timestamp: WallClockTimestamp, label?: string): void` — must be after 2020 and not more than 1 day in future
    - `assertSequenceOrdered(values: ReadonlyArray<number>, label?: string): void` — strictly increasing by 1 (detects gaps and duplicates)
  - [x] 7.7 Create `libs/clock/core/src/testing/index.ts`
    - Re-export all virtual adapters, factories, error types, and assertion helpers
    - Includes: `VirtualClockAdapter`, `VirtualSequenceGenerator`, `VirtualTimerScheduler`, `BlockUntilOptions`, `ClockTimeoutError`, `createClockTimeoutError`, `createVirtualClock`, `createVirtualSequenceGenerator`, `createVirtualTimerScheduler`, `createVirtualCachedClock`, `VirtualClockOptions`, `VirtualSequenceOptions`, `VirtualClockValues`, `assertMonotonic`, `assertTimeBetween`, `assertWallClockPlausible`, `assertSequenceOrdered`, `ClockRangeError`, `createClockRangeError`
  - [x] 7.8 Ensure virtual adapter tests pass
    - Run only the 6 tests written in 7.1

**Acceptance Criteria:**
- The 6 tests from 7.1 pass
- `VirtualClockAdapter` is NOT frozen (mutable state required for control methods)
- Virtual adapters have `"transient"` lifetime (each injection gets a fresh instance)
- `VirtualSequenceGenerator` has `reset()` — `SequenceGeneratorInterface` does NOT
- `blockUntil` uses real platform time for its timeout (not virtual time)
- All virtual adapters are exported ONLY from `./testing` — never from main `src/index.ts`
- `ClockTimeoutError` is exported ONLY from `@hex-di/clock/testing`

---

#### Task 8: Wire Public API Surface
**Dependencies:** Tasks 3–7

- [x] 8.0 Create the complete public API surface in `src/index.ts` and finalize the testing entry point
  - [x] 8.1 Create `libs/clock/core/src/index.ts` with banner-sectioned exports:
    ```
    // ============================================================================
    // Ports
    // ============================================================================
    // ClockPort, SequenceGeneratorPort, ClockDiagnosticsPort,
    // ClockSourceChangedSinkPort, TimerSchedulerPort, RetentionPolicyPort

    // ============================================================================
    // Core Types
    // ============================================================================
    // MonotonicTimestamp, WallClockTimestamp, HighResTimestamp
    // MonotonicDuration, WallClockDuration
    // TemporalContext, OverflowTemporalContext, SignableTemporalContext
    // TemporalContextFactory, TemporalContextDigest
    // ClockDiagnostics, ClockCapabilities, ClockGxPMetadata
    // ClockSourceChangedEvent, ClockSourceChangedSink
    // TimerHandle, CachedClockPort, CachedClockLifecycle, CachedClockAdapter
    // HardwareClockAdapter, HardwareClockAdapterOptions, HardwareClockStatus
    // HostClockBridge, HostBridgeClockOptions, EdgeRuntimeClockOptions, SystemClockOptions
    // ClockContext, RetryOptions, RetentionMetadata, PeriodicEvaluationConfig
    // CachedClockOptions

    // ============================================================================
    // Adapters
    // ============================================================================
    // SystemClockAdapter, SystemSequenceGeneratorAdapter
    // SystemTimerSchedulerAdapter, SystemCachedClockAdapter
    // EdgeRuntimeClockAdapter, SystemClockDiagnosticsAdapter

    // ============================================================================
    // Factories
    // ============================================================================
    // createSystemClock, createSystemSequenceGenerator
    // createSystemTimerScheduler, createCachedClock
    // createEdgeRuntimeClock, createHostBridgeClock
    // createSystemClockAdapter, createEdgeRuntimeClockAdapter
    // createHostBridgeClockAdapter, createTemporalContextFactory
    // createClockSourceBridge, createClockContext
    // createProcessInstanceId

    // ============================================================================
    // Utilities
    // ============================================================================
    // asMonotonic, asWallClock, asHighRes
    // asMonotonicDuration, asWallClockDuration
    // asMonotonicValidated, asWallClockValidated, asHighResValidated
    // elapsed, durationGt, durationLt, durationBetween
    // toTemporalInstant, fromTemporalInstant
    // isOverflowTemporalContext, validateSignableTemporalContext
    // validateRetentionMetadata, calculateRetentionExpiryDate
    // computeTemporalContextDigest, computeOverflowTemporalContextDigest
    // verifyTemporalContextDigest
    // getClockGxPMetadata, setupPeriodicClockEvaluation
    // deserializeTemporalContext, deserializeOverflowTemporalContext
    // deserializeClockDiagnostics

    // ============================================================================
    // Async Combinators
    // ============================================================================
    // delay, timeout, measure, retry

    // ============================================================================
    // Error Types
    // ============================================================================
    // SequenceOverflowError, createSequenceOverflowError
    // ClockStartupError, createClockStartupError
    // SignatureValidationError, createSignatureValidationError
    // DeserializationError, createDeserializationError
    // RetentionValidationError, createRetentionValidationError
    // BrandingValidationError, createBrandingValidationError
    ```
    - Note: `ClockRangeError`, `ClockTimeoutError` are NOT in main entry point — they live only in `./testing`
    - Follow `lib-index-structure` standard: 78-char banner lines
  - [x] 8.2 Verify `libs/clock/core/src/testing/index.ts` is complete (Task 7.7)
  - [x] 8.3 Verify `package.json` exports map has both `"."` and `"./testing"` entries
  - [x] 8.4 Run `pnpm --filter @hex-di/clock typecheck` — zero TypeScript errors required
  - [x] 8.5 Verify that importing `@hex-di/clock/testing` from a production-style module would not accidentally include `VirtualClockAdapter` in the main bundle (structural separation via export map)

**Acceptance Criteria:**
- `src/index.ts` uses banner-section format (78-char `=` lines)
- All Tier 1, Tier 2, and Tier 3 exports (per spec §8) are reachable from `@hex-di/clock`
- `VirtualClockAdapter`, `ClockTimeoutError`, `ClockRangeError` are accessible ONLY from `@hex-di/clock/testing`
- `pnpm --filter @hex-di/clock typecheck` reports zero errors

---

### Testing

#### Task 9: Write Core Tests (DoD 1–16)
**Dependencies:** Tasks 3–8

- [x] 9.0 Implement all test files for DoD groups 1–16
  - [x] 9.1 DoD 1 — Clock Port
    - `libs/clock/core/tests/clock-port.test.ts`: ClockPort is a directed port; port name is `"Clock"`; port has correct category; port direction is `"outbound"`
    - `libs/clock/core/tests/clock-port.test-d.ts`: `ClockPort` accepts correct shape; rejects object missing a method; rejects wrong return types
  - [x] 9.2 DoD 2 — Sequence Generator Port
    - `libs/clock/core/tests/sequence-generator.test.ts`: `next()` returns 1 on first call; returns strictly increasing values; overflow at `MAX_SAFE_INTEGER`; `current()` before/after `next()`; `SequenceOverflowError` frozen with correct fields; no `reset` on production generator
    - `libs/clock/core/tests/sequence-generator.test-d.ts`: port type shape; no `reset` at type level
  - [x] 9.3 DoD 3 — System Clock Adapter
    - `libs/clock/core/tests/system-clock.test.ts`: `createSystemClock()` returns frozen object; all three methods return numbers; `monotonicNow()` is non-decreasing; `wallClockNow()` near `Date.now()`; `highResNow()` near `Date.now()`
    - `libs/clock/core/tests/system-clock-startup.test.ts`: ST-1 through ST-5 self-test checks (using mocks for failure conditions); ST-4 only in GxP mode; ST-5 skipped when no timeOrigin
    - `libs/clock/core/tests/system-clock-fallback.test.ts`: clamped fallback enforces monotonicity; uses captured `Date.now` reference
    - `libs/clock/core/tests/system-clock.test-d.ts`: `createSystemClock()` returns `Result<ClockInterface & ClockDiagnosticsInterface, ClockStartupError>`
  - [x] 9.4 DoD 4 — Virtual Clock Adapter
    - `libs/clock/core/tests/virtual-clock.test.ts`: `advance()` increments all three clocks; negative `advance()` returns `err(ClockRangeError)`; `set()` accepts negative values; `set()` rejects `NaN/Infinity`; `jumpWallClock()` moves wall+highRes but not monotonic; auto-advance behavior; determinism (same options → same results)
  - [x] 9.5 DoD 5 — Virtual Sequence Generator
    - `libs/clock/core/tests/virtual-sequence.test.ts`: `reset()` resets counter; `setCounter()` enables overflow testing; `setCounter()` rejects `NaN/Infinity`; `VirtualSequenceGenerator` has `reset` (production interface does NOT)
  - [x] 9.6 DoD 6 — Clock Diagnostics Port
    - `libs/clock/core/tests/clock-diagnostics.test.ts`: `getDiagnostics()` returns frozen object with `adapterName`; `getCapabilities()` returns frozen object with all 7 capability fields; capabilities computed once at construction
    - `libs/clock/core/tests/clock-diagnostics.test-d.ts`: `ClockDiagnosticsPort` type shape; `ClockCapabilities` interface
  - [x] 9.7 DoD 7 — Temporal Context
    - `libs/clock/core/tests/temporal-context.test.ts`: capture ordering (seq before monotonic before wallClock); `create()` returns `ok(frozen TemporalContext)`; `create()` returns `err(SequenceOverflowError)` when seq is exhausted; `createOverflowContext()` returns `OverflowTemporalContext` with `sequenceNumber: -1`; context is frozen
    - `libs/clock/core/tests/temporal-context.test-d.ts`: `TemporalContext` has branded timestamp types; `OverflowTemporalContext` discriminated union; `SignableTemporalContext` extends `TemporalContext`
  - [x] 9.8 DoD 8 — Clock Source Change Sink Port
    - `libs/clock/core/tests/clock-source-change.test.ts`: `ClockSourceChangedEvent` is frozen; event has correct fields; port has correct name and category
    - `libs/clock/core/tests/clock-source-change.test-d.ts`: `ClockSourceChangedSinkPort` type shape; `ClockSourceChangedEvent` interface
  - [x] 9.9 DoD 9 — Clock Source Bridge Resilience
    - `libs/clock/core/tests/clock-source-bridge.test.ts`: sink's `onClockSourceChanged` called synchronously before new adapter is active; sink errors caught internally (do not propagate)
    - `libs/clock/core/tests/clock-source-bridge.test-d.ts`: type-level checks
  - [x] 9.10 DoD 10 — Graph Integration
    - `libs/clock/core/tests/graph-integration.test.ts`: `SystemClockAdapter` + `SystemSequenceGeneratorAdapter` wires into a container; `container.resolve(ClockPort)` returns a valid clock; `container.resolve(SequenceGeneratorPort)` returns a valid generator; `SystemCachedClockAdapter` requires `ClockPort`; timer scheduler integration
    - `libs/clock/core/tests/graph-integration.test-d.ts`: adapter type compatibility checks
  - [x] 9.11 DoD 11 — Signature Validation
    - `libs/clock/core/tests/signature-validation.test.ts`: `validateSignableTemporalContext()` returns `ok` for unsigned context; returns `ok` for fully-signed context; returns `err(SignatureValidationError)` for each missing signature field
    - `libs/clock/core/tests/signature-validation.test-d.ts`: return type is `Result<SignableTemporalContext, SignatureValidationError>`
  - [x] 9.12 DoD 12 — Record Integrity
    - `libs/clock/core/tests/record-integrity.test.ts`: `computeTemporalContextDigest()` returns frozen object with `algorithm: "SHA-256"`; digest changes when context fields change; `verifyTemporalContextDigest()` returns `true` for matching; returns `false` for tampered context; overflow variant works
    - `libs/clock/core/tests/record-integrity.test-d.ts`: `TemporalContextDigest` type; `verifyTemporalContextDigest` return type
  - [x] 9.13 DoD 13 — Deserialization
    - `libs/clock/core/tests/deserialization.test.ts`: `deserializeTemporalContext()` reconstructs valid context from raw object; returns `err(DeserializationError)` for missing fields; returns `err` for wrong schema version; `deserializeClockDiagnostics()` works; branded types on deserialized fields
    - `libs/clock/core/tests/deserialization.test-d.ts`: return types
  - [x] 9.14 DoD 14 — GxP Metadata
    - `libs/clock/core/tests/gxp-metadata.test.ts`: `getClockGxPMetadata()` returns frozen object; `clockVersion` is a non-empty string; `specRevision` is `"2.9"`; object is frozen
    - `libs/clock/core/tests/gxp-metadata.test-d.ts`: `ClockGxPMetadata` interface type
  - [x] 9.15 DoD 15 — Hardware Clock Adapter Interface
    - `libs/clock/core/tests/hardware-clock.test-d.ts`: `HardwareClockAdapter` extends `ClockInterface & ClockDiagnosticsInterface`; has `getHardwareStatus()`; `HardwareClockStatus` fields type-check
  - [x] 9.16 DoD 16 — GxP Startup Self-Test Integration
    - `libs/clock/core/tests/gxp-clock.test.ts`: `createSystemClock({ gxp: true })` on unfrozen `Date` returns `err` with `check: "ST-4"`; `createSystemClock()` (non-GxP) passes despite unfrozen APIs; ST-5 triggers on mock high-divergence condition
  - [x] 9.17 Run all DoD 1–16 tests
    - `pnpm --filter @hex-di/clock test` — run tests from DoD groups 1–16 only
    - All tests must pass

**Acceptance Criteria:**
- All DoD 1–16 test files exist and pass
- Type-level tests (`*.test-d.ts`) use `expectTypeOf` or `assertType` from vitest
- Graph integration tests use full inline pipeline (`GraphBuilder.create().provide(...).build()`) per `testing/test-container-setup` standard
- No shared test helpers across files

---

#### Task 10: Write Extended Tests (DoD 17–26)
**Dependencies:** Task 9

- [x] 10.0 Implement all test files for DoD groups 17–26
  - [x] 10.1 DoD 17 — Branded Timestamps
    - `libs/clock/core/tests/branded-timestamps.test.ts`: `asMonotonic` is identity at runtime; `asMonotonicValidated` returns `err` for negative; `asWallClockValidated` returns `err` for pre-Y2K; `asHighResValidated` returns `err` for far-future; duration branding: `elapsed()` returns `MonotonicDuration`; duration comparison utilities type-safe
    - `libs/clock/core/tests/branded-timestamps.test-d.ts`: `MonotonicTimestamp` not assignable to `WallClockTimestamp`; both assignable to `number`; arithmetic yields `number`; `MonotonicDuration` not assignable to `WallClockDuration`
  - [x] 10.2 DoD 18 — System Timer Scheduler
    - `libs/clock/core/tests/system-timer.test.ts`: `TimerHandle` is frozen with `_tag: "TimerHandle"`; `setTimeout` with negative ms throws `TypeError`; `setInterval` with 0 ms throws `TypeError`; `clearTimeout` is idempotent; `sleep(ms)` resolves after delay; `SystemTimerSchedulerAdapter` is singleton
    - `libs/clock/core/tests/system-timer.test-d.ts`: `TimerHandle` type; `TimerSchedulerPort` interface shape
  - [x] 10.3 DoD 19–20 — Virtual Timer Scheduler
    - `libs/clock/core/tests/virtual-timer.test.ts`: clock advance fires pending `setTimeout` synchronously; FIFO ordering for same-time timers; `setInterval` fires multiple times on advance; `clearTimeout` prevents firing; `blockUntil(1)` resolves when timer registered; `blockUntil` rejects with `ClockTimeoutError` on real-time timeout; `runAll()` drains all pending timers; `runNext()` fires only next timer
    - `libs/clock/core/tests/virtual-timer.test-d.ts`: `VirtualTimerScheduler` extends `TimerSchedulerPort`; `ClockTimeoutError` type
  - [x] 10.4 DoD 21–23 — Cached Clock
    - `libs/clock/core/tests/cached-clock.test.ts`: `createCachedClock()` reads source at construction; `recentMonotonicNow()` returns initial value before `start()`; `start()` enables background updates; `stop()` halts updates; `isRunning()` state transitions; `CLK-CAC-001`: `CachedClockInterface` not assignable to `ClockInterface`; `VirtualCachedClock` reads virtual clock directly
    - `libs/clock/core/tests/cached-clock.test-d.ts`: `CachedClockPort` NOT assignable to `ClockPort`; `recentMonotonicNow()` returns `MonotonicTimestamp`
  - [x] 10.5 DoD 24 — Clock Capabilities
    - `libs/clock/core/tests/clock-capabilities.test.ts`: `SystemClockAdapter` capabilities have `hasMonotonicTime: true` on Node 18+; `platform` is `"node"` in Node.js test environment; `estimatedResolutionMs` is a positive number; capabilities are frozen; capabilities computed once (same reference on repeated calls)
    - `libs/clock/core/tests/clock-capabilities.test-d.ts`: `ClockCapabilities` interface type
  - [x] 10.6 DoD 25 — Edge Runtime Clock Adapter
    - `libs/clock/core/tests/edge-runtime-clock.test.ts`: `createEdgeRuntimeClock()` returns `ok()` on Node 18+; `ClockCapabilities.highResDegraded` is `true`; `ClockDiagnostics.highResSource` is `"Date.now"`; `ClockDiagnostics.adapterName` is `"EdgeRuntimeClockAdapter"`; ST-5 not run
    - `libs/clock/core/tests/edge-runtime-clock.test-d.ts`: return type is `Result<ClockInterface & ClockDiagnosticsInterface, ClockStartupError>`
  - [x] 10.7 DoD 26 — Host Bridge Clock Adapter
    - `libs/clock/core/tests/host-bridge-clock.test.ts`: valid bridge returns `ok()`; `ClockDiagnostics.monotonicSource` is `"host-bridge"`; without `highResNowMs`, `highResDegraded: true`; throws `TypeError` for non-function bridge methods; behavioral contracts HB-1..HB-6
    - `libs/clock/core/tests/host-bridge-clock.test-d.ts`: `HostClockBridge` interface; `HostBridgeClockOptions` required fields
  - [x] 10.8 Additional: Async Combinators
    - `libs/clock/core/tests/async-combinators.test.ts`: `delay` delegates to `scheduler.sleep()`; `timeout` rejects with `ClockTimeoutError` when timer fires first; `timeout` cleans up timer when promise settles first; `measure` uses `monotonicNow()`; `retry` uses `scheduler.sleep()` between attempts; exponential backoff with `maxDelayMs` cap; last error propagated
  - [x] 10.9 Additional: Process Instance ID
    - Included in `libs/clock/core/tests/gxp-metadata.test.ts`: `createProcessInstanceId()` returns a string in `{hostname}-{timestamp}-{uuid}` format; string is frozen; two calls return different UUIDs
  - [x] 10.10 Run all DoD 17–26 tests
    - `pnpm --filter @hex-di/clock test` — verify all extended tests pass alongside DoD 1–16 tests

**Acceptance Criteria:**
- All DoD 17–26 test files exist and pass
- `branded-timestamps.test-d.ts` confirms cross-domain assignment is a compile error
- `cached-clock.test-d.ts` confirms `CachedClockPort` is NOT assignable to `ClockPort`
- All extended tests pass alongside DoD 1–16

---

#### Task 11: Write GxP Qualification Tests
**Dependencies:** Task 10

- [x] 11.0 Implement GxP qualification test files
  - [x] 11.1 `libs/clock/core/tests/gxp-iq-clock.test.ts` — Installation Qualification (IQ-1 through IQ-25)
    - Uses ONLY production adapters — NO imports from `@hex-di/clock/testing` (per spec §5.1)
    - IQ-1..5: Package structure and exports verified (correct files exist, exports map works)
    - IQ-6..10: `ClockPort` and `SequenceGeneratorPort` port token structure (name, direction, category)
    - IQ-11..15: `SystemClockAdapter` and `SystemSequenceGeneratorAdapter` wiring in a container
    - IQ-16..20: All 5 branded timestamp types exported and structurally correct at type level
    - IQ-21..25: `TemporalContextFactory`, `validateSignableTemporalContext`, `computeTemporalContextDigest`, `getClockGxPMetadata` all callable and return correct types
  - [x] 11.2 `libs/clock/core/tests/gxp-oq-clock.test.ts` — Operational Qualification (OQ-1 through OQ-8)
    - OQ-1..5 use production adapters:
      - OQ-1: `monotonicNow()` is non-decreasing across 1000 calls
      - OQ-2: `wallClockNow()` accuracy — within 50ms of real `Date.now()`
      - OQ-3: `highResNow()` has sub-millisecond precision (fractional part non-zero on Node 18+)
      - OQ-4: `ClockCapabilities.estimatedResolutionMs` is ≤ 1.0 on Node 18+
      - OQ-5: `next()` returns consecutive integers with no gaps across 100 calls
    - OQ-6..8 are NEGATIVE tests (MAY use `@hex-di/clock/testing` — documented in each test):
      - OQ-6: `createSystemClock({ gxp: true })` with unfrozen `Date` returns `err("ST-4")` — simulated by patching (test must document why virtual adapter is used)
      - OQ-7: `createVirtualSequenceGenerator()` with `setCounter(MAX_SAFE_INTEGER)` returns `err(SequenceOverflowError)` on `next()`
      - OQ-8: `createVirtualClock()` with `initialWallClock: 0` demonstrates ST-2 would trigger if used in production
  - [x] 11.3 `libs/clock/core/tests/gxp-pq-clock.test.ts` — Performance Qualification (PQ-1 through PQ-5)
    - Uses production adapters only
    - PQ-1: Throughput sustainability — `monotonicNow()` sustains > 1,000,000 ops/second over 1-second measurement window
    - PQ-2: `wallClockNow()` sustains > 1,000,000 ops/second
    - PQ-3: `highResNow()` sustains > 1,000,000 ops/second
    - PQ-4: `next()` sustains > 1,000,000 ops/second
    - PQ-5: `createTemporalContextFactory().create()` sustains > 500,000 ops/second
    - Note: PQ tests report measured throughput in test output even when passing; failing threshold is 10% of floor to avoid CI flakiness while still catching catastrophic regressions
  - [x] 11.4 Run all GxP qualification tests
    - `pnpm --filter @hex-di/clock test` — verify all gxp-*.test.ts pass
    - Verify that positive IQ/OQ/PQ tests (`gxp-iq-clock.test.ts`, `gxp-oq-clock.test.ts` OQ-1..5, `gxp-pq-clock.test.ts`) have zero imports from `@hex-di/clock/testing`

**Acceptance Criteria:**
- `gxp-iq-clock.test.ts`, `gxp-oq-clock.test.ts`, `gxp-pq-clock.test.ts` all exist and pass
- Positive IQ/OQ/PQ tests import only from `@hex-di/clock` — never from `@hex-di/clock/testing`
- Negative OQ tests (OQ-6..8) document in test description why virtual adapters are necessary
- PQ tests report measured throughput in output

---

#### Task 12: Workspace Integration
**Dependencies:** Tasks 9–11

- [x] 12.0 Finalize workspace integration and verify all quality gates
  - [x] 12.1 Verify `libs/clock/core` is visible in `pnpm-workspace.yaml` (either by explicit entry or glob like `libs/**`)
  - [x] 12.2 Run `pnpm install` to confirm workspace linking — `@hex-di/clock` resolves as a workspace package
  - [x] 12.3 Check turbo pipeline in `turbo.json` — add `@hex-di/clock` tasks if the pipeline uses explicit package lists (may be automatic if using glob)
  - [x] 12.4 Run `pnpm --filter @hex-di/clock typecheck` — must report zero TypeScript errors
  - [x] 12.5 Run `pnpm --filter @hex-di/clock test:types` — all `*.test-d.ts` type-level tests must pass
  - [x] 12.6 Run `pnpm --filter @hex-di/clock test` — all 46 test files must pass
  - [x] 12.7 Run `pnpm --filter @hex-di/clock lint` — zero lint errors
  - [x] 12.8 Confirm final test counts match expectations:
    - DoD 1–16: approximately 28 test files
    - DoD 17–26: approximately 14 test files
    - GxP qualification: 3 test files (`gxp-iq-clock.test.ts`, `gxp-oq-clock.test.ts`, `gxp-pq-clock.test.ts`) + `gxp-clock.test.ts`
    - Total: 46 test files covering 457 test cases
  - [x] 12.9 Verify no cross-package TypeScript errors caused by adding `@hex-di/clock`:
    - Run `pnpm typecheck` at the monorepo root (or `pnpm --filter ...` for dependent packages)
  - [x] 12.10 Verify the benchmark suite scaffold exists (may be stub files at this stage):
    - `libs/clock/core/tests/benchmarks/clock-reads.bench.ts`
    - `libs/clock/core/tests/benchmarks/sequence-generator.bench.ts`
    - `libs/clock/core/tests/benchmarks/temporal-context.bench.ts`
    - `libs/clock/core/tests/benchmarks/abstraction-overhead.bench.ts`
    - `libs/clock/core/tests/benchmarks/memory-overhead.bench.ts`
    - `libs/clock/core/tests/benchmarks/cached-clock.bench.ts`

**Acceptance Criteria:**
- `pnpm --filter @hex-di/clock typecheck` → zero errors
- `pnpm --filter @hex-di/clock test` → all tests pass
- `pnpm --filter @hex-di/clock test:types` → all type-level tests pass
- `pnpm --filter @hex-di/clock lint` → zero lint errors
- Package resolves correctly in workspace
- No regressions in other monorepo packages

---

## Execution Order

Recommended implementation sequence:

1. **Task 1** — Spec documentation (verify artifacts are in place)
2. **Task 2** — Scaffold package (infrastructure first)
3. **Task 3** — Ports (foundation; everything depends on port tokens)
4. **Task 4** — Branded types and core utilities (depends on ports for type signatures)
5. **Task 5** — System adapters core (depends on ports and utilities)
6. **Task 6** — Extended adapters (depends on system adapters; parallel with Task 7)
7. **Task 7** — Virtual/testing adapters (depends on ports and utilities; parallel with Task 6)
8. **Task 8** — Public API surface (wire everything together; depends on Tasks 3–7)
9. **Task 9** — Core tests DoD 1–16 (depends on complete implementation)
10. **Task 10** — Extended tests DoD 17–26 (depends on Task 9)
11. **Task 11** — GxP qualification tests (depends on Task 10)
12. **Task 12** — Workspace integration and final verification (depends on all prior tasks)

Tasks 6 and 7 can be worked in parallel by different engineers if desired. Tasks 9, 10, and 11 can be partially overlapped with implementation if TDD is preferred.
