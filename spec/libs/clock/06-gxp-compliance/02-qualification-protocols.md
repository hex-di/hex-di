# 6.2 Qualification Protocols — GxP Compliance

> **Part of:** [GxP Compliance (§6)](./README.md) | **Previous:** [§6.1 Clock Source Requirements](./01-clock-source-requirements.md) | **Next:** [§6.3 Verification and Change Control](./03-verification-and-change-control.md)

> For the generic IQ/OQ/PQ/DQ validation protocol template, see [../../cross-cutting/gxp/06-validation-protocol-template.md](../../cross-cutting/gxp/06-validation-protocol-template.md). This section contains clock-specific qualification steps.

### Installation Qualification (IQ) Protocol for `@hex-di/clock`

GxP deployments MUST execute the following IQ checklist as part of the computerized system validation plan. This protocol verifies that the `@hex-di/clock` package is correctly installed and configured before operational use.

| IQ Step | Verification                       | Expected Result                                                                                                                          | Method                                                                                                                                                       |
| ------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| IQ-1    | Package version                    | Installed version matches validated version in the CSV plan                                                                              | `npm list @hex-di/clock` or `pnpm list @hex-di/clock`                                                                                                        |
| IQ-2    | Export surface                     | Main entry point exports all documented ports, factories, and types from section 8.1                                                     | Automated test: import each named export and verify it is not `undefined`                                                                                    |
| IQ-3    | Testing entry point                | `@hex-di/clock/testing` exports `VirtualClockAdapter`, `VirtualSequenceGenerator`, and associated factories                              | Automated test: import each named export and verify it is not `undefined`                                                                                    |
| IQ-4    | Factory immutability               | `createSystemClock()` returns `ok()` containing a frozen object                                                                          | Automated test: unwrap `createSystemClock()` and verify `Object.isFrozen()` returns `true`                                                                   |
| IQ-5    | Factory immutability               | `createSystemSequenceGenerator()` returns a frozen object                                                                                | Automated test: `Object.isFrozen(createSystemSequenceGenerator())` returns `true`                                                                            |
| IQ-6    | Structural irresettability         | `createSystemSequenceGenerator()` result has no `reset` property                                                                         | Automated test: `'reset' in createSystemSequenceGenerator()` returns `false`                                                                                 |
| IQ-7    | Platform detection                 | `ClockDiagnosticsPort.getDiagnostics()` reports correct `monotonicSource` for the deployment platform                                    | Automated test: verify `monotonicSource` matches expected value for the platform (e.g., `'performance.now'` for Node.js 16+)                                 |
| IQ-8    | Platform detection                 | `ClockDiagnosticsPort.getDiagnostics()` reports correct `highResSource` for the deployment platform                                      | Automated test: verify `highResSource` matches expected value for the platform                                                                               |
| IQ-9    | Diagnostics immutability           | `getDiagnostics()` returns a frozen object                                                                                               | Automated test: `Object.isFrozen(getDiagnostics())` returns `true`                                                                                           |
| IQ-10   | Error immutability                 | `createSequenceOverflowError()` returns a frozen object                                                                                  | Automated test: `Object.isFrozen(createSequenceOverflowError(0))` returns `true`                                                                             |
| IQ-11   | Anti-tampering                     | `SystemClockAdapter` uses captured `Date.now` reference, not global `Date.now`                                                           | Automated test: replace `globalThis.Date.now` after construction and verify `wallClockNow()` returns values from the original captured reference             |
| IQ-12   | Temporal context                   | `createTemporalContextFactory()` returns a frozen factory producing frozen `TemporalContext` objects                                     | Automated test: verify both factory and output are frozen                                                                                                    |
| IQ-13   | Platform API freeze                | `Date` and `performance` objects are frozen at application entry point (GxP requirement)                                                 | Deployment-context verification (see IQ-13 Execution Context note below)                                                                                     |
| IQ-14   | Startup self-test                  | `createSystemClock()` performs startup self-test (21 CFR 11.10(h) device checks) and succeeds on the deployment platform                 | Automated test: verify `createSystemClock()` returns `ok()` (not `err(ClockStartupError)`)                                                                   |
| IQ-15   | Startup self-test error            | `ClockStartupError` is frozen at construction                                                                                            | Automated test: `Object.isFrozen(createClockStartupError('ST-1', -1, 'test'))` returns `true`                                                                |
| IQ-16   | GxP mode startup                   | `createSystemClock({ gxp: true })` succeeds when `Date` and `performance` are frozen                                                     | Automated test: freeze platform APIs, then verify `createSystemClock({ gxp: true })` returns `ok()`                                                          |
| IQ-17   | Overflow context                   | `createOverflowContext()` returns a frozen `OverflowTemporalContext` with `_tag: 'OverflowTemporalContext'` and `sequenceNumber: -1`     | Automated test: verify structure and immutability of returned object                                                                                         |
| IQ-18   | Overflow context type guard        | `isOverflowTemporalContext()` correctly discriminates `OverflowTemporalContext` from `TemporalContext`                                   | Automated test: verify `true` for overflow context, `false` for normal context                                                                               |
| IQ-19   | High-res/wall-clock consistency    | `highResNow()` and `wallClockNow()` agree within 1000ms on the deployment platform (ST-5 passes)                                         | Automated test: verify `Math.abs(highResNow() - wallClockNow()) < 1000` on the deployment platform. Failure indicates `performance.timeOrigin` drift (FM-9). |
| IQ-20   | Deserialization utility validation  | `deserializeTemporalContext()`, `deserializeOverflowTemporalContext()`, and `deserializeClockDiagnostics()` correctly validate schema version and structural integrity, returning `ok()` for valid input and `err(DeserializationError)` for invalid input | Automated test: pass valid v1 JSON and verify `ok()` with frozen output; pass missing/invalid `schemaVersion`, missing fields, and wrong types and verify `err(DeserializationError)` with correct `expectedVersions` and `field` |
| IQ-21   | GxP metadata                        | `getClockGxPMetadata()` returns a frozen `ClockGxPMetadata` object containing `requiredMonitoringVersion` and `specRevision` matching the current specification                                                                                                | Automated test: call `getClockGxPMetadata()`, verify `Object.isFrozen()` returns `true`, verify `requiredMonitoringVersion` is a valid semver string or `undefined`, verify `specRevision` matches expected value                                    |
| IQ-22   | Per-record cryptographic integrity  | `computeTemporalContextDigest()` produces a valid SHA-256 `TemporalContextDigest` and `verifyTemporalContextDigest()` confirms integrity                                                                                                                 | Automated test: create `TemporalContext`, compute digest, verify returns `true`; modify one field, verify returns `false`                                                                                                        |
| IQ-23   | TimerScheduler export surface       | `createSystemTimerScheduler()` returns a frozen `TimerSchedulerPort` with all 5 methods (`setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`, `sleep`). `@hex-di/clock/testing` exports `createVirtualTimerScheduler`. | Automated test: import each named export and verify methods exist; verify `Object.isFrozen()` on system adapter |
| IQ-24   | CachedClock export surface          | `createCachedClock()` returns a frozen `CachedClockAdapter` with `recentMonotonicNow`, `recentWallClockNow`, `start`, `stop`, `isRunning`. `@hex-di/clock/testing` exports `createVirtualCachedClock`. | Automated test: import each named export and verify methods exist; verify `Object.isFrozen()` on adapter |
| IQ-25   | Branded type exports                | `MonotonicTimestamp`, `WallClockTimestamp`, `HighResTimestamp` types are exported. `asMonotonic`, `asWallClock`, `asHighRes` functions are exported and return their argument unchanged. | Automated test: import each named export; verify `asMonotonic(42) === 42`, `asWallClock(42) === 42`, `asHighRes(42) === 42` |
| IQ-26   | Host bridge type exports            | `HostClockBridge` and `HostBridgeClockOptions` are exported from the main entry point. | Automated test: import each named export and verify it is not `undefined` |
| IQ-27   | Edge/host-bridge adapter exports | `EdgeRuntimeClockAdapter` and `createHostBridgeClockAdapter` are exported from the main entry point. | Automated test: import each named export and verify it is defined |
| IQ-28   | ClockCapabilities immutability       | `SystemClockAdapter.getCapabilities()` returns a frozen `ClockCapabilities` object with all expected properties. | Automated test: call `getCapabilities()` on unwrapped system clock, verify `Object.isFrozen()` returns `true` and all fields are present |
| IQ-29   | Edge runtime degradation reporting   | `EdgeRuntimeClockAdapter.getCapabilities().highResDegraded` is `true` (degradation correctly reported). | Automated test: create edge runtime adapter, verify `getCapabilities().highResDegraded === true` |
| IQ-30   | Host bridge capabilities platform    | `HostBridgeClockAdapter.getCapabilities().platform` matches the provided `HostBridgeClockOptions.platform`. | Automated test: create host bridge adapter with `platform: 'react-native'`, verify `getCapabilities().platform === 'react-native'` |

