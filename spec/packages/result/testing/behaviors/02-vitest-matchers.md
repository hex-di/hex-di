---
document_id: SPEC-RT-BEH-002
title: "02 — Vitest Matchers"
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
    changes: "GxP spec review remediation: standardized document ID from SPEC-RT-BEH-02 to SPEC-RT-BEH-002 (Finding 4)"
  - version: "1.2.0"
    date: 2026-02-15T11:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP spec review remediation: added Non-Result/Option Input Behavior section specifying matcher behavior for invalid inputs (Finding 2)"
  - version: "1.1.0"
    date: 2026-02-15T09:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP remediation: added compensating controls and segregation of duties documentation (Finding 1), version bump"
  - version: "1.0.0"
    date: 2026-02-15T08:00:00Z
    author: Mohammad AL Mechkor
    changes: "Initial approved version"
---

# 02 — Vitest Matchers

Custom Vitest matchers for asserting `Result` and `Option` variants. All matchers support `.not` negation.

## BEH-T02-001: setupResultMatchers()

```ts
function setupResultMatchers(): void
```

Registers all custom matchers with Vitest via `expect.extend()`. Must be called once before any matcher is used — typically in a Vitest setup file.

**Exported from**: `matchers.ts`

**Behavior**:
1. Calls `expect.extend({ toBeOk, toBeErr, toBeOkWith, toBeErrWith, toBeSome, toBeNone, toContainOk, toContainErr })`
2. Returns `void`

