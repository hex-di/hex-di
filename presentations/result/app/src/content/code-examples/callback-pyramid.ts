import type { CodeExample } from "../../ports/code-examples.port.js";

export const example: CodeExample = {
  id: "callback-pyramid",
  title: "The Error Tower",
  before: {
    code: `async function processOrder(orderId: string): Promise<Receipt> {
  let order: Order;
  try {
    order = await fetchOrder(orderId);
  } catch (e: unknown) {
    throw new Error(\`Fetch failed: \${String(e)}\`);
  }
  let validated: ValidatedOrder;
  try {
    validated = await validateInventory(order);
  } catch (e: unknown) {
    throw new Error(\`Validation failed: \${String(e)}\`);
  }
  try {
    return await chargePayment(validated);
  } catch (e: unknown) {
    throw new Error(\`Payment failed: \${String(e)}\`);
  }
}`,
    language: "typescript",
    filename: "order-pipeline.service.ts",
    annotations: [
      { line: 4, text: "catch (e: unknown) -- every block starts from scratch", type: "error" },
      { line: 6, text: "Context destroyed: was it a 404 or a network timeout?", type: "error" },
      { line: 12, text: "Same pattern, same unknown, same context loss", type: "error" },
      { line: 17, text: "Three blocks, three unknowns, zero type safety", type: "error" },
    ],
  },
  after: {
    code: `function processOrder(orderId: string): ResultAsync<Receipt, OrderError> {
  return safeTry(async function* () {
    const order = yield* await fetchOrder(orderId);
    const validated = yield* await validateInventory(order);
    const receipt = yield* await chargePayment(validated);
    return ok(receipt);
  });
}
result.match(
  (receipt) => showConfirmation(receipt),
  (error) => {
    switch (error._tag) {
      case "FetchError": showRetry("Could not load order"); break;
      case "StockError": showStockAlert(error.items); break;
      case "PaymentError": showPaymentHelp(error.reason); break;
    }
  }
);`,
    language: "typescript",
    filename: "order-pipeline.service.ts",
    annotations: [
      { line: 1, text: "Return type: all 3 error types visible", type: "ok" },
      { line: 3, text: "yield* stops on first error -- zero nesting", type: "ok" },
      { line: 12, text: "Each error type gets specific UI treatment", type: "ok" },
    ],
  },
};
