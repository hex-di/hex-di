---
sidebar_position: 2
title: Persistence & Resume
---

# Persistence & Resume

Saga persistence enables recovery from crashes, long-running workflows, and distributed execution through write-ahead checkpointing.

## The Persistence Model

The saga runtime uses write-ahead logging to persist execution state before each step:

```typescript
// Before executing a step:
1. Write checkpoint with current state
2. Execute the step
3. Update checkpoint with result

// On crash recovery:
1. Load checkpoint from persister
2. Validate against saga definition
3. Resume from last completed step
```

## SagaPersister Interface

Implement the `SagaPersister` interface for custom persistence:

```typescript
interface SagaPersister {
  // Save execution state
  save(state: SagaExecutionState): Promise<void>;

  // Load execution state
  load(executionId: string): Promise<SagaExecutionState | null>;

  // Delete execution state
  delete(executionId: string): Promise<void>;

  // List executions with filters
  list(filters?: PersisterFilters): Promise<SagaExecutionSummary[]>;

  // Update existing state
  update(executionId: string, updates: Partial<SagaExecutionState>): Promise<void>;
}
```

## Execution State Structure

The persisted state contains all information needed to resume:

```typescript
interface SagaExecutionState {
  executionId: string;
  sagaName: string;
  sagaVersion?: string;
  input: unknown;
  currentStep: number;
  completedSteps: CompletedStepState[];
  accumulatedResults: Record<string, unknown>;
  accumulatedErrors: Record<string, unknown>;
  status: SagaStatusType;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: SerializedSagaError;
  compensation?: CompensationState;
  metadata?: Record<string, unknown>;
}

interface CompletedStepState {
  stepName: string;
  stepIndex: number;
  output: unknown;
  completedAt: Date;
  attemptCount: number;
}

interface CompensationState {
  startedAt: Date;
  completedAt?: Date;
  triggeredBy: string;
  compensatedSteps: string[];
  failedSteps: string[];
  errors: Record<string, unknown>;
}
```

## Built-in Persisters

### In-Memory Persister

For development and testing:

```typescript
import { createInMemoryPersister } from "@hex-di/saga";

const persister = createInMemoryPersister({
  maxEntries: 1000, // Maximum stored executions
  ttl: 3600000, // Time-to-live in ms (1 hour)
  cleanupInterval: 60000, // Cleanup interval (1 minute)
});
```

### Custom Database Persister

Example PostgreSQL implementation:

```typescript
import { SagaPersister, SagaExecutionState } from "@hex-di/saga";

class PostgresPersister implements SagaPersister {
  constructor(private db: Database) {}

  async save(state: SagaExecutionState): Promise<void> {
    await this.db.query(
      `INSERT INTO saga_executions
       (execution_id, saga_name, saga_version, input, current_step,
        completed_steps, accumulated_results, accumulated_errors,
        status, started_at, updated_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (execution_id)
       DO UPDATE SET
         current_step = $5,
         completed_steps = $6,
         accumulated_results = $7,
         accumulated_errors = $8,
         status = $9,
         updated_at = $11,
         metadata = $12`,
      [
        state.executionId,
        state.sagaName,
        state.sagaVersion,
        JSON.stringify(state.input),
        state.currentStep,
        JSON.stringify(state.completedSteps),
        JSON.stringify(state.accumulatedResults),
        JSON.stringify(state.accumulatedErrors),
        state.status,
        state.startedAt,
        new Date(),
        JSON.stringify(state.metadata),
      ]
    );
  }

  async load(executionId: string): Promise<SagaExecutionState | null> {
    const result = await this.db.query(`SELECT * FROM saga_executions WHERE execution_id = $1`, [
      executionId,
    ]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      executionId: row.execution_id,
      sagaName: row.saga_name,
      sagaVersion: row.saga_version,
      input: JSON.parse(row.input),
      currentStep: row.current_step,
      completedSteps: JSON.parse(row.completed_steps),
      accumulatedResults: JSON.parse(row.accumulated_results),
      accumulatedErrors: JSON.parse(row.accumulated_errors),
      status: row.status,
      startedAt: row.started_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      error: row.error ? JSON.parse(row.error) : undefined,
      compensation: row.compensation ? JSON.parse(row.compensation) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  async delete(executionId: string): Promise<void> {
    await this.db.query(`DELETE FROM saga_executions WHERE execution_id = $1`, [executionId]);
  }

  async list(filters?: PersisterFilters): Promise<SagaExecutionSummary[]> {
    let query = `SELECT execution_id, saga_name, status, started_at, completed_at
                 FROM saga_executions WHERE 1=1`;
    const params: any[] = [];

    if (filters?.sagaName) {
      params.push(filters.sagaName);
      query += ` AND saga_name = $${params.length}`;
    }

    if (filters?.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }

    if (filters?.startedAfter) {
      params.push(filters.startedAfter);
      query += ` AND started_at >= $${params.length}`;
    }

    if (filters?.startedBefore) {
      params.push(filters.startedBefore);
      query += ` AND started_at <= $${params.length}`;
    }

    query += ` ORDER BY started_at DESC`;

    if (filters?.limit) {
      params.push(filters.limit);
      query += ` LIMIT $${params.length}`;
    }

    const result = await this.db.query(query, params);

    return result.rows.map(row => ({
      executionId: row.execution_id,
      sagaName: row.saga_name,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    }));
  }

  async update(executionId: string, updates: Partial<SagaExecutionState>): Promise<void> {
    const setClause: string[] = [];
    const params: any[] = [executionId];

    if (updates.currentStep !== undefined) {
      params.push(updates.currentStep);
      setClause.push(`current_step = $${params.length}`);
    }

    if (updates.status) {
      params.push(updates.status);
      setClause.push(`status = $${params.length}`);
    }

    if (updates.completedSteps) {
      params.push(JSON.stringify(updates.completedSteps));
      setClause.push(`completed_steps = $${params.length}`);
    }

    if (updates.accumulatedResults) {
      params.push(JSON.stringify(updates.accumulatedResults));
      setClause.push(`accumulated_results = $${params.length}`);
    }

    setClause.push(`updated_at = NOW()`);

    await this.db.query(
      `UPDATE saga_executions SET ${setClause.join(", ")} WHERE execution_id = $1`,
      params
    );
  }
}
```

## Checkpoint Policies

Control how checkpoint failures are handled:

```typescript
const saga = defineSaga("MyS aga")
  .options({
    persistent: true,
    checkpointPolicy: "abort", // "swallow" | "abort" | "warn"
  })
  .build();
```

### swallow (default)

Log and continue execution despite checkpoint failures:

```typescript
checkpointPolicy: "swallow";
// Checkpoint failure is logged but execution continues
// Risk: Cannot resume if crash occurs
```

### abort

Stop execution immediately on checkpoint failure:

```typescript
checkpointPolicy: "abort";
// Checkpoint failure stops saga execution
// Safe: Ensures all steps are recoverable
```

### warn

Log warning and emit event but continue:

```typescript
checkpointPolicy: "warn";
// Emits CheckpointWarningEvent for monitoring
// Middle ground: Continue but alert operations
```

## Resume After Crash

Resume interrupted executions using the runner:

```typescript
import { createSagaRunner } from "@hex-di/saga";

const runner = createSagaRunner(portResolver, {
  persister: postgresPersister,
});

// Resume a specific execution
async function resumeExecution(executionId: string) {
  const result = await runner.resume(executionId);

  if (result.isOk()) {
    console.log("Resumed successfully:", result.value);
  } else {
    console.error("Resume failed:", result.error);
  }
}

// Resume all interrupted executions on startup
async function resumeAllPending() {
  const pending = await persister.list({
    status: "running",
    startedBefore: new Date(Date.now() - 3600000), // 1 hour ago
  });

  for (const execution of pending) {
    console.log(`Resuming ${execution.executionId}`);
    await runner.resume(execution.executionId);
  }
}
```

## Version Compatibility

Saga versions are checked when resuming:

```typescript
const sagaV1 = defineSaga("OrderProcessing").version("1.0.0").step(StepA).step(StepB).build();

const sagaV2 = defineSaga("OrderProcessing")
  .version("2.0.0")
  .step(StepA)
  .step(StepB)
  .step(StepC) // New step
  .build();

// When resuming:
// - If versions match: Resume normally
// - If versions differ: Log warning but attempt resume
// - If step doesn't exist: Fail with error
```

## Resume State Validation

The runtime validates state before resuming:

```typescript
// Validation checks:
1. Execution exists in persister
2. Saga name matches
3. Current step index is valid
4. All referenced steps exist in definition
5. Accumulated results match expected types

// On validation failure:
{
  type: "RESUME_VALIDATION_ERROR",
  message: "Invalid execution state",
  details: {
    executionId,
    sagaName,
    currentStep,
    reason: "Step 'OldStep' not found in saga definition"
  }
}
```

## Long-Running Sagas

For sagas that run for hours or days:

```typescript
const LongRunningSaga = defineSaga("DataMigration")
  .input<MigrationInput>()
  .step(PrepareStep)
  .step(ExtractStep, { timeout: 3600000 }) // 1 hour
  .step(TransformStep, { timeout: 7200000 }) // 2 hours
  .step(LoadStep, { timeout: 3600000 }) // 1 hour
  .step(ValidateStep)
  .options({
    persistent: true,
    checkpointPolicy: "abort",
    timeout: 86400000, // 24 hours total
    metadata: {
      type: "batch",
      priority: "low",
    },
  })
  .build();

// Execute with monitoring
const executionId = `migration-${Date.now()}`;

runner.subscribe(executionId, event => {
  if (event.type === "step:completed") {
    // Update progress in UI or monitoring system
    progressTracker.update(executionId, {
      currentStep: event.stepName,
      progress: (event.stepIndex / totalSteps) * 100,
    });
  }
});

// Allow graceful interruption
process.on("SIGTERM", async () => {
  console.log("Shutting down, saga will resume on restart");
  // State is already persisted, just exit
  process.exit(0);
});
```

## Cleanup and Retention

Implement cleanup for completed executions:

```typescript
class RetentionManager {
  constructor(
    private persister: SagaPersister,
    private config: {
      retentionDays: number;
      cleanupInterval: number;
    }
  ) {}

  async cleanup(): Promise<void> {
    const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);

    const oldExecutions = await this.persister.list({
      status: "completed",
      startedBefore: cutoffDate,
    });

    for (const execution of oldExecutions) {
      await this.persister.delete(execution.executionId);
      console.log(`Deleted old execution: ${execution.executionId}`);
    }
  }

  start(): void {
    setInterval(() => this.cleanup(), this.config.cleanupInterval);
  }
}

// Use retention manager
const retention = new RetentionManager(persister, {
  retentionDays: 30,
  cleanupInterval: 86400000, // Daily cleanup
});

retention.start();
```

## Best Practices

### Choose Appropriate Checkpoint Policy

Match policy to reliability requirements:

```typescript
// Critical financial transactions
const PaymentSaga = defineSaga("Payment")
  .options({
    persistent: true,
    checkpointPolicy: "abort", // Never lose state
  })
  .build();

// Best-effort background jobs
const AnalyticsSaga = defineSaga("Analytics")
  .options({
    persistent: true,
    checkpointPolicy: "swallow", // Performance over reliability
  })
  .build();

// Monitored operations
const OrderSaga = defineSaga("Order")
  .options({
    persistent: true,
    checkpointPolicy: "warn", // Alert on issues
  })
  .build();
```

### Implement Idempotent Steps

Make steps safe to retry after resume:

```typescript
const CreateResourceStep = defineStep({
  name: "CreateResource",
  port: ResourcePort,
  execute: async (input, port) => {
    // Check if already exists (idempotent)
    const existing = await port.findByKey(input.key);
    if (existing) {
      return ok({ resourceId: existing.id, wasExisting: true });
    }

    // Create new resource
    const created = await port.create(input);
    return ok({ resourceId: created.id, wasExisting: false });
  },
});
```

### Monitor Persistence Health

Track persistence metrics:

```typescript
const runner = createSagaRunner(portResolver, {
  persister: new MonitoredPersister(basePersister, {
    onSave: (state, duration) => {
      metrics.histogram("saga.checkpoint.save.duration", duration);
    },
    onLoad: (executionId, duration) => {
      metrics.histogram("saga.checkpoint.load.duration", duration);
    },
    onError: (operation, error) => {
      metrics.increment("saga.checkpoint.error", {
        operation,
        error: error.code,
      });
    },
  }),
});
```

### Handle Resume Failures

Implement fallback strategies:

```typescript
async function safeResume(executionId: string) {
  const maxRetries = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await runner.resume(executionId);

      if (result.isOk()) {
        return result.value;
      }

      lastError = result.error;

      if (result.error.type === "SAGA_NOT_FOUND") {
        // Saga definition removed/renamed
        await handleOrphanedExecution(executionId);
        break;
      }

      if (result.error.type === "RESUME_VALIDATION_ERROR") {
        // State corruption or version mismatch
        await quarantineExecution(executionId);
        break;
      }
    } catch (error) {
      lastError = error;
    }

    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
  }

  // All retries failed
  await alertOps({
    message: "Failed to resume saga",
    executionId,
    error: lastError,
  });
}
```

## Next Steps

- [Learn about DI Integration](di-integration) - Container setup with persistence
- [Explore the API](../api/api-reference) - Complete persistence API reference
- [Read about Testing](../testing) - Test persistence and resume scenarios
