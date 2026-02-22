# ADR-R006: Render Props Over Compound Components

## Status

Accepted

## Context

The initial API proposal used a compound component pattern for `Match`:

```tsx
<Match result={result}>
  <Match.Ok>{(value) => <UserCard user={value} />}</Match.Ok>
  <Match.Err>{(error) => <ErrorBanner error={error} />}</Match.Err>
</Match>
```

This was evaluated against a render-prop alternative:

```tsx
<Match
  result={result}
  ok={(value) => <UserCard user={value} />}
  err={(error) => <ErrorBanner error={error} />}
/>
```

### Compound Component Problems

1. **Generic inference failure** — TypeScript cannot propagate the generic types `T` and `E` from the parent `<Match>` to child `<Match.Ok>` and `<Match.Err>`. The children receive `unknown` types unless explicitly annotated. This is a fundamental TypeScript limitation with compound components.

2. **No exhaustiveness enforcement** — With compound components, omitting `<Match.Err>` produces no type error. TypeScript sees `children: React.ReactNode` as satisfied with any combination of children.

3. **Children scanning overhead** — The parent `<Match>` must iterate `React.Children` to find `<Match.Ok>` and `<Match.Err>`. This is fragile:
   - Breaks with `React.Fragment` wrappers
   - Breaks with `React.memo` wrappers
   - Breaks with conditional rendering (`{condition && <Match.Ok>...}`)
   - Performance overhead from traversal

4. **Ordering ambiguity** — With compound components, the rendering order of `<Match.Ok>` and `<Match.Err>` is irrelevant (only one renders), but developers may incorrectly assume ordering matters.

### Render Prop Advantages

1. **Full generic inference** — TypeScript infers `T` and `E` from `result` and propagates them to the `ok` and `err` callback parameter types.
2. **Compile-time exhaustiveness** — Both `ok` and `err` are required props. Omitting either is a type error.
3. **No children scanning** — Direct prop access, no iteration.
4. **Simpler implementation** — Approximately 5 lines of code.

## Decision

Use render props for the `Match` component:

```tsx
interface MatchProps<T, E> {
  result: Result<T, E>
  ok: (value: T) => React.ReactNode
  err: (error: E) => React.ReactNode
}

function Match<T, E>({ result, ok, err }: MatchProps<T, E>): React.ReactElement {
  return result.isOk()
    ? <React.Fragment key="ok">{ok(result.value)}</React.Fragment>
    : <React.Fragment key="err">{err(result.error)}</React.Fragment>
}
```

## Consequences

**Positive**:
- Full type inference with zero annotations
- Compile-time exhaustiveness enforcement
- Trivial implementation (no children scanning)
- No Fragment/memo compatibility issues

**Negative**:
- Deeply nested render functions can reduce readability for complex branches
- Less visually familiar than compound components for developers coming from libraries like Radix UI

**Trade-off accepted**: Type safety and exhaustiveness are critical for an error handling library. The readability concern is mitigated by extracting complex branches into separate components.
