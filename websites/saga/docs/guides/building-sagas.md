---
sidebar_position: 1
title: Building Sagas
---

# Building Sagas

This guide walks through building a complete order processing saga from scratch, demonstrating key concepts and best practices.

## The Business Process

We'll implement an e-commerce order processing workflow with these steps:

1. Validate the order details
2. Check fraud risk score
3. Reserve inventory
4. Process payment
5. Create shipment
6. Send notifications

The process includes parallel execution, branching based on risk, and comprehensive compensation.

## Define the Ports

First, define the port interfaces for our services:

```typescript
import { port } from "@hex-di/core";

// Order validation service
interface OrderValidator {
  validate(orderId: string): Promise<{
    valid: boolean;
    customer: { id: string; tier: "standard" | "premium" };
    items: Array<{ sku: string; quantity: number }>;
  }>;
  markInvalid(orderId: string): Promise<void>;
}

export const OrderValidatorPort = port<OrderValidator>()({
  name: "OrderValidator",
  direction: "outbound",
});

// Fraud detection service
interface FraudDetector {
  checkRisk(
    customerId: string,
    amount: number
  ): Promise<{
    score: number;
    riskLevel: "low" | "medium" | "high";
    requiresReview: boolean;
  }>;
}

export const FraudDetectorPort = port<FraudDetector>()({
  name: "FraudDetector",
  direction: "outbound",
});

// Inventory service
interface InventoryService {
  reserve(items: Array<{ sku: string; quantity: number }>): Promise<{
    reservationId: string;
    expiresAt: Date;
  }>;
  release(reservationId: string): Promise<void>;
}

export const InventoryPort = port<InventoryService>()({
  name: "InventoryService",
  direction: "outbound",
});

// Payment service
interface PaymentService {
  authorize(
    amount: number,
    customerId: string
  ): Promise<{
    authorizationId: string;
  }>;
  capture(authorizationId: string): Promise<{
    transactionId: string;
  }>;
  void(authorizationId: string): Promise<void>;
  refund(transactionId: string): Promise<void>;
}

export const PaymentPort = port<PaymentService>()({
  name: "PaymentService",
  direction: "outbound",
});

// Shipping service
interface ShippingService {
  createShipment(
    orderId: string,
    items: any[]
  ): Promise<{
    shipmentId: string;
    trackingNumber: string;
    estimatedDelivery: Date;
  }>;
  cancelShipment(shipmentId: string): Promise<void>;
}

export const ShippingPort = port<ShippingService>()({
  name: "ShippingService",
  direction: "outbound",
});

// Notification service
interface NotificationService {
  sendOrderConfirmation(customerId: string, orderId: string): Promise<void>;
  sendShipmentNotification(customerId: string, tracking: string): Promise<void>;
  sendRiskAlert(orderId: string, riskLevel: string): Promise<void>;
}

export const NotificationPort = port<NotificationService>()({
  name: "NotificationService",
  direction: "outbound",
});
```

## Define the Steps

Create individual steps with execute and compensate logic:

```typescript
import { defineStep } from "@hex-di/saga";
import { ok, err } from "neverthrow";

// Step 1: Validate order
const ValidateOrderStep = defineStep({
  name: "ValidateOrder",
  port: OrderValidatorPort,
  execute: async (input: { orderId: string; amount: number }, port) => {
    const validation = await port.validate(input.orderId);

    if (!validation.valid) {
      return err({
        code: "INVALID_ORDER",
        message: "Order validation failed",
        orderId: input.orderId,
      });
    }

    return ok({
      orderId: input.orderId,
      customerId: validation.customer.id,
      customerTier: validation.customer.tier,
      items: validation.items,
    });
  },
  compensate: async context => {
    // Mark order as invalid if we need to rollback
    await context.port.markInvalid(context.input.orderId);
    return ok(undefined);
  },
  retry: {
    maxAttempts: 3,
    delay: 1000,
    backoff: "exponential",
  },
  timeout: 5000,
});

// Step 2: Check fraud risk
const CheckFraudRiskStep = defineStep({
  name: "CheckFraudRisk",
  port: FraudDetectorPort,
  execute: async (input: { customerId: string; amount: number }, port) => {
    const risk = await port.checkRisk(input.customerId, input.amount);

    if (risk.riskLevel === "high" && risk.score > 90) {
      return err({
        code: "HIGH_FRAUD_RISK",
        message: "Order blocked due to high fraud risk",
        score: risk.score,
      });
    }

    return ok({
      riskLevel: risk.riskLevel,
      score: risk.score,
      requiresReview: risk.requiresReview,
    });
  },
  // No compensation needed - read-only operation
  timeout: 3000,
});

// Step 3: Reserve inventory
const ReserveInventoryStep = defineStep({
  name: "ReserveInventory",
  port: InventoryPort,
  execute: async (input: { items: Array<{ sku: string; quantity: number }> }, port) => {
    try {
      const reservation = await port.reserve(input.items);
      return ok({
        reservationId: reservation.reservationId,
        expiresAt: reservation.expiresAt,
      });
    } catch (error) {
      return err({
        code: "INVENTORY_UNAVAILABLE",
        message: "Failed to reserve inventory",
        items: input.items,
      });
    }
  },
  compensate: async context => {
    const result = context.results.ReserveInventory;
    if (result?.reservationId) {
      await context.port.release(result.reservationId);
    }
    return ok(undefined);
  },
  retry: {
    maxAttempts: 2,
    delay: 2000,
  },
});

// Step 4a: Authorize payment
const AuthorizePaymentStep = defineStep({
  name: "AuthorizePayment",
  port: PaymentPort,
  execute: async (input: { amount: number; customerId: string }, port) => {
    try {
      const auth = await port.authorize(input.amount, input.customerId);
      return ok({ authorizationId: auth.authorizationId });
    } catch (error) {
      return err({
        code: "PAYMENT_FAILED",
        message: "Payment authorization failed",
      });
    }
  },
  compensate: async context => {
    const result = context.results.AuthorizePayment;
    if (result?.authorizationId) {
      await context.port.void(result.authorizationId);
    }
    return ok(undefined);
  },
  timeout: 10000,
});

// Step 4b: Capture payment
const CapturePaymentStep = defineStep({
  name: "CapturePayment",
  port: PaymentPort,
  execute: async (input: { authorizationId: string }, port) => {
    const capture = await port.capture(input.authorizationId);
    return ok({ transactionId: capture.transactionId });
  },
  compensate: async context => {
    const result = context.results.CapturePayment;
    if (result?.transactionId) {
      await context.port.refund(result.transactionId);
    }
    return ok(undefined);
  },
  timeout: 10000,
});

// Step 5: Create shipment
const CreateShipmentStep = defineStep({
  name: "CreateShipment",
  port: ShippingPort,
  execute: async (input: { orderId: string; items: any[] }, port) => {
    const shipment = await port.createShipment(input.orderId, input.items);
    return ok({
      shipmentId: shipment.shipmentId,
      trackingNumber: shipment.trackingNumber,
      estimatedDelivery: shipment.estimatedDelivery,
    });
  },
  compensate: async context => {
    const result = context.results.CreateShipment;
    if (result?.shipmentId) {
      await context.port.cancelShipment(result.shipmentId);
    }
    return ok(undefined);
  },
});

// Step 6a: Send order confirmation
const SendOrderConfirmationStep = defineStep({
  name: "SendOrderConfirmation",
  port: NotificationPort,
  execute: async (input: { customerId: string; orderId: string }, port) => {
    await port.sendOrderConfirmation(input.customerId, input.orderId);
    return ok({ notified: true });
  },
  // No compensation - notifications are not rolled back
});

// Step 6b: Send shipment notification
const SendShipmentNotificationStep = defineStep({
  name: "SendShipmentNotification",
  port: NotificationPort,
  execute: async (input: { customerId: string; trackingNumber: string }, port) => {
    await port.sendShipmentNotification(input.customerId, input.trackingNumber);
    return ok({ notified: true });
  },
});

// Manual review step for medium risk
const ManualReviewStep = defineStep({
  name: "ManualReview",
  port: OrderValidatorPort,
  execute: async (input: { orderId: string }, port) => {
    // In real implementation, this would create a review task
    console.log(`Manual review required for order ${input.orderId}`);
    return ok({ reviewed: true, approved: true });
  },
  timeout: 3600000, // 1 hour for manual review
});
```