REQUIREMENT (CLK-QUA-001): GxP organizations MUST execute this IQ protocol (IQ-1 through IQ-30) on each deployment target (production, staging, disaster recovery) and retain the results as part of the validation evidence package. The IQ protocol MUST be re-executed after any `@hex-di/clock` version upgrade.

REQUIREMENT (CLK-QUA-002): The IQ automated tests SHOULD be implemented as a dedicated test suite (`gxp-iq-clock.test.ts`) that can be run independently during deployment validation, separate from the standard unit test suite.

#### IQ-13 Execution Context

IQ-13 verifies that the deployment environment freezes `Date` and `performance` at the application entry point (DQ-3). Unlike IQ-1 through IQ-12 and IQ-14 through IQ-30, which verify library behavior and can run in a standard test runner, IQ-13 verifies a deployment-level invariant: the application's entry point calls `Object.freeze(Date)` and `Object.freeze(performance)` before any `@hex-di/clock` import.

Running `Object.isFrozen(Date)` in a Vitest test file would fail by default because the test runner does not freeze platform APIs — the test would be verifying the test harness, not the deployment. IQ-13 MUST therefore be verified using one of the following methods:

1. **Deployment startup script** (recommended): Include `Object.isFrozen(Date) && Object.isFrozen(performance)` assertions in the application's startup health check, executed after the entry point freeze but before the application begins processing requests. This verifies the actual deployment entry point.
2. **Dedicated IQ-13 test with `globalSetup`**: If automated execution within the IQ test suite is preferred, the test runner MUST be configured with a `globalSetup` file that calls `Object.freeze(Date)` and `Object.freeze(performance)` before any test files are loaded. The `globalSetup` file path MUST be documented in the IQ test suite configuration. This approach verifies that the freeze mechanism works on the deployment platform, though it does not verify the application entry point itself.
3. **Code review attestation**: A qualified reviewer (GxP Validation Engineer or QA Reviewer) performs a code review of the application entry point and attests that `Object.freeze(Date)` and `Object.freeze(performance)` are called before any `@hex-di/clock` import. The attestation MUST reference the specific file and line numbers, the commit hash, and the reviewer's signature.

