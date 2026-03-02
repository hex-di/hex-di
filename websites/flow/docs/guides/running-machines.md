---
sidebar_position: 2
title: Running Machines
---

# Running Machines

Once you've built a state machine, you need to create a runner to execute it. The MachineRunner manages state transitions, effect execution, activity lifecycle, and event processing.

## Creating a Runner

Use `createMachineRunner()` to instantiate a runner:

```typescript
import { createMachineRunner, createBasicExecutor } from "@hex-di/flow";

// Basic runner with default options
const runner = createMachineRunner(machine);

// Runner with custom options
const runner = createMachineRunner(machine, {
  executor: createBasicExecutor(),
  maxQueueSize: 100,
  history: {
    maxTransitions: 50,
    maxEffects: 100,
  },
});
```

## Sending Events

### Single Event

Send individual events to trigger transitions:

```typescript
// Simple event without payload
runner.send({ type: "START" });

// Event with payload
runner.send({
  type: "ADD_ITEM",
  payload: { id: "123", name: "Widget", price: 29.99 },
});

// Check if event was accepted
const accepted = runner.send({ type: "INVALID_EVENT" });
console.log(accepted); // false if no transition matched
```

### Batch Events

Process multiple events atomically:

```typescript
// Send multiple events at once
runner.sendBatch([
  { type: "ADD_ITEM", payload: { id: "1", quantity: 2 } },
  { type: "ADD_ITEM", payload: { id: "2", quantity: 1 } },
  { type: "CALCULATE_TOTAL" },
]);
```

### Send and Execute

Send an event and wait for all effects to complete:

```typescript
// Send event and wait for effects
const result = await runner.sendAndExecute({ type: "SAVE" });

if (result.success) {
  console.log("Save completed successfully");
} else {
  console.error("Save failed:", result.error);
}
```

## Querying State

### Current State and Context

Access the current state and context:

```typescript
// Get current state name
const currentState = runner.state();
console.log(currentState); // 'loading'

// Get current context
const context = runner.context();
console.log(context); // { user: { name: 'Alice' }, isAuthenticated: true }

// Get hierarchical state value
const stateValue = runner.stateValue();
console.log(stateValue); // { editing: 'bold' } for compound states
```

### Machine Snapshot

Get a complete snapshot of the machine:

```typescript
const snapshot = runner.snapshot();

console.log(snapshot.state); // Current state
console.log(snapshot.context); // Current context
console.log(snapshot.activities); // Active activities
console.log(snapshot.pendingEvents); // Queued events
console.log(snapshot.stateValue); // Hierarchical state

// Check if in specific state
if (snapshot.matches("loading")) {
  console.log("Currently loading...");
}

// Check if can transition
if (snapshot.can({ type: "SUBMIT" })) {
  console.log("Submit is available");
}
```

### State Matching

Check state with path notation:

```typescript
// Simple state check
if (runner.snapshot().matches("idle")) {
  // In idle state
}

// Compound state check
if (runner.snapshot().matches("form.editing")) {
  // In form.editing state
}

// Check any child state
if (runner.snapshot().matches("form.*")) {
  // In any form substate
}
```

## Subscribing to Transitions

React to state changes:

```typescript
// Subscribe to all transitions
const unsubscribe = runner.subscribe(snapshot => {
  console.log(`Transitioned to: ${snapshot.state}`);
  console.log(`Context:`, snapshot.context);
});

// Clean up subscription
unsubscribe();

// Subscribe with detailed handler
runner.subscribe((snapshot, event) => {
  console.log(`Event ${event?.type} caused transition to ${snapshot.state}`);

  // Update UI
  updateUI(snapshot);

  // Log to analytics
  analytics.track("state_change", {
    from: event?.from,
    to: snapshot.state,
    event: event?.type,
  });
});
```

## Activity Management

### Checking Activity Status

Monitor running activities:

```typescript
// Get status of specific activity
const status = runner.getActivityStatus("dataPoller");

if (status) {
  console.log(`Activity status: ${status.status}`);
  console.log(`Running for: ${Date.now() - status.startTime}ms`);

  if (status.status === "completed") {
    console.log("Result:", status.result);
  } else if (status.status === "failed") {
    console.error("Error:", status.error);
  }
}

// Get all activities from snapshot
const snapshot = runner.snapshot();
for (const [id, activity] of Object.entries(snapshot.activities)) {
  console.log(`${id}: ${activity.status}`);
}
```

## Effect Execution

### Basic Executor

The basic executor handles common effects:

```typescript
import { createBasicExecutor } from "@hex-di/flow";

const executor = createBasicExecutor();

const runner = createMachineRunner(machine, {
  executor,
  activityManager: createActivityManager(),
});

// Basic executor handles:
// - Effect.delay()
// - Effect.none()
// - Effect.parallel()
// - Effect.sequence()
```

