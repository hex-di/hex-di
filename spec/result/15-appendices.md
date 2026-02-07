# 15 - Appendices

_Previous: [14 - API Reference](./14-api-reference.md)_

---

## Appendix A: Comparison with Other Libraries

### Feature Matrix

| Feature                 | @hex-di/result              | neverthrow                     | oxide.ts              | ts-results           | Effect Either          |
| ----------------------- | --------------------------- | ------------------------------ | --------------------- | -------------------- | ---------------------- |
| Discriminated union     | `_tag`                      | No (class instanceof)          | No (class instanceof) | `.ok`/`.err` boolean | `_tag`                 |
| Method chaining         | Yes                         | Yes                            | Yes                   | Yes                  | Pipe-based             |
| ResultAsync             | Yes                         | Yes                            | No (safe only)        | No                   | No (use Effect)        |
| Generator early return  | safeTry                     | safeTry                        | No                    | No                   | gen / Do notation      |
| Error type accumulation | Yes (andThen)               | Yes (andThen)                  | Partial               | No                   | Yes (flatMap)          |
| Combine (tuples)        | all / allSettled            | combine / combineWithAllErrors | all / any             | all / any            | all (tuples + records) |
| Combine (records)       | collect                     | No                             | No                    | No                   | all (structs)          |
| Side effects            | andTee / orTee / andThrough | andTee / orTee / andThrough    | No                    | No                   | tap                    |
| Pattern matching        | match + switch on \_tag     | match (positional)             | match (rich)          | No                   | match                  |
| fromThrowable           | Yes                         | Yes                            | safe                  | No                   | try                    |
| fromNullable            | Yes                         | No                             | from / nonNull        | No                   | fromNullable           |
| fromPredicate           | Yes                         | No                             | No                    | No                   | liftPredicate          |
| intoTuple (Go-style)    | Yes                         | No                             | Yes                   | No                   | No                     |
| flatten                 | Yes                         | No                             | Yes                   | No                   | flatten                |
| flip                    | Yes                         | No                             | No                    | No                   | flip                   |
| inspect / inspectErr    | Yes                         | No                             | No                    | No                   | No                     |
| Zero dependencies       | Yes                         | Yes                            | Yes                   | Yes                  | No (Effect ecosystem)  |
| No `any` in public API  | Yes                         | No (internal)                  | No (internal)         | No                   | Yes                    |
| No type casting         | Yes                         | No (internal)                  | No (internal)         | No                   | No                     |
| DI integration          | Yes (HexDI)                 | No                             | No                    | No                   | Yes (Effect services)  |
| Tracing integration     | Yes (HexDI tracing)         | No                             | No                    | No                   | Yes (Effect tracing)   |
| JSON serialization      | toJSON()                    | No                             | No                    | No                   | No                     |
| ESLint must-use         | Planned                     | Yes (plugin)                   | No                    | No                   | No                     |
| Option type             | No (use Result)             | No                             | Yes                   | No                   | Yes                    |
| Test utilities          | @hex-di/result-testing      | \_unsafeUnwrap                 | No                    | No                   | No                     |

### Philosophy Comparison

| Library            | Philosophy                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **@hex-di/result** | Errors as first-class typed values within hexagonal architecture. Self-aware error reporting. Zero dependencies, zero `any`, zero casting. |
| **neverthrow**     | Practical Result type for TypeScript. Focus on ergonomics with safeTry and combinators. Most popular in the ecosystem.                     |
| **oxide.ts**       | Faithful Rust port with Option + Result + pattern matching. Richest match API.                                                             |
| **ts-results**     | Simple, minimal Result with RxJS integration. Boolean-based narrowing.                                                                     |
| **Effect Either**  | Part of a complete effect system. Most type-safe but heaviest dependency.                                                                  |

### Why a new library?

1. **No `any`, no casting** -- HexDI's CLAUDE.md mandates zero `any` and zero type casting. No existing Result library satisfies this constraint in its implementation.
2. **Discriminated union** -- `_tag`-based narrowing aligns with HexDI's patterns (AsyncDerivedSnapshot, ContainerError) and doesn't require `instanceof`.
3. **DI integration** -- Container resolution as Result, tracing span recording, inspector error statistics. No existing library integrates with DI containers.
4. **Self-aware errors** -- Following HexDI's vision, errors are observable. The application knows its own error patterns through the inspector.
5. **Complete combinator set** -- `all`, `allSettled`, `any`, `collect` (records), plus `andTee`, `orTee`, `andThrough` for railway-oriented programming.
6. **Testing first** -- Dedicated testing package with Vitest matchers, assertion helpers, and property-based testing support.

