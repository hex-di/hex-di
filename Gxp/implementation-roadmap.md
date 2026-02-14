# GxP Compliance Implementation Roadmap

**Date:** 2026-02-10
**Scope:** Full HexDI monorepo -- 11 packages, 7.4/10 current → 10.0/10 target
**Constraint:** Tracing remains OPTIONAL across all packages (warn, never block)
**Policy:** No backward compatibility shims (per CLAUDE.md)

---

## Executive Metrics

| Metric                            | Value         |
| --------------------------------- | ------------- |
| Total changes across all packages | **139**       |
| Total new files to create         | **~48**       |
| Total existing files to modify    | **~120**      |
| Total new test cases              | **~460+**     |
| Total breaking changes            | **~31**       |
| Cross-cutting themes              | 8             |
| Implementation phases             | 6             |
| Current weighted score            | **7.4 / 10**  |
| Target score                      | **10.0 / 10** |

---

## Dependency Graph

Changes must respect the monorepo dependency chain. Upstream packages must be stabilized before downstream consumers.

```
                  ┌──────────┐
                  │  Result  │  (leaf -- 0 deps)
                  └────┬─────┘
                       │
         ┌─────────────┼─────────────────────────────┐
         │             │                               │
    ┌────▼────┐   ┌────▼────┐                          │
    │  Core   │   │  Graph  │◄── Core, Result          │
    └────┬────┘   └────┬────┘                          │
         │             │                               │
         │        ┌────▼─────┐                         │
         │        │ Runtime  │◄── Core, Graph, Result  │
         │        └────┬─────┘                         │
         │             │                               │
    ┌────┼──────┬──────┼──────┬──────┬──────┐          │
    │    │      │      │      │      │      │          │
    ▼    ▼      ▼      ▼      ▼      ▼      ▼          │
 Logger Tracing Store Query  Saga  Flow   React        │
                  │      │      │      │               │
                  └──────┴──────┴──────┘               │
                  (all depend on Core + Result) ◄──────┘
```

---

## Cross-Cutting Themes

Eight systemic patterns appear across multiple packages. Each phase addresses these themes in dependency order.

| #   | Theme                        | Packages Affected                        | Description                                                      |
| --- | ---------------------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| T1  | **Determinism**              | Core, Logger, Tracing, Store, Saga, Flow | Replace `Math.random()` with crypto/monotonic generators         |
| T2  | **Error Handling Safety**    | Logger, Runtime, Tracing, Graph          | try/catch wrappers, error propagation, fallback channels         |
| T3  | **Security & Authorization** | Flow, Saga, Query, Tracing               | ACL, authorization hooks, PII filtering, cache encryption        |
| T4  | **Audit Trail Completeness** | Graph, Logger, Tracing, Flow, Saga       | Persistent sinks, eviction callbacks, hash chains                |
| T5  | **Input Validation**         | Logger, Query, Saga, Flow, Store         | Runtime schema validation, annotation sanitization               |
| T6  | **Tracing Warnings**         | ALL 11 packages                          | One-time `console.warn` when tracing not configured              |
| T7  | **Immutability Hardening**   | Core, Result, Store, Runtime             | `Object.freeze()` on errors, Ok values, hook contexts            |
| T8  | **High-Resolution Timing**   | Runtime, Tracing, Store, Logger          | Replace `Date.now()` with `performance.now()` / injectable clock |

---

## Phase 1: Foundation Hardening

**Packages:** Result, Core
**Rationale:** Leaf dependencies with zero internal deps. Every other package builds on these. Changes here propagate downstream.
**Score impact:** Result 9.0→10.0, Core 8.2→10.0

### Result (9.0 → 10.0)

| #   | Change                           | Severity | Themes | Description                                                             |
| --- | -------------------------------- | -------- | ------ | ----------------------------------------------------------------------- |
| R1  | Freeze Ok/Err objects            | Medium   | T7     | Add `Object.freeze(self)` in both `ok()` and `err()` factories          |
| R2  | Brand symbol for `isResult`      | Medium   | T5     | Replace structural check with `RESULT_BRAND` symbol for stronger guards |
| R3  | Remove `eslint-disable` comments | Low      | --     | ESLint config override in `result-async.ts`                             |
| R4  | Cast-free matchers               | Low      | --     | Refactor `result-testing/matchers.ts` to eliminate 3 `as` casts         |
| R5  | GxP documentation on `andTee`    | Low      | T4     | JSDoc warnings: use `andThrough` for audit-critical side effects        |
| R6  | API stability annotations        | Low      | --     | `@stable` / `@experimental` JSDoc on all public exports                 |

