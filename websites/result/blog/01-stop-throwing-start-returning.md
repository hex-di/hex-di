---
title: "Stop Throwing, Start Returning: Why TypeScript Needs the Result Pattern"
description: "TypeScript's try-catch gives you unknown errors, invisible failure modes, and silent bugs. The Result pattern makes errors typed, visible, and impossible to forget. Here's why you should stop throwing and start returning."
slug: stop-throwing-start-returning
authors: [hex-di]
tags: [typescript, error-handling, result-pattern, functional-programming]
date: 2026-03-05
---

# Stop Throwing, Start Returning: Why TypeScript Needs the Result Pattern

You've written this code a hundred times:

```ts
try {
  const user = await fetchUser(id);
  const posts = await fetchPosts(user.id);
  const rendered = renderProfile(user, posts);
  return rendered;
} catch (error) {
  // what is error? string? Error? AxiosError? Who knows.
  console.log("something went wrong", error);
}
```

And every time, you've made the same bet: that nothing unexpected will end up in that `catch` block.

Let's talk about why that bet keeps losing.

<!-- truncate -->

## TypeScript's try-catch is broken

TypeScript is famous for catching mistakes at compile time. Misspell a property? Red squiggly. Pass a `string` where a `number` goes? Build fails. But errors? TypeScript throws its hands up.

### Catch gives you nothing

Since TypeScript 4.4, `catch` clauses type `error` as `unknown`:

```ts
try {
  const data = JSON.parse(input);
} catch (error) {
  // error: unknown — no properties, no methods, nothing
  console.log(error.message);
  //                ^^^^^^^ Property 'message' does not exist on type 'unknown'
}
```

So you end up writing this:

```ts
catch (error: unknown) {
  if (error instanceof Error) {
    console.log(error.message);
  } else if (typeof error === "string") {
    console.log(error);
  } else {
    console.log("Unknown error", error);
  }
}
```

That's runtime type checking. In a language built for compile-time type safety. Every `catch` block is a little hole in your type system.

### Errors are invisible in signatures

Look at this function:

```ts
function fetchUser(id: string): Promise<User> {
  // ...
}
```

Can this fail? Of course it can. It makes a network call. But nothing in the signature tells you that. Nothing tells you _how_ it can fail. Network timeout? 404? 403? Invalid JSON? You have to read the implementation — or find out in production.

Compare that with a function that returns a nullable value:

```ts
function findUser(id: string): User | null {
```

Here, TypeScript _forces_ you to handle the null case. You can't call `findUser(id).name` without a compiler error. The possible absence is encoded in the type.

Errors deserve the same treatment. They don't get it.

### Errors propagate silently

Here's where it gets dangerous. Consider three functions:

```ts
async function getConfig(): Promise<Config> {
  const response = await fetch("/api/config");
  return response.json(); // can throw if response isn't JSON
}

async function initializeApp(): Promise<App> {
  const config = await getConfig(); // doesn't handle the error
  return createApp(config);
}

async function main(): Promise<void> {
  const app = await initializeApp(); // doesn't handle the error either
  app.start();
}
```

If `/api/config` returns a 500 with an HTML error page, `response.json()` throws. That error bubbles through `initializeApp`, through `main`, and crashes your process. Nobody at any layer was _forced_ to consider it.

This isn't hypothetical. This is a Tuesday afternoon production incident.

## What if errors were just values?

Here's a different idea. What if functions _returned_ their errors instead of throwing them?

```ts
function divide(a: number, b: number) {
  if (b === 0) return { ok: false, error: "division by zero" };
  return { ok: true, value: a / b };
}

const result = divide(10, 0);
if (result.ok) {
  console.log(result.value); // TypeScript knows this is number
} else {
  console.log(result.error); // TypeScript knows this is string
}
```

Now the error is visible in the return type. TypeScript forces you to check `result.ok` before accessing `result.value`. The compiler has your back again.

This is how Rust, Go, Haskell, and Swift handle errors. Not as control flow interruptions, but as data. Values you can inspect, pass around, and compose.

The DIY approach works for simple cases, but it falls apart fast:

- No standard shape — every team invents their own `{ ok, value, error }` format
- No composition — how do you chain two functions that both might fail?
- No utilities — you end up writing the same `if/else` checks everywhere
- No type inference — TypeScript can't narrow nested discriminated unions well

