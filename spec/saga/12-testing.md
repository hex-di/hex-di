# 12 - Testing

_Previous: [11 - React Integration](./11-react-integration.md)_

---

## 17. Testing Patterns

### 17.1 Test Harness

The `@hex-di/saga/testing` subpath provides `createSagaTestHarness`, a utility that
**composes with HexDI's existing `TestGraphBuilder`** to test sagas through the real
container with overridden dependencies. This ensures the test exercises the same adapter
wiring, scope lifecycle, and resolution hooks as production.

```typescript
function createSagaTestHarness<TSaga extends AnySagaDefinition, TGraph extends Graph>(
  saga: TSaga,
  config: SagaTestConfig<TSaga, TGraph>
): SagaTestHarness<TSaga>;

interface SagaTestConfig<TSaga extends AnySagaDefinition, TGraph extends Graph> {
  /** The production graph (or a pre-configured test graph) */
  graph: TGraph;

  /** Port overrides -- applied via TestGraphBuilder.override() internally */
  overrides?: ReadonlyArray<Adapter>;

  /** Enable execution trace capture */
  tracing?: boolean;
}

interface SagaTestHarness<TSaga extends AnySagaDefinition> {
  /** The test container (created from graph + overrides) */
  readonly container: Container;

  /** Run the saga within a fresh scope, returning the result */
  execute(
    input: InferSagaInput<TSaga>
  ): ResultAsync<SagaSuccess<InferSagaOutput<TSaga>>, SagaError<InferSagaErrors<TSaga>>>;

  /** Retrieve the execution trace (requires tracing: true in config) */
  getTrace(): ExecutionTrace;

  /** Dispose the container and all scopes */
  dispose(): Promise<void>;
}
```

Internally, `createSagaTestHarness`:

1. Builds a test graph via `TestGraphBuilder.from(config.graph)` applying each override
2. Creates a container from the test graph
3. On each `execute()` call, creates a fresh scope, resolves the saga port, runs the saga, and disposes the scope
4. Captures traces via `@hex-di/tracing` memory adapter when `tracing: true`

This is syntactic sugar over `TestGraphBuilder.from().override().build()` + `createContainer()`. For full control, use `TestGraphBuilder` directly:

```typescript
const testGraph = TestGraphBuilder.from(productionGraph)
  .override(createMockAdapter(InventoryPort, { reserve: async () => ({ reserved: true }) }))
  .override(createMockAdapter(PaymentPort, { charge: async () => ({ transactionId: "tx-1" }) }))
  .build();

const container = createContainer(testGraph);
const scope = container.createScope();
const saga = scope.resolve(OrderSagaPort);
const result = await saga.execute(orderInput);
await scope.dispose();
```

Per-step behavior changes are achieved by providing different mock adapter implementations
through the `overrides` array. There is no `overrideStep()` or `overrideCompensation()` API
because these bypass the real execution path (port resolution, scope lifecycle, adapter
wiring) and create a parallel mocking system that diverges from production behavior.

### 17.2 Testing Examples

#### 17.2.1 Test Successful Execution

```typescript
describe("OrderSaga", () => {
  let harness: SagaTestHarness<typeof OrderSagaDef>;

  beforeEach(() => {
    harness = createSagaTestHarness(OrderSagaDef, {
      graph: productionGraph,
      overrides: [
        createMockAdapter(InventoryPort, { reserve: async () => ({ reserved: true }) }),
        createMockAdapter(PaymentPort, { charge: async () => ({ transactionId: "tx-1" }) }),
        createMockAdapter(ShippingPort, { ship: async () => ({ trackingNumber: "TRACK-1" }) }),
        createMockAdapter(NotificationPort, { send: async () => {} }),
      ],
      tracing: true,
    });
  });

  afterEach(() => harness.dispose());

  it("completes order successfully", async () => {
    const result = await harness.execute(validOrderInput);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output.trackingNumber).toBe("TRACK-1");
    }
  });
});
```

#### 17.2.2 Test Compensation

Override the payment adapter to throw, then verify compensation runs for completed steps.

