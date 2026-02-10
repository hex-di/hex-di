# 09 - ResultAsync

_Previous: [08 - Combining](./08-combining.md)_

---

## 40. ResultAsync Core

`ResultAsync<T, E>` is a lazy wrapper around `Promise<Result<T, E>>` that provides method chaining for async operations. It implements `PromiseLike<Result<T, E>>` so it is `await`-able.

### The problem ResultAsync solves

Without ResultAsync, async Result chains require `await` at every step:

```typescript
// Verbose: await at every step
const userResult = await getUser(id);
if (userResult.isErr()) return userResult;

const profileResult = await getProfile(userResult.value);
if (profileResult.isErr()) return profileResult;

const savedResult = await saveProfile(profileResult.value);
// Manual early-return boilerplate at every step
```

With ResultAsync, async chains read like sync chains:

```typescript
// Clean: single await at the end
const result = await getUser(id).andThen(getProfile).andThen(saveProfile).map(toDTO);
// Type: Result<ProfileDTO, UserError | ProfileError | SaveError>
```

### Core design

```typescript
class ResultAsync<T, E> implements PromiseLike<Result<T, E>> {
  private readonly _promise: Promise<Result<T, E>>;

  constructor(promise: Promise<Result<T, E>>);

  then<A, B>(
    onfulfilled?: (value: Result<T, E>) => A | PromiseLike<A>,
    onrejected?: (reason: unknown) => B | PromiseLike<B>
  ): PromiseLike<A | B>;
}
```

### Public API naming

The implementation class MUST be named `ResultAsync` (not `ResultAsyncImpl` or any other internal name). The class name appears in:

- TypeScript error messages and IDE tooltips
- Stack traces at runtime
- Generated `.d.ts` declaration files

No implementation-detail suffixes (e.g., `Impl`, `Internal`) may leak through the public API surface.

### Invariant: ResultAsync never rejects

The internal `_promise` always resolves to a `Result<T, E>`. It never rejects. All error cases are represented as `Err<T, E>`, not as promise rejections. This is enforced by the constructors.

### Awaiting

Because `ResultAsync` implements `PromiseLike`, you can await it:

```typescript
const asyncResult: ResultAsync<User, FetchError> = fetchUser(id);

// Await to get the sync Result:
const result: Result<User, FetchError> = await asyncResult;

// Then use sync methods:
result.match(
  user => console.log(user),
  error => console.error(error)
);

// Or chain before awaiting:
const dto = await asyncResult.map(user => toDTO(user));
// Type: Result<UserDTO, FetchError>
```

## 41. Async Constructors

### ResultAsync.fromPromise

Wraps a promise that might reject into a ResultAsync. Rejections become `Err` via the error mapper.

```typescript
static fromPromise<T, E>(
  promise: Promise<T>,
  mapErr: (error: unknown) => E,
): ResultAsync<T, E>;
```

```typescript
const users = ResultAsync.fromPromise(
  fetch("/api/users").then(r => r.json()),
  cause => ({ _tag: "FetchError" as const, cause })
);
// Type: ResultAsync<unknown, { _tag: "FetchError"; cause: unknown }>
```

### ResultAsync.fromSafePromise

Wraps a promise known to never reject. The error type is `never`.

```typescript
static fromSafePromise<T>(
  promise: Promise<T>,
): ResultAsync<T, never>;
```

```typescript
const delay = ResultAsync.fromSafePromise(new Promise<void>(resolve => setTimeout(resolve, 1000)));
// Type: ResultAsync<void, never>
```

### ResultAsync.fromThrowable

Wraps an async function into a function that returns ResultAsync.

```typescript
static fromThrowable<A extends readonly unknown[], T, E>(
  fn: (...args: A) => Promise<T>,
  mapErr: (error: unknown) => E,
): (...args: A) => ResultAsync<T, E>;
```

```typescript
const safeFetch = ResultAsync.fromThrowable(
  async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  cause => ({ _tag: "FetchError" as const, cause })
);

const users = safeFetch("/api/users");
// Type: ResultAsync<unknown, { _tag: "FetchError"; cause: unknown }>
```

### ResultAsync.ok / ResultAsync.err

Create a ResultAsync from a known Ok/Err value:

```typescript
static ok<T>(value: T): ResultAsync<T, never>;
static err<E>(error: E): ResultAsync<never, E>;
```

```typescript
ResultAsync.ok(42); // ResultAsync<number, never>
ResultAsync.err("bad"); // ResultAsync<never, string>
```

## 42. Async Chaining

All Result methods are mirrored on ResultAsync with async-aware signatures.

### map

Accepts sync or async mapper:

```typescript
map<U>(f: (value: T) => U | Promise<U>): ResultAsync<U, E>;
```

```typescript
const result = fetchUser(id)
  .map((user) => user.name);           // sync mapper
  .map(async (name) => enrichName(name)); // async mapper
// Both produce ResultAsync<EnrichedName, FetchError>
```

