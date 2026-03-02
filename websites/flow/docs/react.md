---
sidebar_position: 1
title: React Integration
---

# React Integration

The `@hex-di/flow-react` package provides type-safe React hooks for Flow state machines with concurrent mode support and automatic subscription management.

## Installation

```bash
pnpm add @hex-di/flow-react
```

## Setup

### FlowProvider

Wrap your app with the FlowProvider to enable Flow hooks:

```typescript
import { FlowProvider, FlowMemoryCollector } from '@hex-di/flow-react';
import { container } from './container';

function App() {
  return (
    <FlowProvider
      container={container}
      collector={new FlowMemoryCollector()}
    >
      <YourApp />
    </FlowProvider>
  );
}
```

## Main Hooks

### useMachine / useFlow

The primary hook for interacting with state machines:

```typescript
import { useMachine } from '@hex-di/flow-react';
import { TodoFlowPort } from './ports';

function TodoList() {
  const { state, context, send, activities } = useMachine(TodoFlowPort);

  const handleAddTodo = (text: string) => {
    send({ type: 'ADD_TODO', payload: { text } });
  };

  const handleToggleTodo = (id: string) => {
    send({ type: 'TOGGLE_TODO', payload: { id } });
  };

  if (state === 'loading') {
    return <div>Loading todos...</div>;
  }

  return (
    <div>
      <h1>Todos ({context.todos.length})</h1>
      <ul>
        {context.todos.map(todo => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => handleToggleTodo(todo.id)}
            />
            {todo.text}
          </li>
        ))}
      </ul>
      {activities.syncActivity?.status === 'running' && (
        <div>Syncing...</div>
      )}
    </div>
  );
}
```

The hook returns:

- `state` - Current state name
- `context` - Current context value
- `send` - Function to send events
- `activities` - Map of activity instances
- `snapshot` - Full machine snapshot
- `can` - Function to check if event is valid

### useSelector

Derive values from machine state with memoization:

```typescript
import { useSelector } from '@hex-di/flow-react';
import { TodoFlowPort } from './ports';

function TodoStats() {
  const stats = useSelector(
    TodoFlowPort,
    (snapshot) => {
      const todos = snapshot.context.todos;
      return {
        total: todos.length,
        completed: todos.filter(t => t.completed).length,
        active: todos.filter(t => !t.completed).length
      };
    }
  );

  return (
    <div>
      Total: {stats.total} |
      Active: {stats.active} |
      Completed: {stats.completed}
    </div>
  );
}

// With custom equality check
function TodoCount() {
  const count = useSelector(
    TodoFlowPort,
    (snapshot) => snapshot.context.todos.length,
    (a, b) => a === b // Custom equality
  );

  return <div>Todos: {count}</div>;
}
```

### useSend

Get a stable send function that doesn't cause re-renders:

```typescript
import { useSend } from '@hex-di/flow-react';
import { ModalFlowPort } from './ports';

// This component won't re-render when modal state changes
function ModalTrigger() {
  const send = useSend(ModalFlowPort);

  return (
    <button onClick={() => send({ type: 'OPEN' })}>
      Open Modal
    </button>
  );
}

// Use in callbacks
function FormField({ name }: { name: string }) {
  const send = useSend(FormFlowPort);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      send({
        type: 'UPDATE_FIELD',
        payload: { field: name, value: e.target.value }
      });
    },
    [send, name] // send is stable
  );

  return <input onChange={handleChange} />;
}
```

## Event Hooks

### useFlowEvent

Subscribe to specific event types:

```typescript
import { useFlowEvent } from "@hex-di/flow-react";
import { NotificationFlowPort } from "./ports";

function NotificationListener() {
  useFlowEvent(NotificationFlowPort, "NOTIFICATION_RECEIVED", event => {
    // Show toast notification
    toast.show(event.payload.message, {
      type: event.payload.severity,
    });
  });

  useFlowEvent(NotificationFlowPort, "ERROR_OCCURRED", event => {
    // Log to error tracking
    errorTracker.log(event.payload.error);
  });

  return null; // Just a listener component
}
```

