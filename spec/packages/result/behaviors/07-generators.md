# 07 — Generators

Generator-based early return, emulating Rust's `?` operator.

## BEH-07-001: safeTry(generatorFn)

Executes a generator function where `yield*` on a `Result` either extracts the `Ok` value or early-returns the `Err`.

### Sync Overload

```ts
function safeTry<Y extends Err<never, unknown>, T, RE>(
  generator: () => Generator<Y, Result<T, RE>, unknown>
): Result<T, ExtractErrType<Y> | RE>
```

The generator function:
- `yield*` on an `Ok` result extracts the value (the generator continues)
- `yield*` on an `Err` result causes early return (the generator is cleaned up)
- Must return a `Result<T, RE>` as its final value

### Async Overload

```ts
function safeTry<Y extends Err<never, unknown>, T, RE>(
  generator: () => AsyncGenerator<Y, Result<T, RE>, unknown>
): ResultAsync<T, ExtractErrType<Y> | RE>
```

Same semantics but with `AsyncGenerator` and `ResultAsync` return type.

**Dispatch**: The implementation checks `Symbol.asyncIterator in gen` to determine which overload was called.

### Error Type Accumulation

```ts
type ExtractErrType<Y> = Y extends Err<never, infer E> ? E : never;
```

The error type of the returned `Result` is the union of:
1. `ExtractErrType<Y>` — all error types from yielded `Err` values
2. `RE` — the error type from the generator's return `Result`

## BEH-07-002: yield* Protocol

The `yield*` mechanism works through the `[Symbol.iterator]()` method on `Result`:

### On Ok

```ts
// Ok's iterator: returns value immediately (done: true on first next())
[Symbol.iterator](): Generator<never, T, unknown>
```

The iterator is a plain object (not a generator function) that returns `{ done: true, value }` on the first `next()` call. Since it yields nothing (`Generator<never, ...>`), `yield*` resolves immediately to `value`.

### On Err

```ts
// Err's iterator: yields self, then throws
*[Symbol.iterator](): Generator<Err<never, E>, never, unknown> {
  yield self;
  throw new Error("unreachable: generator continued after yield in Err");
}
```

The iterator yields the `Err` instance itself. The `safeTry` runner detects the yielded `Err` and calls `gen.return()` to clean up the generator before returning the error. The `throw` after the yield is a safety net — it fires only if something continues the generator past the yield point (which `safeTry` never does).

## BEH-07-003: Runner Implementation

### Sync Runner

```ts
function runSync(gen): Result<unknown, unknown> {
  for (;;) {
    const next = gen.next();
    if (next.done) return next.value;   // Generator completed — return final Result
    const yieldedErr = next.value;       // Yielded Err — early return
    gen.return(err(yieldedErr.error));    // Clean up generator (run finally blocks)
    return err(yieldedErr.error);
  }
}
```

### Async Runner

```ts
async function runAsync(gen): Promise<Result<unknown, unknown>> {
  for (;;) {
    const next = await gen.next();
    if (next.done) return next.value;
    const yieldedErr = next.value;
    await gen.return(err(yieldedErr.error));
    return err(yieldedErr.error);
  }
}
```

The async runner wraps the result in `ResultAsyncClass.fromSafePromise(promise).andThen(result => result)` to flatten the `Result` inside the promise.

## BEH-07-004: Generator Cleanup

When an `Err` is encountered:
1. The runner calls `gen.return(...)` which triggers any `finally` blocks in the generator
2. The error is re-wrapped with `err()` and returned
3. The generator is not used after `return()` is called

This ensures resource cleanup (e.g., closing file handles in `finally` blocks) even on early return.

## BEH-07-005: Usage Example

```ts
const result = safeTry(function* () {
  const a = yield* ok(1);          // a: number = 1
  const b = yield* ok(2);          // b: number = 2
  const c = yield* err("oops");    // early return: Err("oops")
  // This line is never reached
  return ok(a + b + c);
});
// result: Err<never, string>
```