## Compose the Saga

Now compose the steps into a complete saga with parallel execution and branching:

```typescript
import { defineSaga } from "@hex-di/saga";

interface OrderInput {
  orderId: string;
  amount: number;
}

const OrderProcessingSaga = defineSaga("OrderProcessing")
  .input<OrderInput>()

  // Validate order first
  .step(ValidateOrderStep)

  // Check fraud risk using validated customer data
  .step(CheckFraudRiskStep, (input, results) => ({
    customerId: results.ValidateOrder.customerId,
    amount: input.amount,
  }))

  // Branch based on risk level
  .branch((input, results) => results.CheckFraudRisk.riskLevel, {
    low: [
      // Low risk: proceed normally
    ],
    medium: [
      // Medium risk: require manual review
      ManualReviewStep,
    ],
    high: [
      // High risk already blocked in CheckFraudRiskStep
    ],
  })

  // Reserve inventory
  .step(ReserveInventoryStep, (input, results) => ({
    items: results.ValidateOrder.items,
  }))

  // Process payment in two phases
  .step(AuthorizePaymentStep, (input, results) => ({
    amount: input.amount,
    customerId: results.ValidateOrder.customerId,
  }))
  .step(CapturePaymentStep, (input, results) => ({
    authorizationId: results.AuthorizePayment.authorizationId,
  }))

  // Create shipment
  .step(CreateShipmentStep, (input, results) => ({
    orderId: input.orderId,
    items: results.ValidateOrder.items,
  }))

  // Send notifications in parallel (non-critical)
  .parallel([SendOrderConfirmationStep, SendShipmentNotificationStep], (input, results) => [
    {
      customerId: results.ValidateOrder.customerId,
      orderId: input.orderId,
    },
    {
      customerId: results.ValidateOrder.customerId,
      trackingNumber: results.CreateShipment.trackingNumber,
    },
  ])

  // Map output
  .output(results => ({
    orderId: results.ValidateOrder.orderId,
    customerId: results.ValidateOrder.customerId,
    transactionId: results.CapturePayment.transactionId,
    shipmentId: results.CreateShipment.shipmentId,
    trackingNumber: results.CreateShipment.trackingNumber,
    estimatedDelivery: results.CreateShipment.estimatedDelivery,
    status: "completed" as const,
  }))

  // Configure saga options
  .options({
    compensationStrategy: "sequential",
    persistent: true,
    timeout: 120000, // 2 minute overall timeout
    hooks: {
      beforeStep: async context => {
        console.log(`Starting step: ${context.stepName}`);
      },
      afterStep: async context => {
        console.log(`Completed step: ${context.stepName} in ${context.duration}ms`);
      },
      beforeCompensation: async context => {
        console.log(`Starting compensation due to: ${context.reason}`);
      },
      afterCompensation: async context => {
        console.log(
          `Compensation completed: ${context.result.allSucceeded ? "success" : "partial"}`
        );
      },
    },
    metadata: {
      team: "orders",
      version: "1.0.0",
      sla: "critical",
    },
    checkpointPolicy: "abort", // Fail fast on checkpoint errors
  })

  // Add input validation
  .validate(input => {
    if (!input.orderId) {
      return err({ code: "MISSING_ORDER_ID" });
    }
    if (input.amount <= 0) {
      return err({ code: "INVALID_AMOUNT" });
    }
    return ok(input);
  })

  .version("1.0.0")
  .build();
```

## Execute the Saga

Set up the runner and execute the saga:

