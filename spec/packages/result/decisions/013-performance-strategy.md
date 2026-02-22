# ADR-013: Performance Strategy

## Status

Accepted

## Context

The library uses closures over classes ([ADR-001](001-closures-over-classes.md)): every `ok()` or `err()` call allocates a fresh object with ~30 method closures, stamps it with `RESULT_BRAND`, and calls `Object.freeze()`. This architecture was chosen for ergonomic reasons (no `this` binding issues, no prototype chain), but it has performance costs:

1. **Per-instance memory** — Each instance owns its own copy of every method. Class-based approaches share methods via prototype.
2. **GC pressure** — Short-lived Results (common in map/andThen chains) allocate and discard many closures.
3. **Freeze overhead** — `Object.freeze()` has a small but measurable cost per call (~1μs on V8).
4. **No inline caching** — V8 optimizes prototype-based method lookups via inline caches. Closure-based objects with many properties create wider hidden classes, reducing IC hit rates.

Competitors handle this differently:

| Library | Approach | Trade-off |
|---------|----------|-----------|
| neverthrow | Class instances | Prototype sharing, but `this` binding issues |
| option-t | Plain objects, no methods | Near-zero overhead, but no method chaining |
| Effect | Class instances + fiber runtime | Shared methods, but heavy runtime |
| oxide.ts | Class instances | Prototype sharing, `instanceof` checks |
| Rust std | Compiler-optimized enum | Zero-cost abstractions (not applicable to JS) |

The question is whether to optimize the runtime implementation and how to prove the library's performance characteristics.

## Decision

Adopt a three-part performance strategy:

### Part 1: Published Benchmark Suite

Create a comprehensive benchmark suite that measures and publishes the library's performance characteristics against concrete baselines. The benchmark suite is the primary deliverable — it proves whether the architecture is acceptable or whether optimization is needed.

See [behaviors/14-benchmarks.md](../behaviors/14-benchmarks.md) for the full benchmark specification.

### Part 2: Selective Prototype Optimization

If benchmarks reveal unacceptable overhead (>3x construction cost vs plain objects, or >5% end-to-end overhead in real-world scenarios), apply a **selective prototype** optimization:

- **Chaining methods** (always called as `result.map(f)`) move to a shared prototype
- **Extractable methods** (commonly destructured or passed as callbacks) remain as closures

#### Chaining methods → prototype (~25 methods)

These are always called via dot notation on the instance. Prototype lookup is safe:

`map`, `mapErr`, `mapBoth`, `andThen`, `orElse`, `andTee`, `orTee`, `andThrough`, `inspect`, `inspectErr`, `flatten`, `flip`, `and`, `or`, `mapOr`, `mapOrElse`, `contains`, `containsErr`, `toAsync`, `asyncMap`, `asyncAndThen`, `toJSON`, `toNullable`, `toUndefined`, `intoTuple`, `merge`, `toOption`, `toOptionErr`, `transpose`

#### Extractable methods → closures (~5 methods)

These are commonly destructured from the Result or passed as callbacks:

`match`, `unwrapOr`, `unwrapOrElse`, `isOk`, `isErr`

#### Implementation sketch

```ts
const okMethods = {
  map(this: Ok<unknown, unknown>, f: Function) {
    return ok(f(this.value));
  },
  andThen(this: Ok<unknown, unknown>, f: Function) {
    return f(this.value);
  },
  // ... ~25 methods
};

function ok<T>(value: T): Ok<T, never> {
  const self = Object.create(okMethods) as Ok<T, never>;
  // Data properties (own, frozen)
  self._tag = "Ok";
  self.value = value;
  self[RESULT_BRAND] = true;
  // Extractable methods (own closures, frozen with the instance)
  self.match = (onOk, _onErr) => onOk(value);
  self.unwrapOr = (_default) => value;
  self.unwrapOrElse = (_f) => value;
  self.isOk = () => true;
  self.isErr = () => false;
  Object.freeze(self);
  return self;
}
```

#### Invariant preservation

| Invariant | Status |
|-----------|--------|
| INV-1 (Frozen instances) | Preserved — `Object.freeze(self)` still called |
| INV-3 (Brand prevents forgery) | Preserved — `RESULT_BRAND` is an own property |
| INV-6 (Phantom types) | Preserved — no runtime change |
| INV-14 (Standalone delegate) | Preserved — `fn/*.ts` still calls instance methods |

The only behavioral change: prototype chaining methods now reference `this`. If a user destructures a chaining method (`const { map } = ok(1)`), the destructured `map` loses its `this` context and fails. This is acceptable because:

1. Chaining methods are designed for fluent chains (`result.map(f).andThen(g)`)
2. Destructuring chaining methods has no valid use case (unlike `match` or `isOk`)
3. The standalone functions (`@hex-di/result/fn/map`) exist precisely for detached usage

### Part 3: Conditional Application

The selective prototype optimization is **not applied by default**. The decision tree:

1. Implement the benchmark suite (Part 1)
2. Run benchmarks against the current closure architecture
3. If all targets pass → ship with closures, publish benchmark results as proof
4. If construction or memory targets fail → apply selective prototype (Part 2)
5. Re-run benchmarks to confirm improvement
6. Publish both before/after results

This ensures the optimization is data-driven, not premature.

## Consequences

**Positive**:
- Published benchmarks give users confidence in performance characteristics
- Selective prototype reduces per-instance memory by ~80% (5 closures instead of 30)
- V8 inline caching improves method call throughput on prototype-based methods
- Extractable methods remain `this`-free — `match`, `isOk`, `isErr` can still be destructured
- The optimization is reversible — switching between closure and prototype is an implementation detail, not an API change

**Negative**:
- Prototype-based methods use `this`, breaking destructuring for chaining methods (acceptable — standalone functions cover this)
- `Object.getPrototypeOf(ok(1))` no longer returns `Object.prototype` — returns the shared `okMethods` object instead
- Two method dispatch mechanisms in one object (prototype + own closures) adds implementation complexity
- Benchmark suite requires ongoing maintenance as the API surface grows

**Trade-off accepted**: The benchmark-first approach ensures optimization decisions are evidence-based. The selective prototype is a minimal, targeted change that preserves all user-facing invariants and the ergonomic properties that matter (extractable method destructuring) while eliminating the overhead that doesn't (per-instance chaining method allocation).
