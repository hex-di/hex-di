---
document_id: SPEC-RT-BEH-004
title: "04 — GxP Test Utilities"
version: "1.2.2"
status: Approved
author: Mohammad AL Mechkor
created: 2026-02-15
last_reviewed: 2026-02-15
gamp_category: 5
classification: Functional/Design Specification
parent_spec: "spec/packages/result/testing/overview.md"
approval_history:
  - role: Author
    name: hex-di
    date: 2026-02-15
  - role: Technical Reviewer
    name: hex-di
    date: 2026-02-15
  - role: QA Reviewer
    name: hex-di
    date: 2026-02-15
compensating_controls:
  - "CI pipeline enforces >95% line coverage and >90% branch coverage gates"
  - "Type-level tests (vitest typecheck) verify all public API contracts"
  - "Traceability verification script blocks PRs with orphaned specs or tests"
  - "All changes require PR merge to main with passing CI"
segregation_of_duties_note: >
  Single-contributor project. Author, Technical Reviewer, and QA Reviewer
  roles are held by the same individual. Compensating controls above
  provide automated independent verification. This constraint is accepted
  per ICH Q9 risk-based approach for a GAMP 5 testing utility library.
revision_history:
  - version: "1.2.2"
    date: 2026-02-15T13:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP spec review remediation: updated classification from Functional Specification to Functional/Design Specification per Finding 5 (GAMP 5 classification accuracy)"
  - version: "1.2.1"
    date: 2026-02-15T12:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP spec review remediation: standardized document ID from SPEC-RT-BEH-04 to SPEC-RT-BEH-004 (Finding 4)"
  - version: "1.2.0"
    date: 2026-02-15T11:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP spec review remediation: added design note documenting rationale for no expectImmutableOption compound utility (Finding 6)"
  - version: "1.1.0"
    date: 2026-02-15T09:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP remediation: added compensating controls (Finding 1), Prerequisites and Error Handling section documenting required imports, import failure behavior, and version compatibility (Finding 4), version bump"
  - version: "1.0.0"
    date: 2026-02-15T08:00:00Z
    author: Mohammad AL Mechkor
    changes: "Initial approved version"
---

# 04 — GxP Test Utilities

Verification utilities for GxP compliance testing. These functions assert the structural and behavioral properties required by `@hex-di/result`'s invariants: immutability, brand integrity, and promise safety.

See [`@hex-di/result` invariants](../../invariants.md) and [`@hex-di/result` GxP compliance](../../compliance/gxp.md) for the requirements these utilities help verify.

## Prerequisites and Error Handling

### Required Imports

All GxP test utilities depend on `@hex-di/result` for brand symbols and type guards. The following imports are required:

| Import | Source | Used By |
| ------ | ------ | ------- |
| `RESULT_BRAND` | `@hex-di/result` | `expectResultBrand`, `expectImmutableResult` |
| `OPTION_BRAND` | `@hex-di/result` | `expectOptionBrand` |
| `isResult` | `@hex-di/result` | `expectNeverRejects` |
| `Result`, `ResultAsync`, `Option` | `@hex-di/result` (types) | All utilities (type signatures) |

### Behavior on Import Failure

If `@hex-di/result` is not installed or cannot be resolved, the GxP utilities module (`gxp.ts`) will fail at import time with a standard Node.js `ERR_MODULE_NOT_FOUND` error. This is the expected behavior — no fallback or degraded mode is provided.

| Failure Scenario | Behavior | Error |
| ---------------- | -------- | ----- |
| `@hex-di/result` not installed | Module fails to load at import time | `ERR_MODULE_NOT_FOUND: Cannot find package '@hex-di/result'` |
| `RESULT_BRAND` not exported (incompatible version) | Named import fails at import time | `SyntaxError: The requested module '@hex-di/result' does not provide an export named 'RESULT_BRAND'` |
| `OPTION_BRAND` not exported (incompatible version) | Named import fails at import time | `SyntaxError: The requested module '@hex-di/result' does not provide an export named 'OPTION_BRAND'` |
| `isResult` not exported (incompatible version) | Named import fails at import time | `SyntaxError: The requested module '@hex-di/result' does not provide an export named 'isResult'` |

**Rationale**: Fail-fast at import time is preferable to runtime surprises. A clear import error immediately identifies the missing dependency, whereas a deferred check could produce confusing failures deep inside a test suite.

