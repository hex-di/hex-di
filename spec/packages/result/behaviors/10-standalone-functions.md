# 10 — Standalone Functions

Curried, data-last functions for pipe-style composition. See [ADR-007](../decisions/007-dual-api-surface.md).

## BEH-10-001: Module Structure

```
src/fn/
  index.ts          # Barrel re-export of all standalone functions + pipe
  pipe.ts           # pipe() utility
  map.ts            # map(f)
  map-err.ts        # mapErr(f)
  map-both.ts       # mapBoth(onOk, onErr)
  and-then.ts       # andThen(f)
  or-else.ts        # orElse(f)
  match.ts          # match(onOk, onErr)
  unwrap-or.ts      # unwrapOr(default)
  flatten.ts        # flatten()
  flip.ts           # flip()
  and.ts            # and(other)
  or.ts             # or(other)
  map-or.ts         # mapOr(default, f)
  map-or-else.ts    # mapOrElse(defaultF, f)
  contains.ts       # contains(value)
  contains-err.ts   # containsErr(error)
  inspect.ts        # inspect(f)
  inspect-err.ts    # inspectErr(f)
  to-nullable.ts    # toNullable()
  to-undefined.ts   # toUndefined()
  into-tuple.ts     # intoTuple()
  merge.ts          # merge()
  to-option.ts      # toOption()
  to-option-err.ts  # toOptionErr()
  to-json.ts        # toJSON()
```

**Import paths**:
```ts
// Barrel import
import { map, andThen, pipe } from "@hex-di/result/fn";

// Individual imports (maximum tree-shaking)
import { map } from "@hex-di/result/fn/map";
import { pipe } from "@hex-di/result/fn/pipe";
```

## BEH-10-002: pipe(value, ...fns)

Left-to-right function composition with overloads for type inference.

```ts
function pipe<A>(value: A): A;
function pipe<A, B>(value: A, f1: (a: A) => B): B;
function pipe<A, B, C>(value: A, f1: (a: A) => B, f2: (b: B) => C): C;
function pipe<A, B, C, D>(value: A, f1: (a: A) => B, f2: (b: B) => C, f3: (c: C) => D): D;
// ... overloads up to 12 type parameters
function pipe<A, B, C, D, E, F, G, H, I, J, K, L>(
  value: A,
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
  f4: (d: D) => E,
  f5: (e: E) => F,
  f6: (f: F) => G,
  f7: (g: G) => H,
  f8: (h: H) => I,
  f9: (i: I) => J,
  f10: (j: J) => K,
  f11: (k: K) => L
): L;
```

**Behavior**: `pipe(value, f1, f2, ..., fn)` is equivalent to `fn(...(f2(f1(value))))`.

**Example**:
```ts
const result = pipe(
  ok(42),
  map(n => n * 2),
  andThen(n => n > 50 ? ok(n) : err("too small")),
  unwrapOr(0)
);
// result: number
```

## BEH-10-003: Standalone Function Signatures

Every standalone function is curried and data-last. The `Result` argument is always the last parameter, applied by returning a function.

### Delegation Invariant

