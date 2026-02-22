---
document_id: SPEC-RT-BEH-003
title: "03 — Test Factories"
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
    changes: "GxP spec review remediation: standardized document ID from SPEC-RT-BEH-03 to SPEC-RT-BEH-003 (Finding 4)"
  - version: "1.2.0"
    date: 2026-02-15T11:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP spec review remediation: replaced ambiguous 'internal-safe construction path' with explicit public API reference in BEH-T03-003 (Finding 1)"
  - version: "1.1.0"
    date: 2026-02-15T09:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP remediation: added compensating controls and segregation of duties documentation (Finding 1), version bump"
  - version: "1.0.0"
    date: 2026-02-15T08:00:00Z
    author: Mohammad AL Mechkor
    changes: "Initial approved version"
---

# 03 — Test Factories

Test data builders for creating `Result` and `Option` fixtures in test suites.

## BEH-T03-001: createResultFixture(defaults)

```ts
function createResultFixture<T>(defaults: T): {
  ok:       (value?: T) => Ok<T, never>;
  err:      <E>(error: E) => Err<never, E>;
  okAsync:  (value?: T) => ResultAsync<T, never>;
  errAsync: <E>(error: E) => ResultAsync<T, E>;
}
```

Creates a fixture factory for `Result` and `ResultAsync` values with a default `Ok` value. The returned object provides four factory functions for creating test fixtures with minimal boilerplate.

**Exported from**: `factories.ts`

### Factory methods

| Method | Behavior |
| ------ | -------- |
| `ok()` | Returns `ok(defaults)` — uses the default value |
| `ok(value)` | Returns `ok(value)` — overrides the default |
| `err(error)` | Returns `err(error)` |
| `okAsync()` | Returns `ResultAsync.fromSafePromise(Promise.resolve(defaults))` |
| `okAsync(value)` | Returns `ResultAsync.fromSafePromise(Promise.resolve(value))` |
| `errAsync(error)` | Returns `ResultAsync.fromPromise(Promise.reject(error), () => error)` |

### Parameterization

The `defaults` argument is captured once at factory creation time. It is not cloned — if `defaults` is a mutable object, the caller is responsible for ensuring test isolation (e.g., by passing a frozen object or by creating a new fixture per test).

### Example

```ts
const userFixture = createResultFixture({ id: 1, name: "Alice" });

it("maps the user name", () => {
  const result = userFixture.ok();
  const mapped = result.map((u) => u.name);
  expect(mapped).toBeOk("Alice");
});

it("handles errors", () => {
  const result = userFixture.err("not found");
  expect(result).toBeErr("not found");
});
```

## BEH-T03-002: createOptionFixture(defaults)

```ts
function createOptionFixture<T>(defaults: T): {
  some: (value?: T) => Some<T>;
  none: ()          => None;
}
```

Creates a fixture factory for `Option` values with a default `Some` value.

**Exported from**: `factories.ts`

### Factory methods

| Method | Behavior |
| ------ | -------- |
| `some()` | Returns `some(defaults)` — uses the default value |
| `some(value)` | Returns `some(value)` — overrides the default |
| `none()` | Returns `none()` |

### Example

```ts
const configFixture = createOptionFixture({ timeout: 3000 });

it("extracts config", () => {
  const opt = configFixture.some();
  const value = expectSome(opt);
  expect(value.timeout).toBe(3000);
});

it("handles missing config", () => {
  const opt = configFixture.none();
  expectNone(opt);
});
```

## BEH-T03-003: mockResultAsync()

```ts
function mockResultAsync<T, E>(): {
  resultAsync: ResultAsync<T, E>;
  resolve:     (value: T) => void;
  reject:      (error: E) => void;
}
```

Creates a deferred `ResultAsync` whose resolution is controlled by the caller. Useful for testing loading states, race conditions, and async ordering in code that consumes `ResultAsync`.

**Exported from**: `factories.ts`

### Returned object

| Property | Type | Description |
| -------- | ---- | ----------- |
| `resultAsync` | `ResultAsync<T, E>` | A pending `ResultAsync` that resolves when `resolve` or `reject` is called |
| `resolve` | `(value: T) => void` | Resolves the internal promise with `Ok(value)` |
| `reject` | `(error: E) => void` | Resolves the internal promise with `Err(error)` (does **not** reject the promise) |

### Behavior

1. Creates a `Promise<Result<T, E>>` backed by an externalized `resolve`/`reject` pair (via `new Promise(...)`)
2. Wraps the promise in `ResultAsync` using `ResultAsync.fromResult()` (public API). Since the backing promise resolves to `Result<T, E>` (never rejects), this is consistent with [INV-2](../../invariants.md#inv-2-internal-promise-never-rejects)
3. Calling `resolve(value)` resolves the backing promise to `ok(value)`
4. Calling `reject(error)` resolves the backing promise to `err(error)` — consistent with [INV-2](../../invariants.md#inv-2-internal-promise-never-rejects) (internal promise never rejects)
5. Calling both `resolve` and `reject` — only the first call takes effect (standard Promise semantics)

### Example

```ts
it("shows loading then result", async () => {
  const { resultAsync, resolve } = mockResultAsync<string, Error>();

  // resultAsync is still pending
  let resolved = false;
  resultAsync.then(() => { resolved = true; });

  expect(resolved).toBe(false);

  resolve("hello");
  const value = await expectOkAsync(resultAsync);
  expect(value).toBe("hello");
});
```