**Idempotency**: Calling `setupResultMatchers()` multiple times is safe. Subsequent calls overwrite the same matchers with identical implementations. See [TINV-3](../invariants.md#tinv-3-idempotent-setup).

**Typical usage** (in `vitest.setup.ts`):

```ts
import { setupResultMatchers } from "@hex-di/result-testing";
setupResultMatchers();
```

## Non-Result/Option Input Behavior

All matchers (BEH-T02-002 through BEH-T02-009) check the received value's `_tag` property to determine the variant. When the received value is not a `Result` or `Option` (i.e., it lacks a `_tag` property or `_tag` is not one of `"Ok"`, `"Err"`, `"Some"`, `"None"`), the matcher fails with a descriptive error message.

| Received Value | Matcher Group | Result | Error Message |
| -------------- | ------------- | ------ | ------------- |
| Non-object (number, string, boolean, symbol, bigint, function) | Result matchers (`toBeOk`, `toBeErr`, `toBeOkWith`, `toBeErrWith`, `toContainOk`, `toContainErr`) | Fail | `expected a Result but received <typeof value>` |
| Non-object (number, string, boolean, symbol, bigint, function) | Option matchers (`toBeSome`, `toBeNone`) | Fail | `expected an Option but received <typeof value>` |
| `null` | All | Fail | `expected a Result/Option but received null` |
| `undefined` | All | Fail | `expected a Result/Option but received undefined` |
| Object without `_tag` | Result matchers | Fail | `expected a Result but received an object without _tag` |
| Object without `_tag` | Option matchers | Fail | `expected an Option but received an object without _tag` |
| Object with unrecognized `_tag` | Result matchers | Fail | `expected a Result (Ok or Err) but received object with _tag "<value>"` |
| Object with unrecognized `_tag` | Option matchers | Fail | `expected an Option (Some or None) but received object with _tag "<value>"` |

**Negation**: When using `.not` with an invalid input, the matcher still fails (does not pass). Negation inverts the variant check, not the type guard. For example, `expect(42).not.toBeOk()` fails with the same error — the value is not a Result at all, so the negation is not meaningful.

**Rationale**: Failing on invalid inputs prevents false negatives where a non-Result value accidentally passes a `.not` matcher check, which would silently mask a bug in the test setup.

## BEH-T02-002: toBeOk(expected?)

```ts
expect(result).toBeOk();
expect(result).toBeOk(expectedValue);
```

Asserts that the received value is a `Result` with `_tag === "Ok"`. When `expected` is provided, additionally asserts deep equality between `result.value` and `expected`.

**Registered by**: `setupResultMatchers()`

### Pass/fail conditions

| Scenario | `toBeOk()` (no arg) | `toBeOk(expected)` |
| -------- | -------------------- | ------------------- |
| `Ok` with any value | Pass | Pass if `value` deeply equals `expected` |
| `Ok` with different value | Pass | Fail |
| `Err` with any error | Fail | Fail |

### Error messages

| Context | Message |
| ------- | ------- |
| Positive, received is Err | `expected result to be Ok but got Err(<error>)` |
| Positive, value mismatch | `expected result to be Ok(<expected>) but got Ok(<actual>)` |
| Negated (`.not`), received is Ok | `expected result not to be Ok` |
| Negated with arg, value matches | `expected result not to be Ok(<expected>)` |

### Deep equality

Uses Vitest's built-in `this.equals()` utility (from `expect.getState().equals` or the matcher context). See [ADR T003](../decisions/T003-deep-equality-strategy.md).

## BEH-T02-003: toBeErr(expected?)

```ts
expect(result).toBeErr();
expect(result).toBeErr(expectedError);
```

Asserts that the received value is a `Result` with `_tag === "Err"`. When `expected` is provided, additionally asserts deep equality between `result.error` and `expected`.

**Registered by**: `setupResultMatchers()`

### Pass/fail conditions

| Scenario | `toBeErr()` (no arg) | `toBeErr(expected)` |
| -------- | --------------------- | -------------------- |
| `Err` with any error | Pass | Pass if `error` deeply equals `expected` |
| `Err` with different error | Pass | Fail |
| `Ok` with any value | Fail | Fail |

### Error messages

| Context | Message |
| ------- | ------- |
| Positive, received is Ok | `expected result to be Err but got Ok(<value>)` |
| Positive, error mismatch | `expected result to be Err(<expected>) but got Err(<actual>)` |
| Negated (`.not`), received is Err | `expected result not to be Err` |
| Negated with arg, error matches | `expected result not to be Err(<expected>)` |

## BEH-T02-004: toBeOkWith(expected)

```ts
expect(result).toBeOkWith(expectedValue);
```

Strict variant of `toBeOk`: the `expected` argument is **required**. Asserts both `_tag === "Ok"` and deep equality of `result.value` with `expected`.

**Registered by**: `setupResultMatchers()`

### Pass/fail conditions

| Scenario | Result |
| -------- | ------ |
| `Ok` and `value` deeply equals `expected` | Pass |
| `Ok` but `value` differs from `expected` | Fail |
| `Err` | Fail |

### Error messages

| Context | Message |
| ------- | ------- |
| Positive, received is Err | `expected result to be Ok(<expected>) but got Err(<error>)` |
| Positive, value mismatch | `expected Ok(<expected>) but got Ok(<actual>)` |
| Negated, value matches | `expected result not to be Ok(<expected>)` |

**Difference from `toBeOk(expected)`**: `toBeOkWith` always requires the value argument. `toBeOk()` without arguments only checks the variant tag. Use `toBeOkWith` when you want to express "I always intend to check the value" and avoid accidentally omitting the argument.

## BEH-T02-005: toBeErrWith(expected)

```ts
expect(result).toBeErrWith(expectedError);
```

Strict variant of `toBeErr`: the `expected` argument is **required**. Asserts both `_tag === "Err"` and deep equality of `result.error` with `expected`.

**Registered by**: `setupResultMatchers()`

### Pass/fail conditions

| Scenario | Result |
| -------- | ------ |
| `Err` and `error` deeply equals `expected` | Pass |
| `Err` but `error` differs from `expected` | Fail |
| `Ok` | Fail |

### Error messages

| Context | Message |
| ------- | ------- |
| Positive, received is Ok | `expected result to be Err(<expected>) but got Ok(<value>)` |
| Positive, error mismatch | `expected Err(<expected>) but got Err(<actual>)` |
| Negated, error matches | `expected result not to be Err(<expected>)` |

## BEH-T02-006: toBeSome(expected?)

```ts
expect(option).toBeSome();
expect(option).toBeSome(expectedValue);
```

Asserts that the received value is an `Option` with `_tag === "Some"`. When `expected` is provided, additionally asserts deep equality between `option.value` and `expected`.

**Registered by**: `setupResultMatchers()`

### Pass/fail conditions

| Scenario | `toBeSome()` (no arg) | `toBeSome(expected)` |
| -------- | ---------------------- | --------------------- |
| `Some` with any value | Pass | Pass if `value` deeply equals `expected` |
| `Some` with different value | Pass | Fail |
| `None` | Fail | Fail |

### Error messages

| Context | Message |
| ------- | ------- |
| Positive, received is None | `expected option to be Some but got None` |
| Positive, value mismatch | `expected option to be Some(<expected>) but got Some(<actual>)` |
| Negated, received is Some | `expected option not to be Some` |
| Negated with arg, value matches | `expected option not to be Some(<expected>)` |

## BEH-T02-007: toBeNone()

```ts
expect(option).toBeNone();
```

Asserts that the received value is an `Option` with `_tag === "None"`. Takes no arguments.

**Registered by**: `setupResultMatchers()`

### Pass/fail conditions

| Scenario | Result |
| -------- | ------ |
| `None` | Pass |
| `Some` with any value | Fail |

### Error messages

| Context | Message |
| ------- | ------- |
| Positive, received is Some | `expected option to be None but got Some(<value>)` |
| Negated, received is None | `expected option not to be None` |

## BEH-T02-008: toContainOk(value)

```ts
expect(result).toContainOk(value);
```

Asserts that the received value is `Ok` and that `result.contains(value)` returns `true`. This uses the `Result` instance's own `contains()` method, which performs strict equality (`===`).

**Registered by**: `setupResultMatchers()`

### Pass/fail conditions

| Scenario | Result |
| -------- | ------ |
| `Ok` and `result.contains(value)` is `true` | Pass |
| `Ok` but `result.contains(value)` is `false` | Fail |
| `Err` | Fail |

### Error messages

| Context | Message |
| ------- | ------- |
| Positive, received is Err | `expected result to contain Ok(<value>) but got Err(<error>)` |
| Positive, value not contained | `expected result to contain Ok(<expected>) but Ok value is <actual>` |
| Negated, value contained | `expected result not to contain Ok(<value>)` |

**Difference from `toBeOk(expected)`**: `toContainOk` uses the `Result.contains()` method (strict `===` equality), while `toBeOk(expected)` uses Vitest's deep equality. Use `toContainOk` for primitive values or reference identity checks; use `toBeOk(expected)` for structural comparison of objects.

## BEH-T02-009: toContainErr(error)

```ts
expect(result).toContainErr(error);
```

Asserts that the received value is `Err` and that `result.containsErr(error)` returns `true`. This uses the `Result` instance's own `containsErr()` method, which performs strict equality (`===`).

**Registered by**: `setupResultMatchers()`

### Pass/fail conditions

| Scenario | Result |
| -------- | ------ |
| `Err` and `result.containsErr(error)` is `true` | Pass |
| `Err` but `result.containsErr(error)` is `false` | Fail |
| `Ok` | Fail |

### Error messages

| Context | Message |
| ------- | ------- |
| Positive, received is Ok | `expected result to contain Err(<error>) but got Ok(<value>)` |
| Positive, error not contained | `expected result to contain Err(<expected>) but Err error is <actual>` |
| Negated, error contained | `expected result not to contain Err(<error>)` |

## Vitest Type Augmentation

All matchers are typed via Vitest module augmentation. See [05-type-augmentation.md](05-type-augmentation.md) for the full interface declarations.

```ts
declare module "vitest" {
  interface Assertion<T> {
    toBeOk(expected?: unknown): void;
    toBeErr(expected?: unknown): void;
    toBeOkWith(expected: unknown): void;
    toBeErrWith(expected: unknown): void;
    toBeSome(expected?: unknown): void;
    toBeNone(): void;
    toContainOk(value: unknown): void;
    toContainErr(error: unknown): void;
  }
  interface AsymmetricMatchersContaining {
    toBeOk(expected?: unknown): void;
    toBeErr(expected?: unknown): void;
    toBeOkWith(expected: unknown): void;
    toBeErrWith(expected: unknown): void;
    toBeSome(expected?: unknown): void;
    toBeNone(): void;
    toContainOk(value: unknown): void;
    toContainErr(error: unknown): void;
  }
}
```
