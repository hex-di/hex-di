# 11 - React Integration

_Previous: [10 - Integration](./10-integration.md)_ | _Next: [12 - Testing](./12-testing.md)_

---

## 16. React Integration

The `@hex-di/saga-react` package provides React hooks and components for executing, monitoring, and recovering sagas within React applications. All hooks resolve the saga runtime from the nearest HexDI container provider, following the same patterns established by `@hex-di/react` and `@hex-di/flow-react`.

### 16.1 useSaga Hook

The primary hook for executing a saga from a React component. It accepts a `SagaPort` and returns a stateful handle for execution, cancellation, and resumption.

Internally, `useSaga` resolves both the **domain port** (`SagaPort`, for `execute`) and the **management port** (`SagaManagementPort`, for `resume`, `cancel`, and status queries). The hook presents a unified interface so that component code does not need to think about the port split.

```typescript
function useSaga<P extends SagaPort<string, unknown, unknown, unknown>>(port: P): UseSagaResult<P>;

interface UseSagaResult<P extends SagaPort<string, unknown, unknown, unknown>> {
  /** Current saga execution status */
  status: "idle" | "running" | "compensating" | "success" | "error";
  /** Trigger saga execution with the port's input type (from SagaPort / SagaExecutor) */
  execute: (
    input: InferSagaPortInput<P>
  ) => Promise<Result<SagaSuccess<InferSagaPortOutput<P>>, SagaError<InferSagaPortError<P>>>>;
  /** Resume a previously persisted execution by ID (from SagaManagementPort / SagaManagementExecutor) */
  resume: (
    executionId: string
  ) => Promise<Result<SagaSuccess<InferSagaPortOutput<P>>, SagaError<InferSagaPortError<P>>>>;
  /** Cancel the currently running execution and trigger compensation (from SagaManagementPort / SagaManagementExecutor) */
  cancel: () => Promise<void>;
  /** The saga output on success, undefined otherwise */
  data: InferSagaPortOutput<P> | undefined;
  /** The saga error on failure, null otherwise */
  error: SagaError<InferSagaPortError<P>> | null;
  /** Whether compensation completed successfully after a failure (derived from error._tag) */
  compensated: boolean;
  /** Name of the step currently being executed or compensated */
  currentStep: string | undefined;
  /** Execution ID of the current or most recent execution */
  executionId: string | undefined;
  /** Reset the hook to idle state, clearing data, error, and status */
  reset: () => void;
}
```

The `compensated` field is derived from `error._tag`:

- When `error` is non-null and `error._tag === "StepFailed"`, `compensated` is `true` (compensation succeeded fully)
- When `error` is non-null and `error._tag === "CompensationFailed"`, `compensated` is `false` (compensation was partial or failed)
- For other error tags (`Timeout`, `Cancelled`, etc.), `compensated` is derived from whether `error.compensatedSteps.length > 0`

State transitions:

```
idle ──execute()──> running ──success──> success
                         │
                         └──failure──> compensating ──done──> error
                                                         │
idle <──reset()── success | error <──────────────────────┘
```

- Calling `execute` while status is `running` throws -- the caller must `cancel` or wait for completion first
- Calling `reset` while status is `running` or `compensating` throws -- cancel first
- The `compensated` field is only meaningful when status is `error`

#### Basic Usage

```tsx
function CheckoutButton({ orderId, items }: CheckoutProps) {
  const { status, execute, data, error, compensated } = useSaga(OrderSagaPort);

  const handleCheckout = async () => {
    const result = await execute({ orderId, items });

    result.match(
      success => {
        console.log("Order confirmed:", success.output.trackingNumber);
      },
      err => {
        console.error(`Order failed at step "${err.stepName}":`, err._tag);
      }
    );
  };

  if (status === "running" || status === "compensating") {
    return <Spinner label={status === "compensating" ? "Rolling back..." : "Processing..."} />;
  }

  if (status === "error") {
    return (
      <div>
        <p>
          Order failed at step "{error?.stepName}": {error?._tag}
        </p>
        {compensated && <p>All changes have been rolled back.</p>}
        {!compensated && <p>Partial failure -- please contact support.</p>}
      </div>
    );
  }

  if (status === "success") {
    return <p>Order confirmed. Tracking: {data?.trackingNumber}</p>;
  }

  return <button onClick={handleCheckout}>Place Order</button>;
}
```