```typescript
describe("OrderSaga compensation", () => {
  it("compensates on payment failure", async () => {
    const harness = createSagaTestHarness(OrderSagaDef, {
      graph: productionGraph,
      overrides: [
        createMockAdapter(InventoryPort, { reserve: async () => ({ reserved: true }) }),
        createMockAdapter(PaymentPort, {
          charge: async () => {
            throw new Error("declined");
          },
        }),
        createMockAdapter(ShippingPort, { ship: async () => ({ trackingNumber: "TRACK-1" }) }),
        createMockAdapter(NotificationPort, { send: async () => {} }),
      ],
      tracing: true,
    });

    const result = await harness.execute(validOrderInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
    }

    const trace = harness.getTrace();
    expect(trace.steps.map(s => s.stepName)).toEqual([
      "ValidateOrder",
      "ReserveStock",
      "ChargePayment",
    ]);

    await harness.dispose();
  });
});
```

#### 17.2.3 Test Step Retry

Provide a mock adapter that fails on early attempts and succeeds later to verify retry behavior.

```typescript
describe("ChargePaymentStep retry", () => {
  it("retries transient failures and succeeds on the third attempt", async () => {
    let attemptCount = 0;

    const harness = createSagaTestHarness(OrderSagaDef, {
      graph: productionGraph,
      overrides: [
        createMockAdapter(InventoryPort, {
          reserve: async () => ({ reservationId: "res-001" }),
        }),
        createMockAdapter(PaymentPort, {
          charge: async () => {
            attemptCount++;
            if (attemptCount < 3) {
              throw new Error("Network timeout");
            }
            return { transactionId: "txn-001" };
          },
        }),
        createMockAdapter(ShippingPort, {
          ship: async () => ({ trackingNumber: "TRACK-001" }),
        }),
        createMockAdapter(NotificationPort, {
          send: async () => {},
        }),
      ],
      tracing: true,
    });

    const result = await harness.execute(validOrderInput);

    expect(result.isOk()).toBe(true);
    expect(attemptCount).toBe(3);

    const trace = harness.getTrace();
    const paymentStep = trace.steps.find(s => s.stepName === "ChargePayment");
    expect(paymentStep?.attemptCount).toBe(3);

    await harness.dispose();
  });
});
```

#### 17.2.4 Test Conditional Steps

Execute the saga without a `discountCode` and verify the `ApplyDiscount` step was skipped.

```typescript
describe("OrderSaga conditional steps", () => {
  it("skips ApplyDiscount when no discount code is provided", async () => {
    const harness = createSagaTestHarness(OrderSagaDef, {
      graph: productionGraph,
      overrides: [
        createMockAdapter(InventoryPort, {
          reserve: async () => ({ reservationId: "res-001" }),
        }),
        createMockAdapter(PaymentPort, {
          charge: async () => ({ transactionId: "txn-001" }),
        }),
        createMockAdapter(PricingPort, {
          applyDiscount: async () => ({ discountAmount: 10 }),
        }),
        createMockAdapter(ShippingPort, {
          ship: async () => ({ trackingNumber: "TRACK-001" }),
        }),
        createMockAdapter(NotificationPort, {
          send: async () => {},
        }),
      ],
      tracing: true,
    });

    const result = await harness.execute({
      orderId: "order-123",
      userId: "user-456",
      items: [{ productId: "WIDGET-1", quantity: 2 }],
      paymentMethod: "card",
      shippingAddress: { street: "123 Main St", city: "Springfield", zip: "62704" },
      // No discountCode provided
    });

    expect(result.isOk()).toBe(true);

    const trace = harness.getTrace();
    const discountStep = trace.steps.find(s => s.stepName === "ApplyDiscount");
    expect(discountStep?.status).toBe("skipped");

    await harness.dispose();
  });
});
```

#### 17.2.5 Snapshot Testing

Enable tracing, normalize non-deterministic fields, and match against a stored snapshot.

