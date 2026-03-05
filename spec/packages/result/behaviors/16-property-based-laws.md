# 16 — Property-Based Algebraic Laws

Verify monad, functor, and combinator laws via property-based testing with `fast-check`. See [ADR-016](../decisions/016-property-based-monad-laws.md) and [RES-07](../../../research/RES-07-category-theory-composition.md).

## BEH-16-001: Monad Left Identity

`ok(a).andThen(f) ≡ f(a)` — wrapping a value in `Ok` and then binding with `f` is equivalent to calling `f` directly.

```ts
// For all values a: T and functions f: (a: T) => Result<U, E>
ok(a).andThen(f) ≡ f(a)
```

**Tested via**: `fast-check` property with random `a` values and deterministic `f`.

**Algorithm**:

1. Generate random value `a` of type `T` (integer, string, object, array, etc.)
2. Define `f: (a: T) => Result<U, E>` as a deterministic function
3. Compute `left = ok(a).andThen(f)`
4. Compute `right = f(a)`
5. Assert structural equality: `left._tag === right._tag` and `left.value/error === right.value/error`

**Behavior Table**:

| `a`  | `f`                                | `ok(a).andThen(f)` | `f(a)`        | Equal? |
| ---- | ---------------------------------- | ------------------ | ------------- | ------ |
| `5`  | `x => ok(x * 2)`                   | `Ok(10)`           | `Ok(10)`      | Yes    |
| `0`  | `x => x > 0 ? ok(x) : err("zero")` | `Err("zero")`      | `Err("zero")` | Yes    |
| `""` | `x => ok(x.length)`                | `Ok(0)`            | `Ok(0)`       | Yes    |

**Example**:

```ts
import * as fc from "fast-check";
import { ok, err } from "@hex-di/result";

fc.assert(
  fc.property(fc.integer(), a => {
    const f = (x: number) => (x >= 0 ? ok(x * 2) : err("negative" as const));
    const left = ok(a).andThen(f);
    const right = f(a);
    return left._tag === right._tag && (left.isOk() ? left.value === right.unwrapOr(-1) : true);
  })
);
```

**Design notes**:

- The law must hold for ALL types of `a`, not just numbers. Tests should cover integers, strings, objects, arrays, and nested structures.
- Functions `f` must be pure (no side effects) for the law to be meaningful.
- Cross-ref: [INV-17](../invariants.md#inv-17-monad-left-identity).

## BEH-16-002: Monad Right Identity

`m.andThen(ok) ≡ m` — binding a Result with the `ok` constructor returns the same Result.

```ts
// For all m: Result<T, E>
m.andThen(ok) ≡ m
```

**Tested via**: `fast-check` property with random `Result` values.

**Algorithm**:

1. Generate random `Result<T, E>` (either `Ok` or `Err`)
2. Compute `left = m.andThen(ok)`
3. Assert structural equality with `m`

**Behavior Table**:

| `m`           | `m.andThen(ok)` | Equal to `m`?                       |
| ------------- | --------------- | ----------------------------------- |
| `Ok(42)`      | `Ok(42)`        | Yes                                 |
| `Err("fail")` | `Err("fail")`   | Yes (andThen short-circuits on Err) |
| `Ok([1,2,3])` | `Ok([1,2,3])`   | Yes                                 |

**Example**:

```ts
const arbResult = fc.oneof(fc.integer().map(ok), fc.string().map(err));

fc.assert(
  fc.property(arbResult, m => {
    const result = m.andThen(ok);
    return result._tag === m._tag && (m.isOk() ? result.unwrapOr(null) === m.unwrapOr(null) : true);
  })
);
```

**Design notes**:

- For `Err` values, `andThen` short-circuits and returns the original `Err`. This trivially satisfies right identity for the error path.
- Cross-ref: [INV-18](../invariants.md#inv-18-monad-right-identity).

## BEH-16-003: Monad Associativity

`m.andThen(f).andThen(g) ≡ m.andThen(x => f(x).andThen(g))` — chaining two `andThen` calls is equivalent to nesting them.

```ts
// For all m: Result<T, E>, f: T => Result<U, F>, g: U => Result<V, G>
m.andThen(f).andThen(g) ≡ m.andThen(x => f(x).andThen(g))
```

**Tested via**: `fast-check` property with random `Result` values and deterministic `f`, `g`.

**Algorithm**:

1. Generate random `Result<T, E>`
2. Define `f` and `g` as deterministic Result-returning functions
3. Compute `left = m.andThen(f).andThen(g)`
4. Compute `right = m.andThen(x => f(x).andThen(g))`
5. Assert structural equality

**Behavior Table**:

| `m`        | `f`             | `g`            | Left       | Right      | Equal? |
| ---------- | --------------- | -------------- | ---------- | ---------- | ------ |
| `Ok(5)`    | `x => ok(x+1)`  | `x => ok(x*2)` | `Ok(12)`   | `Ok(12)`   | Yes    |
| `Ok(5)`    | `x => err("a")` | `x => ok(x*2)` | `Err("a")` | `Err("a")` | Yes    |
| `Err("e")` | any             | any            | `Err("e")` | `Err("e")` | Yes    |

**Example**:

```ts
fc.assert(
  fc.property(arbResult, m => {
    const f = (x: number) => (x > 0 ? ok(x + 1) : err("neg" as const));
    const g = (x: number) => (x < 100 ? ok(x * 2) : err("big" as const));

    const left = m.andThen(f).andThen(g);
    const right = m.andThen(x => f(x).andThen(g));

    return (
      left._tag === right._tag && (left.isOk() ? left.value === (right as typeof left).value : true)
    );
  })
);
```

**Design notes**:

- Associativity is the most complex law to test because it involves three compositions.
- For `Err` values, both sides short-circuit identically.
- Cross-ref: [INV-19](../invariants.md#inv-19-monad-associativity).

## BEH-16-004: Functor Identity

`m.map(x => x) ≡ m` — mapping with the identity function is a no-op.

```ts
// For all m: Result<T, E>
m.map(x => x) ≡ m
```

**Tested via**: `fast-check` property with random `Result` values.

**Algorithm**:

1. Generate random `Result<T, E>`
2. Compute `result = m.map(x => x)`
3. Assert structural equality with `m`

**Behavior Table**:

| `m`        | `m.map(x => x)` | Equal? |
| ---------- | --------------- | ------ |
| `Ok(42)`   | `Ok(42)`        | Yes    |
| `Err("e")` | `Err("e")`      | Yes    |

**Design notes**:

- This law is simpler than the monad laws but equally important — it verifies `map` doesn't accidentally transform values.

## BEH-16-005: Functor Composition

`m.map(f).map(g) ≡ m.map(x => g(f(x)))` — mapping composes.

```ts
// For all m: Result<T, E>, f: T => U, g: U => V
m.map(f).map(g) ≡ m.map(x => g(f(x)))
```

**Tested via**: `fast-check` property with random `Result` values and deterministic `f`, `g`.

**Algorithm**:

1. Generate random `Result<T, E>`
2. Define `f` and `g` as pure functions
3. Compute `left = m.map(f).map(g)`
4. Compute `right = m.map(x => g(f(x)))`
5. Assert structural equality

**Behavior Table**:

| `m`        | `f`        | `g`        | Left       | Right      | Equal? |
| ---------- | ---------- | ---------- | ---------- | ---------- | ------ |
| `Ok(5)`    | `x => x+1` | `x => x*2` | `Ok(12)`   | `Ok(12)`   | Yes    |
| `Err("e")` | any        | any        | `Err("e")` | `Err("e")` | Yes    |

**Design notes**:

- Functor composition ensures that chaining `map` calls is equivalent to composing the mapped functions. This is important for pipeline optimization.
- `ResultAsync` functor laws should also be tested, but the async nature requires awaiting results before comparison.

## BEH-16-006: Option Monad Laws

The same three monad laws (left identity, right identity, associativity) apply to `Option<T>` with `some` as return and `andThen` as bind.

```ts
// Left identity:  some(a).andThen(f) ≡ f(a)
// Right identity: m.andThen(some) ≡ m
// Associativity:  m.andThen(f).andThen(g) ≡ m.andThen(x => f(x).andThen(g))
```

**Tested via**: `fast-check` properties with random `Option` values (generated via `fc.oneof(arb.map(some), fc.constant(none()))`).

**Design notes**:

- `None` short-circuits `andThen`, analogous to `Err` in `Result`.
- The same test structure applies, substituting `some`/`none` for `ok`/`err`.
