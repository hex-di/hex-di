# 09 - Definition of Done

## 9.1 Test Organization

| Test Category          | File Pattern                                             | Location                |
| ---------------------- | -------------------------------------------------------- | ----------------------- |
| Unit tests             | `*.test.ts`                                              | `libs/clock/core/tests/` |
| Type-level tests       | `*.test-d.ts`                                            | `libs/clock/core/tests/` |
| GxP-specific tests     | `gxp-*.test.ts`                                          | `libs/clock/core/tests/` |
| Temporal context tests | `temporal-context.test.ts`, `temporal-context.test-d.ts` | `libs/clock/core/tests/` |

### Test Runner

All tests use Vitest. Run with:

```bash
pnpm --filter @hex-di/clock test
pnpm --filter @hex-di/clock test:types
```

### IQ/OQ/PQ Qualification Cross-Reference

The DoD unit and integration tests below serve as the test evidence base for the IQ/OQ/PQ qualification protocols defined in `06-gxp-compliance/02-qualification-protocols.md`. For the complete mapping of which DoD tests correspond to which IQ/OQ/PQ steps and regulatory clauses, see the **Requirements Traceability Matrix** (`06-gxp-compliance/08-requirements-traceability-matrix.md`), specifically the "Test Automation Coverage Summary" section.

## 9.2 DoD Items

### DoD 1: Clock Port (Spec Sections 2.1–2.4)

**File:** `clock-port.test.ts`

| #   | Test Description                                                              | Type |
| --- | ----------------------------------------------------------------------------- | ---- |
| 1   | ClockPort interface has monotonicNow, wallClockNow, and highResNow properties | type |
| 2   | ClockPort properties are readonly function types returning number             | type |
| 3   | ClockPort is defined as a directed port via createPort                        | unit |
| 4   | ClockPort port has name 'ClockPort'                                           | unit |

**File:** `clock-port.test-d.ts`

| #   | Test Description                                            | Type |
| --- | ----------------------------------------------------------- | ---- |
| 5   | ClockPort is assignable from object with correct shape      | type |
| 6   | ClockPort rejects object missing any of the three functions | type |
| 7   | ClockPort rejects object with wrong return types            | type |

**Target: >95% mutation score.**

---

### DoD 2: Sequence Generator Port (Spec Sections 3.1–3.3)

**File:** `sequence-generator.test.ts`

| #   | Test Description                                                          | Type |
| --- | ------------------------------------------------------------------------- | ---- |
| 1   | next() returns 1 on first call                                            | unit |
| 2   | next() returns strictly increasing values                                 | unit |
| 3   | next() returns consecutive integers                                       | unit |
| 4   | current() returns 0 before any next() call                                | unit |
| 5   | current() returns last value from next()                                  | unit |
| 6   | current() does not advance the counter                                    | unit |
| 7   | next() returns err(SequenceOverflowError) at MAX_SAFE_INTEGER             | unit |
| 8   | SequenceOverflowError has correct \_tag                                   | unit |
| 9   | SequenceOverflowError has correct lastValue                               | unit |
| 10  | SequenceOverflowError is frozen                                           | unit |
| 11  | SystemSequenceGenerator has no reset property (structurally irresettable) | unit |

**File:** `sequence-generator.test-d.ts`

| #   | Test Description                                                       | Type |
| --- | ---------------------------------------------------------------------- | ---- |
| 12  | SequenceGeneratorPort has next and current properties (no reset)       | type |
| 13  | SequenceGeneratorPort is defined as a directed port                    | type |
| 14  | SequenceOverflowError has readonly \_tag, lastValue, message           | type |
| 15  | SequenceGeneratorPort does NOT have a reset property at the type level | type |

**Target: >95% mutation score.** Critical paths: overflow detection, monotonic guarantee, structural irresettability.

---

### DoD 3: System Clock Adapter (Spec Sections 4.1–4.5)

**File:** `system-clock.test.ts`

| #   | Test Description                                                          | Type |
| --- | ------------------------------------------------------------------------- | ---- |
| 1   | createSystemClock() returns a frozen object                               | unit |
| 2   | monotonicNow() returns a number                                           | unit |
| 3   | monotonicNow() returns non-decreasing values across 100 calls             | unit |
| 4   | wallClockNow() returns a number                                           | unit |
| 5   | wallClockNow() returns a value close to Date.now() (within 10ms)          | unit |
| 6   | highResNow() returns a number                                             | unit |
| 7   | highResNow() returns a value close to Date.now() (within 10ms)            | unit |
| 8   | highResNow() has sub-millisecond precision when performance API available | unit |
| 9   | createSystemSequenceGenerator() returns a frozen object                   | unit |
| 10  | createSystemSequenceGenerator() result has no reset property              | unit |

**File:** `system-clock-startup.test.ts`

| #   | Test Description                                                                                                                      | Type |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 11  | createSystemClock() succeeds when platform APIs return plausible values                                                               | unit |
| 12  | createSystemClock() returns err(ClockStartupError) with check 'ST-1' when monotonicNow() returns negative                             | unit |
| 13  | createSystemClock() returns err(ClockStartupError) with check 'ST-2' when wallClockNow() returns epoch before 2020                    | unit |
| 14  | createSystemClock() returns err(ClockStartupError) with check 'ST-3' when consecutive monotonicNow() regresses                        | unit |
| 15  | createSystemClock({ gxp: true }) returns err(ClockStartupError) with check 'ST-4' when Date is not frozen                             | unit |
| 16  | createSystemClock({ gxp: true }) returns err(ClockStartupError) with check 'ST-4' when performance is not frozen                      | unit |
| 17  | createSystemClock({ gxp: false }) does NOT check platform API freeze (ST-4 skipped)                                                   | unit |
| 18  | createSystemClock() without options does NOT check platform API freeze (ST-4 skipped)                                                 | unit |
| 19  | ClockStartupError has correct \_tag 'ClockStartupError'                                                                               | unit |
| 20  | ClockStartupError is frozen at construction                                                                                           | unit |
| 21  | ClockStartupError includes observedValue field                                                                                        | unit |
| 22  | createSystemClock() returns err(ClockStartupError) with check 'ST-5' when highResNow() and wallClockNow() diverge by more than 1000ms | unit |
| 23  | createSystemClock() succeeds when highResNow() and wallClockNow() agree within 1000ms                                                 | unit |

**File:** `system-clock-fallback.test.ts`

| #   | Test Description                                                                   | Type |
| --- | ---------------------------------------------------------------------------------- | ---- |
| 24  | monotonicNow() uses clamped fallback when performance unavailable                  | unit |
| 25  | clamped fallback returns last value when Date.now() goes backward                  | unit |
| 26  | clamped fallback advances when Date.now() advances                                 | unit |
| 27  | highResNow() falls back to Date.now() when timeOrigin unavailable                  | unit |
| 28  | highResNow() fallback uses captured Date.now, not global Date.now (anti-tampering) | unit |

**File:** `system-clock.test-d.ts`

| #   | Test Description                                                                                                           | Type |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ---- |
| 29  | createSystemClock return type is Result<ClockPort & ClockDiagnosticsPort, ClockStartupError>                               | type |
| 30  | createSystemSequenceGenerator return type is SequenceGeneratorPort                                                         | type |
| 31  | ClockStartupError has readonly \_tag, check (union 'ST-1' \| 'ST-2' \| 'ST-3' \| 'ST-4' \| 'ST-5'), message, observedValue | type |
| 32  | SystemClockOptions has readonly gxp?: boolean                                                                              | type |

**Target: >95% mutation score.** Critical paths: fallback detection, clamping logic.

---

### DoD 4: Virtual Clock Adapter (Spec Section 5.1)

**File:** `virtual-clock.test.ts`

| #   | Test Description                                                                                                                                                                   | Type |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | createVirtualClock() with defaults: monotonicNow returns 0                                                                                                                         | unit |
| 2   | createVirtualClock() with defaults: wallClockNow returns default epoch                                                                                                             | unit |
| 3   | createVirtualClock() with custom options uses provided values                                                                                                                      | unit |
| 4   | advance() moves all three time functions forward                                                                                                                                   | unit |
| 5   | advance() with 0 is a no-op                                                                                                                                                        | unit |
| 6   | advance() with negative value returns err(ClockRangeError)                                                                                                                         | unit |
| 7   | set() updates only specified time functions                                                                                                                                        | unit |
| 8   | set() with empty object is a no-op                                                                                                                                                 | unit |
| 9   | jumpWallClock() moves wallClock and highRes but not monotonic                                                                                                                      | unit |
| 10  | jumpWallClock() with negative value moves time backward                                                                                                                            | unit |
| 11  | determinism: two instances with same operations produce same results                                                                                                               | unit |
| 12  | createVirtualClock() throws TypeError when initialMonotonic is NaN                                                                                                                 | unit |
| 13  | createVirtualClock() throws TypeError when initialWallClock is Infinity                                                                                                            | unit |
| 14  | createVirtualClock() accepts negative initialMonotonic without error                                                                                                               | unit |
| 15  | set() throws TypeError when any field is NaN                                                                                                                                       | unit |
| 16  | set() throws TypeError when any field is Infinity or -Infinity                                                                                                                     | unit |
| 17  | set() accepts negative values without error                                                                                                                                        | unit |
| 18  | advance() with negative: returned err contains ClockRangeError with \_tag 'ClockRangeError'                                                                                        | unit |
| 19  | advance() with negative: returned ClockRangeError is frozen                                                                                                                        | unit |
| 20  | advance() with negative: ClockRangeError includes parameter, value, and message fields                                                                                             | unit |
| 21  | VirtualClockAdapter does not access system clock (replace Date.now and performance.now after construction, verify monotonicNow/wallClockNow/highResNow return only internal state) | unit |
| 22  | VirtualClockAdapter implements ClockPort                                                                                                                                           | type |
| 23  | ClockRangeError has readonly \_tag, parameter, value, message                                                                                                                      | type |
| 24  | VirtualClockValues has readonly monotonic, wallClock, highRes                                                                                                                      | type |

**DoD 4 extension — Auto-Advance on Read (Spec Section 5.1):**

| #    | Test Description                                                                                                          | Type |
| ---- | ------------------------------------------------------------------------------------------------------------------------- | ---- |
| 25   | createVirtualClock({ autoAdvance: 10 }): first monotonicNow() returns 0, second returns 10                                | unit |
| 26   | createVirtualClock({ autoAdvance: 10 }): wallClockNow() also advances by 10 on each read                                  | unit |
| 27   | createVirtualClock({ autoAdvance: 10 }): highResNow() also advances by 10 on each read                                    | unit |
| 28   | setAutoAdvance(0) disables auto-advance (subsequent reads do not change time)                                              | unit |
| 29   | setAutoAdvance(5) overrides construction option (subsequent reads advance by 5)                                            | unit |
| 30   | getAutoAdvance() returns the current auto-advance value                                                                    | unit |
| 31   | Auto-advance returns value BEFORE advancing (read-then-advance semantics)                                                  | unit |
| 32   | Auto-advance produces same results as manual advance() (determinism)                                                       | unit |
| 33   | Auto-advance with linked VirtualTimerScheduler fires timers within advanced range                                          | unit |
| 34   | setAutoAdvance() throws TypeError for negative value                                                                       | unit |
| 35   | createVirtualClock() throws TypeError when autoAdvance is NaN                                                              | unit |

**Target: >95% mutation score.**

---

### DoD 5: Virtual Sequence Generator (Spec Section 5.2)

**File:** `virtual-sequence.test.ts`

