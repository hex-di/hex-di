# React StrictMode Compatibility

`HexDiAutoScopeProvider` uses deferred disposal (`setTimeout(fn, 0)`) to survive React StrictMode's double-invoke behavior. This is already implemented — no extra work needed in application code.

## What StrictMode does

In development with `<React.StrictMode>`, React runs effects twice:
```
mount → effect setup → effect cleanup → effect setup (again)
```

## Why naive scope disposal breaks

If the scope were disposed synchronously in the cleanup phase, child components that re-render between cleanup and the second setup would try to resolve from a disposed scope, throwing `DisposedScopeError`.

## How AutoScopeProvider handles it

```
Effect cleanup fires → schedules disposal via setTimeout(fn, 0)
Effect setup fires again → cancels the pending timeout → scope stays alive
Real unmount → cleanup fires → setTimeout executes → scope disposed ✓
```

## What this means for library authors

If you build a **custom scope provider** or **custom lifecycle hook** that creates and disposes scopes, you must replicate this deferred disposal pattern:

```tsx
useEffect(() => {
  const timeoutRef = { current: null };

  // Cancel any pending disposal from previous cleanup
  if (pendingDisposal.current) {
    clearTimeout(pendingDisposal.current);
    pendingDisposal.current = null;
  }

  return () => {
    const scopeToDispose = currentScope;
    pendingDisposal.current = setTimeout(() => {
      if (!scopeToDispose.isDisposed) void scopeToDispose.dispose();
    }, 0);
  };
}, []);
```

- Application code using `HexDiAutoScopeProvider` does NOT need to think about this
- Only relevant when writing **custom providers** that manage scope lifecycle directly
- `HexDiScopeProvider` (manual scope management) does NOT handle this — caller controls the scope
