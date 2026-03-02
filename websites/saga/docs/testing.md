---
sidebar_position: 1
title: Testing
---

# Testing

The `@hex-di/saga-testing` package provides utilities for testing sagas with mocked dependencies and assertions.

## Installation

```bash
pnpm add -D @hex-di/saga-testing
```

## Test Harness

The test harness provides a controlled environment for saga testing:

```typescript
import { createSagaTestHarness } from "@hex-di/saga-testing";

describe("OrderProcessingSaga", () => {
  let harness: SagaTestHarness;

  beforeEach(() => {
    harness = createSagaTestHarness({
      // Optional configuration
      persister: createMockPersister(),
      portResolver: mockPortResolver,
    });
  });

  afterEach(() => {
    harness.cleanup();
  });

  test("should process order successfully", async () => {
    const result = await harness.execute(OrderProcessingSaga, {
      orderId: "order-123",
      amount: 99.99,
    });

    expect(result.isOk()).toBe(true);
    expect(result.value.status).toBe("completed");
  });
});
```

## Mock Step Executor

Control step execution behavior:

```typescript
import { createMockStepExecutor } from "@hex-di/saga-testing";

test("should handle step failure", async () => {
  const harness = createSagaTestHarness();

  // Configure step to fail
  harness.mockStep("ProcessPayment", {
    shouldFail: true,
    error: { code: "INSUFFICIENT_FUNDS" },
    delay: 100, // Simulate latency
  });

  // Configure successful step
  harness.mockStep("ValidateOrder", {
    shouldFail: false,
    output: { orderId: "order-123", valid: true },
  });

  const result = await harness.execute(OrderSaga, input);

  expect(result.isErr()).toBe(true);
  expect(result.error.code).toBe("INSUFFICIENT_FUNDS");
});
```

### Dynamic Step Behavior

Change behavior based on input:

```typescript
harness.mockStep("ReserveInventory", {
  execute: async input => {
    if (input.items.length > 10) {
      return err({ code: "TOO_MANY_ITEMS" });
    }
    return ok({ reservationId: "res-123" });
  },
});
```

### Compensation Testing

Verify compensation execution:

```typescript
test("should compensate on failure", async () => {
  const compensationSpy = jest.fn();

  harness.mockStep("CreateResource", {
    shouldFail: false,
    output: { resourceId: "res-123" },
    compensate: compensationSpy,
  });

  harness.mockStep("ProcessPayment", {
    shouldFail: true,
    error: { code: "PAYMENT_FAILED" },
  });

  await harness.execute(Saga, input);

  // Verify compensation was called
  expect(compensationSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      results: expect.objectContaining({
        CreateResource: { resourceId: "res-123" },
      }),
    })
  );
});
```

## Mock Persister

Test persistence and resume functionality:

```typescript
import { createMockSagaPersister } from "@hex-di/saga-testing";

test("should persist state at checkpoints", async () => {
  const persister = createMockSagaPersister();
  const harness = createSagaTestHarness({ persister });

  await harness.execute(PersistentSaga, input);

  // Verify checkpoints were saved
  const saves = persister.getSaves();
  expect(saves).toHaveLength(4); // One per step

  // Verify state structure
  const lastSave = saves[saves.length - 1];
  expect(lastSave.currentStep).toBe(3);
  expect(lastSave.completedSteps).toHaveLength(3);
});

test("should resume from checkpoint", async () => {
  const persister = createMockSagaPersister();

  // Simulate partial execution
  persister.setState({
    executionId: "exec-123",
    sagaName: "OrderProcessing",
    currentStep: 2,
    completedSteps: [
      { stepName: "ValidateOrder", output: { valid: true } },
      { stepName: "ReserveInventory", output: { reservationId: "res-123" } },
    ],
    accumulatedResults: {
      ValidateOrder: { valid: true },
      ReserveInventory: { reservationId: "res-123" },
    },
    status: "running",
  });

  const harness = createSagaTestHarness({ persister });
  const result = await harness.resume("exec-123");

  expect(result.isOk()).toBe(true);
  // Verify only remaining steps were executed
  expect(harness.getExecutedSteps()).toEqual(["ProcessPayment", "CreateShipment"]);
});
```

## Fluent Assertions

Use fluent assertion API for cleaner tests:

```typescript
import { expectSagaResult } from "@hex-di/saga-testing";

test("should complete successfully", async () => {
  const result = await harness.execute(Saga, input);

  await expectSagaResult(result)
    .toSucceed()
    .withOutput(output => {
      expect(output.status).toBe("completed");
      expect(output.orderId).toBe("order-123");
    })
    .withExecutedSteps(["ValidateOrder", "ReserveInventory", "ProcessPayment"])
    .withCompensatedSteps([]);
});

test("should fail with compensation", async () => {
  const result = await harness.execute(FailingSaga, input);

  await expectSagaResult(result)
    .toFail()
    .withError(error => {
      expect(error.code).toBe("PAYMENT_FAILED");
    })
    .withCompensatedSteps(["ReserveInventory", "ValidateOrder"])
    .withDeadLetterEntries(0);
});
```

## Event Recording

Record and verify events:

```typescript
import { createSagaEventRecorder } from "@hex-di/saga-testing";

test("should emit correct events", async () => {
  const recorder = createSagaEventRecorder();
  const harness = createSagaTestHarness({
    eventListener: recorder.record,
  });

  await harness.execute(Saga, input);

  // Verify event sequence
  expect(recorder.getEvents()).toEqual([
    expect.objectContaining({ type: "saga:started" }),
    expect.objectContaining({ type: "step:started", stepName: "ValidateOrder" }),
    expect.objectContaining({ type: "step:completed", stepName: "ValidateOrder" }),
    expect.objectContaining({ type: "step:started", stepName: "ProcessPayment" }),
    expect.objectContaining({ type: "step:completed", stepName: "ProcessPayment" }),
    expect.objectContaining({ type: "saga:completed" }),
  ]);

  // Query specific events
  const stepEvents = recorder.getEventsByType("step:completed");
  expect(stepEvents).toHaveLength(2);

  // Verify timing
  const duration = recorder.getTotalDuration();
  expect(duration).toBeLessThan(1000);
});
```

## Testing Patterns

### Testing Parallel Execution

```typescript
test("should execute parallel steps concurrently", async () => {
  const harness = createSagaTestHarness();

  // Mock steps with delays
  harness.mockStep("StepA", { delay: 100, output: { a: 1 } });
  harness.mockStep("StepB", { delay: 100, output: { b: 2 } });
  harness.mockStep("StepC", { delay: 100, output: { c: 3 } });

  const start = Date.now();
  const result = await harness.execute(ParallelSaga, input);
  const duration = Date.now() - start;

  // Should complete in ~100ms, not 300ms
  expect(duration).toBeLessThan(150);
  expect(result.value).toEqual({
    StepA: { a: 1 },
    StepB: { b: 2 },
    StepC: { c: 3 },
  });
});
```

### Testing Branching Logic

```typescript
test("should execute correct branch", async () => {
  const harness = createSagaTestHarness();

  // Test high-risk branch
  const highRiskResult = await harness.execute(BranchingSaga, {
    riskScore: 85,
  });

  expect(harness.getExecutedSteps()).toContain("ManualReviewStep");
  expect(harness.getExecutedSteps()).not.toContain("AutoApprovalStep");

  // Reset and test low-risk branch
  harness.reset();

  const lowRiskResult = await harness.execute(BranchingSaga, {
    riskScore: 20,
  });

  expect(harness.getExecutedSteps()).toContain("AutoApprovalStep");
  expect(harness.getExecutedSteps()).not.toContain("ManualReviewStep");
});
```

### Testing Retry Logic

```typescript
test("should retry failed steps", async () => {
  const harness = createSagaTestHarness();
  let attemptCount = 0;

  harness.mockStep("FlakeyStep", {
    execute: async () => {
      attemptCount++;
      if (attemptCount < 3) {
        return err({ code: "TRANSIENT_ERROR" });
      }
      return ok({ success: true });
    },
  });

  const result = await harness.execute(RetrySaga, input);

  expect(result.isOk()).toBe(true);
  expect(attemptCount).toBe(3);
  expect(harness.getStepAttempts("FlakeyStep")).toBe(3);
});
```

### Testing Timeouts

