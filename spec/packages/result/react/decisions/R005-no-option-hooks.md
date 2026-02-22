# ADR-R005: No Option Hooks or Components

## Status

Accepted

## Context

The initial API proposal included `useOption` and `<MatchOption>` — React bindings mirroring the `Option<T>` type from the core library.

Analysis of real-world React usage patterns reveals that `Option` is primarily a **composition tool** for chaining operations, not a **state container**:

1. **React already handles absence** — `null`, `undefined`, and conditional rendering (`{value && <Component />}`) are idiomatic React patterns for optional values.
2. **TypeScript optional chaining** — `user?.profile?.avatar` covers most nullable access patterns without `Option`.
3. **Option state is rarely useful** — Unlike `Result` (which carries error information), `Option` is isomorphic to `T | undefined`. A `useState<T | undefined>()` provides the same functionality with less abstraction.
4. **Option shines in composition** — `option.map(fn).andThen(fn2).unwrapOr(default)` is valuable in data pipelines, not in React component state.

## Decision

Do not provide `useOption`, `MatchOption`, or any Option-specific React bindings.

For rendering based on Option state, use the core library's `.match()` inline:

```tsx
{avatar.match(
  (url) => <img src={url} alt="avatar" />,
  () => <DefaultAvatar />
)}
```

Or convert to nullable and use standard React patterns:

```tsx
const avatarUrl = avatar.toNullable()
{avatarUrl ? <img src={avatarUrl} /> : <DefaultAvatar />}
```

## Consequences

**Positive**:
- Smaller API surface
- No redundant abstractions over existing React/TypeScript patterns
- Forces idiomatic React code

**Negative**:
- Developers must use inline `.match()` or `.toNullable()` for Option rendering
- Asymmetry between Result (has `Match` component) and Option (does not)

**Trade-off accepted**: The asymmetry is intentional. `Result` carries error information that benefits from explicit branch rendering. `Option` is `T | undefined` — React already handles this.