**New tests:** ~15 | **Breaking changes:** 3 (frozen values, brand check, cast-free matchers)

### Core (8.2 → 10.0)

| #      | Change                            | Severity | Themes | Description                                                                 |
| ------ | --------------------------------- | -------- | ------ | --------------------------------------------------------------------------- |
| C1     | Deterministic correlation IDs     | High     | T1     | Replace `Math.random()` with monotonic counter + `configureCorrelationId()` |
| C2     | Encapsulate ContextMap cast       | High     | --     | Wrap single `as T` in branded `ContextMap` with soundness proof             |
| C3     | Freeze error instances            | Medium   | T7     | `Object.freeze(this)` in all 7 error class constructors                     |
| C4     | Tracing warning utility           | Medium   | T6     | New `tracing-warning.ts` with `WARNING[HEX_WARN_001]`, suppressible         |
| C5     | Trace eviction callback           | Medium   | T4     | `onEvict()` callback + `TraceEvictionReason` on `TracingAPI`                |
| C6     | Injectable clock source           | Medium   | T8     | Document clock contract, add `clock` to `TracingOptions`                    |
| C7     | Lazy port double-wrap guard       | Low      | T5     | Throw `ERROR[HEX026]` when `lazyPort()` receives already-lazy port          |
| C8     | Tamper detection guards           | Low      | T7     | `isAdapterFrozen()`, `assertAdapterFrozen()`, `assertPortFrozen()`          |
| C9     | API stability annotations         | Low      | --     | `@stable`/`@experimental` JSDoc on all public exports                       |
| C10-13 | Documentation + changeset tooling | Low      | --     | Determinism docs, changeset config, schema migration ADR                    |

**New tests:** ~20 | **New files:** ~4 | **Breaking changes:** 3

---

## Phase 2: Audit Trail Foundation

**Packages:** Logger, Tracing
**Rationale:** Logging and tracing are the audit trail backbone. Every other package's auditability depends on these working correctly. Logger (5.8) is the weakest package; Tracing (7.1) has critical eviction and PII gaps.
**Score impact:** Logger 5.8→10.0 (+4.2), Tracing 7.1→10.0 (+2.9)

### Logger (5.8 → 10.0) -- Largest remediation effort

| #   | Change                               | Severity | Themes | Description                                                            |
| --- | ------------------------------------ | -------- | ------ | ---------------------------------------------------------------------- |
| L1  | Wrap `handler.handle()` in try/catch | CRITICAL | T2     | Unprotected pipeline at `scoped/logger.ts:174` -- errors silently lost |
| L2  | Annotation validation                | CRITICAL | T5     | Reject functions, symbols, BigInt, circular refs; strip with warning   |
| L3  | Console output fallback              | CRITICAL | T2     | Handle `getConsole()` returning undefined; drop counter + stderr       |
| L4  | Deterministic sampling               | CRITICAL | T1     | Add `randomFn` to `SamplingConfig` and `RateLimitConfig`               |
| L5  | Fix Bunyan flush/shutdown            | CRITICAL | T2, T4 | Stream iteration for real flush; proper `shutdown()`                   |
| L6  | Fix Pino flush                       | CRITICAL | T2     | Await callback completion instead of fire-and-forget                   |
| L7  | Fix Winston flush                    | CRITICAL | T2     | Non-destructive flush; separate `shutdown()` for closure               |
| L8  | Message sanitization                 | HIGH     | T3     | Escape newlines, ANSI codes, null bytes (log injection prevention)     |
| L9  | Sequence numbers                     | HIGH     | T4     | Monotonic `sequence` field on `LogEntry` for ordering/gap detection    |
| L10 | Tamper evidence                      | HIGH     | T4     | Hash chain via `withIntegrity()` wrapper (opt-in)                      |
| L11 | Drop notifications                   | MEDIUM   | T4     | Callback when sampling/rate-limiting drops entries                     |
| L12 | Header validation                    | MEDIUM   | T5     | Truncate oversized correlation IDs, strip control chars                |
| L13 | Bounded MemoryLogger                 | MEDIUM   | T2     | Capacity limit to prevent unbounded growth                             |
| L14 | Message-level redaction              | MEDIUM   | T3     | `messagePatterns` on `RedactionConfig`                                 |
| L15 | Crypto request IDs                   | LOW      | T1     | `crypto.randomUUID()` in Hono middleware                               |
| L16 | Error contract documentation         | LOW      | --     | JSDoc on `LogHandler.handle()` defining throw semantics                |
| L17 | Tracing context warnings             | LOW      | T6     | Warn on missing SpanProvider/correlationId                             |