## Activity Hooks

### useActivity

Monitor activity status:

```typescript
import { useActivity } from '@hex-di/flow-react';
import { UploadFlowPort } from './ports';

function UploadProgress() {
  const uploadActivity = useActivity(UploadFlowPort, 'fileUpload');

  if (!uploadActivity) {
    return null;
  }

  if (uploadActivity.status === 'running') {
    return (
      <div>
        Uploading... (Started {new Date(uploadActivity.startTime).toLocaleTimeString()})
      </div>
    );
  }

  if (uploadActivity.status === 'completed') {
    return <div>Upload complete! File ID: {uploadActivity.result?.fileId}</div>;
  }

  if (uploadActivity.status === 'failed') {
    return <div>Upload failed: {uploadActivity.error?.message}</div>;
  }

  return null;
}
```

## Port Resolution

### useFlowPort

Resolve a Flow port from the container:

```typescript
import { useFlowPort } from '@hex-di/flow-react';
import { OrderFlowPort } from './ports';

function OrderManager() {
  const orderFlow = useFlowPort(OrderFlowPort);

  // Direct access to runner methods
  const handleReset = () => {
    orderFlow.send({ type: 'RESET' });
    console.log('New state:', orderFlow.state());
  };

  // Subscribe to transitions
  useEffect(() => {
    const unsubscribe = orderFlow.subscribe((snapshot) => {
      console.log('Order state changed:', snapshot);
    });

    return unsubscribe;
  }, [orderFlow]);

  return <button onClick={handleReset}>Reset Order</button>;
}
```

## Inspection Hooks

### useFlowState

Get all machine instances:

```typescript
import { useFlowState } from '@hex-di/flow-react';

function FlowDebugger() {
  const flows = useFlowState();

  return (
    <div>
      <h2>Active Flows</h2>
      <ul>
        {Array.from(flows.entries()).map(([id, flow]) => (
          <li key={id}>
            {id}: {flow.state()}
            (Activities: {Object.keys(flow.snapshot().activities).length})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### useFlowHealth

Monitor flow health metrics:

```typescript
import { useFlowHealth } from '@hex-di/flow-react';

function HealthMonitor() {
  const health = useFlowHealth({
    slowThresholdMs: 100,
    checkInterval: 5000
  });

  return (
    <div className={health.isHealthy ? 'healthy' : 'unhealthy'}>
      <h3>Flow Health</h3>
      <p>Total Transitions: {health.totalTransitions}</p>
      <p>Slow Transitions: {health.slowTransitions}</p>
      <p>Error Rate: {health.errorRate.toFixed(2)}%</p>
      <p>Avg Duration: {health.avgDuration.toFixed(2)}ms</p>
      {health.slowestTransition && (
        <p>
          Slowest: {health.slowestTransition.from} → {health.slowestTransition.to}
          ({health.slowestTransition.duration}ms)
        </p>
      )}
    </div>
  );
}
```

### useFlowTimeline

View transition timeline:

```typescript
import { useFlowTimeline } from '@hex-di/flow-react';

function TransitionTimeline() {
  const timeline = useFlowTimeline({
    machineId: 'order-workflow',
    limit: 20
  });

  return (
    <div>
      <h3>Recent Transitions</h3>
      <ol>
        {timeline.map(event => (
          <li key={event.id}>
            <time>{new Date(event.timestamp).toLocaleTimeString()}</time>
            {' '}
            {event.prevState} → {event.nextState}
            {' '}
            via {event.event.type}
            {event.duration && ` (${event.duration}ms)`}
          </li>
        ))}
      </ol>
    </div>
  );
}
```

## Collector Access

### useFlowCollector

Access the Flow collector directly:

```typescript
import { useFlowCollector } from '@hex-di/flow-react';

