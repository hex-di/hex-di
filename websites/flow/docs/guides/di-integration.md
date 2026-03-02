---
sidebar_position: 3
title: DI Integration
---

# DI Integration

Flow integrates seamlessly with the HexDI container system through adapters, enabling dependency injection for effects, activities, and cross-machine communication.

## Creating a Flow Adapter

The `createFlowAdapter()` function creates a DI adapter for your state machine:

```typescript
import { createFlowAdapter } from "@hex-di/flow";
import { createPort } from "@hex-di/core";

// Define the port
export const OrderFlowPort = createPort<"OrderFlow", FlowService>({
  name: "OrderFlow",
  direction: "inbound",
});

// Create the adapter
export const OrderFlowAdapter = createFlowAdapter({
  provides: OrderFlowPort,
  requires: {
    orderService: OrderServicePort,
    paymentService: PaymentServicePort,
    notificationService: NotificationServicePort,
  },
  lifetime: "scoped",
  machine: orderMachine,
  activities: {
    orderMonitor: orderMonitorActivity,
    paymentProcessor: paymentProcessorActivity,
  },
});
```

## DI Effect Executor

The `createDIEffectExecutor` resolves ports and executes effects through the container:

```typescript
import { createDIEffectExecutor } from "@hex-di/flow";

const executor = createDIEffectExecutor({
  scopeResolver: container => container.scope("request"),
  ports: {
    UserService: UserServicePort,
    AuthService: AuthServicePort,
    DataService: DataServicePort,
  },
  activities: {
    syncActivity: DataSyncActivityPort,
    pollingActivity: PollingActivityPort,
  },
  fallback: async effect => {
    console.warn(`Unhandled effect: ${effect._tag}`);
  },
});

// Use in runner
const runner = createMachineRunner(machine, {
  executor: executor.withContainer(container),
});
```

## Port Resolution for Invoke Effects

Invoke effects automatically resolve ports from the container:

```typescript
const machine = defineMachine({
  id: "user-flow",
  initial: "idle",
  states: {
    idle: {
      on: {
        LOAD_USER: {
          target: "loading",
          effects: [
            // Port name is resolved from container
            Effect.invoke("UserService", "findById", { id: "123" }),
          ],
        },
      },
    },
    loading: {
      on: {
        USER_LOADED: {
          target: "ready",
          actions: [(ctx, event) => ({ user: event.payload })],
        },
      },
    },
    ready: {},
  },
});

// Container setup
const container = createContainer()
  .addAdapter(UserServiceAdapter)
  .addAdapter(
    createFlowAdapter({
      provides: UserFlowPort,
      requires: {
        userService: UserServicePort,
      },
      machine,
    })
  )
  .build();

// The UserService port is automatically resolved
const runner = container.get(UserFlowPort);
```

## Activity Spawning with Dependencies

Activities can have their own dependencies injected:

```typescript
// Define activity with dependencies
class DataSyncActivity implements Activity<SyncConfig, void> {
  constructor(
    private dataService: DataService,
    private cacheService: CacheService
  ) {}

  async execute(config: SyncConfig, sink: EventSink, signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      const data = await this.dataService.fetchLatest();
      await this.cacheService.update(data);
      sink.emit({ type: "SYNC_COMPLETE", payload: { timestamp: Date.now() } });
      await delay(config.interval);
    }
  }
}

// Configure in adapter
const SyncFlowAdapter = createFlowAdapter({
  provides: SyncFlowPort,
  requires: {
    dataService: DataServicePort,
    cacheService: CacheServicePort,
  },
  machine: syncMachine,
  activities: {
    dataSync: {
      create: deps => new DataSyncActivity(deps.dataService, deps.cacheService),
    },
  },
});
```

## Event Bus Integration

Enable cross-machine communication through the event bus:

```typescript
import { FlowEventBusAdapter, FlowEventBusPort } from "@hex-di/flow";

// Add event bus to container
const container = createContainer()
  .addAdapter(FlowEventBusAdapter)
  .addAdapter(OrderFlowAdapter)
  .addAdapter(PaymentFlowAdapter)
  .addAdapter(ShippingFlowAdapter)
  .build();

// Machines can communicate via events
const orderMachine = defineMachine({
  id: "order",
  initial: "pending",
  states: {
    pending: {
      on: {
        APPROVE: {
          target: "approved",
          effects: [
            // Broadcast to other machines
            Effect.invoke("EventBus", "publish", {
              channel: "orders",
              event: { type: "ORDER_APPROVED", orderId: "123" },
            }),
          ],
        },
      },
    },
    approved: {},
  },
});

const paymentMachine = defineMachine({
  id: "payment",
  initial: "waiting",
  states: {
    waiting: {
      on: {
        ORDER_APPROVED: {
          target: "processing",
          effects: [Effect.invoke("PaymentService", "charge")],
        },
      },
    },
    processing: {},
  },
});
```

## Scope-Aware Lifetime Management

Flow adapters respect container scopes:

```typescript
// Request-scoped flow
const RequestFlowAdapter = createFlowAdapter({
  provides: RequestFlowPort,
  lifetime: "scoped", // New instance per scope
  machine: requestMachine,
});

// Singleton flow (shared across requests)
const GlobalFlowAdapter = createFlowAdapter({
  provides: GlobalFlowPort,
  lifetime: "singleton", // Single instance
  machine: globalMachine,
});

// Usage with scopes
const requestScope = container.scope("request-123");
const requestFlow = requestScope.get(RequestFlowPort); // New instance
const globalFlow = requestScope.get(GlobalFlowPort); // Shared instance
```

## Full DI Setup Example

Here's a complete example with graph builder:

```typescript
import { createGraphBuilder } from "@hex-di/graph";
import { createFlowAdapter, createDIEffectExecutor } from "@hex-di/flow";

// Define ports
const UserServicePort = createPort<"UserService", UserService>({
  name: "UserService",
  direction: "outbound",
});

const NotificationServicePort = createPort<"NotificationService", NotificationService>({
  name: "NotificationService",
  direction: "outbound",
});

const UserFlowPort = createPort<"UserFlow", FlowService>({
  name: "UserFlow",
  direction: "inbound",
});

// Define machine
const userMachine = defineMachine({
  id: "user-management",
  initial: "idle",
  context: { user: null },
  states: {
    idle: {
      on: {
        REGISTER: { target: "registering" },
      },
    },
    registering: {
      entry: [Effect.invoke("UserService", "createUser", { name: "John" })],
      on: {
        USER_CREATED: {
          target: "active",
          actions: [(ctx, event) => ({ user: event.payload })],
          effects: [Effect.invoke("NotificationService", "sendWelcome", { userId: "123" })],
        },
      },
    },
    active: {},
  },
});

// Create adapters
const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  lifetime: "singleton",
  create: () => new UserServiceImpl(),
});

const NotificationServiceAdapter = createAdapter({
  provides: NotificationServicePort,
  lifetime: "singleton",
  create: () => new NotificationServiceImpl(),
});

const UserFlowAdapter = createFlowAdapter({
  provides: UserFlowPort,
  requires: {
    userService: UserServicePort,
    notificationService: NotificationServicePort,
  },
  lifetime: "scoped",
  machine: userMachine,
});

// Build graph
const result = createGraphBuilder()
  .addNode("user-service", UserServiceAdapter)
  .addNode("notification-service", NotificationServiceAdapter)
  .addNode("user-flow", UserFlowAdapter)
  .addEdge("user-flow", "user-service")
  .addEdge("user-flow", "notification-service")
  .build();

if (result.success) {
  const container = result.value.getContainer();

  // Create DI executor
  const executor = createDIEffectExecutor({
    scopeResolver: c => c,
    ports: {
      UserService: UserServicePort,
      NotificationService: NotificationServicePort,
    },
  });

  // Get flow service
  const scope = container.scope("request-1");
  const userFlow = scope.get(UserFlowPort);

  // Send events
  userFlow.send({ type: "REGISTER" });
}
```

## Registry and Inspector Integration

Flow provides built-in adapters for debugging and introspection:

```typescript
import {
  FlowRegistryAdapter,
  FlowRegistryPort,
  createFlowInspectorAdapter,
  FlowInspectorPort,
} from "@hex-di/flow";

// Add registry and inspector
const container = createContainer()
  .addAdapter(FlowRegistryAdapter)
  .addAdapter(
    createFlowInspectorAdapter({
      maxTransitions: 1000,
      slowThresholdMs: 100,
    })
  )
  .addAdapter(UserFlowAdapter)
  .build();

// Access registry
const registry = container.get(FlowRegistryPort);
const flows = registry.getAll();
console.log(`Active flows: ${flows.length}`);

// Access inspector
const inspector = container.get(FlowInspectorPort);
const stats = inspector.getStats();
console.log(`Total transitions: ${stats.totalTransitions}`);
```

## Metadata and Introspection

Flow adapters provide rich metadata:

```typescript
import { computeFlowMetadata, isFlowMetadata } from "@hex-di/flow";

const metadata = computeFlowMetadata(UserFlowAdapter);

console.log(metadata.machineId); // 'user-management'
console.log(metadata.states); // ['idle', 'registering', 'active']
console.log(metadata.events); // ['REGISTER', 'USER_CREATED']
console.log(metadata.currentState); // 'idle'
console.log(metadata.activities); // Map of activity IDs
console.log(metadata.transitions); // Transition details

// Check if adapter is a Flow adapter
if (isFlowMetadata(someAdapter.metadata)) {
  console.log("This is a Flow adapter");
}
```

## Best Practices

1. **Use scoped lifetime**: Most flows should be scoped to requests/sessions
2. **Define clear port contracts**: Type your service interfaces properly
3. **Handle effect errors**: Provide fallback handlers in the executor
4. **Use the event bus sparingly**: Direct dependencies are clearer
5. **Configure activities properly**: Inject dependencies through constructor
6. **Enable introspection in dev**: Add registry and inspector adapters
7. **Keep effects pure**: Don't access container directly in effects
8. **Test with mock containers**: Use test containers for unit testing