| #   | Test Description                                                                          | Type |
| --- | ----------------------------------------------------------------------------------------- | ---- |
| 1   | createVirtualSequenceGenerator() starts at 0 by default                                   | unit |
| 2   | createVirtualSequenceGenerator() with custom startAt                                      | unit |
| 3   | setCounter() sets the internal counter                                                    | unit |
| 4   | next() after setCounter(N) returns N+1                                                    | unit |
| 5   | setCounter() to MAX_SAFE_INTEGER-1, next() returns MAX_SAFE_INTEGER                       | unit |
| 6   | setCounter() to MAX_SAFE_INTEGER, next() returns err(SequenceOverflowError)               | unit |
| 7   | reset() sets counter back to 0 (only on VirtualSequenceGenerator)                         | unit |
| 8   | next() returns 1 after reset() (only on VirtualSequenceGenerator)                         | unit |
| 9   | setCounter() throws TypeError when value is NaN                                           | unit |
| 10  | setCounter() throws TypeError when value is Infinity or -Infinity                         | unit |
| 11  | setCounter() accepts negative values without error                                        | unit |
| 12  | createVirtualSequenceGenerator() throws TypeError when startAt is NaN                     | unit |
| 13  | createVirtualSequenceGenerator() throws TypeError when startAt is non-integer (e.g., 1.5) | unit |
| 14  | createVirtualSequenceGenerator() accepts negative integer startAt without error           | unit |
| 15  | VirtualSequenceGenerator implements SequenceGeneratorPort                                 | type |
| 16  | VirtualSequenceGenerator has reset() method that SequenceGeneratorPort does not           | type |

**Target: >95% mutation score.**

---

### DoD 6: Clock Diagnostics Port (Spec Section 6.1)

**File:** `clock-diagnostics.test.ts`

| #   | Test Description                                                                    | Type |
| --- | ----------------------------------------------------------------------------------- | ---- |
| 1   | ClockDiagnosticsPort is defined as a directed port                                  | unit |
| 2   | createSystemClock() returns object implementing ClockDiagnosticsPort                | unit |
| 3   | getDiagnostics() returns a frozen object                                            | unit |
| 4   | getDiagnostics().adapterName is 'SystemClockAdapter'                                | unit |
| 5   | getDiagnostics().monotonicSource is 'performance.now' when performance available    | unit |
| 6   | getDiagnostics().monotonicSource is 'Date.now-clamped' when performance unavailable | unit |
| 7   | getDiagnostics().highResSource is 'performance.timeOrigin+now' when available       | unit |
| 8   | getDiagnostics().highResSource is 'Date.now' when timeOrigin unavailable            | unit |

**File:** `clock-diagnostics.test-d.ts`

| #   | Test Description                                                       | Type |
| --- | ---------------------------------------------------------------------- | ---- |
| 9   | ClockDiagnosticsPort has getDiagnostics and getCapabilities methods    | type |
| 10  | ClockDiagnostics has all required readonly fields                      | type |
| 11  | monotonicSource is a union type of known sources (including 'host-bridge') | type |
| 12  | highResSource is a union type of known sources (including 'host-bridge', 'host-bridge-wallclock') | type |

**Target: >95% mutation score.**

---

### DoD 7: GxP Compliance (Spec Sections 6.1–6.6)

**File:** `gxp-clock.test.ts`

| #   | Test Description                                                                                                                   | Type |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | SystemClockAdapter object is frozen (Object.isFrozen)                                                                              | unit |
| 2   | SystemSequenceGenerator object is frozen (Object.isFrozen)                                                                         | unit |
| 3   | SequenceOverflowError is frozen at construction                                                                                    | unit |
| 4   | ClockDiagnostics object is frozen                                                                                                  | unit |
| 5   | Sequence numbers are always unique (1000 rapid next() calls)                                                                       | unit |
| 6   | Sequence numbers are strictly monotonic (1000 rapid next() calls)                                                                  | unit |
| 7   | monotonicNow() is non-decreasing (1000 rapid calls)                                                                                | unit |
| 8   | Events with identical timestamps are ordered by sequence number                                                                    | unit |
| 9   | wallClockNow() returns integer (no sub-ms fabrication)                                                                             | unit |
| 10  | All next() return values are safe integers                                                                                         | unit |
| 11  | ISO 8601 conversion of wallClockNow() produces valid UTC string                                                                    | unit |
| 12  | SystemSequenceGenerator has no reset() method (structural irresettability)                                                         | unit |
| 13  | ClockDiagnosticsPort reports correct adapter name                                                                                  | unit |
| 14  | ClockDiagnosticsPort reports correct platform sources                                                                              | unit |
| 15  | SequenceOverflowError: generator remains in overflow state after first err()                                                       | unit |
| 16  | SequenceOverflowError: current() returns MAX_SAFE_INTEGER after overflow                                                           | unit |
| 17  | SequenceOverflowError: lastValue field is MAX_SAFE_INTEGER                                                                         | unit |
| 18  | SystemClockAdapter captures Date.now at construction (anti-tampering)                                                              | unit |
| 19  | Clamped fallback uses captured Date.now, not global Date.now                                                                       | unit |
| 20  | Sequence numbers remain unique across interleaved async operations (100 concurrent Promise.resolve().then(() => seq.next()) calls) | unit |
| 21  | createClockRangeError() returns a frozen object with \_tag 'ClockRangeError'                                                       | unit |

**Target: >95% mutation score.** Critical paths: immutability, monotonic guarantees, sequence uniqueness, structural irresettability, clock source attestation, overflow recovery, platform API capture.

---

### DoD 8: Temporal Context (Spec Section 6.6)

**File:** `temporal-context.test.ts`

| #   | Test Description                                                                                                                  | Type |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | createTemporalContextFactory returns a frozen object                                                                              | unit |
| 2   | create() returns ok() containing a frozen TemporalContext on success                                                              | unit |
| 3   | create() ok value includes sequenceNumber, monotonicTimestamp, wallClockTimestamp                                                 | unit |
| 4   | create() calls seq.next() to produce sequenceNumber                                                                               | unit |
| 5   | Successive create() calls produce increasing sequence numbers                                                                     | unit |
| 6   | create() captures timestamps from the injected ClockPort                                                                          | unit |
| 7   | create() calls seq.next() BEFORE clock.monotonicNow() and clock.wallClockNow() (capture ordering verification via recording mock) | unit |
| 8   | create() calls clock.monotonicNow() BEFORE clock.wallClockNow() (capture ordering verification via recording mock)                | unit |
| 9   | createTemporalContextFactory returns a factory composing ClockPort and SequenceGeneratorPort                                      | unit |
| 10  | create() returns err(SequenceOverflowError) when sequence overflows                                                               | unit |
| 11  | create() err contains SequenceOverflowError with lastValue equal to MAX_SAFE_INTEGER                                              | unit |
| 12  | create() does not call clock functions when seq.next() returns err() (verified via recording mock)                                | unit |

| 13 | createOverflowContext() returns a frozen OverflowTemporalContext | unit |
| 14 | createOverflowContext() has sequenceNumber -1 (sentinel) | unit |
| 15 | createOverflowContext() has lastValidSequenceNumber equal to seq.current() | unit |
| 16 | createOverflowContext() has \_tag 'OverflowTemporalContext' | unit |
| 17 | createOverflowContext() does NOT call seq.next() (verified via recording mock) | unit |
| 18 | createOverflowContext() captures fresh timestamps on each call | unit |
| 19 | isOverflowTemporalContext() returns true for OverflowTemporalContext | unit |
| 20 | isOverflowTemporalContext() returns false for normal TemporalContext | unit |

**File:** `temporal-context.test-d.ts`

| #   | Test Description                                                                                                            | Type |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ---- |
| 21  | TemporalContext has readonly sequenceNumber, monotonicTimestamp, wallClockTimestamp                                         | type |
| 22  | TemporalContextFactory has readonly create method returning Result<TemporalContext, SequenceOverflowError>                  | type |
| 23  | TemporalContextFactory has readonly createOverflowContext method returning OverflowTemporalContext                          | type |
| 24  | TemporalContextFactory does NOT have a tryCreate method                                                                     | type |
| 25  | OverflowTemporalContext has readonly \_tag, sequenceNumber, lastValidSequenceNumber, monotonicTimestamp, wallClockTimestamp | type |

**Target: >95% mutation score.**

---

### DoD 8a: Signature Validation (Spec Section 6.5 -- Electronic Signature Validation)

**File:** `signature-validation.test.ts`

| #   | Test Description                                                                                         | Type |
| --- | -------------------------------------------------------------------------------------------------------- | ---- |
| 1   | validateSignableTemporalContext() returns Ok for unsigned TemporalContext (signature undefined)          | unit |
| 2   | validateSignableTemporalContext() returns Ok for valid fully-populated signed context                    | unit |
| 3   | validateSignableTemporalContext() returns Err with field 'signerName' when signerName is empty string    | unit |
| 4   | validateSignableTemporalContext() returns Err with field 'signerId' when signerId is empty string        | unit |
| 5   | validateSignableTemporalContext() returns Err with field 'signedAt' when signedAt is empty string        | unit |
| 6   | validateSignableTemporalContext() returns Err with field 'signedAt' when signedAt is not valid ISO 8601  | unit |
| 7   | validateSignableTemporalContext() returns Err with field 'meaning' when meaning is empty string          | unit |
| 8   | validateSignableTemporalContext() returns Err with field 'method' when method is empty string            | unit |
| 9   | validateSignableTemporalContext() returns Err with field 'signature' when signature object is not frozen | unit |
| 10  | SignatureValidationError has correct \_tag 'SignatureValidationError'                                    | unit |
| 11  | SignatureValidationError is frozen at construction                                                       | unit |
| 12  | validateSignableTemporalContext() returns same reference on Ok (not a copy)                              | unit |
| 13  | validateSignableTemporalContext() returns Err when signedAt is more than 24 hours before wallClockTimestamp (retrospective threshold) | unit |
| 14  | validateSignableTemporalContext() returns Ok when signedAt is exactly 24 hours before wallClockTimestamp (boundary)                   | unit |
| 15  | validateSignableTemporalContext() returns Err when signedAt is more than 5 minutes after wallClockTimestamp for meaning 'execution'   | unit |
| 16  | validateSignableTemporalContext() returns Ok when signedAt is exactly 5 minutes after wallClockTimestamp for meaning 'execution'      | unit |
| 17  | validateSignableTemporalContext() returns Ok when signedAt is 30 minutes after wallClockTimestamp for meaning 'review'                | unit |
| 18  | validateSignableTemporalContext() returns Ok when signedAt is 30 minutes after wallClockTimestamp for meaning 'approval'              | unit |
| 19  | validateSignableTemporalContext() returns Err when signedAt is more than 72 hours after wallClockTimestamp for meaning 'review'       | unit |
| 20  | validateSignableTemporalContext() returns Ok when signedAt is exactly 72 hours after wallClockTimestamp for meaning 'review' (boundary) | unit |

**File:** `signature-validation.test-d.ts`

| #   | Test Description                                                                                            | Type |
| --- | ----------------------------------------------------------------------------------------------------------- | ---- |
| 21  | validateSignableTemporalContext accepts SignableTemporalContext and returns Result                          | type |
| 22  | SignatureValidationError has readonly \_tag, field, message                                                 | type |
| 23  | SignableTemporalContext extends TemporalContext (assignable from TemporalContext with signature)            | type |
| 24  | SignableTemporalContext.signature has readonly signerName, signerId, signedAt, meaning, method when present | type |

**Target: >95% mutation score.** Critical paths: temporal consistency thresholds (24h retrospective, 5min future for non-review, 72h future for review/approval), boundary conditions at exact threshold values. CLK-SIG-001 requires thresholds are non-configurable at library level — tests MUST use hardcoded expected thresholds, not configurable parameters.

---

### DoD 8b: Schema Deserialization (Spec Section 6.6 -- Schema Migration Strategy)

**File:** `deserialization.test.ts`

