---
sidebar_position: 2
title: Sagas
---

# Sagas

Sagas orchestrate multiple steps into complex workflows with defined execution flows, error handling, and compensation strategies.

## The Saga Builder

The `defineSaga` function provides a progressive builder pattern that guides you through creating type-safe sagas:

```typescript
import { defineSaga } from "@hex-di/saga";

const OrderProcessingSaga = defineSaga("OrderProcessing")
  .input<OrderInput>()
  .step(ValidateOrderStep)
  .step(ReserveInventoryStep)
  .parallel([NotifyWarehouseStep, UpdateAnalyticsStep])
  .branch((input, results) => results.ValidateOrder.orderType, {
    express: [ExpressShippingStep],
    standard: [StandardShippingStep],
    pickup: [StorePickupStep],
  })
  .saga(SubSaga, (input, results) => ({
    orderId: results.ValidateOrder.orderId,
  }))
  .output(results => ({
    orderId: results.ValidateOrder.orderId,
    status: "completed" as const,
  }))
  .options({
    compensationStrategy: "sequential",
    persistent: true,
  })
  .validate(input => {
    if (!input.orderId) {
      return err({ code: "MISSING_ORDER_ID" });
    }
    return ok(input);
  })
  .version("1.0.0")
  .build();
```

## Builder Stages

The saga builder follows a three-stage progression:

### Stage 1: Name Definition

```typescript
const saga = defineSaga("MySagaName");
```

The saga name must be a literal string type.

### Stage 2: Input Definition

```typescript
.input<MyInputType>()
```

Define the input type the saga will receive. This type flows through to all steps and mappers.

### Stage 3: Step Composition

Add steps using various composition methods:

#### Sequential Steps

Execute steps one after another:

```typescript
.step(FirstStep)
.step(SecondStep)
.step(ThirdStep)
```

Each step receives the saga input and can access results from previous steps.

#### Parallel Steps

Execute multiple steps concurrently:

```typescript
.parallel([
  StepA,
  StepB,
  StepC
])
```

All parallel steps start simultaneously and the saga waits for all to complete.

#### Branching

Conditionally execute different step sequences:

```typescript
.branch(
  (input, results) => {
    // Return a branch key
    return input.customerType;
  },
  {
    premium: [PremiumFlowStep, BonusStep],
    standard: [StandardFlowStep],
    guest: [GuestFlowStep, VerificationStep]
  }
)
```

The selector function determines which branch to execute based on input and accumulated results.

#### Sub-Sagas

Compose sagas within sagas:

```typescript
.saga(
  PaymentProcessingSaga,
  (input, results) => ({
    // Map input for the sub-saga
    amount: input.orderTotal,
    customerId: results.ValidateOrder.customerId
  })
)
```

Sub-sagas are fully independent executions with their own compensation.

### Stage 4: Output Mapping

Transform accumulated results into the saga output:

```typescript
.output((results) => ({
  orderId: results.ValidateOrder.orderId,
  paymentId: results.ProcessPayment.transactionId,
  shippingId: results.CreateShipment.trackingNumber
}))
```

## Saga Options

Configure saga behavior with options:

```typescript
.options({
  compensationStrategy: "sequential",
  persistent: true,
  maxConcurrency: 5,
  timeout: 60000,
  hooks: {
    beforeStep: async (context) => { /* ... */ },
    afterStep: async (context) => { /* ... */ },
    beforeCompensation: async (context) => { /* ... */ },
    afterCompensation: async (context) => { /* ... */ }
  },
  metadata: {
    team: "orders",
    sla: "critical"
  },
  checkpointPolicy: "swallow"
})
```

### compensationStrategy

Determines how compensation executes on failure:

- **"sequential"** (default): Reverse order, stops on first failure
- **"parallel"**: All compensations run concurrently
- **"best-effort"**: Reverse order, continues despite failures

### persistent

Enable persistence for crash recovery:

```typescript
persistent: true; // Enable checkpointing
```

### maxConcurrency

Limit concurrent step execution in parallel blocks:

```typescript
maxConcurrency: 5; // Maximum 5 concurrent steps
```

### timeout

Global saga execution timeout in milliseconds:

```typescript
timeout: 60000; // 60 second timeout
```

### hooks

Lifecycle hooks for observability and side effects:

```typescript
hooks: {
  beforeStep: async (context: StepHookContext) => {
    console.log(`Starting step: ${context.stepName}`);
  },
  afterStep: async (context: StepHookResultContext) => {
    console.log(`Step completed: ${context.stepName}`);
  },
  beforeCompensation: async (context: CompensationHookContext) => {
    console.log("Starting compensation");
  },
  afterCompensation: async (context: CompensationResultHookContext) => {
    console.log("Compensation completed");
  }
}
```

### metadata

Attach arbitrary metadata to the saga:

```typescript
metadata: {
  team: "orders",
  sla: "critical",
  region: "us-east"
}
```

### checkpointPolicy

Control checkpoint failure handling:

- **"swallow"** (default): Log and continue on checkpoint failure
- **"abort"**: Stop execution on checkpoint failure
- **"warn"**: Log warning and continue

## Input Validation

