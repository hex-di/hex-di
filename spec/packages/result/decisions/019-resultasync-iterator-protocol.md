# ADR-019: ResultAsync Iterator Protocol for Generator Yield

## Status

Accepted

## Context

`safeTry` generators emulate Rust's `?` operator: `yield*` on a `Result` either extracts the `Ok` value or early-returns the `Err`. This works because `Ok` and `Err` implement `[Symbol.iterator]()` (see [BEH-07-002](../behaviors/07-generators.md#beh-07-002-yield-protocol)).

For async operations, `ResultAsync` does **not** implement any iterator protocol. Users must write `yield* await resultAsync` — the `await` converts `ResultAsync` to `Result`, then `yield*` works on the `Result`:

```ts
const result = safeTry(async function* () {
  const user = yield* await fetchUser(id); // await required
  const posts = yield* await fetchPosts(id); // await required
  return ok({ user, posts });
});
```

### Problems with `yield* await`

1. **Inconsistent syntax** — Sync `Result` uses `yield*`, async `ResultAsync` requires `yield* await`. The developer must track which functions return `Result` vs `ResultAsync` and adjust syntax accordingly.

2. **Refactoring friction** — Changing a function from `Result` to `ResultAsync` (e.g., adding a network call to a previously sync validation) requires updating every `safeTry` call site that uses it.

3. **Rust analogy breaks** — The `?` operator in Rust works uniformly in sync and async contexts. The `yield* await` pattern undermines the "TypeScript's answer to `?`" positioning.

4. **Mixed chains are noisy** — Real-world `safeTry` blocks mix sync and async operations. The visual asymmetry hurts readability:
   ```ts
   const raw = yield * parseOrderId(orderId); // sync
   const order = yield * (await fetchOrder(raw)); // async — needs await
   const validated = yield * validateOrder(order); // sync
   const payment = yield * (await chargePayment(validated)); // async — needs await
   ```

### Prior art: Effect-ts

Effect-ts solves this with the same mechanism we propose. `Effect<A, E, R>` implements `[Symbol.iterator]()` as a generator that yields itself and receives the resolved value back via `gen.next(value)`:

```ts
// Simplified Effect[Symbol.iterator]:
*[Symbol.iterator]() {
  return yield this;
}
```

`Effect.gen(function* () { ... })` uses a **sync** generator. The runner receives yielded `Effect` values, executes them (possibly async), and feeds results back. This pattern is proven at scale in the Effect ecosystem.

The key insight: `[Symbol.iterator]` on a lazy/async type doesn't mean "iterate over contents." It means **"yield yourself as a command to the runner."** The runner interprets the command and sends the result back through the generator's bidirectional communication channel.

## Decision

**Add `[Symbol.iterator]()` to `ResultAsync<T, E>` so that `yield*` works directly on `ResultAsync` values inside `safeTry` generators.**

### ResultAsync Iterator Protocol

```ts
// On ResultAsync<T, E>:
*[Symbol.iterator](): Generator<ResultAsync<T, E>, T, T | typeof RESULT_ASYNC_YIELD> {
  const sent = yield this;
  if (isNotYieldMarker<T>(sent)) {
    return sent;
  }
  throw new Error("unreachable: ResultAsync iterator requires a value from safeTry runner");
}
```

A private `RESULT_ASYNC_YIELD` marker symbol and `isNotYieldMarker<T>` type guard replace the `as any` cast that would otherwise be needed. The marker type occupies the `TNext` position so TypeScript does not complain about the `undefined` that JavaScript sends on the first `gen.next()` call. The type guard narrows `sent` from `T | typeof RESULT_ASYNC_YIELD` to `T` without any cast.

The iterator:

1. **Yields `this`** — hands the `ResultAsync` instance to the `safeTry` runner
2. **Receives `T` back** — the runner resolves the `ResultAsync`, extracts the `Ok` value, and sends it via `gen.next(value)`
3. **Returns `T`** — `yield*` evaluates to the resolved value

If the `ResultAsync` resolves to `Err`, the runner short-circuits before calling `gen.next()`, just as it does for sync `Err`.

### Updated safeTry Runner (Async)

The async runner must handle two kinds of yielded values:

| Yielded value       | Source                                    | Runner action                                                  |
| ------------------- | ----------------------------------------- | -------------------------------------------------------------- |
| `Err<never, E>`     | `yield* syncResult` (where result is Err) | Short-circuit: `gen.return(err(...))`, return error            |
| `ResultAsync<T, E>` | `yield* resultAsync`                      | Await, then: if Ok → `gen.next(value)`, if Err → short-circuit |

```ts
async function runAsync(gen): Promise<Result<unknown, unknown>> {
  let feedBack: unknown = undefined;
  for (;;) {
    const next = await gen.next(feedBack);
    if (next.done) return next.value;

    const yielded = next.value;

    if (isResultAsync(yielded)) {
      const resolved = await yielded;
      if (resolved.isErr()) {
        await gen.return(err(resolved.error));
        return err(resolved.error);
      }
      feedBack = resolved.value;
    } else {
      // Err from sync Result
      await gen.return(err(yielded.error));
      return err(yielded.error);
    }
  }
}
```