| #   | Test Description                                                                              | Type |
| --- | --------------------------------------------------------------------------------------------- | ---- |
| 1   | deserializeTemporalContext() returns Ok for valid v1 TemporalContext JSON                     | unit |
| 2   | deserializeTemporalContext() returns Err when schemaVersion is missing                        | unit |
| 3   | deserializeTemporalContext() returns Err when schemaVersion is unsupported (e.g., 99)         | unit |
| 4   | deserializeTemporalContext() returns Err when sequenceNumber is not an integer                | unit |
| 5   | deserializeTemporalContext() returns Err when sequenceNumber is below 1                       | unit |
| 6   | deserializeTemporalContext() returns Err when monotonicTimestamp is negative                  | unit |
| 7   | deserializeTemporalContext() returns Err when wallClockTimestamp is negative                  | unit |
| 8   | deserializeTemporalContext() returns a frozen TemporalContext on success                      | unit |
| 9   | deserializeTemporalContext() returns Err with expectedVersions listing all supported versions | unit |
| 10  | deserializeTemporalContext() returns Err when input is null/undefined/string/number           | unit |
| 11  | deserializeOverflowTemporalContext() returns Ok for valid v1 OverflowTemporalContext JSON     | unit |
| 12  | deserializeOverflowTemporalContext() returns Err when \_tag is not 'OverflowTemporalContext'  | unit |
| 13  | deserializeOverflowTemporalContext() returns Err when sequenceNumber is not -1                | unit |
| 14  | deserializeClockDiagnostics() returns Ok for valid v1 ClockDiagnostics JSON                   | unit |
| 15  | deserializeClockDiagnostics() returns Err when monotonicSource is not a known enum value      | unit |
| 16  | DeserializationError has correct \_tag 'DeserializationError'                                 | unit |
| 17  | DeserializationError is frozen at construction                                                | unit |

**File:** `deserialization.test-d.ts`

| #   | Test Description                                                                                     | Type |
| --- | ---------------------------------------------------------------------------------------------------- | ---- |
| 18  | deserializeTemporalContext accepts unknown and returns Result<TemporalContext, DeserializationError> | type |
| 19  | DeserializationError has readonly \_tag, schemaType, expectedVersions, actualVersion, field, message | type |

**Target: >95% mutation score.**

---

### DoD 8c: Record Integrity (Spec Section 6.6 -- Self-Contained Record Integrity)

**File:** `record-integrity.test.ts`

| #   | Test Description                                                                                                                                                            | Type |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | computeTemporalContextDigest() returns a frozen TemporalContextDigest                                                                                                       | unit |
| 2   | computeTemporalContextDigest() has \_tag 'TemporalContextDigest'                                                                                                            | unit |
| 3   | computeTemporalContextDigest() has algorithm 'SHA-256'                                                                                                                      | unit |
| 4   | computeTemporalContextDigest() produces hex-encoded digest string                                                                                                           | unit |
| 5   | computeTemporalContextDigest() includes canonicalInput as JSON string                                                                                                       | unit |
| 6   | computeTemporalContextDigest() produces deterministic output (same input, same digest)                                                                                      | unit |
| 7   | computeTemporalContextDigest() produces different digests for different inputs                                                                                              | unit |
| 8   | computeTemporalContextDigest() canonicalInput has fields in alphabetical order with schemaVersion                                                                           | unit |
| 9   | computeOverflowTemporalContextDigest() returns frozen digest for OverflowTemporalContext                                                                                    | unit |
| 10  | computeOverflowTemporalContextDigest() includes \_tag and lastValidSequenceNumber in canonical form                                                                         | unit |
| 11  | verifyTemporalContextDigest() returns true for matching context and digest                                                                                                  | unit |
| 12  | verifyTemporalContextDigest() returns false when sequenceNumber is modified                                                                                                 | unit |
| 13  | verifyTemporalContextDigest() returns false when monotonicTimestamp is modified                                                                                             | unit |
| 14  | verifyTemporalContextDigest() returns false when wallClockTimestamp is modified                                                                                             | unit |
| 15  | verifyTemporalContextDigest() returns false for completely fabricated digest                                                                                                | unit |
| 16  | verifyTemporalContextDigest() works for both TemporalContext and OverflowTemporalContext                                                                                    | unit |
| 17  | verifyTemporalContextDigest() uses constant-time comparison (timing: mean verification time for matching digests and non-matching digests MUST differ by no more than 20% of the larger mean, measured over 1000 iterations with the first 100 iterations discarded as warmup; if the test environment introduces excessive variance, the test SHOULD retry up to 3 times before failing) | unit |

**File:** `record-integrity.test-d.ts`

| #   | Test Description                                                                                       | Type                                                               |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ---- |
| 18  | TemporalContextDigest has readonly \_tag, algorithm, digest, canonicalInput                            | type                                                               |
| 19  | computeTemporalContextDigest accepts TemporalContext and returns TemporalContextDigest                 | type                                                               |
| 20  | verifyTemporalContextDigest accepts TemporalContext or OverflowTemporalContext and TemporalContextDigest, returns boolean | type |
| 21  | computeOverflowTemporalContextDigest accepts OverflowTemporalContext and returns TemporalContextDigest | type                                                               |

**Target: >95% mutation score.**

---

### DoD 9: GxP Installation Qualification (Spec Section 6.2 -- IQ Protocol)

**File:** `gxp-iq-clock.test.ts`

| #   | Test Description                                                                                                           | Type |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | IQ-1: Package exports all documented ports from main entry point                                                           | unit |
| 2   | IQ-2: Package exports all documented factories from main entry point                                                       | unit |
| 3   | IQ-3: Testing entry point exports VirtualClockAdapter and VirtualSequenceGenerator factories                               | unit |
| 4   | IQ-4: createSystemClock() returns a frozen object                                                                          | unit |
| 5   | IQ-5: createSystemSequenceGenerator() returns a frozen object                                                              | unit |
| 6   | IQ-6: createSystemSequenceGenerator() has no reset property                                                                | unit |
| 7   | IQ-7: getDiagnostics().monotonicSource matches expected platform value                                                     | unit |
| 8   | IQ-8: getDiagnostics().highResSource matches expected platform value                                                       | unit |
| 9   | IQ-9: getDiagnostics() returns a frozen object                                                                             | unit |
| 10  | IQ-10: createSequenceOverflowError() returns a frozen object                                                               | unit |
| 11  | IQ-11: SystemClockAdapter uses captured Date.now, not replaced global Date.now                                             | unit |
| 12  | IQ-12: createTemporalContextFactory() returns frozen factory producing frozen TemporalContext                              | unit |
| 13  | IQ-13: Object.isFrozen(Date) and Object.isFrozen(performance) return true (deployment environment verification)            | unit |
| 14  | IQ-14: createSystemClock() completes startup self-test returning ok() (not err(ClockStartupError))                         | unit |
| 15  | IQ-15: createClockStartupError() returns a frozen object                                                                   | unit |
| 16  | IQ-16: createSystemClock({ gxp: true }) returns ok() when Date and performance are frozen                                  | unit |
| 17  | IQ-17: createOverflowContext() returns a frozen OverflowTemporalContext with \_tag and sentinel sequenceNumber             | unit |
| 18  | IQ-18: isOverflowTemporalContext() correctly discriminates OverflowTemporalContext from TemporalContext                    | unit |
| 19  | IQ-19: highResNow() and wallClockNow() agree within 1000ms on deployment platform (ST-5 consistency)                       | unit |
| 20  | IQ-20: computeTemporalContextDigest() produces a valid SHA-256 digest and verifyTemporalContextDigest() confirms integrity | unit |
| 21  | IQ-21: getClockGxPMetadata() returns a frozen ClockGxPMetadata with requiredMonitoringVersion and specRevision matching current spec | unit |
| 22  | IQ-22: Per-record cryptographic integrity round-trip (compute digest, modify field, verify returns false)                       | unit |
| 23  | IQ-23: createEdgeRuntimeClock is exported from main entry point                                                                | unit |
| 24  | IQ-24: createHostBridgeClock is exported from main entry point                                                                 | unit |
| 25  | IQ-25: ClockCapabilities is exported as a type from main entry point                                                           | unit |
| 26  | IQ-26: HostClockBridge and HostBridgeClockOptions are exported from main entry point                                           | unit |
| 27  | IQ-27: EdgeRuntimeClockAdapter and createHostBridgeClockAdapter are exported from main entry point                             | unit |
| 28  | IQ-28: SystemClockAdapter.getCapabilities() returns a frozen ClockCapabilities object                                          | unit |
| 29  | IQ-29: EdgeRuntimeClockAdapter.getCapabilities().highResDegraded is true (degradation correctly reported)                      | unit |
| 30  | IQ-30: HostBridgeClockAdapter.getCapabilities().platform matches the provided options                                          | unit |
| 31  | IQ-31: delay, timeout, measure, retry are exported from main entry point                                                       | unit |
| 32  | IQ-32: RetryOptions is exported as a type from main entry point                                                                | unit |
| 33  | IQ-33: MonotonicDuration and WallClockDuration are exported as types from main entry point                                     | unit |
| 34  | IQ-34: elapsed, asMonotonicDuration, asWallClockDuration are exported from main entry point                                    | unit |
| 35  | IQ-35: durationGt, durationLt, durationBetween are exported from main entry point                                              | unit |
| 36  | IQ-36: toTemporalInstant and fromTemporalInstant are exported from main entry point                                            | unit |
| 37  | IQ-37: createClockContext and ClockContext are exported from main entry point                                                   | unit |
| 38  | IQ-38: SystemCachedClockAdapter is exported from main entry point                                                              | unit |
| 39  | IQ-39: Testing entry point exports assertMonotonic, assertTimeBetween, assertWallClockPlausible, assertSequenceOrdered         | unit |
| 40  | IQ-40: createProcessInstanceId is exported from main entry point                                                               | unit |
| 41  | IQ-41: setupPeriodicClockEvaluation and PeriodicEvaluationConfig are exported from main entry point                            | unit |
| 42  | IQ-42: validateRetentionMetadata, calculateRetentionExpiryDate, RetentionMetadata, RetentionValidationError are exported from main entry point | unit |
| 43  | IQ-43: RetentionPolicyPort is exported from main entry point                                                                   | unit |
| 44  | IQ-44: asMonotonicValidated, asWallClockValidated, asHighResValidated, BrandingValidationError, createBrandingValidationError are exported from main entry point | unit |

**Note:** IQ-13 requires the test harness to verify that `Date` and `performance` objects have been frozen at the application entry point before the test suite executes. This is a deployment environment verification, not a library unit test — it confirms that the GxP deployment followed the platform API freeze requirement from section 4.1.

**Target: 100% pass rate.** IQ tests are pass/fail acceptance tests, not mutation-tested. They MUST all pass for GxP deployment approval.

---

### DoD 10: GxP Operational Qualification (Spec Section 6.2 -- OQ Protocol)

**File:** `gxp-oq-clock.test.ts`

| #   | Test Description                                                                    | Type |
| --- | ----------------------------------------------------------------------------------- | ---- |
| 1   | OQ-1: monotonicNow() monotonicity across 1,000,000 consecutive calls                | unit |
| 2   | OQ-2: wallClockNow() accuracy within drift window under load (10,000 calls)         | unit |
| 3   | OQ-3: next() uniqueness across 10,000 concurrent microtask calls                    | unit |
| 4   | OQ-4: highResNow() sub-millisecond precision (≥90% non-zero deltas in 10,000 calls) | unit |
| 5   | OQ-5: getDiagnostics() consistency across 1,000 calls under load                    | unit |
| 6   | OQ-6: createSystemClock({ gxp: true }) returns err(ClockStartupError) with check 'ST-4' when Date and performance are not frozen | unit |
| 7   | OQ-7: TemporalContextFactory.create() propagates err(SequenceOverflowError) under 100 concurrent microtask calls when sequence generator is in overflow state | unit |
| 8   | OQ-8: createSystemClock() returns err(ClockStartupError) with check 'ST-2' when Date.now is mocked to return 0 (implausible wall-clock) | unit |

**Target: 100% pass rate.** OQ tests are pass/fail acceptance tests, not mutation-tested. They MUST all pass for GxP deployment approval.

---

### DoD 11: GxP Performance Qualification (Spec Section 6.2 -- PQ Protocol)

**File:** `gxp-pq-clock.test.ts`

| #   | Test Description                                                                         | Type |
| --- | ---------------------------------------------------------------------------------------- | ---- |
| 1   | PQ-1: Throughput meets requirements over 60-second window on target hardware             | unit |
| 2   | PQ-2: highResNow() sub-millisecond precision on specific deployment platform             | unit |
| 3   | PQ-3: Sequence uniqueness over extended period (configurable via PQ_DURATION_MS)         | unit |
| 4   | PQ-4: No memory leak (heap growth < PQ_MEMORY_GROWTH_THRESHOLD, sampled at PQ_SAMPLE_INTERVAL_MS intervals) over sustained operation | unit |
| 5   | PQ-5: Disaster recovery — after simulated process restart, new adapter passes startup self-test and produces valid timestamps without state carryover | unit |

