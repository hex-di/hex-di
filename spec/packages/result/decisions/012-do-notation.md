# ADR-012: Do Notation

## Status

Accepted

## Context

`safeTry()` with generators provides early-return semantics (Rust's `?` operator). However, the generator approach has limitations:

1. **Named bindings are awkward** — Each `yield*` result must be assigned to a `const` on a separate line. There is no fluent way to build up a context object.
2. **No pipe integration** — Generator functions cannot be composed in a `pipe()` chain.
3. **Effect ecosystem familiarity** — The Effect library popularized Do/bind/let notation for building up monadic contexts, and developers moving from Effect expect this pattern.

Approaches considered:

1. **Generators only** (current) — Simple, familiar to Rust developers, but limited composability.
2. **Do notation only** — Replaces generators entirely. Loses the Rust `?`-like syntax.
3. **Both** — Do notation complements generators, each serving different use cases.

## Decision

Add Effect-style `Do`/`bind`/`let_` monadic comprehension that **complements** (not replaces) `safeTry` generators.

### API

```ts
import { ok, err } from "@hex-di/result";

const result = ok({})                    // Start with empty context: Ok<{}>
  .andThen(bind("user", () => getUser(id)))    // Ok<{ user: User }>
  .andThen(bind("email", ({ user }) => getEmail(user)))  // Ok<{ user: User; email: Email }>
  .andThen(let_("greeting", ({ user }) => `Hello, ${user.name}`))  // Ok<{ user: User; email: Email; greeting: string }>
  .map(({ user, email, greeting }) => sendGreeting(email, greeting));
```

### Primitives

**`Result.Do`**: A starting value of `ok({})` — an `Ok` wrapping an empty object. Alias for `ok({} as Record<string, never>)`.

**`bind(name, f)`**: Takes a name and a function that receives the current context and returns a `Result`. On `Ok`, adds the unwrapped value to the context under the given name. On `Err`, short-circuits.

```ts
function bind<N extends string, Ctx, T, E>(
  name: N,
  f: (ctx: Ctx) => Result<T, E>
): (ctx: Ctx) => Result<Ctx & { [K in N]: T }, E>
```

**`let_(name, f)`**: Like `bind` but `f` returns a plain value (not a `Result`). Adds a non-Result computed value to the context.

```ts
function let_<N extends string, Ctx, T>(
  name: N,
  f: (ctx: Ctx) => T
): (ctx: Ctx) => Result<Ctx & { [K in N]: T }, never>
```

### Usage with pipe()

```ts
import { pipe } from "@hex-di/result/fn";

const result = pipe(
  Result.Do,
  andThen(bind("user", () => getUser(id))),
  andThen(bind("email", ({ user }) => getEmail(user))),
  andThen(let_("greeting", ({ user }) => `Hello, ${user.name}`)),
  map(({ greeting, email }) => sendGreeting(email, greeting))
);
```

### Async variant

`ResultAsync.Do` starts with `ResultAsync.ok({})` and works with the same `bind`/`let_` functions, since `ResultAsync.andThen` accepts both sync and async callbacks.

### Type accumulation

Each `bind`/`let_` call extends the context type:

```ts
type DoContext<Bindings> = Result<Bindings, never>;

// After bind("user", () => getUser(id)):
// DoContext<{ user: User }>

// After bind("email", ({ user }) => getEmail(user)):
// DoContext<{ user: User; email: Email }>
```

The type grows with each step via intersection types (`Ctx & { [K in N]: T }`).

## Consequences

**Positive**:
- Named bindings build up a typed context object — more readable than sequential `const` assignments
- Composable with `pipe()` and standalone functions
- Familiar to Effect users — lowers migration barrier
- Complements generators — use generators for sequential steps, Do notation for named accumulation
- Raises Composability from 9→10

**Negative**:
- Additional concepts to learn (Do, bind, let_)
- `let_` uses underscore suffix to avoid JavaScript reserved word collision
- Type accumulation via intersection types can produce complex hover types in editors
- Two monadic comprehension styles (generators + Do) may confuse newcomers

**Trade-off accepted**: The composability and readability benefits justify the additional API surface. Generators and Do notation serve different use cases and coexist naturally.
