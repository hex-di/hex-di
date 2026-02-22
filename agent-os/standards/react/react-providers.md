# React Providers

## HexDiContainerProvider — root of the DI tree

```tsx
import { createContainer } from "@hex-di/runtime";
import { HexDiContainerProvider } from "@hex-di/react";

// Create and initialize container outside React (before render)
const container = createContainer({ graph: appGraph, name: "App" });
await container.initialize(); // only if graph has async adapters

function App() {
  return (
    <HexDiContainerProvider container={container}>
      <Router />
    </HexDiContainerProvider>
  );
}
```

- **Provider does NOT manage container lifecycle** — caller is responsible for `await container.dispose()`
- Root containers cannot be nested inside another `HexDiContainerProvider` — throws `MissingProviderError`
- Child containers (from `container.createChild()`) CAN be nested inside a root provider

## HexDiAutoScopeProvider — scope tied to component lifecycle

```tsx
import { HexDiAutoScopeProvider } from "@hex-di/react";

function UserPage() {
  return (
    // Creates scope on mount, disposes on unmount
    <HexDiAutoScopeProvider name="UserPage">
      <UserProfile />   {/* resolves UserContextPort from scope */}
      <UserSettings />  {/* same scope, not a new one */}
    </HexDiAutoScopeProvider>
  );
}
```

- `name` is optional but recommended for DevTools identification
- Nested `HexDiAutoScopeProvider` creates a child scope from the parent scope
- Components inside share the same scope instance; scope is NOT per-component
- Must be inside a `HexDiContainerProvider`