### Version Compatibility

The GxP utilities are designed to work with `@hex-di/result` versions that export the following public API surface:

- `RESULT_BRAND` (symbol) — exported since v0.2.0
- `OPTION_BRAND` (symbol) — exported since v0.2.0
- `isResult(value)` (type guard) — exported since v0.2.0
- `Result<T, E>`, `ResultAsync<T, E>`, `Option<T>` (types) — exported since v0.2.0

The `@hex-di/result-testing` package declares `@hex-di/result` as a peer dependency. The workspace configuration ensures the same version is used at development time. Consumers must ensure their installed `@hex-di/result` version is compatible (see `peerDependencies` in `package.json`).

**Breaking change policy**: If a future version of `@hex-di/result` removes or renames any of the imports above, the corresponding `@hex-di/result-testing` version will be updated with a major version bump.

## BEH-T04-001: expectFrozen(value)

```ts
function expectFrozen(value: unknown): void
```

Asserts that the given value is `Object.isFrozen()`. Throws a descriptive assertion error if not.

**Exported from**: `gxp.ts`

**Algorithm**:
1. Call `Object.isFrozen(value)`
2. If `false`, throw an assertion error with a message identifying the value

| Input | Behavior |
| ----- | -------- |
| Frozen object | Passes (returns `void`) |
| Non-frozen object | Throws: `Expected value to be frozen (Object.isFrozen), but it is not: <preview>` |
| Primitive value | Passes (primitives are always considered frozen by `Object.isFrozen`) |
| `null` / `undefined` | Throws: `Expected value to be frozen, but received <null/undefined>` |

**Error message format**: Includes a truncated preview of the value (first 100 characters of `JSON.stringify`) to help identify which object failed.

