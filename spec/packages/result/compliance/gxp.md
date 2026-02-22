# GxP Compliance

Mapping of `@hex-di/result` guarantees to GxP regulatory requirements. This document serves as a compliance reference for organizations using the library in FDA 21 CFR Part 11, EU GMP Annex 11, GAMP 5, and ALCOA+ regulated environments.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-GXP-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- compliance/gxp.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- compliance/gxp.md` |
| Last Reviewed | See [Review History](../process/ci-maintenance.md#review-history) |
| Approval Evidence | PR merge to `main` — `git log --merges --first-parent main -- compliance/gxp.md` |
| Full Revision History | `git log --follow --format="%H %ai %an: %s" -- compliance/gxp.md` |

> **Auditor note**: This document is version-controlled via Git per the [Document Version Control Policy](../process/document-control-policy.md). The fields above provide pointers to the Git-managed metadata rather than duplicating it inline. For printed or exported copies, the Git commands above should be executed and their output attached as an appendix to ensure approval evidence is available without repository access.

> **Related process documents**: [Change Control Procedure](../process/change-control.md) | [Document Control Policy](../process/document-control-policy.md) | [Requirement ID Scheme](../process/requirement-id-scheme.md) | [Risk Assessment](../risk-assessment.md) | [Traceability Matrix](../traceability.md)

## GAMP 5 Classification

| Usage | Category | Validation Burden |
|-------|----------|-------------------|
| Consumed as-is from npm | **Category 3** (non-configured COTS) | Verify installation, confirm version, test intended use |
| Forked or modified | **Category 5** (custom application) | Full lifecycle: all specification levels, complete testing |
| Used as dependency in a validated system | **Category 3** within the parent system's validation | Document version, verify behavior in system context |

### Category 3 Justification

When consumed from npm without modification:
- The library has no configuration — behavior is fixed by the source code
- All public APIs are documented in behavior specifications (01–14)
- Runtime invariants (INV-1 through INV-14) are formally specified
- 13 Architecture Decision Records document design rationale
- The library has zero production dependencies, minimizing supply chain risk

## ALCOA+ Compliance Mapping

### How Library Features Support Each Principle

| Principle | Library Feature | Specification Reference | Compliance Mechanism |
|-----------|----------------|------------------------|----------------------|
| **Attributable** | Explicit `Result<T, E>` return types | [01-types-and-guards.md](../behaviors/01-types-and-guards.md) | Every function that can fail declares its error type in the signature — the origin of every error is traceable through the type system |
| **Legible** | `toJSON()` serialization | [04-extraction.md](../behaviors/04-extraction.md#beh-04-010-toJSON) | Results serialize to clear `{ _tag: "Ok", value }` or `{ _tag: "Err", error }` — human-readable, machine-parseable |
| **Contemporaneous** | Errors captured at point of occurrence | [02-creation.md](../behaviors/02-creation.md) | `tryCatch()`, `fromThrowable()`, `fromPromise()` capture errors immediately — no deferred or batched error recording |
| **Original** | `Object.freeze()` immutability | [INV-1](../invariants.md#inv-1-frozen-result-instances), [ADR-004](../decisions/004-object-freeze-immutability.md) | Once created, a Result cannot be modified — the original value/error is preserved |
| **Accurate** | Brand validation prevents forgery | [INV-3](../invariants.md#inv-3-brand-symbol-prevents-forgery), [ADR-002](../decisions/002-brand-symbol-validation.md) | Only genuine Results pass `isResult()` — structurally similar fakes are rejected |
| **Complete** | No silent error swallowing | Design philosophy #1 | Errors are values that must be handled explicitly — `andThen` chains short-circuit, `match` requires both branches |
| **Consistent** | Deterministic behavior | All behavior specs | Every method has a single, documented behavior per variant (Ok/Err) — no non-determinism |
| **Enduring** | `toJSON()`/`fromJSON()` round-trip | [13-interop.md](../behaviors/13-interop.md) | Results can be serialized for long-term storage and deserialized back to branded, frozen instances |
| **Available** | Type-safe extraction | [04-extraction.md](../behaviors/04-extraction.md) | Multiple extraction methods (`match`, `unwrapOr`, `toNullable`, `intoTuple`) ensure data is always accessible |

### ALCOA+ Gap: Shallow Freeze

`Object.freeze()` is **shallow** — it freezes the Result shell but not the contained `value` or `error` objects. In GxP contexts where nested data must also be immutable:

**Recommended Pattern — Deep Freeze Wrapper**:

```typescript
import { ok, err, type Result } from "@hex-di/result";

function deepFreeze<T>(obj: T): T {
  if (obj !== null && typeof obj === "object" && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const value of Object.values(obj)) {
      deepFreeze(value);
    }
  }
  return obj;
}

// GxP usage: deep-freeze the value before wrapping
function okGxP<T>(value: T): Result<T, never> {
  return ok(deepFreeze(value));
}

function errGxP<E>(error: E): Result<never, E> {
  return err(deepFreeze(error));
}
```

This ensures both the Result shell and its contents are immutable, satisfying ALCOA+ "Original" for nested data structures.

#### Risk Acceptance: Shallow Freeze

**Risk**: Nested objects inside `ok(value)` or `err(error)` can be mutated after Result creation, potentially violating ALCOA+ "Original" for compound data.

**Acceptance rationale**:

1. **Inherent language characteristic**: `Object.freeze()` is shallow by JavaScript language specification (ECMA-262 §20.1.2.6). This is not a library defect — it is a platform constraint shared by every JavaScript library that uses `Object.freeze()`
2. **Consumer responsibility**: The library's GAMP 5 Category 3 classification means consumers are responsible for the integrity of their contained values. The library freezes what it owns (the Result shell); consumers must freeze what they own (the nested data)
3. **Documented compensating controls**: The deep freeze wrapper pattern (above) and the development-mode detection wrapper (below) provide concrete mitigation. GxP consumers who follow these patterns achieve full ALCOA+ "Original" compliance
4. **OQ verification**: OQ-011 explicitly verifies that shallow freeze is a known, tested behavior — not an untested assumption

**Residual risk**: Accepted. The risk is mitigated by documented patterns (deep freeze wrapper, `okChecked`/`errChecked` development-mode detection) and verified by OQ-011 (known limitation verification).

### Defense-in-Depth: Shallow Freeze Detection

As an additional safeguard, GxP consumers can adopt an opt-in development-mode wrapper that detects when a non-frozen value is passed to `ok()` or `err()`. This is a **consumer-side pattern** — the library itself does not enforce deep freeze (see [ADR-004](../decisions/004-object-freeze-immutability.md) for rationale).

```typescript
import { ok, err, type Result } from "@hex-di/result";

function okChecked<T>(value: T): Result<T, never> {
  if (
    process.env.NODE_ENV !== "production" &&
    value !== null &&
    typeof value === "object" &&
    !Object.isFrozen(value)
  ) {
    console.warn(
      "[GxP] okChecked: value is not frozen. In GxP contexts, deep-freeze " +
        "nested data before wrapping. See ALCOA+ Gap: Shallow Freeze.",
    );
  }
  return ok(value);
}

function errChecked<E>(error: E): Result<never, E> {
  if (
    process.env.NODE_ENV !== "production" &&
    error !== null &&
    typeof error === "object" &&
    !Object.isFrozen(error)
  ) {
    console.warn(
      "[GxP] errChecked: error is not frozen. In GxP contexts, deep-freeze " +
        "nested data before wrapping. See ALCOA+ Gap: Shallow Freeze.",
    );
  }
  return err(error);
}
```

**Design decisions**:
- **Warning, not error**: A `console.warn` is used rather than throwing, because the shallow freeze is a known library characteristic — not a defect. The warning alerts developers during development without breaking production code.
- **Development-mode only**: The `NODE_ENV` check ensures zero overhead in production builds.
- **Consumer-side**: This pattern is implemented in the consuming application, not in the library, preserving the library's zero-configuration Category 3 classification.

## 21 CFR Part 11 Mapping

### Applicable Sections

| Section | Requirement | Library Feature | Status | Notes |
|---------|-------------|----------------|--------|-------|
| 11.10(a) | Validation | Formal specifications + invariants | **Supported** | Spec files provide validation documentation basis |
| 11.10(b) | Accurate copies | `toJSON()`/`fromJSON()` round-trip | **Supported** | Round-trip guarantee per [13-interop.md](../behaviors/13-interop.md). **Caveat**: `structuredClone()`/`postMessage()` produce non-compliant copies — see [DRR-3](#structuredclone-warning). Only the `toJSON()`/`fromJSON()` path preserves brand and immutability |
| 11.10(c) | Record retention | Serialization to JSON | **Supported** | See [Data Retention Guidance](#data-retention-guidance) below |
| 11.10(d) | System access | Brand-based validation | **Partially Supported** | `isResult()` prevents forged Results; application-level access control is the consumer's responsibility |
| 11.10(e) | Audit trails | Explicit error propagation | **Enabled** | The library provides error traceability primitives and normative audit trail requirements ([ATR-1, ATR-2, ATR-3](#normative-requirements)); audit trail generation is the consumer's responsibility. See [Audit Trail Requirements](#audit-trail-requirements) |
| 11.10(f) | Operational checks | `assertNever()`, exhaustiveness | **Supported** | Compile-time and runtime exhaustiveness per [08-error-patterns.md](../behaviors/08-error-patterns.md) |
| 11.10(g) | Authority checks | N/A | **Not Applicable** | Authorization is the consumer's responsibility |
| 11.10(h) | Device checks | N/A | **Not Applicable** | I/O device verification is outside the scope of a utility library |
| 11.10(i) | Training | Training Guidance with competency assessment | **Supported** | See [Training Guidance](#training-guidance); consumer executes training per their QMS |
| 11.10(j) | Accountability | Git-based document control | **Supported** | Per-line attribution via `git blame`; PR-based approval workflow; see [Document Version Control Policy](../process/ci-maintenance.md#document-version-control-policy) |
| 11.50 | Signature manifestation | N/A | **Not Applicable** | Electronic signatures are outside library scope |
| 11.70 | Signature/record linking | N/A | **Not Applicable** | |
| 11.100 | General e-signature | N/A | **Not Applicable** | |

### Sections Not Applicable

21 CFR Part 11 Sections 11.10(g) (authority checks), 11.10(h) (device checks), 11.10(k) (controls for open systems), 11.50, 11.70, 11.100, 11.200, and 11.300 address electronic signatures, user authentication, device verification, and open system controls. These are application-level concerns — the library provides data integrity primitives, not identity management, I/O device verification, or network transmission. Section 11.10(k) specifically addresses encryption and digital signatures for records transmitted via open networks; the library performs no network I/O, transmits no records, and has no open system interfaces. Sections 11.10(i) (training) and 11.10(j) (accountability) are addressed in the mapping table above as **Supported** via [Training Guidance](#training-guidance) and Git-based document control respectively.

### Configuration Specification (CS) — Consumer Responsibility

The library has no configurable parameters — behavior is fixed by the source code (GAMP 5 Category 3). No library-level Configuration Specification exists. GxP consumers must document the validated library version and any integration configuration (e.g., deep-freeze wrappers, audit logging patterns) in their own system-level Configuration Specification.

#### Consumer CS Template

The following template lists the minimum fields a consumer should document in their system-level Configuration Specification when integrating `@hex-di/result`:

| Field | Example Value | Notes |
|-------|---------------|-------|
| Library name | `@hex-di/result` | npm package name |
| Validated version | `1.2.3` | Exact version (no caret/tilde); matches `package.json` and lock file |
| Lock file committed | Yes / No | `pnpm-lock.yaml` or `package-lock.json` must be committed |
| GAMP 5 category | Category 3 (non-configured COTS) | Category 5 if source code has been modified |
| Deep-freeze wrapper adopted | Yes / No | If Yes, reference the wrapper implementation file and the [ALCOA+ Gap: Shallow Freeze](#alcoa-gap-shallow-freeze) pattern |
| Audit logging method | `inspect()` / `inspectErr()` / `andThrough()` | Must not be `andTee()` or `orTee()` per [ATR-1](#normative-requirements) |
| ESLint ATR-1 rule enabled | Yes / No | Reference the [no-restricted-syntax configuration](#1-eslint-no-restricted-syntax-rule) or `eslint-plugin-hex-result` when available |
| Serialization boundary pattern | `toJSON()`/`fromJSON()` | Confirm `structuredClone` is not used per [DRR-3](#structuredclone-warning) |
| Storage envelope schema version | `1` | Per [Recommended Storage Envelope](#recommended-storage-envelope) |
| IQ execution date | _YYYY-MM-DD_ | Date of last [IQ](#installation-qualification-iq-checklist) execution |
| OQ execution date | _YYYY-MM-DD_ | Date of last [OQ](#operational-qualification-oq-test-scripts) execution |
| PQ execution date | _YYYY-MM-DD_ | Date of last [PQ](#performance-qualification-pq-scenarios) execution |

> **Scope**: This template covers the library integration configuration only. The consumer's full system-level CS will include additional fields for other components, infrastructure, and application-specific configuration per their QMS.

## EU GMP Annex 11 Mapping

| Section | Topic | Library Feature | Status | Notes |
|---------|-------|----------------|--------|-------|
| 1 | Risk Management | ADRs with trade-off analysis | **Supported** | 13 ADRs document risk decisions per ICH Q9 approach |
| 4 | Validation | Formal specifications | **Supported** | 14 behavior specs, 14 invariants, type-system specs |
| 5 | Data | Explicit error-as-value flow | **Supported** | `Result<T, E>` makes data flow traceable |
| 6 | Accuracy Checks | Type-safe validation | **Supported** | Input validation via `fromPredicate()`, `fromNullable()`, type guards. Transformation accuracy preserved by immutability (INV-1 — each `map`/`andThen`/`mapBoth` produces a new frozen Result) and comprehensive test coverage (BEH-03-001 through BEH-03-021) |
| 7 | Data Storage | `toJSON()`/`fromJSON()` | **Enabled** | The library provides serialization primitives for durable storage; the consumer application is responsible for actual data storage, backup, and retrieval. See [Data Retention Guidance](#data-retention-guidance) |
| 9 | Audit Trails | Error traceability | **Supported** | See [Audit Trail Requirements](#audit-trail-requirements) |
| 10 | Change Control | Conventional commits + changesets | **Supported** | Per [ci-maintenance.md](../process/ci-maintenance.md) |
| 11 | Periodic Review | Nightly TS canary + CI matrix | **Supported** | Continuous compatibility verification |
| 13 | Incident Management | Structured error patterns | **Supported** | `createError()`, `createErrorGroup()` with `const` type parameters (literal types, readonly fields), `UnwrapError` |
| 12 | Security | Physical and logical security | **Not Applicable** | Physical security (data center access, hardware protection) is outside the scope of a software library. The library provides **data integrity controls** — brand-based validation ([INV-3](../invariants.md#inv-3-brand-symbol-prevents-forgery)) and immutability ([INV-1](../invariants.md#inv-1-frozen-result-instances)) — that complement application-level security but do not replace it. These controls prevent data forgery and mutation, not unauthorized access. Authentication, authorization, encryption, and access control remain the consumer's responsibility |
| 16 | Business Continuity | Availability measures for business continuity | **Not Applicable** | Business continuity (failover, redundancy, disaster recovery) is an infrastructure and application concern. The library is a stateless, deterministic function library with no I/O, no persistent state, and no runtime services — there is nothing to fail over. Consumers must address business continuity in their own system-level disaster recovery plans |
| 17 | Archiving | JSON serialization | **Supported** | See [Data Retention Guidance](#data-retention-guidance) |
| 2 | Personnel | Training Guidance with competency assessment | **Supported** | See [Training Guidance](#training-guidance); consumer executes training per their QMS |
| 3 | Suppliers and Service Providers | Supplier Assessment Guidance | **Supported** | See [Supplier Assessment Guidance](#supplier-assessment-guidance); open-source equivalence table addresses Annex 11.3 |
| 8 | Printouts | N/A | **Not Applicable** | The library produces no printouts or reports; report formatting and print output are the consumer application's responsibility |
| 14 | Electronic Signatures | N/A | **Not Applicable** | Consistent with 21 CFR 11.50 treatment — electronic signatures are outside the scope of a utility library |
| 15 | Batch Release | N/A | **Not Applicable** | Batch release is a manufacturing process concern outside the scope of a utility library |

## Data Retention Guidance

**DRR-1**: When using `@hex-di/result` in systems subject to regulatory data retention requirements, the serialized form (`toJSON()` output) MUST be stored for the applicable retention period.

### Retention Periods by Domain

| Domain | Minimum Retention | Regulatory Basis |
|--------|-------------------|------------------|
| Batch manufacturing records | 1 year past product expiry or 5 years (whichever is longer) | 21 CFR 211.180(a) |
| Clinical trial data | 15 years (EU) / 2 years post-approval (FDA) | ICH E6(R2) 4.9.5 |
| QC laboratory test results | Per site retention schedule, typically 5–10 years | EU GMP Chapter 6 |
| Pharmacovigilance records | 10 years post-marketing authorization | EU PV Legislation |
| Medical device records | Lifetime of device + 5 years | 21 CFR 820.180 |

### Serialization for Retention

```typescript
import { ok, err, fromJSON, type Result } from "@hex-di/result";

