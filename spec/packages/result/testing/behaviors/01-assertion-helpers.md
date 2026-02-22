---
document_id: SPEC-RT-BEH-001
title: "01 — Assertion Helpers"
version: "1.2.1"
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
  - version: "1.2.1"
    date: 2026-02-15T12:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP spec review remediation: updated classification from Functional Specification to Functional/Design Specification per Finding 5 (GAMP 5 classification accuracy)"
  - version: "1.2.0"
    date: 2026-02-15T11:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP spec review remediation: added Non-Result/Option Input Behavior section per EU Annex 11 §13 (Finding 1)"
  - version: "1.1.1"
    date: 2026-02-15T10:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP spec review remediation: standardized document ID from SPEC-RT-BEH-01 to SPEC-RT-BEH-001 (Finding 4)"
  - version: "1.1.0"
    date: 2026-02-15T09:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP remediation: added compensating controls and segregation of duties documentation (Finding 1), version bump"
  - version: "1.0.0"
    date: 2026-02-15T08:00:00Z
    author: Mohammad AL Mechkor
    changes: "Initial approved version"
---

# 01 — Assertion Helpers

Type-narrowing assertion functions that extract values from `Result` and `Option` types in tests.

## Non-Result/Option Input Behavior

All assertion helpers (BEH-T01-001 through BEH-T01-006) check the received value's `_tag` property using Vitest's `expect().toBe()` assertion. When the received value is not a `Result` or `Option` (i.e., it lacks a `_tag` property or `_tag` is not the expected variant), the assertion fails via the underlying `expect().toBe()` call.

| Received Value | Helper Group | Result | Error Source |
| -------------- | ------------ | ------ | ------------ |
| Non-object (number, string, boolean, null, undefined) | Result helpers (`expectOk`, `expectErr`) | Fail | `expect(undefined).toBe("Ok")` — Vitest assertion error: `expected undefined to be "Ok"` |
| Non-object (number, string, boolean, null, undefined) | Option helpers (`expectSome`, `expectNone`) | Fail | `expect(undefined).toBe("Some")` — Vitest assertion error: `expected undefined to be "Some"` |
| Object without `_tag` | Result helpers | Fail | `expect(undefined).toBe("Ok")` — Vitest assertion error |
| Object without `_tag` | Option helpers | Fail | `expect(undefined).toBe("Some")` — Vitest assertion error |
| Object with unrecognized `_tag` | Result helpers | Fail | `expect("<value>").toBe("Ok")` — Vitest assertion error |
| Object with unrecognized `_tag` | Option helpers | Fail | `expect("<value>").toBe("Some")` — Vitest assertion error |

**Note**: Unlike the custom matchers (BEH-T02), assertion helpers do not produce custom error messages for invalid input types. The error message comes directly from Vitest's `expect().toBe()` comparison. TypeScript's type system prevents invalid inputs at compile time for typed code; this behavior applies only when type safety is bypassed (e.g., `any`-typed values, JavaScript callers).

**Rationale**: Assertion helpers are designed for ergonomic use inside well-typed test code. Adding a runtime type guard before the `_tag` check would add complexity without benefit — the Vitest assertion failure is sufficient to identify the problem, and the type system prevents it in the normal case.

## BEH-T01-001: expectOk(result)

```ts
function expectOk<T, E>(result: Result<T, E>): T
```

Asserts that a `Result` is the `Ok` variant and returns the contained value with the narrowed type `T`.

**Exported from**: `assertion-helpers.ts`

**Algorithm**:
1. Check `result._tag === "Ok"` using Vitest's `expect().toBe()` assertion
2. If `_tag` is `"Err"`, throw with a descriptive message including the actual error value
3. Return `result.value` typed as `T`

| Input variant | Behavior |
| ------------- | -------- |
| `Ok<T, E>`   | Returns `value: T` |
| `Err<T, E>`  | Throws assertion error: `Expected Ok but got Err: <JSON of error>` |

**Type narrowing effect**: The return type is `T`, not `T | E`. Callers can use the returned value directly without further narrowing.

**Error message format**: `"Expected Ok but got Err: ${JSON.stringify(result.error)}"`. If `JSON.stringify` throws (circular reference), falls back to `String(result.error)`.

**Example**:

```ts
const result: Result<number, string> = ok(42);
const value = expectOk(result);
// value: number (not number | string)
expect(value).toBe(42);
```

## BEH-T01-002: expectErr(result)

```ts
function expectErr<T, E>(result: Result<T, E>): E
```