You need a proper container type. Enter `Result`.

## The Result pattern

`Result<T, E>` is a container that holds either a success value of type `T` or an error of type `E`. It's always one or the other, never both, never neither.

```ts
import { ok, err, type Result } from "@hex-di/result";

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return err("division by zero");
  return ok(a / b);
}
```

`ok(42)` creates a success. `err("oops")` creates a failure. Both carry their types.

### Check and narrow

```ts
const result = divide(10, 2);

if (result.isOk()) {
  console.log(result.value); // number — narrowed by type guard
}

if (result.isErr()) {
  console.log(result.error); // string — narrowed by type guard
}
```

### Pattern match

Handle both branches in one call:

```ts
const message = result.match(
  value => `Result: ${value}`,
  error => `Failed: ${error}`
);
```

### Transform

```ts
const doubled = ok(21).map(n => n * 2); // Ok(42)
const mapped = err("bad").mapErr(e => e.length); // Err(3)
```

`map` transforms the success value. If the Result is an Err, `map` does nothing — the error passes through untouched.

### Chain operations

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

`andThen` is like `Promise.then` — it chains operations that can themselves fail. If the first step fails, the second never runs.

### Extract safely

```ts
result.unwrapOr(0); // 42 if Ok, 0 if Err
result.toNullable(); // T | null
result.toUndefined(); // T | undefined
```

### You already know this

| JS you already know      | Result equivalent          |
| ------------------------ | -------------------------- |
| `if (response.ok)`       | `if (result.isOk())`       |
| `array.map(x => ...)`    | `result.map(x => ...)`     |
| `promise.then(x => ...)` | `result.andThen(x => ...)` |

You're not learning a new paradigm. You're using patterns you already know, applied to error handling.

## Tagged errors — handle errors by name

Plain `string` errors are fine for examples, but real applications have different _kinds_ of errors. A 404 is different from a 403 is different from a timeout. You need to handle them differently.

The tagged error pattern uses a `_tag` field as a discriminant:

```ts
import { createError, assertNever, type Result } from "@hex-di/result";

const NotFound = createError("NotFound");
const Forbidden = createError("Forbidden");
const Timeout = createError("Timeout");

type ApiError =
  | ReturnType<typeof NotFound<{ resource: string }>>
  | ReturnType<typeof Forbidden<{ role: string }>>
  | ReturnType<typeof Timeout<{ ms: number }>>;

function fetchUser(id: string): Result<User, ApiError> {
  // ...
}
```

Now you can match on the tag:

```ts
result.match(
  user => renderUser(user),
  error => {
    switch (error._tag) {
      case "NotFound":
        return render404(error.resource);
      case "Forbidden":
        return render403(error.role);
      case "Timeout":
        return renderRetry(error.ms);
      default:
        return assertNever(error);
    }
  }
);
```

`assertNever` is the secret weapon. If you add a fourth error variant and forget to handle it, TypeScript gives you a compile error. You can't forget.

But switch statements are verbose. For surgical handling of specific errors, use `catchTag`:

```ts
const result = fetchUser("42").catchTag("Timeout", error => {
  // recover from timeout — error is narrowed to { _tag: "Timeout", ms: number }
  return ok(fallbackUser);
});
// result: Result<User, NotFound | Forbidden>
//                       ^^^^^^^^^^^^^^^^^ Timeout is gone from the error type
```

`catchTag` handles one error variant by _recovering_ from it and _removes it from the type_. TypeScript tracks exactly which errors remain unhandled. Handle them one by one, or handle several at once with `catchTags`.

## Real-world example — building a type-safe API client

Let's make this concrete. Here's a typical API call chain with try-catch:

```ts
// The try-catch way
async function getUserProfile(id: string): Promise<UserProfile> {
  try {
    const response = await fetch(`/api/users/${id}`);

    if (!response.ok) {
      if (response.status === 404) throw new Error("User not found");
      if (response.status === 403) throw new Error("Forbidden");
      throw new Error(`HTTP ${response.status}`);
    }

    const user = await response.json();

    try {
      const posts = await fetch(`/api/users/${id}/posts`);
      const postsData = await posts.json();
      return { ...user, posts: postsData };
    } catch {
      // Posts failed — should we return the user without posts?
      // Should we throw? Nobody knows. This catch swallows everything.
      return { ...user, posts: [] };
    }
  } catch (error) {
    // Is this a network error? A JSON parse error? A 404?
    // We threw strings and Error objects — good luck figuring it out.
    throw error;
  }
}
```