```typescript
describe("OrderSaga snapshot", () => {
  it("matches execution trace snapshot", async () => {
    const harness = createSagaTestHarness(OrderSagaDef, {
      graph: productionGraph,
      overrides: [
        createMockAdapter(InventoryPort, {
          reserve: async () => ({ reservationId: "res-001" }),
        }),
        createMockAdapter(PaymentPort, {
          charge: async () => ({ transactionId: "txn-001" }),
        }),
        createMockAdapter(ShippingPort, {
          ship: async () => ({ trackingNumber: "TRACK-001" }),
        }),
        createMockAdapter(NotificationPort, {
          send: async () => {},
        }),
      ],
      tracing: true,
    });

    await harness.execute(validOrderInput);

    const trace = harness.getTrace();

    // Normalize non-deterministic fields for stable snapshots
    const normalized = {
      ...trace,
      executionId: "[execution-id]",
      totalDurationMs: "[duration]",
      steps: trace.steps.map(step => ({
        ...step,
        durationMs: "[duration]",
        startedAt: "[timestamp]",
        completedAt: "[timestamp]",
      })),
    };

    expect(normalized).toMatchSnapshot();

    await harness.dispose();
  });
});
```

### 17.3 Persistence and Resumption Testing

Test that a persistent saga can be checkpointed and resumed from its last step.

```typescript
describe("OrderSaga persistence", () => {
  it("resumes from last checkpoint after interruption", async () => {
    const persister = createInMemoryPersister();
    const callLog: string[] = [];

    const harness = createSagaTestHarness(OrderSagaDef, {
      graph: productionGraph,
      overrides: [
        createMockAdapter(InventoryPort, {
          reserve: async () => {
            callLog.push("reserve");
            return { reservationId: "res-001" };
          },
        }),
        createMockAdapter(PaymentPort, {
          charge: async () => {
            callLog.push("charge");
            // Simulate crash after payment by throwing a non-retryable error
            throw new Error("Process crashed");
          },
        }),
        createMockAdapter(ShippingPort, {
          ship: async () => {
            callLog.push("ship");
            return { trackingNumber: "TRACK-001" };
          },
        }),
        createMockAdapter(NotificationPort, { send: async () => {} }),
        createMockAdapter(SagaPersisterPort, persister),
      ],
    });

    // First execution fails at ChargePayment
    const result1 = await harness.execute(validOrderInput);
    expect(result1.isErr()).toBe(true);

    // Verify state was persisted
    const states = await persister.list({ status: "failed" });
    expect(states).toHaveLength(1);
    expect(states[0].currentStep).toBe(2); // Failed at step index 2

    // Fix the payment adapter for the resumed run
    const resumeHarness = createSagaTestHarness(OrderSagaDef, {
      graph: productionGraph,
      overrides: [
        createMockAdapter(InventoryPort, {
          reserve: async () => {
            callLog.push("reserve-resumed");
            return { reservationId: "res-001" };
          },
        }),
        createMockAdapter(PaymentPort, {
          charge: async () => {
            callLog.push("charge-resumed");
            return { transactionId: "txn-001" };
          },
        }),
        createMockAdapter(ShippingPort, {
          ship: async () => {
            callLog.push("ship-resumed");
            return { trackingNumber: "TRACK-001" };
          },
        }),
        createMockAdapter(NotificationPort, { send: async () => {} }),
        createMockAdapter(SagaPersisterPort, persister),
      ],
    });

    // Resume -- should skip already-completed steps
    const scope = resumeHarness.container.createScope();
    const management = scope.resolve(OrderSagaManagementPort);
    const result2 = await management.resume(states[0].executionId);

    expect(result2.isOk()).toBe(true);
    // reserve should NOT be called again (already completed before crash)
    expect(callLog).not.toContain("reserve-resumed");
    // charge and ship should be called in the resumed run
    expect(callLog).toContain("charge-resumed");
    expect(callLog).toContain("ship-resumed");

    await scope.dispose();
    await harness.dispose();
    await resumeHarness.dispose();
  });
});
```

### 17.4 Parallel Step Testing

Verify that parallel steps execute concurrently and handle partial failures correctly.