## Appendix B: Glossary

| Term                             | Definition                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------- |
| **Result**                       | A discriminated union representing either a success (`Ok`) or failure (`Err`) |
| **Ok**                           | The success variant of a Result, holding a value of type `T`                  |
| **Err**                          | The failure variant of a Result, holding an error of type `E`                 |
| **ResultAsync**                  | A lazy wrapper around `Promise<Result<T, E>>` with method chaining            |
| **andThen**                      | Monadic bind / flatMap: chains a function that returns a Result               |
| **orElse**                       | Error recovery: chains a function on the Err side                             |
| **match**                        | Exhaustive extraction: handles both Ok and Err cases                          |
| **map**                          | Functor map: transforms the Ok value                                          |
| **mapErr**                       | Transforms the Err value                                                      |
| **safeTry**                      | Generator-based early return emulating Rust's `?` operator                    |
| **Railway-oriented programming** | Programming model with parallel success/error tracks                          |
| **Error type accumulation**      | Error unions growing through `andThen` chains                                 |
| **Discriminated union**          | TypeScript pattern using a literal `_tag` field for narrowing                 |
| **Tagged error**                 | An error object with a `_tag` discriminant for pattern matching               |
| **Short-circuit**                | Skipping subsequent operations when an Err is encountered                     |
| **Phantom type**                 | A type parameter that exists only at compile time, not at runtime             |
| **Total function**               | A function that produces a value for every possible input (never throws)      |
| **andTee**                       | Side-effect on success that swallows errors from the side-effect              |
| **andThrough**                   | Side-effect on success that propagates errors from the side-effect            |
| **intoTuple**                    | Go-style error destructuring: `[error, value]`                                |
| **flatten**                      | Unwrap nested `Result<Result<T, E>, E>` to `Result<T, E>`                     |
| **fromThrowable**                | Wraps a throwing function into a Result-returning function                    |
| **fromPromise**                  | Wraps a Promise into a ResultAsync                                            |
| **allSettled**                   | Combines Results, collecting ALL errors (not short-circuiting)                |
| **collect**                      | Combines a record of Results into a Result of a record                        |

## Appendix C: Design Decisions

### C.1: Discriminated union over classes

**Decision:** Use `_tag: "Ok" | "Err"` discriminant instead of class instanceof.

**Rationale:**

- Aligns with HexDI's existing patterns (AsyncDerivedSnapshot, ContainerError)
- TypeScript narrows without `instanceof` or casting
- Serializable to JSON
- Structural typing (any object matching the shape is assignable)
- No prototype chain issues with cross-realm or serialized objects

**Trade-off:** Slightly more verbose internal implementation (methods must be attached to each variant), but this is hidden from consumers.

### C.2: Method chaining over pipe-based API

**Decision:** Primary API is method chaining (`result.map(f).andThen(g)`) not pipe-based (`pipe(result, map(f), andThen(g))`).

**Rationale:**

- Method chaining is the dominant pattern in TypeScript
- Better IDE autocomplete and discoverability
- Lower learning curve
- Pipe-based is more powerful but harder to read for most developers

**Trade-off:** Cannot easily tree-shake unused methods. For a core utility type, this is acceptable -- the full API is small.

### C.3: Required mapErr for constructors

**Decision:** `fromThrowable`, `fromPromise`, and `tryCatch` require a `mapErr` function. There is no `fromThrowable(fn)` that produces `Result<T, unknown>`.

**Rationale:**

- `Result<T, unknown>` defeats the purpose of typed errors
- Forcing error mapping at the boundary ensures errors are typed from the start
- Aligns with HexDI's zero-`any` mandate

**Trade-off:** Slightly more verbose for quick prototyping. Worth it for long-term type safety.

### C.4: No Option type

**Decision:** `@hex-di/result` does not include an Option/Maybe type.

**Rationale:**

- TypeScript's native `T | undefined` and `T | null` are sufficient for "absence" semantics
- Optional chaining (`?.`) and nullish coalescing (`??`) handle most Option use cases natively
- Adding Option doubles the API surface for marginal benefit
- Use `Result<T, NoneError>` when you need monadic chaining on optional values

**Trade-off:** No `Option.map`, `Option.andThen`, etc. For complex optional chaining, convert to Result first.

### C.5: andTee swallows errors

**Decision:** `andTee` catches and ignores errors thrown by the side-effect function.

**Rationale:**

- `andTee` is for non-critical side effects (logging, analytics, telemetry)
- If the side effect is critical, use `andThrough` which propagates errors
- Clear semantic distinction: `andTee` = fire-and-forget, `andThrough` = must-succeed

