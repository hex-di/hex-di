---
sidebar_position: 1
title: Steps
---

# Steps

Steps are the fundamental building blocks of sagas. Each step represents a single unit of work with optional compensation logic for rollback scenarios.

## Defining Steps

Steps are created using the `defineStep` factory function, which provides full type inference for inputs, outputs, errors, and port dependencies:

```typescript
import { defineStep } from "@hex-di/saga";
import { ok, err } from "neverthrow";

const ValidateOrderStep = defineStep({
  name: "ValidateOrder",
  port: OrderValidationPort,
  execute: async (input, port) => {
    const validation = await port.validate(input.orderId);
    return validation.valid
      ? ok({ orderId: input.orderId, validated: true })
      : err({ code: "INVALID_ORDER", message: validation.reason });
  },
  compensate: async context => {
    await context.port.cancelValidation(context.input.orderId);
    return ok(undefined);
  },
  retry: { maxAttempts: 3, delay: 1000, backoff: "exponential" },
  timeout: 5000,
  condition: (input, results) => input.requiresValidation !== false,
});
```

## Step Configuration

### name

The step name must be a literal string type that uniquely identifies the step within a saga:

```typescript
const MyStep = defineStep({
  name: "MyStep", // Literal type: "MyStep"
  // ...
});
```

The name is used as a key in the accumulated results and for event tracking.

### port

The port dependency defines which service the step requires for execution:

```typescript
const PaymentStep = defineStep({
  name: "ProcessPayment",
  port: PaymentServicePort, // Port dependency
  execute: async (input, port) => {
    // 'port' is the resolved service instance
    return await port.charge(input.amount);
  },
});
```

### execute

The execute function performs the step's primary work:

```typescript
execute: async (input: TInput, port: TPort) => {
  // Perform work using the port service
  // Must return ResultAsync<TOutput, TError>
  return ok(output) || err(error);
};
```

The function receives:

- `input`: The step input (either saga input or mapped from previous steps)
- `port`: The resolved port service instance

### compensate (optional)

The compensate function defines rollback logic when the saga fails:

```typescript
compensate: async (context: CompensationContext) => {
  // Context provides:
  // - context.input: Original step input
  // - context.results: Accumulated results up to this step
  // - context.originalError: The error that triggered compensation
  // - context.port: The port service instance

  // Perform cleanup/rollback
  return ok(undefined) || err(compensationError);
};
```

### retry (optional)

Configure automatic retry behavior for transient failures:

```typescript
retry: {
  maxAttempts: 3,        // Maximum retry attempts
  delay: 1000,           // Initial delay in milliseconds
  backoff: "exponential" // Backoff strategy: "linear" | "exponential" | "fixed"
}
```

Backoff strategies:

- **fixed**: Same delay between all retries
- **linear**: Delay increases linearly (delay \* attemptNumber)
- **exponential**: Delay doubles with each attempt

### timeout (optional)

Set a maximum execution time for the step in milliseconds:

```typescript
timeout: 5000; // 5 second timeout
```

If the step exceeds this timeout, it will be cancelled and marked as failed with a `TimeoutError`.

### condition (optional)

Define a condition that determines whether the step should execute:

```typescript
condition: (input, results) => {
  // Return true to execute, false to skip
  return input.orderTotal > 100;
};
```

The condition receives:

- `input`: The step's input
- `results`: Accumulated results from previous steps

Skipped steps emit a `StepSkippedEvent` and don't contribute to the results.

## Step Context

During execution, steps operate within a context that provides:

```typescript
interface StepContext {
  executionId: string; // Unique execution identifier
  stepName: string; // Current step name
  stepIndex: number; // Position in execution order
  attemptNumber: number; // Current retry attempt (1-based)
  startedAt: Date; // Step start time
}
```

## Compensation Context

When compensation runs, it receives additional context:

```typescript
interface CompensationContext<TInput, TResults, TPort> {
  input: TInput; // Original step input
  results: TResults; // Accumulated results
  originalError: unknown; // Error that triggered compensation
  port: TPort; // Port service instance
  executionId: string; // Execution identifier
  stepName: string; // Step being compensated
}
```

## Type Inference

The library provides utility types for extracting step information:

```typescript
// Extract step name
type Name = InferStepName<typeof MyStep>; // "MyStep"

// Extract input type
type Input = InferStepInput<typeof MyStep>;

// Extract output type
type Output = InferStepOutput<typeof MyStep>;

// Extract error type
type Error = InferStepError<typeof MyStep>;

// Extract port type
type Port = InferStepPort<typeof MyStep>;
```

## Best Practices

### Keep Steps Focused

Each step should represent a single, cohesive unit of work:

```typescript
// Good: Focused responsibility
const ReserveInventoryStep = defineStep({
  name: "ReserveInventory",
  port: InventoryPort,
  execute: async (input, port) => {
    return await port.reserve(input.items);
  },
});

// Avoid: Multiple responsibilities
const ProcessOrderStep = defineStep({
  name: "ProcessOrder",
  port: MultiServicePort,
  execute: async (input, port) => {
    await port.validateOrder(input);
    await port.reserveInventory(input);
    await port.chargePayment(input);
    // Too many responsibilities in one step
  },
});
```

### Always Define Compensation

If a step makes changes that should be reversed on failure, always define compensation:

```typescript
const CreateResourceStep = defineStep({
  name: "CreateResource",
  port: ResourcePort,
  execute: async (input, port) => {
    const resource = await port.create(input);
    return ok({ resourceId: resource.id });
  },
  compensate: async context => {
    // Clean up the created resource
    const result = context.results.CreateResource;
    if (result?.resourceId) {
      await context.port.delete(result.resourceId);
    }
    return ok(undefined);
  },
});
```

### Use Appropriate Timeouts

Set reasonable timeouts based on expected operation duration:

```typescript
const QuickValidationStep = defineStep({
  name: "QuickValidation",
  port: ValidationPort,
  execute: async (input, port) => {
    return await port.validate(input);
  },
  timeout: 1000, // 1 second for quick validation
});

const SlowProcessingStep = defineStep({
  name: "SlowProcessing",
  port: ProcessingPort,
  execute: async (input, port) => {
    return await port.process(input);
  },
  timeout: 30000, // 30 seconds for heavy processing
});
```

### Handle Errors Gracefully

Return structured errors with meaningful information:

```typescript
const PaymentStep = defineStep({
  name: "ProcessPayment",
  port: PaymentPort,
  execute: async (input, port) => {
    const result = await port.charge(input);

    if (result.isOk()) {
      return ok({ transactionId: result.value });
    }

    // Return structured error
    return err({
      code: "PAYMENT_FAILED",
      message: result.error.message,
      details: {
        amount: input.amount,
        currency: input.currency,
        reason: result.error.reason,
      },
    });
  },
});
```

## Next Steps

- [Learn about Sagas](sagas) - How to compose steps into workflows
- [Understand Compensation](compensation) - Rollback strategies for failed steps
- [Explore the API](../api/api-reference) - Complete step API reference