**New tests:** 83 | **New files:** 6 | **Modified files:** 18 | **Breaking changes:** 8
**Internal implementation order:** 9 sub-phases (Foundation Safety → Input Safety → Data Model → Determinism → Adapter Fixes → Security → Tracing Warnings → Tests → Documentation)

### Tracing (7.1 → 10.0)

| #    | Change                          | Severity | Themes | Description                                                       |
| ---- | ------------------------------- | -------- | ------ | ----------------------------------------------------------------- |
| TR1  | Span eviction audit trail       | CRITICAL | T4     | `onDrop` callback + `droppedSpanCount` on `MemoryTracerOptions`   |
| TR2  | PII filtering                   | CRITICAL | T3     | `AttributeFilterConfig` + `createFilteringProcessor()` wrapper    |
| TR3  | Async context isolation         | CRITICAL | T1     | `AsyncLocalStorage` integration replacing module-level span stack |
| TR4  | Export retry mechanism          | HIGH     | T2     | `createRetryingExporter()` with exponential backoff               |
| TR5  | DataDog parent-child integrity  | HIGH     | T4     | TTL-based parent retention in bridge Map                          |
| TR6  | Math.random warning/replacement | HIGH     | T1     | Warn on fallback; prefer `crypto.getRandomValues`                 |
| TR7  | Configurable shutdown timeout   | HIGH     | T2     | `shutdownTimeoutMillis` option (replaces hardcoded 30s)           |
| TR8  | setStatus immutability fix      | HIGH     | T7     | Consistent behavior between MemorySpan and ConsoleSpan            |
| TR9  | Attribute size limits           | MEDIUM   | T5     | Max key length, max value size, max attribute count               |
| TR10 | Tracestate validation           | MEDIUM   | T5     | RFC-compliant tracestate parsing/validation                       |
| TR11 | Export metrics                  | MEDIUM   | T4     | Success/failure/retry counters on exporters                       |
| TR12 | Zipkin/Jaeger shutdown timeout  | MEDIUM   | T2     | Configurable timeout (currently none)                             |
| TR13 | Tracing disabled warnings       | MEDIUM   | T6     | One-time console.warn when tracing disabled                       |
| TR14 | High-res timestamps             | LOW      | T8     | `getHighResTimestamp()` using `performance.now()`                 |
| TR15 | Dynamic instrumentation version | LOW      | --     | Read from `package.json` instead of hardcoded string              |
| TR16 | HTTPS enforcement               | LOW      | T3     | Warn/reject HTTP endpoints for trace export                       |

**New tests:** 47 | **New files:** 7 | **Modified files:** 22 | **Breaking changes:** ~3

---

## Phase 3: Infrastructure Hardening

**Packages:** Runtime, Graph
**Rationale:** The DI container backbone. Must be hardened before fixing packages that run inside the container (Store, Query, Saga, Flow).
**Score impact:** Runtime 7.9→10.0, Graph 7.5→10.0

### Runtime (7.9 → 10.0)

| #   | Change                       | Severity | Themes | Description                                                         |
| --- | ---------------------------- | -------- | ------ | ------------------------------------------------------------------- |
| RT1 | Finalizer timeout            | Critical | T2     | `FinalizerTimeoutError` + `withTimeout()` wrapper in `memo-map.ts`  |
| RT2 | Monotonic timing             | High     | T8     | Replace 5x `Date.now()` sites with `monotonicNow()` utility         |
| RT3 | MemoMap async deduplication  | High     | T1     | `pendingAsync` Map to prevent double factory execution              |
| RT4 | Lifecycle error reporter     | High     | T2     | `LifecycleErrorReporter` callback on `ScopeLifecycleEmitter`        |
| RT5 | Scope depth limit            | Medium   | T5     | `depth`/`maxDepth` tracking, `ScopeDepthExceededError` (default 64) |
| RT6 | Hook handler overwrite guard | Medium   | T2     | Uninstall previous registration on duplicate `addHook`              |
| RT7 | Hook context freeze          | Medium   | T7     | `Object.freeze()` on context snapshots before hook callbacks        |
| RT8 | Tracing warnings             | Low      | T6     | Warn when no hooks configured (dev-time only)                       |