// Serialize for storage
const result = validateBatchRecord(input);
const record = {
  timestamp: new Date().toISOString(),  // Contemporaneous
  userId: session.userId,                // Attributable
  operation: "batch_validation",
  result: result.toJSON(),               // Original data preserved
};
await auditStore.write(record);

// Restore from storage (years later)
const stored = await auditStore.read(recordId);
const restored = fromJSON(stored.result);  // Branded, frozen Result
```

### Format Versioning for Long-Term Retention

Archived Result data may need to be deserialized years after storage. To ensure ALCOA+ "Available" and "Enduring" across library major versions:

#### Serialization Schema (v1.0.0)

```typescript
// Ok variant
{ "_tag": "Ok", "_schemaVersion": 1, "value": T }

// Err variant
{ "_tag": "Err", "_schemaVersion": 1, "error": E }

// Some variant
{ "_tag": "Some", "_schemaVersion": 1, "value": T }

// None variant
{ "_tag": "None", "_schemaVersion": 1 }
```

This schema is the contract for `toJSON()` output on both Result and Option types. `fromJSON()` and `fromOptionJSON()` accept both the versioned format (with `_schemaVersion`) and the legacy format (without `_schemaVersion`) for backward compatibility.

#### Backward Compatibility Commitment

1. **DRR-2**: **`fromJSON()` will accept all prior schema versions** — If a future major version changes the serialization schema, `fromJSON()` will continue to accept the prior format and migrate transparently
2. **Schema changes are breaking changes** — Any modification to the `toJSON()` output format will be flagged as a breaking change per the [Deprecation Policy](#deprecation-policy), with a minimum 6-month deprecation period
3. **Migration utilities provided** — If the schema changes, a `migrateJSON(old)` function will be published to convert archived records to the new format

#### DRR-2 Regression Testing

The library's own test suite verifies backward compatibility of `fromJSON()` across schema versions using a fixture-based approach:

1. **Schema fixture file**: A dedicated test fixture file (`src/core/__fixtures__/schema-versions.json`) contains serialized Result and Option objects in every historical schema format. Each entry records the schema version, the serialized JSON, and the expected deserialized value/error:

    ```json
    [
      {
        "schemaVersion": 1,
        "description": "v1.0.0 Ok — with _schemaVersion field",
        "json": { "_tag": "Ok", "_schemaVersion": 1, "value": 42 },
        "expectedTag": "Ok",
        "expectedPayload": 42
      },
      {
        "schemaVersion": 1,
        "description": "v1.0.0 Err — with _schemaVersion field",
        "json": { "_tag": "Err", "_schemaVersion": 1, "error": "fail" },
        "expectedTag": "Err",
        "expectedPayload": "fail"
      },
      {
        "schemaVersion": 0,
        "description": "Legacy Ok — no _schemaVersion field",
        "json": { "_tag": "Ok", "value": 42 },
        "expectedTag": "Ok",
        "expectedPayload": 42
      },
      {
        "schemaVersion": 0,
        "description": "Legacy Err — no _schemaVersion field",
        "json": { "_tag": "Err", "error": "fail" },
        "expectedTag": "Err",
        "expectedPayload": "fail"
      },
      {
        "schemaVersion": 1,
        "description": "v1.0.0 Some — Option serialization",
        "json": { "_tag": "Some", "_schemaVersion": 1, "value": "hello" },
        "expectedTag": "Some",
        "expectedPayload": "hello"
      },
      {
        "schemaVersion": 1,
        "description": "v1.0.0 None — Option serialization",
        "json": { "_tag": "None", "_schemaVersion": 1 },
        "expectedTag": "None",
        "expectedPayload": null
      }
    ]
    ```

2. **Regression test**: A unit test (`src/core/from-json-compat.test.ts`) iterates over every fixture entry, calls `fromJSON()`, and verifies:
    - `isResult(restored)` returns `true` (brand present)
    - `Object.isFrozen(restored)` returns `true` (immutability preserved)
    - The restored value/error matches `expectedPayload` via deep equality
    - The restored `_tag` matches `expectedTag`

3. **Fixture maintenance rule**: Before any schema format change, the current format **must** be added to the fixture file as a new entry. The fixture file is append-only — entries are never removed or modified, ensuring that all historical formats remain tested. The v1.0.0 fixture file includes both the initial `_schemaVersion: 1` format and the legacy format (without `_schemaVersion`) to verify backward compatibility from the first release.

4. **CI enforcement**: The `from-json-compat.test.ts` test runs as part of the standard unit test suite (CI Job 3) and blocks PRs on failure.

#### Migration Verification Procedures

When upgrading across major versions that change the serialization schema, the following verification procedures ensure ALCOA+ "Available" and "Accurate" for archived data:

**Pre-Migration Verification**:

1. **Inventory**: Enumerate all stored Result records subject to regulatory retention, grouped by `schemaVersion`
2. **Sample selection**: Select a statistically representative sample from each `schemaVersion` cohort. As a minimum baseline: 1% of records or 100 records, whichever is greater — this provides ≥95% confidence of detecting a ≥3% defect rate in populations over 3,300 records (per binomial sampling theory; see ANSI/ASQ Z1.4 for formal AQL-based sampling tables). Organizations with existing validated sampling SOPs should use those instead, provided the confidence level is ≥95%
3. **Baseline snapshot**: For each sample record, deserialize with the **current** (pre-upgrade) `fromJSON()` and capture the output as the expected baseline

**Migration Execution**:

1. **Schema migration**: Apply `migrateJSON(old)` (published with the new major version) to all archived records
2. **Idempotency check**: Apply `migrateJSON()` a second time to each migrated record; verify the output is identical to the first application (`JSON.stringify` comparison)
3. **Round-trip verification**: For each migrated record, call `toJSON(fromJSON(migratedRecord))` and verify the output matches the migrated record exactly

**Post-Migration Verification**:

1. **Sample comparison**: Deserialize the same sample records selected in pre-migration with the **new** `fromJSON()`. Compare the logical content (`.value` or `.error`) against the pre-migration baseline — values must be identical
2. **Brand validation**: Verify all restored sample records pass `isResult()` with the new library version
3. **Immutability**: Verify all restored sample records are `Object.isFrozen()` === `true`
4. **Count reconciliation**: Confirm the total number of migrated records equals the total number of source records (no records lost or duplicated)
5. **Error records**: Any record that fails migration must be quarantined, documented with the failure reason, and reported to QA for investigation per ICH Q9 incident management

**Documentation Requirements**:

| Artifact | Retention | Content |
|----------|-----------|---------|
| Migration execution log | Same as source data retention period | Timestamp, operator, source/target schema versions, record counts, pass/fail summary |
| Sample comparison report | Same as source data retention period | Per-record baseline vs. post-migration comparison results |
| Error quarantine report | Same as source data retention period + investigation closure | Failed record IDs, failure reasons, remediation actions |

#### Recommended Storage Envelope

Consumers storing Results for regulatory retention should include a schema version in the storage record:

```typescript
const record = {
  schemaVersion: 1,                    // Increment if toJSON format changes
  libraryVersion: "1.2.3",             // Exact @hex-di/result version
  timestamp: new Date().toISOString(),
  userId: session.userId,
  operation: "batch_validation",
  result: result.toJSON(),
};
await auditStore.write(record);
```

This enables future deserialization code to select the correct `fromJSON` implementation based on the `schemaVersion` field, even if the library has been upgraded.

### structuredClone Warning

`structuredClone()` and `postMessage()` **strip brand symbols and method closures** from `Result` and `Option` instances. A cloned Result or Option:
- Fails `isResult()` / `isOption()` (brand symbol lost)
- Has no methods (closures not cloneable)

**DRR-3**: In GxP contexts, `Result` and `Option` instances MUST be serialized via `toJSON()` before crossing serialization boundaries, and restored via `fromJSON()` afterward. An unbranded Result or Option cannot be validated as genuine — this is not optional. This applies equally to `Option` types (`some()`, `none()`) which carry `OPTION_BRAND` ([INV-11](../invariants.md#inv-11-option-brand-prevents-forgery)) and are frozen ([INV-10](../invariants.md#inv-10-frozen-option-instances)) — both properties are stripped by the structured clone algorithm.

### Option Serialization for Data Retention

**DRR-4**: The `Option<T>` type provides native `toJSON()` and `fromOptionJSON()` methods for serialization. GxP consumers can serialize Option values directly for regulatory retention.

**Native serialization pattern**:

```typescript
import { some, none, fromOptionJSON, isOption, type Option } from "@hex-di/result";

// Serialize: Option → JSON
const signature: Option<string> = none();
const record = {
  timestamp: new Date().toISOString(),
  userId: session.userId,
  reviewSignature: signature.toJSON(),  // { _tag: "None", _schemaVersion: 1 }
};
await auditStore.write(record);

// Deserialize: JSON → Option
const stored = await auditStore.read(recordId);
const restored = fromOptionJSON(stored.reviewSignature);  // Branded, frozen Option
isOption(restored); // true
```

**Alternative pattern — Result wrapping (backward compatibility)**:

For existing data stores that use the `Ok`/`Err` envelope for Option values, the Result wrapping patterns remain valid:

```typescript
import { ok, err, fromJSON, type Option, type Result } from "@hex-di/result";

// Serialize: Option → Result → JSON
function serializeOption<T>(opt: Option<T>): ReturnType<Result<T, "none">["toJSON"]> {
  return opt.match(
    (value) => ok(value).toJSON(),
    () => err("none" as const).toJSON(),
  );
}

// Deserialize: JSON → Result → Option
function deserializeOption<T>(json: { _tag: string; value?: T; error?: string }): Option<T> {
  const result = fromJSON(json);
  return result.toOption();
}
```

**Rationale**: Native `toJSON()`/`fromOptionJSON()` on the Option type provides direct ALCOA+ "Enduring" and "Available" support for Option values. The `_schemaVersion` field enables long-term archive compatibility. The Result wrapping pattern is preserved as an alternative for backward compatibility with existing data stores.

### Periodic Readability Verification for Archived Data

**DRR-5**: GxP consumers MUST perform periodic readability verification of archived Result and Option data when the applicable retention period is 5 years or longer, or when the data is classified as High-risk per the consumer's quality management system. For data with retention periods shorter than 5 years and classified as Low or Medium risk, periodic readability verification SHOULD be performed. In both cases, verification must satisfy ALCOA+ "Available" and "Enduring" compliance throughout the retention period. At a minimum:

1. **Sample selection**: Select a representative sample of archived records from each storage cohort (grouped by `schemaVersion` and archive date). A minimum of 1% of records or 20 records per cohort, whichever is greater, provides reasonable confidence
2. **Deserialization verification**: For each sample record, call `fromJSON()` (for Result data) or `fromOptionJSON()` (for Option data) and verify:
   - The function returns without error
   - `isResult(restored)` or `isOption(restored)` returns `true` (brand intact)
   - `Object.isFrozen(restored)` returns `true` (immutability intact)
   - The restored value/error matches the original via deep equality
3. **Cadence**: Annually or upon library version upgrade, whichever is more frequent. Organizations with retention periods exceeding 10 years should consider semi-annual verification
4. **Documentation**: Record the verification outcome in the consumer's quality management system, including: verification date, tester, library version used for deserialization, sample size per cohort, pass/fail count, and any failures with root cause analysis

**Rationale**: DRR-2 ensures backward compatibility of `fromJSON()` across schema versions, and the DRR-2 regression test suite verifies this at the library level. However, archived data stored in consumer systems may be affected by storage-level issues (encoding drift, storage corruption, filesystem migration) that are outside the library's test scope. Periodic readability verification confirms end-to-end data availability from the consumer's actual storage infrastructure. This requirement addresses MHRA GxP Data Integrity Guidance §6.12 (periodic verification of data accessibility) and PIC/S PI 041 §9.4 (data availability throughout the retention period).

> **Cross-reference**: Data retention requirements use the **DRR-N** scheme (DRR-1, DRR-2, DRR-3, DRR-4, DRR-5). Audit trail requirements use the **ATR-N** scheme (ATR-1, ATR-2, ATR-3). Both schemes are referenced in the [Requirement Identification Convention](#requirement-identification-convention).

## Audit Trail Requirements

### Normative Requirements

The following requirements apply to any GxP-regulated system using `@hex-di/result`. These are **mandatory** constraints, not optional patterns. Violation constitutes a compliance gap per 21 CFR 11.10(e).

**ATR-1**: In GxP-regulated code, `andTee()` and `orTee()` MUST NOT be used for audit-critical side effects (audit log writes, regulatory record-keeping, GxP event logging). Both methods suppress all exceptions thrown by their callbacks ([INV-5](../invariants.md#inv-5-error-suppression-in-tee-operations)). A failed audit log write is a critical event per 21 CFR 11.10(e) — silent suppression of such failures is a compliance violation. This applies equally to Ok-path audit logging (`andTee`) and Err-path audit logging (`orTee`).

**ATR-2**: Audit-critical side effects MUST use one of the following methods:
- `inspect(f)` / `inspectErr(f)` — exception propagates to the caller, ensuring audit failure is never silent
- `andThrough(f)` — failure is captured as a typed `Err`, enabling Result-based error handling in the audit path

**ATR-3**: `andTee(f)` and `orTee(f)` are permitted ONLY for non-critical, best-effort side effects (telemetry, debug logging, performance metrics) where silent failure is acceptable and has no regulatory impact.

| Method | Exception Behavior | GxP Requirement |
|--------|-------------------|-----------------|
| `andTee(f)` | **Suppresses** exceptions from `f` | **PROHIBITED** for audit-critical operations (21 CFR 11.10(e)) |
| `orTee(f)` | **Suppresses** exceptions from `f` | **PROHIBITED** for audit-critical operations (21 CFR 11.10(e)) |
| `inspect(f)` | **Propagates** exceptions from `f` | **REQUIRED** for Ok-path audit-critical logging |
| `inspectErr(f)` | **Propagates** exceptions from `f` | **REQUIRED** for Err-path audit-critical logging |
| `andThrough(f)` | Propagates `Err` from `f` | **REQUIRED** for Result-based audit validation |

```typescript
// VIOLATION of ATR-1 — Ok-path audit failure is silently swallowed
result.andTee(value => auditLog.write(value));

// VIOLATION of ATR-1 — Err-path audit failure is silently swallowed
result.orTee(error => auditLog.writeError(error));

// Compliant with ATR-2 — Ok-path audit failure propagates as an exception
result.inspect(value => auditLog.write(value));

// Compliant with ATR-2 — Err-path audit failure propagates as an exception
result.inspectErr(error => auditLog.writeError(error));

// Compliant with ATR-2 — audit failure propagates as a Result error (preferred)
result.andThrough(value =>
  tryCatch(() => auditLog.write(value), () => "audit_write_failed" as const)
);
```

### Interim Compensating Controls

Until a dedicated `eslint-plugin-hex-result` is available, the following compensating controls mitigate the risk of `andTee()`/`orTee()` misuse in GxP-annotated modules:

#### 1. ESLint `no-restricted-syntax` Rule

Add the following to the project's ESLint configuration to flag `andTee()` and `orTee()` calls in GxP-critical code:

```javascript
// eslint.config.js (flat config)
export default [
  {
    files: ["src/gxp/**/*.ts", "src/**/*.gxp.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='andTee']",
          message:
            "ATR-1: andTee() is prohibited in GxP-critical code. " +
            "Use inspect() or andThrough() for audit-critical side effects. " +
            "See spec/result/compliance/gxp.md#normative-requirements.",
        },
        {
          selector: "CallExpression[callee.property.name='orTee']",
          message:
            "ATR-1: orTee() is prohibited in GxP-critical code. " +
            "Use inspectErr() or andThrough() for audit-critical side effects. " +
            "See spec/result/compliance/gxp.md#normative-requirements.",
        },
      ],
    },
  },
];
```

#### 2. PR Review Checklist Item

All pull requests modifying GxP-annotated modules must include the following review checkpoint:

- [ ] **ATR-1 verification**: No `andTee()` or `orTee()` calls used for audit-critical side effects. All audit logging uses `inspect()`, `inspectErr()`, or `andThrough()`.

#### 3. CI Blocking Check

A grep-based blocking check enforces ATR-1 in CI. This check **fails the build** if `andTee()` or `orTee()` is found in GxP-annotated files:

```bash
# CI gate: fail if andTee or orTee appears in GxP-annotated files
if grep -rn -E '\.(andTee|orTee)\(' src/gxp/ src/**/*.gxp.ts 2>/dev/null; then
  echo "ERROR: andTee()/orTee() found in GxP-annotated files. This violates ATR-1."
  echo "Use inspect()/inspectErr() or andThrough() for audit-critical side effects."
  echo "See spec/result/compliance/gxp.md#normative-requirements"
  exit 1
