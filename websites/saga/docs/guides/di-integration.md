---
sidebar_position: 3
title: DI Integration
---

# DI Integration

The saga library provides seamless integration with the HexDI container through specialized ports and adapters.

## Saga Ports

The library defines two types of ports for saga operations:

### SagaPort

For executing sagas as services:

```typescript
import { sagaPort } from "@hex-di/saga";

// Define a saga execution port
export const OrderProcessingPort = sagaPort<
  "OrderProcessing", // Port name
  OrderInput, // Input type
  OrderOutput, // Output type
  OrderError // Error type
>()("OrderProcessing");

// The port provides a SagaExecutor interface
interface SagaExecutor<TInput, TOutput, TError> {
  execute(input: TInput): ResultAsync<TOutput, TError>;
}
```

### SagaManagementPort

For saga lifecycle management:

```typescript
import { sagaManagementPort } from "@hex-di/saga";

// Define a management port
export const SagaManagementPort = sagaManagementPort<
  "SagaManagement",
  ManagementOutput,
  ManagementError
>()("SagaManagement");

// The port provides management operations
interface SagaManagementExecutor<TOutput, TError> {
  resume(executionId: string): ResultAsync<TOutput, TError>;
  cancel(executionId: string): ResultAsync<void, TError>;
  getStatus(executionId: string): ResultAsync<SagaStatus, TError>;
  listExecutions(filters?: ExecutionFilters): ResultAsync<SagaExecutionSummary[], TError>;
}
```

## Creating Adapters

### Saga Execution Adapter

Create an adapter that executes a specific saga:

```typescript
import { createSagaExecutor, createAdapter } from "@hex-di/saga";

// Define your saga
const OrderProcessingSaga = defineSaga("OrderProcessing")
  .input<OrderInput>()
  .step(ValidateStep)
  .step(ProcessStep)
  .output(mapper)
  .build();

// Create the executor
const createOrderProcessingAdapter = () => {
  return createAdapter({
    port: OrderProcessingPort,
    factory: resolver => {
      const runner = createSagaRunner(resolver);
      return createSagaExecutor(OrderProcessingSaga, runner);
    },
    tags: ["saga", "order-processing"],
  });
};
```

### Saga Management Adapter

Create an adapter for saga management:

```typescript
import { createSagaManagementExecutor } from "@hex-di/saga";

const createSagaManagementAdapter = () => {
  return createAdapter({
    port: SagaManagementPort,
    factory: resolver => {
      const runner = createSagaRunner(resolver, {
        persister: databasePersister,
      });
      return createSagaManagementExecutor(runner);
    },
    tags: ["saga", "management"],
  });
};
```

### Unified Saga Adapter

Use the built-in adapter factory for common setups:

```typescript
import { createSagaAdapter } from "@hex-di/saga";

const sagaAdapter = createSagaAdapter({
  sagas: [OrderProcessingSaga, PaymentProcessingSaga, ShippingProcessingSaga],
  persister: createPostgresPersister(dbConfig),
  tracingHook: createSagaTracingHook(),
  portResolver: port => container.resolve(port),
  tags: ["saga", "orchestration"],
});
```

## Container Setup

### Complete Example

Set up a container with sagas and their dependencies:

```typescript
import { createContainer, port, createAdapter } from "@hex-di/core";
import {
  createSagaRunner,
  createSagaExecutor,
  createSagaManagementExecutor,
  createInMemoryPersister,
} from "@hex-di/saga";

// Step 1: Define service ports
const OrderServicePort = port<OrderService>()({
  name: "OrderService",
  direction: "outbound",
});

const PaymentServicePort = port<PaymentService>()({
  name: "PaymentService",
  direction: "outbound",
});

const InventoryServicePort = port<InventoryService>()({
  name: "InventoryService",
  direction: "outbound",
});

// Step 2: Define saga ports
const OrderSagaPort = sagaPort<"OrderSaga", OrderInput, OrderOutput, OrderError>()("OrderSaga");

const PaymentSagaPort = sagaPort<"PaymentSaga", PaymentInput, PaymentOutput, PaymentError>()(
  "PaymentSaga"
);

// Step 3: Create service adapters
const orderServiceAdapter = createAdapter({
  port: OrderServicePort,
  factory: () => new OrderServiceImpl(),
  lifetime: "singleton",
});

const paymentServiceAdapter = createAdapter({
  port: PaymentServicePort,
  factory: () => new PaymentServiceImpl(),
  lifetime: "singleton",
});

const inventoryAdapter = createAdapter({
  port: InventoryServicePort,
  factory: () => new InventoryServiceImpl(),
  lifetime: "singleton",
});

// Step 4: Create saga adapters
const orderSagaAdapter = createAdapter({
  port: OrderSagaPort,
  factory: resolver => {
    const runner = createSagaRunner(
      async port => {
        // Resolve ports from container
        const resolved = await resolver.resolve(port);
        if (!resolved.isOk()) {
          throw new Error(`Port not found: ${port.name}`);
        }
        return resolved.value;
      },
      {
        persister: createInMemoryPersister(),
      }
    );

    return createSagaExecutor(OrderProcessingSaga, runner);
  },
  lifetime: "scoped",
  tags: ["saga"],
});

// Step 5: Build the container
const container = createContainer()
  // Add service adapters
  .addAdapter(orderServiceAdapter)
  .addAdapter(paymentServiceAdapter)
  .addAdapter(inventoryAdapter)
  // Add saga adapters
  .addAdapter(orderSagaAdapter)
  .addAdapter(paymentSagaAdapter)
  // Build
  .build();

// Step 6: Use the sagas
async function processOrder(input: OrderInput) {
  const orderSaga = await container.resolve(OrderSagaPort);

  if (orderSaga.isErr()) {
    throw new Error("Failed to resolve saga");
  }

  const result = await orderSaga.value.execute(input);

  if (result.isOk()) {
    console.log("Order processed:", result.value);
  } else {
    console.error("Order failed:", result.error);
  }
}
```

## Port Validation

Ensure all required ports are available:

```typescript
import { ValidateSagaPorts } from "@hex-di/saga";

// Type-level validation
type ValidationResult = ValidateSagaPorts<
  typeof OrderProcessingSaga,
  [typeof OrderServicePort, typeof PaymentServicePort, typeof InventoryServicePort]
>;

// Runtime validation
function validatePorts(saga: AnySagaDefinition, container: Container) {
  const missingPorts: string[] = [];

  for (const step of saga.steps) {
    if (step.port && !container.has(step.port)) {
      missingPorts.push(step.port.name);
    }
  }

  if (missingPorts.length > 0) {
    throw new Error(`Missing ports: ${missingPorts.join(", ")}`);
  }
}
```

## Port Resolution Patterns

### Direct Resolution

Resolve ports directly from the container:

```typescript
const portResolver: PortResolver = async port => {
  const result = await container.resolve(port);

  if (result.isErr()) {
    throw new Error(`Failed to resolve port: ${port.name}`);
  }

  return result.value;
};
```

### Cached Resolution

Cache resolved services for performance:

```typescript
class CachedPortResolver implements PortResolver {
  private cache = new Map<string, any>();

  constructor(private container: Container) {}

  async resolve(port: Port<any>): Promise<any> {
    const cached = this.cache.get(port.name);
    if (cached) return cached;

    const result = await this.container.resolve(port);

    if (result.isErr()) {
      throw new Error(`Failed to resolve port: ${port.name}`);
    }

    this.cache.set(port.name, result.value);
    return result.value;
  }

  clear(): void {
    this.cache.clear();
  }
}
```

### Scoped Resolution

Create scoped containers for isolation:

```typescript
const scopedResolver: PortResolver = async port => {
  // Create a scoped container for this execution
  const scope = container.createScope();

  try {
    const result = await scope.resolve(port);

    if (result.isErr()) {
      throw new Error(`Failed to resolve port: ${port.name}`);
    }

    return result.value;
  } finally {
    // Clean up scope after execution
    scope.dispose();
  }
};
```

## Advanced Integration

### Registry Integration

Register all sagas in a central registry:

```typescript
import { createSagaRegistry, SagaRegistryAdapter } from "@hex-di/saga";

// Create registry
const registry = createSagaRegistry();

// Register sagas
registry.register(OrderProcessingSaga);
registry.register(PaymentProcessingSaga);
registry.register(ShippingProcessingSaga);

// Create registry adapter
const registryAdapter = new SagaRegistryAdapter(registry);

// Add to container
const container = createContainer().addAdapter(registryAdapter).build();

// Query registered sagas
const sagas = registry.list();
const orderSaga = registry.get("OrderProcessing");
```

### Inspector Integration

Add introspection capabilities:

```typescript
import { createSagaInspector, createSagaInspectorAdapter } from "@hex-di/saga";

// Create inspector
const inspector = createSagaInspector({
  registry,
  runner,
  persister,
});

// Create adapter
const inspectorAdapter = createSagaInspectorAdapter({
  inspector,
  port: SagaInspectorPort,
});

// Add to container
container.addAdapter(inspectorAdapter);

// Use inspector
const inspectorService = await container.resolve(SagaInspectorPort);
const activeExecutions = await inspectorService.getActiveExecutions();
const suggestions = await inspectorService.getSuggestions("OrderProcessing");
```

### Library Inspector

Integrate with HexDI's library inspector:

```typescript
import { createSagaLibraryInspector } from "@hex-di/saga";

const libraryInspector = createSagaLibraryInspector({
  registry,
  runner,
  persister,
});

// Register with container
container.addLibraryInspector("saga", libraryInspector);

// Query through unified interface
const info = await container.inspectLibrary("saga");
console.log(info.components); // All registered sagas
console.log(info.metadata); // Saga statistics
```

## Testing with DI

### Mock Container Setup

Create a test container with mocked services:

```typescript
import { createMockAdapter } from "@hex-di/testing";

const testContainer = createContainer()
  // Mock service adapters
  .addAdapter(
    createMockAdapter(OrderServicePort, {
      validate: jest.fn().mockResolvedValue({ valid: true }),
    })
  )
  .addAdapter(
    createMockAdapter(PaymentServicePort, {
      charge: jest.fn().mockResolvedValue({ transactionId: "tx-123" }),
    })
  )
  // Real saga adapter with mocked dependencies
  .addAdapter(orderSagaAdapter)
  .build();

// Test saga execution
test("should process order", async () => {
  const saga = await testContainer.resolve(OrderSagaPort);
  const result = await saga.value.execute(testInput);

  expect(result.isOk()).toBe(true);
  expect(result.value.transactionId).toBe("tx-123");
});
```

### Isolated Testing

Test sagas in isolation:

```typescript
import { createSagaTestHarness } from "@hex-di/saga-testing";

test("saga with DI", async () => {
  const harness = createSagaTestHarness({
    portResolver: async port => {
      // Return mocked services
      if (port.name === "OrderService") {
        return mockOrderService;
      }
      if (port.name === "PaymentService") {
        return mockPaymentService;
      }
      throw new Error(`Unknown port: ${port.name}`);
    },
  });

  const result = await harness.execute(OrderSaga, input);
  expect(result.isOk()).toBe(true);
});
```

## Best Practices

### Use Appropriate Lifetimes

Choose adapter lifetimes based on statefulness:

```typescript
// Stateless saga runners: singleton
createAdapter({
  port: SagaRunnerPort,
  factory: () => createSagaRunner(resolver),
  lifetime: "singleton",
});

// Stateful executors: scoped
createAdapter({
  port: OrderSagaPort,
  factory: resolver => createSagaExecutor(saga, runner),
  lifetime: "scoped",
});

// Transient for testing
createAdapter({
  port: TestSagaPort,
  factory: () => createTestExecutor(),
  lifetime: "transient",
});
```

### Validate Port Dependencies

Check dependencies at startup:

```typescript
async function validateSagaDependencies(container: Container) {
  const registry = await container.resolve(SagaRegistryPort);

  for (const saga of registry.list()) {
    const steps = saga.definition.steps;

    for (const step of steps) {
      if (step.port) {
        const resolved = await container.resolve(step.port);
        if (resolved.isErr()) {
          throw new Error(
            `Saga "${saga.name}" requires port "${step.port.name}" which is not registered`
          );
        }
      }
    }
  }

  console.log("All saga dependencies validated");
}

// Run validation on startup
await validateSagaDependencies(container);
```

### Use Port Type Guards

Validate port types at runtime:

```typescript
import { isSagaPort, isSagaManagementPort } from "@hex-di/saga";

function resolveSagaPort(container: Container, port: unknown) {
  if (!isSagaPort(port)) {
    throw new Error("Not a saga port");
  }

  return container.resolve(port);
}

function resolveManagementPort(container: Container, port: unknown) {
  if (!isSagaManagementPort(port)) {
    throw new Error("Not a management port");
  }

  return container.resolve(port);
}
```

## Next Steps

- [Explore the API](../api/api-reference) - Complete DI integration API
- [Learn about Testing](../testing) - Test sagas with DI mocking
- [Read about React Integration](../react) - Use sagas in React with DI
