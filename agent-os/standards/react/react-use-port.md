# usePort Hook

`usePort(port)` resolves a service from the nearest resolver in the tree (scope if inside an `AutoScopeProvider`, otherwise the container).

```tsx
import { usePort } from "@hex-di/react";

function UserProfile() {
  const logger = usePort(LoggerPort);        // singleton from container
  const session = usePort(UserSessionPort);  // scoped — requires AutoScopeProvider ancestor

  return <div>{session.userId}</div>;
}
```

## Key behaviors

- **Nearest resolver**: inside `HexDiAutoScopeProvider` → resolves from scope; outside → resolves from container
- **Memoized per (resolver, port)** — does not re-resolve on re-render unless the resolver or port token changes
- Throws `MissingProviderError` if called outside a `HexDiContainerProvider` tree
- Propagates DI errors as React errors (visible in error boundaries)

## Resolving scoped ports

```tsx
// ❌ Throws ScopeRequiredError — no scope in context
function BadComponent() {
  const session = usePort(UserSessionPort); // UserSessionPort is "scoped"
}

// ✅ Wrap with AutoScopeProvider first
function Page() {
  return (
    <HexDiAutoScopeProvider>
      <GoodComponent />
    </HexDiAutoScopeProvider>
  );
}
function GoodComponent() {
  const session = usePort(UserSessionPort); // resolved from scope ✓
}
```