REQUIREMENT (CLK-QUA-003): The IQ-13 verification method used MUST be documented in the IQ evidence package, including which of the three methods above was selected and the rationale for the choice.

### Operational Qualification (OQ) Protocol for `@hex-di/clock`

OQ verifies that `@hex-di/clock` functions correctly under operational conditions representative of the deployment environment. OQ tests exercise the production adapter under load and concurrency to confirm behavioral guarantees hold beyond static installation checks.

| OQ Step | Verification                              | Expected Result                                                                                                     | Method                                                                                                                      |
| ------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| OQ-1    | `monotonicNow()` monotonicity under load  | 1,000,000 consecutive calls produce non-decreasing values with zero violations                                      | Automated test: call `monotonicNow()` in a tight loop and assert `b >= a` for every pair                                    |
| OQ-2    | `wallClockNow()` accuracy under load      | All values within the configured drift window of `Date.now()` across 10,000 calls                                   | Automated test: compare each `wallClockNow()` return against `Date.now()` captured immediately before/after                 |
| OQ-3    | `next()` uniqueness under concurrency     | 10,000 concurrent microtask calls to `next()` produce 10,000 unique sequence numbers                                | Automated test: schedule 10,000 `Promise.resolve().then(() => seq.next())` calls and verify uniqueness of collected results |
| OQ-4    | `highResNow()` sub-millisecond precision  | At least 90% of 10,000 consecutive delta measurements are non-zero (sub-ms differentiation)                         | Automated test: compute deltas between consecutive `highResNow()` calls and verify ≥90% are > 0                             |
| OQ-5    | `getDiagnostics()` consistency under load | 1,000 calls under concurrent load all return identical `adapterName`, `monotonicSource`, and `highResSource` values | Automated test: call `getDiagnostics()` 1,000 times across microtasks and assert all results are deep-equal                 |

#### Negative OQ Tests (Error Path Verification)

GAMP 5 operational qualification includes verification that the system correctly handles error conditions under operational load. The following negative OQ tests verify that error paths function correctly and do not silently degrade.

**Virtual adapter usage note:** Negative OQ tests MAY use virtual or mock adapters (`VirtualSequenceGenerator`, `VirtualClockAdapter`) when the test objective requires injecting failure conditions impossible to reproduce on a correctly functioning production system. This is consistent with the scoping clarification in section 5.1 ("IQ/OQ/PQ Validation Constraints"), which restricts the virtual adapter prohibition to positive qualification tests. See section 5.1 for the full rationale.

**Test data cross-reference:** The detailed test input conditions, expected error types, and exact assertion criteria for each negative OQ test are specified in `09-definition-of-done.md`, DoD 10 (OQ test suite), tests #6 through #8. GxP Validation Engineers executing the OQ protocol MUST reference DoD 10 for the complete test data specification.

| OQ Step | Verification                                          | Expected Result                                                                                                                                                                                                                     | Method                                                                                                                                                                                                                      |
| ------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OQ-6    | GxP mode rejection with unfrozen platform APIs        | `createSystemClock({ gxp: true })` returns `err(ClockStartupError)` with check `'ST-4'` when `Date` and `performance` are not frozen                                                                                               | Automated test: call `createSystemClock({ gxp: true })` WITHOUT freezing platform APIs; assert result is `err` with `error.check === 'ST-4'`                                                                                |
| OQ-7    | `SequenceOverflowError` propagation under load        | `TemporalContextFactory.create()` correctly propagates `err(SequenceOverflowError)` when the underlying sequence generator is in overflow state, even under concurrent microtask load                                                | Automated test: create a `VirtualSequenceGenerator`, advance to `MAX_SAFE_INTEGER`, then schedule 100 concurrent `Promise.resolve().then(() => factory.create())` calls and assert all return `err(SequenceOverflowError)` |
| OQ-8    | Startup self-test failure under implausible wall-clock | `createSystemClock()` returns `err(ClockStartupError)` with check `'ST-2'` when the system clock reports a date before 2020-01-01                                                                                                  | Automated test: mock `Date.now` on `globalThis` to return `0` (Unix epoch) before calling `createSystemClock()`, and verify the startup self-test correctly rejects it with `err(ClockStartupError)` and `check === 'ST-2'`. **Note:** This test mocks the platform API, not a virtual adapter — `createSystemClock()` constructs its own internal timing functions from platform APIs and does not accept injected adapters. |

REQUIREMENT (CLK-QUA-004): GxP organizations MUST execute the OQ protocol on each deployment target (production, staging, disaster recovery). The OQ protocol MUST be re-executed after any `@hex-di/clock` version upgrade or platform change (OS version, Node.js version).

REQUIREMENT (CLK-QUA-005): The OQ automated tests SHOULD be implemented as a dedicated test suite (`gxp-oq-clock.test.ts`) that can be run independently during deployment validation, separate from the standard unit test suite and IQ suite.

### Performance Qualification (PQ) Protocol for `@hex-di/clock`

