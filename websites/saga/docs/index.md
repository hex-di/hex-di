---
sidebar_position: 1
title: Introduction
---

# @hex-di/saga

Type-safe saga orchestration for distributed transactions with compensation and checkpointing.

## Overview

The `@hex-di/saga` library provides a robust framework for building and executing complex distributed transactions with automatic compensation, persistence, and full type safety. Built on the HexDI container, it enables clean separation between orchestration logic and business services through ports and adapters.

## Features

- **Type-safe step and saga builders** - Full TypeScript inference for inputs, outputs, and errors
- **Three compensation strategies** - Sequential, parallel, or best-effort rollback on failure
- **Write-ahead checkpointing** - Resume execution after crashes with configurable policies
- **Advanced composition** - Sequential, parallel, branching, and sub-saga composition
- **Dead-letter queue** - Handle failed compensations with retry capabilities
- **Full event tracing** - Detailed execution traces with timing and error information
- **DI integration** - Seamless integration with HexDI container and port resolution
- **React hooks** - Ready-to-use React integration for UI workflows

## Installation

```bash
pnpm add @hex-di/saga
```

Optional packages:

```bash
pnpm add @hex-di/saga-testing  # Testing utilities
pnpm add @hex-di/saga-react    # React integration
```

## Quick Start

Here's a simple order processing saga that demonstrates the core concepts:

```typescript
import { defineStep, defineSaga, createSagaRunner, executeSaga } from "@hex-di/saga";
import { ok, err } from "neverthrow";

// Define a step for order validation
const ValidateOrderStep = defineStep({
  name: "ValidateOrder",
  port: OrderValidationPort,
  execute: async (input: OrderInput, port) => {
    const validation = await port.validate(input.orderId);
    return validation.valid
      ? ok({ orderId: input.orderId, validated: true })
      : err({ code: "INVALID_ORDER", message: validation.reason });
  },
  compensate: async context => {
    // Cleanup validation state if needed
    await context.port.cancelValidation(context.input.orderId);
    return ok(undefined);
  },
  retry: { maxAttempts: 3, delay: 1000 },
});

// Define a step for inventory reservation
const ReserveInventoryStep = defineStep({
  name: "ReserveInventory",
  port: InventoryPort,
  execute: async (input: { orderId: string }, port) => {
    const reservation = await port.reserve(input.orderId);
    return reservation.isOk()
      ? ok({ reservationId: reservation.value })
      : err({ code: "OUT_OF_STOCK" });
  },
  compensate: async context => {
    // Release the reservation
    const result = context.results.ReserveInventory;
    if (result?.reservationId) {
      await context.port.release(result.reservationId);
    }
    return ok(undefined);
  },
});

// Define a step for payment processing
const ChargePaymentStep = defineStep({
  name: "ChargePayment",
  port: PaymentPort,
  execute: async (input: { orderId: string; amount: number }, port) => {
    const charge = await port.charge(input.orderId, input.amount);
    return charge.isOk() ? ok({ transactionId: charge.value }) : err({ code: "PAYMENT_FAILED" });
  },
  compensate: async context => {
    // Refund the payment
    const result = context.results.ChargePayment;
    if (result?.transactionId) {
      await context.port.refund(result.transactionId);
    }
    return ok(undefined);
  },
  timeout: 5000, // 5 second timeout for payment
});

// Compose steps into a saga
const OrderProcessingSaga = defineSaga("OrderProcessing")
  .input<OrderInput>()
  .step(ValidateOrderStep)
  .step(ReserveInventoryStep)
  .step(ChargePaymentStep)
  .output(results => ({
    orderId: results.ValidateOrder.orderId,
    reservationId: results.ReserveInventory.reservationId,
    transactionId: results.ChargePayment.transactionId,
    status: "completed" as const,
  }))
  .options({
    compensationStrategy: "sequential",
    persistent: true,
    timeout: 30000, // 30 second overall timeout
  })
  .build();

// Execute the saga
const runner = createSagaRunner(portResolver, {
  persister: sagaPersister,
  tracingHook: sagaTracer,
});

const result = await executeSaga(
  runner,
  OrderProcessingSaga,
  { orderId: "order-123", amount: 99.99 },
  {
    executionId: "exec-456",
    metadata: { userId: "user-789" },
  }
);

if (result.isOk()) {
  console.log("Order completed:", result.value);
} else {
  console.error("Order failed:", result.error);
  // Compensation will have run automatically
}
```

## Core Concepts

The library is built around several key concepts:

- **Steps** - Individual units of work with optional compensation logic
- **Sagas** - Compositions of steps with defined execution flow
- **Compensation** - Automatic rollback on failure with configurable strategies
- **Checkpointing** - Persistence points for crash recovery
- **Ports** - Abstract interfaces for external service dependencies

## What's Next

- [Learn about Steps](concepts/steps) - The building blocks of sagas
- [Understand Sagas](concepts/sagas) - How to compose steps into workflows
- [Explore Compensation](concepts/compensation) - Rollback strategies and dead-letter handling
- [Read about Execution](concepts/execution) - Runtime behavior and event system
- [Build Your First Saga](guides/building-sagas) - Step-by-step guide