### Custom Effect Executor

Implement custom effect handling:

```typescript
import { EffectExecutor, EffectAny } from "@hex-di/flow";

class CustomExecutor implements EffectExecutor {
  async execute(effect: EffectAny, context: any): Promise<unknown> {
    switch (effect._tag) {
      case "invoke":
        // Custom invoke handling
        return this.handleInvoke(effect);

      case "log":
        // Custom logging
        console.log(`[${new Date().toISOString()}] ${effect.message}`);
        return;

      case "spawn":
        // Custom activity spawning
        return this.handleSpawn(effect);

      default:
        throw new Error(`Unsupported effect: ${effect._tag}`);
    }
  }

  private async handleInvoke(effect: any) {
    // Implementation
  }

  private async handleSpawn(effect: any) {
    // Implementation
  }
}

const runner = createMachineRunner(machine, {
  executor: new CustomExecutor(),
});
```

## History Tracking

Access transition and effect history:

```typescript
// Configure history tracking
const runner = createMachineRunner(machine, {
  history: {
    maxTransitions: 100,
    maxEffects: 200,
  },
});

// Get transition history
const transitions = runner.getTransitionHistory();
for (const entry of transitions) {
  console.log(`${entry.from} -> ${entry.to} via ${entry.event.type}`);
  console.log(`  Timestamp: ${entry.timestamp}`);
  console.log(`  Guards passed: ${entry.guardsEvaluated}`);
}

// Get effect history
const effects = runner.getEffectHistory();
for (const entry of effects) {
  console.log(`Effect: ${entry.effect._tag}`);
  console.log(`  State: ${entry.state}`);
  console.log(`  Timestamp: ${entry.timestamp}`);
  console.log(`  Duration: ${entry.duration}ms`);
  console.log(`  Success: ${entry.success}`);
}
```

## Runner Options

Configure runner behavior:

```typescript
interface MachineRunnerOptions {
  // Effect executor
  executor?: EffectExecutor;

  // Activity manager
  activityManager?: ActivityManager;

  // Transition collector for DevTools
  collector?: FlowCollector;

  // Distributed tracing hook
  tracingHook?: FlowTracingHook;

  // Maximum event queue size
  maxQueueSize?: number;

  // History configuration
  history?: HistoryConfig;

  // Custom clock for timestamps
  clock?: Clock;

  // Event validation function
  eventValidator?: (event: unknown) => boolean;

  // Enforce pure guards (no side effects)
  enforcePureGuards?: boolean;
}

// Full configuration example
const runner = createMachineRunner(machine, {
  executor: createDIEffectExecutor({ container }),
  activityManager: createActivityManager({ maxConcurrent: 10 }),
  collector: new FlowMemoryCollector({ maxTransitions: 1000 }),
  maxQueueSize: 50,
  history: {
    maxTransitions: 100,
    maxEffects: 200,
  },
  clock: new SystemClock(),
  eventValidator: event => {
    // Custom validation logic
    return typeof event === "object" && "type" in event;
  },
  enforcePureGuards: true, // Throw if guard has side effects
});
```

## Re-entrant Event Queue

The runner handles re-entrant events (events emitted during transitions):

```typescript
const machine = defineMachine({
  id: "cascade",
  initial: "idle",
  states: {
    idle: {
      on: {
        START: {
          target: "processing",
          effects: [
            // This effect emits an event during transition
            Effect.emit({ type: "CONTINUE" }),
          ],
        },
      },
    },
    processing: {
      on: {
        CONTINUE: {
          target: "done",
          effects: [Effect.log("Continued from emitted event")],
        },
      },
    },
    done: {},
  },
});

const runner = createMachineRunner(machine);
runner.send({ type: "START" });
// After START, CONTINUE is automatically processed
console.log(runner.state()); // 'done'
```

## Disposal

Clean up resources when done:

```typescript
// Dispose of runner and all activities
runner.dispose();

// Check if disposed
try {
  runner.send({ type: "EVENT" });
} catch (error) {
  console.error("Runner is disposed");
}

// Disposal also:
// - Cancels all running activities
// - Clears event queue
// - Removes all subscriptions
// - Clears history
```

## Best Practices

1. **Always dispose runners**: Clean up to prevent memory leaks
2. **Handle async effects**: Use sendAndExecute for critical operations
3. **Subscribe early**: Set up subscriptions before sending events
4. **Monitor activities**: Check status of long-running processes
5. **Use appropriate queue size**: Prevent unbounded growth
6. **Enable history in development**: Useful for debugging
7. **Validate events in production**: Ensure data integrity
8. **Use pure guards**: Enable enforcePureGuards for safety