**GxP relevance**: Verifies [INV-1](../../invariants.md#inv-1-frozen-result-instances) (frozen Result instances), [INV-7](../../invariants.md#inv-7-createerror-output-is-frozen) (frozen error objects), and [INV-10](../../invariants.md#inv-10-frozen-option-instances) (frozen Option instances).

**Example**:

```ts
import { ok } from "@hex-di/result";
import { expectFrozen } from "@hex-di/result-testing/gxp";

it("ok() produces a frozen instance", () => {
  expectFrozen(ok(42));
});
```

## BEH-T04-002: expectResultBrand(value)

```ts
function expectResultBrand(value: unknown): void
```

Asserts that the given value carries the `RESULT_BRAND` symbol property. Uses `RESULT_BRAND in value` (the same check as `isResult()`).

**Exported from**: `gxp.ts`

**Algorithm**:
1. If `value` is `null`, `undefined`, or not an `object` — throw
2. Import `RESULT_BRAND` from `@hex-di/result`
3. Assert `RESULT_BRAND in value` is `true`

| Input | Behavior |
| ----- | -------- |
| Genuine `Result` (from `ok()`/`err()`) | Passes |
| Structural fake `{ _tag: "Ok", value: 42 }` | Throws: `Expected value to carry RESULT_BRAND symbol, but it does not` |
| Non-object | Throws: `Expected an object, but received <typeof value>` |

**GxP relevance**: Verifies [INV-3](../../invariants.md#inv-3-brand-symbol-prevents-forgery) (brand symbol prevents forgery).

**Example**:

```ts
import { ok } from "@hex-di/result";
import { expectResultBrand } from "@hex-di/result-testing/gxp";

it("ok() stamps the brand", () => {
  expectResultBrand(ok(42));
});

it("rejects structural fakes", () => {
  expect(() => expectResultBrand({ _tag: "Ok", value: 42 })).toThrow();
});
```

## BEH-T04-003: expectOptionBrand(value)

```ts
function expectOptionBrand(value: unknown): void
```

Asserts that the given value carries the `OPTION_BRAND` symbol property. Uses `OPTION_BRAND in value` (the same check as `isOption()`).

**Exported from**: `gxp.ts`

**Algorithm**:
1. If `value` is `null`, `undefined`, or not an `object` — throw
2. Import `OPTION_BRAND` from `@hex-di/result`
3. Assert `OPTION_BRAND in value` is `true`

| Input | Behavior |
| ----- | -------- |
| Genuine `Option` (from `some()`/`none()`) | Passes |
| Structural fake `{ _tag: "Some", value: 42 }` | Throws: `Expected value to carry OPTION_BRAND symbol, but it does not` |
| Non-object | Throws: `Expected an object, but received <typeof value>` |

**GxP relevance**: Verifies [INV-11](../../invariants.md#inv-11-option-brand-prevents-forgery) (Option brand prevents forgery).

**Example**:

```ts
import { some, none } from "@hex-di/result";
import { expectOptionBrand } from "@hex-di/result-testing/gxp";

it("some() stamps the brand", () => {
  expectOptionBrand(some(42));
});

it("none() stamps the brand", () => {
  expectOptionBrand(none());
});
```

## BEH-T04-004: expectImmutableResult(result)

```ts
function expectImmutableResult<T, E>(result: Result<T, E>): void
```

Compound assertion that verifies all immutability and integrity properties of a `Result` instance:

1. The instance is frozen (`Object.isFrozen`)
2. The instance carries `RESULT_BRAND`
3. The `_tag` discriminant is `"Ok"` or `"Err"`
4. If `Ok`, `result.value` is accessible
5. If `Err`, `result.error` is accessible

**Exported from**: `gxp.ts`

**Algorithm**:
1. Call `expectFrozen(result)`
2. Call `expectResultBrand(result)`
3. Assert `result._tag === "Ok" || result._tag === "Err"`
4. If `_tag === "Ok"`, assert `"value" in result`
5. If `_tag === "Err"`, assert `"error" in result`

| Input | Behavior |
| ----- | -------- |
| Genuine frozen `Ok` | Passes |
| Genuine frozen `Err` | Passes |
| Unfrozen Result | Throws at step 1 |
| Unbranded Result | Throws at step 2 |
| Object with invalid `_tag` | Throws at step 3 |

**GxP relevance**: Compound verification for [INV-1](../../invariants.md#inv-1-frozen-result-instances) + [INV-3](../../invariants.md#inv-3-brand-symbol-prevents-forgery). Suitable for use in GxP integrity test suites where all properties must be verified together.

**Example**:

```ts
import { ok, err } from "@hex-di/result";
import { expectImmutableResult } from "@hex-di/result-testing/gxp";

it("ok() produces an immutable, branded Result", () => {
  expectImmutableResult(ok(42));
});

it("err() produces an immutable, branded Result", () => {
  expectImmutableResult(err("fail"));
});
```

### Design note: no `expectImmutableOption` compound utility

An `expectImmutableOption` (parallel to `expectImmutableResult`) is intentionally not provided. `Option` has a simpler structure than `Result` — only two variants (`Some`/`None`), no error channel — so the compound check reduces to `expectFrozen(option)` + `expectOptionBrand(option)` + a tag assertion. This two-call pattern is straightforward and does not warrant a dedicated compound utility. If consumer feedback indicates demand, `expectImmutableOption` may be added in a future release.

## BEH-T04-005: expectNeverRejects(resultAsync)

```ts
function expectNeverRejects(resultAsync: ResultAsync<unknown, unknown>): Promise<void>
```

Verifies that the internal promise of a `ResultAsync` resolves (never rejects). This directly tests [INV-2](../../invariants.md#inv-2-internal-promise-never-rejects).

**Exported from**: `gxp.ts`

**Algorithm**:
1. Await the `resultAsync` (which implements `PromiseLike`)
2. Assert that the resolved value is a genuine `Result` (via `isResult()`)
3. If the internal promise rejects (which should never happen for a well-constructed `ResultAsync`), the rejection propagates as a test failure

| Input | Behavior |
| ----- | -------- |
| `ResultAsync` that resolves to `Ok` | Passes |
| `ResultAsync` that resolves to `Err` | Passes (resolving to `Err` is valid — `Err` is not a rejection) |
| Malformed `ResultAsync` whose promise rejects | The rejection propagates — test fails with unhandled rejection |

**GxP relevance**: Verifies [INV-2](../../invariants.md#inv-2-internal-promise-never-rejects) (internal promise never rejects).

**Example**:

```ts
import { fromPromise } from "@hex-di/result";
import { expectNeverRejects } from "@hex-di/result-testing/gxp";

it("fromPromise wraps rejection as Err, not as a promise rejection", async () => {
  const resultAsync = fromPromise(
    Promise.reject("network error"),
    (e) => String(e)
  );
  await expectNeverRejects(resultAsync);
  // The ResultAsync resolved (to Err), it did not reject
});
```