#### With Progress Tracking

```tsx
function OrderProgress({ orderId, items }: OrderProgressProps) {
  const { status, execute, currentStep, error, compensated } = useSaga(OrderSagaPort);

  const steps = ["ValidateOrder", "ReserveStock", "ChargePayment", "ShipOrder", "NotifyUser"];

  useEffect(() => {
    const run = async () => {
      const result = await execute({ orderId, items });

      result.match(
        success => {
          console.log("Order placed:", success.output.trackingNumber);
        },
        err => {
          if (err._tag === "StepFailed") {
            console.log(`Saga rolled back cleanly at step "${err.stepName}"`);
          } else if (err._tag === "CompensationFailed") {
            console.error(`CRITICAL: Compensation failed at step "${err.stepName}"`);
          }
        }
      );
    };

    run();
  }, [orderId, items, execute]);

  return (
    <div>
      <Stepper steps={steps} activeStep={currentStep} status={status} />

      {status === "compensating" && (
        <Alert severity="warning">Step failed -- rolling back completed steps...</Alert>
      )}

      {status === "error" && (
        <Alert severity="error">
          Order failed at step "{error?.stepName}" ({error?._tag})
          {compensated && <span> (all changes rolled back)</span>}
          {!compensated && <span> -- manual intervention required</span>}
        </Alert>
      )}
    </div>
  );
}
```

### 16.2 useSagaStatus Hook

A read-only hook for monitoring the status of a specific saga execution by ID. Useful for dashboards, admin panels, or components that need to observe an execution started elsewhere. Internally resolves the `SagaManagementPort` to call `getStatus`.

```typescript
function useSagaStatus(executionId: string): SagaStatusResult;

interface SagaStatusResult {
  /** Current execution status */
  status: "pending" | "running" | "compensating" | "completed" | "failed" | "not-found";
  /** Name of the step currently being executed */
  currentStep: string | undefined;
  /** Names of steps that have completed successfully */
  completedSteps: readonly string[];
  /** Whether compensation ran and succeeded (only meaningful when status is "failed") */
  compensated: boolean;
  /** Error details if the execution failed */
  error: SagaError<unknown> | null;
  /** Timestamp of the last status change */
  updatedAt: Date | undefined;
  /** Whether the hook is loading initial status */
  loading: boolean;
}
```

#### Usage

```tsx
function ExecutionMonitor({ executionId }: { executionId: string }) {
  const { status, currentStep, completedSteps, error, loading } = useSagaStatus(executionId);

  if (loading) {
    return <Spinner />;
  }

  if (status === "not-found") {
    return <p>Execution not found.</p>;
  }

  return (
    <div>
      <Badge status={status} />
      <p>Current step: {currentStep ?? "N/A"}</p>
      <ul>
        {completedSteps.map(step => (
          <li key={step}>{step}</li>
        ))}
      </ul>
      {status === "failed" && error && (
        <div>
          <p>
            Error at step "{error.stepName}": {error._tag}
          </p>
          {error._tag === "CompensationFailed" && (
            <p>Failed compensation steps: {error.failedCompensationSteps.join(", ")}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

### 16.3 useSagaHistory Hook

Lists past saga executions with optional filtering. Internally resolves the `SagaManagementPort` to call `listExecutions`. Requires a persistence adapter to be registered in the container.

```typescript
function useSagaHistory(options?: SagaHistoryOptions): SagaHistoryResult;

interface SagaHistoryOptions {
  /** Filter by saga name */
  sagaName?: string;
  /** Filter by execution status */
  status?: "completed" | "failed" | "running";
  /** Maximum number of entries to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

interface SagaHistoryResult {
  /** List of execution summaries */
  entries: readonly SagaExecutionSummary[];
  /** Whether data is currently loading */
  loading: boolean;
  /** Error from fetching history */
  error: Error | null;
  /** Re-fetch the history list */
  refresh: () => void;
  /** Total number of matching entries (for pagination) */
  total: number;
}