```typescript
describe("AggregationSaga parallel steps", () => {
  it("executes parallel steps concurrently", async () => {
    const executionOrder: string[] = [];

    const harness = createSagaTestHarness(AggregationSagaDef, {
      graph: productionGraph,
      overrides: [
        createMockAdapter(UserProfilePort, {
          fetch: async () => {
            executionOrder.push("profile-start");
            await delay(50);
            executionOrder.push("profile-end");
            return { name: "Alice", email: "alice@test.com", avatar: "" };
          },
        }),
        createMockAdapter(OrderHistoryPort, {
          fetch: async () => {
            executionOrder.push("orders-start");
            await delay(30);
            executionOrder.push("orders-end");
            return { orders: [], totalSpent: 0 };
          },
        }),
        createMockAdapter(PreferencesPort, {
          fetch: async () => {
            executionOrder.push("prefs-start");
            await delay(10);
            executionOrder.push("prefs-end");
            return { theme: "dark", locale: "en", notifications: true };
          },
        }),
      ],
    });

    const result = await harness.execute({ userId: "user-1" });
    expect(result.isOk()).toBe(true);

    // All starts should happen before any ends (concurrent execution)
    const startIndices = executionOrder
      .map((e, i) => (e.endsWith("-start") ? i : -1))
      .filter(i => i >= 0);
    const endIndices = executionOrder
      .map((e, i) => (e.endsWith("-end") ? i : -1))
      .filter(i => i >= 0);

    // At least some starts should interleave with ends
    expect(Math.max(...startIndices)).toBeGreaterThan(Math.min(...endIndices));

    await harness.dispose();
  });
});
```

### 17.5 Branch Selection Testing

Verify that the correct branch executes based on runtime conditions.

```typescript
describe("PaymentSaga branching", () => {
  it("selects card branch when payment method is card", async () => {
    const harness = createSagaTestHarness(PaymentSagaDef, {
      graph: productionGraph,
      overrides: [
        createMockAdapter(ValidationPort, {
          validate: async () => ({ valid: true }),
        }),
        createMockAdapter(CardPort, {
          authorize: async () => ({ authCode: "AUTH-1" }),
          capture: async () => ({ captureId: "CAP-1" }),
        }),
        createMockAdapter(BankPort, {
          initiate: async () => ({ transferId: "XFER-1" }),
          confirm: async () => ({ confirmed: true }),
        }),
        createMockAdapter(TransactionPort, {
          record: async () => ({ id: "TXN-1" }),
        }),
      ],
      tracing: true,
    });

    const result = await harness.execute({ amount: 100, method: "card" });
    expect(result.isOk()).toBe(true);

    const trace = harness.getTrace();
    const stepNames = trace.steps.map(s => s.stepName);

    // Card branch steps should execute
    expect(stepNames).toContain("AuthorizeCard");
    expect(stepNames).toContain("CaptureCard");

    // Bank branch steps should NOT execute
    expect(stepNames).not.toContain("InitiateBankTransfer");
    expect(stepNames).not.toContain("ConfirmBankTransfer");

    await harness.dispose();
  });
});
```

### 17.6 Timeout Testing

Verify that step-level and saga-level timeouts trigger cancellation and compensation.

```typescript
describe("OrderSaga timeout", () => {
  it("compensates when a step exceeds its timeout", async () => {
    const harness = createSagaTestHarness(OrderSagaDef, {
      graph: productionGraph,
      overrides: [
        createMockAdapter(InventoryPort, {
          reserve: async () => ({ reservationId: "res-001" }),
        }),
        createMockAdapter(PaymentPort, {
          charge: async () => {
            // Simulate a hung external service
            await new Promise(() => {}); // Never resolves
          },
        }),
        createMockAdapter(ShippingPort, {
          ship: async () => ({ trackingNumber: "TRACK-001" }),
        }),
        createMockAdapter(NotificationPort, { send: async () => {} }),
      ],
      tracing: true,
    });

    const result = await harness.execute(validOrderInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("Timeout");
      expect(result.error.stepName).toBe("ChargePayment");
      expect(result.error._tag).toBe("Timeout"); // full compensation succeeded (not CompensationFailed)
    }

    await harness.dispose();
  });
});
```

### 17.7 Sub-Saga Composition Testing

Test that parent and child sagas compose correctly, including nested compensation.