**New tests:** 34 | **New files:** 9 | **Modified files:** 11 | **Breaking changes:** ~2

### Graph (7.5 → 10.0)

| #     | Change                               | Severity | Themes | Description                                                                                                 |
| ----- | ------------------------------------ | -------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| G1    | Audit trail sink                     | High     | T4     | `AuditSink` interface with global setter; emits build/validation/depth events                               |
| G2    | GraphBuildException                  | High     | T2     | Replace `throw new Error(message)` with `GraphBuildException` preserving full union error via `Error.cause` |
| G3    | Deep `isGraph` guard                 | High     | T5     | Validate `__portName`, `requires` array, `lifetime` values (not just truthiness)                            |
| G4    | Port name validation                 | Medium   | T5     | Reject empty/invalid port names at registration time                                                        |
| G5    | Property-based testing               | Medium   | --     | fast-check generators for graph invariant verification                                                      |
| G6-10 | Documentation, versioning, changelog | Low      | --     | API stability annotations, decision provenance, version tooling                                             |

**New tests:** ~40 | **New files:** 6 | **Modified files:** 13 | **Breaking changes:** 2

---

## Phase 4: Workflow Security

**Packages:** Flow, Saga
**Rationale:** Both are workflow engines requiring authorization/ACL (the weakest criterion at 2-4/10). These changes are independent of each other and can be parallelized.
**Score impact:** Flow 6.5→10.0 (+3.5), Saga 7.5→10.0 (+2.5)

### Flow (6.5 → 10.0) -- Second largest gap

| #   | Change                          | Severity | Themes | Description                                                                  |
| --- | ------------------------------- | -------- | ------ | ---------------------------------------------------------------------------- |
| F1  | Authorization/ACL layer         | CRITICAL | T3     | `Principal`, `AuthorizationPolicy`, `sendAs()` API                           |
| F2  | Approval gate mechanism         | CRITICAL | T3     | `PendingApproval`, `approve()`, `rejectApproval()` for regulated transitions |
| F3  | Audit eviction callback         | CRITICAL | T4     | `CircularBuffer.push()` notification when records evicted                    |
| F4  | Deterministic parallel ordering | HIGH     | T1     | `sortedKeys()` at 9 `Object.keys()` locations                                |
| F5  | State versioning + migration    | HIGH     | --     | `version` field on `SerializedMachineState`, migration framework             |
| F6  | Deterministic activity IDs      | HIGH     | T1     | `crypto.randomUUID()` replacing `Math.random()` at `manager.ts:328`          |
| F7  | Guard purity enforcement        | HIGH     | T1     | Detection/warning for impure guard functions                                 |
| F8  | Partial effect compensation     | HIGH     | T2     | Rollback for partially-executed effect sequences                             |
| F9  | Audit hash chain                | MEDIUM   | T4     | FNV-1a hash chain on `AuditRecord` for tamper detection                      |
| F10 | Event validation                | MEDIUM   | T5     | Runtime event payload validation                                             |
| F11 | Context schema on restore       | MEDIUM   | T5     | Validate context shape when restoring serialized state                       |
| F12 | Pluggable clock                 | LOW      | T8     | Injectable clock interface                                                   |
| F13 | Tracing warnings                | LOW      | T6     | `warnOnce` pattern with `suppressGxpWarnings` option                         |

**New tests:** 50+ | **Breaking changes:** 7

### Saga (7.5 → 10.0)

