# 08 - Persistence

[Previous: 07 - Runtime](./07-runtime.md) | [Next: 09 - Error Handling](./09-error-handling.md)

---

## 12. Persistence & Resumption

Sagas that span long-running operations (external API calls, human approvals, multi-service workflows) need durable state. The persistence layer captures execution state after each step so that sagas can survive process restarts, deployments, and crashes. The design draws inspiration from Temporal's durable execution model and Azure Durable Functions' checkpoint-based replay -- but stays true to HexDI's ports-and-adapters philosophy by defining persistence as a port with pluggable adapters.

### 12.1 SagaPersister Interface

The `SagaPersister` interface defines the contract for all persistence adapters. All methods return `ResultAsync` with a typed `PersistenceError` union, enabling callers to handle storage failures, missing executions, and serialization issues through the standard Result pipeline instead of try/catch:

```typescript
type PersistenceError =
  | { readonly _tag: "NotFound"; readonly executionId: string }
  | { readonly _tag: "StorageFailure"; readonly operation: string; readonly cause: unknown }
  | { readonly _tag: "SerializationFailure"; readonly cause: unknown };

interface SagaPersister {
  /** Persist a complete execution state snapshot */
  save(state: SagaExecutionState): ResultAsync<void, PersistenceError>;

  /** Load execution state by ID, returns null if not found */
  load(executionId: string): ResultAsync<SagaExecutionState | null, PersistenceError>;

  /** Delete execution state (after successful completion or explicit cleanup) */
  delete(executionId: string): ResultAsync<void, PersistenceError>;

  /** List execution states matching optional filters */
  list(filters?: PersisterFilters): ResultAsync<SagaExecutionState[], PersistenceError>;

  /** Partial update of execution state (for efficient checkpointing) */
  update(
    executionId: string,
    updates: Partial<SagaExecutionState>
  ): ResultAsync<void, PersistenceError>;
}

interface PersisterFilters {
  /** Filter by saga name */
  sagaName?: string;

  /** Filter by execution status */
  status?: SagaStatusType;

  /** Only executions started after this date */
  startedAfter?: Date;

  /** Only executions started before this date */
  startedBefore?: Date;

  /** Maximum number of results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;
}
```

The `save` method writes a full snapshot, while `update` enables efficient incremental checkpoints -- writing only the fields that changed (e.g., appending to `completedSteps` and advancing `currentStep`) without rewriting the entire state.

### 12.2 SagaExecutionState

The `SagaExecutionState` captures everything needed to resume a saga from its last checkpoint:

```typescript
/** Matches the canonical SagaStatusType from the runtime (see 07-runtime.md §10.2) */
type SagaStatusType = "pending" | "running" | "compensating" | "completed" | "failed" | "cancelled";

interface SagaExecutionState {
  /** Unique execution identifier (UUID v4) */
  readonly executionId: string;

  /** Name of the saga definition being executed */
  readonly sagaName: string;

  /** Original input passed to the saga */
  readonly input: unknown;

  /** Index of the current step being executed (or next step to execute on resume) */
  currentStep: number;

  /** Results from all completed steps */
  completedSteps: readonly CompletedStepState[];

  /** Current execution status */
  status: SagaStatusType;

  /**
   * Error that caused failure, if any.
   * When non-null this is a `SerializedSagaError` -- a JSON-safe snapshot of the
   * original `SagaError` that retains its `_tag` discriminant so the error
   * variant can be reconstructed on resume (see §12.7).
   */
  error: SerializedSagaError | null;

  /** Compensation tracking state */
  compensation: CompensationState;

  /** Execution timestamps */
  timestamps: {
    readonly startedAt: string;
    updatedAt: string;
    completedAt: string | null;
  };

  /** Arbitrary metadata for tracing, correlation, and diagnostics */
  metadata: Record<string, unknown>;
}

interface CompletedStepState {
  /** Step name */
  readonly name: string;

  /** Step index in the saga */
  readonly index: number;

  /** Step output (JSON-serializable) */
  readonly output: unknown;

  /** Whether this step was skipped due to a condition */
  readonly skipped: boolean;

  /** ISO timestamp of completion */
  readonly completedAt: string;
}

interface CompensationState {
  /** Whether compensation is in progress */
  active: boolean;

  /** Steps that have been successfully compensated */
  compensatedSteps: readonly string[];

  /** Steps that failed to compensate */
  failedSteps: readonly string[];

  /** Index of the step that triggered compensation */
  triggeringStepIndex: number | null;
}

/**
 * JSON-safe representation of a saga error.
 *
 * Every `SerializedSagaError` carries a `_tag` discriminant that identifies
 * the error variant (e.g., `"StepExecutionError"`, `"CompensationError"`,
 * `"TimeoutError"`). Because the serialized form is a plain object with a
 * `_tag` field it round-trips through `JSON.stringify`/`JSON.parse` without
 * any loss -- unlike class instances whose prototype chain is discarded
 * during serialization.
 *
 * The `fields` record preserves any additional tagged-error properties
 * (e.g., `stepName`, `retryCount`, `originalErrorTag`) so they survive the
 * serialization boundary.
 */
interface SerializedSagaError {
  /** Discriminant tag identifying the error variant */
  readonly _tag: string;

  /** Error constructor name (e.g., "TypeError", "SagaStepError") */
  readonly name: string;

  /** Error message */
  readonly message: string;

  /** Stack trace, if available */
  readonly stack: string | null;

  /** Application-specific error code, if present */
  readonly code: string | null;

  /**
   * Additional tagged-error properties.
   * Captures domain-specific fields from the original error (e.g.,
   * `{ stepName: "reserveInventory", retryCount: 3 }`) so that
   * deserialization logic or compensation handlers can inspect them
   * without needing the original class definition.
   */
  readonly fields: Record<string, unknown>;
}
```