interface SagaExecutionSummary {
  executionId: string;
  sagaName: string;
  status: "completed" | "failed" | "running" | "compensating";
  startedAt: Date;
  completedAt: Date | undefined;
  stepCount: number;
  completedStepCount: number;
  compensated: boolean;
}
```

#### Usage

```tsx
function SagaHistoryPanel() {
  const { entries, loading, refresh, total } = useSagaHistory({
    sagaName: "OrderSaga",
    limit: 20,
  });

  return (
    <div>
      <h2>Order Saga History ({total} total)</h2>
      <button onClick={refresh}>Refresh</button>

      {loading && <Spinner />}

      <table>
        <thead>
          <tr>
            <th>Execution ID</th>
            <th>Status</th>
            <th>Started</th>
            <th>Steps</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr key={entry.executionId}>
              <td>{entry.executionId}</td>
              <td>
                <Badge status={entry.status} />
              </td>
              <td>{entry.startedAt.toLocaleString()}</td>
              <td>
                {entry.completedStepCount}/{entry.stepCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 16.4 SagaBoundary Component

An error boundary specialized for saga failures. Catches unhandled saga errors thrown during rendering and provides retry and reset capabilities.

```typescript
interface SagaBoundaryProps {
  /** Content to render when no error has occurred */
  children: ReactNode;
  /** Custom fallback UI receiving error details and recovery actions */
  fallback: (props: SagaBoundaryFallbackProps) => ReactNode;
  /** Called when the boundary catches a saga error */
  onError?: (error: SagaError<unknown>, executionId: string | undefined) => void;
}

interface SagaBoundaryFallbackProps {
  /** The saga error that was caught */
  error: SagaError<unknown>;
  /** Execution ID of the failed saga, if available */
  executionId: string | undefined;
  /** Whether compensation succeeded (derived from error._tag !== "CompensationFailed") */
  compensated: boolean;
  /** Reset the boundary and re-render children */
  reset: () => void;
  /** Retry the failed saga execution */
  retry: () => void;
}
```

#### Usage

```tsx
function OrderPage() {
  return (
    <SagaBoundary
      fallback={({ error, compensated, reset, retry }) => (
        <div>
          <h2>Order Failed</h2>
          <p>
            Failed at step "{error.stepName}": {error._tag}
          </p>
          {compensated ? (
            <div>
              <p>All changes have been rolled back safely.</p>
              <button onClick={retry}>Try Again</button>
            </div>
          ) : (
            <div>
              <p>Some operations could not be reversed. Please contact support.</p>
              {error._tag === "CompensationFailed" && (
                <p>Failed compensations: {error.failedCompensationSteps.join(", ")}</p>
              )}
              <button onClick={reset}>Dismiss</button>
            </div>
          )}
        </div>
      )}
      onError={(error, executionId) => {
        analytics.track("saga_failure", {
          sagaErrorTag: error._tag,
          stepName: error.stepName,
          executionId,
        });
      }}
    >
      <CheckoutFlow />
    </SagaBoundary>
  );
}
```

### 16.5 Hook Dependency on Container

All saga hooks resolve the `SagaRuntime` from the nearest `ContainerProvider` in the React tree. If no container is found, hooks throw a descriptive error.

```tsx
import { ContainerProvider } from "@hex-di/react";

function App() {
  return (
    <ContainerProvider container={appContainer}>
      <SagaBoundary fallback={SagaErrorFallback}>
        <OrderPage />
      </SagaBoundary>
    </ContainerProvider>
  );
}
```

- The container must have a `SagaRuntime` registered (either directly or via a saga plugin)
- Persistence hooks (`useSagaHistory`, `useSagaStatus`) additionally require a persistence adapter in the container
- Missing dependencies produce clear error messages indicating which registration is absent

---

_Next: [12 - Testing](./12-testing.md)_