PQ verifies that `@hex-di/clock` meets performance requirements under sustained real-world conditions on the specific deployment hardware and runtime. PQ tests are long-running and intended to be executed during deployment qualification, not as part of CI/CD pipelines.

| PQ Step | Verification                             | Expected Result                                                                                                                                                         | Method                                                                                                                        |
| ------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| PQ-1    | Throughput sustainability                | `monotonicNow()`, `wallClockNow()`, `highResNow()`, and `next()` each meet the deployment's throughput requirement over a sustained 60-second window on target hardware | Automated test: call each function in a tight loop for 60 seconds and measure ops/sec; compare against configurable threshold |
| PQ-2    | `highResNow()` platform precision        | Sub-millisecond precision confirmed on the specific deployment platform (≥90% non-zero deltas over 10,000 calls measured at start, middle, and end of the PQ window)    | Automated test: repeat OQ-4 precision check at intervals during the sustained run                                             |
| PQ-3    | Sequence uniqueness over extended period | All sequence numbers unique over the full PQ duration (default: 1 hour)                                                                                                 | Automated test: continuously call `next()` for the configured duration and verify no duplicates in the collected set          |
| PQ-4    | Memory stability                         | Heap growth does not exceed the configured threshold (default: 10%) over the PQ duration under sustained clock and sequence operations                                  | Automated test: sample `process.memoryUsage().heapUsed` at intervals defined by `PQ_SAMPLE_INTERVAL_MS` (default: 10000ms) and assert growth remains below threshold |
| PQ-5    | Disaster recovery — adapter state        | After simulated process crash and restart, `createSystemClock()` returns `ok()` and produces valid, monotonically increasing timestamps without state carryover from the previous process | Automated test: record last `monotonicNow()` and `next()` values, simulate process restart by constructing a new `SystemClockAdapter` and `SystemSequenceGenerator`, verify new adapter passes startup self-test and produces valid timestamps; verify new sequence generator starts from 1 (no state carryover) |

REQUIREMENT (CLK-QUA-006): GxP organizations MUST execute the PQ protocol (PQ-1 through PQ-5) on each deployment target. The PQ protocol MUST be re-executed after `@hex-di/clock` version upgrades, platform upgrades (OS, Node.js runtime), or hardware changes.

REQUIREMENT (CLK-QUA-007): PQ tests are long-running and MUST be excluded from CI/CD pipelines. They are executed as part of deployment qualification only.

REQUIREMENT (CLK-QUA-008): PQ thresholds MUST be configurable via environment variables to accommodate different deployment targets:

- `PQ_DURATION_MS` — Duration of the PQ run in milliseconds (default: `3600000`, i.e., 1 hour).
- `PQ_THROUGHPUT_REQUIREMENT` — Minimum operations per second required for each function (default: `100000`).
- `PQ_MEMORY_GROWTH_THRESHOLD` — Maximum allowed heap growth as a decimal fraction (default: `0.10`, i.e., 10%). **Recommended range:** 0.05–0.20 (5%–20%). Values exceeding 0.50 (50%) SHOULD require documented justification in the PQ parameter record explaining why the deployment's memory growth characteristics warrant a relaxed threshold (e.g., known GC behavior on the specific runtime, large initial heap allocation). Values below 0.05 may cause false failures due to normal GC variance on some platforms.
- `PQ_SAMPLE_INTERVAL_MS` — Interval between memory usage samples in PQ-4, in milliseconds (default: `10000`, i.e., 10 seconds). Shorter intervals produce more data points but add measurement overhead.

REQUIREMENT (CLK-QUA-017): PQ environment variables MUST be validated at PQ test suite startup. Each environment variable MUST be parsed as follows: (a) `PQ_DURATION_MS` MUST be a positive integer greater than 0; non-numeric, negative, zero, NaN, and Infinity values MUST cause the PQ suite to abort with a descriptive error message; (b) `PQ_THROUGHPUT_REQUIREMENT` MUST be a positive integer greater than 0; (c) `PQ_MEMORY_GROWTH_THRESHOLD` MUST be a positive number in the range (0, 1]; values outside this range MUST cause the PQ suite to abort; (d) `PQ_SAMPLE_INTERVAL_MS` MUST be a positive integer greater than 0 and less than or equal to `PQ_DURATION_MS`. When any PQ environment variable is set but fails validation, the PQ suite MUST NOT fall back to the default value — it MUST abort with a clear error identifying the invalid variable, the provided value, and the expected format. Undefined (unset) variables MUST use the default values defined in CLK-QUA-008.

REQUIREMENT (CLK-QUA-009): PQ parameter values MUST be documented with a written justification demonstrating they represent or exceed the expected production workload profile for the specific deployment target. The justification MUST include: (a) the observed or projected production call rate for each clock function, (b) the expected sustained duration of peak load periods, and (c) the rationale for the chosen memory growth threshold relative to the deployment's heap allocation. PQ results obtained with parameters that do not represent production conditions are not valid for GxP deployment approval.

#### PQ Parameter Guidance for Non-Production Environments

The 1-hour default PQ duration and associated thresholds are calibrated for production deployment qualification. Non-production environments (staging, QA, development) may use reduced PQ parameters when the purpose is to verify PQ test infrastructure readiness rather than to qualify a production deployment.

