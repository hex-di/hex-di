# 01 — Components

> **Revision summary**: Initial version. Document control added per GxP review. For full change history, run `git log --follow --format="%h %ai %s" -- spec/packages/result/react/behaviors/01-components.md`.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | BEH-R01 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- behaviors/01-components.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- behaviors/01-components.md` |
| Reviewed By | PR reviewer — `git log --merges --first-parent main --format="%b" -- behaviors/01-components.md` (extract "Approved-by" or PR reviewer from merge commit) |
| Approved By | PR merge author — `git log --merges --first-parent main --format="%an %ai" -1 -- behaviors/01-components.md` |
| Approval Evidence | PR merge to `main` — `git log --merges --first-parent main -- behaviors/01-components.md` |
| Full Revision History | `git log --follow --format="%H %ai %an: %s" -- behaviors/01-components.md` |

React components for declarative Result pattern matching.

## BEH-R01-001: Match

```tsx
function Match<T, E>(props: MatchProps<T, E>): React.ReactElement
```

A render-prop component that accepts a `Result<T, E>` and renders the appropriate branch.

### Props

```ts
interface MatchProps<T, E> {
  result: Result<T, E>
  ok: (value: T) => React.ReactNode
  err: (error: E) => React.ReactNode
}
```

Both `ok` and `err` are required. Omitting either is a TypeScript compilation error. See [INV-R5](../invariants.md#inv-r5-match-exhaustiveness).

### Behavior

1. Calls `result.match(ok, err)` internally
2. Returns the result wrapped in a React fragment
3. When `result` changes variant (Ok → Err or Err → Ok), the previous branch's component tree is unmounted and the new branch is mounted — they have independent component state

### Usage

```tsx
import { Match } from "@hex-di/result-react"

<Match
  result={userResult}
  ok={(user) => <UserCard user={user} />}
  err={(error) => <ErrorBanner message={error.message} />}
/>
```

### Key Isolation

Each branch produces a distinct component subtree. When the variant flips, React unmounts the old branch and mounts the new one. This means:
- Form state inside the `ok` branch resets when the result becomes `Err`
- Effects in each branch run independently
- Error boundaries inside one branch do not affect the other

This is the primary advantage over inline `result.match()`, which shares the same component scope for both branches.

### Reference Implementation (DS-level)

> **Specification hierarchy note**: The following code block is a **reference implementation** (Design Specification level) included for clarity. It illustrates the intended behavior but is not normative — the testable contract is defined by the behavior and invariant specifications above. Conforming implementations may differ in structure provided they satisfy BEH-R01-001 and INV-R5.

```tsx
function Match<T, E>({ result, ok, err }: MatchProps<T, E>): React.ReactElement {
  return result.isOk()
    ? <React.Fragment key="ok">{ok(result.value)}</React.Fragment>
    : <React.Fragment key="err">{err(result.error)}</React.Fragment>
}
```

The `key` prop ensures React treats the two branches as distinct subtrees.

### Why Not Compound Components

See [ADR-R006](../decisions/R006-render-props-over-compound.md). Render props provide:
- Full generic inference from the `result` prop to the `ok`/`err` callbacks
- Compile-time exhaustiveness (both props required)
- No children scanning overhead
- No Fragment/memo compatibility issues

### Why Not MatchOption

The `Option` type's `.match()` method works directly in JSX without a wrapper component:

```tsx
{avatar.match(
  (url) => <img src={url} alt="avatar" />,
  () => <DefaultAvatar />
)}
```

Option is a composition tool, not a state container. Providing `MatchOption` would add surface area without solving a real problem. See [ADR-R005](../decisions/R005-no-option-hooks.md).