**Target: 100% pass rate.** PQ tests are long-running pass/fail acceptance tests, excluded from CI/CD pipelines. They MUST all pass for GxP deployment approval on each target platform.

---

### DoD 12: Container Integration (Spec Section 7.1)

**File:** `graph-integration.test.ts`

| #   | Test Description                                                                                                | Type |
| --- | --------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | SystemClockAdapter provides ClockPort (graph builds and container resolves ClockPort)                           | unit |
| 2   | SystemSequenceGeneratorAdapter provides SequenceGeneratorPort                                                   | unit |
| 3   | SystemClockDiagnosticsAdapter provides ClockDiagnosticsPort (requires ClockPort)                                | unit |
| 4   | Resolving ClockPort from container with SystemClockAdapter returns a working adapter (monotonicNow returns number) | unit |
| 5   | SystemClockAdapter factory propagates ClockStartupError when createSystemClock() fails (e.g., simulated ST-1 failure) | unit |
| 6   | createSystemClockAdapter({ gxp: true }) registers adapter that warns to stderr if ClockSourceChangedSinkPort not registered | unit |
| 7   | Clock source change event is NOT emitted on initial adapter registration                                        | unit |
| 8   | createSystemClockAdapter({ gxp: true }) without sink registered logs warning to stderr                          | unit |
| 9   | SystemClockAdapter without gxp option does NOT log warning to stderr                                            | unit |

**File:** `graph-integration.test-d.ts`

| #   | Test Description                                                                                                               | Type |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ---- |
| 10  | SystemClockAdapter type is Adapter<ClockPort>                                                                                  | type |
| 11  | SystemSequenceGeneratorAdapter type is Adapter<SequenceGeneratorPort>                                                          | type |
| 12  | SystemTimerSchedulerAdapter type is Adapter<TimerSchedulerPort>                                                                | type |

**Target: >95% mutation score.**

---

### DoD 13: Clock Source Change Auditing (Spec Section 7.1)

**File:** `clock-source-change.test.ts`

| #   | Test Description                                                                                                                  | Type |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | ClockSourceChangedSinkPort is defined as a directed port via createPort                                                           | unit |
| 2   | ClockSourceChangedSinkPort has name 'ClockSourceChangedSinkPort'                                                                  | unit |
| 3   | ClockSourceChangedEvent has \_tag 'ClockSourceChanged'                                                                            | unit |
| 4   | ClockSourceChangedEvent object is frozen                                                                                          | unit |
| 5   | ClockSourceChangedEvent includes previousAdapter, newAdapter, timestamp (ISO 8601), and reason fields                             | unit |
| 6   | Override entity resolves ClockSourceChangedSinkPort and invokes onClockSourceChanged synchronously before registering new adapter | unit |
| 7   | If ClockSourceChangedSinkPort is not registered when override occurs, the event is logged to stderr as fallback                   | unit |
| 8   | If onClockSourceChanged sink throws, the error is caught internally and the adapter override proceeds without disruption          | unit |

**File:** `clock-source-change.test-d.ts`

| #   | Test Description                                                                                  | Type |
| --- | ------------------------------------------------------------------------------------------------- | ---- |
| 9   | ClockSourceChangedEvent has readonly \_tag, previousAdapter, newAdapter, timestamp, reason        | type |
| 10  | ClockSourceChangedSink has readonly onClockSourceChanged method accepting ClockSourceChangedEvent | type |

**Target: >95% mutation score.**

---

### DoD 14: Clock Source Bridge (Spec Section 7.3, 8.1)

**File:** `clock-source-bridge.test.ts`

| #   | Test Description                                                   | Type |
| --- | ------------------------------------------------------------------ | ---- |
| 1   | createClockSourceBridge() returns a frozen object                  | unit |
| 2   | Bridge output is ISO 8601 UTC string with Z suffix                 | unit |
| 3   | Bridge calls wallClockNow() on the injected ClockPort              | unit |
| 4   | Bridge output matches new Date(clock.wallClockNow()).toISOString() | unit |

**File:** `clock-source-bridge.test-d.ts`

| #   | Test Description                                                  | Type |
| --- | ----------------------------------------------------------------- | ---- |
| 5   | createClockSourceBridge accepts ClockPort and returns ClockSource | type |

**Target: >95% mutation score.**

---

### DoD 15: GxP Metadata (Spec Section 8.1)

**File:** `gxp-metadata.test.ts`

| #   | Test Description                                                             | Type |
| --- | ---------------------------------------------------------------------------- | ---- |
| 1   | getClockGxPMetadata() returns a frozen ClockGxPMetadata object               | unit |
| 2   | ClockGxPMetadata.clockVersion is a non-empty string matching package version | unit |
| 3   | ClockGxPMetadata.specRevision is a non-empty string matching the current specification revision | unit |

**File:** `gxp-metadata.test-d.ts`

| #   | Test Description                                                                   | Type |
| --- | ---------------------------------------------------------------------------------- | ---- |
| 4   | ClockGxPMetadata has readonly clockVersion property of type string                 | type |
| 5   | ClockGxPMetadata has readonly specRevision property of type string                 | type |
| 6   | getClockGxPMetadata return type is ClockGxPMetadata                                | type |

**Target: >95% mutation score.**

---

### DoD 16: HardwareClockAdapter Interface (Spec Section 4.3)

**File:** `hardware-clock.test-d.ts`

| #   | Test Description                                                                          | Type |
| --- | ----------------------------------------------------------------------------------------- | ---- |
| 1   | HardwareClockAdapter extends ClockPort                                                    | type |
| 2   | HardwareClockAdapter extends ClockDiagnosticsPort                                         | type |
| 3   | HardwareClockAdapter has readonly getHardwareStatus method returning HardwareClockStatus  | type |
| 4   | HardwareClockStatus has readonly locked, estimatedAccuracyMs, sourceType, lastSyncCheckAt | type |
| 5   | HardwareClockStatus.sourceType is 'gps' \| 'ptp' \| 'rtc' \| 'atomic' \| 'custom'         | type |
| 6   | HardwareClockAdapterOptions has readonly adapterName (string) and optional gxp (boolean)  | type |

**Note:** `HardwareClockAdapter` is an interface-only export in v0.1.0. No concrete implementation is provided — concrete adapters are consumer-developed. These type tests verify the exported interface shapes match the spec.

**Target: 100% pass rate (type-level only, no mutation testing).**

---

### DoD 17: Branded Timestamp Types (Spec Section 2.5)

**File:** `branded-timestamps.test.ts`

| #   | Test Description                                                                       | Type |
| --- | -------------------------------------------------------------------------------------- | ---- |
| 1   | asMonotonic(42) returns 42 (identity at runtime)                                       | unit |
| 2   | asWallClock(42) returns 42 (identity at runtime)                                       | unit |
| 3   | asHighRes(42) returns 42 (identity at runtime)                                         | unit |
| 4   | asMonotonic(0) returns 0 (boundary)                                                    | unit |
| 5   | asWallClock(Date.now()) returns the same value (real epoch)                             | unit |
| 6   | asHighRes(performance.now()) returns the same value (real high-res)                     | unit |
| 7   | asMonotonic(Number.MAX_SAFE_INTEGER) returns Number.MAX_SAFE_INTEGER (large values)     | unit |

**File:** `branded-timestamps.test-d.ts`

| #   | Test Description                                                                                      | Type |
| --- | ----------------------------------------------------------------------------------------------------- | ---- |
| 8   | MonotonicTimestamp is assignable to number (covariant widening)                                        | type |
| 9   | WallClockTimestamp is assignable to number (covariant widening)                                        | type |
| 10  | HighResTimestamp is assignable to number (covariant widening)                                          | type |
| 11  | MonotonicTimestamp + MonotonicTimestamp produces number (arithmetic unbranding)                        | type |
| 12  | MonotonicTimestamp - MonotonicTimestamp produces number (arithmetic unbranding)                        | type |
| 13  | WallClockTimestamp * number produces number (arithmetic unbranding)                                    | type |
| 14  | HighResTimestamp / number produces number (arithmetic unbranding)                                      | type |
| 15  | MonotonicTimestamp is NOT assignable to WallClockTimestamp (cross-domain blocked)                      | type |
| 16  | MonotonicTimestamp is NOT assignable to HighResTimestamp (cross-domain blocked)                        | type |
| 17  | WallClockTimestamp is NOT assignable to MonotonicTimestamp (cross-domain blocked)                      | type |
| 18  | WallClockTimestamp is NOT assignable to HighResTimestamp (cross-domain blocked)                        | type |
| 19  | HighResTimestamp is NOT assignable to MonotonicTimestamp (cross-domain blocked)                        | type |
| 20  | HighResTimestamp is NOT assignable to WallClockTimestamp (cross-domain blocked)                        | type |
| 21  | asMonotonic return type is MonotonicTimestamp (not number)                                             | type |
| 22  | asWallClock return type is WallClockTimestamp (not number)                                             | type |
| 23  | asHighRes return type is HighResTimestamp (not number)                                                 | type |

**Target: >95% mutation score.**

---

### DoD 18: System Timer Scheduler (Spec Section 4.6)

**File:** `system-timer.test.ts`

| #   | Test Description                                                                        | Type |
| --- | --------------------------------------------------------------------------------------- | ---- |
| 1   | createSystemTimerScheduler() returns a frozen object                                    | unit |
| 2   | setTimeout() returns a frozen TimerHandle with _tag 'TimerHandle'                       | unit |
| 3   | setTimeout() fires callback after specified delay                                       | unit |
| 4   | setTimeout() throws TypeError for negative ms                                           | unit |
| 5   | setInterval() throws TypeError for ms === 0                                             | unit |
| 6   | clearTimeout() cancels a pending timer (callback does not fire)                         | unit |
| 7   | sleep() resolves after specified delay                                                  | unit |

**File:** `system-timer.test-d.ts`

| #   | Test Description                                                                        | Type |
| --- | --------------------------------------------------------------------------------------- | ---- |
| 8   | TimerSchedulerPort has all 5 methods (setTimeout, setInterval, clearTimeout, clearInterval, sleep) | type |
| 9   | TimerHandle has readonly _tag and id                                                    | type |
| 10  | sleep return type is Promise<void>                                                      | type |
| 11  | SystemTimerSchedulerAdapter provides TimerSchedulerPort (builds and resolves)           | unit |
| 12  | SystemTimerSchedulerAdapter factory calls createSystemTimerScheduler() (singleton)      | unit |
| 13  | SystemTimerSchedulerAdapter type is Adapter<TimerSchedulerPort>                         | type |

**Target: >95% mutation score.**

---

### DoD 19: Virtual Timer Scheduler — Core (Spec Section 5.4)

**File:** `virtual-timer.test.ts` (first group)

| #   | Test Description                                                                                      | Type |
| --- | ----------------------------------------------------------------------------------------------------- | ---- |
| 1   | createVirtualTimerScheduler() returns an object implementing TimerSchedulerPort                        | unit |
| 2   | setTimeout() registers a pending timer (pendingCount increases)                                        | unit |
| 3   | setTimeout() callback fires when clock advances past scheduled time                                    | unit |
| 4   | setInterval() fires callback repeatedly at each interval within advanced range                         | unit |
| 5   | setInterval() throws TypeError for ms === 0                                                            | unit |
| 6   | clearTimeout() prevents pending timer from firing on advance                                           | unit |
| 7   | sleep() resolves when clock advances past sleep duration                                               | unit |
| 8   | sleep() uses port's own setTimeout (not platform setTimeout)                                           | unit |

**Target: >95% mutation score.**

---

### DoD 20: Virtual Timer Scheduler — Advanced (Spec Section 5.4)

**File:** `virtual-timer.test.ts` (second group)