```typescript
test("should timeout long-running steps", async () => {
  const harness = createSagaTestHarness();

  harness.mockStep("SlowStep", {
    delay: 5000, // 5 seconds
    output: { done: true },
  });

  const saga = defineSaga("TimeoutTest")
    .input<{}>()
    .step(SlowStep, { timeout: 1000 }) // 1 second timeout
    .build();

  const result = await harness.execute(saga, {});

  expect(result.isErr()).toBe(true);
  expect(result.error.type).toBe("timeout");
  expect(result.error.stepName).toBe("SlowStep");
});
```

### Testing Sub-Sagas

```typescript
test("should execute sub-sagas", async () => {
  const harness = createSagaTestHarness();

  // Mock the sub-saga as a whole
  harness.mockSaga("PaymentProcessing", {
    output: { transactionId: "tx-123" },
  });

  const result = await harness.execute(ParentSaga, input);

  expect(result.isOk()).toBe(true);
  expect(result.value.paymentResult).toEqual({
    transactionId: "tx-123",
  });

  // Verify sub-saga was called with correct input
  expect(harness.getSagaCalls("PaymentProcessing")[0].input).toEqual({
    amount: 99.99,
    customerId: "cust-456",
  });
});
```

## Integration Testing

Test with real services:

```typescript
import { createTestContainer } from "@hex-di/testing";

describe("Saga Integration", () => {
  let container: Container;
  let runner: SagaRunner;

  beforeAll(async () => {
    // Set up test database
    await setupTestDatabase();

    // Create container with test services
    container = createTestContainer()
      .addAdapter(createTestOrderService())
      .addAdapter(createTestPaymentService())
      .addAdapter(createTestInventoryService())
      .build();

    // Create runner with real persister
    runner = createSagaRunner(port => container.resolve(port), {
      persister: createTestPersister(),
    });
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  test("end-to-end order processing", async () => {
    const result = await executeSaga(runner, OrderProcessingSaga, {
      orderId: "test-order-123",
      amount: 49.99,
      items: [{ sku: "ITEM-1", quantity: 2 }],
    });

    expect(result.isOk()).toBe(true);

    // Verify database state
    const order = await getOrder("test-order-123");
    expect(order.status).toBe("completed");

    const inventory = await getInventory("ITEM-1");
    expect(inventory.reserved).toBe(2);
  });
});
```

## Performance Testing

Measure saga performance:

```typescript
import { measureSagaPerformance } from "@hex-di/saga-testing";

test("should complete within SLA", async () => {
  const harness = createSagaTestHarness();

  const metrics = await measureSagaPerformance(
    harness,
    OrderSaga,
    generateTestInputs(100), // 100 test cases
    {
      warmup: 10,
      iterations: 100,
    }
  );

  expect(metrics.p50).toBeLessThan(100); // 50th percentile < 100ms
  expect(metrics.p95).toBeLessThan(500); // 95th percentile < 500ms
  expect(metrics.p99).toBeLessThan(1000); // 99th percentile < 1s

  console.log("Performance metrics:", {
    mean: metrics.mean,
    p50: metrics.p50,
    p95: metrics.p95,
    p99: metrics.p99,
    max: metrics.max,
  });
});
```

## Best Practices

### Isolate Tests

Each test should be independent:

```typescript
describe("Saga Tests", () => {
  let harness: SagaTestHarness;

  beforeEach(() => {
    harness = createSagaTestHarness();
  });

  afterEach(() => {
    harness.cleanup();
    jest.clearAllMocks();
  });

  // Tests are isolated
});
```

### Test Both Paths

Always test success and failure scenarios:

```typescript
describe("PaymentSaga", () => {
  test("successful payment", async () => {
    // Test happy path
  });

  test("failed payment with compensation", async () => {
    // Test failure and rollback
  });

  test("partial compensation failure", async () => {
    // Test compensation errors
  });
});
```

### Use Descriptive Names

Name tests clearly:

```typescript
test("should compensate inventory reservation when payment fails after retry exhaustion", async () => {
  // Clear test intent
});
```

### Mock at the Right Level

Mock at port level, not implementation:

```typescript
// Good: Mock the port
harness.mockPort(PaymentPort, {
  charge: jest.fn().mockResolvedValue({ transactionId: "tx-123" }),
});

// Avoid: Mocking internals
// harness.mockImplementation(...)
```

## Next Steps

- [Explore React Integration](react) - Test sagas in React components
- [Read the API Reference](api/api-reference) - Complete testing API
