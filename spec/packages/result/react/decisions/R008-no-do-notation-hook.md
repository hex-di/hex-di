# ADR-R008: No Do-Notation Hook

## Status

Accepted

## Context

The initial spec included `useResultDo` — a React hook wrapping the core library's Do-notation (`bind`/`let_`) pattern. The hook accepted an imperative callback where `bind` and `let_` calls would build up a typed context object:

```ts
useResultDo(
  (bind, let_, signal) => {
    bind("user", () => getUser(id))
    bind("posts", (ctx) => getPosts(ctx.user.id))
    let_("count", (ctx) => ctx.posts.length)
  },
  [id]
)
```

### The Type Safety Problem

The core library's Do-notation works via method chaining, where each `.andThen(bind(...))` call returns a new type with the binding added:

```ts
ok({})
  .andThen(bind("user", () => getUser(id)))                // Result<{user: User}, E>
  .andThen(bind("posts", ({ user }) => getPosts(user.id)))  // Result<{user: User, posts: Post[]}, E>
```

TypeScript progressively widens the context type at each step. This is type-safe: `ctx.user` is available in the second `bind` because the return type of the first `bind` includes it.

The imperative hook version cannot achieve this. The `ctx` parameter in every `bind` callback is typed as the *final* accumulated `Ctx` type. This means:

1. Early callbacks can access bindings that don't exist yet at runtime
2. TypeScript provides no compile-time error for accessing `ctx.posts` before `posts` is bound
3. The type safety is an illusion — it depends on the developer following the correct ordering

This is a fundamental limitation of TypeScript with imperative-style progressive typing. Unlike method chaining (which produces a new type per call), imperative function calls within a callback cannot progressively narrow a type parameter.

### Alternatives Considered

1. **Builder pattern** — Return a chainable builder from `useResultDo`. Rejected: the number of `.bind()` calls would vary per render, violating the Rules of Hooks if the builder is hook-based.
2. **Document the limitation** — Keep `useResultDo` but explicitly note that `ctx` types are not progressively narrowed. Rejected: this undermines a core design principle (#3: Type-safe).
3. **Use `useSafeTry` instead** — Generator-based `useSafeTry` with async generators provides the same sequential composition with correct type inference. Each `yield*` produces a correctly typed value.

## Decision

Remove `useResultDo`. The `useSafeTry` hook (with sync and async generator support) covers the same use cases with correct progressive type inference:

```ts
const { result, isLoading } = useSafeTry(
  async function* (signal) {
    const user = yield* fetchUser(userId, signal)
    const posts = yield* fetchPosts(user.id, signal)    // user is correctly typed
    const count = posts.length                           // posts is correctly typed
    return ok({ user, posts, count })
  },
  [userId]
)
```

For consumers who prefer the core library's `bind`/`let_` style, they can use it directly inside `useResultAsync`:

```ts
const { result } = useResultAsync(
  (signal) => ok({})
    .andThen(bind("user", () => fetchUser(id, signal)))
    .andThen(bind("posts", ({ user }) => fetchPosts(user.id, signal))),
  [id]
)
```

This preserves progressive type narrowing because it uses the core library's method-chaining API.

## Consequences

**Positive**:
- Eliminates a type-safety regression where `ctx` parameters provided incorrect type information at runtime
- Reduces API surface (one fewer hook to learn)
- Removes overlap between `useSafeTry` and `useResultDo`
- Generator-based composition is idiomatic TypeScript

**Negative**:
- Developers who prefer imperative `bind`/`let_` style must use it inside `useResultAsync` rather than a dedicated hook
- No 1:1 React hook for the core library's Do-notation — the bridge is through `useSafeTry` generators

**Trade-off accepted**: Type safety is a core design principle. A hook that provides incorrect type narrowing is worse than no hook at all. The `useSafeTry` alternative covers the same use cases correctly.
