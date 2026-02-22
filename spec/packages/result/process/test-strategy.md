# Test Strategy

Testing pyramid and policy for the `@hex-di/result` package. All test levels are required before a feature is considered complete.

## Test Pyramid

```
                    ╱╲
                   ╱  ╲
                  ╱ PQ ╲           Performance Qualification (bench)
                 ╱──────╲
                ╱ BDD    ╲         Cucumber acceptance tests (.feature)
               ╱──────────╲
              ╱ Mutation    ╲       Stryker mutation tests
             ╱──────────────╲
            ╱ GxP Integrity  ╲      Immutability, brand, tamper tests
           ╱──────────────────╲
          ╱ Type Tests          ╲    Vitest typecheck (.test-d.ts)
         ╱──────────────────────╲
        ╱ Unit Tests              ╲  Vitest runtime (.test.ts)
       ╱────────────────────────────╲
```

| Level | Tool | File Pattern | Runs On | Purpose |
|-------|------|-------------|---------|---------|
| Unit | Vitest | `*.test.ts` | Full Node + OS matrix | Runtime behavior correctness |
| Type | Vitest typecheck | `*.test-d.ts` | Full TS version matrix | Type inference and narrowing |
| GxP Integrity | Vitest | `gxp/*.test.ts` | ubuntu-latest, Node 22 | Immutability, brand, tamper resistance |
| Mutation | Stryker | All `*.test.ts` | ubuntu-latest, Node 22 | Code coverage gap detection |
| BDD/Acceptance | Cucumber + Vitest | `*.feature` + `*.steps.ts` | ubuntu-latest, Node 22 | Business-readable acceptance criteria |
| Performance | Vitest bench | `bench/*.bench.ts` | ubuntu-latest, Node 22 | Performance regression detection |

## Level 1: Unit Tests

### Tooling

- **Runner**: Vitest
- **File pattern**: `tests/**/*.test.ts`
- **Coverage**: `vitest run --coverage` with `v8` provider

### Structure

Tests mirror the behavior spec files:

| Behavior Spec | Test File |
|---------------|-----------|
| `01-types-and-guards.md` | `core/result.test.ts`, `core/guards.test.ts` |
| `02-creation.md` | `constructors/*.test.ts` |
| `03-transformation.md` | `core/result.test.ts` (transformation section) |
| `04-extraction.md` | `core/result.test.ts` (extraction section) |
| `05-composition.md` | `combinators/*.test.ts` |
| `06-async.md` | `async/result-async.test.ts` |
| `07-generators.md` | `generators/safe-try.test.ts` |
| `08-error-patterns.md` | `errors/*.test.ts` |
| `09-option.md` | `option/*.test.ts` |
| `10-standalone-functions.md` | `fn/*.test.ts` |
| `11-unsafe.md` | `unsafe/*.test.ts` |
| `12-do-notation.md` | `do/*.test.ts` |
| `13-interop.md` | `interop/*.test.ts` |
| `14-benchmarks.md` | `bench/*.bench.ts` (separate level) |

### Naming Convention

```typescript
describe("ok(value)", () => {
  it("returns a frozen object", () => { ... });
  it("sets _tag to 'Ok'", () => { ... });
  it("sets value to the given argument", () => { ... });
  it("carries RESULT_BRAND", () => { ... });
});

describe("Ok.map(f)", () => {
  it("applies f to the value and returns Ok", () => { ... });
  it("returns a new frozen Result", () => { ... });
});

describe("Err.map(f)", () => {
  it("returns self without calling f", () => { ... });
});
```

Convention:
- `describe` blocks name the function/method under test
- `it` blocks describe the expected behavior as a sentence
- Both Ok and Err variants are tested for every method
- Edge cases (empty string, 0, null, undefined, NaN) are explicitly tested

### Coverage Targets

| Metric | Target |
|--------|--------|
| Line coverage | > 95% |
| Branch coverage | > 90% |
| Function coverage | 100% |

## Level 2: Type Tests

### Tooling

- **Runner**: Vitest typecheck (`vitest typecheck`)
- **File pattern**: `tests/**/*.test-d.ts`
- **Assertions**: `expectTypeOf` from Vitest

### What Type Tests Cover