| Environment | Recommended `PQ_DURATION_MS` | Recommended `PQ_THROUGHPUT_REQUIREMENT` | Purpose |
| --- | --- | --- | --- |
| **Production** | `3600000` (1 hour) or higher | Based on observed production workload | GxP deployment approval |
| **Staging** | `3600000` (1 hour) | Same as production | Pre-production validation (results count toward deployment qualification if hardware matches production) |
| **QA / Pre-qualification** | `300000` (5 minutes) | Same as production | Verify PQ test infrastructure and detect gross failures before committing to full production PQ run |
| **Development** | `60000` (1 minute) | `10000` (reduced) | Developer feedback loop; results are NOT valid for any qualification purpose |

REQUIREMENT (CLK-QUA-010): Only PQ results obtained on the actual deployment target hardware with production-representative parameters are valid for GxP deployment approval. PQ results from non-production environments with reduced parameters MUST NOT be submitted as qualification evidence, except for staging environments that use identical hardware and identical PQ parameters as production.

REQUIREMENT (CLK-QUA-011): When staging PQ results are used as qualification evidence for production, the organization MUST document that the staging hardware configuration (CPU model, memory, OS version, Node.js version) is identical to the production target. Any hardware or runtime difference between staging and production invalidates the staging PQ results for production qualification purposes.

REQUIREMENT (CLK-QUA-012): The PQ automated tests SHOULD be implemented as a dedicated test suite (`gxp-pq-clock.test.ts`) that can be run independently during deployment qualification.

#### PQ Acceptance Criteria

The PQ protocol is considered **passed** when ALL of the following criteria are met:

1. All 5 PQ steps (PQ-1 through PQ-5) pass with no failures.
2. All PQ parameters used are production-representative (per CLK-QUA-009) and documented.
3. No deviations from the expected results occurred during the PQ run.

A **PQ deviation** is any unexpected behavior observed during the PQ run that does not constitute a step failure. The following quantitative thresholds distinguish deviations from failures:

| PQ Step | Deviation (does not block approval) | Failure (blocks approval) |
| --- | --- | --- |
| PQ-1 (Throughput) | Transient throughput dip lasting ≤ 5 seconds and remaining ≥ 80% of `PQ_THROUGHPUT_REQUIREMENT` | Throughput drops below 80% of `PQ_THROUGHPUT_REQUIREMENT` for > 5 consecutive seconds, OR sustained average over any 60-second window falls below `PQ_THROUGHPUT_REQUIREMENT` |
| PQ-2 (Precision) | Single measurement interval where non-zero delta percentage drops to 85–89% (below the 90% threshold) but recovers in the next interval | Non-zero delta percentage < 90% at any measurement point (start, middle, or end of PQ window) after recovery opportunity |
| PQ-3 (Sequence uniqueness) | N/A — any duplicate is a failure | One or more duplicate sequence numbers detected |
| PQ-4 (Memory stability) | Heap growth spike exceeding `PQ_MEMORY_GROWTH_THRESHOLD` that settles back below the threshold within 60 seconds | Heap growth exceeds `PQ_MEMORY_GROWTH_THRESHOLD` and does not settle below the threshold within 60 seconds, OR exceeds 2× `PQ_MEMORY_GROWTH_THRESHOLD` at any sample point |
| PQ-5 (Disaster recovery) | N/A — any self-test failure or state carryover is a failure | `createSystemClock()` returns `err()` after restart, OR monotonicity violation detected, OR sequence number state carried over from previous process |

PQ deviations MUST be documented in the PQ evidence package with: the affected PQ step, the observed values, the threshold comparison, root cause analysis, and risk assessment. Deviations do not block PQ approval unless the QA Reviewer determines they indicate a systemic issue.

A **PQ failure** is any PQ step that does not meet its expected result per the thresholds above. A single PQ step failure MUST block PQ approval. The failure MUST be investigated, the root cause corrected, and the full PQ protocol re-executed from PQ-1 (partial PQ re-execution is NOT acceptable for GxP qualification).

### Deployment Qualification Checklist

In addition to the automated IQ/OQ/PQ protocols above, GxP deployments MUST complete the following one-time infrastructure verifications on each deployment target. These are deployment-environment checks, not automated library tests — they verify that the infrastructure surrounding `@hex-di/clock` meets GxP requirements.

| DQ Step | Verification                                 | Expected Result                                                                                                                                                                             | Method                                                                                                                                            |
| ------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| DQ-1    | NTP leap smear configuration                 | The deployment platform uses leap smearing (not leap insertion) for leap second handling, preventing 1-second wall-clock jumps                                                              | Verify NTP daemon configuration (e.g., `chrony` `leapsecmode=slew`, `ntpd` `leapsmearinterval`)                                                   |
| DQ-2    | NTP synchronization before application start | NTP synchronization completes before `@hex-di/clock` adapter construction                                                                                                                   | Verify system startup sequence: NTP daemon starts and achieves initial sync before application process launch (e.g., systemd dependency ordering) |
| DQ-3    | Platform API freeze at entry point           | `Date` and `performance` objects are frozen at application entry point before any `@hex-di/clock` import                                                                                    | Code review of application entry point; verified by IQ-13 automated test                                                                          |
| DQ-4    | Module export freeze at entry point          | `@hex-di/clock` module exports are frozen after initial import                                                                                                                              | Code review of application entry point (see section 4.1, "Platform API Capture")                                                                  |
| DQ-5    | Specification approval record complete       | `APPROVAL_RECORD.json` exists, `approvalComplete` is `true`, `specRevision` matches current spec revision, all 4 signatory roles have non-empty approval fields, no future-dated signatures | Automated validation script or manual review of `APPROVAL_RECORD.json` against README.md revision                                                 |

