# 03 - ALCOA+ Data Integrity Mapping

> **Document Control**
>
> | Property | Value |
> |----------|-------|
> | Document ID | GXP-CC-03 |
> | Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/cross-cutting/gxp/03-alcoa-mapping.md` |
> | Status | Effective |
> | Classification | Cross-Cutting GxP Framework |

---

## ALCOA+ Principles

ALCOA+ is a data integrity framework used in GxP-regulated environments to assess whether electronic records meet regulatory requirements. The framework defines nine principles that all electronic records MUST satisfy.

### Core ALCOA Principles

| Principle | Definition | Regulatory Basis |
|-----------|-----------|------------------|
| **Attributable** | It must be possible to identify who created, modified, or deleted a record, and when. Every record must be traceable to the individual or system that generated it. | 21 CFR 11.10(e), 11.10(k); EU GMP Annex 11 §9; MHRA DI §6.2 |
| **Legible** | Records must be readable, permanent, and retrievable throughout the retention period. Records must be human-readable or machine-parseable with documented format specifications. | 21 CFR 11.10(b); EU GMP Annex 11 §7; MHRA DI §6.4 |
| **Contemporaneous** | Records must be created at the time the activity occurs, not retroactively. Timestamps must reflect the actual time of the event, not the time of data entry. | 21 CFR 11.10(e); EU GMP Annex 11 §9; MHRA DI §6.5 |
| **Original** | Records must be the first capture of the data, or a certified true copy. Original records must not be modifiable after creation. | 21 CFR 11.10(c); EU GMP Annex 11 §7; MHRA DI §6.6 |
| **Accurate** | Records must be free from errors, complete, and truthful. Systems must not fabricate, round, or approximate data without documented justification. | 21 CFR 11.10(a); EU GMP Annex 11 §6; MHRA DI §6.7 |

### Extended ("+") Principles

| Principle | Definition | Regulatory Basis |
|-----------|-----------|------------------|
| **Complete** | All data must be present, including repeat tests, failed runs, and anomalies. No selective reporting or silent data omission. | 21 CFR 11.10(e); MHRA DI §6.8 |
| **Consistent** | Data must follow consistent formats, timestamps, and sequencing across all records. Cross-system timestamp inconsistency is a data integrity risk. | EU GMP Annex 11 §7; MHRA DI §6.9 |
| **Enduring** | Records must remain intact and retrievable for the entire required retention period. Storage media, formats, and access mechanisms must outlast the retention requirement. | 21 CFR 11.10(c); EU GMP Annex 11 §17; MHRA DI §6.10 |
| **Available** | Records must be accessible for review, audit, and inspection throughout the retention period. Archived data must be retrievable within a reasonable timeframe. | EU GMP Annex 11 §17; MHRA DI §6.11; PIC/S PI 041 §9.4 |

---

## ALCOA+ Mapping Guidance for Libraries

Each per-package `compliance/gxp.md` provides a specific ALCOA+ mapping table that documents how the library's features support each principle. The following template defines the structure:

### Per-Package ALCOA+ Mapping Template

| Principle | Library Feature | Specification Reference | Compliance Mechanism |
|-----------|----------------|------------------------|----------------------|
| **Attributable** | _Feature that enables tracing record origin_ | _Spec section reference_ | _How the feature satisfies Attributable_ |
| **Legible** | _Feature that ensures readability_ | _Spec section reference_ | _How the feature satisfies Legible_ |
| **Contemporaneous** | _Feature that captures data at event time_ | _Spec section reference_ | _How the feature satisfies Contemporaneous_ |
| **Original** | _Feature that preserves immutability_ | _Spec section reference_ | _How the feature satisfies Original_ |
| **Accurate** | _Feature that ensures accuracy_ | _Spec section reference_ | _How the feature satisfies Accurate_ |
| **Complete** | _Feature that prevents data omission_ | _Spec section reference_ | _How the feature satisfies Complete_ |
| **Consistent** | _Feature that ensures consistency_ | _Spec section reference_ | _How the feature satisfies Consistent_ |
| **Enduring** | _Feature that supports long-term storage_ | _Spec section reference_ | _How the feature satisfies Enduring_ |
| **Available** | _Feature that ensures accessibility_ | _Spec section reference_ | _How the feature satisfies Available_ |

### Attribution Boundary

```
REQUIREMENT: Each per-package ALCOA+ mapping MUST clearly define the attribution
             boundary — what the library provides vs. what the consumer is responsible
             for. For example, a clock library provides the WHEN (temporal context) but
             binding timestamps to WHO (user identity) and WHY (business reason) is the
             consumer's responsibility.
```

### ALCOA+ Gap Analysis Guidance

When a library cannot fully satisfy an ALCOA+ principle due to platform constraints or scope limitations, the compliance document MUST include:

1. **Gap identification**: Which principle is partially satisfied and why
2. **Risk acceptance rationale**: Why the gap is acceptable (e.g., inherent platform characteristic, consumer scope)
3. **Compensating controls**: Documented patterns or procedures that close the gap
4. **OQ verification**: A specific OQ test that verifies the gap is a known, tested behavior

### Shallow Freeze Gap Pattern

A common ALCOA+ gap across `@hex-di` libraries: `Object.freeze()` is **shallow** — it freezes the object shell but not nested objects. In GxP contexts where nested data must also be immutable:

**Recommended Pattern — Deep Freeze Wrapper**:

```typescript
function deepFreeze<T>(obj: T): T {
  if (obj !== null && typeof obj === "object" && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const value of Object.values(obj)) {
      deepFreeze(value);
    }
  }
  return obj;
}
```

**Risk acceptance**: Shallow freeze is an inherent JavaScript language characteristic (ECMA-262 §20.1.2.6), not a library defect. The library freezes what it owns; consumers must freeze what they own.

---

## Data Retention Periods by Domain

The following retention periods are common across all `@hex-di` packages. Per-package compliance documents reference this table.

| Domain | Minimum Retention | Regulatory Basis |
|--------|-------------------|------------------|
| Batch manufacturing records | 1 year past product expiry or 5 years (whichever is longer) | 21 CFR 211.180(a) |
| Clinical trial data | 15 years (EU) / 2 years post-approval (FDA) | ICH E6(R2) 4.9.5 |
| QC laboratory test results | Per site retention schedule, typically 5-10 years | EU GMP Chapter 6 |
| Pharmacovigilance records | 10 years post-marketing authorization | EU PV Legislation |
| Medical device records | Lifetime of device + 5 years | 21 CFR 820.180 |
| EU GMP Annex 11 electronic records | 5 years or as defined by national legislation | EU GMP Annex 11 §17 |

```
REQUIREMENT: When a deployment is subject to multiple regulatory frameworks with
             different retention periods (e.g., a combination pharmaceutical/medical
             device product), the longest applicable retention period MUST govern.
             Organizations MUST document their retention period selection rationale in
             the computerized system validation plan.
```