Nested try-catch. Swallowed errors. Ambiguous types. Now the same thing with Result:

```ts
import { ok, err, fromPromise, createError, safeTry } from "@hex-di/result";

const NotFound = createError("NotFound");
const Forbidden = createError("Forbidden");
const NetworkError = createError("NetworkError");

function fetchJson<T>(url: string) {
  return fromPromise(
    fetch(url).then(r => {
      if (!r.ok) return Promise.reject({ status: r.status, url });
      return r.json() as Promise<T>;
    }),
    (error: unknown) => {
      const e = error as { status?: number; url?: string };
      if (e.status === 404) return NotFound({ url });
      if (e.status === 403) return Forbidden({ url });
      return NetworkError({ url, cause: error });
    }
  );
}

// Clean, linear, typed
function getUserProfile(id: string) {
  return safeTry(async function* () {
    const user = yield* fetchJson<User>(`/api/users/${id}`);
    const posts = yield* fetchJson<Post[]>(`/api/users/${id}/posts`);
    return ok({ ...user, posts });
  });
}
// ResultAsync<{ user: User; posts: Post[] }, NotFound | Forbidden | NetworkError>
```

Every error type is visible in the signature. The `safeTry` generator reads like synchronous code — each `yield*` unwraps the async Result and short-circuits on error, like Rust's `?` operator. No nesting, no callbacks, no ambiguity.

And at the call site:

```ts
const profile = await getUserProfile("42");

profile
  .catchTag("NotFound", () => ok(defaultProfile))
  .catchTag("Forbidden", () => ok(blockedProfile))
  .match(
    profile => render(profile),
    error => {
      // error is narrowed to NetworkError — the only one left
      showRetryDialog(error.url);
    }
  );
```

Each `catchTag` recovers from one error and removes it from the type. By the time you reach `match`, TypeScript knows exactly what's left.

## Why @hex-di/result?

There are other Result libraries for TypeScript. Here's what makes this one different:

- **50+ methods** on Result, zero dependencies, every instance `Object.freeze()`-d
- **`catchTag` / `catchTags`** for tagged error handling with type narrowing
- **`safeTry` generators** — Rust's `?` operator for TypeScript
- **Full `Option<T>` type** with `Some` / `None` and Result interop
- **`ResultAsync<T, E>`** for promise-based chains with the same API
- **`createErrorGroup`** for grouping related errors with a shared namespace
- **Effect contracts** for compile-time error declarations
- **`bind` / `let_`** for building typed objects field by field

Install it:

```bash
npm install @hex-di/result
```

```ts
import { ok, err, type Result } from "@hex-di/result";
```

## When NOT to use Result

Honesty corner. Result isn't always the right tool.

**Truly exceptional errors.** Out of memory. Stack overflow. Your process is dying. Throw. These aren't errors you "handle" — they're catastrophic failures.

**Quick scripts and prototypes.** If you're writing a one-off script, try-catch is fine. Result shines in production codebases where errors need to be tracked, composed, and maintained.

**When your team isn't ready.** Result is a paradigm shift. If your team hasn't seen the pattern before, introduce it gradually. Wrap one function, show the benefits, let it spread organically.

**Third-party boundaries.** Libraries throw. The DOM throws. You'll always need `fromThrowable` and `fromPromise` at the edges of your system. Result handles the _inside_ — your domain logic, your service layer, your business rules.

The rule of thumb: **Result is for expected, recoverable errors in your domain.** The errors you can name, the errors you want to handle differently based on their kind. For everything else, let exceptions be exceptions.

## Start returning

TypeScript gives you the most advanced type system in mainstream programming. Use it for errors too.

- **Stop** wrapping everything in try-catch and hoping for the best
- **Start** returning typed errors that the compiler can track
- **Let** TypeScript tell you when you've forgotten to handle a case

Errors are just data. Treat them that way.

---

**Get started:** `npm install @hex-di/result`

**Docs:** [hex-di.github.io/hex-di/result](https://hex-di.github.io/hex-di/result)

**GitHub:** [github.com/hex-di/hex-di](https://github.com/hex-di/hex-di)