```typescript
import { createSagaRunner, executeSaga, createInMemoryPersister } from "@hex-di/saga";
import { createContainer } from "@hex-di/core";

// Create DI container with services
const container = createContainer()
  .addAdapter(createOrderValidatorAdapter())
  .addAdapter(createFraudDetectorAdapter())
  .addAdapter(createInventoryAdapter())
  .addAdapter(createPaymentAdapter())
  .addAdapter(createShippingAdapter())
  .addAdapter(createNotificationAdapter())
  .build();

// Create port resolver
const portResolver: PortResolver = async port => {
  const service = await container.resolve(port);
  if (!service) {
    throw new Error(`Port not found: ${port.name}`);
  }
  return service;
};

// Create saga runner
const runner = createSagaRunner(portResolver, {
  persister: createInMemoryPersister(),
  suppressGxpWarnings: false,
});

// Execute the saga
async function processOrder(orderId: string, amount: number) {
  const executionId = `order-${orderId}-${Date.now()}`;

  // Subscribe to events
  const unsubscribe = runner.subscribe(executionId, event => {
    console.log(`[${event.type}] ${JSON.stringify(event)}`);
  });

  try {
    const result = await executeSaga(
      runner,
      OrderProcessingSaga,
      { orderId, amount },
      {
        executionId,
        metadata: {
          source: "web",
          timestamp: new Date().toISOString(),
        },
      }
    );

    if (result.isOk()) {
      console.log("Order processed successfully:", result.value);
      return result.value;
    } else {
      console.error("Order processing failed:", result.error);
      throw result.error;
    }
  } finally {
    unsubscribe();
  }
}

// Use the saga
processOrder("order-123", 299.99)
  .then(result => {
    console.log("Success:", result);
  })
  .catch(error => {
    console.error("Failed:", error);
  });
```

## Best Practices

### Use Saga Hooks for Observability

Implement comprehensive logging and metrics:

```typescript
const hooks: SagaHooks = {
  beforeStep: async context => {
    metrics.increment("saga.step.started", {
      saga: context.sagaName,
      step: context.stepName,
    });
  },

  afterStep: async context => {
    metrics.histogram("saga.step.duration", context.duration, {
      saga: context.sagaName,
      step: context.stepName,
      status: context.result.isOk() ? "success" : "failure",
    });

    if (context.result.isErr()) {
      logger.error("Step failed", {
        saga: context.sagaName,
        step: context.stepName,
        error: context.result.error,
      });
    }
  },

  beforeCompensation: async context => {
    alerting.notify({
      level: "warning",
      message: `Compensation started for ${context.sagaName}`,
      reason: context.reason,
    });
  },

  afterCompensation: async context => {
    if (!context.result.allSucceeded) {
      alerting.notify({
        level: "error",
        message: `Compensation partially failed for ${context.sagaName}`,
        failedSteps: context.result.failedSteps,
      });
    }
  },
};
```

### Implement Input Validation

Always validate inputs to fail fast:

```typescript
.validate((input) => {
  // Type checks
  if (typeof input.orderId !== "string") {
    return err({ code: "INVALID_TYPE", field: "orderId" });
  }

  // Business rules
  if (input.amount > 10000) {
    return err({ code: "AMOUNT_TOO_HIGH", max: 10000 });
  }

  // Format validation
  if (!input.orderId.match(/^order-\d+$/)) {
    return err({ code: "INVALID_FORMAT", field: "orderId" });
  }

  return ok(input);
})
```

### Use Metadata for Tracing

Add contextual metadata for debugging:

```typescript
await executeSaga(runner, saga, input, {
  executionId: `${saga.name}-${uuid()}`,
  metadata: {
    userId: currentUser.id,
    sessionId: session.id,
    requestId: request.id,
    source: "api",
    version: "1.0.0",
    environment: process.env.NODE_ENV,
  },
});
```

### Handle Different Risk Levels

Use branching for business logic variations:

```typescript
.branch(
  (input, results) => {
    const risk = results.CheckFraudRisk;
    if (risk.score > 80) return "block";
    if (risk.score > 50) return "review";
    if (results.ValidateOrder.customerTier === "premium") return "fast-track";
    return "standard";
  },
  {
    block: [
      BlockOrderStep,
      NotifySecurityStep
    ],
    review: [
      ManualReviewStep,
      AdditionalVerificationStep
    ],
    "fast-track": [
      ExpressProcessingStep,
      PriorityShippingStep
    ],
    standard: [
      StandardProcessingStep
    ]
  }
)
```

## Next Steps

- [Learn about Persistence](persistence) - Save and resume saga state
- [Explore DI Integration](di-integration) - Container setup for sagas
- [Read about Testing](../testing) - Test your sagas effectively
