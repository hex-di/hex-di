---
title: "@hex-di/react"
description: API reference for @hex-di/react providing typed hooks, ContainerProvider, ScopeProvider, and AutoScopeProvider for React integration.
sidebar_position: 4
sidebar_label: "@hex-di/react"
---

# @hex-di/react API Reference

React integration for HexDI with typed hooks, providers, and automatic scope lifecycle management.

## Installation

```bash
pnpm add @hex-di/react
```

## Overview

`@hex-di/react` provides:
- `createTypedHooks()` - Factory for creating typed React integration
- Provider components for container and scope access
- Hooks for service resolution

## Functions

### createTypedHooks

Creates typed React hooks and providers for a specific set of ports.

```typescript
function createTypedHooks<TProvides extends Port<unknown, string>>(): TypedReactIntegration<TProvides>
```

**Type Parameters:**
- `TProvides` - Union of Port types that can be resolved

**Returns:**
- `TypedReactIntegration<TProvides>` - Object containing hooks and providers

**Example:**

```typescript
import { createTypedHooks } from '@hex-di/react';
import type { AppPorts } from './ports';

const {
  ContainerProvider,
  ScopeProvider,
  AutoScopeProvider,
  AsyncContainerProvider,
  usePort,
  usePortOptional,
  useContainer,
  useScope,
} = createTypedHooks<AppPorts>();
```

## Types

### `TypedReactIntegration<TProvides>`

The return type of `createTypedHooks()`.

```typescript
interface TypedReactIntegration<TProvides extends Port<unknown, string>> {
  ContainerProvider: React.FC<HexDiContainerProviderProps<TProvides>>;
  ScopeProvider: React.FC<HexDiScopeProviderProps<TProvides>>;
  AutoScopeProvider: React.FC<HexDiAutoScopeProviderProps>;
  AsyncContainerProvider: HexDiAsyncContainerProviderComponent<TProvides>;
  usePort: <P extends TProvides>(port: P) => InferService<P>;
  usePortOptional: <P extends TProvides>(port: P) => InferService<P> | undefined;
  useContainer: () => Resolver<TProvides>;
  useScope: () => Resolver<TProvides>;
}
```

## Components

### ContainerProvider

Provides the container to the component tree.

```typescript
interface HexDiContainerProviderProps<TProvides> {
  container: Container<TProvides>;
  children: React.ReactNode;
}
```

**Example:**

```typescript
import { createContainer } from '@hex-di/runtime';
import { ContainerProvider } from './di/hooks';
import { appGraph } from './di/graph';

const container = createContainer({ graph: appGraph, name: "App" });

function App() {
  return (
    <ContainerProvider container={container}>
      <MyApp />
    </ContainerProvider>
  );
}
```

### ScopeProvider

Provides a manually-managed scope to children.

```typescript
interface HexDiScopeProviderProps<TProvides> {
  scope: Resolver<TProvides>;
  children: React.ReactNode;
}
```

**Example:**

```typescript
function RequestHandler() {
  const container = useContainer();
  const scope = useMemo(() => container.createScope(), [container]);

  useEffect(() => {
    return () => {
      void scope.tryDispose();
    };
  }, [scope]);

  return (
    <ScopeProvider scope={scope}>
      <RequestContent />
    </ScopeProvider>
  );
}
```

### AutoScopeProvider

Automatically creates and disposes a scope on mount/unmount.

```typescript
interface HexDiAutoScopeProviderProps {
  name?: string;
  children: React.ReactNode;
}
```

**Example:**

```typescript
function UserDashboard() {
  return (
    <AutoScopeProvider>
      {/* Scoped services available here */}
      <UserProfile />
      <UserSettings />
    </AutoScopeProvider>
  );
}
```

**With Key for Scope Recreation:**

```typescript
function App() {
  const [userId, setUserId] = useState('alice');

  return (
    <AutoScopeProvider key={userId}>
      {/* New scope created when userId changes */}
      <Dashboard />
    </AutoScopeProvider>
  );
}
```

### AsyncContainerProvider

Handles async container initialization with loading/error/ready states.

```typescript
interface HexDiAsyncContainerProviderProps<TProvides> {
  container: LazyContainer<TProvides>; // container.initialize() called internally
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
  errorFallback?: (error: Error) => React.ReactNode;
}
```

**Simple mode** (built-in loading/error UI):

```typescript
function App() {
  return (
    <AsyncContainerProvider container={lazyContainer}>
      <MyApp />
    </AsyncContainerProvider>
  );
}
```

**Compound Component mode** (custom loading/error/ready UI):