| #   | Test Description                                                                                      | Type |
| --- | ----------------------------------------------------------------------------------------------------- | ---- |
| 1   | advanceTime(ms) fires all timers within range in chronological order                                  | unit |
| 2   | Multiple timers at same scheduled time fire in registration order (FIFO)                               | unit |
| 3   | runAll() fires all pending timers and advances clock to latest scheduled time                          | unit |
| 4   | runNext() fires only the next pending timer and advances clock to its scheduled time                   | unit |
| 5   | setInterval callback fires for each interval within advanced range (e.g., 100ms interval, 250ms advance fires at 100ms and 200ms) | unit |
| 6   | clearInterval() stops interval from firing on subsequent advances                                      | unit |
| 7   | pendingCount() returns 0 when no timers are registered                                                 | unit |
| 8   | pendingCount() decreases after timer fires                                                             | unit |
| 9   | Timer callbacks fired by advance() execute synchronously within the advance() call                     | unit |
| 10  | Nested setTimeout within a timer callback is registered correctly                                       | unit |
| 11  | advanceTime(0) fires only timers scheduled at current time                                              | unit |
| 12  | clearTimeout() is idempotent (second call does not throw)                                               | unit |
| 13  | clearInterval() is idempotent (second call does not throw)                                              | unit |
| 14  | setTimeout() with ms=0 fires at current time on next advance                                           | unit |
| 15  | Auto-advance on linked clock fires pending timers                                                       | unit |
| 16  | setTimeout() throws TypeError for NaN ms                                                                | unit |

**File:** `virtual-timer.test-d.ts`

| #   | Test Description                                                                         | Type |
| --- | ---------------------------------------------------------------------------------------- | ---- |
| 17  | VirtualTimerScheduler extends TimerSchedulerPort                                         | type |
| 18  | VirtualTimerScheduler has pendingCount, advanceTime, runAll, runNext, blockUntil methods | type |

**DoD 20 extension — blockUntil waiter synchronization:**

| #    | Test Description                                                                                   | Type |
| ---- | -------------------------------------------------------------------------------------------------- | ---- |
| 19   | blockUntil(1) resolves immediately when pendingCount >= 1                                          | unit |
| 20   | blockUntil(2) waits until second timer is registered                                               | unit |
| 21   | blockUntil(n) rejects with ClockTimeoutError when timeout expires                                  | unit |
| 22   | ClockTimeoutError has _tag 'ClockTimeoutError', expected, actual, timeoutMs, message               | unit |
| 23   | ClockTimeoutError is frozen                                                                        | unit |
| 24   | blockUntil does NOT advance virtual time                                                            | unit |
| 25   | blockUntil with custom timeoutMs respects the custom value                                          | unit |

**Target: >95% mutation score.**

---

### DoD 21: Cached Clock — Interface and Factory (Spec Section 2.7, 4.7)

**File:** `cached-clock.test.ts` (first group)

| #   | Test Description                                                                                    | Type |
| --- | --------------------------------------------------------------------------------------------------- | ---- |
| 1   | createCachedClock() returns a frozen CachedClockAdapter                                              | unit |
| 2   | recentMonotonicNow() returns a value after construction (initial read)                               | unit |
| 3   | recentWallClockNow() returns a value after construction (initial read)                               | unit |
| 4   | createCachedClock() throws TypeError when updateIntervalMs is 0                                      | unit |
| 5   | createCachedClock() throws TypeError when updateIntervalMs is negative                               | unit |

**Target: >95% mutation score.**

---

### DoD 22: Cached Clock — Lifecycle and Updates (Spec Section 4.7)

**File:** `cached-clock.test.ts` (second group)

| #   | Test Description                                                                                    | Type |
| --- | --------------------------------------------------------------------------------------------------- | ---- |
| 1   | isRunning() returns false before start()                                                             | unit |
| 2   | isRunning() returns true after start()                                                               | unit |
| 3   | isRunning() returns false after stop()                                                               | unit |
| 4   | start() when already running is a no-op (idempotent)                                                 | unit |
| 5   | stop() when already stopped is a no-op (idempotent)                                                  | unit |
| 6   | recentMonotonicNow() returns initial value before start()                                            | unit |
| 7   | After start(), recentMonotonicNow() updates periodically                                             | unit |
| 8   | createVirtualCachedClock() returns a frozen adapter                                                  | unit |
| 9   | VirtualCachedClock tracks source clock (virtual advance reflects in cached reads)                     | unit |
| 10  | VirtualCachedClock.isRunning() always returns true                                                   | unit |
| 11  | VirtualCachedClock.start()/stop() are no-ops                                                         | unit |

**Target: >95% mutation score.**

---

### DoD 23: Cached Clock — Type Safety (Spec Section 2.7)

**File:** `cached-clock.test-d.ts`

| #   | Test Description                                                                                    | Type |
| --- | --------------------------------------------------------------------------------------------------- | ---- |
| 1   | CachedClockPort is NOT assignable to ClockPort (structural incompatibility)                          | type |
| 2   | ClockPort is NOT assignable to CachedClockPort (structural incompatibility)                          | type |
| 3   | CachedClockAdapter passed to function expecting ClockPort is a compile error                         | type |
| 4   | CachedClockPort does NOT have highResNow or recentHighResNow method                                 | type |
| 5   | recentMonotonicNow return type is MonotonicTimestamp (branded)                                        | type |

**Target: 100% pass rate (type-level only).**

---

### DoD 24: Clock Capabilities (Spec Section 2.8)

**File:** `clock-capabilities.test.ts`

| #   | Test Description                                                                                                      | Type |
| --- | --------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | SystemClockAdapter.getCapabilities() returns a frozen ClockCapabilities object                                        | unit |
| 2   | getCapabilities().hasMonotonicTime is true when performance.now() is available                                        | unit |
| 3   | getCapabilities().hasMonotonicTime is false when performance.now() is unavailable (fallback)                          | unit |
| 4   | getCapabilities().hasHighResOrigin is true when performance.timeOrigin is available                                   | unit |
| 5   | getCapabilities().hasHighResOrigin is false when performance.timeOrigin is unavailable                                | unit |
| 6   | getCapabilities().crossOriginIsolated is true when globalThis.crossOriginIsolated is true                            | unit |
| 7   | getCapabilities().crossOriginIsolated is false when globalThis.crossOriginIsolated is false                          | unit |
| 8   | getCapabilities().crossOriginIsolated is undefined when globalThis.crossOriginIsolated does not exist                | unit |
| 9   | getCapabilities().estimatedResolutionMs reflects platform-appropriate value (e.g., 0.001 for Node.js)                | unit |
| 10  | getCapabilities().platform is 'node' in Node.js environment                                                          | unit |
| 11  | getCapabilities().highResDegraded is false when performance.timeOrigin is available                                   | unit |
| 12  | getCapabilities().highResDegraded is true when performance.timeOrigin is unavailable                                 | unit |
| 13  | getCapabilities().monotonicDegraded is false when performance.now() is available                                     | unit |
| 14  | getCapabilities().monotonicDegraded is true when performance.now() is unavailable                                    | unit |
| 15  | getCapabilities() is computed once at construction (same reference on repeated calls)                                | unit |
| 16  | EdgeRuntimeClockAdapter.getCapabilities().platform is 'edge-worker'                                                  | unit |
| 17  | EdgeRuntimeClockAdapter.getCapabilities().highResDegraded is true                                                    | unit |
| 18  | HostBridgeClockAdapter.getCapabilities().platform matches provided options.platform                                  | unit |

**File:** `clock-capabilities.test-d.ts`

| #   | Test Description                                                                              | Type |
| --- | --------------------------------------------------------------------------------------------- | ---- |
| 19  | ClockCapabilities has all required readonly fields                                            | type |
| 20  | ClockCapabilities.platform is a union of known platform strings                              | type |
| 21  | ClockCapabilities.crossOriginIsolated is boolean \| undefined                                | type |
| 22  | ClockDiagnosticsPort has both getDiagnostics and getCapabilities methods                     | type |

**Target: >95% mutation score.**

---

### DoD 25: Edge Runtime Clock Adapter (Spec Section 4.8)

**File:** `edge-runtime-clock.test.ts`

| #   | Test Description                                                                                                          | Type |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | createEdgeRuntimeClock() returns ok() with a frozen adapter                                                               | unit |
| 2   | Adapter implements ClockPort (monotonicNow, wallClockNow, highResNow return numbers)                                     | unit |
| 3   | Adapter implements ClockDiagnosticsPort (getDiagnostics returns frozen object)                                            | unit |
| 4   | getDiagnostics().adapterName is 'EdgeRuntimeClockAdapter'                                                                 | unit |
| 5   | getDiagnostics().highResSource is 'Date.now'                                                                              | unit |
| 6   | highResNow() returns a value close to Date.now() (within 10ms)                                                           | unit |
| 7   | highResNow() returns millisecond precision only (integer values)                                                         | unit |
| 8   | monotonicNow() returns non-decreasing values across 100 calls                                                            | unit |
| 9   | wallClockNow() returns a value close to Date.now() (within 10ms)                                                         | unit |
| 10  | Startup self-tests ST-1, ST-2, ST-3 run successfully                                                                     | unit |
| 11  | Startup self-test ST-5 is skipped (highRes === wallClock by design)                                                       | unit |
| 12  | createEdgeRuntimeClock({ gxp: true }) runs ST-4 when platform APIs are frozen                                            | unit |
| 13  | createEdgeRuntimeClock() captures platform APIs at construction (anti-tampering)                                          | unit |
| 14  | getCapabilities().highResDegraded is true                                                                                 | unit |
| 15  | getCapabilities().platform is 'edge-worker'                                                                               | unit |
| 16  | EdgeRuntimeClockAdapter provides ClockPort (graph builds and container resolves)                                          | unit |
| 17  | createEdgeRuntimeClockAdapter({ gxp: true }) propagates ClockStartupError on failure                                     | unit |

**File:** `edge-runtime-clock.test-d.ts`

| #   | Test Description                                                                                                          | Type |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ---- |
| 18  | createEdgeRuntimeClock return type is Result<ClockPort & ClockDiagnosticsPort, ClockStartupError>                        | type |
| 19  | EdgeRuntimeClockOptions has readonly gxp?: boolean                                                                        | type |
| 20  | EdgeRuntimeClockAdapter type is Adapter<ClockPort>                                                                        | type |

**Target: >95% mutation score.**

---

### DoD 26: Host Bridge Clock Adapter (Spec Section 4.9)

**File:** `host-bridge-clock.test.ts`

| #   | Test Description                                                                                                          | Type |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | createHostBridgeClock() returns ok() with a frozen adapter                                                               | unit |
| 2   | Adapter implements ClockPort (monotonicNow, wallClockNow, highResNow return numbers)                                     | unit |
| 3   | Adapter implements ClockDiagnosticsPort (getDiagnostics returns frozen object)                                            | unit |
| 4   | getDiagnostics().adapterName matches provided options.adapterName                                                         | unit |
| 5   | getDiagnostics().monotonicSource is 'host-bridge'                                                                         | unit |
| 6   | getDiagnostics().highResSource is 'host-bridge' when bridge.highResNowMs is provided                                     | unit |
| 7   | getDiagnostics().highResSource is 'host-bridge-wallclock' when bridge.highResNowMs is undefined                          | unit |
| 8   | monotonicNow() delegates to bridge.monotonicNowMs()                                                                       | unit |
| 9   | wallClockNow() delegates to bridge.wallClockNowMs()                                                                       | unit |
| 10  | highResNow() delegates to bridge.highResNowMs() when provided                                                            | unit |
| 11  | highResNow() falls back to bridge.wallClockNowMs() when highResNowMs is undefined                                       | unit |
| 12  | createHostBridgeClock() throws TypeError when bridge.monotonicNowMs is not a function                                    | unit |
| 13  | createHostBridgeClock() throws TypeError when bridge.wallClockNowMs is not a function                                    | unit |
| 14  | Startup self-tests ST-1, ST-2, ST-3 run against bridge functions                                                         | unit |
| 15  | ST-5 runs only when bridge.highResNowMs is provided                                                                       | unit |
| 16  | ST-5 is skipped when bridge.highResNowMs is undefined (highRes === wallClock by design)                                  | unit |
| 17  | createHostBridgeClock({ gxp: true }) with unfrozen bridge returns err(ClockStartupError) check 'ST-4'                    | unit |
| 18  | createHostBridgeClock({ gxp: true }) with frozen bridge passes ST-4                                                      | unit |
| 19  | Bridge function references are captured at construction (anti-tampering)                                                  | unit |
| 20  | getCapabilities().platform matches provided options.platform                                                              | unit |
| 21  | getCapabilities().highResDegraded is true when bridge.highResNowMs is undefined                                          | unit |
| 22  | getCapabilities().highResDegraded is false when bridge.highResNowMs is provided                                          | unit |
| 23  | createHostBridgeClockAdapter() provides ClockPort (graph builds and container resolves)                                  | unit |
| 24  | createHostBridgeClockAdapter() propagates ClockStartupError on failure                                                   | unit |