Asserts that a `Result` is the `Err` variant and returns the contained error with the narrowed type `E`.

**Exported from**: `assertion-helpers.ts`

**Algorithm**:
1. Check `result._tag === "Err"` using Vitest's `expect().toBe()` assertion
2. If `_tag` is `"Ok"`, throw with a descriptive message including the actual Ok value
3. Return `result.error` typed as `E`

| Input variant | Behavior |
| ------------- | -------- |
| `Ok<T, E>`   | Throws assertion error: `Expected Err but got Ok: <JSON of value>` |
| `Err<T, E>`  | Returns `error: E` |

**Type narrowing effect**: The return type is `E`, not `T | E`. Callers can use the returned error directly without further narrowing.

**Error message format**: `"Expected Err but got Ok: ${JSON.stringify(result.value)}"`. If `JSON.stringify` throws, falls back to `String(result.value)`.

**Example**:

```ts
const result: Result<number, string> = err("not found");
const error = expectErr(result);
// error: string (not number | string)
expect(error).toBe("not found");
```

## BEH-T01-003: expectOkAsync(resultAsync)

```ts
function expectOkAsync<T, E>(resultAsync: ResultAsync<T, E>): Promise<T>
```

Async counterpart of `expectOk`. Awaits the `ResultAsync`, then delegates to `expectOk`.

**Exported from**: `assertion-helpers.ts`

**Algorithm**:
1. `const result = await resultAsync`
2. Return `expectOk(result)`

| Resolved variant | Behavior |
| ---------------- | -------- |
| `Ok<T, E>`       | Resolves to `value: T` |
| `Err<T, E>`      | Rejects with assertion error |

**Type narrowing effect**: The resolved type is `T`.

**Example**:

```ts
const resultAsync = ResultAsync.fromSafePromise(Promise.resolve(42));
const value = await expectOkAsync(resultAsync);
// value: number
```

## BEH-T01-004: expectErrAsync(resultAsync)

```ts
function expectErrAsync<T, E>(resultAsync: ResultAsync<T, E>): Promise<E>
```

Async counterpart of `expectErr`. Awaits the `ResultAsync`, then delegates to `expectErr`.

**Exported from**: `assertion-helpers.ts`

**Algorithm**:
1. `const result = await resultAsync`
2. Return `expectErr(result)`

| Resolved variant | Behavior |
| ---------------- | -------- |
| `Ok<T, E>`       | Rejects with assertion error |
| `Err<T, E>`      | Resolves to `error: E` |

**Type narrowing effect**: The resolved type is `E`.

**Example**:

```ts
const resultAsync = ResultAsync.fromPromise(
  Promise.reject("timeout"),
  (e) => String(e)
);
const error = await expectErrAsync(resultAsync);
// error: string
```

## BEH-T01-005: expectSome(option)

```ts
function expectSome<T>(option: Option<T>): T
```

Asserts that an `Option` is the `Some` variant and returns the contained value with the narrowed type `T`.

**Exported from**: `assertion-helpers.ts`

**Algorithm**:
1. Check `option._tag === "Some"` using Vitest's `expect().toBe()` assertion
2. If `_tag` is `"None"`, throw with a descriptive message
3. Return `option.value` typed as `T`

| Input variant | Behavior |
| ------------- | -------- |
| `Some<T>`     | Returns `value: T` |
| `None`        | Throws assertion error: `Expected Some but got None` |

**Type narrowing effect**: The return type is `T`.

**Error message format**: `"Expected Some but got None"`.

**Example**:

```ts
const option: Option<number> = some(42);
const value = expectSome(option);
// value: number
expect(value).toBe(42);
```

## BEH-T01-006: expectNone(option)

```ts
function expectNone<T>(option: Option<T>): void
```

Asserts that an `Option` is the `None` variant. Returns nothing.

**Exported from**: `assertion-helpers.ts`

**Algorithm**:
1. Check `option._tag === "None"` using Vitest's `expect().toBe()` assertion
2. If `_tag` is `"Some"`, throw with a descriptive message including the actual value

| Input variant | Behavior |
| ------------- | -------- |
| `Some<T>`     | Throws assertion error: `Expected None but got Some: <JSON of value>` |
| `None`        | Returns `void` |

**Error message format**: `"Expected None but got Some: ${JSON.stringify(option.value)}"`. If `JSON.stringify` throws, falls back to `String(option.value)`.

**Example**:

```ts
const option: Option<number> = none();
expectNone(option); // passes, returns void
```