#### DQ Step-by-Step Execution Procedures

Each DQ step above requires reproducible execution with explicit pass/fail criteria and evidence artifacts. The following procedures expand the DQ checklist into auditable verification steps.

**DQ-1: NTP Leap Smear Configuration**

1. Log into the deployment target as the Infrastructure Operator.
2. Identify the NTP daemon in use: `systemctl list-units | grep -E 'chrony|ntpd|systemd-timesyncd'`.
3. Verify leap smear configuration:
   - **chrony:** Run `grep -i leapsecmode /etc/chrony.conf`. Expected: `leapsecmode slew`. If `leapsecmode` is absent or set to `step`, the check **fails**.
   - **ntpd:** Run `grep -i leapsmearinterval /etc/ntp.conf`. Expected: `leapsmearinterval` is present with a positive integer value. If absent, the check **fails**.
   - **systemd-timesyncd:** Run `timedatectl show-timesync`. Verify `LeapSmearing=yes`. If `no`, the check **fails**.
4. Verify NTP source quality:
   - **chrony:** Run `chronyc sources`. Expected: at least one source with `*` (selected), stratum ≤ 3, polling interval ≤ 64 seconds.
   - **ntpd:** Run `ntpq -p`. Expected: at least one peer with `*` (selected), stratum ≤ 3.
5. Record the NTP daemon name, version (`chronyd --version` or `ntpd --version`), the leap smear configuration line, and the NTP source stratum and polling interval.
6. **Pass criteria:** (a) Leap smear is explicitly configured and enabled, AND (b) NTP source stratum is ≤ 3 and polling interval is ≤ 64 seconds. **Fail criteria:** Leap smear is absent/disabled/step mode, OR NTP source stratum > 3, OR polling interval > 64 seconds. Organizations MAY define stricter thresholds and MUST document their stratum and polling interval acceptance criteria in their validation plan.
7. **Evidence artifacts:** Screenshot or text capture of the configuration file line, daemon version, and `chronyc sources` (or `ntpq -p`) output showing stratum and polling interval.

**DQ-2: NTP Synchronization Before Application Start**

1. Verify the NTP daemon starts before the application process in the system startup sequence:
   - **systemd:** Run `systemctl show <app-service> --property=After`. Expected: output includes `chronyd.service` (or `ntpd.service` or `systemd-timesyncd.service`). If not present, the check **fails**.
   - **Container (Docker/Kubernetes):** Verify the entrypoint script includes an NTP sync check before application launch (e.g., `chronyc waitsync 30 0.1`).
2. Verify current NTP synchronization status:
   - **chrony:** Run `chronyc tracking`. Expected: `Leap status: Normal`, `System time` offset < 100ms. If offset ≥ 100ms or leap status is not `Normal`, the check **fails**.
   - **ntpd:** Run `ntpq -p`. Expected: at least one peer with `*` (selected), offset < 100ms.
3. **Pass criteria:** (a) Application startup dependency on NTP daemon is configured, AND (b) current NTP offset is < 100ms. **Fail criteria:** Either condition is not met.
4. **Evidence artifacts:** Output of `chronyc tracking` (or `ntpq -p`), startup dependency configuration, and timestamp of verification.

**NTP synchronization timeout guidance:** Organizations SHOULD define a maximum NTP synchronization wait time (recommended: 30–60 seconds) in their deployment SOP. The wait time MUST be documented in the computerized system validation plan with justification for the chosen value. If NTP synchronization cannot be achieved within the configured timeout, the organization's SOP MUST define a documented fallback procedure, which SHOULD include one of: (a) blocking application startup until NTP synchronizes (recommended for GxP-critical systems), (b) starting in degraded mode with enhanced monitoring and flagged audit records, or (c) failing the deployment with an alert to the Infrastructure Operator. Option (b) requires documented risk acceptance by the QA Reviewer, as audit records produced before NTP synchronization may violate the ALCOA+ Contemporaneous principle. Container environments SHOULD use explicit synchronization wait commands (e.g., `chronyc waitsync <timeout_seconds> <max_offset>`) in their entrypoint scripts.

**DQ-3: Platform API Freeze at Entry Point**

1. Identify the application entry point file (e.g., `src/main.ts`, `src/index.ts`).
2. Verify that `Object.freeze(Date)` and `Object.freeze(performance)` are called before any `@hex-di/clock` import.
3. Record the file path, line numbers of freeze calls, and the first `@hex-di/clock` import line number.
4. **Pass criteria:** Both freeze calls appear before any `@hex-di/clock` import in the module evaluation order. **Fail criteria:** Either freeze call is missing, or an `@hex-di/clock` import appears before the freeze calls.
5. **Evidence artifacts:** Code review attestation with file path, line numbers, commit hash, and reviewer signature. See IQ-13 execution context for automated verification options.

**DQ-4: Module Export Freeze at Entry Point**

1. In the same entry point file identified in DQ-3, verify that `@hex-di/clock` module exports are frozen after initial import (e.g., `Object.freeze(await import('@hex-di/clock'))` or equivalent).
2. Record the file path and line number of the export freeze call.
3. **Pass criteria:** Module exports are frozen after import and before any consumer code accesses them. **Fail criteria:** Export freeze call is missing or occurs after consumer code has already imported the module.
4. **Evidence artifacts:** Code review attestation with file path, line number, commit hash, and reviewer signature.

