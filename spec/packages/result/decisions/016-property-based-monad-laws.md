# ADR-016: Property-Based Monad Law Testing

## Status

Proposed

## Context

`@hex-di/result` is documented as a Monad (see [glossary](../glossary.md#monad)): it provides `ok()` (return) and `andThen()` (bind). The monad laws — left identity, right identity, and associativity — are tested via individual unit tests, but these example-based tests only verify specific inputs. They do not provide the exhaustive coverage needed to prove the laws hold **for all inputs**.

Category theory research (see [RES-07](../../../research/RES-07-category-theory-composition.md)) shows that property-based testing (PBT) with tools like `fast-check` can verify algebraic laws across thousands of random inputs, catching edge cases that example-based tests miss.

### Current testing

```typescript
// Unit test: one specific input
test("left identity: ok(a).andThen(f) === f(a)", () => {
  const f = (x: number) => ok(x * 2);
  expect(ok(5).andThen(f)).toEqual(f(5));
});
```

### Desired testing

```typescript
// Property-based: all inputs of type T
fc.assert(
  fc.property(fc.integer(), a => {
    const f = (x: number) => ok(x * 2);
    deepEqual(ok(a).andThen(f), f(a)); // Left identity
  })
);
```

### Laws to verify

1. **Left identity**: `ok(a).andThen(f) ≡ f(a)` — wrapping a value and then binding is the same as applying directly
2. **Right identity**: `m.andThen(ok) ≡ m` — binding with the constructor is a no-op
3. **Associativity**: `m.andThen(f).andThen(g) ≡ m.andThen(x => f(x).andThen(g))` — binding chains are associative

Additionally, the Functor law: 4. **Identity**: `m.map(id) ≡ m` — mapping with the identity function is a no-op 5. **Composition**: `m.map(f).map(g) ≡ m.map(x => g(f(x)))` — mapping composes

## Decision

**Add property-based tests using `fast-check` to verify monad, functor, and combinator laws for `Result`, `ResultAsync`, and `Option`.**

### Test structure

```typescript
// tests/laws/monad-laws.test.ts
import * as fc from "fast-check";
import { ok, err } from "@hex-di/result";

// Arbitraries
const arbOk = <T>(arb: fc.Arbitrary<T>) => arb.map(ok);
const arbErr = <E>(arb: fc.Arbitrary<E>) => arb.map(err);
const arbResult = <T, E>(arbT: fc.Arbitrary<T>, arbE: fc.Arbitrary<E>) =>
  fc.oneof(arbOk(arbT), arbErr(arbE));

// Laws
describe("Monad Laws", () => {
  const f = (x: number) => (x > 0 ? ok(x * 2) : err("negative"));
  const g = (x: number) => (x < 1000 ? ok(x + 1) : err("overflow"));

  test("left identity", () => {
    fc.assert(
      fc.property(fc.integer(), a => {
        deepEqual(ok(a).andThen(f), f(a));
      })
    );
  });

  test("right identity", () => {
    fc.assert(
      fc.property(arbResult(fc.integer(), fc.string()), m => {
        deepEqual(m.andThen(ok), m);
      })
    );
  });

  test("associativity", () => {
    fc.assert(
      fc.property(arbResult(fc.integer(), fc.string()), m => {
        deepEqual(
          m.andThen(f).andThen(g),
          m.andThen(x => f(x).andThen(g))
        );
      })
    );
  });
});
```

### Equality semantics

`Result` values are frozen objects with methods. Structural equality (`deepEqual`) compares `_tag`, `value`/`error`, and brand. Method references are not compared.

### Test scope

| Type                | Laws Tested                                   |
| ------------------- | --------------------------------------------- |
| `Result<T, E>`      | Monad (3), Functor (2)                        |
| `ResultAsync<T, E>` | Monad (3), Functor (2)                        |
| `Option<T>`         | Monad (3), Functor (2)                        |
| Combinators         | `all` associativity, `partition` conservation |

## Consequences

### Positive

1. **High confidence**: Thousands of random inputs per law, catching edge cases
2. **Regression prevention**: Laws are mathematical invariants — they should never break
3. **Documentation**: Property tests serve as executable documentation of algebraic properties

### Negative

1. **Test dependency**: Adds `fast-check` as a dev dependency
2. **Test time**: Property-based tests are slower than unit tests (mitigated by limiting iterations)
3. **Equality comparison**: Frozen objects with closures require custom equality functions

### Neutral

1. **Test level**: These are "algebraic law" tests, sitting between unit tests and integration tests in the test pyramid
2. **CI integration**: Run as part of the regular test suite; no special infrastructure needed

## References

- [INV-17](../invariants.md#inv-17-monad-left-identity) (proposed): Monad Left Identity
- [INV-18](../invariants.md#inv-18-monad-right-identity) (proposed): Monad Right Identity
- [INV-19](../invariants.md#inv-19-monad-associativity) (proposed): Monad Associativity
- [BEH-16](../behaviors/16-property-based-laws.md): Property-Based Laws behavior
- [RES-07](../../../research/RES-07-category-theory-composition.md): Category Theory & Composition
