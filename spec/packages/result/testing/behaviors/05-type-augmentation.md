---
document_id: SPEC-RT-BEH-005
title: "05 — Type Augmentation"
version: "1.1.1"
status: Approved
author: Mohammad AL Mechkor
created: 2026-02-15
last_reviewed: 2026-02-15
gamp_category: 5
classification: Design Specification
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
  - version: "1.1.1"
    date: 2026-02-15T10:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP spec review remediation: standardized document ID from SPEC-RT-BEH-05 to SPEC-RT-BEH-005 (Finding 4)"
  - version: "1.1.0"
    date: 2026-02-15T09:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP remediation: added compensating controls and segregation of duties documentation (Finding 1), version bump"
  - version: "1.0.0"
    date: 2026-02-15T08:00:00Z
    author: Mohammad AL Mechkor
    changes: "Initial approved version"
---

# 05 — Type Augmentation

Vitest module augmentation and type-level contracts for the custom matchers and assertion helpers.

## BEH-T05-001: Vitest Assertion\<T\> Interface Augmentation

The `matchers.ts` module augments Vitest's `Assertion<T>` interface to type all custom matchers. This enables TypeScript to type-check matcher usage and provide autocomplete.

**Exported from**: `matchers.ts` (ambient `declare module "vitest"`)

```ts
declare module "vitest" {
  interface Assertion<T> {
    /**
     * Asserts that a Result is Ok.
     * When `expected` is provided, also asserts deep equality of the Ok value.
     */
    toBeOk(expected?: unknown): void;

    /**
     * Asserts that a Result is Err.
     * When `expected` is provided, also asserts deep equality of the Err error.
     */
    toBeErr(expected?: unknown): void;

    /**
     * Asserts that a Result is Ok with a specific value (required argument).
     */
    toBeOkWith(expected: unknown): void;

    /**
     * Asserts that a Result is Err with a specific error (required argument).
     */
    toBeErrWith(expected: unknown): void;

    /**
     * Asserts that an Option is Some.
     * When `expected` is provided, also asserts deep equality of the Some value.
     */
    toBeSome(expected?: unknown): void;

    /**
     * Asserts that an Option is None.
     */
    toBeNone(): void;

    /**
     * Asserts that a Result is Ok and contains the given value (strict equality via Result.contains()).
     */
    toContainOk(value: unknown): void;

    /**
     * Asserts that a Result is Err and contains the given error (strict equality via Result.containsErr()).
     */
    toContainErr(error: unknown): void;
  }
}
```

**Note**: All matcher parameters are typed as `unknown` rather than generic. This is intentional — Vitest's `Assertion<T>` does not provide the inner `Result<T, E>` types at the matcher level. Runtime validation ensures correctness; compile-time checking ensures the matcher name and arity are correct.

## BEH-T05-002: Vitest AsymmetricMatchersContaining Augmentation

The `matchers.ts` module also augments Vitest's `AsymmetricMatchersContaining` interface. This enables matchers to be used inside `expect.objectContaining()` and similar asymmetric matching contexts.

**Exported from**: `matchers.ts` (ambient `declare module "vitest"`)

```ts
declare module "vitest" {
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

**Usage example**:

```ts
expect({ result: ok(42) }).toEqual({
  result: expect.toBeOk(42),
});
```

## BEH-T05-003: Type Narrowing Contract

The assertion helpers (`expectOk`, `expectErr`, `expectSome`, `expectNone`) provide compile-time type narrowing:

### expectOk narrowing

```ts
function expectOk<T, E>(result: Result<T, E>): T
```

After calling `expectOk`, the return type is `T` — the `E` type is eliminated. TypeScript does not require further narrowing to access the value.

```ts
const result: Result<{ name: string }, Error> = ok({ name: "Alice" });
const value = expectOk(result);
// value: { name: string }  (not { name: string } | Error)
value.name; // TypeScript allows this without narrowing
```

### expectErr narrowing

```ts
function expectErr<T, E>(result: Result<T, E>): E
```

After calling `expectErr`, the return type is `E` — the `T` type is eliminated.

```ts
const result: Result<number, { code: number }> = err({ code: 404 });
const error = expectErr(result);
// error: { code: number }  (not number | { code: number })
error.code; // TypeScript allows this without narrowing
```

### expectSome narrowing

```ts
function expectSome<T>(option: Option<T>): T
```

After calling `expectSome`, the return type is `T`.

```ts
const option: Option<string> = some("hello");
const value = expectSome(option);
// value: string
value.toUpperCase(); // TypeScript allows this without narrowing
```

### expectNone — no return value

```ts
function expectNone<T>(option: Option<T>): void
```

`expectNone` returns `void` — there is no value to narrow. It serves purely as an assertion.

### expectOkAsync / expectErrAsync narrowing

```ts
function expectOkAsync<T, E>(resultAsync: ResultAsync<T, E>): Promise<T>
function expectErrAsync<T, E>(resultAsync: ResultAsync<T, E>): Promise<E>
```

The async variants provide the same narrowing wrapped in `Promise`. After `await expectOkAsync(...)`, the resolved type is `T`.