function CollectorStats() {
  const collector = useFlowCollector();

  const stats = collector?.getStats();

  if (!stats) {
    return <div>No collector configured</div>;
  }

  return (
    <div>
      <h3>Collector Statistics</h3>
      <dl>
        <dt>Total Events</dt>
        <dd>{stats.totalTransitions}</dd>
        <dt>Unique Machines</dt>
        <dd>{stats.uniqueMachines}</dd>
        <dt>Average Duration</dt>
        <dd>{stats.averageDuration.toFixed(2)}ms</dd>
        <dt>Memory Usage</dt>
        <dd>{(stats.memoryUsage / 1024).toFixed(2)}KB</dd>
      </dl>
      <button onClick={() => collector.clear()}>
        Clear History
      </button>
    </div>
  );
}
```

## Advanced Patterns

### Compound Component Pattern

```typescript
function OrderWizard() {
  const { state, context, send } = useMachine(OrderFlowPort);

  return (
    <OrderWizardContext.Provider value={{ state, context, send }}>
      <div className="wizard">
        <OrderWizard.Progress />
        <OrderWizard.CurrentStep />
        <OrderWizard.Navigation />
      </div>
    </OrderWizardContext.Provider>
  );
}

OrderWizard.Progress = function Progress() {
  const { state } = useContext(OrderWizardContext);
  const steps = ['cart', 'shipping', 'payment', 'review', 'complete'];
  const currentIndex = steps.indexOf(state);

  return (
    <div className="progress">
      {steps.map((step, i) => (
        <div
          key={step}
          className={i <= currentIndex ? 'completed' : 'pending'}
        >
          {step}
        </div>
      ))}
    </div>
  );
};

OrderWizard.Navigation = function Navigation() {
  const { state, send } = useContext(OrderWizardContext);

  return (
    <div className="navigation">
      {state !== 'cart' && (
        <button onClick={() => send({ type: 'BACK' })}>Back</button>
      )}
      {state !== 'complete' && (
        <button onClick={() => send({ type: 'NEXT' })}>Next</button>
      )}
    </div>
  );
};
```

### Optimistic Updates

```typescript
function OptimisticTodoList() {
  const { context, send } = useMachine(TodoFlowPort);
  const [optimisticTodos, setOptimisticTodos] = useState(context.todos);

  useEffect(() => {
    setOptimisticTodos(context.todos);
  }, [context.todos]);

  const handleToggle = (id: string) => {
    // Optimistic update
    setOptimisticTodos(prev =>
      prev.map(todo =>
        todo.id === id
          ? { ...todo, completed: !todo.completed }
          : todo
      )
    );

    // Send actual event
    send({ type: 'TOGGLE_TODO', payload: { id } });
  };

  return (
    <ul>
      {optimisticTodos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={handleToggle}
        />
      ))}
    </ul>
  );
}
```

### Error Boundaries

```typescript
function FlowErrorBoundary({ children, flowPort }: Props) {
  const { state } = useMachine(flowPort);

  if (state === 'error') {
    return (
      <ErrorFallback
        onReset={() => send({ type: 'RESET' })}
      />
    );
  }

  return children;
}
```

## React 18 Concurrent Mode

Flow-React uses `useSyncExternalStore` for concurrent mode compatibility:

```typescript
// Automatic batching and tearing prevention
function ConcurrentSafeComponent() {
  const { state, context } = useMachine(MyFlowPort);

  // Multiple state updates are batched
  const handleMultipleUpdates = () => {
    startTransition(() => {
      send({ type: 'UPDATE_1' });
      send({ type: 'UPDATE_2' });
      send({ type: 'UPDATE_3' });
    });
  };

  // Consistent reads across render
  return (
    <div>
      <div>State: {state}</div>
      <div>Context: {JSON.stringify(context)}</div>
    </div>
  );
}
```

## Best Practices

1. **Use useSelector for derived state**: Don't compute in render
2. **Prefer useSend for callbacks**: Prevents unnecessary re-renders
3. **Subscribe to specific events**: Use useFlowEvent for side effects
4. **Memoize selectors**: Use useCallback for selector functions
5. **Handle loading states**: Check activity status for async operations
6. **Use error boundaries**: Gracefully handle error states
7. **Keep components focused**: One Flow port per component when possible
8. **Test with React Testing Library**: Hooks work well with RTL patterns