| #   | Change                         | Severity | Themes | Description                                                            |
| --- | ------------------------------ | -------- | ------ | ---------------------------------------------------------------------- | ------- | ------- |
| S1  | Write-ahead checkpointing      | CRITICAL | T4     | Checkpoint BEFORE step execution (not after) to guarantee exactly-once |
| S2  | Dead-letter queue              | CRITICAL | T2     | `DeadLetterQueue` for permanently failed compensations                 |
| S3  | Resume event emission          | HIGH     | T4     | Emit `step:resumed` events during crash recovery replay                |
| S4  | Runtime input validation       | HIGH     | T5     | `inputValidator` hook on saga definition                               |
| S5  | Authorization hooks            | HIGH     | T3     | `SagaPrincipal` + `AuthorizationHook` on `ExecuteOptions`              |
| S6  | Compensation timeout           | HIGH     | T2     | Configurable timeout per compensation step                             |
| S7  | Definition versioning          | HIGH     | --     | `version` field + `stepFingerprint` on `SagaDefinition`                |
| S8  | Crypto execution IDs           | MEDIUM   | T1     | `crypto.randomUUID()` replacing `Date.now()` + counter                 |
| S9  | Checkpoint failure policy      | MEDIUM   | T2     | Configurable: `"swallow"                                               | "abort" | "warn"` |
| S10 | Resume state bounds validation | MEDIUM   | T5     | Validate step index/state before resuming                              |

**New tests:** 60+ | **New files:** 3 | **Breaking changes:** 8

---

## Phase 5: Data Safety

**Packages:** Store, Query
**Rationale:** State management and data fetching need runtime validation and data protection. Independent of each other; can be parallelized.
**Score impact:** Store 7.5→10.0, Query 7.5→10.0

### Store (7.5 → 10.0)

| #    | Change                             | Severity | Themes | Description                                                              |
| ---- | ---------------------------------- | -------- | ------ | ------------------------------------------------------------------------ |
| ST1  | Fix `deepFreeze()` early-exit      | High     | T7     | Bug at `deep-freeze.ts:21` -- skips nested objects on pre-frozen parents |
| ST2  | Tracing warnings                   | High     | T6     | One-time console.warn per container when tracing not configured          |
| ST3  | Runtime payload validation         | High     | T5     | Validation hook on state service for action payloads                     |
| ST4  | State-before-effects ordering      | High     | T4     | Commit state after effect verification, not before                       |
| ST5  | Deterministic sampling             | Medium   | T1     | `randomFn` on `ActionHistory` reservoir sampling                         |
| ST6  | Injectable clock                   | Medium   | T8     | Replace 7x `Date.now()` sites with pluggable clock                       |
| ST7  | Effect status tracking             | Medium   | T4     | `ActionHistory.updateEffectStatus()` to resolve stuck "pending"          |
| ST8  | Effect error propagation           | Medium   | T2     | Surface errors when `onError` undefined (not silently discard)           |
| ST9  | Auto-rollback for critical effects | Low      | T2     | `autoRollback: true` option on ports with critical effects               |
| ST10 | Tracing context warnings           | Low      | T6     | Additional warning points across 4 service types                         |

**New tests:** ~30 | **New files:** 4 | **Breaking changes:** ~3

### Query (7.5 → 10.0)

| #      | Change                           | Severity | Themes | Description                                                          |
| ------ | -------------------------------- | -------- | ------ | -------------------------------------------------------------------- |
| Q1     | Response schema validation       | High     | T5     | `validate` hook on `QueryPortConfig` + `QueryValidationFailed` error |
| Q2     | Audit trail warnings             | High     | T6     | One-time console.warn on first fetch/mutate when tracing absent      |
| Q3     | Correlation IDs on events        | High     | T4     | Add `correlationId` field to `CacheEvent` and `QueryClientEvent`     |
| Q4     | Dehydration version check        | High     | T5     | Validate `version` field in `hydrate()`                              |
| Q5     | Timeout enforcement              | High     | T2     | `timeout` field on `QueryDefaults` with `AbortSignal.timeout()`      |
| Q6     | Cache encryption                 | Medium   | T3     | `encrypt`/`decrypt` hooks on `PersistenceConfig`                     |
| Q7     | Proactive expiry check           | Medium   | T4     | Check expiry in `cache.get()` (not just GC sweep)                    |
| Q8     | `stableStringify` error handling | Medium   | T2     | Handle non-serializable values gracefully                            |
| Q9     | Error cause classification       | Medium   | T2     | `causeClassification` field on `QueryFetchFailed`                    |
| Q10    | CSRF token support               | Low      | T3     | `csrfToken` field on `FetchContext`                                  |
| Q11-13 | Additional safety                | Low      | --     | GC determinism, retry audit, dedup audit                             |

**New tests:** 45 | **New files:** ~7 | **Modified files:** 9 | **Breaking changes:** ~3

---

## Phase 6: Integration Polish