REQUIREMENT (CLK-QUA-015): Each DQ step execution MUST produce the evidence artifacts listed above. Evidence MUST be retained as part of the deployment qualification record in the computerized system validation plan.

REQUIREMENT (CLK-QUA-013): GxP organizations MUST document completion of the deployment qualification checklist in their computerized system validation plan. Each DQ step MUST be signed off by a qualified reviewer. The checklist MUST be re-executed after infrastructure changes (NTP configuration, OS upgrade, container orchestration changes).

### CI/CD Pipeline Integration Guidance

IQ and OQ tests are automated and SHOULD be integrated into the CI/CD pipeline. PQ tests are long-running and MUST be excluded from CI/CD. The following guidance clarifies how each qualification level interacts with automated deployment pipelines.

**IQ in CI/CD:**

- IQ tests (`gxp-iq-clock.test.ts`) MUST run on every CI build that modifies `packages/clock/` source files.
- IQ failure MUST block the build and prevent merge.

**OQ in CI/CD:**

- OQ tests (`gxp-oq-clock.test.ts`) MUST run on every CI build that modifies `packages/clock/` source files.
- OQ failure MUST block the build and prevent merge.
- OQ tests MAY be excluded from "quick check" CI runs (e.g., draft PRs) but MUST run on final merge validation.

**PQ in CI/CD:**

- PQ tests (`gxp-pq-clock.test.ts`) MUST NOT run as part of the standard CI/CD pipeline.
- PQ MUST be re-executed on the deployment target (not in CI) when any of the following re-execution triggers occur:

| Trigger | Rationale | Re-execution Scope |
| --- | --- | --- |
| `@hex-di/clock` version upgrade (including patch) | Any code change may affect sustained performance | Full PQ (PQ-1 through PQ-4) |
| Node.js runtime version change | V8 engine changes affect timer precision and throughput | Full PQ |
| OS kernel or distribution upgrade | Kernel timer subsystem changes affect `performance.now()` precision | Full PQ |
| Hardware change (CPU, memory) | Different hardware has different timing characteristics | Full PQ |
| Container orchestration change (Docker, Kubernetes) | Container runtime overhead affects timing precision | PQ-1 (throughput) and PQ-2 (precision) |
| NTP configuration change | NTP affects wall-clock accuracy tested by OQ, not PQ — but re-execute PQ-4 (memory) as a regression check | PQ-4 only |

REQUIREMENT (CLK-QUA-014): GxP organizations MUST integrate IQ and OQ test suites into their CI/CD pipeline for `@hex-di/clock`. PQ re-execution triggers MUST be documented in the organization's change control SOP and the computerized system validation plan.

### Validation Plan Guidance for Consuming Organizations

EU GMP Annex 11, Section 4 requires that computerized systems are validated in accordance with a validation plan. This section provides guidance on the minimum content a consuming organization's validation plan should address when deploying `@hex-di/clock` as part of a GxP computerized system.

REQUIREMENT (CLK-QUA-016): GxP organizations deploying `@hex-di/clock` MUST create and maintain a Computerized System Validation Plan (CSVP) that addresses, at a minimum, the following content areas:

| # | Content Area | Minimum Content | Spec Reference |
|---|---|---|---|
| 1 | **System description** | Identify `@hex-di/clock` by package name, validated version (exact pin), and specification revision. Describe the system context in which the clock library operates (application name, deployment topology, consumer packages). | README.md (Version Relationship Policy) |
| 2 | **GAMP 5 risk classification** | Include or reference the GAMP 5 risk classification table from § 6.1. Document any organization-specific risk assessment adjustments with rationale. | § 6.1 (clock-source-requirements.md) |
| 3 | **Supplier assessment** | Reference the executed Supplier Quality Agreement (SQA) and the supplier assessment review. Document the assessment date, assessor identity, and outcome. | § 6.9 (supplier-assessment.md) |
| 4 | **Qualification scope and strategy** | Define which IQ/OQ/PQ/DQ steps will be executed, on which deployment targets, and by which personnel. Document any deviations from the standard protocol with risk-based justification. | § 6.2 (this document) |
| 5 | **PQ acceptance criteria** | Define the PQ threshold parameters (`PQ_THROUGHPUT_REQUIREMENT`, `PQ_DURATION_MS`, `PQ_MEMORY_GROWTH_THRESHOLD`, `PQ_SAMPLE_INTERVAL_MS`) for each deployment target with documented rationale for the chosen values. | § 6.2 (PQ protocol section) |
| 6 | **Personnel qualification** | Identify the personnel assigned to each role (Clock Library Developer, GxP Validation Engineer, Infrastructure Operator, QA Reviewer, Application Developer). Document their training records and competency assessment results. | § 6.10 (personnel-and-access-control.md) |
| 7 | **NTP configuration** | Document the NTP server addresses, sync interval, drift thresholds, leap smear configuration, and startup synchronization verification for each deployment target. | § 6.1 (CLK-GXP-005) |
| 8 | **Periodic evaluation mechanism** | Identify the periodic clock evaluation mechanism (ecosystem monitoring adapter or consumer-implemented fallback). Document the evaluation interval, drift threshold, and alerting configuration. | § 6.1 (CLK-GXP-006, CLK-GXP-007) |
| 9 | **Change control procedures** | Reference the organization's change control SOP. Map the `@hex-di/clock` re-qualification triggers (§ 6.3) to the organization's change control workflow. | § 6.3 (verification-and-change-control.md) |
| 10 | **Data retention policy** | Define the retention period for clock-derived audit records, TemporalContext archives, and qualification evidence by record type. Reference the applicable retention regulation (21 CFR 211.180, 21 CFR 820.180, ICH E6(R2)). | § 6.5 (alcoa-mapping.md, Data Retention) |
| 11 | **Incident management** | Customize the incident escalation path (§ 6.12 Quick Reference Card) with specific contact information and integrate it into the organization's incident management SOP. | § 6.12 (quick-reference.md) |
| 12 | **Approval record** | Complete the APPROVAL_RECORD.json with all four signatory roles. Establish the signed Git tag verification procedure and retain the Review Comment Log (RCL). | README.md (Approval Enforcement Mechanism) |

