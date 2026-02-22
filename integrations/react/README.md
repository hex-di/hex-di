# @hex-di/react

React integration for HexDI - type-safe hooks, Provider components, automatic scope lifecycle management, and distributed tracing support.

## Features

- **Type-Safe Hooks** - Resolve services with compile-time validation
- **Provider Components** - Container, Scope, and Tracing providers
- **Distributed Tracing** - First-class tracing support via `TracingProvider` and hooks
- **Automatic Scope Lifecycle** - Scopes tied to React component lifecycle
- **Factory Pattern** - Isolated integrations for type safety
- **SSR Compatible** - No global state, works with Next.js/Remix

## Installation

```bash
pnpm add @hex-di/react react
```

## Quick Start

```typescript
import { port } from "@hex-di/core";
import { createContainer } from "@hex-di/runtime";
import { createTypedHooks } from "@hex-di/react";

// Define ports
const LoggerPort = port<Logger>()({ name: "Logger" });
type AppPorts = typeof LoggerPort;

// Create typed React integration
const { ContainerProvider, usePort } = createTypedHooks<AppPorts>();

// Use in your React app
function App() {
  return (
    <ContainerProvider container={container}>
      <MyComponent />
    </ContainerProvider>
  );
}

function MyComponent() {
  const logger = usePort(LoggerPort); // Type-safe!
  return <div>{logger.name}</div>;
}
```

## Distributed Tracing

The `TracingProvider` integrates distributed tracing into React applications, enabling span creation for component lifecycle events, user interactions, and async operations.

### TracingProvider Setup

Wrap your app root with `TracingProvider` to make tracing available to all components:

```typescript
import { createMemoryTracer } from "@hex-di/tracing";
import { TracingProvider } from "@hex-di/react";

const tracer = createMemoryTracer();

function App() {
  return (
    <TracingProvider tracer={tracer}>
      <MyComponent />
    </TracingProvider>
  );
}
```

### Integration with ContainerProvider

Combine tracing with DI container for full observability:

```typescript
import { createContainer } from "@hex-di/runtime";
import { instrumentContainer, createConsoleTracer } from "@hex-di/tracing";
import { HexDiContainerProvider, TracingProvider } from "@hex-di/react";

const tracer = createConsoleTracer({ colorize: true });
const container = createContainer({ graph, name: "App" });

// Instrument container to trace all service resolutions
instrumentContainer(container, tracer, {
  portFilter: "UserService", // Only trace specific services
});

function App() {
  return (
    <TracingProvider tracer={tracer}>
      <HexDiContainerProvider container={container}>
        <Dashboard />
      </HexDiContainerProvider>
    </TracingProvider>
  );
}
```

### useTracer Hook

Access the tracer instance for manual span management:

```typescript
import { useTracer } from "@hex-di/react";

function DataLoader() {
  const tracer = useTracer();

  useEffect(() => {
    tracer.withSpan("component.mount", (span) => {
      span.setAttribute("component", "DataLoader");
    });
  }, [tracer]);

  return <div>Loading data...</div>;
}
```

**When to use:**

- Manual span lifecycle control
- Creating spans in `useEffect` or `useLayoutEffect`
- Complex tracing logic with multiple nested spans

### useSpan Hook

Get the currently active span for conditional logic or adding attributes:

```typescript
import { useSpan } from "@hex-di/react";

function UserProfile({ userId }: { userId: string }) {
  const span = useSpan();

  // Add user context to active span if present
  if (span) {
    span.setAttribute("user.id", userId);
    span.setAttribute("component", "UserProfile");
  }

  return <div>Profile for {userId}</div>;
}
```

**When to use:**

- Conditional tracing logic
- Adding attributes to parent spans
- Checking if code is running in a traced context

**Returns:** `Span | undefined` (undefined is valid when no span is active)

### useTracedCallback Hook

Create callbacks wrapped in spans with automatic lifecycle management:

```typescript
import { useTracedCallback } from "@hex-di/react";

function SaveButton() {
  const handleSave = useTracedCallback(
    "button.save.click",
    async () => {
      await saveData();
      // Span automatically created and ended
      // Errors automatically recorded
    },
    []
  );

  return <button onClick={handleSave}>Save</button>;
}
```

**When to use:**

- Event handlers (onClick, onSubmit, onChange)
- User interactions that should be traced
- Async callbacks with automatic error handling

**Features:**

- Works with both sync and async callbacks
- Errors automatically recorded before re-throwing
- Preserves callback signature and return type
- Follows React hooks rules (same as `useCallback`)

### Complete Tracing Example

Full integration with event handlers, attributes, and error handling:

```typescript
import { useState } from "react";
import { TracingProvider, useTracedCallback, useSpan } from "@hex-di/react";
import { createConsoleTracer } from "@hex-di/tracing";

const tracer = createConsoleTracer({ colorize: true });

function App() {
  return (
    <TracingProvider tracer={tracer}>
      <TaskForm />
    </TracingProvider>
  );
}

function TaskForm() {
  const [title, setTitle] = useState("");
  const span = useSpan();

  // Add form context to active span
  if (span) {
    span.setAttribute("form.name", "TaskForm");
  }

  const handleSubmit = useTracedCallback(
    "form.task.submit",
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (!title.trim()) {
        throw new Error("Title is required");
      }

      // API call automatically traced within span
      await createTask({ title });

      setTitle("");
    },
    [title]
  );

  const handleCancel = useTracedCallback(
    "button.cancel.click",
    () => {
      setTitle("");
    },
    []
  );

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
      />
      <button type="submit">Create Task</button>
      <button type="button" onClick={handleCancel}>
        Cancel
      </button>
    </form>
  );
}
```