fi
```

> **Rationale for blocking**: A non-blocking warning is insufficient for 21 CFR 11.10(e) compliance — a developer could merge code that silently suppresses audit log failures. The grep-based check is syntactic (it cannot distinguish audit-critical from non-critical usage), so it over-approximates: any `andTee()` or `orTee()` in GxP-annotated files is rejected. Developers who need non-critical `andTee()`/`orTee()` in GxP modules should move the non-critical code to a non-GxP module or add an inline justification comment and exclude the specific file from the grep pattern with a documented exemption in the PR description.

**Status**: These controls are interim compensating measures for the v1.0.0 release. They will be superseded by `eslint-plugin-hex-result` (a separate package on its own release timeline; see [roadmap.md ESLint Plugin](../roadmap.md#eslint-plugin)), which will provide semantic analysis (distinguishing audit-critical from non-critical `andTee()`/`orTee()` usage) rather than syntactic pattern matching.

### Recommended Patterns

The library does not generate audit trail entries itself — that is the consumer application's responsibility. The following patterns demonstrate how the Result type naturally supports audit trail construction.

#### Pattern 1: Result-Based Audit Decorator

```typescript
import { ok, err, type Result } from "@hex-di/result";

interface AuditEntry {
  timestamp: string;
  userId: string;
  operation: string;
  input: unknown;
  outcome: "success" | "failure";
  detail: unknown;
}

function audited<A extends unknown[], T, E>(
  operation: string,
  fn: (...args: A) => Result<T, E>,
  auditLog: (entry: AuditEntry) => void,
  getUserId: () => string,
): (...args: A) => Result<T, E> {
  return (...args: A) => {
    const result = fn(...args);
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      userId: getUserId(),
      operation,
      input: args,
      outcome: result.isOk() ? "success" : "failure",
      detail: result.toJSON(),
    };
    auditLog(entry);  // ATR-2: use inspect() or andThrough() if auditLog can fail
    return result;
  };
}
```

#### Pattern 2: Error Chain Traceability

```typescript
// Each step in an andThen chain produces a traceable error
const result = parseInput(raw)
  .andThen(validate)        // Err → "validation_error" (traceable to validate)
  .andThen(transform)       // Err → "transform_error" (traceable to transform)
  .andThen(persist);         // Err → "persist_error" (traceable to persist)

// The error type is: "parse_error" | "validation_error" | "transform_error" | "persist_error"
// Each error value identifies exactly which step failed — no stack trace parsing needed
```

## Error Severity Classification

For GxP systems that require risk-based error categorization per ICH Q9:

### Pattern: Severity-Tagged Error Groups

Both `createError` and `createErrorGroup` use `const` type parameters (TypeScript 5.0+), so all field values — including severity strings — are inferred as **literal types** and **readonly** by default. No `as const` assertion is needed at call sites. See [08-error-patterns.md](../behaviors/08-error-patterns.md) for full type signatures.

```typescript
import { createErrorGroup } from "@hex-di/result";

// Create error group with severity metadata
const BatchError = createErrorGroup("BatchError");

// Critical: affects patient safety or data integrity
const CriticalBatchError = BatchError.create("critical_deviation");
// Major: affects product quality but not safety
const MajorBatchError = BatchError.create("out_of_spec");
// Minor: documentation or process deviation
const MinorBatchError = BatchError.create("documentation_gap");