Every function delegates to the corresponding `Result` instance method. No standalone function contains its own logic. See [INV-14](../invariants.md#inv-14-standalone-functions-delegate).

### Transformation Functions

#### map(f)

```ts
function map<T, U>(f: (value: T) => U): <E>(result: Result<T, E>) => Result<U, E>
```

Delegates to `result.map(f)`.

#### mapErr(f)

```ts
function mapErr<E, F>(f: (error: E) => F): <T>(result: Result<T, E>) => Result<T, F>
```

Delegates to `result.mapErr(f)`.

#### mapBoth(onOk, onErr)

```ts
function mapBoth<T, U, E, F>(
  onOk: (value: T) => U,
  onErr: (error: E) => F
): (result: Result<T, E>) => Result<U, F>
```

Delegates to `result.mapBoth(onOk, onErr)`.

#### flatten()

```ts
function flatten<T, E1, E2>(): (result: Result<Result<T, E1>, E2>) => Result<T, E1 | E2>
```

Delegates to `result.flatten()`.

#### flip()

```ts
function flip<T, E>(): (result: Result<T, E>) => Result<E, T>
```

Delegates to `result.flip()`.

### Chaining Functions

#### andThen(f)

```ts
function andThen<T, U, F>(
  f: (value: T) => Result<U, F>
): <E>(result: Result<T, E>) => Result<U, E | F>
```

Delegates to `result.andThen(f)`.

#### orElse(f)

```ts
function orElse<E, U, F>(
  f: (error: E) => Result<U, F>
): <T>(result: Result<T, E>) => Result<T | U, F>
```

Delegates to `result.orElse(f)`.

### Logical Combinators

#### and(other)

```ts
function and<U, F>(
  other: Result<U, F>
): <T, E>(result: Result<T, E>) => Result<U, E | F>
```

Delegates to `result.and(other)`. See [03-transformation.md](03-transformation.md#beh-03-013-andother).

#### or(other)

```ts
function or<U, F>(
  other: Result<U, F>
): <T, E>(result: Result<T, E>) => Result<T | U, F>
```

Delegates to `result.or(other)`. See [03-transformation.md](03-transformation.md#beh-03-014-orother).

### Extraction Functions

#### match(onOk, onErr)

```ts
function match<T, E, A, B>(
  onOk: (value: T) => A,
  onErr: (error: E) => B
): (result: Result<T, E>) => A | B
```

Delegates to `result.match(onOk, onErr)`.

#### unwrapOr(defaultValue)

```ts
function unwrapOr<U>(defaultValue: U): <T, E>(result: Result<T, E>) => T | U
```

Delegates to `result.unwrapOr(defaultValue)`.

#### mapOr(defaultValue, f)

```ts
function mapOr<U>(
  defaultValue: U,
  f: (value: unknown) => U
): <T, E>(result: Result<T, E>) => U
```

Delegates to `result.mapOr(defaultValue, f)`. See [03-transformation.md](03-transformation.md#beh-03-015-mapordefault-f).

#### mapOrElse(defaultF, f)

```ts
function mapOrElse<E, U>(
  defaultF: (error: E) => U,
  f: (value: unknown) => U
): <T>(result: Result<T, E>) => U
```

Delegates to `result.mapOrElse(defaultF, f)`. See [03-transformation.md](03-transformation.md#beh-03-016-maporelsedefaultf-f).

### Inspection Functions

#### contains(value)

```ts
function contains<T>(value: T): <E>(result: Result<T, E>) => boolean
```

Delegates to `result.contains(value)`. See [03-transformation.md](03-transformation.md#beh-03-017-containsvalue).

#### containsErr(error)

```ts
function containsErr<E>(error: E): <T>(result: Result<T, E>) => boolean
```

Delegates to `result.containsErr(error)`. See [03-transformation.md](03-transformation.md#beh-03-018-containserrerror).

#### inspect(f)

```ts
function inspect<T>(f: (value: T) => void): <E>(result: Result<T, E>) => Result<T, E>
```

Delegates to `result.inspect(f)`.

#### inspectErr(f)

```ts
function inspectErr<E>(f: (error: E) => void): <T>(result: Result<T, E>) => Result<T, E>
```

Delegates to `result.inspectErr(f)`.

### Conversion Functions

#### toNullable()

```ts
function toNullable<T, E>(): (result: Result<T, E>) => T | null
```

Delegates to `result.toNullable()`.

#### toUndefined()

```ts
function toUndefined<T, E>(): (result: Result<T, E>) => T | undefined
```

Delegates to `result.toUndefined()`.

#### intoTuple()

```ts
function intoTuple<T, E>(): (result: Result<T, E>) => [null, T] | [E, null]
```

Delegates to `result.intoTuple()`.

#### merge()

```ts
function merge<T, E>(): (result: Result<T, E>) => T | E
```

Delegates to `result.merge()`.

#### toOption()

```ts
function toOption<T, E>(): (result: Result<T, E>) => Option<T>
```

Delegates to `result.toOption()`. See [03-transformation.md](03-transformation.md#beh-03-019-tooption).

#### toOptionErr()

```ts
function toOptionErr<T, E>(): (result: Result<T, E>) => Option<E>
```

Delegates to `result.toOptionErr()`. See [03-transformation.md](03-transformation.md#beh-03-020-tooptionerr).

#### toJSON()

```ts
function toJSON<T, E>(): (result: Result<T, E>) => { _tag: "Ok"; value: T } | { _tag: "Err"; error: E }
```

Delegates to `result.toJSON()`.

## BEH-10-004: Usage Examples

### Basic pipe chain

```ts
import { pipe } from "@hex-di/result/fn";
import { map, andThen, unwrapOr } from "@hex-di/result/fn";

const doubled = pipe(
  ok(21),
  map(n => n * 2),
  unwrapOr(0)
);
// doubled: number = 42
```

### Composing reusable pipelines

```ts
import { map, andThen } from "@hex-di/result/fn";

const parseAndValidate = (result: Result<string, Error>) =>
  pipe(
    result,
    andThen(s => {
      const n = parseInt(s, 10);
      return isNaN(n) ? err(new Error("not a number")) : ok(n);
    }),
    map(n => n * 2)
  );
```

### Mixing with method chaining

Standalone functions and method chaining can be mixed freely:

```ts
const result = ok(42)
  .map(n => n.toString())              // method chaining
  .andThen(s => validateString(s));    // method chaining

const final = pipe(
  result,
  map(s => s.toUpperCase()),           // standalone function
  unwrapOr("default")                  // standalone function
);
```