### Error Handling in Traced Callbacks

Errors are automatically recorded to spans:

```typescript
function DataFetcher() {
  const fetchData = useTracedCallback(
    "data.fetch",
    async () => {
      try {
        const response = await fetch("/api/data");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        // Error automatically recorded to span before re-throwing
        // span.recordException(error)
        // span.setStatus('error')
        throw error;
      }
    },
    []
  );

  return <button onClick={fetchData}>Fetch Data</button>;
}
```

### Testing with TracingProvider

Use `createMemoryTracer` in tests to verify tracing behavior:

```typescript
import { render, fireEvent, screen } from "@testing-library/react";
import { createMemoryTracer } from "@hex-di/tracing";
import { assertSpanExists, hasAttribute } from "@hex-di/tracing/testing";
import { TracingProvider } from "@hex-di/react";

it("traces button clicks", () => {
  const tracer = createMemoryTracer();

  render(
    <TracingProvider tracer={tracer}>
      <SaveButton />
    </TracingProvider>
  );

  fireEvent.click(screen.getByText("Save"));

  const spans = tracer.getCollectedSpans();
  assertSpanExists(spans, { name: "button.save.click" });

  const span = spans[0];
  expect(hasAttribute(span, "component", "SaveButton")).toBe(true);
});
```

### Hook Summary

| Hook                | Purpose                        | Returns                | When to Use                      |
| ------------------- | ------------------------------ | ---------------------- | -------------------------------- |
| `useTracer()`       | Access tracer instance         | `Tracer`               | Manual span management           |
| `useSpan()`         | Get active span                | `Span \| undefined`    | Add attributes, conditional flow |
| `useTracedCallback` | Create traced callback wrapper | `(...args) => TReturn` | Event handlers, async operations |

## Container Provider

Provide DI container to React tree:

```typescript
import { HexDiContainerProvider } from "@hex-di/react";

<HexDiContainerProvider container={container}>
  <App />
</HexDiContainerProvider>;
```

## Scope Management

### Automatic Scope Lifecycle

Create scopes tied to component lifecycle:

```typescript
import { HexDiAutoScopeProvider } from "@hex-di/react";

function UserPage() {
  return (
    <HexDiAutoScopeProvider>
      <UserProfile />
      <UserSettings />
    </HexDiAutoScopeProvider>
  );
}
```

### Manual Scope Provider

Control scope lifecycle manually:

```typescript
import { HexDiScopeProvider, useContainer } from "@hex-di/react";

function MyComponent() {
  const container = useContainer();
  const scope = container.createScope();

  return (
    <HexDiScopeProvider scope={scope}>
      <ChildComponent />
    </HexDiScopeProvider>
  );
}
```

## Async Container Loading

Handle async container initialization with loading/error states:

```typescript
import { HexDiAsyncContainerProvider } from "@hex-di/react";

function App() {
  return (
    <HexDiAsyncContainerProvider container={asyncContainer}>
      {/* Loading state */}
      <HexDiAsyncContainerProvider.Loading>
        <div>Initializing services...</div>
      </HexDiAsyncContainerProvider.Loading>

      {/* Error state */}
      <HexDiAsyncContainerProvider.Error>
        {(error) => <div>Failed to initialize: {error.message}</div>}
      </HexDiAsyncContainerProvider.Error>

      {/* Ready state */}
      <HexDiAsyncContainerProvider.Ready>
        <Dashboard />
      </HexDiAsyncContainerProvider.Ready>
    </HexDiAsyncContainerProvider>
  );
}
```

## Lazy Container Loading

Defer child container loading until needed:

```typescript
import { HexDiLazyContainerProvider } from "@hex-di/react";

const lazyFeature = rootContainer.createLazyChild(
  async () => import("./feature-graph"),
  { name: "Feature" }
);

function FeaturePage() {
  return (
    <HexDiLazyContainerProvider lazyContainer={lazyFeature}>
      <HexDiLazyContainerProvider.Loading>
        <div>Loading feature...</div>
      </HexDiLazyContainerProvider.Loading>

      <HexDiLazyContainerProvider.Error>
        {(error) => <div>Failed: {error.message}</div>}
      </HexDiLazyContainerProvider.Error>

      <HexDiLazyContainerProvider.Ready>
        <FeatureComponent />
      </HexDiLazyContainerProvider.Ready>
    </HexDiLazyContainerProvider>
  );
}
```

## Type Safety

Use factory pattern for full type safety:

```typescript
import { createTypedHooks } from "@hex-di/react";
import type { LoggerPort, UserServicePort } from "./ports";

type AppPorts = typeof LoggerPort | typeof UserServicePort;

const { ContainerProvider, usePort } = createTypedHooks<AppPorts>();

function UserList() {
  // Type-safe: TypeScript validates UserServicePort exists in AppPorts
  const userService = usePort(UserServicePort);
  return <div>{userService.list().length} users</div>;
}
```

## Error Handling

Handle DI errors in React Error Boundaries:

```typescript
import { MissingProviderError } from "@hex-di/react";

class ErrorBoundary extends React.Component {
  componentDidCatch(error) {
    if (error instanceof MissingProviderError) {
      console.error("Component used DI hook outside Provider");
    }
  }
}
```

## License

MIT