Note: `gen.next(feedBack)` passes the resolved value back to the generator. On the first iteration, `feedBack` is `undefined` — this is safe because the first `gen.next()` argument is always ignored by JavaScript generators.

### Updated safeTry Type Signatures

```ts
type ExtractErrType<Y> =
  | (Y extends Err<never, infer E> ? E : never)
  | (Y extends ResultAsync<unknown, infer E> ? E : never);

// Sync overload — unchanged
function safeTry<Y extends Err<never, unknown>, T, RE>(
  generator: () => Generator<Y, Result<T, RE>, unknown>
): Result<T, ExtractErrType<Y> | RE>;

// Async overload — Y now includes ResultAsync
function safeTry<Y extends Err<never, unknown> | ResultAsync<unknown, unknown>, T, RE>(
  generator: () => AsyncGenerator<Y, Result<T, RE>, unknown>
): ResultAsync<T, ExtractErrType<Y> | RE>;
```

### Usage After Change

```ts
// Uniform yield* — sync and async
function getUserProfile(id: string) {
  return safeTry(async function* () {
    const raw = yield* parseOrderId(id); // sync Result
    const user = yield* fetchUser(raw); // ResultAsync — no await!
    const validated = yield* validateUser(user); // sync Result
    const posts = yield* fetchPosts(user.id); // ResultAsync — no await!
    return ok({ user: validated, posts });
  });
}
```

### Backward Compatibility

`yield* await resultAsync` continues to work. The `await` resolves `ResultAsync` to `Result`, then `yield*` delegates to `Result[Symbol.iterator]` as before. The `await` is simply no longer required.

### Sync Runner — No Change

The sync runner does not change. It only handles sync generators, which only yield `Err` values. `ResultAsync` values cannot appear in sync generators because `ResultAsync[Symbol.iterator]` yields `ResultAsync` (which is not `Err`), and the sync runner's type signature constrains `Y extends Err<never, unknown>`.

## Consequences

### Positive

1. **Uniform `yield*`** — Same syntax for `Result` and `ResultAsync`. Developers don't need to track which is which.
2. **Refactor-safe** — Changing `Result` → `ResultAsync` doesn't require updating call sites.
3. **Cleaner Rust analogy** — `yield*` truly mirrors `?` — works uniformly regardless of sync/async.
4. **Proven pattern** — Effect-ts validates this approach at scale.
5. **Backward compatible** — `yield* await` still works; existing code doesn't break.
6. **Blog/docs simplification** — No need to explain `yield* await` as a special case.

### Negative

1. **Runner complexity** — The async runner must distinguish `Err` vs `ResultAsync` yielded values and use bidirectional `gen.next(value)` communication.
2. **Type union broadening** — The yield type becomes `Err<never, E> | ResultAsync<T, F>`, which may produce slightly more complex type errors.
3. **Two mechanisms in one runner** — Sync `Result` uses "immediate return" (Ok) / "yield self" (Err), while `ResultAsync` uses "yield self as command, receive value back." The runner handles both, but they work differently under the hood.
4. **`Symbol.iterator` semantic stretch** — `ResultAsync` is not a collection. Implementing `Symbol.iterator` to mean "command to the runner" is unconventional (though Effect-ts establishes precedent).

### Neutral

1. **Sync runner untouched** — Only the async runner changes.
2. **`isResultAsync` reused** — The runner uses the existing brand check ([INV-9](../invariants.md#inv-9-resultasync-brand-identity)) to identify `ResultAsync` values.
3. **Performance** — One additional `isResultAsync` check per yielded value in the async runner. Negligible compared to the `await` cost.

## Implementation Checklist

1. Add `*[Symbol.iterator]()` to `ResultAsync` class (`async/result-async.ts`)
2. Update `runAsync` in `safe-try.ts` to handle `ResultAsync` yielded values with bidirectional `gen.next(value)`
3. Update `ExtractErrType` to extract errors from both `Err` and `ResultAsync`
4. Update async overload signature of `safeTry` to accept `ResultAsync` in yield type
5. Add type-level tests: `yield*` on `ResultAsync` infers correct value type and error accumulation
6. Add runtime tests: `yield* resultAsync` in async `safeTry` — Ok path, Err path, mixed sync/async, generator cleanup
7. Update [BEH-07-002](../behaviors/07-generators.md#beh-07-002-yield-protocol) with the new `ResultAsync` iterator protocol
8. Add new invariant for `ResultAsync` iterator protocol
9. Update package README `safeTry` examples to use `yield*` without `await`

## References

- [BEH-07](../behaviors/07-generators.md): Generators behavior spec
- [BEH-06](../behaviors/06-async.md): ResultAsync behavior spec
- [ADR-012](012-do-notation.md): Do Notation (complementary monadic comprehension)
- [INV-4](../invariants.md#inv-4-err-generator-throws-on-continuation): Err Generator Throws on Continuation
- [INV-9](../invariants.md#inv-9-resultasync-brand-identity): ResultAsync Brand Identity
