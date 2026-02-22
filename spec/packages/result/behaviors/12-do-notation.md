# 12 — Do Notation

Effect-style monadic comprehension for building typed context objects. See [ADR-012](../decisions/012-do-notation.md).

## BEH-12-001: Result.Do

```ts
const Do: Ok<{}, never> = ok({});
```

A starting value for Do notation — an `Ok` wrapping an empty object. Equivalent to `ok({} as Record<string, never>)`.

**Exported from**: `@hex-di/result` as `Result.Do` (static property) or as a standalone export.

## BEH-12-002: bind(name, f)

```ts
function bind<N extends string, Ctx, T, E>(
  name: Exclude<N, keyof Ctx>,
  f: (ctx: Ctx) => Result<T, E>
): (ctx: Ctx) => Result<Ctx & { readonly [K in N]: T }, E>
```

Adds a named `Result` value to the context. If `f` returns `Ok`, its value is added to the context under `name`. If `f` returns `Err`, the chain short-circuits.

**Parameters**:
- `name` — The key to add to the context object. Must not already exist in `Ctx` (enforced by `Exclude<N, keyof Ctx>`).
- `f` — A function receiving the current context and returning a `Result<T, E>`.

**Behavior**:

| f(ctx) returns | Result |
|----------------|--------|
| `Ok(value)` | `Ok({ ...ctx, [name]: value })` |
| `Err(error)` | `Err(error)` — short-circuits |

**Example**:
```ts
const result = Result.Do
  .andThen(bind("user", () => getUser(id)))
  .andThen(bind("email", ({ user }) => getEmail(user)));
// Result<{ user: User; email: Email }, GetUserError | GetEmailError>
```

## BEH-12-003: let\_(name, f)

```ts
function let_<N extends string, Ctx, T>(
  name: Exclude<N, keyof Ctx>,
  f: (ctx: Ctx) => T
): (ctx: Ctx) => Ok<Ctx & { readonly [K in N]: T }, never>
```

Adds a non-Result computed value to the context. Unlike `bind`, `f` returns a plain value (not wrapped in `Result`), so `let_` never short-circuits.

**Parameters**:
- `name` — The key to add to the context object. Must not already exist in `Ctx`.
- `f` — A function receiving the current context and returning a plain value `T`.

**Behavior**:

| Input | Result |
|-------|--------|
| Any context | `Ok({ ...ctx, [name]: f(ctx) })` — always succeeds |

**Naming**: `let_` uses an underscore suffix because `let` is a JavaScript reserved word.

**Example**:
```ts
const result = Result.Do
  .andThen(bind("user", () => getUser(id)))
  .andThen(let_("greeting", ({ user }) => `Hello, ${user.name}`));
// Result<{ user: User; greeting: string }, GetUserError>
```

## BEH-12-004: Type Accumulation

Each `bind` or `let_` extends the context type via intersection:

```ts
// Start: Ok<{}, never>
Result.Do

// After bind("user", ...): Ok<{ user: User }, GetUserError>
  .andThen(bind("user", () => getUser(id)))

// After bind("email", ...): Ok<{ user: User; email: Email }, GetUserError | GetEmailError>
  .andThen(bind("email", ({ user }) => getEmail(user)))

// After let_("greeting", ...): Ok<{ user: User; email: Email; greeting: string }, GetUserError | GetEmailError>
  .andThen(let_("greeting", ({ user }) => `Hello, ${user.name}`))
```

The error type is the union of all error types from `bind` calls. `let_` calls contribute `never` to the error union (they cannot fail).

## BEH-12-005: Usage with pipe()

Do notation composes naturally with standalone functions:

```ts
import { pipe } from "@hex-di/result/fn";
import { andThen, map } from "@hex-di/result/fn";

const result = pipe(
  Result.Do,
  andThen(bind("user", () => getUser(id))),
  andThen(bind("posts", ({ user }) => getPosts(user.id))),
  andThen(let_("count", ({ posts }) => posts.length)),
  map(({ user, posts, count }) => ({
    userName: user.name,
    postCount: count,
    latestPost: posts[0],
  }))
);
```

## BEH-12-006: Usage with method chaining

```ts
const result = Result.Do
  .andThen(bind("config", () => loadConfig()))
  .andThen(bind("db", ({ config }) => connectDb(config.dbUrl)))
  .andThen(bind("user", ({ db }) => db.findUser(userId)))
  .andThen(let_("isAdmin", ({ user }) => user.role === "admin"))
  .map(({ user, isAdmin }) => ({ user, isAdmin }));
```

## BEH-12-007: ResultAsync.Do

```ts
const Do: ResultAsync<{}, never> = ResultAsync.ok({});
```

The async variant of `Result.Do`. Works with the same `bind` and `let_` functions because `ResultAsync.andThen` accepts callbacks returning both `Result` and `ResultAsync`.

**Example**:
```ts
const result = ResultAsync.Do
  .andThen(bind("user", () => fetchUser(id)))           // fetchUser returns ResultAsync
  .andThen(bind("email", ({ user }) => fetchEmail(user))) // fetchEmail returns ResultAsync
  .map(({ user, email }) => sendWelcome(user, email));
```

## BEH-12-008: Relationship to safeTry

Do notation and `safeTry` generators serve complementary roles:

| Aspect | `safeTry` (generators) | Do notation |
|--------|----------------------|-------------|
| Syntax | `const x = yield* result` | `.andThen(bind("x", () => result))` |
| Context | Sequential `const` bindings | Named object properties |
| Pipe integration | No | Yes |
| Familiarity | Rust `?` operator | Effect Do |
| Async | `AsyncGenerator` | `ResultAsync.andThen` |
| Use case | Simple sequential extraction | Named accumulation, pipe chains |

Both patterns short-circuit on `Err`. Choose generators for simple sequential extraction; choose Do notation when building named context objects or composing with `pipe()`.