All timestamps are stored as ISO 8601 strings rather than `Date` objects to ensure JSON serializability without custom reviver logic.

### 12.3 Persister Port

Following HexDI's ports-and-adapters pattern, persistence is declared as a port:

```typescript
const SagaPersisterPort = createPort<"SagaPersister", SagaPersister>({
  name: "SagaPersister",
  description: "Persistence layer for saga execution state",
});
```

This port is consumed by the saga runtime internally. When a saga definition has `persistent: true` in its options, the runtime resolves `SagaPersisterPort` from the container and uses it for checkpointing. If the port is not registered and a persistent saga is executed, the runtime throws a clear error indicating the missing adapter.

### 12.4 Built-in Persisters

#### In-Memory Persister

Provided for testing and development. Not suitable for production use since state does not survive process restarts. All methods return `ResultAsync` with typed `PersistenceError`:

```typescript
import { okAsync, errAsync } from "@hex-di/result";

function createInMemoryPersister(): SagaPersister {
  const store = new Map<string, SagaExecutionState>();

  return {
    save(state) {
      return okAsync(store.set(state.executionId, structuredClone(state))).map(() => undefined);
    },

    load(executionId) {
      const state = store.get(executionId);
      return okAsync(state ? structuredClone(state) : null);
    },

    delete(executionId) {
      store.delete(executionId);
      return okAsync(undefined);
    },

    list(filters) {
      let results = [...store.values()];

      if (filters?.sagaName) {
        results = results.filter(s => s.sagaName === filters.sagaName);
      }
      if (filters?.status) {
        results = results.filter(s => s.status === filters.status);
      }
      if (filters?.startedAfter) {
        const after = filters.startedAfter;
        results = results.filter(s => new Date(s.timestamps.startedAt) > after);
      }
      if (filters?.startedBefore) {
        const before = filters.startedBefore;
        results = results.filter(s => new Date(s.timestamps.startedAt) < before);
      }
      if (filters?.offset) {
        results = results.slice(filters.offset);
      }
      if (filters?.limit) {
        results = results.slice(0, filters.limit);
      }

      return okAsync(results.map(s => structuredClone(s)));
    },

    update(executionId, updates) {
      const existing = store.get(executionId);
      if (!existing) {
        return errAsync({ _tag: "NotFound" as const, executionId });
      }
      store.set(executionId, { ...existing, ...updates });
      return okAsync(undefined);
    },
  };
}
```

Uses `structuredClone` on read/write to prevent external mutation of internal state, mirroring the isolation guarantees of a real database.

#### PostgreSQL Persister Example

A production-grade adapter using a database port to demonstrate the pattern. All methods return `ResultAsync`, wrapping database errors as `StorageFailure`:

```typescript
import { ResultAsync } from "@hex-di/result";

function createPostgresPersister(db: DatabasePort): SagaPersister {
  return {
    save(state) {
      return ResultAsync.fromPromise(
        db.query(
          `INSERT INTO saga_executions (execution_id, saga_name, state)
           VALUES ($1, $2, $3)
           ON CONFLICT (execution_id)
           DO UPDATE SET state = $3, updated_at = NOW()`,
          [state.executionId, state.sagaName, JSON.stringify(state)]
        ),
        cause => ({ _tag: "StorageFailure" as const, operation: "save", cause })
      ).map(() => undefined);
    },

    load(executionId) {
      return ResultAsync.fromPromise(
        db.query(`SELECT state FROM saga_executions WHERE execution_id = $1`, [executionId]),
        cause => ({ _tag: "StorageFailure" as const, operation: "load", cause })
      ).map(result => result.rows[0]?.state ?? null);
    },

    delete(executionId) {
      return ResultAsync.fromPromise(
        db.query(`DELETE FROM saga_executions WHERE execution_id = $1`, [executionId]),
        cause => ({ _tag: "StorageFailure" as const, operation: "delete", cause })
      ).map(() => undefined);
    },

    list(filters) {
      // Build dynamic WHERE clause from filters
      // ... (filter by saga_name, status, started_after, started_before)
      // Apply LIMIT/OFFSET for pagination
      // Wrap in ResultAsync.fromPromise with StorageFailure error mapping
    },

    update(executionId, updates) {
      return ResultAsync.fromPromise(
        db.query(
          `UPDATE saga_executions
           SET state = state || $2::jsonb, updated_at = NOW()
           WHERE execution_id = $1`,
          [executionId, JSON.stringify(updates)]
        ),
        cause => ({ _tag: "StorageFailure" as const, operation: "update", cause })
      ).map(() => undefined);
    },
  };
}
```

The PostgreSQL adapter stores the entire `SagaExecutionState` as a JSONB column, enabling both full-state replacement and efficient partial updates via JSONB merge. The `execution_id` column serves as the primary key, and `saga_name` is indexed for filtered queries.

### 12.5 Resumption

Sagas that were interrupted mid-execution (due to crashes, deployments, or timeouts) can be resumed from their last checkpoint.

#### Resuming a Specific Execution

```typescript
// Resume a known execution by ID
// result is Result<SagaSuccess<OrderOutput>, SagaError<OrderOutput>>, same as a fresh execution
const result = await orderSaga.resume("exec-123");
```

The runtime loads the persisted state, advances to the step indicated by `currentStep`, and continues execution. Steps in `completedSteps` are not re-executed -- their persisted outputs are placed into the accumulated results directly.

#### Resuming All Pending Sagas on Startup

A common pattern for services that process long-running sagas:

```typescript
async function resumePendingSagas(container: Container): Promise<void> {
  const persister = container.resolve(SagaPersisterPort);

  // Find all sagas that were running or compensating when the process stopped
  const pending = await persister.list({ status: "running" });
  const compensating = await persister.list({ status: "compensating" });

  for (const state of [...pending, ...compensating]) {
    // Look up the saga definition by name from a registry
    const sagaDef = sagaRegistry.get(state.sagaName);
    if (!sagaDef) {
      console.error(`Unknown saga: ${state.sagaName}, skipping`);
      continue;
    }

    // Resume each saga -- errors are captured in the Result, not thrown
    const result = await sagaDef.resume(state.executionId);

    result.match({
      ok: _success => {
        // Saga resumed and completed successfully
      },
      err: error => {
        // error._tag identifies the error variant (e.g., "StepExecutionError")
        console.error(`Saga ${state.executionId} failed on resume [${error._tag}]:`, error.message);
      },
    });
  }
}
```

This pattern should be wired into application startup. The saga registry (a simple `Map<string, SagaDefinition>`) is populated during container setup when saga definitions are registered.

### 12.6 Checkpointing Strategy

The runtime persists state at well-defined points during execution to minimize both data loss and persistence overhead:

1. **On saga start** -- Initial state is saved with status `"running"`, `currentStep: 0`, and empty `completedSteps`. This ensures the saga is tracked even if the process crashes before the first step completes.

2. **After each step completes** -- The completed step's output is appended to `completedSteps`, `currentStep` is advanced to the next index, and `timestamps.updatedAt` is refreshed. This is the primary checkpoint and uses `update` for efficiency.