**File:** `host-bridge-clock.test-d.ts`

| #   | Test Description                                                                                                          | Type |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ---- |
| 25  | HostClockBridge has readonly monotonicNowMs and wallClockNowMs methods, optional highResNowMs                            | type |
| 26  | HostBridgeClockOptions has readonly adapterName, platform, and optional gxp                                              | type |
| 27  | HostBridgeClockOptions.platform is 'react-native' \| 'wasm' \| 'unknown'                                                | type |
| 28  | createHostBridgeClock return type is Result<ClockPort & ClockDiagnosticsPort, ClockStartupError>                         | type |
| 29  | createHostBridgeClockAdapter return type is (bridge, options) => Adapter<ClockPort>                                      | type |

**Target: >95% mutation score.**

---

### DoD 27: Async Combinators (Spec Section 2.9)

**File:** `async-combinators.test.ts`

| #   | Test Description                                                                                           | Type |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- |
| 1   | delay(scheduler, 100) resolves after scheduler fires the timer                                             | unit |
| 2   | delay() delegates to scheduler.sleep() (verified via recording mock)                                       | unit |
| 3   | delay() throws TypeError for negative ms                                                                   | unit |
| 4   | delay() throws TypeError for NaN ms                                                                        | unit |
| 5   | delay() throws TypeError for Infinity ms                                                                   | unit |
| 6   | timeout(scheduler, resolvedPromise, 5000) returns the promise result                                       | unit |
| 7   | timeout(scheduler, pendingPromise, 100) rejects with ClockTimeoutError after timer fires                   | unit |
| 8   | timeout() ClockTimeoutError includes timeoutMs matching the provided ms                                    | unit |
| 9   | timeout() cleans up timer handle when promise settles before timeout (pendingCount drops to 0)             | unit |
| 10  | timeout() uses scheduler.setTimeout(), not platform setTimeout (verified via recording mock)               | unit |
| 11  | measure(clock, syncFn) returns { result, durationMs } with correct result                                  | unit |
| 12  | measure(clock, syncFn) durationMs matches clock.monotonicNow() difference                                  | unit |
| 13  | measure(clock, asyncFn) awaits the function and measures total duration                                    | unit |
| 14  | measure() uses clock.monotonicNow() not wallClockNow() (verified via recording mock)                       | unit |
| 15  | measure() propagates exception from fn without catching                                                    | unit |
| 16  | measure() propagates rejection from async fn without catching                                              | unit |
| 17  | retry(scheduler, succeedingFn, { maxAttempts: 3, delayMs: 100 }) returns result on first attempt           | unit |
| 18  | retry(scheduler, failThenSucceed, { maxAttempts: 3, delayMs: 100 }) retries and returns success            | unit |
| 19  | retry() uses scheduler.sleep() between attempts (verified via recording mock)                              | unit |
| 20  | retry() with backoffMultiplier: 2 uses exponential delays (100, 200, 400...)                               | unit |
| 21  | retry() caps delay at maxDelayMs                                                                           | unit |
| 22  | retry() throws the last error after maxAttempts exhausted                                                  | unit |
| 23  | retry() propagates the final error unmodified (same reference)                                             | unit |
| 24  | retry() with maxAttempts: 1 calls fn once without delay                                                    | unit |

**File:** `async-combinators.test-d.ts`

| #   | Test Description                                                                                           | Type |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- |
| 25  | delay return type is Promise\<void\>                                                                       | type |
| 26  | timeout return type preserves the generic T from the input promise                                         | type |
| 27  | measure return type is Promise\<{ readonly result: T; readonly durationMs: number }\>                      | type |
| 28  | retry return type preserves the generic T from fn                                                          | type |
| 29  | RetryOptions has readonly maxAttempts, delayMs, optional backoffMultiplier and maxDelayMs                  | type |

**Target: >95% mutation score.** Critical paths: timer cleanup on settlement, backoff math, error propagation identity.

---

### DoD 28: Duration Types (Spec Section 2.10)

**File:** `duration-types.test.ts`

| #   | Test Description                                                                                           | Type |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- |
| 1   | asMonotonicDuration(42) returns 42 (identity at runtime)                                                   | unit |
| 2   | asWallClockDuration(42) returns 42 (identity at runtime)                                                   | unit |
| 3   | asMonotonicDuration(0) returns 0 (boundary)                                                                | unit |
| 4   | asWallClockDuration(Number.MAX_SAFE_INTEGER) returns Number.MAX_SAFE_INTEGER                               | unit |
| 5   | elapsed(clock, since) returns 0 when clock.monotonicNow() equals since                                    | unit |
| 6   | elapsed(clock, since) returns positive duration after clock.advance()                                      | unit |
| 7   | elapsed() uses clock.monotonicNow() not wallClockNow() (verified via recording mock)                       | unit |
| 8   | elapsed() returns non-negative value (CLK-DUR-001)                                                        | unit |
| 9   | durationGt(asMonotonicDuration(200), asMonotonicDuration(100)) returns true                                | unit |
| 10  | durationGt(asMonotonicDuration(100), asMonotonicDuration(200)) returns false                               | unit |
| 11  | durationLt(asMonotonicDuration(100), asMonotonicDuration(200)) returns true                                | unit |
| 12  | durationBetween(asMonotonicDuration(150), asMonotonicDuration(100), asMonotonicDuration(200)) returns true | unit |
| 13  | durationBetween() is inclusive on min boundary                                                             | unit |
| 14  | durationBetween() is inclusive on max boundary                                                             | unit |
| 15  | durationBetween() returns false when value is outside range                                                | unit |

**File:** `duration-types.test-d.ts`

| #   | Test Description                                                                                           | Type |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- |
| 16  | MonotonicDuration is assignable to number (covariant widening)                                             | type |
| 17  | WallClockDuration is assignable to number (covariant widening)                                             | type |
| 18  | MonotonicDuration is NOT assignable to WallClockDuration (cross-domain blocked)                            | type |
| 19  | WallClockDuration is NOT assignable to MonotonicDuration (cross-domain blocked)                            | type |
| 20  | MonotonicDuration + MonotonicDuration produces number (arithmetic unbranding)                              | type |
| 21  | elapsed return type is MonotonicDuration                                                                   | type |
| 22  | asMonotonicDuration return type is MonotonicDuration                                                       | type |
| 23  | asWallClockDuration return type is WallClockDuration                                                       | type |
| 24  | durationGt accepts two MonotonicDuration and returns boolean                                               | type |
| 25  | durationGt does NOT accept MonotonicDuration and WallClockDuration (cross-domain blocked)                  | type |
| 26  | durationBetween accepts three MonotonicDuration and returns boolean                                        | type |

**Target: >95% mutation score.**

---

### DoD 29: Temporal API Interop (Spec Section 2.11)

**File:** `temporal-interop.test.ts`

| #   | Test Description                                                                                           | Type |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- |
| 1   | toTemporalInstant(wallClockTimestamp) returns a Temporal.Instant                                           | unit |
| 2   | toTemporalInstant converts epoch ms to nanoseconds via BigInt(ms) \* 1\_000\_000n                          | unit |
| 3   | fromTemporalInstant(instant) returns a WallClockTimestamp with correct epoch ms                            | unit |
| 4   | Round-trip: fromTemporalInstant(toTemporalInstant(wall)) === wall (no precision loss)                      | unit |
| 5   | toTemporalInstant throws TypeError when Temporal global is unavailable                                     | unit |
| 6   | fromTemporalInstant throws TypeError when Temporal global is unavailable                                   | unit |
| 7   | TypeError message includes guidance about polyfill or native Temporal support                               | unit |
| 8   | toTemporalInstant accepts HighResTimestamp (assignable to WallClockTimestamp \| HighResTimestamp)           | unit |
| 9   | Temporal global is NOT accessed at module import time (lazy detection)                                     | unit |

**File:** `temporal-interop.test-d.ts`

| #   | Test Description                                                                                           | Type |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- |
| 10  | toTemporalInstant accepts WallClockTimestamp and returns Temporal.Instant                                  | type |
| 11  | toTemporalInstant accepts HighResTimestamp                                                                 | type |
| 12  | toTemporalInstant does NOT accept MonotonicTimestamp (compile error)                                       | type |
| 13  | fromTemporalInstant return type is WallClockTimestamp                                                      | type |

**Target: >95% mutation score.** Critical paths: BigInt conversion math, lazy detection, MonotonicTimestamp rejection.

---

### DoD 30: Benchmark Specification (Spec Section 4.10)

**File:** `benchmarks/clock-benchmarks.bench.ts`

| #   | Test Description                                                                                           | Type |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- |
| 1   | monotonicNow() throughput exceeds 10,000,000 ops/sec                                                      | perf |
| 2   | wallClockNow() throughput exceeds 10,000,000 ops/sec                                                      | perf |
| 3   | highResNow() throughput exceeds 10,000,000 ops/sec                                                        | perf |
| 4   | SequenceGeneratorPort.next() throughput exceeds 20,000,000 ops/sec                                        | perf |
| 5   | TemporalContext.create() throughput exceeds 3,000,000 ops/sec                                              | perf |

**File:** `benchmarks/clock-overhead.bench.ts`

| #   | Test Description                                                                                           | Type |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- |
| 6   | monotonicNow() overhead ratio vs raw performance.now() is < 1.5x                                          | perf |
| 7   | wallClockNow() overhead ratio vs raw Date.now() is < 1.5x                                                 | perf |
| 8   | highResNow() overhead ratio vs raw (performance.timeOrigin + performance.now()) is < 1.5x                 | perf |

**File:** `benchmarks/clock-memory.bench.ts`

| #   | Test Description                                                                                           | Type |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- |
| 9   | createSystemClock() allocates < 2KB per clock instance                                                     | perf |
| 10  | TemporalContext creation allocates < 256 bytes per context                                                 | perf |

**CI integration requirements:**

| #   | Requirement                                                                                                | Ref          |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------ |
| 11  | Benchmark suite runs on every PR modifying `libs/clock/core/src/`                                           | CLK-PERF-001 |
| 12  | CI fails if any throughput floor drops below 80% of the specified minimum                                  | CLK-PERF-003 |
| 13  | Benchmark JSON results are persisted as CI artifacts                                                       | CLK-PERF-004 |
| 14  | Overhead ratio benchmarks compare against raw platform API in same harness                                 | CLK-PERF-005 |

**Note:** Benchmark tests use Vitest's `bench` API, not standard `it()` assertions. They are excluded from mutation testing but MUST pass CI regression gates. Throughput floors are enforced with a 20% tolerance buffer (e.g., 10M floor fails at < 8M) to account for CI environment variability.

**Target: 100% pass rate (performance regression gates, not mutation-tested).**

---

### DoD 31: Testing Assertion Helpers (Spec Section 5.6)

**File:** `assertion-helpers.test.ts`