This guidance is advisory (RECOMMENDED content areas), except for the overall REQUIREMENT (CLK-QUA-016) that a CSVP addressing these areas MUST exist. Organizations MAY organize the content differently (e.g., as sections within a broader system validation plan) provided all content areas are addressed and traceable.

#### CSVP Content Checklist Template

The following checklist MAY be used by organizations to track CSVP completeness. Copy this table into your CSVP and complete each row:

| # | Content Area | Document Reference / Location | Completed By | Date | Status |
|---|---|---|---|---|---|
| 1 | System description (package name, version pin, spec revision, deployment topology) | | | | ☐ |
| 2 | GAMP 5 risk classification (reference or adaptation of §6.1 table) | | | | ☐ |
| 3 | Supplier assessment (executed SQA reference, assessment date, assessor, outcome) | | | | ☐ |
| 4 | Qualification scope and strategy (IQ/OQ/PQ/DQ steps, targets, personnel, deviations) | | | | ☐ |
| 5 | PQ acceptance criteria (throughput, duration, memory growth, sample interval per target) | | | | ☐ |
| 6 | Personnel qualification (role assignments, training records, competency evidence) | | | | ☐ |
| 7 | NTP configuration (servers, sync interval, drift thresholds, leap smear, startup sync) | | | | ☐ |
| 8 | Periodic evaluation mechanism (ecosystem adapter or CLK-GXP-008 fallback, interval, threshold) | | | | ☐ |
| 9 | Change control procedures (SOP reference, re-qualification trigger mapping) | | | | ☐ |
| 10 | Data retention policy (retention periods by record type, regulatory reference) | | | | ☐ |
| 11 | Incident management (escalation path with contacts, SOP integration) | | | | ☐ |
| 12 | Approval record (APPROVAL_RECORD.json, signed Git tag, RCL retention) | | | | ☐ |

### Procedural Test Execution Tracking

The RTM identifies 11 [OPERATIONAL] requirements verified through procedural (manual) means rather than automated tests. Unlike automated tests, which self-document their execution via CI/CD logs, procedural verifications require explicit execution tracking to ensure they are not inadvertently skipped during qualification.

REQUIREMENT (CLK-QUA-019): GxP organizations MUST maintain a procedural test execution log that records, for each [OPERATIONAL] requirement verification: (a) the requirement ID, (b) the tester's printed name and organizational title, (c) the execution date, (d) the pass/fail result, (e) the evidence collected (e.g., screenshot, command output, document reference), and (f) any deviations observed. The procedural test execution log MUST be signed by the tester and reviewed by the QA Reviewer before the qualification report is finalized.

REQUIREMENT: The PQ report MUST include a summary section confirming that all procedural verification steps have been executed and passed, with a cross-reference to the procedural test execution log. Qualification reports that omit procedural test evidence MUST NOT be accepted by the QA Reviewer.

### GxP Deployment Approval Prerequisite

GxP organizations MUST NOT approve `@hex-di/clock` for production deployment until one of the following conditions is satisfied for failure modes FM-3 (NTP Desynchronization), FM-4 (Platform API Tampering), FM-5 (Adapter Integrity Violation), and FM-6 (Process Crash/Restart):

REQUIREMENT (CLK-QUA-018): GxP deployment approval MUST require documented evidence that FM-3, FM-4, FM-5, and FM-6 detection and recovery are addressed by one of the following mechanisms:

1. **Validated ecosystem monitoring adapter:** A GxP-validated ecosystem monitoring adapter is co-deployed and has passed its own IQ/OQ/PQ protocols. The monitoring adapter specification version MUST be documented in the CSVP. This is the preferred approach as it provides automated detection with the Detection scores documented in the FMEA (§ 6.11).

2. **Validated CLK-GXP-008 compensating controls:** The consuming application has implemented and validated compensating controls per CLK-GXP-008. The compensating controls MUST be documented in the CSVP with: (a) the specific implementation approach per failure mode, (b) the detection interval and threshold configuration, (c) the QA risk acceptance record acknowledging the degraded Detection scores (see FMEA § 6.11, Detection Degradation table), and (d) OQ/PQ test evidence demonstrating the compensating controls detect each failure mode within the documented detection interval.

REQUIREMENT: The deployment approval record MUST explicitly identify which mechanism (option 1 or option 2) is used and reference the corresponding validation evidence. The QA Reviewer MUST verify the evidence before granting deployment approval.

REQUIREMENT: If neither mechanism is validated at deployment time, the deployment MUST NOT proceed for GxP use. Non-GxP deployments (where `gxp: false` or the `gxp` option is omitted) are not subject to this prerequisite.

---