3. **When compensation starts** -- Status changes to `"compensating"`, `compensation.active` is set to `true`, and `compensation.triggeringStepIndex` records which step failed. This checkpoint ensures compensation resumes correctly if interrupted.

4. **After each compensation step** -- The compensated step's name is appended to `compensation.compensatedSteps`. If a compensation step itself fails, its name is recorded in `compensation.failedSteps`.

5. **On saga completion or failure** -- Final state is saved with the terminal status (`"completed"`, `"failed"`, or `"cancelled"`) and `timestamps.completedAt` is set. For `"failed"` status, whether compensation succeeded is determined by inspecting `compensation.failedSteps` -- if empty, all compensations succeeded; if non-empty, some compensations failed and manual intervention may be needed.

The checkpointing approach is synchronous with execution: each checkpoint `await`s the persistence call before proceeding to the next step. This provides at-most-once step execution guarantees. If the process crashes between a step completing and the checkpoint being written, the step will be re-executed on resume. Step implementations should be idempotent to handle this edge case correctly.

### 12.7 State Serialization

All persisted state must be JSON-serializable. This constraint flows through the entire saga design:

**SagaExecutionState is JSON-safe by construction:**

- Timestamps are ISO 8601 strings, not `Date` objects
- Status is a string literal union
- All nested structures (`CompletedStepState`, `CompensationState`, `SerializedSagaError`) use only JSON-compatible types

**Step outputs must be JSON-serializable:**

- When `persistent: true`, step outputs are passed through `JSON.stringify`/`JSON.parse` round-trip validation at checkpoint time
- Non-serializable outputs (functions, class instances with methods, symbols, circular references) cause a clear runtime error at checkpoint time rather than a silent data loss on resume
- This constraint applies only to persistent sagas; non-persistent sagas can use arbitrary step output types

**SerializedSagaError preserves diagnostic information via `_tag` discriminants:**

- `_tag` -- the discriminant that identifies the error variant (e.g., `"StepExecutionError"`, `"CompensationError"`, `"TimeoutError"`). This is the primary field used to reconstruct the correct tagged union member on deserialization
- `name` -- the error class name, retained for logging and diagnostics
- `message` -- the human-readable error description
- `stack` -- the full stack trace (if available), stored as a string for debugging
- `code` -- an optional application-specific error code (e.g., `"INSUFFICIENT_FUNDS"`, `"TIMEOUT"`) that compensation logic or error handlers can switch on
- `fields` -- a `Record<string, unknown>` capturing additional tagged-error properties (e.g., `stepName`, `retryCount`, `originalErrorTag`) that the original error carried

Because `SerializedSagaError` is a plain object with a `_tag` string field, it serializes to JSON naturally -- no custom `toJSON` methods, no prototype chain to lose, no class identity to preserve. This is a deliberate advantage over serializing class-based `Error` instances, which lose their prototype chain (and therefore their `instanceof` identity and any methods) when round-tripped through `JSON.stringify`/`JSON.parse`.

**Deserialization reconstructs tagged unions from `_tag`:**

When resuming a saga, the runtime deserializes the `error` field from JSON and reconstructs the appropriate `SagaError` variant by switching on `_tag`:

```typescript
function deserializeSagaError(serialized: SerializedSagaError): SagaError<unknown> {
  // The _tag field drives reconstruction of the correct tagged union member
  switch (serialized._tag) {
    case "StepExecutionError":
      return StepExecutionError({
        message: serialized.message,
        stepName: serialized.fields["stepName"],
        ...serialized.fields,
      });
    case "CompensationError":
      return CompensationError({
        message: serialized.message,
        ...serialized.fields,
      });
    case "TimeoutError":
      return TimeoutError({
        message: serialized.message,
        ...serialized.fields,
      });
    default:
      return UnknownSagaError({
        message: serialized.message,
        originalTag: serialized._tag,
        ...serialized.fields,
      });
  }
}
```

The `fields` record ensures that no domain-specific information is lost across the serialization boundary -- every property from the original tagged error is captured at serialization time and made available during reconstruction. The `default` branch handles forward-compatibility: if a newer version of the saga definition introduces a new error variant, older code can still deserialize it as an `UnknownSagaError` without crashing.

---

[Previous: 07 - Runtime](./07-runtime.md) | [Next: 09 - Error Handling](./09-error-handling.md)
