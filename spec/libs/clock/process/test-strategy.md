# Test Strategy

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-CLK-PRC-002 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- process/test-strategy.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- process/test-strategy.md` |
| Approval Evidence | PR merge to `main` |
| Reviewer | PR approval record — see Git merge commit |
| Change History | `git log --oneline --follow -- process/test-strategy.md` |
| Status | Effective |

## Test Pyramid

```
         ┌──────────────┐
         │  PQ (5 tests) │  Hardware-specific, production environment
         │   OQ (8 tests)│  Operational conditions, load testing
         │  IQ (44 tests)│  Installation verification
         ├──────────────┤
         │  GxP Integrity │  Freeze, tamper-evidence, irresettability
         │    (~50 tests) │
         ├──────────────┤
         │  Type Tests    │  Compile-time safety verification
         │  (*.test-d.ts) │
         ├──────────────┤
         │  Unit Tests    │  All public API, all edge cases
         │   (~300 tests) │
         └──────────────┘
```

## Test Levels

### Unit Tests

- **Tool**: Vitest
- **Location**: `tests/*.test.ts`
- **Scope**: Every public function, method, and type guard. Both success and error paths. Edge cases (negative values, zero, `MAX_SAFE_INTEGER`, NaN, platform unavailability).
- **Coverage targets**: Line > 95%, Branch > 90%, Function = 100%
- **Execution**: CI on every commit

### Type Tests

- **Tool**: Vitest typecheck (`vitest typecheck`)
- **Location**: `tests/*.test-d.ts`
- **Scope**: Branded timestamp type safety, port structural compatibility, `Result` return types, phantom type parameter behavior.
- **Execution**: CI on every commit

### GxP Integrity Tests

- **Tool**: Vitest
- **Location**: `tests/gxp-clock.test.ts`
- **Scope**: `Object.freeze()` verification on all adapters and return values, structural irresettability (no `reset()` on production `SequenceGeneratorPort`), `TemporalContext` immutability, error object immutability, clock source change event integrity.
- **Execution**: CI on every commit

### Installation Qualification (IQ)

- **Tool**: Vitest
- **Location**: `tests/gxp-iq-clock.test.ts`
- **Scope**: 44 test steps verifying package installation, export surface, immutability, platform detection, startup self-test, diagnostics, and GxP-specific features (IQ-1 through IQ-25, plus supplementary installation checks added in revisions 2.2–2.3).
- **Execution**: CI on every commit; also executed on each deployment target per CLK-QUA-001.

### Operational Qualification (OQ)

- **Tool**: Vitest
- **Location**: `tests/gxp-oq-clock.test.ts`
- **Scope**: 8 test steps verifying monotonicity under load, accuracy under load, concurrency uniqueness, and precision.
- **Execution**: CI on every commit; re-executed after IQ passes per CLK-QUA-004.

### Performance Qualification (PQ)

- **Tool**: Vitest
- **Location**: `tests/gxp-pq-clock.test.ts`
- **Scope**: 5 test steps verifying throughput, sustained precision, extended uniqueness, and memory stability on production-representative hardware.
- **Execution**: **NOT in CI** — executed on deployment target hardware per CLK-QUA-007. Environment variables configure thresholds per deployment.

### Mutation Tests

- **Tool**: Stryker Mutator
- **Scope**: All source files in `src/`
- **Target**: > 95% mutation kill rate
- **Surviving mutant policy**: Reviewed, justified, and recorded. No surviving mutants in security-critical code (brand checks, freeze calls, self-test logic).
- **Execution**: CI on every commit (or periodically if CI budget is constrained)

## Test Organization by DoD Group

The 457 individual tests are organized into 37 Definition of Done (DoD) groups, each corresponding to a functional area. The complete enumeration is in [09-definition-of-done.md](../09-definition-of-done.md).

| DoD Group | Test File | Test Count | Scope |
|-----------|-----------|:----------:|-------|
| DoD 1 | `clock-port.test.ts` | ~7 | Clock Port interface |
| DoD 2 | `sequence-generator.test.ts` | ~15 | Sequence Generator |
| DoD 3 | `system-clock.test.ts` + startup + fallback | ~32 | System Clock adapter |
| DoD 4 | `virtual-clock.test.ts` | ~15 | Virtual Clock |
| DoD 5 | `virtual-sequence.test.ts` | ~10 | Virtual Sequence |
| DoD 6 | `clock-diagnostics.test.ts` | ~12 | Clock Diagnostics |
| DoD 7 | `gxp-clock.test.ts` | ~19 | GxP Compliance |
| DoD 8/8a/8b/8c | `temporal-context.test.ts` + related | ~78 | Temporal Context suite |
| DoD 9 | `gxp-iq-clock.test.ts` | 44 | IQ Protocol |
| DoD 10 | `gxp-oq-clock.test.ts` | 8 | OQ Protocol |
| DoD 11 | `gxp-pq-clock.test.ts` | 5 | PQ Protocol |
| DoD 12 | `graph-integration.test.ts` | ~10 | Container graph integration |
| DoD 13 | `clock-source-change.test.ts` | ~9 | Clock source change events |
| DoD 14 | `clock-source-bridge.test.ts` | ~8 | Clock source bridge |
| DoD 15 | `gxp-metadata.test.ts` | ~6 | GxP metadata |
| DoD 16 | `hardware-clock.test-d.ts` | ~4 | Hardware clock types |
| DoD 17 | `branded-timestamps.test.ts` | ~12 | Branded timestamps |
| DoD 18 | `system-timer.test.ts` | ~14 | System timer scheduler |
| DoD 19-20 | `virtual-timer.test.ts` | ~20 | Virtual timer scheduler |
| DoD 21-23 | `cached-clock.test.ts` | ~18 | Cached clock (system + virtual + types) |
| DoD 24 | `clock-capabilities.test.ts` | ~10 | Clock capabilities |
| DoD 25 | `edge-runtime-clock.test.ts` | ~9 | Edge runtime adapter |
| DoD 26 | `host-bridge-clock.test.ts` | ~9 | Host bridge adapter |
| DoD 27 | `async-combinators.test.ts` | ~8 | Async combinators |
| DoD 28 | `duration-types.test.ts` | ~10 | Duration types |
| DoD 29 | `temporal-interop.test.ts` | ~8 | Temporal API interop |
| DoD 30 | `benchmarks/clock-*.bench.ts` | ~5 | Benchmark specification |
| DoD 31 | `assertion-helpers.test.ts` | ~8 | Testing assertion helpers |
| DoD 32 | `clock-context.test.ts` | ~8 | AsyncLocalStorage clock context |
| DoD 33 | `cached-clock-registration.test.ts` | ~6 | Cached clock registration |
| DoD 34 | `process-instance-id.test.ts` | ~6 | Process instance ID |
| DoD 35 | `periodic-evaluation.test.ts` | ~8 | Periodic clock evaluation |
| DoD 36 | `retention-utilities.test.ts` | ~6 | Retention utilities |
| DoD 37 | `validated-branding.test.ts` | ~8 | Validated branding |

## CI Pipeline

The CI pipeline for `@hex-di/clock` must execute:

1. **Lint** — ESLint
2. **Type Check** — `tsc --noEmit`
3. **Unit Tests** — `vitest run`
4. **Type Tests** — `vitest typecheck`
5. **GxP Tests** — included in unit test suite (DoD 7, DoD 9, DoD 10)
6. **Mutation Tests** — `stryker run` (> 95% threshold)
7. **Build** — `tsc -p tsconfig.build.json`

PQ tests (DoD 11) are excluded from CI and run on deployment target hardware.
