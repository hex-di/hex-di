---
sidebar_position: 3
title: Compensation
---

# Compensation

Compensation provides automatic rollback of completed steps when a saga fails, ensuring system consistency through configurable strategies and dead-letter handling.

## Compensation Strategies

The library provides three compensation strategies, each suited to different consistency requirements:

### Sequential (Default)

Compensates steps in reverse order, stopping at the first failure:

```typescript
const saga = defineSaga("OrderProcessing")
  .input<OrderInput>()
  .step(ValidateOrderStep) // Step 1
  .step(ReserveInventoryStep) // Step 2
  .step(ChargePaymentStep) // Step 3 - FAILS
  .step(CreateShipmentStep) // Step 4 - Not executed
  .options({
    compensationStrategy: "sequential",
  })
  .build();

// On failure at Step 3:
// 1. Compensate Step 2 (ReserveInventoryStep)
// 2. If successful, compensate Step 1 (ValidateOrderStep)
// 3. If any compensation fails, stop and report
```

Use sequential when:

- Compensation order matters
- Earlier compensations depend on later ones succeeding
- You want to stop immediately on compensation failure

### Parallel

Compensates all steps concurrently, collecting all results:

```typescript
const saga = defineSaga("BulkProcessing")
  .input<BulkInput>()
  .step(CreateResourceAStep)
  .step(CreateResourceBStep)
  .step(CreateResourceCStep) // FAILS
  .options({
    compensationStrategy: "parallel",
  })
  .build();

// On failure:
// 1. Start compensating ResourceA and ResourceB simultaneously
// 2. Wait for all compensations to complete
// 3. Collect and report all successes and failures
```

Use parallel when:

- Compensations are independent
- Speed is critical
- You want visibility into all compensation results

### Best-Effort

Compensates in reverse order but continues despite failures:

```typescript
const saga = defineSaga("ResilientProcessing")
  .input<Input>()
  .step(StepA)
  .step(StepB)
  .step(StepC) // FAILS
  .options({
    compensationStrategy: "best-effort",
  })
  .build();

// On failure:
// 1. Try to compensate StepB
// 2. Even if StepB compensation fails, try StepA
// 3. Report all successes and failures
// 4. Failed compensations go to dead-letter queue
```

Use best-effort when:

- Partial compensation is better than none
- You have manual recovery processes
- System resilience is prioritized

## Compensation Context

Each compensation function receives rich context about the failure:

```typescript
const MyStep = defineStep({
  name: "MyStep",
  port: MyPort,
  execute: async (input, port) => {
    const result = await port.doWork(input);
    return ok({ resourceId: result.id });
  },
  compensate: async (context: CompensationContext) => {
    // Available context:
    const {
      input, // Original step input
      results, // Accumulated results up to this step
      originalError, // Error that triggered compensation
      port, // Port service instance
      executionId, // Unique execution identifier
      stepName, // Name of this step
    } = context;

    // Access this step's output if it succeeded
    const stepResult = results[stepName];
    if (stepResult?.resourceId) {
      await port.cleanup(stepResult.resourceId);
    }

    return ok(undefined);
  },
});
```

## Dead-Letter Queue

Failed compensations are tracked in a dead-letter queue for manual intervention:

```typescript
import { DeadLetterQueue } from "@hex-di/saga";

const deadLetterQueue = new DeadLetterQueue();

// Add failed compensation
await deadLetterQueue.add({
  executionId: "exec-123",
  sagaName: "OrderProcessing",
  stepName: "ChargePayment",
  originalError: paymentError,
  compensationError: refundError,
  input: stepInput,
  failedAt: new Date(),
  retryCount: 0,
});

// List entries
const entries = await deadLetterQueue.list({
  sagaName: "OrderProcessing",
  maxAge: 86400000, // 24 hours
});

// Retry failed compensation
const retryResult = await deadLetterQueue.retry(entryId, async () => {
  // Retry logic
  return await paymentService.refund(transactionId);
});

// Acknowledge handled entry
await deadLetterQueue.acknowledge(entryId);

// Get queue size
const size = deadLetterQueue.size();
```

### Dead-Letter Entry Structure

```typescript
interface DeadLetterEntry {
  id: string;
  executionId: string;
  sagaName: string;
  stepName: string;
  originalError: unknown;
  compensationError: unknown;
  input: unknown;
  failedAt: Date;
  retryCount: number;
  acknowledgedAt?: Date;
  metadata?: Record<string, unknown>;
}
```

## Compensation Timeouts

Set per-step compensation timeouts to prevent hanging:

```typescript
const PaymentStep = defineStep({
  name: "ProcessPayment",
  port: PaymentPort,
  execute: async (input, port) => {
    return await port.charge(input);
  },
  compensate: async context => {
    return await context.port.refund(context.results.ProcessPayment);
  },
  compensationTimeout: 10000, // 10 second timeout for compensation
});
```

If compensation exceeds the timeout, it's marked as failed and added to the dead-letter queue.

## Compensation Events

The compensation process emits detailed events for monitoring:

```typescript
runner.subscribe(executionId, event => {
  switch (event.type) {
    case "compensation:started":
      console.log("Compensation started", event.reason);
      break;

    case "compensation:step":
      console.log(`Compensating ${event.stepName}`, event.status);
      break;

    case "compensation:completed":
      console.log("Compensation completed", {
        succeeded: event.result.allSucceeded,
        compensated: event.result.compensatedSteps,
        failed: event.result.failedSteps,
      });
      break;

    case "compensation:failed":
      console.error("Compensation failed", event.errors);
      break;
  }
});
```

## Compensation Result

The compensation process returns a detailed result:

```typescript
interface CompensationResult {
  compensatedSteps: string[]; // Successfully compensated
  failedSteps: string[]; // Failed to compensate
  errors: Record<string, unknown>; // Error details by step
  allSucceeded: boolean; // All compensations successful
  deadLetterEntries: string[]; // Dead-letter entry IDs
}
```

Example usage:

```typescript
const result = await executeSaga(runner, saga, input);

if (result.isErr()) {
  const error = result.error;
  if (error.type === "compensation:failed") {
    const compensation = error.compensation;

    console.log(`Compensated: ${compensation.compensatedSteps.join(", ")}`);
    console.log(`Failed: ${compensation.failedSteps.join(", ")}`);

    if (compensation.deadLetterEntries.length > 0) {
      console.log("Check dead-letter queue for failed compensations");
    }
  }
}
```

## Compensation Planning

The library builds a compensation plan based on the execution graph:

```typescript
interface CompensationPlan {
  steps: CompensationPlanStep[];
  strategy: CompensationStrategy;
}

interface CompensationPlanStep {
  stepName: string;
  stepIndex: number;
  hasCompensation: boolean;
  dependencies: string[]; // For parallel strategy
}
```

The plan determines:

- Which steps need compensation
- The order of compensation
- Dependencies between compensations

## Best Practices

### Always Define Compensation

If a step makes state changes, always provide compensation:

```typescript
// Good: Defines compensation
const CreateUserStep = defineStep({
  name: "CreateUser",
  port: UserPort,
  execute: async (input, port) => {
    const user = await port.create(input);
    return ok({ userId: user.id });
  },
  compensate: async context => {
    const result = context.results.CreateUser;
    if (result?.userId) {
      await context.port.delete(result.userId);
    }
    return ok(undefined);
  },
});

// Risky: No compensation for state change
const RiskyStep = defineStep({
  name: "CreateResource",
  port: ResourcePort,
  execute: async (input, port) => {
    return await port.create(input);
  },
  // Missing compensation!
});
```

### Handle Compensation Errors

Compensations should be defensive and handle errors gracefully:

```typescript
compensate: async context => {
  try {
    const result = context.results.MyStep;
    if (!result?.resourceId) {
      // Nothing to compensate
      return ok(undefined);
    }

    const deleteResult = await context.port.delete(result.resourceId);

    if (deleteResult.isErr()) {
      // Log but don't fail if resource already deleted
      if (deleteResult.error.code !== "NOT_FOUND") {
        return err({
          code: "COMPENSATION_FAILED",
          details: deleteResult.error,
        });
      }
    }

    return ok(undefined);
  } catch (error) {
    // Unexpected error
    return err({
      code: "COMPENSATION_ERROR",
      message: "Unexpected error during compensation",
      cause: error,
    });
  }
};
```

### Use Appropriate Strategies

Choose compensation strategy based on your consistency requirements:

```typescript
// Financial transactions: Sequential for ordered rollback
const PaymentSaga = defineSaga("Payment").options({ compensationStrategy: "sequential" }).build();

// Bulk operations: Parallel for speed
const BulkImportSaga = defineSaga("BulkImport")
  .options({ compensationStrategy: "parallel" })
  .build();

// Resilient systems: Best-effort with monitoring
const ResilientSaga = defineSaga("ResilientProcess")
  .options({ compensationStrategy: "best-effort" })
  .build();
```

### Monitor Dead-Letter Queue

Implement monitoring and alerting for dead-letter entries:

```typescript
// Check dead-letter queue periodically
setInterval(async () => {
  const entries = await deadLetterQueue.list({
    maxAge: 3600000, // 1 hour old
  });

  if (entries.length > 0) {
    // Alert operations team
    await alertService.notify({
      type: "DEAD_LETTER_ENTRIES",
      count: entries.length,
      oldest: entries[0].failedAt,
    });
  }
}, 60000); // Check every minute
```

### Test Compensation Paths

Always test both success and compensation paths:

```typescript
import { createSagaTestHarness } from "@hex-di/saga-testing";

test("should compensate on payment failure", async () => {
  const harness = createSagaTestHarness();

  // Configure step to fail
  harness.mockStep("ProcessPayment", {
    shouldFail: true,
    error: { code: "INSUFFICIENT_FUNDS" },
  });

  // Track compensation calls
  const compensationCalls = harness.trackCompensations();

  const result = await harness.execute(OrderSaga, input);

  expect(result.isErr()).toBe(true);
  expect(compensationCalls).toEqual([
    "ReserveInventory", // Compensated in reverse
    "ValidateOrder",
  ]);
});
```

## Next Steps

- [Understand Execution](execution) - How compensation integrates with execution
- [Learn about Persistence](../guides/persistence) - Compensation state in persistence
- [Explore DI Integration](../guides/di-integration) - Port resolution for compensation
