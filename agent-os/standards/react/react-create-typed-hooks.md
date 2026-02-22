# createTypedHooks Factory

`createTypedHooks<TProvides>()` creates an isolated, type-safe React integration bound to a specific port union.
Use it at the app entry point to produce typed hooks and providers.

```tsx
import { createTypedHooks } from "@hex-di/react";
import type { InferGraphProvides } from "@hex-di/graph";

// Derive TProvides from the built graph
type AppPorts = InferGraphProvides<typeof rootGraph>;

// Create isolated integration — each call creates new, independent React contexts
const {
  ContainerProvider,
  AutoScopeProvider,
  ScopeProvider,
  AsyncContainerProvider,
  usePort,
  usePortOptional,
  useContainer,
  useScope,
} = createTypedHooks<AppPorts>();

// Re-export for use across the app
export { ContainerProvider, AutoScopeProvider, usePort, usePortOptional };
```

## Why use createTypedHooks vs the global hooks

| | Global hooks (`import from "@hex-di/react"`) | `createTypedHooks` |
|---|---|---|
| Type safety | Accepts any port — no compile-time narrowing | Narrowed to `AppPorts` — unknown ports are a type error |
| Context isolation | Shared global context | Isolated context — safe for multiple DI trees in one app |
| `usePortOptional` | Not available globally | Available — returns `undefined` if resolution fails |

- `createTypedHooks()` creates **new React context instances** — multiple calls create independent DI trees with no shared state
- The `TProvides` type is captured at factory call time; it is not a runtime value
- `usePortOptional` returns `undefined` instead of throwing when a port is not in the container