### mapErr

```typescript
mapErr<F>(f: (error: E) => F | Promise<F>): ResultAsync<T, F>;
```

### andThen

Accepts functions returning `Result` OR `ResultAsync`:

```typescript
andThen<U, F>(f: (value: T) => Result<U, F> | ResultAsync<U, F>): ResultAsync<U, E | F>;
```

```typescript
// Mix sync and async steps freely:
const result = fetchUser(id) // ResultAsync<User, FetchError>
  .andThen(user => validateUser(user)) // sync: Result<ValidUser, ValidationError>
  .andThen(user => saveUser(user)) // async: ResultAsync<SavedUser, DbError>
  .andThen(user => sendEmail(user)); // async: ResultAsync<User, EmailError>
// Type: ResultAsync<User, FetchError | ValidationError | DbError | EmailError>
```

### orElse

```typescript
orElse<U, F>(f: (error: E) => Result<U, F> | ResultAsync<U, F>): ResultAsync<T | U, F>;
```

### andTee / orTee

```typescript
andTee(f: (value: T) => void | Promise<void>): ResultAsync<T, E>;
orTee(f: (error: E) => void | Promise<void>): ResultAsync<T, E>;
```

### andThrough

```typescript
andThrough<F>(
  f: (value: T) => Result<unknown, F> | ResultAsync<unknown, F>,
): ResultAsync<T, E | F>;
```

### match

Returns a Promise (since the result isn't known until the promise resolves):

```typescript
match<A, B>(
  onOk: (value: T) => A | Promise<A>,
  onErr: (error: E) => B | Promise<B>,
): Promise<A | B>;
```

```typescript
const response = await fetchUser(id).match(
  user => ({ status: 200, body: user }),
  error => ({ status: 404, body: { message: error.message } })
);
```

### unwrapOr

```typescript
unwrapOr<U>(defaultValue: U): Promise<T | U>;
```

## 43. Sync-to-Async Bridges

Methods on sync `Result<T, E>` that produce a `ResultAsync<T, E>`:

### toAsync

Lifts a sync Result into a ResultAsync:

```typescript
// On Result<T, E>:
toAsync(): ResultAsync<T, E>;
```

```typescript
const syncResult: Result<number, string> = ok(42);
const asyncResult: ResultAsync<number, string> = syncResult.toAsync();
```

### asyncMap

Maps the success value with an async function:

```typescript
// On Result<T, E>:
asyncMap<U>(f: (value: T) => Promise<U>): ResultAsync<U, E>;
```

```typescript
const result: Result<string, ParseError> = ok("user-123");
const enriched = result.asyncMap(async id => {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
});
// Type: ResultAsync<unknown, ParseError>
```

### asyncAndThen

Chains with a function that returns ResultAsync:

```typescript
// On Result<T, E>:
asyncAndThen<U, F>(f: (value: T) => ResultAsync<U, F>): ResultAsync<U, E | F>;
```

```typescript
const userId: Result<string, ValidationError> = validateId(input);
const user = userId.asyncAndThen(id => fetchUser(id));
// Type: ResultAsync<User, ValidationError | FetchError>
```

## 44. Async Combining

All combinators have async equivalents that accept mixed Result/ResultAsync inputs.

### ResultAsync.all

```typescript
static all<R extends readonly (Result<unknown, unknown> | ResultAsync<unknown, unknown>)[]>(
  ...results: R
): ResultAsync<InferOkTuple<R>, InferErrUnion<R>>;
```

```typescript
const result = await ResultAsync.all(
  fetchUser(id), // ResultAsync
  ok("default-settings"), // sync Result
  fetchPermissions(id) // ResultAsync
);
// Type: Result<[User, string, Permissions], UserError | PermError>
```

### ResultAsync.allSettled

```typescript
static allSettled<R extends readonly (Result<unknown, unknown> | ResultAsync<unknown, unknown>)[]>(
  ...results: R
): ResultAsync<InferOkTuple<R>, InferErrUnion<R>[]>;
```

### ResultAsync.any

```typescript
static any<R extends readonly (Result<unknown, unknown> | ResultAsync<unknown, unknown>)[]>(
  ...results: R
): ResultAsync<InferOkUnion<R>, InferErrTuple<R>>;
```

### ResultAsync.collect

```typescript
static collect<R extends Record<string, Result<unknown, unknown> | ResultAsync<unknown, unknown>>>(
  results: R,
): ResultAsync<
  { [K in keyof R]: InferOk<R[K]> },
  InferErrUnion<R[keyof R]>
>;
```

```typescript
const result = await ResultAsync.collect({
  user: fetchUser(id),
  settings: fetchSettings(id),
  history: ok([]), // sync fallback
});
// Type: Result<{ user: User; settings: Settings; history: never[] }, UserError | SettingsError>
```

---

_Previous: [08 - Combining](./08-combining.md) | Next: [10 - Generator-Based Early Return](./10-generators.md)_