```typescript
describe("CheckoutSaga with sub-sagas", () => {
  it("compensates sub-saga when a later step fails", async () => {
    const compensatedSteps: string[] = [];

    const harness = createSagaTestHarness(CheckoutSagaDef, {
      graph: productionGraph,
      overrides: [
        createMockAdapter(OrderPort, {
          create: async () => ({ orderId: "ORD-1", total: 100 }),
          cancel: async () => {
            compensatedSteps.push("CreateOrder");
          },
        }),
        createMockAdapter(PaymentPort, {
          charge: async () => ({ transactionId: "TXN-1" }),
          refund: async () => {
            compensatedSteps.push("PaymentSaga");
          },
        }),
        createMockAdapter(FulfillmentPort, {
          fulfill: async () => {
            throw new Error("Warehouse closed");
          },
          cancel: async () => {
            compensatedSteps.push("FulfillmentSaga");
          },
        }),
        createMockAdapter(NotificationPort, { send: async () => {} }),
      ],
      tracing: true,
    });

    const result = await harness.execute(checkoutInput);

    expect(result.isErr()).toBe(true);
    // Sub-sagas should compensate in reverse order before parent steps
    expect(compensatedSteps).toEqual([
      "FulfillmentSaga", // Failed sub-saga compensates first
      "PaymentSaga", // Earlier sub-saga compensates second
      "CreateOrder", // Parent step compensates last
    ]);

    await harness.dispose();
  });
});
```

### 17.8 Scope Disposal Cancellation Testing

Verify that disposing a scope cancels an in-progress saga and triggers compensation.

```typescript
describe("Saga cancellation via scope disposal", () => {
  it("cancels saga and compensates when scope is disposed", async () => {
    const container = createContainer({ graph: testGraph, name: "Test" });
    const scope = container.createScope("request");

    const saga = scope.resolve(OrderSagaPort);

    // Start saga execution but don't await it yet
    const resultPromise = saga.execute({
      ...validOrderInput,
      // Use a slow payment adapter to give time for disposal
    });

    // Dispose the scope while saga is running
    // (in practice this would be triggered by request timeout/disconnect)
    await scope.dispose();

    // The result should reflect cancellation
    const result = await resultPromise;
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("Cancelled");
    }

    await container.dispose();
  });
});
```

### 17.9 Integration Testing

Integration tests run the saga against a real HexDI container with real (or test-scoped) adapters. They verify that the saga, its steps, and the container's dependency resolution work end-to-end.

```typescript
describe("OrderSaga integration", () => {
  it("releases inventory after compensation with real container", async () => {
    const testDb = await createTestDatabase();

    const testGraph = TestGraphBuilder.from(productionGraph)
      .override(TestInventoryAdapter({ db: testDb }))
      .override(TestPaymentAdapter({ db: testDb }))
      .override(FailingShippingAdapter()) // Always throws to trigger compensation
      .override(NoOpNotificationAdapter())
      .build();

    const container = createContainer(testGraph);
    const scope = container.createScope();

    try {
      const saga = scope.resolve(OrderSagaPort);
      const result = await saga.execute({
        orderId: "order-int-001",
        userId: "user-int-001",
        items: [{ productId: "WIDGET-1", quantity: 5 }],
        paymentMethod: "card",
        shippingAddress: { street: "456 Oak Ave", city: "Shelbyville", zip: "62705" },
      });

      expect(result.isErr()).toBe(true);

      // Verify inventory was reserved and then released via compensation
      const inventory = await testDb.query("SELECT reserved FROM inventory WHERE product_id = $1", [
        "WIDGET-1",
      ]);
      expect(inventory.rows[0].reserved).toBe(0);

      // Verify payment was charged and then refunded via compensation
      const transactions = await testDb.query(
        "SELECT status FROM transactions WHERE order_id = $1",
        ["order-int-001"]
      );
      expect(transactions.rows[0].status).toBe("refunded");
    } finally {
      await scope.dispose();
      await testDb.teardown();
    }
  });
});
```

This pattern ensures that:

- The saga orchestration logic is tested against the same adapter wiring used in production
- Only the leaf dependencies (ports) are swapped via `TestGraphBuilder.override()`, not the saga itself
- Test failures surface issues in saga logic or adapter contracts, not in test-specific scaffolding
- Scope lifecycle (creation, resolution, disposal) exercises the same code path as production

---

_Next: [13 - Advanced Patterns](./13-advanced.md)_
