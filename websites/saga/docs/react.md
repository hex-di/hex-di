---
sidebar_position: 11
title: React Integration
---

# React Integration

The `@hex-di/saga-react` package provides React hooks and components for executing and monitoring sagas.

## Installation

```bash
pnpm add @hex-di/saga-react
```

## Provider Setup

Wrap your application with `SagaManagementProvider` to make saga execution available:

```tsx
import { HexDiContainerProvider } from "@hex-di/react";
import { SagaManagementProvider } from "@hex-di/saga-react";

function App() {
  return (
    <HexDiContainerProvider container={container}>
      <SagaManagementProvider>
        <OrderFlow />
      </SagaManagementProvider>
    </HexDiContainerProvider>
  );
}
```

The `SagaManagementProvider` resolves its executor from the nearest `HexDiContainerProvider`.

## Hooks

### useSaga

Execute a saga and track its lifecycle:

```tsx
import { useSaga } from "@hex-di/saga-react";

function OrderButton({ orderId }: { orderId: string }) {
  const { execute, status, result, error } = useSaga(orderSaga);

  const handleOrder = async () => {
    await execute({ orderId });
  };

  return (
    <div>
      <button onClick={handleOrder} disabled={status === "running"}>
        {status === "running" ? "Processing..." : "Place Order"}
      </button>
      {status === "success" && <p>Order placed!</p>}
      {status === "error" && <p>Error: {error?.message}</p>}
    </div>
  );
}
```

#### Return Type

```typescript
interface UseSagaResult {
  execute: (input: TInput) => Promise<void>;
  status: UseSagaStatus; // "idle" | "running" | "success" | "error"
  result: TOutput | undefined;
  error: TError | undefined;
  reset: () => void;
}
```

### useSagaStatus

Monitor the status of a running or completed saga:

```tsx
import { useSagaStatus } from "@hex-di/saga-react";

function SagaMonitor({ sagaId }: { sagaId: string }) {
  const { status, completedSteps, totalSteps } = useSagaStatus(sagaId);

  return (
    <div>
      <p>Status: {status}</p>
      <progress value={completedSteps} max={totalSteps} />
    </div>
  );
}
```

#### Return Type

```typescript
interface SagaStatusResult {
  status: SagaStatusHookStatus; // "pending" | "running" | "completed" | "failed" | "compensating"
  completedSteps: number;
  totalSteps: number;
  currentStep: string | undefined;
}
```

### useSagaHistory

Access the execution history of a saga:

```tsx
import { useSagaHistory } from "@hex-di/saga-react";

function SagaLog({ sagaId }: { sagaId: string }) {
  const { events, isLoading } = useSagaHistory(sagaId, {
    includeCompensation: true,
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <ul>
      {events.map(event => (
        <li key={event.id}>
          {event.stepName}: {event.status} ({event.duration}ms)
        </li>
      ))}
    </ul>
  );
}
```

#### Options

```typescript
interface SagaHistoryOptions {
  includeCompensation?: boolean;
}
```

## Components

### SagaBoundary

An error boundary that catches saga execution failures and provides recovery options:

```tsx
import { SagaBoundary } from "@hex-di/saga-react";

function OrderFlow() {
  return (
    <SagaBoundary
      fallback={({ error, retry, reset }) => (
        <div>
          <p>Saga failed: {error.message}</p>
          <button onClick={retry}>Retry</button>
          <button onClick={reset}>Reset</button>
        </div>
      )}
    >
      <OrderForm />
    </SagaBoundary>
  );
}
```

#### Props

```typescript
interface SagaBoundaryProps {
  children: React.ReactNode;
  fallback: (props: SagaBoundaryFallbackProps) => React.ReactNode;
}

interface SagaBoundaryFallbackProps {
  error: Error;
  retry: () => void;
  reset: () => void;
}
```

## Exported Types

The package re-exports key types from `@hex-di/saga` for convenience:

- `SagaPort`, `SagaManagementPort` — Port interfaces
- `SagaExecutor`, `SagaManagementExecutor` — Executor types
- `SagaSuccess`, `SagaError`, `SagaStatus` — Result types
- `InferSagaPortInput`, `InferSagaPortOutput`, `InferSagaPortError` — Type inference helpers
- `HexDiContainerProvider` — Re-exported from `@hex-di/react`