| Category | Example |
|----------|---------|
| Inference | `expectTypeOf(ok(42)).toEqualTypeOf<Ok<number, never>>()` |
| Narrowing | After `isOk()`, value is accessible without cast |
| Phantom types | `ok(1)` is assignable to `Result<number, string>` |
| Error accumulation | `andThen` produces `Result<U, E \| F>` |
| Generic constraints | `InferOk<Result<number, string>>` equals `number` |
| Negative cases | `// @ts-expect-error` for invalid usage |

### Coverage

Every public type signature in `type-utils.ts` and every method overload must have at least one type test. Type tests run against the full TypeScript version matrix (5.0 through latest).

## Level 3: GxP Integrity Tests

### Tooling

- **Runner**: Vitest
- **File pattern**: `tests/gxp/*.test.ts`
- **Purpose**: Validate invariants that support GxP compliance

### Test Categories

#### Immutability Tests (`gxp/freeze.test.ts`)

```typescript
describe("GxP: Immutability", () => {
  it("ok() returns a frozen object", () => {
    expect(Object.isFrozen(ok(1))).toBe(true);
  });

  it("properties cannot be modified in strict mode", () => {
    const r = ok(1);
    expect(() => { (r as any).value = 2; }).toThrow(TypeError);
  });

  it("properties cannot be added", () => {
    const r = ok(1);
    expect(() => { (r as any).extra = true; }).toThrow(TypeError);
  });

  it("properties cannot be deleted", () => {
    const r = ok(1);
    expect(() => { delete (r as any).value; }).toThrow(TypeError);
  });

  it("err() returns a frozen object", () => {
    expect(Object.isFrozen(err("x"))).toBe(true);
  });

  it("some() returns a frozen object", () => {
    expect(Object.isFrozen(some(1))).toBe(true);
  });

  it("none() returns a frozen object", () => {
    expect(Object.isFrozen(none())).toBe(true);
  });

  it("createError output is frozen", () => {
    const e = createError("tag")({});
    expect(Object.isFrozen(e)).toBe(true);
  });
});
```

#### Brand Tamper Tests (`gxp/tamper-evidence.test.ts`)

```typescript
describe("GxP: Tamper Evidence", () => {
  it("isResult rejects structural fakes", () => {
    expect(isResult({ _tag: "Ok", value: 42 })).toBe(false);
  });

  it("isResult rejects objects with Symbol.for('Result')", () => {
    expect(isResult({ [Symbol.for("Result")]: true, _tag: "Ok", value: 42 })).toBe(false);
  });

  it("isResult accepts genuine ok()", () => {
    expect(isResult(ok(42))).toBe(true);
  });

  it("brand symbol is not enumerable", () => {
    expect(Object.keys(ok(1))).not.toContain(expect.stringMatching(/symbol/i));
  });

  it("brand survives JSON round-trip via fromJSON", () => {
    const restored = fromJSON(ok(42).toJSON());
    expect(isResult(restored)).toBe(true);
  });

  it("brand does NOT survive structuredClone", () => {
    const cloned = structuredClone(ok(42));
    expect(isResult(cloned)).toBe(false);
  });
});
```

#### Error Suppression Tests (`gxp/error-suppression.test.ts`)

```typescript
describe("GxP: Error Suppression Awareness", () => {
  it("andTee suppresses exceptions (known behavior)", () => {
    const r = ok(1).andTee(() => { throw new Error("audit fail"); });
    expect(r.isOk()).toBe(true);  // Error was swallowed
  });

  it("inspect does NOT suppress exceptions", () => {
    expect(() => {
      ok(1).inspect(() => { throw new Error("audit fail"); });
    }).toThrow("audit fail");
  });

  it("andThrough propagates Err from side effect", () => {
    const r = ok(1).andThrough(() => err("audit_failed"));
    expect(r.isErr()).toBe(true);
  });
});
```

#### Promise Safety Tests (`gxp/promise-safety.test.ts`)

