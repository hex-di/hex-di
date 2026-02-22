# 6.4 Resolution and Precision — GxP Compliance

> **Part of:** [GxP Compliance (§6)](./README.md) | **Previous:** [§6.3 Verification and Change Control](./03-verification-and-change-control.md) | **Next:** [§6.5 ALCOA+ Mapping](./05-alcoa-mapping.md)

## Resolution and Precision

### GxP Resolution Requirements

Different GxP use cases require different timing precision:

| Use Case                    | Required Precision                 | Source                    |
| --------------------------- | ---------------------------------- | ------------------------- |
| Audit trail timestamps      | Millisecond                        | 21 CFR 11.10(e)           |
| Electronic batch records    | Second                             | EU GMP Annex 11 section 9 |
| Laboratory data acquisition | Microsecond (instrument-dependent) | 21 CFR Part 211           |
| Tracing spans               | Microsecond (recommended)          | OpenTelemetry spec        |

### How `@hex-di/clock` Satisfies This

- `wallClockNow()` provides millisecond precision on all platforms -- sufficient for audit trail timestamps and batch records.
- `highResNow()` provides microsecond precision where available -- sufficient for laboratory data and tracing.
- `monotonicNow()` provides the best available monotonic precision -- sufficient for duration measurement.

### When Precision Is Insufficient

If the platform coarsens timing (e.g., Firefox reducing `performance.now()` to 1ms), `@hex-di/clock` reports the coarsened value honestly. It does NOT attempt to synthesize higher precision.

The `SequenceGeneratorPort` provides the ordering backstop: when two events share a timestamp due to coarsening, their sequence numbers disambiguate.

REQUIREMENT (CLK-RES-001): `@hex-di/clock` MUST NOT fabricate precision. If the platform provides 1ms resolution, the adapter MUST return values with 1ms resolution, not interpolated sub-millisecond values.

**Cross-reference:** Failure to satisfy this requirement constitutes failure mode FM-7 (Precision Fabrication) in the FMEA (see `./11-fmea-risk-analysis.md`). Detection is via OQ-4 (precision verification) and code review. See also CLK-SYS-020 (MUST NOT circumvent browser timer coarsening) in `04-platform-adapters.md`.

---


