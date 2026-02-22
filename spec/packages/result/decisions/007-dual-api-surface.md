# ADR-007: Dual API Surface

## Status

Accepted

## Context

The library currently exposes only method chaining (`result.map(f).andThen(g)`). This works well for imperative-style code but has two limitations:

1. **Bundle efficiency** — Consumers who use only `map` and `andThen` still import the entire `Result` factory with all methods attached. There is no way to import individual operations for fine-grained tree-shaking.
2. **Pipe composition** — The functional programming community prefers data-last curried functions composed with `pipe()`. Libraries like `fp-ts`, `true-myth`, and `option-t` support this pattern. Without standalone functions, `@hex-di/result` cannot participate in generic pipe chains.

Approaches considered:

1. **Method chaining only** (current) — Simple, discoverable, but poor tree-shaking granularity.
2. **Standalone functions only** — Maximum tree-shaking but unfamiliar to most TS developers.
3. **Dual API** — Method chaining as the default, standalone functions as an opt-in module.

## Decision

Provide both API surfaces:

1. **Method chaining** (default) — The primary API via `import { ok, err } from "@hex-di/result"`. All methods live on the `Result` instance.
2. **Standalone curried functions** — Available via `import { map } from "@hex-di/result/fn"` or individual `import { map } from "@hex-di/result/fn/map"`.

### Standalone function design

Every standalone function is **curried and data-last**:

```ts
// Curried: returns a function that accepts a Result
const mapToString = map((n: number) => n.toString());

// Data-last: the Result is the last argument
mapToString(ok(42)); // Ok<string, never>
```

### Delegation invariant

Standalone functions **delegate to the Result instance method** — they contain no logic of their own. This prevents logic duplication and ensures behavioral consistency:

```ts
// src/fn/map.ts
export function map<T, U>(f: (value: T) => U) {
  return <E>(result: Result<T, E>): Result<U, E> => result.map(f);
}
```

See [INV-14](../invariants.md#inv-14-standalone-functions-delegate).

### pipe() utility

A `pipe()` function enables left-to-right composition:

```ts
import { pipe } from "@hex-di/result/fn";
import { map, andThen, unwrapOr } from "@hex-di/result/fn";

const result = pipe(
  ok(42),
  map(n => n * 2),
  andThen(n => n > 50 ? ok(n) : err("too small")),
  unwrapOr(0)
);
```

`pipe()` is typed with overloads up to 12 type parameters for inference.

## Consequences

**Positive**:
- Consumers can import only the functions they use → excellent tree-shaking
- Subpath exports (`@hex-di/result/fn/*`) enable per-function bundling
- Pipe chains compose naturally with other data-last libraries
- Method chaining remains the default — no migration burden
- No logic duplication — standalone functions are thin wrappers

**Negative**:
- Two API surfaces to document and maintain
- Standalone function types must stay in sync with instance method types
- `pipe()` type inference has limits (12 overloads is a practical ceiling)

**Trade-off accepted**: The documentation and maintenance cost is justified by the significant improvement in bundle efficiency (6→10) and composability (9→10).