**Packages:** React
**Rationale:** Consumer of Core + Runtime. Should be last because upstream changes (Core tracing warnings, Runtime lifecycle errors) affect React's integration layer.
**Score impact:** React 8.0→10.0

### React (8.0 → 10.0)

| #    | Change                            | Severity | Themes | Description                                                                          |
| ---- | --------------------------------- | -------- | ------ | ------------------------------------------------------------------------------------ |
| RE1  | Disposal error reporting          | High     | T2     | `.catch()` + `console.error` on `void scope.dispose()` in 4 locations                |
| RE2  | StrictMode consistency            | High     | --     | Consistent deferred disposal strategy across all AutoScopeProviders                  |
| RE3  | `isChildContainer` hardening      | Medium   | T5     | Secondary structural check beyond `INTERNAL_ACCESS`                                  |
| RE4  | Context value memoization         | Medium   | --     | `useMemo` in `ReactiveScopeProvider`, `TracingProvider`, `InspectorProvider`         |
| RE5  | LazyContainerProvider effect fix  | Medium   | --     | Refactor effect to not be both producer and consumer of dependencies                 |
| RE6  | SSR `getServerSnapshot`           | Medium   | --     | Warn instead of collapsing "disposing" state                                         |
| RE7  | `MissingProviderError` everywhere | Medium   | T2     | Replace 11 generic `Error` throws with `MissingProviderError` in compound components |
| RE8  | Dynamic `displayName`             | Low      | --     | `"DIComponent(Logger,UserService)"` instead of static `"DIComponent"`                |
| RE9  | DevToolsBridge tests              | Low      | --     | 4 new tests (currently zero coverage)                                                |
| RE10 | `useDeps` memoization             | Low      | --     | `useMemo` for deps object (new object every render currently)                        |
| RE11 | Optional tracing hooks            | Low      | T6     | `useOptionalTracer`, `useTracerOptional` with console.warn fallback                  |
| RE12 | Error boundary documentation      | Low      | --     | TSDoc examples for recommended error boundary patterns                               |
| RE13 | usePort memoization docs          | Low      | --     | Document global vs factory memoization difference                                    |

**New tests:** 23+ | **New files:** 6 | **Modified files:** 19 | **Breaking changes:** 0

---

## Phase Execution Summary

| Phase     | Packages        | Current Avg | After Avg | Total Changes | Total Tests | Breaking |
| --------- | --------------- | :---------: | :-------: | :-----------: | :---------: | :------: |
| **1**     | Result, Core    |     8.6     |   10.0    |      19       |     ~35     |    6     |
| **2**     | Logger, Tracing |     6.5     |   10.0    |      33       |     130     |   ~11    |
| **3**     | Runtime, Graph  |     7.7     |   10.0    |      18       |     ~74     |    ~4    |
| **4**     | Flow, Saga      |     7.0     |   10.0    |      23       |    110+     |    15    |
| **5**     | Store, Query    |     7.5     |   10.0    |      23       |     ~75     |    ~6    |
| **6**     | React           |     8.0     |   10.0    |      13       |     23+     |    0     |
| **Total** | **11 packages** |   **7.4**   | **10.0**  |   **~139**    |  **~460+**  | **~31**  |

---

## Parallelization Strategy

Within each phase, packages are independent and can be worked in parallel:

```
Sequential dependency chain:
  Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 6
                                  │
                                  ├──► Phase 4 (can start with Phase 3)
                                  │
                                  └──► Phase 5 (can start with Phase 3)

Parallel execution within phases:
  Phase 1: Result ║ Core          (parallel)
  Phase 2: Logger ║ Tracing       (parallel)
  Phase 3: Runtime ║ Graph        (parallel)
  Phase 4: Flow ║ Saga            (parallel, can overlap with Phase 5)
  Phase 5: Store ║ Query          (parallel, can overlap with Phase 4)
  Phase 6: React                  (after Phase 3 complete)
```

**Optimal critical path:** Phases 1 → 2 → 3 → 6 (sequential), with Phases 4+5 running in parallel alongside Phase 3/6.

---

## Cross-Cutting Implementation Notes

### Tracing Warning Pattern (All Packages)

Every package implements the same pattern:

```typescript
let _warned = false;

function warnIfNoTracing(): void {
  if (!_warned) {
    _warned = true;
    console.warn(
      "[hex-di/<package>] No tracing configured. " +
        "Audit trail entries will not include trace context. " +
        "This warning appears once per process."
    );
  }
}
```