Add runtime validation for saga inputs:

```typescript
.validate((input) => {
  if (!input.orderId || !input.customerId) {
    return err({
      code: "INVALID_INPUT",
      message: "Missing required fields"
    });
  }

  if (input.amount <= 0) {
    return err({
      code: "INVALID_AMOUNT",
      message: "Amount must be positive"
    });
  }

  return ok(input);
})
```

## Versioning

Track saga versions for compatibility:

```typescript
.version("1.0.0")
```

Versions are checked when resuming persisted executions.

## Accumulated Results

As steps execute, their outputs accumulate in a typed results object:

```typescript
interface AccumulatedResults {
  [StepName: string]: StepOutput;
}
```

For example:

```typescript
const saga = defineSaga("Example")
  .input<{ orderId: string }>()
  .step(ValidateStep) // Output: { valid: boolean }
  .step(ProcessStep) // Output: { processId: string }
  .output(results => {
    // results type:
    // {
    //   Validate: { valid: boolean }
    //   Process: { processId: string }
    // }
    return {
      isValid: results.Validate.valid,
      id: results.Process.processId,
    };
  })
  .build();
```

## Type Safety

The saga builder provides complete type inference:

```typescript
// Infer saga types
type SagaName = InferSagaName<typeof MySaga>; // Literal name
type SagaInput = InferSagaInput<typeof MySaga>; // Input type
type SagaOutput = InferSagaOutput<typeof MySaga>; // Output type
type SagaSteps = InferSagaSteps<typeof MySaga>; // Step union
type SagaErrors = InferSagaErrors<typeof MySaga>; // Error union

// Get step output by name
type ValidateOutput = InferStepOutputByName<typeof MySaga, "Validate">;
```

## Advanced Patterns

### Conditional Execution

Skip steps based on conditions:

```typescript
const ConditionalSaga = defineSaga("Conditional")
  .input<{ skipValidation?: boolean }>()
  .step(ValidateStep) // Has condition: (input) => !input.skipValidation
  .step(ProcessStep)
  .build();
```

### Dynamic Branching

Branch based on accumulated results:

```typescript
.branch(
  (input, results) => {
    // Branch based on previous step results
    if (results.RiskAssessment.score > 80) {
      return "high-risk";
    } else if (results.RiskAssessment.score > 40) {
      return "medium-risk";
    } else {
      return "low-risk";
    }
  },
  {
    "high-risk": [ManualReviewStep, ApprovalStep],
    "medium-risk": [AutomatedReviewStep],
    "low-risk": [FastTrackStep]
  }
)
```

### Nested Parallel Execution

Combine parallel and sequential patterns:

```typescript
.step(InitializeStep)
.parallel([
  ValidationStep,
  EnrichmentStep
])
.step(ProcessStep)
.parallel([
  NotificationStep,
  AuditStep,
  MetricsStep
])
.step(FinalizeStep)
```

### Error Aggregation

Collect errors from parallel steps:

```typescript
.parallel([StepA, StepB, StepC])
.output((results, errors) => {
  // Handle both successes and failures
  const successful = Object.keys(results).length;
  const failed = Object.keys(errors).length;

  return {
    successful,
    failed,
    results
  };
})
```

## Best Practices

### Name Sagas Clearly

Use descriptive names that indicate the business process:

```typescript
// Good
defineSaga("OrderFulfillment");
defineSaga("PaymentProcessing");
defineSaga("UserOnboarding");

// Avoid
defineSaga("Saga1");
defineSaga("Process");
defineSaga("Handler");
```

### Keep Sagas Focused

Each saga should represent a cohesive business transaction:

```typescript
// Good: Focused on order processing
const OrderSaga = defineSaga("OrderProcessing")
  .input<OrderInput>()
  .step(ValidateOrderStep)
  .step(ReserveInventoryStep)
  .step(ProcessPaymentStep)
  .step(CreateShipmentStep)
  .build();

// Avoid: Too many unrelated concerns
const EverythingSaga = defineSaga("Everything")
  .input<AnyInput>()
  .step(OrderStep)
  .step(UserProfileStep)
  .step(EmailCampaignStep)
  .step(ReportGenerationStep)
  .build();
```

### Use Sub-Sagas for Reusability

Extract common workflows into reusable sub-sagas:

```typescript
const PaymentSaga = defineSaga("Payment")
  .input<PaymentInput>()
  .step(ValidatePaymentStep)
  .step(ProcessPaymentStep)
  .step(RecordTransactionStep)
  .build();

// Reuse in multiple parent sagas
const OrderSaga = defineSaga("Order")
  .input<OrderInput>()
  .step(ValidateOrderStep)
  .saga(PaymentSaga, mapToPaymentInput)
  .build();

const SubscriptionSaga = defineSaga("Subscription")
  .input<SubscriptionInput>()
  .step(ValidateSubscriptionStep)
  .saga(PaymentSaga, mapToPaymentInput)
  .build();
```

## Next Steps

- [Learn about Compensation](compensation) - Rollback strategies for failed sagas
- [Understand Execution](execution) - How sagas run and emit events
- [Build Your First Saga](../guides/building-sagas) - Step-by-step guide