Validates [INV-2](../invariants.md#inv-2-internal-promise-never-rejects): the internal promise inside `ResultAsync` never rejects, even when the wrapped promise rejects or the mapping function throws.

| Test Case | Verifies |
|-----------|----------|
| `fromPromise` with rejecting promise produces `Err` | Rejection is caught and mapped to `Err`, not propagated |
| Awaiting `ResultAsync` never triggers `unhandledRejection` | No unhandled promise rejections leak |
| `asyncAndThen` with throwing mapper produces `Err` | Synchronous exceptions in async chains are caught |

#### Error Factory Freeze Tests (`gxp/error-freeze.test.ts`)

Validates [INV-7](../invariants.md#inv-7-createerror-output-is-frozen): error objects produced by `createError` and `createErrorGroup().create` are frozen.

| Test Case | Verifies |
|-----------|----------|
| `createError("tag")({})` output is frozen | `Object.isFrozen()` returns `true` |
| `createErrorGroup("ns").create("tag")({})` output is frozen | Grouped errors are also frozen |
| Attempting to modify `_tag` throws TypeError | Discriminant field is immutable |

#### ResultAsync Brand Tests (`gxp/async-tamper.test.ts`)

Validates [INV-9](../invariants.md#inv-9-resultasync-brand-identity): `isResultAsync()` uses brand-based checking and rejects structural fakes.

| Test Case | Verifies |
|-----------|----------|
| Genuine `ResultAsync` passes `isResultAsync()` | Brand is present on real instances |
| Object with `.match` method fails `isResultAsync()` | Structural look-alikes rejected |
| `ResultAsync` brand survives `await` | Awaiting produces branded `Result` |

#### Option Freeze Tests (`gxp/option-freeze.test.ts`)

Validates [INV-10](../invariants.md#inv-10-frozen-option-instances): `some()` and `none()` produce frozen instances.

| Test Case | Verifies |
|-----------|----------|
| `some(value)` is frozen | `Object.isFrozen()` returns `true` |
| `none()` is frozen | Singleton None is immutable |
| Modifying `some(1).value` throws TypeError | Value property is protected |

#### Option Brand Tests (`gxp/option-tamper.test.ts`)

Validates [INV-11](../invariants.md#inv-11-option-brand-prevents-forgery): `isOption()` uses brand-based checking and rejects structural fakes.

| Test Case | Verifies |
|-----------|----------|
| Genuine `some(1)` passes `isOption()` | Brand is present |
| `{ _tag: "Some", value: 1 }` fails `isOption()` | Structural fakes rejected |
| Genuine `none()` passes `isOption()` | None variant is branded |

#### Standalone Delegation Tests (`gxp/delegation.test.ts`)

Validates [INV-14](../invariants.md#inv-14-standalone-functions-delegate): every standalone function in `@hex-di/result/fn/*` delegates to the corresponding instance method.

| Test Case | Verifies |
|-----------|----------|
| `pipe(ok(1), map(x => x + 1))` equals `ok(1).map(x => x + 1)` | `map` delegates to instance method |
| `pipe(err("x"), mapErr(e => e + "!"))` equals `err("x").mapErr(e => e + "!")` | `mapErr` delegates |
| All standalone functions produce identical results to method calls | Behavioral consistency |

#### Generator Safety Tests (`gxp/generator-safety.test.ts`)

Validates [INV-4](../invariants.md#inv-4-err-generator-throws-on-continuation): the Err generator throws if iteration continues past the yield, preventing data processing with invalid state.

| Test Case | Verifies |
|-----------|----------|
| Continuing iteration past Err yield throws | Hard stop prevents invalid-state processing |
| Error message is descriptive ("unreachable: generator continued after yield in Err") | Diagnosable failure |
| `safeTry` runner calls `gen.return()` to avoid the throw | Normal usage path is safe |

## Level 4: Mutation Tests

### Tooling

- **Runner**: Stryker Mutator with `@stryker-mutator/vitest-runner`
- **Config**: `stryker.config.mjs`
- **Threshold**: **90% mutation score break threshold**

### Configuration

```javascript
// stryker.config.mjs
export default {
  mutate: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/*.test-d.ts",
    "!src/**/*.bench.ts",
    "!src/gxp/**",
  ],
  testRunner: "vitest",
  reporters: ["html", "clear-text", "progress", "json"],
  thresholds: {
    break: 90,
    high: 95,
    low: 85,
  },
  mutator: {
    excludedMutations: [
      // TypeScript-only constructs that don't affect runtime
      "StringLiteral",  // error messages
    ],
  },
};
```

### Mutation Score Targets

| Module | Target | Rationale |
|--------|--------|-----------|
| `core/result.ts` | > 95% | Core factories, highest criticality |
| `core/guards.ts` | > 95% | Brand validation, security-critical |
| `combinators/*.ts` | > 90% | Complex logic, multiple code paths |
| `errors/*.ts` | > 90% | Error creation and validation |
| `option/*.ts` | > 90% | Parallel to Result, same criticality |
| `fn/*.ts` | > 85% | Thin wrappers (delegation), lower risk |
| `unsafe/*.ts` | > 95% | Throwing code, must be precise |
| `do/*.ts` | > 90% | Type accumulation logic |
| `interop/*.ts` | > 90% | Serialization round-trip |

### Why 90% (Not 70%)

The previous 70% threshold was established for initial development velocity. For a library that:
- Aims to be used in GxP-regulated systems
- Claims formal invariants (INV-1 through INV-14)
- Targets best-in-class safety guarantees

90% is the appropriate minimum. Surviving mutants must be individually justified (e.g., equivalent mutants, unreachable code, error message changes).

### Mutant Adjudication Record

Surviving mutants that are accepted (not killed) must be documented in a persistent, version-controlled artifact: `docs/mutant-adjudication.md`. This file is append-only — entries are never removed, only superseded by newer adjudications if circumstances change.

Each entry must include:

| Field | Content |
|-------|---------|
| Mutant ID | Stryker mutant identifier (file path + mutator name + line number) |
| Adjudication | `equivalent` / `unreachable` / `justified` |
| Rationale | Why the mutant is not a test gap (e.g., "equivalent: changing `===` to `!==` in an always-true branch produces identical behavior") |
| Adjudicator | Name of the reviewer who accepted the mutant |
| Date | Date of adjudication |
| Review reference | PR number or review issue where the adjudication was discussed |

**Maintenance**: The adjudication record is reviewed during the invariant verification periodic review (every minor release) per [ci-maintenance.md](ci-maintenance.md#periodic-review). Adjudications for mutants in security-critical code (`core/brand.ts`, `core/guards.ts`, `core/result.ts` freeze paths) require a second reviewer.

## Level 5: BDD / Cucumber Acceptance Tests

### Tooling

- **Runner**: [cucumber-js](https://github.com/cucumber/cucumber-js) with Vitest assertions
- **Feature files**: `features/*.feature`
- **Step definitions**: `features/steps/*.steps.ts`
- **Language**: Gherkin

### Feature File Structure

Feature files correspond to behavior specs:

| Behavior Spec | Feature File |
|---------------|-------------|
| `01-types-and-guards.md` | `features/types-and-guards.feature` |
| `02-creation.md` | `features/creation.feature` |
| `03-transformation.md` | `features/transformation.feature` |
| `04-extraction.md` | `features/extraction.feature` |
| `05-composition.md` | `features/composition.feature` |
| `06-async.md` | `features/async.feature` |
| `07-generators.md` | `features/generators.feature` |
| `08-error-patterns.md` | `features/error-patterns.feature` |
| `09-option.md` | `features/option.feature` |
| `10-standalone-functions.md` | `features/standalone-functions.feature` |
| `11-unsafe.md` | `features/unsafe.feature` |
| `12-do-notation.md` | `features/do-notation.feature` |
| `13-interop.md` | `features/interop.feature` |
| Cross-cutting | `features/brand-validation.feature` |
| Cross-cutting | `features/immutability.feature` |
| Cross-cutting | `features/subpath-exports.feature` |
| Cross-cutting | `features/async-safety.feature` |
| Cross-cutting | `features/side-effects.feature` |

### Example Feature Files

> **Normative vs. illustrative**: The committed `.feature` files listed in the [Feature File Structure](#feature-file-structure) table above are the **normative** test artifacts — they are executed by cucumber-js in CI and their pass/fail status gates the PR merge. The inline Gherkin examples below are **illustrative excerpts** intended to demonstrate scenario style and step conventions. If an inline example diverges from the committed `.feature` file, the committed file takes precedence. During development, scenarios should be authored directly in the committed files, not copied from this document.

#### `features/immutability.feature`

```gherkin
Feature: Result Immutability
  As a developer using @hex-di/result in a GxP system
  I want all Result instances to be immutable
  So that data integrity is guaranteed after creation

  Scenario: Ok instance is frozen
    Given I create an Ok result with value 42
    Then the result should be frozen
    And modifying the value property should throw a TypeError
    And adding a new property should throw a TypeError
    And deleting a property should throw a TypeError

  Scenario: Err instance is frozen
    Given I create an Err result with error "validation_failed"
    Then the result should be frozen
    And modifying the error property should throw a TypeError

  Scenario: Transformation returns new frozen instance
    Given I create an Ok result with value 10
    When I map it with a function that doubles the value
    Then the original result should still have value 10
    And the mapped result should have value 20
    And both results should be frozen

  Scenario: createError output is frozen
    Given I create a tagged error with tag "NotFound" and field "id" value "123"
    Then the error object should be frozen
    And modifying the _tag property should throw a TypeError
```

#### `features/brand-validation.feature`

```gherkin
Feature: Brand-Based Validation
  As a developer working with untrusted data
  I want isResult() to reject structural fakes
  So that only genuine Results are accepted

  Scenario: Genuine Ok passes isResult
    Given I create an Ok result with value "hello"
    Then isResult should return true

  Scenario: Genuine Err passes isResult
    Given I create an Err result with error "oops"
    Then isResult should return true

  Scenario: Structural fake fails isResult
    Given I have a plain object with _tag "Ok" and value 42
    Then isResult should return false

  Scenario: Null and undefined fail isResult
    Then isResult of null should return false
    And isResult of undefined should return false

  Scenario: Brand survives JSON round-trip
    Given I create an Ok result with value 42
    When I serialize it with toJSON and deserialize with fromJSON
    Then isResult of the restored result should return true
    And the restored value should be 42

  Scenario: Brand does not survive structuredClone
    Given I create an Ok result with value 42
    When I apply structuredClone to it
    Then isResult of the cloned object should return false
```

#### `features/creation.feature`

```gherkin
Feature: Result Creation
  As a developer handling operations that can fail
  I want factory functions that create Results from various inputs
  So that I can safely wrap throwable, nullable, and async operations

  Scenario: fromThrowable wraps a successful function
    Given a function that returns 42
    When I wrap it with fromThrowable
    Then the result should be Ok with value 42

  Scenario: fromThrowable wraps a throwing function
    Given a function that throws "connection refused"
    When I wrap it with fromThrowable and error mapper
    Then the result should be Err with the mapped error

  Scenario: fromNullable converts null to Err
    Given a null value
    When I call fromNullable with error "missing"
    Then the result should be Err with error "missing"

  Scenario: fromNullable converts a value to Ok
    Given the value "hello"
    When I call fromNullable with error "missing"
    Then the result should be Ok with value "hello"

  Scenario: tryCatch always executes immediately
    Given a function that returns 42
    When I call tryCatch
    Then the result should be Ok with value 42
```

#### `features/composition.feature`

```gherkin
Feature: Result Composition
  As a developer composing multiple fallible operations
  I want combinators that aggregate Results
  So that I can handle collections of Results efficiently

  Scenario: all succeeds when all Results are Ok
    Given a list of Ok results [1, 2, 3]
    When I call all on the list
    Then the result should be Ok with value [1, 2, 3]

  Scenario: all short-circuits on first Err
    Given a list of results [Ok(1), Err("fail"), Ok(3)]
    When I call all on the list
    Then the result should be Err with error "fail"

  Scenario: partition separates Ok and Err values
    Given a list of results [Ok(1), Err("a"), Ok(2), Err("b")]
    When I call partition on the list
    Then the Ok array should be [1, 2]
    And the Err array should be ["a", "b"]

  Scenario: zipOrAccumulate collects all errors
    Given results [Err("a"), Ok(1), Err("b")]
    When I call zipOrAccumulate on them
    Then the result should be Err with errors ["a", "b"]
    And the error array should be non-empty
```

#### `features/interop.feature`

```gherkin
Feature: Interoperability
  As a developer integrating Results with external systems
  I want serialization and schema interop
  So that Results can cross system boundaries safely

  Scenario: toJSON produces valid JSON structure
    Given I create an Ok result with value 42
    When I call toJSON
    Then the output should have _tag "Ok" and value 42
    And the output should be JSON.stringify-able

  Scenario: fromJSON round-trip preserves value
    Given I create an Ok result with value "hello"
    When I serialize with toJSON and deserialize with fromJSON
    Then the restored result should pass isResult
    And the restored value should be "hello"

  Scenario: fromJSON rejects invalid input
    Given a plain object with _tag "Invalid"
    When I call fromJSON on it
    Then it should throw a TypeError

  Scenario: toSchema wraps a validator as StandardSchemaV1
    Given a validation function that checks positive numbers
    When I wrap it with toSchema
    Then valid input should return a value result
    And invalid input should return an issues result
```

### Step Definition Pattern

```typescript
// features/steps/immutability.steps.ts
import { Given, When, Then } from "@cucumber/cucumber";
import { ok, err, createError } from "@hex-di/result";
import { expect } from "vitest";

let result: any;
let mapped: any;

Given("I create an Ok result with value {int}", (value: number) => {
  result = ok(value);
});

Given("I create an Err result with error {string}", (error: string) => {
  result = err(error);
});

Then("the result should be frozen", () => {
  expect(Object.isFrozen(result)).toBe(true);
});

Then("modifying the value property should throw a TypeError", () => {
  expect(() => { result.value = 999; }).toThrow(TypeError);
});

When("I map it with a function that doubles the value", () => {
  mapped = result.map((x: number) => x * 2);
});

Then("the original result should still have value {int}", (value: number) => {
  expect(result.value).toBe(value);
});

Then("the mapped result should have value {int}", (value: number) => {
  expect(mapped.value).toBe(value);
});

Then("both results should be frozen", () => {
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(mapped)).toBe(true);
});
```

### CI Integration

```yaml
# Cucumber job in CI
cucumber:
  runs-on: ubuntu-latest
  node: 22
  steps:
    - run: pnpm cucumber-js --format progress --format json:reports/cucumber.json
    - artifact: reports/cucumber.json
```

## Level 6: Performance Tests

See [behaviors/14-benchmarks.md](../behaviors/14-benchmarks.md) for the full benchmark specification.

Performance tests run on every push to `main` and weekly schedule. They do not block PRs but produce regression warnings.

## CI Job Summary

| Job | Level | Matrix | Blocks PR |
|-----|-------|--------|-----------|
| Lint | — | ubuntu, Node 22 | Yes |
| Type Check | Type | Full TS matrix, ubuntu, Node 22 | Yes |
| Unit Tests | Unit | Full Node + OS matrix, latest TS | Yes |
| Type Tests | Type | Full TS matrix, ubuntu, Node 22 | Yes |
| GxP Integrity | GxP | ubuntu, Node 22 | Yes |
| Mutation Tests | Mutation | ubuntu, Node 22 | Yes (90% threshold) |
| Cucumber Tests | BDD | ubuntu, Node 22 | Yes |
| Traceability Verification | — | ubuntu, Node 22 | Yes |
| ATR-1 Compliance (`andTee`/`orTee`) | — | ubuntu, Node 22 | Yes |
| Build | — | ubuntu, Node 22 | Yes |
| Subpath Exports | — | Full Node matrix, ubuntu | Yes |
| Benchmarks | Performance | ubuntu, Node 22 | No (warnings only) |
| Nightly TS Canary | — | ubuntu, Node 22, TS nightly | No (informational) |

## Test Data Management

### Principles

- Test data is **defined inline** in test files, not in external fixtures
- No shared mutable test state between `it` blocks
- Each test creates its own Result instances
- Cucumber scenarios use step parameters for data, not external files

### Standard Test Values

| Type | Ok Values | Err Values |
|------|-----------|------------|
| Primitive | `42`, `"hello"`, `true`, `0`, `""`, `NaN` | `"error"`, `"fail"`, `0`, `null` |
| Object | `{ name: "test" }`, `[1, 2, 3]` | `new Error("msg")`, `{ code: 404 }` |
| Edge cases | `undefined` (as value), `null` (as value) | `undefined`, `""` |
| Nested | `ok(ok(1))` (for flatten) | `err(err("x"))` |