```typescript
function App() {
  return (
    <AsyncContainerProvider container={lazyContainer}>
      <AsyncContainerProvider.Loading>
        <Spinner />
      </AsyncContainerProvider.Loading>
      <AsyncContainerProvider.Error>
        {(error) => <ErrorBanner message={error.message} />}
      </AsyncContainerProvider.Error>
      <AsyncContainerProvider.Ready>
        <MyApp />
      </AsyncContainerProvider.Ready>
    </AsyncContainerProvider>
  );
}
```

## Hooks

### usePort

Resolves a service from the container or current scope.

```typescript
function usePort<P extends TProvides>(port: P): InferService<P>
```

**Parameters:**
- `port` - The port to resolve

**Returns:**
- The resolved service instance

**Throws:**
- `MissingProviderError` if no ContainerProvider ancestor
- `ScopeRequiredError` if scoped port without ScopeProvider

**Example:**

```typescript
function UserProfile() {
  const logger = usePort(LoggerPort);      // Singleton - always works
  const session = usePort(UserSessionPort); // Scoped - needs scope

  useEffect(() => {
    logger.log('Profile mounted');
  }, [logger]);

  return <div>Welcome, {session.user.name}!</div>;
}
```

### useContainer

Access the container directly.

```typescript
function useContainer(): Container<TProvides>
```

**Returns:**
- The container instance

**Throws:**
- `MissingProviderError` if no ContainerProvider ancestor

**Example:**

```typescript
function NotificationButton() {
  const container = useContainer();

  const handleClick = () => {
    // Manual resolution for transient service
    const notification = container.resolve(NotificationPort);
    notification.send('Hello!');
  };

  return <button onClick={handleClick}>Notify</button>;
}
```

### useScope

Access the current scope (only inside scope providers).

```typescript
function useScope(): Scope<TProvides>
```

**Returns:**
- The current scope instance

**Throws:**
- `MissingProviderError` if no ScopeProvider ancestor

**Example:**

```typescript
function ScopedComponent() {
  const scope = useScope();

  useEffect(() => {
    console.log('Current scope:', scope);
  }, [scope]);

  return <div>In scope</div>;
}
```

### usePortOptional

Resolves a service, returning undefined if not available.

```typescript
function usePortOptional<P extends TProvides>(port: P): InferService<P> | undefined
```

**Returns:**
- The service or `undefined` if resolution fails

**Example:**

```typescript
function OptionalFeature() {
  const analytics = usePortOptional(AnalyticsPort);

  const handleClick = () => {
    analytics?.track('button_clicked');
  };

  return <button onClick={handleClick}>Click</button>;
}
```

### useDeps

Resolves multiple ports in a single call.

```typescript
function useDeps<T extends Partial<Record<string, TProvides>>>(
  ports: T
): { [K in keyof T]: T[K] extends TProvides ? InferService<T[K]> : never }
```

**Example:**

```typescript
function Dashboard() {
  const { logger, userService } = useDeps({
    logger: LoggerPort,
    userService: UserServicePort,
  });

  // ...
}
```

## Global Package Exports

In addition to the `createTypedHooks()` factory, `@hex-di/react` exports global components for use without type constraints (e.g., in testing utilities or library code).

### Provider Components

```typescript
import {
  HexDiContainerProvider,
  HexDiScopeProvider,
  HexDiAutoScopeProvider,
  HexDiAsyncContainerProvider,
  HexDiLazyContainerProvider,
  ReactiveScopeProvider,
  InspectorProvider,
  TracingProvider,
} from '@hex-di/react';
```

| Component | Purpose |
|-----------|---------|
| `HexDiContainerProvider` | Root container context |
| `HexDiScopeProvider` | Manual scope context |
| `HexDiAutoScopeProvider` | Automatic scope lifecycle |
| `HexDiAsyncContainerProvider` | Async container initialization |
| `HexDiLazyContainerProvider` | Deferred graph loading (code splitting) |
| `ReactiveScopeProvider` | Externally-disposed scope with automatic unmount |
| `InspectorProvider` | Container inspection context |
| `TracingProvider` | Distributed tracing context |

### Tracing Hooks

```typescript
import { useTracer, useSpan, useTracedCallback } from '@hex-di/react';
```

**`useTracer()`** — Access the tracer from `TracingProvider`:

```typescript
function MyComponent() {
  const tracer = useTracer();
  const span = tracer.startSpan('my-operation');
  // ...
}
```

**`useSpan()`** — Get the currently active span:

```typescript
function MyComponent() {
  const span = useSpan();
  span?.setAttribute('user.id', userId);
}
```

**`useTracedCallback(name, fn)`** — Wrap a callback in an auto-managed span:

```typescript
function MyButton() {
  const handleClick = useTracedCallback('button.click', async () => {
    await doWork();
  });

  return <button onClick={handleClick}>Submit</button>;
}
```

### Inspection Hooks

All inspection hooks require an `InspectorProvider` ancestor.

```typescript
import { useInspector, useSnapshot, useScopeTree, useUnifiedSnapshot } from '@hex-di/react';
```

**`useInspector()`** — Access the `InspectorAPI` instance directly.

**`useSnapshot()`** — Reactive container snapshot (re-renders on change):

```typescript
function DebugPanel() {
  const snapshot = useSnapshot();

  return (
    <ul>
      {snapshot.services.map(s => (
        <li key={s.portName}>{s.portName}: {s.lifetime}</li>
      ))}
    </ul>
  );
}
```

**`useScopeTree()`** — Reactive scope hierarchy.

**`useUnifiedSnapshot()`** — Reactive unified snapshot combining container + library data.

### DevTools Bridge

```typescript
import { DevToolsBridge } from '@hex-di/react';

// Forwards inspector events to browser DevTools extension
function App() {
  return (
    <InspectorProvider inspector={inspector}>
      <DevToolsBridge />
      <MyApp />
    </InspectorProvider>
  );
}
```

### createComponent

Declarative component definition with explicit DI dependencies:

```typescript
import { createComponent } from '@hex-di/react';

const UserProfile = createComponent({
  requires: [UserServicePort, LoggerPort],
  component: ({ UserService, Logger }) => {
    const user = UserService.getCurrentUser();
    Logger.log('ProfileRendered');
    return <div>{user.name}</div>;
  },
});
```

## Error Classes

### MissingProviderError

Thrown when hooks are used outside required providers.

```typescript
class MissingProviderError extends Error {
  readonly providerType: 'Container' | 'Scope';
}
```

**Example:**

`MissingProviderError` is thrown during render and propagates to the nearest React Error Boundary — it cannot be caught inline in a component body. Wrap the component tree in a `ContainerProvider` to prevent it:

```typescript
function App() {
  return (
    // Provides the container to all children — prevents MissingProviderError
    <ContainerProvider container={container}>
      <Dashboard />
    </ContainerProvider>
  );
}
```

## Usage Patterns

### Basic Setup

```typescript
// di/hooks.ts
import { createTypedHooks } from '@hex-di/react';
import type { AppPorts } from './ports';

const hooks = createTypedHooks<AppPorts>();

export const ContainerProvider = hooks.ContainerProvider;
export const AutoScopeProvider = hooks.AutoScopeProvider;
export const usePort = hooks.usePort;
export const useContainer = hooks.useContainer;

// App.tsx
import { ContainerProvider, AutoScopeProvider } from './di/hooks';
import { container } from './di/container';

function App() {
  return (
    <ContainerProvider container={container}>
      <AutoScopeProvider>
        <MainApp />
      </AutoScopeProvider>
    </ContainerProvider>
  );
}
```

### Multiple Scope Regions

```typescript
function App() {
  return (
    <ContainerProvider container={container}>
      <Header /> {/* Singletons only */}

      <AutoScopeProvider key="workspace">
        <Workspace /> {/* Workspace scoped services */}
      </AutoScopeProvider>

      <AutoScopeProvider key="settings">
        <Settings /> {/* Settings scoped services */}
      </AutoScopeProvider>
    </ContainerProvider>
  );
}
```

### Reactive Updates

```typescript
function MessageList() {
  const store = usePort(MessageStorePort);
  const [messages, setMessages] = useState(() => store.getMessages());

  useEffect(() => {
    return store.subscribe(setMessages);
  }, [store]);

  return (
    <ul>
      {messages.map(msg => (
        <li key={msg.id}>{msg.content}</li>
      ))}
    </ul>
  );
}
```

## SSR Considerations

- `createTypedHooks()` creates isolated context instances
- No global state - safe for SSR
- Create containers per request on server

```typescript
import { fromPromise } from '@hex-di/result';

// Server-side
export async function getServerSideProps() {
  const container = createContainer({ graph, name: "App" });
  const result = await container.tryResolve(DataPort)
    .asyncAndThen((dataService) => fromPromise(dataService.fetch(), (e) => e));
  await container.tryDispose();
  return result.match(
    (data) => ({ props: { data } }),
    () => ({ notFound: true }),
  );
}
```
