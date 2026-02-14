/**
 * Saga Workflow Orchestration
 *
 * Shows a multi-step Saga with compensation and rollback.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import { port, createAdapter } from "@hex-di/core";
import { sagaPort } from "@hex-di/saga";
import { LoggerPort, createConsoleLogger } from "@hex-di/logger";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

// Saga step result
interface StepResult {
  readonly success: boolean;
  readonly message: string;
}

// Domain service ports (core ports, not library-specific)
interface Payment {
  charge(orderId: string, amount: number): StepResult;
  refund(orderId: string): StepResult;
}
interface Inventory {
  reserve(orderId: string, item: string): StepResult;
  release(orderId: string): StepResult;
}

const PaymentPort = port<Payment>()({ name: "Payment" });
const InventoryPort = port<Inventory>()({ name: "Inventory" });

// Saga port using the saga library (sets category: "saga/saga")
interface OrderSagaResult {
  readonly success: boolean;
  readonly steps: readonly StepResult[];
}
const OrderSagaPort = sagaPort<string, OrderSagaResult>()({
  name: "OrderSaga",
  description: "Processes order with payment and inventory",
});

// Logger using the actual library port
const loggerAdapter = createAdapter({
  provides: LoggerPort,
  factory: () => createConsoleLogger(),
  lifetime: "singleton",
});

const paymentAdapter = createAdapter({
  provides: PaymentPort,
  requires: [LoggerPort],
  factory: ({ Logger }) => ({
    charge: (orderId: string, amount: number) => {
      Logger.info(\`Charging $\${amount} for order \${orderId}\`);
      return { success: true, message: \`Payment of $\${amount} charged\` };
    },
    refund: (orderId: string) => {
      Logger.info(\`Refunding order \${orderId}\`);
      return { success: true, message: "Payment refunded" };
    },
  }),
  lifetime: "singleton",
});

const inventoryAdapter = createAdapter({
  provides: InventoryPort,
  requires: [LoggerPort],
  factory: ({ Logger }) => ({
    reserve: (orderId: string, item: string) => {
      Logger.info(\`Reserving \${item} for order \${orderId}\`);
      if (item === "out-of-stock-item") {
        return { success: false, message: \`\${item} is out of stock\` };
      }
      return { success: true, message: \`\${item} reserved\` };
    },
    release: (orderId: string) => {
      Logger.info(\`Releasing inventory for order \${orderId}\`);
      return { success: true, message: "Inventory released" };
    },
  }),
  lifetime: "singleton",
});

const sagaAdapter = createAdapter({
  provides: OrderSagaPort,
  requires: [LoggerPort, PaymentPort, InventoryPort],
  factory: ({ Logger, Payment, Inventory }) => ({
    execute: (orderId: string) => {
      Logger.info(\`Starting saga for order \${orderId}\`);
      const steps: StepResult[] = [];

      // Step 1: Charge payment
      const paymentResult = Payment.charge(orderId, 99.99);
      steps.push(paymentResult);
      if (!paymentResult.success) {
        Logger.warn("Payment failed - saga aborted");
        return { success: false, steps };
      }

      // Step 2: Reserve inventory
      const inventoryResult = Inventory.reserve(orderId, "widget-A");
      steps.push(inventoryResult);
      if (!inventoryResult.success) {
        Logger.warn("Inventory failed - compensating...");
        const refundResult = Payment.refund(orderId);
        steps.push(refundResult);
        return { success: false, steps };
      }

      Logger.info(\`Saga completed for order \${orderId}\`);
      return { success: true, steps };
    },
  }),
  lifetime: "singleton",
});

const graph = GraphBuilder.create()
  .provide(loggerAdapter)
  .provide(paymentAdapter)
  .provide(inventoryAdapter)
  .provide(sagaAdapter)
  .build();

const container = createContainer({ graph, name: "SagaExample" });
const saga = container.resolve(OrderSagaPort);

// Successful saga
console.log("=== Order 1 (success) ===");
const result1 = saga.execute("order-1");
console.log("Result:", result1);

console.log("");
console.log("=== Saga orchestration complete ===");
`;

export const sagaOrchestration: ExampleTemplate = {
  id: "saga-orchestration",
  title: "Saga Workflow Orchestration",
  description: "Multi-step saga with compensation and rollback using DI",
  category: "libraries",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "overview",
};