- **Frequency:** Once per process/instance (never per-call)
- **Channel:** `console.warn` or `stderr` (package-specific)
- **Suppressible:** Via configuration flag or no-op tracer
- **Never blocks:** No thrown errors, no rejected promises

### Determinism Pattern (6 Packages)

Replace `Math.random()` with:

- **IDs:** `crypto.randomUUID()` (or `crypto.getRandomValues()`)
- **Sampling:** Injectable `randomFn` defaulting to `Math.random()` for backward compat, with `seedableRandom(seed)` for deterministic replay
- **Correlation:** Monotonic counter format `corr_{counter}_{sequence}`

### Audit Trail Pattern (5 Packages)

Each audit-emitting package follows:

1. **Sink interface:** `AuditSink` with `emit(event)` method
2. **Global setter:** `configureAuditSink(sink)` at composition root
3. **Eviction callback:** `onEvict()` before any buffer eviction
4. **Hash chain (opt-in):** FNV-1a linking entries for tamper evidence
5. **Fallback:** When no sink configured, emit one-time warning

---

## Acceptance Criteria per Phase

### Phase 1 Exit Criteria

- [ ] `Result.ok(x)` values are frozen; mutation throws in strict mode
- [ ] `isResult()` uses brand symbol, not structural check
- [ ] `Core.createCorrelationId()` is deterministic and injectable
- [ ] All 7 Core error classes freeze instances
- [ ] `ContextMap` cast is encapsulated with soundness documentation
- [ ] All new tests pass; existing tests unbroken

### Phase 2 Exit Criteria

- [ ] Logger `handler.handle()` errors are caught and reported to stderr
- [ ] Logger annotation validation rejects non-serializable values
- [ ] All 3 adapter flush/shutdown methods actually work (verified by output capture tests)
- [ ] Logger entries have monotonic sequence numbers
- [ ] Tracing span eviction emits audit events (never silent)
- [ ] PII filtering is configurable via `AttributeFilterConfig`
- [ ] Span stack uses `AsyncLocalStorage` for concurrent isolation
- [ ] 130 new tests pass

### Phase 3 Exit Criteria

- [ ] Runtime finalizer timeout prevents infinite disposal hangs
- [ ] `monotonicNow()` replaces all `Date.now()` sites
- [ ] MemoMap deduplicates concurrent async factory calls
- [ ] Scope depth limit prevents runaway nesting (default 64)
- [ ] Graph builds emit audit events via `AuditSink`
- [ ] `GraphBuildException` preserves full union error via `cause`
- [ ] `isGraph()` performs deep structural validation

### Phase 4 Exit Criteria

- [ ] Flow `send()` requires `Principal` for all transitions
- [ ] Flow approval gates block transitions until `approve()` called
- [ ] Flow parallel regions iterate in sorted deterministic order
- [ ] Flow audit records are hash-chained for tamper evidence
- [ ] Saga checkpoints happen BEFORE step execution (write-ahead)
- [ ] Saga has dead-letter queue for permanently failed compensations
- [ ] Saga `step:resumed` events emitted during crash recovery
- [ ] Both packages have authorization/ACL enforcement

### Phase 5 Exit Criteria

- [ ] Store `deepFreeze()` recurses through pre-frozen parents
- [ ] Store state mutations have runtime payload validation
- [ ] Query responses are validated against schema before caching
- [ ] Query cache supports optional encryption via hooks
- [ ] Both packages emit tracing warnings when not configured
- [ ] All events carry correlation IDs

### Phase 6 Exit Criteria

- [ ] React disposal errors are reported to `console.error` (not swallowed)
- [ ] All context values are memoized (no unnecessary re-renders)
- [ ] All compound components throw `MissingProviderError` (not generic `Error`)
- [ ] `useSpan()` and `useTracedCallback()` degrade gracefully without `TracingProvider`
- [ ] DevToolsBridge has test coverage
- [ ] Zero breaking changes

---

## Risk Register

