# 07 — Generators

Generator-based early return, emulating Rust's `?` operator.

## BEH-07-001: safeTry(generatorFn)

Executes a generator function where `yield*` on a `Result` either extracts the `Ok` value or early-returns the `Err`.

### Sync Overload

```ts
function safeTry<Y extends Err<never, unknown>, T, RE>(
  generator: () => Generator<Y, Result<T, RE>, unknown>
): Result<T, ExtractErrType<Y> | RE>;
```

The generator function:

- `yield*` on an `Ok` result extracts the value (the generator continues)
- `yield*` on an `Err` result causes early return (the generator is cleaned up)
- Must return a `Result<T, RE>` as its final value

### Async Overload

```ts
function safeTry<Y extends Err<never, unknown> | ResultAsync<unknown, unknown>, T, RE>(
  generator: () => AsyncGenerator<Y, Result<T, RE>, unknown>
): ResultAsync<T, ExtractErrType<Y> | RE>;
```

Same early-return semantics but with `AsyncGenerator` and `ResultAsync` return type. The yield type `Y` accepts both `Err` (from sync `yield* result`) and `ResultAsync` (from `yield* resultAsync`).

**Dispatch**: The implementation checks `Symbol.asyncIterator in gen` to determine which overload was called.

### Error Type Accumulation

```ts
type ExtractErrType<Y> =
  | (Y extends Err<never, infer E> ? E : never)
  | (Y extends ResultAsync<unknown, infer E> ? E : never);
```

The error type of the returned `Result` is the union of:

1. Error types from yielded `Err` values (sync `Result` path)
2. Error types from yielded `ResultAsync` values (async path)
3. `RE` — the error type from the generator's return `Result`

## BEH-07-002: yield\* Protocol

The `yield*` mechanism works through `[Symbol.iterator]()` on `Result` and `ResultAsync`:

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

### On ResultAsync

```ts
// ResultAsync's iterator: yields self as command, receives resolved value back
*[Symbol.iterator](): Generator<ResultAsync<T, E>, T, T | typeof RESULT_ASYNC_YIELD> {
  const sent = yield this;
  if (isNotYieldMarker<T>(sent)) {
    return sent;
  }
  throw new Error("unreachable: ResultAsync iterator requires a value from safeTry runner");
}
```

A private `RESULT_ASYNC_YIELD` marker symbol occupies the `TNext` position so TypeScript accepts the `undefined` sent by JavaScript on the first `gen.next()` call. The `isNotYieldMarker<T>` type guard narrows `sent` to `T` without any cast.

The iterator uses **bidirectional generator communication**:

1. `yield this` — hands the `ResultAsync` instance to the `safeTry` runner
2. The runner awaits the `ResultAsync`, resolves it to a `Result`
3. If `Ok`: the runner calls `gen.next(value)`, which sends `value` back into the generator. The inner iterator returns `value`, and `yield*` evaluates to it.
4. If `Err`: the runner short-circuits with `gen.return(err(...))` — the generator never resumes.

This follows the same pattern used by Effect-ts, where `Effect[Symbol.iterator]` yields the Effect as a "command" to the `Effect.gen` runner. See [ADR-019](../decisions/019-resultasync-iterator-protocol.md).

**Backward compatibility**: `yield* await resultAsync` still works. The `await` resolves `ResultAsync` to `Result`, then `yield*` delegates to `Result[Symbol.iterator]` as before. The `await` is no longer required but remains valid.

## BEH-07-003: Runner Implementation

### Sync Runner

```ts
function runSync(gen): Result<unknown, unknown> {
  for (;;) {
    const next = gen.next();
    if (next.done) return next.value; // Generator completed — return final Result
    const yieldedErr = next.value; // Yielded Err — early return
    gen.return(err(yieldedErr.error)); // Clean up generator (run finally blocks)
    return err(yieldedErr.error);
  }
}
```

### Async Runner

```ts
async function runAsync(gen): Promise<Result<unknown, unknown>> {
  let feedBack: unknown = undefined;
  for (;;) {
    const next = await gen.next(feedBack);
    if (next.done) return next.value;

    const yielded = next.value;

    if (isResultAsync(yielded)) {
      // ResultAsync: await, then feed value back or short-circuit
      const resolved = await yielded;
      if (resolved.isErr()) {
        await gen.return(err(resolved.error));
        return err(resolved.error);
      }
      feedBack = resolved.value;
    } else {
      // Err from sync Result: short-circuit
      await gen.return(err(yielded.error));
      return err(yielded.error);
    }
  }
}
```

The async runner handles two kinds of yielded values:

| Yielded value       | Source                         | Runner action                                                          |
| ------------------- | ------------------------------ | ---------------------------------------------------------------------- |
| `Err<never, E>`     | `yield* syncResult` (Err case) | Short-circuit                                                          |
| `ResultAsync<T, E>` | `yield* resultAsync`           | Await → Ok: feed value back via `gen.next(value)` / Err: short-circuit |

The runner uses `isResultAsync()` ([INV-9](../invariants.md#inv-9-resultasync-brand-identity)) to distinguish the two cases.

The result is wrapped in `ResultAsyncClass.fromSafePromise(promise).andThen(result => result)` to flatten the `Result` inside the promise.

## BEH-07-004: Generator Cleanup

When an `Err` is encountered:

1. The runner calls `gen.return(...)` which triggers any `finally` blocks in the generator
2. The error is re-wrapped with `err()` and returned
3. The generator is not used after `return()` is called

This ensures resource cleanup (e.g., closing file handles in `finally` blocks) even on early return.

## BEH-07-005: Usage Examples

### Sync

```ts
const result = safeTry(function* () {
  const a = yield* ok(1); // a: number = 1
  const b = yield* ok(2); // b: number = 2
  const c = yield* err("oops"); // early return: Err("oops")
  // This line is never reached
  return ok(a + b + c);
});
// result: Err<never, string>
```

### Async — uniform yield\*

```ts
declare function parseId(raw: string): Result<number, ParseError>;
declare function fetchUser(id: number): ResultAsync<User, NotFound | NetworkError>;
declare function fetchPosts(userId: number): ResultAsync<Post[], NetworkError>;

function getUserProfile(raw: string) {
  return safeTry(async function* () {
    const id = yield* parseId(raw); // sync Result
    const user = yield* fetchUser(id); // ResultAsync — no await needed
    const posts = yield* fetchPosts(user.id); // ResultAsync — no await needed
    return ok({ user, posts });
  });
}
// ResultAsync<{ user: User; posts: Post[] }, ParseError | NotFound | NetworkError>
```

### Backward compatible — yield\* await still works

```ts
const result = safeTry(async function* () {
  const user = yield* await fetchUser(42); // await is optional, still valid
  return ok(user);
});
```