| #   | Test Description                                                                                           | Type |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- |
| 1   | assertMonotonic([1, 2, 3]) does not throw                                                                  | unit |
| 2   | assertMonotonic([1, 2, 2]) throws AssertionError (equal values fail)                                       | unit |
| 3   | assertMonotonic([1, 3, 2]) throws AssertionError (decreasing values fail)                                  | unit |
| 4   | assertMonotonic([]) does not throw (empty array accepted)                                                  | unit |
| 5   | assertMonotonic([42]) does not throw (single-element accepted)                                             | unit |
| 6   | assertMonotonic error message includes index and values of failing pair                                    | unit |
| 7   | assertMonotonic error message includes custom label when provided                                          | unit |
| 8   | assertTimeBetween(150, 100, 200) does not throw                                                            | unit |
| 9   | assertTimeBetween(100, 100, 200) does not throw (inclusive min)                                            | unit |
| 10  | assertTimeBetween(200, 100, 200) does not throw (inclusive max)                                            | unit |
| 11  | assertTimeBetween(250, 100, 200) throws AssertionError                                                     | unit |
| 12  | assertTimeBetween(50, 100, 200) throws AssertionError                                                      | unit |
| 13  | assertTimeBetween error message includes actual, min, max values                                           | unit |
| 14  | assertWallClockPlausible(Date.now()) does not throw (current time is plausible)                             | unit |
| 15  | assertWallClockPlausible(946684800000) throws AssertionError (year 2000, before 2020)                      | unit |
| 16  | assertWallClockPlausible(Date.now() + 90000000) throws AssertionError (more than 1 day in future)          | unit |
| 17  | assertWallClockPlausible(1577836800000) does not throw (exactly 2020-01-01T00:00:00Z boundary)             | unit |
| 18  | assertSequenceOrdered([1, 2, 3, 4]) does not throw (consecutive)                                          | unit |
| 19  | assertSequenceOrdered([1, 2, 2, 3]) throws AssertionError (duplicate detected, gap = 0)                   | unit |
| 20  | assertSequenceOrdered([1, 2, 5, 6]) throws AssertionError (gap of 3 detected)                             | unit |
| 21  | assertSequenceOrdered([]) does not throw (empty array accepted)                                            | unit |
| 22  | assertSequenceOrdered([42]) does not throw (single-element accepted)                                       | unit |
| 23  | assertSequenceOrdered error message includes gap size and index                                            | unit |

**File:** `assertion-helpers.test-d.ts`

| #   | Test Description                                                                                           | Type |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- |
| 24  | assertMonotonic accepts ReadonlyArray\<MonotonicTimestamp\>                                                 | type |
| 25  | assertTimeBetween accepts MonotonicDuration parameters                                                     | type |
| 26  | assertWallClockPlausible accepts WallClockTimestamp                                                         | type |
| 27  | assertSequenceOrdered accepts ReadonlyArray\<number\>                                                      | type |

**Target: >95% mutation score.** Critical paths: boundary inclusion/exclusion, gap detection arithmetic.

---

### DoD 32: AsyncLocalStorage Clock Context (Spec Section 7.8)

**File:** `clock-context.test.ts`

| #   | Test Description                                                                                           | Type |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- |
| 1   | createClockContext() returns object with storage, run, and get properties                                  | unit |
| 2   | get() returns undefined outside of run()                                                                   | unit |
| 3   | run() makes context available via get() inside callback                                                    | unit |
| 4   | run() propagates context through async boundaries (await inside run callback)                              | unit |
| 5   | run() propagates context through nested async function calls                                               | unit |
| 6   | Two independent createClockContext() instances do not share state                                           | unit |
| 7   | run() freezes the ClockContext before storing (Object.isFrozen check)                                      | unit |
| 8   | get() returns frozen ClockContext inside run()                                                              | unit |
| 9   | createClockContext() does NOT import node:async_hooks at module evaluation time (lazy import)               | unit |
| 10  | createClockContext() throws TypeError with descriptive message on platforms without AsyncLocalStorage       | unit |
| 11  | run() returns the value returned by the callback                                                           | unit |
| 12  | Nested run() overrides outer context for inner callback                                                    | unit |

**File:** `clock-context.test-d.ts`

| #   | Test Description                                                                                           | Type |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- |
| 13  | ClockContext has readonly clock: ClockPort and readonly sequenceGenerator: SequenceGeneratorPort            | type |
| 14  | createClockContext return type has storage, run, and get properties                                        | type |
| 15  | run generic T: run\<T\>(ctx, fn: () => T) returns T                                                       | type |
| 16  | get return type is ClockContext \| undefined                                                               | type |

**Target: >95% mutation score.** Critical paths: async propagation, context isolation, lazy import, platform detection.

---

### DoD 33: Cached Clock Registration (Spec Section 7.5)

**File:** `cached-clock-registration.test.ts`

| #   | Test Description                                                                                           | Type |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- |
| 1   | SystemCachedClockAdapter registers CachedClockPort on the graph                                            | unit |
| 2   | Resolving CachedClockPort returns a working adapter (recentMonotonicNow returns number)                    | unit |
| 3   | SystemCachedClockAdapter auto-starts the adapter (isRunning() returns true)                                | unit |
| 4   | SystemCachedClockAdapter requires ClockPort to be registered in the graph                                  | unit |
| 5   | SystemCachedClockAdapter with custom updateIntervalMs passes option to factory                             | unit |

**File:** `cached-clock-registration.test-d.ts`

| #   | Test Description                                                                                           | Type |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- |
| 6   | SystemCachedClockAdapter type is Adapter\<CachedClockPort\>                                                | type |
| 7   | SystemCachedClockAdapter requires ClockPort in the graph (compile error without it)                        | type |

**Target: >95% mutation score.**

---

### DoD 34: Process Instance ID (Spec Section 3.3)

**File:** `process-instance-id.test.ts`

| #   | Test Description                                                                                           | Type |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- |
| 1   | createProcessInstanceId() returns a string                                                                 | unit |
| 2   | createProcessInstanceId() format matches `{hostname}-{timestamp}-{uuid}` pattern                           | unit |
| 3   | createProcessInstanceId() hostname segment is a non-empty string                                           | unit |
| 4   | createProcessInstanceId() timestamp segment is a valid epoch millisecond number                             | unit |
| 5   | createProcessInstanceId() uuid segment is a valid UUID v4 format                                           | unit |
| 6   | Two calls to createProcessInstanceId() return different values (uuid uniqueness)                           | unit |
| 7   | createProcessInstanceId() falls back to "unknown" hostname when os.hostname() is unavailable               | unit |
| 8   | createProcessInstanceId() uses fallback identifier format when crypto.randomUUID() is unavailable          | unit |
| 9   | Fallback identifier includes performance.now() precision component                                         | unit |
| 10  | Fallback identifier includes monotonic counter for same-microsecond uniqueness                              | unit |

**File:** `process-instance-id.test-d.ts`

| #   | Test Description                                                                                           | Type |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- |
| 11  | createProcessInstanceId return type is string                                                              | type |

**Target: >95% mutation score.** Critical paths: fallback when crypto.randomUUID unavailable, format parsing correctness.

---

### DoD 35: Periodic Clock Evaluation (Spec Section 6.6 -- Clock Source Requirements §7.2)

**File:** `periodic-evaluation.test.ts`

| #   | Test Description                                                                                                  | Type |
| --- | ----------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | setupPeriodicClockEvaluation() starts periodic interval via TimerSchedulerPort at configured intervalMs            | unit |
| 2   | setupPeriodicClockEvaluation() calls getDiagnostics() and getCapabilities() on each interval cycle                | unit |
| 3   | setupPeriodicClockEvaluation() invokes onBaselineMismatch callback when diagnostics field differs from baseline    | unit |
| 4   | setupPeriodicClockEvaluation() invokes onBaselineMismatch with field name, expected, and actual values             | unit |
| 5   | setupPeriodicClockEvaluation() invokes onBaselineMismatch when capabilities field differs from baseline            | unit |
| 6   | setupPeriodicClockEvaluation() invokes onDriftDetected when drift exceeds driftThresholdMs                        | unit |
| 7   | setupPeriodicClockEvaluation() does not invoke onDriftDetected when drift is within driftThresholdMs               | unit |
| 8   | setupPeriodicClockEvaluation() uses default driftThresholdMs of 1000 when not specified                           | unit |
| 9   | setupPeriodicClockEvaluation() does not throw when driftReferenceProvider is not configured                       | unit |
| 10  | setupPeriodicClockEvaluation() calls driftReferenceProvider on each cycle when configured                         | unit |
| 11  | setupPeriodicClockEvaluation().stop() cancels the interval (no further cycles after stop)                         | unit |
| 12  | setupPeriodicClockEvaluation() passes observed drift and current wallClock timestamp to onDriftDetected            | unit |

**File:** `periodic-evaluation.test-d.ts`

| #   | Test Description                                                                                                  | Type |
| --- | ----------------------------------------------------------------------------------------------------------------- | ---- |
| 13  | setupPeriodicClockEvaluation accepts ClockPort, ClockDiagnosticsPort, TimerSchedulerPort, PeriodicEvaluationConfig | type |
| 14  | setupPeriodicClockEvaluation returns { readonly stop: () => void }                                                | type |
| 15  | PeriodicEvaluationConfig has required fields: intervalMs, baselineDiagnostics, baselineCapabilities, onDriftDetected, onBaselineMismatch | type |
| 16  | PeriodicEvaluationConfig has optional driftReferenceProvider and driftThresholdMs                                  | type |

**Target: >95% mutation score.** Critical paths: interval lifecycle (start/stop), baseline comparison logic, drift threshold boundary, driftReferenceProvider optionality.

---

### DoD 36: Retention Utilities (Spec Section 6.6 -- Audit Trail Integration §8)

**File:** `retention-utilities.test.ts`

| #   | Test Description                                                                                                  | Type |
| --- | ----------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | validateRetentionMetadata() returns Ok for valid RetentionMetadata with all fields correct                        | unit |
| 2   | validateRetentionMetadata() returns Err when retentionPeriodDays is not a positive integer (zero)                 | unit |
| 3   | validateRetentionMetadata() returns Err when retentionPeriodDays is not a positive integer (negative)             | unit |
| 4   | validateRetentionMetadata() returns Err when retentionPeriodDays is not a positive integer (fractional)           | unit |
| 5   | validateRetentionMetadata() returns Err when retentionBasis is empty string                                       | unit |
| 6   | validateRetentionMetadata() returns Err when retentionStartDate is not valid ISO 8601                             | unit |
| 7   | validateRetentionMetadata() returns Err when retentionExpiryDate is not valid ISO 8601                            | unit |
| 8   | validateRetentionMetadata() returns Err when retentionExpiryDate does not equal startDate + periodDays            | unit |
| 9   | validateRetentionMetadata() returns Err when recordType is empty string                                           | unit |
| 10  | validateRetentionMetadata() Ok result returns same frozen reference (not a copy)                                  | unit |
| 11  | RetentionValidationError has \_tag 'RetentionValidationError' and is frozen                                       | unit |
| 12  | RetentionValidationError includes field name and descriptive message                                              | unit |
| 13  | calculateRetentionExpiryDate() returns ISO 8601 UTC string for startDate + retentionPeriodDays                    | unit |
| 14  | calculateRetentionExpiryDate() handles month-boundary rollover correctly (e.g., Jan 31 + 30 days)                 | unit |
| 15  | calculateRetentionExpiryDate() handles year-boundary rollover correctly (e.g., Dec 15 + 30 days)                  | unit |
| 16  | calculateRetentionExpiryDate() handles leap year correctly (e.g., Feb 28 + 1 day in leap year)                    | unit |

**File:** `retention-utilities.test-d.ts`

| #   | Test Description                                                                                                  | Type |
| --- | ----------------------------------------------------------------------------------------------------------------- | ---- |
| 17  | RetentionMetadata has readonly retentionPeriodDays, retentionBasis, retentionStartDate, retentionExpiryDate, recordType | type |
| 18  | RetentionValidationError has readonly \_tag, field, message                                                       | type |
| 19  | validateRetentionMetadata accepts RetentionMetadata and returns Result<RetentionMetadata, RetentionValidationError> | type |
| 20  | calculateRetentionExpiryDate accepts (string, number) and returns string                                          | type |
| 21  | RetentionPolicyPort has readonly getRetentionPeriodDays, isRetentionConfigured, getSupportedRecordTypes            | type |
| 22  | RetentionPolicyPort.getRetentionPeriodDays accepts string and returns number                                      | type |
| 23  | RetentionPolicyPort.getSupportedRecordTypes returns ReadonlyArray<string>                                         | type |

**Target: >95% mutation score.** Critical paths: date arithmetic correctness in calculateRetentionExpiryDate, validation rule for expiryDate == startDate + periodDays consistency, positive integer guard on retentionPeriodDays.

---

### DoD 37: Validated Branding Utilities (Spec Section 2.5 — Validated Variants)

**File:** `validated-branding.test.ts`