// Usage in validation pipeline
function validateBatch(batch: Batch): Result<Batch, BatchErrorType> {
  if (batch.sterility === "fail")
    return err(CriticalBatchError({ severity: "critical", field: "sterility" }));
    // Inferred: Readonly<{ _namespace: "BatchError"; _tag: "critical_deviation"; readonly severity: "critical"; readonly field: "sterility" }>

  if (batch.potency < 95)
    return err(MajorBatchError({ severity: "major", field: "potency", value: batch.potency }));

  if (!batch.reviewedBy)
    return err(MinorBatchError({ severity: "minor", field: "reviewedBy" }));

  return ok(batch);
}
```

### Severity-to-Action Mapping

| Severity | Action Required | Regulatory Basis |
|----------|----------------|------------------|
| Critical | Halt process, notify QA immediately, initiate CAPA | ICH Q9 High Risk |
| Major | Document deviation, QA review within 24h | ICH Q9 Medium Risk |
| Minor | Log for periodic review | ICH Q9 Low Risk |

## Risk Assessment Methodology

> **Standalone document**: The risk assessment is also maintained as a standalone document at [risk-assessment.md](../risk-assessment.md) for structural parity with the `result-react` specification suite. Both documents contain the same assessment data — this inline version provides GxP context, while the standalone version follows the FMEA format used across all packages. When updating risk classifications, update both locations.

### Approach

Invariant risk levels are assigned using a simplified risk assessment aligned with ICH Q9 (Quality Risk Management). Because `@hex-di/result` is a deterministic library with no external I/O, no randomness, and no configuration, **probability of occurrence** is not a meaningful variable — a defect in a given invariant either exists in the code or does not. The assessment therefore uses a two-factor model rather than a full FMEA (Failure Mode and Effects Analysis).

> **Auditor note — Why not FMEA?** A full FMEA is disproportionate for a deterministic, stateless, zero-dependency library. FMEA's three-factor model (Severity × Occurrence × Detectability) requires estimating occurrence probability, which is not meaningful here — there are no stochastic failure modes, no environmental variability, and no I/O-dependent behavior. The simplified Severity × Detectability model retains the two factors that are meaningful for code-level defects and is consistent with ICH Q9's principle that "the level of effort, formality, and documentation of the quality risk management process should be commensurate with the level of risk" (ICH Q9 §2).

| Factor | Definition | Scale |
|--------|-----------|-------|
| **Severity** | Impact on data integrity and patient safety if the invariant is violated | Critical / Major / Minor |
| **Detectability** | Likelihood that a violation would be caught by the test suite before release | High / Medium / Low (lower detectability = harder to catch = higher risk) |

### Risk Level Determination

| Severity | Detectability | ICH Q9 Risk Level |
|----------|--------------|-------------------|
| Critical (data integrity / patient safety) | Any | **High** |
| Major (operational reliability) | Medium or Low | **High** |
| Major (operational reliability) | High | **Medium** |
| Minor (developer experience) | Any | **Low** |

### Classification Criteria

| Risk Level | Criteria | Examples |
|------------|----------|---------|
| **High** | Violation directly enables data corruption, forgery, or silent loss of error information. At least one ALCOA+ principle is at risk. | INV-1 (immutability — "Original"), INV-3 (brand — "Accurate"), INV-5 (error suppression — "Complete") |
| **Medium** | Violation affects operational reliability or diagnostic quality but does not directly compromise data integrity. Compensating controls (e.g., downstream validation) may partially mitigate. | INV-2 (promise safety), INV-4 (generator safety), INV-14 (delegation consistency) |
| **Low** | Violation affects developer experience, internal consistency, or type-level ergonomics. No runtime data integrity impact. | INV-6 (phantom types — compile-time only), INV-8 (lazy registration — internal wiring), INV-13 (subpath blocking — API surface control) |

### Per-Invariant Assessment

| Invariant | Severity | Detectability | Risk | Rationale |
|-----------|----------|--------------|------|-----------|
| INV-1 | Critical | High | **High** | Immutability underpins ALCOA+ "Original" — removing `Object.freeze()` allows silent post-creation mutation |
| INV-2 | Major | High | **Medium** | Unhandled rejection is operationally serious but does not corrupt stored data; downstream `await` still produces a value |
| INV-3 | Critical | High | **High** | Brand forgery enables acceptance of non-genuine Results, undermining ALCOA+ "Accurate" |
| INV-4 | Major | High | **Medium** | Continuation past yield is a misuse scenario; incorrect data processing would follow but is detectable at the call site |
| INV-5 | Critical | High | **High** | Silent audit log failure via `andTee()`/`orTee()` is a direct 21 CFR 11.10(e) violation — see [ATR-1](#normative-requirements) |
| INV-6 | Minor | N/A (compile-time) | **Low** | Phantom type ergonomics; no runtime behavior; TypeScript compiler prevents misuse at compile time |
| INV-7 | Critical | High | **High** | Mutable error objects enable post-creation tampering, undermining ALCOA+ "Original" for error data |
| INV-8 | Minor | High | **Low** | Internal module wiring; incorrect registration throws immediately (fail-fast); no silent data corruption possible |
| INV-9 | Major | High | **Medium** | `ResultAsync` brand forgery is less critical than sync (INV-3) — async Results are typically awaited, producing a sync Result subject to INV-3 |
| INV-10 | Critical | High | **High** | Identical to INV-1 for the Option type — mutable Options violate ALCOA+ "Original" |
| INV-11 | Critical | High | **High** | Identical to INV-3 for the Option type — forged Options undermine ALCOA+ "Accurate" |
| INV-12 | Major | High | **Medium** | Missing `.context` degrades debugging diagnostics but does not corrupt data or suppress errors |
| INV-13 | Minor | Medium | **Low** | Subpath blocking is an API surface control; bypass exposes internals but does not affect data integrity of correctly used public APIs |
| INV-14 | Major | High | **Medium** | Behavioral inconsistency between method and standalone APIs is confusing but both paths execute the same underlying logic — no data loss |

### Assessment Provenance

| Field | Value |
|-------|-------|
| Assessor role | Library maintainer with GxP domain knowledge |
| Independent reviewer role | Independent QA reviewer with no authorship of the assessed invariants |
| Last independent review date | Pending — required before v1.0 release |
| Initial assessment date | Part of specification v1.0.0 |
| Review cadence | Re-assessed annually (January) as part of the GxP compliance review cycle per [ci-maintenance.md](../process/ci-maintenance.md#periodic-review), and upon introduction of any new invariant |
| Methodology reference | Adapted from ICH Q9 Section 5 (Risk Assessment) using a simplified Severity × Detectability model appropriate for a deterministic, zero-dependency library |

#### Independent Review Sign-Off

The independent review is a **v1.0 release blocker**. The reviewer must satisfy all of the following criteria:

1. **Independence**: No authorship or co-authorship of any invariant (INV-1 through INV-14), behavior specification, or ADR in this specification suite
2. **Qualification**: Demonstrated GxP domain knowledge (regulatory affairs, quality assurance, or validation engineering experience in a regulated environment)
3. **Scope**: Review all 14 invariant risk classifications (severity, detectability, risk level) and the overall methodology

**Sign-off record** (to be completed before v1.0 GA):

| Field | Value |
|-------|-------|
| Reviewer name | _Pending_ |
| Reviewer role/affiliation | _Pending_ |
| Review date | _Pending_ |
| Classification changes | _Pending — document any invariants reclassified, with before/after and rationale_ |
| Outcome | _Pending — Accepted / Accepted with modifications / Rejected_ |

> **Process**: The completed sign-off record replaces the `_Pending_` entries above. The review is documented as a GitHub PR modifying this section, preserving the review discussion in the PR thread. The PR must be merged before the v1.0 release tag is created.

#### Reviewer Identification Plan

The following plan ensures the independent review is completed before the v1.0 GA release:

| Milestone | Target Date | Action | Owner |
|-----------|-------------|--------|-------|
| Reviewer identification | Within 30 days of repository creation | Identify at least 2 candidate reviewers via: (1) GxP/validation professionals in the open-source pharma community (e.g., PharmaLedger, ISPE GAMP CoP), (2) contract validation consultants with GAMP 5 experience, (3) QA engineers from organizations evaluating the library for GxP adoption | Library maintainer |
| Reviewer engagement | Within 45 days of repository creation | Agree scope, timeline, and deliverable format with selected reviewer. Share this specification suite and the [Risk Assessment Methodology](#risk-assessment-methodology) section | Library maintainer |
| Review execution | Within 75 days of repository creation | Reviewer completes independent assessment of all 14 invariant risk classifications | Independent reviewer |
| Sign-off PR | Within 90 days of repository creation | Reviewer submits PR updating the sign-off record above; maintainer reviews and merges | Independent reviewer + maintainer |

**Bus-factor mitigation**: If the initial reviewer candidate is unavailable, the 2-candidate identification requirement provides a fallback. If no qualified reviewer can be engaged within 60 days, the maintainer must document the blocker as a GitHub Issue with the `gxp-critical` label and assess whether a v1.0-rc (release candidate) can proceed with an explicit "independent review pending" caveat in the release notes.

**Acceptable reviewer backgrounds**: Regulatory affairs specialists, validation engineers, QA managers, or auditors who have participated in at least one computerized system validation (CSV) project in a GxP-regulated environment. Academic researchers with published GxP/data integrity work are also acceptable. The reviewer need not have TypeScript expertise — the review scope is the risk classification methodology and its application to the invariants, not the code itself.

### Risk Acceptance Criteria

Residual risk is accepted when **all** of the following criteria are met for the applicable risk level:

| Risk Level | Acceptance Criteria |
|------------|---------------------|
| **High** | All 6 test levels pass (unit, type, mutation, Cucumber, GxP integrity, performance). Zero surviving mutants in brand validation (`core/brand.ts`, `core/guards.ts`) and freeze (`core/result.ts` freeze paths) code. Dedicated GxP integrity tests pass. |
| **Medium** | At least 4 test levels pass (unit, type, mutation, Cucumber). Mutation score ≥ 90% for the affected module. |
| **Low** | Standard unit test coverage sufficient. No formal mutation score target required. |

**Residual risk acceptance statement**: Residual risk is accepted when all criteria above are met for the applicable risk level and no open Critical or Major findings exist in the current GxP compliance review cycle. If any Critical or Major finding remains open, a formal risk acceptance decision must be documented by QA management with justification per ICH Q9 Section 6 (Risk Control), including identification of compensating controls and a timeline for closure.

### Residual Risk Summary

The following table consolidates all accepted residual risks across the specification suite, with cross-references to the section where each risk is documented and its compensating controls are defined. This serves as a single point of reference for auditors and QA reviewers.

| ID | Risk Description | ALCOA+ Impact | Compensating Controls | Documented In | Review Cadence |
|----|-----------------|---------------|----------------------|---------------|----------------|
| RR-1 | **Shallow freeze**: `Object.freeze()` is shallow — nested objects inside `ok(value)` or `err(error)` can be mutated after Result creation | Original | Deep freeze wrapper pattern (`okGxP`/`errGxP`); development-mode detection wrapper (`okChecked`/`errChecked`); OQ-011 verifies known limitation | [ALCOA+ Gap: Shallow Freeze](#alcoa-gap-shallow-freeze) | Annual GxP review |
| RR-2 | **INV-12 potential escalation**: `UnwrapError.context` may be relied upon for GxP audit trail diagnostics in the future, which would escalate INV-12 from Medium to High risk. **Escalation triggers**: (1) any GitHub Issue tagged `gxp-critical` that references `UnwrapError.context` as part of a data integrity or audit trail concern, (2) the library's own test suite adds assertions on `.context` property *values* (beyond structural presence), or (3) documentation or training materials recommend using `.context` for regulatory record-keeping | N/A (currently diagnostic only) | 4-level test coverage (unit, type, mutation, Cucumber); monitoring note for future usage patterns | [INV-12 footnote](#invariants--test-coverage), footnote ¹ | Re-evaluate January 2027 or upon any escalation trigger (whichever is earlier) |
| RR-3 | **Non-contractual response targets**: GxP incident response targets are good-faith commitments, not contractual SLAs | Available | Consumer fork contingency documented; escalation procedure with compensating controls at 2× and 3× target; consumer notification mechanisms | [GxP Incident Reporting](#gxp-incident-reporting) | Annual GxP review |
| RR-4 | **Pre-repository review evidence**: Review History entries dated 2026-02-15 predate the Git repository and cannot be independently verified via commit history | Attributable, Contemporaneous | Attestation bridge requirement for Q2 2026 review; review findings are self-evident in current document content; all future reviews follow Git-verifiable process | [Review History](../process/ci-maintenance.md#review-history) | One-time (Q2 2026 attestation) |
| RR-5 | **Option serialization gap** *(Resolved)*: Option type now provides native `toJSON()` / `fromOptionJSON()` in v1.0.0. The serialization gap documented in prior drafts is closed. | N/A (resolved) | Native `toJSON()` on Some/None; `fromOptionJSON()` for deserialization; DRR-4 updated to reflect native support | [Option Serialization for Data Retention](#option-serialization-for-data-retention) | N/A (resolved) |
| RR-6 | **ATR-1 grep over-approximation**: CI job 9 uses syntactic grep (not semantic analysis) to enforce `andTee`/`orTee` prohibition, which may reject legitimate non-critical usage in GxP-annotated files | N/A (false positives only — no compliance risk) | Documented exemption process (move non-critical code to non-GxP module or add inline justification); ESLint plugin planned for semantic analysis | [Interim Compensating Controls](#interim-compensating-controls) | Until ESLint plugin replaces grep |
| RR-7 | **Sole-maintainer bus factor**: GxP incident response targets (48h Critical triage, 7-day Critical fix) depend on a single maintainer's availability. Extended unavailability (illness, departure, competing priorities) could leave `gxp-critical` issues unresolved beyond the documented response targets | Available | (1) Escalation procedure at 2× and 3× target with consumer compensating controls documented in [Escalation Procedure](#escalation-procedure); (2) consumer fork contingency documented in [GAMP 5 Classification](#gamp-5-classification) (Category 5 if modified); (3) full source code and specifications are public, enabling any qualified engineer to diagnose and patch the library; (4) zero production dependencies reduces the scope of potential defects to the library's own code; (5) [Reviewer Identification Plan](#reviewer-identification-plan) targets engagement of a second qualified individual who could serve as an emergency maintainer | [GxP Incident Reporting](#gxp-incident-reporting), [Reviewer Identification Plan](#reviewer-identification-plan) | Annual GxP review |

**Maintenance**: This table is updated whenever a new residual risk is identified or an existing risk is resolved. Resolved risks are not removed — they are marked with a "Resolved" status and the resolution date to maintain the audit trail. The table is reviewed as part of each annual GxP compliance review.

> **Standalone document**: The residual risk summary and risk acceptance criteria are also maintained in [risk-assessment.md](../risk-assessment.md). When adding or updating residual risks, update both locations.

## Requirement Traceability Matrix

> **Standalone document**: The traceability matrix is also maintained as a standalone document at [traceability.md](../traceability.md), which includes additional sections (Test File Map, Source Module → Test File Mapping) not present in this inline version. The requirement identification convention is also documented in [requirement-id-scheme.md](../process/requirement-id-scheme.md). When updating traceability data, update both locations.

### Requirement Identification Convention

Every testable requirement in the behavior specifications uses a formal identifier to enable granular traceability from individual requirements to individual test cases.

#### ID Scheme

```
BEH-XX-NNN
```

| Component | Meaning | Example |
|-----------|---------|---------|
| `BEH` | Behavior specification requirement (prefix) | — |
| `XX` | Two-digit behavior spec number (01–14) | `03` = transformation |
| `NNN` | Sequential requirement number within that spec, starting at 001 | `007` = seventh requirement |

Example: `BEH-03-007` is the 7th testable requirement in `behaviors/03-transformation.md`.

Audit trail requirements defined in this compliance document use the `ATR-N` scheme (see [Normative Requirements](#normative-requirements)). Data retention requirements use the `DRR-N` scheme (see [Data Retention Guidance](#data-retention-guidance)).

#### Behavior Spec → Requirement ID Ranges

| Behavior Spec | File | ID Range | Count | Domain |
|---------------|------|----------|:-----:|--------|
| 01 — Types and Guards | `behaviors/01-types-and-guards.md` | BEH-01-001 – BEH-01-011 | 11 | Core type definitions, brand symbols, type guards |
| 02 — Creation | `behaviors/02-creation.md` | BEH-02-001 – BEH-02-007 | 7 | Factory functions (`ok`, `err`, `fromThrowable`, etc.) |
| 03 — Transformation | `behaviors/03-transformation.md` | BEH-03-001 – BEH-03-021 | 21 | `map`, `mapErr`, `mapBoth`, `flatten`, `flip` |
| 04 — Extraction | `behaviors/04-extraction.md` | BEH-04-001 – BEH-04-011 | 11 | `match`, `unwrapOr`, `toNullable`, `toJSON`, etc. |
| 05 — Composition | `behaviors/05-composition.md` | BEH-05-001 – BEH-05-008 | 8 | `all`, `allSettled`, `any`, `collect`, `partition`, etc. |
| 06 — Async | `behaviors/06-async.md` | BEH-06-001 – BEH-06-011 | 11 | `ResultAsync` class and async operations |
| 07 — Generators | `behaviors/07-generators.md` | BEH-07-001 – BEH-07-005 | 5 | `safeTry` generator-based early return |
| 08 — Error Patterns | `behaviors/08-error-patterns.md` | BEH-08-001 – BEH-08-004 | 4 | `createError`, `createErrorGroup`, `assertNever` |
| 09 — Option | `behaviors/09-option.md` | BEH-09-001 – BEH-09-010 | 10 | `Option<T>`, `some`, `none`, `isOption`, `toJSON`, `fromOptionJSON` |
| 10 — Standalone Functions | `behaviors/10-standalone-functions.md` | BEH-10-001 – BEH-10-004 | 4 | Curried pipe-style functions in `fn/*` |
| 11 — Unsafe | `behaviors/11-unsafe.md` | BEH-11-001 – BEH-11-005 | 5 | `unwrap`, `unwrapErr`, `UnwrapError` |
| 12 — Do Notation | `behaviors/12-do-notation.md` | BEH-12-001 – BEH-12-008 | 8 | `Do`, `bind`, `let_` |
| 13 — Interop | `behaviors/13-interop.md` | BEH-13-001 – BEH-13-006 | 6 | `fromJSON`, `toSchema`, Standard Schema, Option serialization interop |
| 14 — Benchmarks | `behaviors/14-benchmarks.md` | BEH-14-001 – BEH-14-008 | 8 | Performance targets and thresholds |

**Total**: 119 testable requirements across 14 behavior specifications.

Upper bounds are now assigned. The convention is additive — new requirements receive the next sequential number; existing IDs are never reused or renumbered.

#### Traceability Usage

Each behavior spec file contains requirement IDs as Markdown headings or inline markers:

```markdown
### BEH-03-001: Ok.map(f) applies f to the value and returns a new frozen Ok
### BEH-03-002: Err.map(f) returns self without calling f
```

Test files reference the requirement ID in the `describe` or `it` block:

```typescript
describe("BEH-03-001: Ok.map(f)", () => {
  it("applies f to the value and returns Ok", () => { ... });
  it("returns a new frozen Result", () => { ... });
});
```

Cucumber scenarios reference the requirement ID in a tag:

```gherkin
@BEH-03-001
Scenario: Ok.map applies function to value
  Given I create an Ok result with value 10
  When I map it with a function that doubles the value
  Then the mapped result should have value 20
```

This enables automated traceability queries:

```bash
# Find all tests covering a specific requirement
grep -r "BEH-03-001" src/ features/

# Find all requirements in a behavior spec
grep "^### BEH-03-" spec/result/behaviors/03-transformation.md

# Verify no orphaned tests (tests without a BEH-XX-NNN reference)
# Verify no orphaned requirements (BEH-XX-NNN without a matching test)
```

### Invariants → Test Coverage

The **ICH Q9 Risk** column classifies each invariant by its GxP impact. See [Risk Assessment Methodology](#risk-assessment-methodology) for the classification criteria, per-invariant rationale, and assessment provenance.

- **High** — Directly affects data integrity (immutability, brand validation, error flow). Requires dedicated GxP integrity tests and full mutation coverage.
- **Medium** — Affects operational reliability (async safety, structured errors, delegation). Requires unit + mutation + Cucumber coverage.
- **Low** — Affects developer experience or internal consistency (phantom types, generator safety, subpath blocking). Standard unit test coverage sufficient.

| Invariant | Description | ICH Q9 Risk | Unit Tests | Type Tests | Mutation Tests | Cucumber Scenarios | GxP Integrity Tests |
|-----------|-------------|:-----------:|:----------:|:----------:|:--------------:|:------------------:|:-------------------:|
| INV-1 | Frozen Result Instances | **High** | `core/result.test.ts` | N/A | Stryker | `immutability.feature` | `gxp/freeze.test.ts` |
| INV-2 | Internal Promise Never Rejects | **Medium** | `async/result-async.test.ts` | N/A | Stryker | `async-safety.feature` | `gxp/promise-safety.test.ts` |
| INV-3 | Brand Symbol Prevents Forgery | **High** | `core/guards.test.ts` | `guards.test-d.ts` | Stryker | `brand-validation.feature` | `gxp/tamper-evidence.test.ts` |
| INV-4 | Err Generator Throws on Continuation | **Medium** | `generators/safe-try.test.ts` | N/A | Stryker | `generators.feature` | `gxp/generator-safety.test.ts` |
| INV-5 | Error Suppression in Tee | **High** | `core/result.test.ts` | N/A | Stryker | `side-effects.feature` | `gxp/error-suppression.test.ts` |
| INV-6 | Phantom Types Enable Free Composition | **Low** | N/A | `types.test-d.ts` | N/A | N/A | N/A |
| INV-7 | createError Output Is Frozen | **High** | `errors/create-error.test.ts` | N/A | Stryker | `error-patterns.feature` | `gxp/error-freeze.test.ts` |
| INV-8 | Lazy ResultAsync Registration | **Low** | `async/result-async.test.ts` | N/A | Stryker | N/A | N/A |
| INV-9 | ResultAsync Brand Identity | **Medium** | `core/guards.test.ts` | `guards.test-d.ts` | Stryker | `brand-validation.feature` | `gxp/async-tamper.test.ts` |
| INV-10 | Frozen Option Instances | **High** | `option/option.test.ts` | N/A | Stryker | `option.feature` | `gxp/option-freeze.test.ts` |
| INV-11 | Option Brand Prevents Forgery | **High** | `option/guards.test.ts` | `guards.test-d.ts` | Stryker | `brand-validation.feature` | `gxp/option-tamper.test.ts` |
| INV-12 | UnwrapError Contains Context | **Medium** | `unsafe/unwrap.test.ts` | `unwrap.test-d.ts` | Stryker | `unsafe.feature` | N/A¹ |
| INV-13 | Subpath Blocking | **Low** | `exports.test.ts` | N/A | N/A | `subpath-exports.feature` | N/A |
| INV-14 | Standalone Functions Delegate | **Medium** | `fn/*.test.ts` | `fn/*.test-d.ts` | Stryker | `standalone-functions.feature` | `gxp/delegation.test.ts` |

### Risk Summary

| Risk Level | Count | Invariants | Testing Requirement |
|------------|-------|------------|---------------------|
| High | 6 | INV-1, 3, 5, 7, 10, 11 | All 6 test levels + dedicated GxP integrity tests |
| Medium | 5 | INV-2, 4, 9, 12, 14 | Unit + Type + Mutation + Cucumber + GxP integrity (where applicable) |
| Low | 3 | INV-6, 8, 13 | Unit + Mutation (where applicable) |

¹ **INV-12 GxP integrity test justification**: INV-12 verifies that `UnwrapError` includes a `.context` property for structured debugging. This invariant affects developer diagnostic experience rather than data integrity or brand validation. It is covered by unit tests (`unsafe/unwrap.test.ts`), type tests (`unwrap.test-d.ts`), mutation tests (Stryker), and Cucumber acceptance tests (`unsafe.feature`). These four levels provide sufficient coverage for a Medium-risk invariant that does not directly affect ALCOA+ data integrity properties. A dedicated GxP integrity test is not required. **Monitoring note** (2026-02-15): If future usage patterns reveal that `.context` data is relied upon for GxP audit trail diagnostics (e.g., attaching regulatory metadata to `UnwrapError` instances), this assessment will be revisited and INV-12 may be escalated to High risk with a corresponding dedicated GxP integrity test. Re-evaluate at the next annual GxP compliance review (January 2027).

**Low-rated invariant justifications** (INV-6, INV-8, INV-13):

² **INV-6 (Phantom Types Enable Free Composition) — Low risk justification**: INV-6 is a compile-time-only property enforced by the TypeScript type system. It has no runtime behavior and cannot be violated at runtime — the TypeScript compiler prevents misuse at compile time. Detectability is rated N/A because violations are caught before code can execute. No ALCOA+ principle is at risk. Coverage consists of type-level tests (`types.test-d.ts`) only, which is proportionate for a purely compile-time constraint.

³ **INV-8 (Lazy ResultAsync Registration) — Low risk justification**: INV-8 governs internal module wiring for the `ResultAsync` class. Incorrect registration would cause an immediate fail-fast error (`throw`) on first use — there is no scenario where this invariant could silently fail or corrupt data. Detectability is High (fail-fast behavior). The invariant affects internal library bootstrapping, not data integrity or ALCOA+ properties. Coverage consists of unit tests (`async/result-async.test.ts`) and mutation tests (Stryker), which is proportionate for an internal wiring invariant with fail-fast characteristics.

⁴ **INV-13 (Subpath Blocking) — Low risk justification**: INV-13 prevents consumers from importing internal modules via subpath exports in `package.json`. Bypassing this control would expose internal implementation details but would not affect the data integrity, immutability, or brand validation of correctly used public APIs. Detectability is Medium (requires intentional circumvention of module resolution). No ALCOA+ principle is at risk when public APIs are used as documented. Coverage consists of unit tests (`exports.test.ts`) and Cucumber acceptance tests (`subpath-exports.feature`), which is proportionate for an API surface control invariant.

### Forward Traceability: ADR → Invariants → Behaviors

| ADR | Invariants Affected | Behavior Specs Affected |
|-----|--------------------|-----------------------|
| ADR-001 (Closures) | INV-1, INV-14 | 01, 03, 04, 10 |
| ADR-002 (Brand) | INV-3 | 01 |
| ADR-003 (Phantom) | INV-6 | 01 |
| ADR-004 (Freeze) | INV-1, INV-7, INV-10 | 01, 08, 09 |
| ADR-005 (Lazy Async) | INV-8 | 06 |
| ADR-006 (Tee Swallowing) | INV-5 | 03, 06 |
| ADR-007 (Dual API) | INV-14 | 10 |
| ADR-008 (Async Brand) | INV-9 | 01, 06 |
| ADR-009 (Option) | INV-10, INV-11 | 09 |
| ADR-010 (Unsafe) | INV-12 | 04, 11 |
| ADR-011 (Subpath) | INV-13 | All (export structure) |
| ADR-012 (Do Notation) | None (syntactic sugar over existing `andThen`; no new runtime guarantee introduced) | 12 |
| ADR-013 (Performance) | None (optimization strategy; no new runtime guarantee introduced) | 14 |

### Backward Traceability: Test File → Spec

| Test File Pattern | Spec Coverage | Test Level |
|-------------------|---------------|------------|
| `*.test.ts` | Runtime behavior | Unit (Vitest) |
| `*.test-d.ts` | Type inference | Type (Vitest typecheck) |
| `*.feature` | Acceptance criteria | BDD (Cucumber) |
| `gxp/*.test.ts` | Invariant integrity | GxP Integrity |
| `bench/*.bench.ts` | Performance targets | Performance (Vitest bench) |
| Stryker | Code coverage gaps | Mutation |

### Coverage Targets

| Metric | Target | Regulatory Basis |
|--------|--------|------------------|
| Requirement-level forward traceability | 100% of BEH-XX-NNN IDs have at least one test | GAMP 5 §D.4 |
| Requirement-level backward traceability | 100% of test cases trace to a BEH-XX-NNN or INV-N ID | GAMP 5 §D.4 |
| Invariant forward traceability | 100% of invariants have tests | GAMP 5 |
| Unit test line coverage | > 95% | FDA Software Validation |
| Mutation score | > 90% break threshold | GAMP 5 (risk-proportionate) |
| Cucumber scenario coverage | 100% of behavior specs have scenarios | BDD acceptance |
| GxP integrity test coverage | 100% of INV-1,3,5,7,9,10,11 | Data integrity focus |
| Orphaned requirements | 0 BEH-XX-NNN IDs without tests | GAMP 5 |
| Orphaned tests | 0 tests without a BEH-XX-NNN or INV-N reference | GAMP 5 |
| ATR-N compliance | ATR-1 (`andTee`/`orTee` prohibition) enforced by CI job 9; ATR-2, ATR-3 are normative guidance verified by PR review | 21 CFR 11.10(e) |
| DRR-N compliance | DRR-2 verified by `from-json-compat.test.ts` regression test; DRR-4 verified by `from-json-compat.test.ts` (Option fixtures) and native `option/option.test.ts` serialization tests; DRR-1, DRR-3, and DRR-5 are consumer-side requirements with verification guidance in [Migration Verification Procedures](#migration-verification-procedures), [Option Serialization for Data Retention](#option-serialization-for-data-retention), and [Periodic Readability Verification](#periodic-readability-verification-for-archived-data) | ALCOA+ Available, Enduring |

**Automated measurement**: The targets above are verified automatically by [`scripts/verify-traceability.sh`](../scripts/verify-traceability.sh) (spec-level) and [`packages/result/scripts/verify-traceability.sh`](../../packages/result/scripts/verify-traceability.sh) (package-level), which run as CI job 8 (see [ci-maintenance.md](../process/ci-maintenance.md#8-traceability-verification)). The script parses BEH-XX-NNN, INV-N, ATR-N, and DRR-N IDs from spec and test files, computes forward/backward traceability percentages, and exits with code 1 if any target is not met. ATR-1 compliance is additionally enforced by CI job 9 (grep-based blocking check), and DRR-2 backward compatibility is verified by the `from-json-compat.test.ts` regression test within CI job 3 (Unit Tests). CI artifacts (traceability report output) are archived for post-hoc audit review.

**ATR-N / DRR-N traceability verification**: The traceability script verifies that every ATR-N and DRR-N identifier defined in this compliance document is referenced by at least one of: a CI job, a test file, a Cucumber scenario, or a consumer-side verification procedure documented in this document. Specifically:

| Requirement | Verification Mechanism | Traceability Script Check |
|-------------|----------------------|--------------------------|
| ATR-1 | CI job 9 (grep-based blocking check) | Script confirms `ATR-1` is referenced in CI workflow and in `gxp/error-suppression.test.ts` |
| ATR-2 | PR review checklist + `gxp/error-suppression.test.ts` | Script confirms `ATR-2` is referenced in test files |
| ATR-3 | PR review checklist | Script confirms `ATR-3` is referenced in this compliance document with verification guidance |
| DRR-1 | Consumer-side (storage procedure) | Script confirms `DRR-1` is referenced in this compliance document with verification guidance |
| DRR-2 | `from-json-compat.test.ts` regression test (CI job 3) | Script confirms `DRR-2` is referenced in test files |
| DRR-3 | Consumer-side (serialization boundary) | Script confirms `DRR-3` is referenced in this compliance document with verification guidance |
| DRR-4 | `from-json-compat.test.ts` (Option fixtures) + native `option/option.test.ts` | Script confirms `DRR-4` is referenced in test files and this compliance document |
| DRR-5 | Consumer-side (periodic readability verification) | Script confirms `DRR-5` is referenced in this compliance document with verification guidance |

Consumer-side requirements (ATR-3, DRR-1, DRR-3, DRR-4, DRR-5) are verified for *documentation presence* rather than *test coverage*, because their enforcement occurs in the consumer's system, not in the library's test suite. The traceability script flags any ATR-N or DRR-N identifier that is defined but not referenced by any verification mechanism as an orphaned compliance requirement.

**Static traceability report**: In addition to CI-time verification, a human-auditable traceability report is generated at each tagged release and committed to the repository as `docs/traceability-report-vX.Y.Z.md`. This report contains:

1. The full BEH-XX-NNN → test case mapping (all 119 requirements with their covering unit tests, type tests, Cucumber scenarios, and GxP integrity tests)
2. The full INV-N → test case mapping (all 14 invariants with test coverage per level)
3. The full ATR-N → verification mechanism mapping (all audit trail requirements with their CI job, test, or documentation reference)
4. The full DRR-N → verification mechanism mapping (all data retention requirements with their test or documentation reference)
5. Forward and backward traceability percentages
6. List of any orphaned requirements or tests (expected: 0)

The report is generated by `scripts/verify-traceability.sh --report-md` and committed as part of the release process (see [ci-maintenance.md Release Traceability Artifact](../process/ci-maintenance.md#release-traceability-artifact)). This ensures that traceability evidence is available for the full Git history retention period — not limited to the CI platform's artifact retention (90 days for GitHub Actions). For GxP audits, `git show vX.Y.Z:docs/traceability-report-vX.Y.Z.md` retrieves the exact traceability matrix that was in effect at any historical release.

### Specification Hierarchy Mapping

The following table maps GAMP 5 V-Model specification levels to `@hex-di/result` library documents. This establishes traceability from high-level user needs through to code-level specifications.

| GAMP 5 V-Model Level | Abbreviation | Library Document(s) | Content |
|----------------------|:------------:|----------------------|---------|
| User Requirements Specification | URS | [overview.md](../overview.md) | Library purpose, design philosophy, target consumers, high-level feature list |
| Functional Specification | FS | [behaviors/01–14](../behaviors/) | 14 behavior specifications defining all public API contracts (119 testable requirements) |
| Design Specification | DS | [decisions/001–013](../decisions/), [invariants.md](../invariants.md) | 13 Architecture Decision Records documenting design rationale; 14 runtime invariants |
| Configuration Specification | CS | N/A (Category 3 — no configuration) | The library has no configurable parameters; see [CS — Consumer Responsibility](#configuration-specification-cs--consumer-responsibility) |

> **Note**: Because `@hex-di/result` is a GAMP 5 Category 3 library (non-configured COTS), the specification hierarchy is simpler than a full Category 5 application. The library has no URS in the traditional sense — `overview.md` serves as the equivalent by documenting the "why" and "what" at the user-need level.

> **URS scope rationale**: For a GAMP 5 Category 3 library with no configuration, no user-facing UI, and no direct I/O, several traditional URS sections are addressed at the Functional Specification level rather than as a separate URS document. Specifically: **user groups** (TypeScript/JavaScript developers in GxP-regulated systems) are implicit in the library's design philosophy and documented in [Training Guidance](#training-guidance); **business process context** (how the library fits into GxP workflows) is documented in the [ALCOA+ Compliance Mapping](#alcoa-compliance-mapping), [Audit Trail Requirements](#audit-trail-requirements), and [Error Severity Classification](#error-severity-classification) sections; **acceptance criteria per requirement** are defined in the 14 behavior specifications (FS level) using 119 formally identified testable requirements (BEH-XX-NNN); **constraints and assumptions** are documented in [overview.md](../overview.md) (runtime requirements, module format, side effects) and in the ADRs (design trade-offs); **risk assessment** is in the [Risk Assessment Methodology](#risk-assessment-methodology) section of this document. This proportionate URS treatment is consistent with GAMP 5 Appendix M4, which states that "the level of effort should be commensurate with the novelty, complexity, and risk of the system."

## Validation Templates

> **Test environment prerequisite**: These templates are designed for execution in the consumer's qualified test environment. The consumer is responsible for documenting the test environment configuration (OS version, Node.js version, npm/pnpm version, TypeScript version, network connectivity) as part of their validation protocol per EU GMP Annex 11.4. Environment qualification is outside the scope of the library's specification — it is an infrastructure concern managed by the consumer's QMS.

### Protocol Identification

Each IQ, OQ, and PQ execution should be documented with the following protocol metadata. This block should appear at the top of the executed protocol document to satisfy ALCOA+ "Attributable" and EU GMP Annex 11.4 traceability requirements.

| Field | Description | Example |
|-------|-------------|---------|
| Protocol Number | Unique identifier assigned by consumer QMS | `VAL-PRO-2026-042` |
| Protocol Version | Version of this protocol template | `1.0` (aligned with library spec v1.0.0) |
| Execution ID | Unique identifier for this specific execution | `EXE-2026-042-001` |
| System Under Test | Library name and exact version | `@hex-di/result 1.2.3` |
| Test Environment | OS, Node.js version, TypeScript version, package manager | `Ubuntu 22.04, Node 22.14.0, TS 5.6.3, pnpm 9.15.0` |
| Prepared By | Name, role, date | _Name / Role / YYYY-MM-DD_ |
| Reviewed By | Name, role, date | _Name / Role / YYYY-MM-DD_ |
| Approved By | Name, role, date | _Name / Role / YYYY-MM-DD_ |
| Execution Date | Date(s) of test execution | _YYYY-MM-DD_ |
| Executed By | Tester name and role | _Name / Role_ |

> **Usage**: Copy this metadata block into each IQ, OQ, and PQ protocol execution document. The consumer's QMS may require additional fields (e.g., Witness, Site, Equipment ID). The template is extensible — add fields as needed without removing the minimum set above.

### Deviation Handling

If any IQ, OQ, or PQ test produces an unexpected result, the following procedure applies:

#### Deviation Categories

| Category | Definition | Response |
|----------|-----------|----------|
| **Critical** | A test failure that indicates a data integrity, immutability, or brand validation defect | **Blocks qualification** — must be resolved before proceeding. Report upstream via [GxP Incident Reporting](#gxp-incident-reporting) if the root cause is in the library |
| **Non-Critical** | A test failure caused by environment misconfiguration, test execution error, or a cosmetic discrepancy that does not affect GxP-relevant behavior | Qualification may proceed with documented justification |

#### Always-Critical Tests

The following tests are always categorized as Critical deviations when they fail, because they verify High-risk invariants directly affecting data integrity:

- **IQ-009 / IQ-010** (package integrity) — a failed integrity check may indicate a tampered or corrupted package
- **OQ-001** (Result creation — frozen, branded instances) — verifies INV-1 and INV-3
- **OQ-002** (immutability — TypeError on modification) — verifies INV-1
- **OQ-003** (brand validation — genuine vs. fake) — verifies INV-3
- **OQ-005** (serialization round-trip — brand preserved) — verifies DRR-2
- **OQ-008** (error factory freeze) — verifies INV-7
- **OQ-009** (Option brand) — verifies INV-11
- **PQ-004** (serialization under load — 10K results) — verifies DRR-2 at scale
- **PQ-009** (audit trail integration) — verifies ATR-1 and ATR-2
- **PQ-011** (Option serialization under load — 5K options) — verifies DRR-4, INV-10, and INV-11 at scale

#### Deviation Procedure

1. **Record**: Document the actual result, failure description, and suspected root cause in the execution evidence columns (Actual Result, Pass/Fail, Comments)
2. **Categorize**: Determine whether the deviation is Critical or Non-Critical per the definitions above. All tests listed in [Always-Critical Tests](#always-critical-tests) are automatically Critical
3. **Investigate**: Identify the root cause — library defect, environment issue, test execution error, or specification ambiguity
4. **Report (if library defect)**: If the root cause is in the library, report via [GxP Incident Reporting](#gxp-incident-reporting) with the `gxp-critical` label
5. **Resolve**: For Critical deviations, resolve the root cause before re-executing the failed test. For Non-Critical deviations, document the justification for proceeding
6. **Re-execute**: After resolution, re-execute the failed test. Record both the original failure and the successful re-execution in the execution evidence
7. **Document**: Record the deviation in the consumer's quality management system per their CAPA (Corrective and Preventive Action) procedures. Include: deviation category, root cause, corrective action taken, and re-execution result

#### Deviation Records

| Field | Content |
|-------|---------|
| Deviation ID | Sequential identifier (e.g., DEV-IQ-001, DEV-OQ-003) |
| Test ID | The IQ/OQ/PQ test number that failed |
| Category | Critical / Non-Critical |
| Description | What happened vs. what was expected |
| Root Cause | Library defect / Environment issue / Execution error / Specification ambiguity |
| Corrective Action | Steps taken to resolve |
| Re-execution Result | Pass / Fail (with date and tester) |
| QMS Reference | Link to the consumer's CAPA or deviation record |

### Installation Qualification (IQ) Checklist

| # | Check | Expected Result | Pass/Fail |
|---|-------|-----------------|-----------|
| IQ-001 | Verify package installed | `npm ls @hex-di/result` shows correct version | |
| IQ-002 | Verify package version | `require("@hex-di/result/package.json").version` matches expected | |
| IQ-003 | Verify ESM import | `import { ok } from "@hex-di/result"` resolves | |
| IQ-004 | Verify subpath exports | `import { pipe } from "@hex-di/result/fn"` resolves | |
| IQ-005 | Verify internal blocking | `import "@hex-di/result/internal/foo"` fails with module-not-found | |
| IQ-006 | Verify zero dependencies | `npm ls @hex-di/result --all` shows no production dependencies | |
| IQ-007 | Verify TypeScript version | `tsc --version` is >= 5.0 | |
| IQ-008 | Verify Node.js version | `node --version` is >= 18.0.0 | |
| IQ-009 | Verify package integrity (registry signature) | `npm audit signatures` shows valid registry signature (requires npm ≥ 8.14 and public registry). If `npm audit signatures` is unavailable (private registries, air-gapped networks, npm < 8.14), use IQ-010 (hash verification) as the fallback integrity check. | |
| IQ-010 | Verify package integrity (hash verification) | Download tarball with `npm pack @hex-di/result`; compute SHA-512 with `shasum -a 512 <tarball>`; compare against `integrity` field in lock file (`pnpm-lock.yaml` or `package-lock.json`). Use this method when `npm audit signatures` is unavailable (private registries, air-gapped networks). See lock file format examples below.⁶ | |
| IQ-011 | Verify sideEffects flag | `package.json` contains `"sideEffects": false` | |
| IQ-012 | Verify CJS import | `const { ok } = require("@hex-di/result")` resolves without error and `ok` is a function. Skip this check if the consuming system uses ESM exclusively. | |

⁶ **IQ-010 lock file format examples**:

- **pnpm-lock.yaml**: The integrity hash is stored under the package's resolution entry. Locate the `@hex-di/result` entry and find the `integrity` field:
  ```yaml
  '@hex-di/result@1.2.3':
    resolution: {integrity: sha512-abc123...==}
  ```
  Compare with: `shasum -a 512 hex-di-result-1.2.3.tgz | awk '{print "sha512-" $1}'` (base64-encode the raw hash to match the lock file format, or use `npm integrity` tooling).

- **package-lock.json**: The integrity hash is stored in the `packages` object under the `node_modules/@hex-di/result` key:
  ```json
  "node_modules/@hex-di/result": {
    "version": "1.2.3",
    "resolved": "https://registry.npmjs.org/@hex-di/result/-/result-1.2.3.tgz",
    "integrity": "sha512-abc123...=="
  }
  ```
  The `integrity` field uses the Subresource Integrity (SRI) format (`sha512-<base64>`). To verify: `shasum -a 512 hex-di-result-1.2.3.tgz` produces a hex digest; convert to base64 and prepend `sha512-` to compare.

### Operational Qualification (OQ) Test Scripts

> **Execution evidence**: The OQ template includes execution evidence columns (Tester, Date, Actual Result, Pass/Fail, Comments) to satisfy ALCOA+ "Attributable" (who performed the test) and "Contemporaneous" (when it was performed). Organizations with additional QMS requirements may extend the template with further fields (e.g., Witness, Deviation Reference). The template is directly usable as-provided for qualification execution.

| # | Test | Steps | Expected Result | Tester | Date | Actual Result | Pass/Fail | Comments |
|---|------|-------|-----------------|--------|------|---------------|-----------|----------|
| OQ-001 | Result creation | `ok(42)`, `err("fail")` | Frozen, branded instances | | | | | |
| OQ-002 | Immutability | Attempt `ok(1).value = 2` | TypeError in strict mode | | | | | |
| OQ-003 | Brand validation | `isResult(ok(1))` vs `isResult({ _tag: "Ok", value: 1 })` | `true` vs `false` | | | | | |
| OQ-004 | Error propagation | `ok(1).andThen(() => err("x")).isErr()` | `true` | | | | | |
| OQ-005 | Serialization round-trip | `fromJSON(ok(42).toJSON())` | Genuine Result, passes `isResult()` | | | | | |
| OQ-006 | Type narrowing | `if (result.isOk()) result.value` | TypeScript compiles, no error | | | | | |
| OQ-007 | Exhaustiveness | `match` with missing branch | TypeScript compile error | | | | | |
| OQ-008 | Error factory freeze and const inference | `createError("tag")({ severity: "critical" })` | `Object.isFrozen()` returns `true`; `severity` inferred as literal `"critical"` (not `string`) | | | | | |
| OQ-009 | Option brand | `isOption(some(1))` vs `isOption({ _tag: "Some", value: 1 })` | `true` vs `false` | | | | | |
| OQ-010 | Unsafe gating | `import { unwrap } from "@hex-di/result"` | Import fails at resolution time with an error indicating `unwrap` is not available from the main entry point. The specific error type depends on the library version's enforcement mechanism — see footnote ⁵ for details.⁵ | | | | | |
| OQ-011 | Shallow freeze awareness (known limitation verification) | `const r = ok({ a: 1 }); r.value.a = 2;` | Mutation succeeds (`r.value.a === 2`) — `Object.freeze()` is shallow. This is a **known limitation**, not a defect. GxP consumers must deep-freeze nested data before wrapping (see [ALCOA+ Gap: Shallow Freeze](#alcoa-gap-shallow-freeze)) | | | | | |
| OQ-012 | Standard Schema interop | `toSchema(v => typeof v === "number" ? ok(v) : err("NaN"))` | Returned object has `["~standard"].version === 1` and `["~standard"].vendor === "@hex-di/result"`; valid input produces `{ value }` output; invalid input produces `{ issues: [{ message }] }` output | | | | | |
| OQ-013 | `fromJSON` rejects invalid input | `fromJSON({ _tag: "Invalid" })` | Throws `TypeError` with message containing `"Invalid Result JSON"`. Confirms that corrupted or tampered serialized data is rejected at the deserialization boundary per BEH-13-001 | | | | | |
| OQ-014 | Combinator short-circuit and accumulation | 1. `all([ok(1), ok(2), ok(3)])` 2. `all([ok(1), err("x"), ok(3)])` 3. `allSettled([ok(1), err("a"), err("b")])` 4. `partition([ok(1), err("a"), ok(2)])` | 1. `Ok([1, 2, 3])` (tuple preserved). 2. `Err("x")` (short-circuits at first Err; third element not evaluated). 3. `Err(["a", "b"])` (all errors accumulated). 4. Ok array `[1, 2]`, Err array `["a"]` (complete separation, order preserved). Covers BEH-05-001, BEH-05-002, BEH-05-005 | | | | | |
| OQ-015 | ResultAsync operations | 1. `ResultAsync.fromPromise(Promise.resolve(42), e => e)` 2. `ResultAsync.fromPromise(Promise.reject("fail"), e => e)` 3. Chain: `fromPromise(Promise.resolve(1), e => e).map(x => x + 1).andThen(x => ResultAsync.fromPromise(Promise.resolve(x * 2), e => e))` 4. Register `process.on("unhandledRejection", ...)` before all operations | 1. Produces `Ok(42)` after `await`. 2. Produces `Err("fail")` after `await` (rejection caught and mapped). 3. Produces `Ok(4)` after `await` (chain composes correctly). 4. Zero `unhandledRejection` events across all operations. Covers BEH-06-001, BEH-06-003, INV-2 | | | | | |
| OQ-016 | Do notation context accumulation | 1. `ok({ }).andThen(bind("a", () => ok(1))).andThen(bind("b", () => ok(2))).map(ctx => ctx.a + ctx.b)` 2. `ok({ }).andThen(bind("a", () => ok(1))).andThen(bind("b", () => err("fail"))).map(ctx => ctx.a)` | 1. Produces `Ok(3)` (context `{ a: 1, b: 2 }` accumulated, mapped to sum). 2. Produces `Err("fail")` (short-circuits at second bind; `map` never called). Covers BEH-12-001, BEH-12-003 | | | | | |
| OQ-017 | Option factory, freeze, and fromNullable | 1. `some(42)` 2. `none()` 3. `Option.fromNullable(null)` 4. `Option.fromNullable("hello")` | 1. Frozen (`Object.isFrozen()` returns `true`), branded (`isOption()` returns `true`) Some with `value === 42`. 2. Frozen, branded None. 3. Returns None (`_tag === "None"`). 4. Returns Some with `value === "hello"`. All four pass `isOption()`. Covers BEH-09-005, BEH-09-006, BEH-09-007, BEH-09-008, INV-10, INV-11 | | | | | |
| OQ-018 | Option serialization round-trip | 1. `some(42).toJSON()` 2. `none().toJSON()` 3. `fromOptionJSON(some(42).toJSON())` 4. `fromOptionJSON(none().toJSON())` 5. `fromOptionJSON({ _tag: "Some", value: 99 })` (legacy format, no `_schemaVersion`) 6. `fromOptionJSON({ _tag: "Invalid" })` | 1. Returns `{ _tag: "Some", _schemaVersion: 1, value: 42 }`. 2. Returns `{ _tag: "None", _schemaVersion: 1 }`. 3. Returns branded, frozen Some with `value === 42`; passes `isOption()`. 4. Returns branded, frozen None; passes `isOption()`. 5. Returns branded, frozen Some with `value === 99` (legacy format accepted). 6. Throws `TypeError`. Covers BEH-09-009, BEH-09-010, DRR-4 | | | | | |
| OQ-019 | Generator early return (`safeTry`) | 1. `safeTry(function*() { const x = yield* ok(1); const y = yield* err("stop"); return ok(x + y); })` 2. Inspect the returned Result | Result is `Err("stop")`. The `return ok(x + y)` statement is never reached — the generator exits early at the second `yield*` because the `Err` variant signals short-circuit. Covers BEH-07-001, INV-4 | | | | | |
| OQ-020 | Creation factories | 1. `fromThrowable(() => JSON.parse("valid"), e => String(e))` 2. `fromThrowable(() => JSON.parse("///"), e => String(e))` 3. `tryCatch(() => 42, e => String(e))` 4. `fromNullable("hello", () => "was null")` 5. `fromNullable(null, () => "was null")` 6. `fromPredicate(10, (n): n is number => typeof n === "number", () => "not number")` | 1. `Ok("valid")`. 2. `Err` containing the SyntaxError message. 3. `Ok(42)`. 4. `Ok("hello")`. 5. `Err("was null")`. 6. `Ok(10)`. All results pass `isResult()` and are frozen. Covers BEH-02-001, BEH-02-002, BEH-02-003, BEH-02-004 | | | | | |
| OQ-021 | Error mapping and recovery (`mapErr`, `orElse`, `mapBoth`) | 1. `err("fail").mapErr(e => e.toUpperCase())` 2. `ok(1).mapErr(e => e)` 3. `err("fail").orElse(e => ok(e.length))` 4. `ok(1).orElse(() => ok(0))` 5. `ok(1).mapBoth(v => v + 1, e => e)` 6. `err("x").mapBoth(v => v, e => e.length)` | 1. `Err("FAIL")`. 2. `Ok(1)` (unchanged). 3. `Ok(4)` (recovery). 4. `Ok(1)` (unchanged, `orElse` not called). 5. `Ok(2)`. 6. `Err(1)`. All pass `isResult()`. Covers BEH-03-002, BEH-03-003, BEH-03-007 | | | | | |
| OQ-022 | Safe extraction methods | 1. `ok(42).unwrapOr(0)` 2. `err("fail").unwrapOr(0)` 3. `err("fail").unwrapOrElse(e => e.length)` 4. `ok(42).toNullable()` 5. `err("fail").toNullable()` 6. `ok(42).intoTuple()` 7. `err("fail").intoTuple()` 8. `ok(42).merge()` 9. `err("fail").merge()` | 1. `42`. 2. `0`. 3. `4`. 4. `42`. 5. `null`. 6. `[null, 42]`. 7. `["fail", null]`. 8. `42`. 9. `"fail"`. Covers BEH-04-002, BEH-04-003, BEH-04-006, BEH-04-008, BEH-04-009 | | | | | |
| OQ-023 | Logical combinators and conversions | 1. `ok(1).and(ok(2))` 2. `err("a").and(ok(2))` 3. `ok(1).or(ok(2))` 4. `err("a").or(ok(2))` 5. `ok(1).flip()` 6. `ok(ok(1)).flatten()` 7. `ok(42).toOption()` 8. `err("fail").toOption()` | 1. `Ok(2)`. 2. `Err("a")`. 3. `Ok(1)`. 4. `Ok(2)`. 5. `Err(1)`. 6. `Ok(1)` (inner Result unwrapped). 7. `Some(42)` (passes `isOption()`). 8. `None`. All Results pass `isResult()`, all Options pass `isOption()`. Covers BEH-03-004, BEH-03-005, BEH-03-013, BEH-03-014, BEH-03-019 | | | | | |
| OQ-024 | `createErrorGroup` namespace and variants | 1. `const Errors = createErrorGroup("Auth")({ NotFound: ["id"], Forbidden: ["role", "required"] })` 2. `Errors.NotFound({ id: "123" })` 3. `Errors.Forbidden({ role: "viewer", required: "admin" })` 4. `Object.isFrozen(Errors.NotFound({ id: "x" }))` | 2. Returns `{ _tag: "Auth.NotFound", id: "123" }`. 3. Returns `{ _tag: "Auth.Forbidden", role: "viewer", required: "admin" }`. 4. `true` (frozen). The `_tag` field uses `namespace.variant` format. All error objects are frozen per INV-7. Covers BEH-08-003, INV-7 | | | | | |
| OQ-025 | `pipe()` and standalone function delegation | 1. `pipe(ok(10), map(x => x * 2), andThen(x => x > 15 ? ok(x) : err("too small")), unwrapOr(0))` 2. `pipe(ok(5), map(x => x * 2), andThen(x => x > 15 ? ok(x) : err("too small")), unwrapOr(0))` 3. Verify `map(f)(ok(1))` produces the same result as `ok(1).map(f)` for `f = x => x + 1` | 1. `20` (10 → 20 → Ok(20) → 20). 2. `0` (5 → 10 → Err("too small") → 0). 3. Both produce `Ok(2)`. Standalone functions delegate to instance methods per INV-14. Covers BEH-10-002, BEH-10-003, INV-14 | | | | | |
| OQ-026 | `unwrap` and `unwrapErr` functional behavior | 1. `import { unwrap, unwrapErr } from "@hex-di/result/unsafe"` 2. `unwrap(ok(42))` 3. `unwrapErr(err("fail"))` 4. `unwrap(err("fail"))` (in try/catch) 5. Inspect caught error | 1. Import succeeds from `/unsafe` subpath. 2. Returns `42`. 3. Returns `"fail"`. 4. Throws `UnwrapError`. 5. Error has `message` property and `context` property with `{ _tag: "Err", value: "fail" }`. Covers BEH-11-001, BEH-11-002, BEH-11-003, INV-12 | | | | | |
| OQ-027 | `structuredClone` brand loss verification | 1. `const r = ok(42)` 2. `const clone = structuredClone(r)` 3. `isResult(clone)` 4. `clone._tag` 5. `clone.value` | 3. `false` (brand symbol is not cloneable). 4. `"Ok"` (data preserved). 5. `42` (data preserved). The clone retains the data but loses the brand — it is a plain object, not a genuine Result. This is the expected behavior documented in DRR-3. Consumers must use `toJSON()`/`fromJSON()` for serialization boundaries. Covers BEH-13-003, DRR-3 | | | | | |
| OQ-028 | Async bridges on sync Result | 1. `ok(1).toAsync()` 2. `await ok(1).asyncMap(async v => v + 1)` 3. `await ok(1).asyncAndThen(async v => ok(v + 1))` 4. `await err("fail").asyncMap(async v => v + 1)` | 1. Returns `ResultAsync` (passes `isResultAsync()`). 2. `Ok(2)`. 3. `Ok(2)`. 4. `Err("fail")` (async map not called). All awaited results pass `isResult()`. Covers BEH-06-010 | | | | | |
| OQ-029 | `ResultAsync.Do` | 1. `await ResultAsync.Do.andThen(bind("a", () => ResultAsync.ok(1))).andThen(bind("b", () => ResultAsync.ok(2))).map(ctx => ctx.a + ctx.b)` 2. `await ResultAsync.Do.andThen(bind("a", () => ResultAsync.ok(1))).andThen(bind("b", () => ResultAsync.err("fail"))).map(ctx => ctx.a)` | 1. `Ok(3)`. 2. `Err("fail")`. Async Do notation accumulates context identically to sync Do notation. Covers BEH-12-007 | | | | | |

⁵ **OQ-010 implementation note**: `unwrap` is intentionally excluded from the main entry point (`index.ts`) to enforce the unsafe/safe separation described in [ADR-010](../decisions/010-unsafe-subpath.md). In v1.0.0, enforcement uses both mechanisms: named-export exclusion (omitting `unwrap` from `index.ts`) and `package.json` subpath export gating (`@hex-di/result/unsafe`). Both mechanisms satisfy INV-13 (Subpath Blocking). The tester should record the actual error message in the execution evidence. See [11-unsafe.md](../behaviors/11-unsafe.md) for the full unsafe API specification.

### Performance Qualification (PQ) Scenarios

> **PQ rationale for a utility library**: For a utility library consumed as GAMP 5 Category 3, PQ verifies that the library performs correctly under production-representative conditions (concurrency, scale, pipeline depth, audit trail integration) that exceed the isolated unit operations tested in OQ. The "real-world operating environment" for a library is the consumer application — these scenarios simulate realistic integration patterns including multi-field validation pipelines, bulk serialization, concurrent async operations, and audit trail workflows that a GxP consumer would encounter in production.

> **PQ-001 measurement prerequisite**: PQ-001 involves performance comparison and requires controlled measurement conditions for reproducible results. Execute using Vitest bench (or an equivalent benchmarking harness that provides warm-up iterations and statistical aggregation). Ensure no concurrent CPU-intensive workloads during measurement. Record the following as part of the execution evidence: benchmarking tool and version, iteration count, warm-up iteration count, and whether garbage collection was forced between runs. Median is used (rather than mean) to reduce sensitivity to GC pauses and JIT compilation outliers.

| # | Scenario | Traces To | Test Data | Steps | Acceptance Criteria |
|---|----------|-----------|-----------|-------|---------------------|
| PQ-001 | Validation pipeline (10 fields) | BEH-03-006, BEH-04-001, BEH-14-001 | Object with fields `field_01` through `field_10`. Valid input: each field set to `"value_NNN"` (e.g., `"value_001"`, ..., `"value_010"`). Invalid input: identical to valid input except `field_05` set to `""` (empty string). Validator: each field must be a non-empty string with `length <= 50`. Validation uses `andThen` chain, one step per field, returning `err("field_NN_empty")` or `err("field_NN_too_long")` on failure. | 1. Run equivalent try/catch pipeline 1 000 times with valid input, record median duration as baseline. 2. Run Result pipeline 1 000 times with valid input, record median duration. 3. Compute `(resultMedian - baseline) / baseline`. 4. Run both pipelines with invalid input; verify both reject with equivalent error referencing `field_05`. | Overhead ratio ≤ 0.05 (5%). Both pipelines produce identical accept/reject outcomes for the same inputs. Invalid input produces `Err("field_05_empty")` in the Result pipeline and an equivalent error in the try/catch pipeline. |
| PQ-002 | Error accumulation (`allSettled`) | BEH-05-002, INV-1 | Array of 100 Results: 60 `Ok(n)` + 40 `Err(string)` in deterministic interleaved order | 1. Call `allSettled(results)`. 2. Inspect returned `Err` array. | Err array length === 40. Every Err value matches the input error at the corresponding index. No Ok values appear in the Err array and vice versa. |
| PQ-003 | Async pipeline (5 service calls) | BEH-06-003, BEH-06-007, INV-2 | 5 `fromPromise` calls with deterministic data: call 1 resolves with `42`, call 2 resolves with `"hello"`, call 3 resolves with `true`, call 4 rejects with `Error("timeout")` mapped via `(e) => (e as Error).message`, call 5 rejects with `Error("network")` mapped via `(e) => (e as Error).message` | 1. Chain 5 async calls with `asyncAndThen`. 2. Await the final `ResultAsync`. 3. Register `process.on("unhandledRejection", ...)` before execution. | Final Result is `Err("timeout")` (first rejection at call 4). Zero `unhandledRejection` events. All 5 promises settle (no dangling). |
| PQ-004 | Serialization under load (10K results) | BEH-13-001, BEH-13-002, INV-1, INV-3, DRR-2 | Generate 5 000 `ok(i)` and 5 000 `err("e" + i)` for i in 0..4999 | 1. Call `toJSON()` on all 10 000 Results. 2. Call `fromJSON()` on all 10 000 serialized objects. 3. Compare restored values to originals. | All 10 000 restored Results pass `isResult()`. Restored Ok values equal originals (`===`). Restored Err errors equal originals (`===`). Zero `fromJSON` failures. |
| PQ-005 | Concurrent async Result creation | BEH-06-003, INV-2, INV-9 | 100 `fromPromise(Promise.resolve(i))` calls dispatched in a single event-loop tick via `Promise.all` | 1. Collect all 100 ResultAsync instances. 2. Await all with `Promise.all`. 3. Verify each resolved Result. | 100 distinct `Ok` Results. `result[i].value === i` for all i. All pass `isResult()`. No Results share identity (`result[i] !== result[j]` for i ≠ j). |
| PQ-006 | Long chain (50 `.map()` calls) | BEH-03-001, INV-1, INV-3 | `ok(0)` as seed; each `.map(x => x + 1)` | 1. Build chain of 50 `.map()` calls. 2. Extract final value. | Final value === 50. Result passes `isResult()`. Result is frozen. No `RangeError` (stack overflow). |
| PQ-007 | Mixed Ok/Err combinator | BEH-05-005 | Array of 200 Results: `ok(i)` for even i, `err(i)` for odd i, where i in 0..199 | 1. Call `partition(results)`. 2. Inspect both returned arrays. | Ok array has exactly 100 elements: `[0, 2, 4, ..., 198]`. Err array has exactly 100 elements: `[1, 3, 5, ..., 199]`. Order within each array matches input order. |
| PQ-008 | Generator early return | BEH-07-001, INV-4 | `safeTry` generator that increments a counter, yields an `Err`, then has a `finally` block that increments a cleanup counter | 1. Set `counter = 0`, `cleanup = 0`. 2. Run `safeTry(function* () { counter++; yield* err("stop"); counter++; })` with `finally { cleanup++; }` semantics in the generator body. 3. Inspect counters. | `counter === 1` (second increment never reached). `cleanup === 1` (finally block executed). Returned Result is `Err("stop")`. |
| PQ-009 | Audit trail integration (`inspect`/`inspectErr`/`andThrough`) | ATR-1, ATR-2, INV-5 | Pipeline of 3 validation steps; `inspect()` audit logger that records entries to an in-memory array; one scenario where the audit logger throws; one Err-path scenario using `inspectErr()` | 1. Run pipeline with successful audit writes using `inspect()`. 2. Verify all 3 audit entries recorded in order. 3. Run pipeline with audit logger that throws on the 2nd step. 4. Confirm the exception propagates (not suppressed). 5. Run Err-path with `inspectErr()` audit logger; verify error audit entry recorded. 6. Verify neither `andTee()` nor `orTee()` is used for any audit-critical write. | All successful audit entries recorded in pipeline order. Failed audit write via `inspect()` propagates as an exception to the caller. Pipeline does not silently swallow the audit failure. Err-path audit entry recorded via `inspectErr()`. Zero uses of `andTee()` or `orTee()` for audit-critical operations. |
| PQ-010 | Version upgrade revalidation workflow | DRR-2, IQ-001, IQ-002, OQ-001–OQ-029 | Two installed versions of the library: the "current" validated version (V_old) and the "target" upgrade version (V_new, a minor version bump). A set of 20 serialized Result JSON objects (10 Ok, 10 Err) created with V_old and stored as a JSON fixture file. | 1. **Pre-upgrade baseline**: With V_old installed, deserialize all 20 fixtures via `fromJSON()`; record each restored value/error as the expected baseline. 2. **IQ re-execution**: Install V_new; execute IQ-001 (version match) and IQ-002 (correct version reported). 3. **DRR-2 regression**: With V_new installed, deserialize the same 20 fixtures via `fromJSON()`; verify each restored value/error matches the pre-upgrade baseline exactly (`===` for primitives, deep equality for objects). Verify all 20 pass `isResult()` and `Object.isFrozen()`. 4. **OQ re-execution**: Execute full OQ suite (OQ-001 through OQ-029) against V_new. 5. **Traceability verification**: Run `scripts/verify-traceability.sh` and confirm 100% forward/backward traceability with 0 orphans. | IQ-001 and IQ-002 pass with V_new version. All 20 fixtures deserialize identically under V_new as under V_old (zero regressions). All 20 restored Results pass `isResult()` and are frozen. Full OQ suite passes. Traceability report shows 100%/100%/0/0. This validates the [Revalidation Scope](#revalidation-scope-for-v1x-upgrades) procedure for minor version upgrades. |
| PQ-011 | Option serialization under load (5K options) | BEH-09-009, BEH-09-010, DRR-4, INV-10, INV-11 | Generate 2 500 `some(i)` and 2 500 `none()` for i in 0..2499 | 1. Call `toJSON()` on all 5 000 Options. 2. Call `fromOptionJSON()` on all 5 000 serialized objects. 3. Compare restored values to originals. | All 5 000 restored Options pass `isOption()`. All restored Options are `Object.isFrozen()`. Restored Some values equal originals (`===`). All `none()` restore to None (`_tag === "None"`). Zero `fromOptionJSON` failures. |
| PQ-012 | Creation factory validation pipeline | BEH-02-003, BEH-02-004, INV-1 | Object with 5 nullable fields (`name`, `email`, `age`, `role`, `department`). Valid input: all fields non-null with `name = "Alice"`, `email = "a@b.com"`, `age = 30`, `role = "admin"`, `department = "QA"`. Invalid input: `age = null`, all others valid. Each field validated via `fromNullable` then narrowed via `fromPredicate` (e.g., age must be > 0). | 1. Run pipeline with valid input using `andThen` chain: `fromNullable(name, ...).andThen(() => fromNullable(email, ...)).andThen(() => fromPredicate(age, ...))` etc. 2. Verify result is `Ok` containing all 5 validated fields. 3. Run pipeline with invalid input. 4. Verify result is `Err` referencing the `age` field. 5. Repeat 1 000 times with valid input; verify all results frozen and branded. | Valid input produces `Ok` with all 5 fields. Invalid input produces `Err` at the first null field (`age`). All 1 000 repeated Results pass `isResult()` and `Object.isFrozen()`. Creation factories integrate correctly in a multi-step validation pipeline. |
| PQ-013 | `pipe()` standalone function pipeline (10 steps) | BEH-10-002, INV-14 | Seed value `ok(1)`. Pipeline of 10 standalone function steps: `map(x => x + 1)`, `map(x => x * 2)`, `andThen(x => x > 0 ? ok(x) : err("negative"))`, `map(String)`, `andThen(s => s.length > 0 ? ok(s) : err("empty"))`, `map(s => s + "!")`, `map(s => s.toUpperCase())`, `inspect(noop)`, `map(s => ({ formatted: s }))`, `unwrapOr({ formatted: "default" })`. | 1. Execute `pipe(ok(1), ...10 steps)`. 2. Verify final extracted value. 3. Execute same pipeline with `err("start")` as seed. 4. Verify `unwrapOr` default is returned. 5. For each of the 8 transformation steps, verify `standaloneF(args)(result)` produces the same output as `result.method(args)` for a sample input. | Step 1: Final value is `{ formatted: "4!" }` (1 → 2 → 4 → "4" → "4" → "4!" → "4!" → "4!" → { formatted: "4!" } → extracted). Step 3: Returns `{ formatted: "default" }`. Step 5: All 8 delegation checks pass — standalone functions produce identical results to instance methods, confirming INV-14. |
| PQ-014 | Error recovery pipeline (`orElse`/`mapErr`) | BEH-03-002, BEH-03-007, INV-1 | Three fallback data sources: `primary()` returns `err("primary_down")`, `secondary()` returns `err("secondary_down")`, `tertiary()` returns `ok("data_from_tertiary")`. Error mapper: `mapErr(e => ({ source: "all", errors: [e] }))`. | 1. Build recovery chain: `primary().orElse(() => secondary()).orElse(() => tertiary())`. 2. Verify final result. 3. Build chain where all three fail: `primary().orElse(() => secondary()).orElse(() => err("tertiary_down"))`. 4. Apply `mapErr` to the final error. 5. Repeat recovery chain 500 times; verify all results frozen and branded. | Step 2: `Ok("data_from_tertiary")` — recovery succeeded at third attempt. Step 4: `Err({ source: "all", errors: ["tertiary_down"] })`. Step 5: All 500 Results pass `isResult()` and `Object.isFrozen()`. `orElse` correctly skips recovery on `Ok` and applies recovery on `Err`. `mapErr` transforms the final error without affecting `Ok` variants. |

## Training Guidance

Per EU GMP Annex 11.2, personnel involved in GxP-regulated systems must receive training appropriate to their role. The following guidance covers training requirements for teams using `@hex-di/result` in validated environments.

### Developer Onboarding

Developers writing code that uses `@hex-di/result` should understand:

| Topic | Key Points | Spec Reference |
|-------|-----------|----------------|
| Result pattern fundamentals | `Ok`/`Err` discriminated union, `_tag` discriminant, explicit error handling | [01-types-and-guards.md](../behaviors/01-types-and-guards.md) |
| Immutability guarantees | All Results are `Object.freeze()`d; shallow freeze only — nested values require deep freeze pattern | [INV-1](../invariants.md#inv-1-frozen-result-instances), [ALCOA+ Gap](#alcoa-gap-shallow-freeze) |
| Brand validation | Why `isResult()` exists, why structural look-alikes fail validation | [INV-3](../invariants.md#inv-3-brand-symbol-prevents-forgery), [ADR-002](../decisions/002-brand-symbol-validation.md) |
| Error creation patterns | `createError()`, `createErrorGroup()`, `const` type parameters, frozen output | [08-error-patterns.md](../behaviors/08-error-patterns.md) |
| Serialization boundaries | `toJSON()`/`fromJSON()` round-trip; `structuredClone` strips brand and methods | [13-interop.md](../behaviors/13-interop.md), [Data Retention Guidance](#data-retention-guidance) |

### GxP Consumer Training

Quality Assurance and validation personnel should understand the library's safety properties without needing to read source code:

| Topic | Key Points | Spec Reference |
|-------|-----------|----------------|
| Invariant guarantees | 14 runtime invariants (INV-1 through INV-14), what each protects | [invariants.md](../invariants.md) |
| ALCOA+ mapping | How library features support each ALCOA+ principle | [ALCOA+ Compliance Mapping](#alcoa-compliance-mapping) |
| IQ/OQ/PQ execution | How to run the qualification checklists | [Validation Templates](#validation-templates) |
| Version pinning | Why exact version pinning is required, revalidation on upgrade | [Version Pinning for GxP](#version-pinning-for-gxp) |
| GAMP 5 classification | Category 3 (as-is) vs Category 5 (modified) and corresponding validation burden | [GAMP 5 Classification](#gamp-5-classification) |

### Audit Logging: `inspect`/`inspectErr` vs `andTee`/`orTee`

This distinction is **critical** for GxP compliance and must be covered in developer training. See [ATR-1, ATR-2, ATR-3](#normative-requirements) for the normative requirements.

| Method | Failure Behavior | When to Use |
|--------|-----------------|-------------|
| `inspect(f)` | Exception **propagates** — caller is notified of failure | Ok-path audit-critical logging, regulatory record-keeping |
| `inspectErr(f)` | Exception **propagates** — caller is notified of failure | Err-path audit-critical logging, regulatory record-keeping |
| `andTee(f)` | Exception **suppressed** — caller receives original Result | Non-critical Ok-path logging, metrics, telemetry — **PROHIBITED** for audit-critical operations per ATR-1 |
| `orTee(f)` | Exception **suppressed** — caller receives original Result | Non-critical Err-path logging, metrics, telemetry — **PROHIBITED** for audit-critical operations per ATR-1 |
| `andThrough(f)` | Returns `Err` from `f` — failure is a typed Result error | Audit validation that should short-circuit the pipeline |

**Training requirement**: Every developer working on GxP-regulated code must be able to explain why `andTee`/`orTee` are prohibited for audit logging (ATR-1) and when to use `inspect`/`inspectErr` or `andThrough` instead (ATR-2). See [Audit Trail Requirements](#audit-trail-requirements) and [ADR-006](../decisions/006-error-swallowing-in-tee.md).

### Competency Assessment

Training must include an objective assessment to verify understanding of GxP-relevant library behavior. The following minimum criteria apply:

#### Assessment Format

| Role | Assessment Method | Pass Threshold |
|------|------------------|----------------|
| Developer | Scenario-based quiz (written) + code review exercise | 100% on GxP-critical questions; ≥ 80% overall |
| QA / Validation | Scenario-based quiz (written) | ≥ 80% overall |

#### Required Assessment Questions (Minimum)

The assessment must include at least one question from each of the following GxP-critical areas:

1. **Audit logging safety**: Given a code snippet using `andTee` or `orTee` for audit logging, identify the compliance risk and select the correct alternative (`inspect`/`inspectErr` or `andThrough`). *This question requires a correct answer to pass.*
2. **Immutability awareness**: Given `ok({ patient: { id: "P-001" } })`, explain whether `result.value.patient.id = "P-002"` succeeds or fails and why. Identify the mitigation (deep freeze). *This question requires a correct answer to pass.*
3. **Brand validation**: Explain why `isResult({ _tag: "Ok", value: 42 })` returns `false` and why this matters for data integrity.
4. **Serialization boundaries**: Identify which serialization method preserves Result brand (`toJSON`/`fromJSON`) and which does not (`structuredClone`).
5. **Version pinning**: Explain why `"^1.2.3"` is unsuitable for GxP and what the correct pinning strategy is.

#### Failed Assessment Remediation

If a trainee does not meet the pass threshold:

1. **Immediate restriction**: The trainee must not author or review GxP-critical code until re-assessment is passed
2. **Remediation training**: Targeted training on the failed topic areas, delivered by a qualified trainer, before re-assessment is scheduled
3. **Re-assessment**: Must use different questions from the initial assessment while covering the same GxP-critical areas. Re-assessment may be attempted no sooner than 5 business days after remediation training
4. **Maximum retries**: Two re-assessment attempts are permitted. After two consecutive failures, escalate to QA management for individualized training plan
5. **Records**: All failed assessments, remediation training, and re-assessment outcomes must be documented in the quality management system

#### Code Review Exercise (Developers Only)

Developers must demonstrate correct usage in a supervised code review. The reviewer verifies:

- [ ] No use of `andTee` or `orTee` for audit-critical side effects
- [ ] Appropriate use of `inspect`/`inspectErr` or `andThrough` for GxP logging
- [ ] Deep freeze applied to nested GxP data before wrapping with `ok()`/`err()`
- [ ] `toJSON()`/`fromJSON()` used at serialization boundaries (not `structuredClone`)

### Training Records

Training evidence should be maintained per the organization's quality management system. Recommended records:

- Completion date and trainer/trainee identification (Attributable, Contemporaneous)
- Topics covered, mapped to the tables above
- Assessment score and individual question outcomes (pass/fail per question)
- Code review exercise outcome (developers only): reviewer name, date, checklist result
- Refresher schedule: annually or upon major version upgrade, whichever comes first

### Implementation Status

The Training Guidance section above (including the [Competency Assessment](#competency-assessment), [Sample Assessment Questionnaire](#sample-assessment-questionnaire), and [Training Records](#training-records)) provides consumer-facing templates. These templates are designed for organizations adopting `@hex-di/result` in GxP-regulated environments — the library project itself does not execute these training procedures.

**v1.0.0 self-assessment requirement**: Before the v1.0.0 release, the library maintainers must complete a self-assessment against the [Sample Assessment Questionnaire](#sample-assessment-questionnaire) to verify that the templates are executable and that the questions accurately reflect the library's behavior. The self-assessment outcome is recorded in the [Review History](../process/ci-maintenance.md#review-history).

**Self-assessment completed** (REV-2026-008, 2026-02-15): All 5 questionnaire answers verified correct against the specification. Score: 5/5 (100%). Both mandatory-pass questions (Q1: audit logging safety, Q2: immutability awareness) answered correctly. No questionnaire corrections required. See [Review History](../process/ci-maintenance.md#review-history) entry REV-2026-008 for full verification evidence.

### Sample Assessment Questionnaire

The following template satisfies the [Competency Assessment](#competency-assessment) requirements. Organizations may adapt this template to their quality management system.

**Instructions**: Answer all 5 questions. Questions marked with **(Critical)** require a correct answer to pass regardless of overall score.

---

**Q1. Audit Logging Safety** **(Critical)**

A developer writes the following code in a GxP-regulated module:

```typescript
result.andTee(value => auditLog.write(value));
```

(a) This code is compliant because `andTee` executes the callback for every `Ok` value.
(b) This code violates ATR-1 because `andTee` suppresses exceptions — a failed audit write would be silently swallowed. The correct alternatives are `inspect()` or `andThrough()`.
(c) This code is compliant because audit logging is a side effect, and `andTee` is designed for side effects.
(d) This code violates ATR-3 because `andTee` should only be used with `Err` values.

**Correct answer**: (b)

---

**Q2. Immutability Awareness** **(Critical)**

Given the following code:

```typescript
const r = ok({ patient: { id: "P-001" } });
r.value.patient.id = "P-002";
```

What happens and why?

(a) A `TypeError` is thrown because the Result is frozen and all nested properties are immutable.
(b) The mutation succeeds (`r.value.patient.id === "P-002"`) because `Object.freeze()` is shallow — it freezes the Result shell but not nested objects. GxP consumers must deep-freeze values before wrapping.
(c) The mutation is silently ignored — the value remains `"P-001"`.
(d) A compile-time TypeScript error prevents this code from running.

**Correct answer**: (b)

---

**Q3. Brand Validation**

Why does `isResult({ _tag: "Ok", value: 42 })` return `false`?

(a) The `_tag` must be lowercase `"ok"`, not `"Ok"`.
(b) The object lacks the internal `RESULT_BRAND` symbol that only `ok()` and `err()` attach. `isResult()` checks for this symbol, not structural shape. This prevents forged Results from passing validation, supporting ALCOA+ "Accurate".
(c) `isResult` only works with `Err` variants, not `Ok` variants.
(d) The value `42` is not a valid Result value type.

**Correct answer**: (b)

---

**Q4. Serialization Boundaries**

Which serialization method preserves the Result brand for cross-boundary transfer?

(a) `structuredClone(result)` — preserves all properties including symbols.
(b) `JSON.parse(JSON.stringify(result))` — standard JSON round-trip.
(c) `toJSON()` followed by `fromJSON()` — the library's dedicated serialization that restores a branded, frozen Result.
(d) `postMessage(result)` — browser message passing preserves brands.

**Correct answer**: (c)

---

**Q5. Version Pinning**

A GxP system's `package.json` contains `"@hex-di/result": "^1.2.3"`. Is this acceptable?

(a) Yes — the caret allows compatible minor and patch updates, which is standard practice.
(b) No — GxP requires exact version pinning (`"1.2.3"` without caret) because any version change, even a patch, requires revalidation. The caret allows automatic upgrades that bypass the change control process.
(c) Yes — as long as the lock file is committed, the caret is irrelevant.
(d) No — GxP requires using `"latest"` to always have the most secure version.

**Correct answer**: (b)

> **Scoring note for Q5**: Answer (c) reflects a common misconception. While a committed lock file does pin the exact resolved dependency tree, the `package.json` declaration should explicitly communicate the validated version to auditors and other developers. A caret range (`^1.2.3`) creates ambiguity about the *intent* to pin — it signals "compatible upgrades are acceptable," which conflicts with GxP change control requirements. The lock file is a necessary *complementary* control (it prevents silent resolution drift), but it does not substitute for explicit version pinning in `package.json`. Both exact pinning *and* a committed lock file are required.

---

**Scoring Rubric**:

| Criterion | Requirement |
|-----------|-------------|
| Q1 (Audit Logging Safety) | Must answer correctly — **mandatory pass** |
| Q2 (Immutability Awareness) | Must answer correctly — **mandatory pass** |
| Q3–Q5 | Standard scoring |
| **Overall pass threshold** | 100% on Q1 and Q2, ≥ 80% overall (4 out of 5 correct) |

**Pass/fail determination**: A trainee passes if and only if (1) both Q1 and Q2 are answered correctly AND (2) at least 4 out of 5 questions total are answered correctly. Failure on either Q1 or Q2 results in automatic failure regardless of overall score.

## Document State Lifecycle

Specification files in `spec/result/` follow a defined state lifecycle per EU GMP Annex 11.10 and GAMP 5 document management requirements. Git and GitHub PRs serve as the document control system.

### States

| State | Definition | How to Identify |
|-------|-----------|-----------------|
| **Draft** | Under development, not approved for use | Exists on a feature branch (not `main`), or in an open PR |
| **In Review** | Submitted for peer review | Open PR with at least one reviewer requested; GitHub PR state is "open" |
| **Approved** | Reviewed and merged to `main` | Merge commit exists on `main`; `git log --merges --first-parent main -- <file>` shows the merge |
| **Effective** | Part of a tagged release baseline | A release tag (`vX.Y.Z`) exists on or after the merge commit; `git tag --contains <merge-sha>` returns a version tag |
| **Superseded** | Replaced by a newer approved version | A subsequent merge commit modifies the same file; the earlier version remains in Git history |
| **Obsolete** | Retired without replacement; no longer valid for any purpose | The file has been deleted from `main` (e.g., a behavior spec for a removed feature). The content remains accessible in Git history via `git show <last-commit>:<file-path>`. The deletion commit message must state the reason for obsolescence and confirm no replacement document exists |

### Determining Document State at a Historical Date

For GxP audits, the following commands determine which specification version was effective at any point in time:

```bash
# Which version of a spec was effective on a given date?
git log --until="2025-06-15" --first-parent main -1 -- spec/result/behaviors/01-types-and-guards.md

# Was this spec part of a released baseline at that date?
COMMIT=$(git log --until="2025-06-15" --first-parent main -1 --format="%H" -- spec/result/behaviors/01-types-and-guards.md)
git tag --contains "$COMMIT" | head -1

# Full state history of a spec file
git log --follow --first-parent main --format="%H %ai %an: %s" -- spec/result/behaviors/01-types-and-guards.md
```

### Policy

1. No specification file reaches "Approved" state without a merged PR (direct pushes to `main` are blocked)
2. Every PR constitutes a state transition record: Draft → In Review (PR opened) → Approved (PR merged)
3. Release tags mark the transition from Approved to Effective
4. Git history is immutable — force-pushes to `main` are prohibited, preserving the full state transition audit trail
5. Superseded versions remain accessible via `git show <commit>:<file-path>` for the full retention period
6. Obsolete documents are deleted from `main` with a commit message documenting the reason — Git history preserves the content for the full retention period

## Support Lifecycle

| Version | Status | Support Until | Notes |
|---------|--------|---------------|-------|
| 1.x | **LTS** | 2 years after 2.0 release | Initial GA release. Security + critical bug fixes |
| 2.x | Current (planned) | Active development | New features |

### Revalidation Scope for v1.x Upgrades

| Upgrade Type | Revalidation Scope | Rationale |
|-------------|-------------------|-----------|
| v1.x.Y → v1.x.Z (patch) | Targeted: re-run OQ tests affected by the fix; verify IQ-001, IQ-002 | Patches fix bugs without API changes |
| v1.x → v1.y (minor) | Full OQ + PQ re-execution; verify all IQ checks | Minor versions may add API surface but do not remove or change existing APIs |
| v1.x → v2.0 (major) | Full IQ + OQ + PQ re-execution; review migration guide; update Configuration Specification | Major version with potential breaking changes |

**Invariant stability**: The 14 runtime invariants (INV-1 through INV-14) are stable as of v1.0.0. Any invariant change requires a major version bump and is flagged as a breaking change requiring GxP impact assessment.

### Deprecation Policy

1. Deprecated APIs are marked with `@deprecated` JSDoc tag
2. Deprecated APIs emit console warnings in development mode only (not production)
3. Deprecated APIs are removed in the next major version
4. Minimum deprecation period before removal:
   - **12 months** for GxP-critical APIs: any API referenced by an ATR-N or DRR-N requirement, and any API guarding a High-risk invariant (INV-1, 3, 5, 7, 10, 11)
   - **6 months** for all other APIs
5. Migration guides are published for all breaking changes

> **GxP rationale**: The 12-month deprecation period for GxP-critical APIs reflects the longer change control cycles in regulated environments. GxP consumers typically require 6–9 months for impact assessment, revalidation planning, IQ/OQ/PQ re-execution, and change control documentation. A 6-month window is insufficient for these activities when the deprecated API is part of an audit trail or data retention pathway.

### End-of-Life Notification

When a major version approaches end-of-life (EOL), GxP consumers will be notified through the following mechanisms to ensure adequate time for migration planning:

| Timeline | Notification | Channel |
|----------|-------------|---------|
| 12 months before EOL | **EOL pre-announcement** | GitHub Security Advisory published for the version branch; CHANGELOG entry in the successor version; GitHub Discussion pinned to the repository |
| 6 months before EOL | **EOL deprecation warning** | `console.warn` emitted once per process in development mode (`NODE_ENV !== "production"`) when the library is imported, stating the EOL date and successor version |
| EOL date | **EOL announcement** | GitHub Security Advisory updated to "end of life"; repository README updated; npm `deprecated` flag set on the EOL major version |

**Post-EOL support policy**:

- **Security fixes**: Critical security defects (brand validation bypass, freeze failure) affecting archived data integrity will receive best-effort patches for 6 months after EOL. These are published as final patch releases on the EOL branch.
- **`gxp-critical` issues**: Issues filed with the `gxp-critical` label against an EOL version will receive best-effort triage, but the [Response Targets](#response-targets) no longer apply. Consumers are encouraged to migrate to the successor version or maintain an internal fork.
- **No new features**: No new functionality is added to an EOL version.
- **Archived data compatibility**: Per DRR-2, the successor version's `fromJSON()` will continue to accept the EOL version's serialization format. Archived data created with the EOL version remains deserializable indefinitely.

> **GxP consumer action**: Upon receiving the 12-month pre-announcement, GxP consumers should initiate their change control process for migration to the successor version. The 12-month window is designed to accommodate the typical GxP change control cycle (impact assessment, revalidation planning, IQ/OQ/PQ execution, documentation, and approval). Consumers with retention periods exceeding the LTS window should plan for internal fork maintenance or confirm that the successor version's DRR-2 backward compatibility covers their archived data formats.

### Version Pinning for GxP

GxP organizations should:
- Pin to an exact version (`"@hex-di/result": "1.2.3"`, not `"^1.2.3"`)
- Lock the dependency tree (`pnpm-lock.yaml` or `package-lock.json` committed)
- Revalidate when upgrading to any new version (even patches)
- Document the validated version in the system's Configuration Specification

## Supplier Assessment Guidance

Per EU GMP Annex 11.3, GxP organizations using `@hex-di/result` should assess the library and its maintainer as a supplier. Because the library is open-source and consumed as GAMP 5 Category 3 (non-configured COTS), the assessment focuses on verifiable quality indicators rather than traditional supplier audits.

### Quality Indicators for Assessment

| Indicator | How to Verify | Evidence Location |
|-----------|---------------|-------------------|
| Source code availability | Full source code is publicly available on GitHub | Repository URL in [overview.md](../overview.md) |
| Formal specifications | 14 behavior specs, 14 invariants, 13 ADRs | `spec/result/behaviors/`, `spec/result/invariants.md`, `spec/result/decisions/` |
| Test evidence | 6-level test pyramid with CI enforcement | CI pipeline results on GitHub (public); [test-strategy.md](../process/test-strategy.md) |
| Mutation testing | 90% mutation score threshold | Stryker reports in CI artifacts |
| Zero production dependencies | No transitive supply chain risk | `npm ls @hex-di/result --all` (IQ-006) |
| Change control process | Conventional commits, PR-based workflow, changesets | [ci-maintenance.md](../process/ci-maintenance.md) |
| GxP compliance documentation | This document (ALCOA+, 21 CFR Part 11, EU Annex 11 mappings) | `spec/result/compliance/gxp.md` |
| Defect reporting channel | GitHub Issues with `gxp-critical` label | See [GxP Incident Reporting](#gxp-incident-reporting) |
| Release notification | GitHub Releases, npm version notifications | Repository watch / npm subscribe |
| Version stability | LTS commitment (v1.x), deprecation policy | [Support Lifecycle](#support-lifecycle), [Deprecation Policy](#deprecation-policy) |

### Consumer Supplier Assessment Checklist

The following checklist template can be adapted to the organization's quality management system:

- [ ] **Source code reviewed**: Library source code has been inspected and is consistent with the documented specifications
- [ ] **Specifications reviewed**: Behavior specs, invariants, and ADRs have been reviewed for completeness and relevance to the intended use
- [ ] **Test evidence reviewed**: CI pipeline results confirm all 6 test levels pass for the validated version
- [ ] **GAMP 5 classification confirmed**: Library is used as Category 3 (non-configured COTS) — no source code modifications
- [ ] **Zero dependencies confirmed**: `npm ls @hex-di/result --all` shows no production dependencies
- [ ] **GxP compliance mapping reviewed**: ALCOA+, 21 CFR Part 11, and EU Annex 11 mappings in this document have been assessed for applicability to the consumer's regulated system
- [ ] **Defect reporting channel identified**: GitHub Issues with `gxp-critical` label (see [GxP Incident Reporting](#gxp-incident-reporting))
- [ ] **Version pinned**: Exact version pinned in `package.json`; lock file committed
- [ ] **IQ/OQ executed**: Consumer has executed the [IQ](#installation-qualification-iq-checklist) and [OQ](#operational-qualification-oq-test-scripts) checklists for the validated version
- [ ] **Update notification configured**: Consumer is subscribed to GitHub Releases or npm version notifications for `@hex-di/result`

### Open-Source Supplier Assessment Considerations

Traditional supplier audits (on-site visits, quality agreements, audit reports) are not applicable to open-source libraries. The following compensating controls address EU Annex 11.3 requirements:

| Traditional Requirement | Open-Source Equivalent |
|------------------------|----------------------|
| Supplier quality agreement | MIT license + this compliance document + formal specifications |
| On-site audit | Source code audit (code is fully public and auditable) |
| Supplier audit report | CI pipeline results + mutation testing reports + this compliance review |
| Change notification agreement | GitHub watch notifications + npm version alerts + CHANGELOG |
| Escalation contacts | GitHub Issues with `gxp-critical` label |

> **Auditor guidance**: If a regulatory inspector asks about supplier assessment for `@hex-di/result`, point to this section and the completed Consumer Supplier Assessment Checklist in the organization's quality management system. The combination of public source code, formal specifications, comprehensive testing, and this compliance document provides supplier assessment evidence proportionate to the GAMP 5 Category 3 classification.

## GxP Incident Reporting

GxP consumers who discover defects that may affect data integrity, immutability, brand validation, or audit trail reliability should report them through the following channel.

### Reporting Process

| Step | Action | Responsible |
|------|--------|-------------|
| 1 | Create a GitHub Issue at the repository URL listed in [overview.md](../overview.md) | Consumer |
| 2 | Add the `gxp-critical` label to the issue | Consumer |
| 3 | Include the following in the issue body: library version, Node.js version, TypeScript version, minimal reproduction, description of the data integrity impact | Consumer |
| 4 | Maintainer triages within the response targets below | Maintainer |
| 5 | Fix is published as a patch release with a changeset | Maintainer |
| 6 | Consumer is notified via GitHub Issue notification and npm version alert | Automated |

### Response Targets

| Severity | Definition | Triage Target | Fix Target |
|----------|-----------|---------------|------------|
| **Critical** | Brand validation bypass, freeze failure, silent error suppression in `inspect`/`andThrough`, `fromJSON` data loss | Acknowledge within 48 hours | Patch release within 7 calendar days |
| **Major** | Incorrect behavior in a documented invariant (INV-1 through INV-14) that does not directly enable data loss | Acknowledge within 5 business days | Patch release within 30 calendar days |
| **Minor** | Documentation error in compliance mappings, incorrect test specification | Acknowledge within 10 business days | Fix in next scheduled release |

> **Scope**: These targets apply to defects in the library itself, not to consumer-side integration issues. Consumer-specific questions about GxP adoption patterns are handled through standard GitHub Discussions, not the `gxp-critical` issue channel.

### Escalation Procedure

If a response target is not met, the following escalation path applies:

| Elapsed Time | Consumer Action |
|-------------|----------------|
| 1× target elapsed (e.g., 48h for Critical triage) | Add the `escalation` label to the GitHub Issue. Comment with the elapsed time and restate the data integrity impact. |
| 2× target elapsed (e.g., 96h for Critical triage) | Implement compensating controls in the consumer's system (e.g., version rollback to last validated version, feature isolation, manual workaround). Document the compensating controls in the consumer's CAPA process per EU Annex 11.13. |
| 3× target elapsed | Treat the defect as unresolvable by the library maintainer for planning purposes. The consumer's QA management must make a formal risk acceptance decision per ICH Q9 Section 6 (Risk Control), documenting the residual risk, compensating controls in place, and whether continued use of the library is acceptable pending a fix. |

> **Note**: These escalation steps are guidance for the consumer — the library maintainer commits to the response targets in good faith but, as an open-source project, cannot provide contractual SLAs. Consumers with strict SLA requirements should evaluate whether the open-source support model is compatible with their quality management system, and consider maintaining an internal fork as a contingency per [GAMP 5 Classification](#gamp-5-classification) (Category 5 if modified).

### Consumer Notification

GxP consumers should configure at least one of the following notification mechanisms to receive timely alerts about library defects:

1. **GitHub Watch**: Watch the repository with "Releases" notifications enabled
2. **npm update alerts**: Use `npm outdated` or Renovate/Dependabot to detect new versions
3. **GitHub Security Advisories**: The repository will publish GitHub Security Advisories for any defect that affects data integrity (High-risk invariants INV-1, 3, 5, 7, 10, 11)

### Relationship to Consumer Incident Management

This reporting channel covers defects **in the library**. GxP consumers must maintain their own incident management procedures (per EU Annex 11.13) for incidents in their regulated systems that happen to involve `@hex-di/result`. The consumer's incident investigation should determine whether the root cause is in the library (report upstream via `gxp-critical`) or in the consumer's integration code (handle per the consumer's CAPA process).
