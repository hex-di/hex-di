# 09 - Definition of Done

## 9.1 Test Organization

| Test Category          | File Pattern                                             | Location                |
| ---------------------- | -------------------------------------------------------- | ----------------------- |
| Unit tests             | `*.test.ts`                                              | `packages/clock/tests/` |
| Type-level tests       | `*.test-d.ts`                                            | `packages/clock/tests/` |
| GxP-specific tests     | `gxp-*.test.ts`                                          | `packages/clock/tests/` |
| Temporal context tests | `temporal-context.test.ts`, `temporal-context.test-d.ts` | `packages/clock/tests/` |

### Test Runner

All tests use Vitest. Run with:

```bash
pnpm --filter @hex-di/clock test
pnpm --filter @hex-di/clock test:types
```

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

| #   | Test Description                                  | Type |
| --- | ------------------------------------------------- | ---- |
| 9   | ClockDiagnosticsPort has getDiagnostics method    | type |
| 10  | ClockDiagnostics has all required readonly fields | type |
| 11  | monotonicSource is a union type of known sources  | type |
| 12  | highResSource is a union type of known sources    | type |

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

**File:** `signature-validation.test-d.ts`

| #   | Test Description                                                                                            | Type |
| --- | ----------------------------------------------------------------------------------------------------------- | ---- |
| 13  | validateSignableTemporalContext accepts SignableTemporalContext and returns Result                          | type |
| 14  | SignatureValidationError has readonly \_tag, field, message                                                 | type |
| 15  | SignableTemporalContext extends TemporalContext (assignable from TemporalContext with signature)            | type |
| 16  | SignableTemporalContext.signature has readonly signerName, signerId, signedAt, meaning, method when present | type |

**Target: >95% mutation score.**

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
| 17  | verifyTemporalContextDigest() uses constant-time comparison (timing: verification of matching and non-matching digests takes approximately equal time over 1000 iterations) | unit |

**File:** `record-integrity.test-d.ts`

| #   | Test Description                                                                                       | Type                                                               |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ---- |
| 18  | TemporalContextDigest has readonly \_tag, algorithm, digest, canonicalInput                            | type                                                               |
| 19  | computeTemporalContextDigest accepts TemporalContext and returns TemporalContextDigest                 | type                                                               |
| 20  | verifyTemporalContextDigest accepts TemporalContext                                                    | OverflowTemporalContext and TemporalContextDigest, returns boolean | type |
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

**Target: 100% pass rate.** OQ tests are pass/fail acceptance tests, not mutation-tested. They MUST all pass for GxP deployment approval.

---

### DoD 11: GxP Performance Qualification (Spec Section 6.2 -- PQ Protocol)

**File:** `gxp-pq-clock.test.ts`

| #   | Test Description                                                                         | Type |
| --- | ---------------------------------------------------------------------------------------- | ---- |
| 1   | PQ-1: Throughput meets requirements over 60-second window on target hardware             | unit |
| 2   | PQ-2: highResNow() sub-millisecond precision on specific deployment platform             | unit |
| 3   | PQ-3: Sequence uniqueness over extended period (configurable via PQ_DURATION_MS)         | unit |
| 4   | PQ-4: No memory leak (heap growth < PQ_MEMORY_GROWTH_THRESHOLD) over sustained operation | unit |

**Target: 100% pass rate.** PQ tests are long-running pass/fail acceptance tests, excluded from CI/CD pipelines. They MUST all pass for GxP deployment approval on each target platform.

---

### DoD 12: Graph Integration (Spec Section 7.1)

**File:** `graph-integration.test.ts`

| #   | Test Description                                                                                                | Type |
| --- | --------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | provideSystemClock() returns a graph with ClockPort provided                                                    | unit |
| 2   | provideSystemClock() returns a graph with SequenceGeneratorPort provided                                        | unit |
| 3   | provideSystemClock() returns a graph with ClockDiagnosticsPort provided                                         | unit |
| 4   | Resolving ClockPort from provideSystemClock() graph returns a working adapter (monotonicNow returns number)     | unit |
| 5   | provideSystemClock() propagates ClockStartupError when createSystemClock() fails (e.g., simulated ST-1 failure) | unit |
| 6   | provideSystemClock() registers ClockSourceChangedSinkPort when sink parameter is provided                       | unit |
| 7   | provideSystemClock() does NOT emit ClockSourceChangedEvent on initial registration                              | unit |
| 8   | provideSystemClock({ gxp: true }) without sink parameter logs warning to stderr                                 | unit |
| 9   | provideSystemClock() without gxp option and without sink does NOT log warning to stderr                         | unit |

**File:** `graph-integration.test-d.ts`

| #   | Test Description                                                                                                               | Type |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ---- |
| 10  | provideSystemClock return type includes Provides<ClockPort> & Provides<SequenceGeneratorPort> & Provides<ClockDiagnosticsPort> | type |

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

**File:** `clock-source-change.test-d.ts`

| #   | Test Description                                                                                  | Type |
| --- | ------------------------------------------------------------------------------------------------- | ---- |
| 8   | ClockSourceChangedEvent has readonly \_tag, previousAdapter, newAdapter, timestamp, reason        | type |
| 9   | ClockSourceChangedSink has readonly onClockSourceChanged method accepting ClockSourceChangedEvent | type |

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

**File:** `gxp-metadata.test-d.ts`

| #   | Test Description                                                   | Type |
| --- | ------------------------------------------------------------------ | ---- |
| 3   | ClockGxPMetadata has readonly clockVersion property of type string | type |
| 4   | getClockGxPMetadata return type is ClockGxPMetadata                | type |

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
| DoD 12: Graph Integration      | `index.ts` (provideSystemClock)                    | >95%                        |
| DoD 13: Clock Source Change    | `events/clock-source-changed.ts`                   | >95%                        |
| DoD 14: Clock Source Bridge    | `index.ts` (createClockSourceBridge)               | >95%                        |
| DoD 15: GxP Metadata           | `gxp-metadata.ts`                                  | >95%                        |
| DoD 16: HardwareClockAdapter   | `ports/` (interface types only)                    | 100% pass (type-level only) |

### Overall Test Count

**Estimated: 271 tests** across 33 test files (16 unit test files, 13 type test files, 4 GxP test files).