| #   | Test Description                                                                                                  | Type |
| --- | ----------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | asMonotonicValidated(100) returns Ok(MonotonicTimestamp) for valid monotonic value                                 | unit |
| 2   | asMonotonicValidated(0) returns Ok (boundary: ms >= 0)                                                            | unit |
| 3   | asMonotonicValidated(-1) returns Err(BrandingValidationError) (negative rejected)                                 | unit |
| 4   | asMonotonicValidated(1e12) returns Err(BrandingValidationError) (ms < 1e12 boundary violated)                     | unit |
| 5   | asMonotonicValidated(999999999999) returns Ok (just under 1e12 boundary)                                          | unit |
| 6   | asMonotonicValidated(NaN) returns Err(BrandingValidationError) (NaN rejected)                                     | unit |
| 7   | asMonotonicValidated(Infinity) returns Err(BrandingValidationError) (Infinity rejected)                           | unit |
| 8   | asWallClockValidated(Date.now()) returns Ok(WallClockTimestamp) for current time                                  | unit |
| 9   | asWallClockValidated(946684800000) returns Ok (boundary: exactly Y2K epoch)                                       | unit |
| 10  | asWallClockValidated(946684799999) returns Err(BrandingValidationError) (1ms before Y2K boundary)                 | unit |
| 11  | asWallClockValidated(0) returns Err(BrandingValidationError) (Unix epoch predates Y2K)                            | unit |
| 12  | asWallClockValidated(Date.now() + 86400001) returns Err(BrandingValidationError) (>1 day in future)               | unit |
| 13  | asWallClockValidated(Date.now() + 86400000) returns Ok (boundary: exactly 1 day in future)                        | unit |
| 14  | asHighResValidated(Date.now()) returns Ok(HighResTimestamp) for current time                                      | unit |
| 15  | asHighResValidated applies same validation rules as asWallClockValidated (Y2K floor, 1-day-future ceiling)        | unit |
| 16  | asHighResValidated(0) returns Err(BrandingValidationError) (same rejection as wallClock)                          | unit |
| 17  | BrandingValidationError has _tag 'BrandingValidationError'                                                        | unit |
| 18  | BrandingValidationError is frozen at construction                                                                  | unit |
| 19  | BrandingValidationError includes expectedDomain matching the called function ('monotonic', 'wallClock', 'highRes') | unit |
| 20  | BrandingValidationError includes value field with the rejected input number                                       | unit |
| 21  | BrandingValidationError includes descriptive message string                                                       | unit |
| 22  | createBrandingValidationError() returns a frozen BrandingValidationError                                          | unit |
| 23  | Validated branding utilities never throw (Result return only, verified with NaN, Infinity, -Infinity, negative)   | unit |
| 24  | Ok result from validated branding is the same numeric value as input (identity, no copy)                          | unit |

**File:** `validated-branding.test-d.ts`

| #   | Test Description                                                                                                  | Type |
| --- | ----------------------------------------------------------------------------------------------------------------- | ---- |
| 25  | asMonotonicValidated accepts number and returns Result<MonotonicTimestamp, BrandingValidationError>                | type |
| 26  | asWallClockValidated accepts number and returns Result<WallClockTimestamp, BrandingValidationError>                | type |
| 27  | asHighResValidated accepts number and returns Result<HighResTimestamp, BrandingValidationError>                    | type |
| 28  | BrandingValidationError has readonly _tag, expectedDomain, value, message                                         | type |
| 29  | BrandingValidationError.expectedDomain is 'monotonic' \| 'wallClock' \| 'highRes'                                | type |
| 30  | createBrandingValidationError accepts (expectedDomain, value, message) and returns BrandingValidationError        | type |

**Target: >95% mutation score.** Critical paths: boundary conditions for monotonic (0, 1e12), wallClock (Y2K epoch, 1-day future), NaN/Infinity rejection, error domain discrimination.

---

### Mutation Testing Summary

| DoD Item                       | Source Files                                       | Target Score                |
| ------------------------------ | -------------------------------------------------- | --------------------------- |
| DoD 1: Clock Port              | `ports/clock.ts`                                   | >95%                        |
| DoD 2: Sequence Generator      | `ports/sequence.ts`                                | >95%                        |
| DoD 3: System Clock            | `adapters/system-clock.ts`                         | >95%                        |
| DoD 4: Virtual Clock           | `testing/virtual-clock.ts`                         | >95%                        |
| DoD 5: Virtual Sequence        | `testing/virtual-sequence.ts`                      | >95%                        |
| DoD 6: Clock Diagnostics       | `ports/diagnostics.ts`, `adapters/system-clock.ts` | >95%                        |
| DoD 7: GxP Compliance          | All source files                                   | >95%                        |
| DoD 8: Temporal Context        | `temporal-context.ts`                              | >95%                        |
| DoD 8a: Signature Validation   | `signature-validation.ts`                          | >95%                        |
| DoD 8b: Schema Deserialization | `deserialization.ts`                               | >95%                        |
| DoD 8c: Record Integrity       | `record-integrity.ts`                              | >95%                        |
| DoD 9: GxP IQ Protocol         | All source files                                   | 100% pass (acceptance)      |
| DoD 10: GxP OQ Protocol        | All source files                                   | 100% pass (acceptance)      |
| DoD 11: GxP PQ Protocol        | All source files                                   | 100% pass (acceptance)      |
| DoD 12: Container Integration  | `index.ts` (SystemClockAdapter)                    | >95%                        |
| DoD 13: Clock Source Change    | `events/clock-source-changed.ts`                   | >95%                        |
| DoD 14: Clock Source Bridge    | `index.ts` (createClockSourceBridge)               | >95%                        |
| DoD 15: GxP Metadata           | `gxp-metadata.ts`                                  | >95%                        |
| DoD 16: HardwareClockAdapter   | `ports/` (interface types only)                    | 100% pass (type-level only) |
| DoD 17: Branded Timestamps     | `ports/clock.ts`, `branded.ts`                     | >95%                        |
| DoD 18: System Timer Scheduler | `adapters/system-timer.ts`                         | >95%                        |
| DoD 19: Virtual Timer (Core)   | `testing/virtual-timer.ts`                         | >95%                        |
| DoD 20: Virtual Timer (Adv)    | `testing/virtual-timer.ts`                         | >95%                        |
| DoD 21: Cached Clock Interface | `ports/cached-clock.ts`, `adapters/cached-clock.ts`| >95%                        |
| DoD 22: Cached Clock Lifecycle | `adapters/cached-clock.ts`, `testing/virtual-cached-clock.ts` | >95%              |
| DoD 23: Cached Clock Types     | `ports/cached-clock.ts` (interface types only)     | 100% pass (type-level only) |
| DoD 24: Clock Capabilities     | `adapters/system-clock.ts`, `adapters/edge-runtime-clock.ts`, `adapters/host-bridge-clock.ts` | >95% |
| DoD 25: Edge Runtime Clock     | `adapters/edge-runtime-clock.ts`                   | >95%                        |
| DoD 26: Host Bridge Clock      | `adapters/host-bridge-clock.ts`                    | >95%                        |
| DoD 27: Async Combinators      | `combinators/async.ts`                             | >95%                        |
| DoD 28: Duration Types         | `branded.ts`, `combinators/duration.ts`            | >95%                        |
| DoD 29: Temporal Interop       | `interop/temporal.ts`                              | >95%                        |
| DoD 30: Benchmark Spec         | All source files                                   | 100% pass (perf gates)      |
| DoD 31: Assertion Helpers      | `testing/assertions.ts`                            | >95%                        |
| DoD 32: Clock Context (ALS)    | `context/clock-context.ts`                         | >95%                        |
| DoD 33: Cached Clock Reg.      | `index.ts` (SystemCachedClockAdapter)              | >95%                        |
| DoD 34: Process Instance ID    | `utils/process-instance-id.ts`                     | >95%                        |
| DoD 35: Periodic Evaluation    | `gxp/periodic-evaluation.ts`                       | >95%                        |
| DoD 36: Retention Utilities    | `gxp/retention.ts`                                 | >95%                        |
| DoD 37: Validated Branding     | `branded.ts`                                       | >95%                        |

### Mutation Testing Tooling and CI Enforcement

**Tooling:** Mutation testing MUST be performed using [Stryker Mutator](https://stryker-mutator.io/) (`@stryker-mutator/core`) with the Vitest runner plugin (`@stryker-mutator/vitest-runner`).

**Configuration:** The Stryker configuration (`stryker.config.mjs`) MUST be committed to the `libs/clock/core/` directory and MUST include:

- `mutate`: targeting all production source files (excluding `index.ts` re-exports, type-only files, and testing entry points)
- `thresholds.high`: `95` (the ">95% mutation score" target)
- `thresholds.low`: `90` (below this, Stryker reports failure)
- `thresholds.break`: `90` (CI pipeline fails if mutation score drops below 90%)

**Risk-proportional mutation threshold guidance:** The uniform >95% mutation score target has been evaluated as adequate for all risk levels based on the following rationale: (a) the highest-risk functions (`wallClockNow()`, `highResNow()`, `SequenceGeneratorPort.next()`) are architecturally simple (thin wrappers over platform APIs or counter increments), making >95% mutation kill rate achievable with targeted unit tests; (b) the critical-path annotations on DoD 2, DoD 3, and DoD 8 sections above already direct test authors to focus mutation testing effort on overflow detection, monotonic guarantees, sequence uniqueness, and platform API capture; (c) per GAMP 5 risk-based validation principles, the testing effort is proportional to the function's complexity rather than its risk classification alone. High-risk functions identified in the GAMP 5 Risk Classification table (see `06/clock-source-requirements.md`) SHOULD achieve ≥97% mutation kill rate where achievable, but failure to exceed 97% on a high-risk module does not block approval provided the uniform 95% threshold is met and the QA reviewer confirms the surviving mutants are semantically equivalent (i.e., they do not change observable behavior).

**CI enforcement:** The mutation testing target MUST be enforced in the CI pipeline as follows:

1. Mutation testing runs on every pull request that modifies files in `libs/clock/core/src/`.
2. The CI step MUST use `stryker run --reporters clear-text,json` and persist the JSON report as a CI artifact.
3. The CI step MUST fail if the overall mutation score drops below the `thresholds.break` value (90%).
4. Pull requests MUST NOT be merged if the mutation score is below the `thresholds.high` value (95%) unless a written justification is provided in the PR description and approved by the QA reviewer.

REQUIREMENT: The Stryker configuration and CI enforcement described above MUST be implemented. The JSON mutation report from each CI run MUST be retained as a validation artifact for GxP audit trail purposes.

### Overall Test Count

**692 tests** across 68 test files (34 unit test files, 26 type test files, 4 GxP test files, 3 benchmark files, 1 perf CI requirement file). Each test is individually enumerated in the DoD tables above; this is an exact count, not an estimate.

**Test count breakdown for new DoD items (revision 2.6):**

| DoD Item | Unit Tests | Type Tests | Perf Tests | Total |
|---|---|---|---|---|
| DoD 37: Validated Branding | 24 | 6 | 0 | 30 |
| IQ-44 (validated branding export verification) | 1 | 0 | 0 | 1 |
| **New tests subtotal** | **25** | **6** | **0** | **31** |
| **Previous total (rev 2.5)** | | | | **658** |
| **Accumulated total** | | | | **692** |

**Revision history:**

| Revision | DoD Items | Test Count | Change |
|---|---|---|---|
| 2.2 | DoD 1–23 | 378 | Initial |
| 2.3 | DoD 24–26, IQ-23–30 | 457 | +79 (capabilities, edge, host bridge) |
| 2.4 | DoD 27–34, IQ-31–40 | 608 | +151 (combinators, durations, temporal, benchmarks, assertions, ALS, cached reg., process ID) |
| 2.5 | DoD 35–36, DoD 8a ext., IQ-41–43 | 658 | +50 (periodic evaluation, retention utilities, temporal consistency thresholds) |
| 2.6 | DoD 37, IQ-44 | 689 | +31 (validated branding utilities, BrandingValidationError) |
| 2.7 | DoD 18 ext. | 692 | +3 (SystemTimerSchedulerAdapter registration helper tests) |
