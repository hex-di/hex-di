# ADR-R001: No ResultBoundary Component

## Status

Accepted

## Context

The initial API proposal included a `<ResultBoundary>` component — a React error boundary that catches `UnwrapError` thrown by unsafe extractors (`unwrap()`, `expect()`) and renders a fallback UI.

Arguments for:
1. Provides a safety net for components that use `unwrap()` optimistically
2. Familiar pattern for React developers (mirrors `<ErrorBoundary>`)
3. Catches unexpected failures from third-party code using Result

Arguments against:
1. **Contradicts core philosophy** — The core library's design principle #1 is "No exceptions — Errors are values, not control flow." A `ResultBoundary` encourages treating thrown `UnwrapError` as the primary error handling path, which inverts this principle.
2. **Promotes unsafe patterns** — With a boundary available, developers are incentivized to use `unwrap()` liberally instead of `match()` or `unwrapOr()`. This makes error handling implicit (caught somewhere up the tree) rather than explicit (handled at the point of use).
3. **Core already gates unsafe operations** — `unwrap()` and `unwrapErr()` live in the `@hex-di/result/unsafe` subpath specifically to discourage casual use. A component that catches their errors undermines this gating.
4. **React's `<ErrorBoundary>` already exists** — Any consumer who genuinely needs to catch `UnwrapError` can use a standard React error boundary or libraries like `react-error-boundary`. The Result library does not need to provide its own.

## Decision

Do not provide a `<ResultBoundary>` component. Errors from `Result` should be rendered via pattern matching:

```tsx
// Preferred: errors as values
<Match
  result={result}
  ok={(value) => <Success data={value} />}
  err={(error) => <ErrorDisplay error={error} />}
/>

// Also fine: inline
{result.match(
  (value) => <Success data={value} />,
  (error) => <ErrorDisplay error={error} />
)}
```

## Consequences

**Positive**:
- Maintains philosophical consistency with the core library
- Forces explicit error handling at the component level
- Reduces API surface
- No risk of silently swallowing errors in the boundary

**Negative**:
- Developers who want a catch-all for `UnwrapError` must use a standard error boundary
- Migrating from codebases that use `unwrap()` heavily requires refactoring to `match()`

**Trade-off accepted**: The philosophical consistency is worth the migration cost. The core library explicitly discourages `unwrap()` via subpath gating; the React layer should reinforce, not undermine, this design choice.
