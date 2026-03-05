# @hex-di/result

Stop guessing what went wrong in catch blocks. Result makes errors visible, typed, and impossible to forget.

```ts
import { ok, err, type Result } from "@hex-di/result";

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return err("division by zero");
  return ok(a / b);
}

const result = divide(10, 2);

if (result.isOk()) {
  console.log(result.value); // 5
} else {
  console.log(result.error); // narrowed to string
}
```

## Features

- **Errors you can see** -- `Result<T, E>` makes errors explicit in function signatures. No more `unknown` in catch blocks.
- **Errors skip automatically** -- Chain operations with `map`, `andThen`, `orElse`. When something fails, the rest is skipped.
- **Never forget an error** -- TypeScript tells you at build time if you missed handling an error case.
- **Zero runtime cost** -- No dependencies. Lightweight wrapper that compiles to simple objects.
- **Handle errors by name** -- Tagged errors with `catchTag` let you handle them one by one. TypeScript tracks which ones are left.
- **Async support** -- `ResultAsync<T, E>` wraps promises with the same chainable API.
- **You already know this** -- `.map()` like arrays, `.andThen()` like promises. Familiar patterns, better types.
- **Combinators** -- `all`, `any`, `allSettled`, `collect`, `partition`, `forEach`, `zipOrAccumulate`
- **Generators & Accumulate** -- `safeTry` for imperative style, `bind`/`let_` for building typed objects field by field.
- **Option type** -- `Option<T>` with `Some`/`None` variants.
- **Serialization** -- `toJSON` / `fromJSON` with schema version.
- **Immutable** -- All instances are `Object.freeze()`-d with brand symbols.

## Install

```bash
npm install @hex-di/result
```

## Quick Start

### Creating Results

```ts
import { ok, err } from "@hex-di/result";

const success = ok(42); // Ok<number, never>
const failure = err("oops"); // Err<never, string>
```

### Pattern Matching

```ts
const message = result.match(
  value => `Got ${value}`,
  error => `Failed: ${error}`
);
```

### Transformations

```ts
const doubled = ok(21).map(n => n * 2); // Ok(42)
const mapped = err("bad").mapErr(e => e.length); // Err(3)
```

### Chaining

```ts
function parseNumber(s: string): Result<number, string> {
  const n = Number(s);
  return isNaN(n) ? err("not a number") : ok(n);
}

function isPositive(n: number): Result<number, string> {
  return n > 0 ? ok(n) : err("must be positive");
}

const result = parseNumber("42").andThen(isPositive); // Ok(42)
const failed = parseNumber("abc").andThen(isPositive); // Err("not a number")
```

### You Already Know This

| JS you know              | Result equivalent          |
| ------------------------ | -------------------------- |
| `if (response.ok)`       | `if (result.isOk())`       |
| `array.map(x => ...)`    | `result.map(x => ...)`     |
| `promise.then(x => ...)` | `result.andThen(x => ...)` |

## Error Handling

Define typed error variants with `createError`. TypeScript makes sure you handle every one:

```ts
import { ok, err, createError, assertNever, type Result } from "@hex-di/result";

// Define tagged error constructors
const NotFound = createError("NotFound");
const Forbidden = createError("Forbidden");
const Timeout = createError("Timeout");

type AppError =
  | ReturnType<typeof NotFound<{ resource: string; id: string }>>
  | ReturnType<typeof Forbidden<{ role: string }>>
  | ReturnType<typeof Timeout<{ ms: number }>>;

function fetchUser(id: string): Result<User, AppError> {
  // ...
}
```

Match all error variants with a `switch` on `_tag`:

```ts
const result = fetchUser("42");

result.match(
  user => renderUser(user),
  error => {
    switch (error._tag) {
      case "NotFound":
        return render404(error.resource, error.id);
      case "Forbidden":
        return render403(error.role);
      case "Timeout":
        return renderRetry(error.ms);
      default:
        return assertNever(error); // compile error if a case is missing
    }
  }
);
```

The `default: return assertNever(error)` line catches new variants at compile time -- if you add a fourth error type to `AppError` without handling it, TypeScript reports `Argument of type '...' is not assignable to parameter of type 'never'`.

#### Error Groups

`createErrorGroup` creates a family of related errors sharing a `_namespace` discriminant:

```ts
import { createErrorGroup } from "@hex-di/result";

const Http = createErrorGroup("HttpError");
const NotFound = Http.create("NotFound");
const BadGateway = Http.create("BadGateway");

const error = NotFound({ url: "/api/users", status: 404 });
// { _namespace: "HttpError", _tag: "NotFound", url: "/api/users", status: 404 }

Http.is(error); // true — belongs to the HttpError group
Http.isTag("NotFound")(error); // true — specific tag within group
```

#### Error Transformation

Transform or recover from errors with `mapErr` and `orElse`:

```ts
const ServiceError = createError("ServiceError");

// Wrap errors into a higher-level type
result.mapErr(e => ServiceError({ cause: e }));

// Recover from specific errors, propagate others
result.orElse(e => (e._tag === "Timeout" ? retry(e.ms) : err(e)));
```

## Extracting Values

```ts
result.unwrapOr(0); // 42 if Ok, 0 if Err
result.unwrapOrElse(e => e.length);
result.toNullable(); // T | null
result.toUndefined(); // T | undefined
result.intoTuple(); // [null, T] | [E, null]
```