**Trade-off:** Debugging swallowed errors can be tricky. Recommendation: use `andThrough` when in doubt.

### C.6: ResultAsync implements PromiseLike

**Decision:** `ResultAsync` implements `PromiseLike<Result<T, E>>`, making it `await`-able.

**Rationale:**

- `const result = await someResultAsync` naturally produces `Result<T, E>`
- No need for a special `.toPromise()` method
- Works with any Promise-consuming code (async/await, Promise.all, etc.)

**Trade-off:** `ResultAsync` is thenable, which means passing it to code that expects a plain value might accidentally `await` it. This is rare and matches how Promises work in JavaScript.

### C.7: Error type accumulation via union

**Decision:** `andThen` produces `Result<U, E | F>` where `E` is the existing error and `F` is the new error.

**Rationale:**

- Automatic union accumulation requires no manual type annotations
- The final error type is the complete picture of everything that can go wrong
- TypeScript's narrowing works naturally on union types
- Aligns with neverthrow's approach (the most popular Result library)

**Trade-off:** Large chains can produce large error unions. In practice, this is desirable -- it's the truth about your error surface. Use `mapErr` at layer boundaries to consolidate.

## Appendix D: Migration from try/catch

### Before: try/catch

```typescript
async function getUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  return data as User;
}

// Usage:
try {
  const user = await getUser("123");
  console.log(user.name);
} catch (e) {
  console.error("Something went wrong:", e); // untyped
}
```

### After: Result

```typescript
async function getUser(id: string): ResultAsync<User, FetchError> {
  return ResultAsync.fromPromise(
    fetch(`/api/users/${id}`).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
    cause => ({ _tag: "FetchError" as const, cause })
  );
}

// Usage:
const result = await getUser("123");
result.match(
  user => console.log(user.name),
  error => console.error("Fetch failed:", error) // typed: FetchError
);
```

### Migration steps

1. **Identify functions that throw** -- these become Result-returning functions
2. **Define error types** -- create tagged unions for each error category
3. **Wrap boundaries** -- use `fromThrowable`, `fromPromise` at the edges
4. **Replace try/catch** -- use `andThen`, `orElse`, `match` for error handling
5. **Propagate Results** -- functions that call Result-returning functions should also return Results

## Appendix E: Migration from neverthrow

### Key differences

| neverthrow                             | @hex-di/result                      | Notes                            |
| -------------------------------------- | ----------------------------------- | -------------------------------- |
| `ok(value)`                            | `ok(value)`                         | Same                             |
| `err(error)`                           | `err(error)`                        | Same                             |
| `result.isOk()`                        | `result.isOk()`                     | Same (type guard)                |
| `result._unsafeUnwrap()`               | `result.expect("reason")`           | Explicit message required        |
| `Result.fromThrowable(fn, mapErr)`     | `fromThrowable(fn, mapErr)`         | Standalone function              |
| `ResultAsync.fromPromise(p, mapErr)`   | `fromPromise(p, mapErr)`            | Standalone function              |
| `result.match(okFn, errFn)`            | `result.match(okFn, errFn)`         | Same                             |
| `Result.combine(results)`              | `Result.all(...results)`            | Renamed, spread instead of array |
| `Result.combineWithAllErrors(results)` | `Result.allSettled(...results)`     | Renamed                          |
| `safeTry(function*() {...})`           | `safeTry(function*() {...})`        | Same                             |
| N/A                                    | `result.toJSON()`                   | New: serialization               |
| N/A                                    | `Result.collect({...})`             | New: record combining            |
| N/A                                    | `result.intoTuple()`                | New: Go-style destructuring      |
| N/A                                    | `result.flatten()`                  | New: unwrap nested Results       |
| N/A                                    | `result.inspect()` / `inspectErr()` | New: Rust-style side effects     |
| N/A                                    | `fromNullable(val, onNull)`         | New: nullable constructor        |
| N/A                                    | `fromPredicate(val, pred, onFalse)` | New: predicate constructor       |

### Migration is straightforward

1. Replace `import { ok, err, Result, ResultAsync } from "neverthrow"` with `from "@hex-di/result"`
2. Replace `Result.combine` with `Result.all`
3. Replace `Result.combineWithAllErrors` with `Result.allSettled`
4. Replace `_unsafeUnwrap()` with `expect("reason")`
5. Replace `Result.fromThrowable` with standalone `fromThrowable`
6. Add `_tag` discriminants to error types for pattern matching

---

_Previous: [14 - API Reference](./14-api-reference.md) | Next: [16 - Definition of Done](./16-definition-of-done.md)_