| Risk                                                             | Likelihood | Impact | Phase | Mitigation                                                        |
| ---------------------------------------------------------------- | ---------- | ------ | ----- | ----------------------------------------------------------------- |
| Logger sequence numbers break external LogEntry construction     | Medium     | High   | 2     | Provide `createLogEntry()` factory that auto-assigns sequence     |
| Flow authorization adds friction to existing non-regulated users | Medium     | Medium | 4     | Make ACL opt-in via `requireAuthorization: true` on runner config |
| Hash chain computation adds latency to hot paths                 | Low        | Medium | 2, 4  | Use FNV-1a (~nanosecond); opt-in via `withIntegrity()`            |
| Winston transport drain timing non-deterministic                 | Medium     | Medium | 2     | Safety timeout (5s) on drain promise                              |
| AsyncLocalStorage not available in all runtimes                  | Low        | High   | 2     | Fallback to module-level stack with degradation warning           |
| Phase 4+5 overlap creates integration conflicts                  | Low        | Medium | 4, 5  | Both phases only touch their own packages; no shared files        |
| 31 breaking changes cause downstream churn                       | Medium     | Medium | All   | Batch per phase; single major version bump per phase              |

---

## Version Strategy

Each phase culminates in a coordinated version bump:

| Phase | Packages                                                                                                                   | Version Bump                                         |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1     | Result, Core                                                                                                               | `0.1.0` → `0.2.0`                                    |
| 2     | Logger, Logger-Bunyan, Logger-Pino, Logger-Winston, Tracing, Tracing-OTel, Tracing-DataDog, Tracing-Zipkin, Tracing-Jaeger | `0.1.0` → `0.2.0`                                    |
| 3     | Runtime, Graph                                                                                                             | `0.1.0` → `0.2.0`                                    |
| 4     | Flow, Saga                                                                                                                 | `0.1.0` → `0.2.0`                                    |
| 5     | Store, Query                                                                                                               | `0.1.0` → `0.2.0`                                    |
| 6     | React                                                                                                                      | `0.1.0` → `0.2.0` (patch-level; no breaking changes) |

All packages bump to `0.2.0` uniformly. Peer dependency ranges updated per phase.

---

## References

Each package has a detailed tech-refinement document with exact file paths, line numbers, code diffs, and test specifications:

| Package | Tech Refinement                                                                    | Analysis Report                                                  |
| ------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Result  | [`Gxp/result/analysis/tech-refinement.md`](./result/analysis/tech-refinement.md)   | [`Gxp/result/analysis/report.md`](./result/analysis/report.md)   |
| Core    | [`Gxp/core/analysis/tech-refinement.md`](./core/analysis/tech-refinement.md)       | [`Gxp/core/analysis/report.md`](./core/analysis/report.md)       |
| Logger  | [`Gxp/logger/analysis/tech-refinement.md`](./logger/analysis/tech-refinement.md)   | [`Gxp/logger/analysis/report.md`](./logger/analysis/report.md)   |
| Tracing | [`Gxp/tracing/analysis/tech-refinement.md`](./tracing/analysis/tech-refinement.md) | [`Gxp/tracing/analysis/report.md`](./tracing/analysis/report.md) |
| Runtime | [`Gxp/runtime/analysis/tech-refinement.md`](./runtime/analysis/tech-refinement.md) | [`Gxp/runtime/analysis/report.md`](./runtime/analysis/report.md) |
| Graph   | [`Gxp/graph/analysis/tech-refinement.md`](./graph/analysis/tech-refinement.md)     | [`Gxp/graph/analysis/report.md`](./graph/analysis/report.md)     |
| Flow    | [`Gxp/flow/analysis/tech-refinement.md`](./flow/analysis/tech-refinement.md)       | [`Gxp/flow/analysis/report.md`](./flow/analysis/report.md)       |
| Saga    | [`Gxp/saga/analysis/tech-refinement.md`](./saga/analysis/tech-refinement.md)       | [`Gxp/saga/analysis/report.md`](./saga/analysis/report.md)       |
| Store   | [`Gxp/store/analysis/tech-refinement.md`](./store/analysis/tech-refinement.md)     | [`Gxp/store/analysis/report.md`](./store/analysis/report.md)     |
| Query   | [`Gxp/query/analysis/tech-refinement.md`](./query/analysis/tech-refinement.md)     | [`Gxp/query/analysis/report.md`](./query/analysis/report.md)     |
| React   | [`Gxp/react/analysis/tech-refinement.md`](./react/analysis/tech-refinement.md)     | [`Gxp/react/analysis/report.md`](./react/analysis/report.md)     |

**Executive Summary:** [`Gxp/executive-summary.md`](./executive-summary.md)

---

_End of Implementation Roadmap_