## Constructors

```ts
import {
  fromPromise,
  fromSafePromise,
  fromThrowable,
  fromNullable,
  fromPredicate,
  tryCatch,
} from "@hex-di/result";

// Wrap a promise that may reject
const result = fromPromise(fetch("/api"), e => String(e));

// Wrap a promise that never rejects
const safe = fromSafePromise(Promise.resolve(42));

// Wrap a function that may throw
const safeParse = fromThrowable(JSON.parse, e => String(e));
const parsed = safeParse('{"a":1}'); // Ok({ a: 1 })

// Convert nullable to Result
const fromNull = fromNullable(maybeUser, () => "user not found");

// Predicate-based construction
const positive = fromPredicate(
  42,
  n => n > 0,
  n => `${n} is not positive`
);

// try/catch wrapper
const result = tryCatch(
  () => riskyOperation(),
  e => String(e)
);
```

---

_The sections below cover advanced patterns. Everything above is enough to be productive._

---

## Combinators

```ts
import { all, any, allSettled, partition, collect } from "@hex-di/result";

// All must succeed (like Promise.all)
const results = all([ok(1), ok(2), ok(3)]); // Ok([1, 2, 3])
const failed = all([ok(1), err("x")]); // Err("x")

// Any must succeed (like Promise.any)
const first = any([err("a"), ok(2), ok(3)]); // Ok(2)

// Collect all, separating Ok and Err
const [oks, errs] = partition([ok(1), err("a"), ok(3)]);
// oks: [1, 3], errs: ["a"]

// All settle, preserving all results
const settled = allSettled([ok(1), err("x")]); // Ok([Ok(1), Err("x")])
```

## Async Support

`ResultAsync<T, E>` wraps a `Promise<Result<T, E>>` with the same chainable API:

```ts
import { ResultAsync, fromPromise, createError } from "@hex-di/result";

const FetchError = createError("FetchError");

const userResult = fromPromise(
  fetch("/api/user").then(r => r.json()),
  error => FetchError({ cause: error })
);

// Chain async operations
const nameResult = userResult.map(user => user.name).mapErr(e => e.cause);

// Await to get the Result
const result = await nameResult; // Result<string, unknown>
```

## Generators (safeTry)

Write straight-line code that stops at the first error -- no nesting, no callbacks:

```ts
import { safeTry, ok, err } from "@hex-di/result";

const result = safeTry(function* () {
  const a = yield* parseNumber("10"); // short-circuits if Err
  const b = yield* parseNumber("20");
  const c = yield* isPositive(a + b);
  return ok(c);
});
// result: Ok(30)
```

Async generators work too:

```ts
const result = await safeTry(async function* () {
  const user = yield* fetchUser(id); // ResultAsync
  const posts = yield* fetchPosts(user.id);
  return ok({ user, posts });
});
```

## Accumulate (bind / let\_)

Build up a typed object field by field, where each field can fail:

```ts
import { ok, bind, let_ } from "@hex-di/result";

const result = ok({})
  .andThen(bind("user", () => fetchUser(id)))
  .andThen(bind("posts", ({ user }) => fetchPosts(user.id)))
  .andThen(let_("count", ({ posts }) => posts.length));
// Result<{ user: User; posts: Post[]; count: number }, Error>
```

## Option Type

`Option<T>` represents a value that may or may not exist:

```ts
import { some, none, type Option } from "@hex-di/result";

const present = some(42); // Some<number>
const absent = none(); // None

present.isSome(); // true
absent.isNone(); // true

// Pattern matching
const label = present.match(
  value => `Found: ${value}`,
  () => "Not found"
);

// Convert between Option and Result
const result = present.toResult(() => "not found"); // Ok(42)
const option = ok(42).toOption(); // Some(42)
```

## Subpath Exports

```ts
import { ok, err, Result } from "@hex-di/result"; // Core API
import { safeTry } from "@hex-di/result"; // Generators (re-exported from main)
import { all, any, partition } from "@hex-di/result/combinators"; // Combinators
import { ResultAsync } from "@hex-di/result/async"; // Async Result
import { some, none, Option } from "@hex-di/result/option"; // Option type
import { createError } from "@hex-di/result/errors"; // Error patterns
import { map } from "@hex-di/result/fn/map"; // Individual functions
```

## Type Utilities

```ts
import type { InferOk, InferErr, InferAsyncOk, InferAsyncErr } from "@hex-di/result";

type Value = InferOk<typeof result>; // Extract T from Result<T, E>
type Error = InferErr<typeof result>; // Extract E from Result<T, E>
```

## Serialization

```ts
import { ok, fromJSON, toSchema } from "@hex-di/result";

const json = ok(42).toJSON();
// { _tag: "Ok", _schemaVersion: 1, value: 42 }

const restored = fromJSON(json);
// Ok(42)

// Standard Schema v1 interop
const schema = toSchema(validate);
```

## Related Packages

| Package                                                                          | Description                           |
| -------------------------------------------------------------------------------- | ------------------------------------- |
| [`@hex-di/result-testing`](https://www.npmjs.com/package/@hex-di/result-testing) | Vitest matchers and test utilities    |
| [`@hex-di/result-react`](https://www.npmjs.com/package/@hex-di/result-react)     | React hooks, components, and adapters |

## Requirements

- TypeScript >= 5.6
- Node.js >= 18.0.0

## License

MIT
