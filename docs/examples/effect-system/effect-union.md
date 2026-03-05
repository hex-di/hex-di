# Effect Union

Demonstrates `EffectUnion` — computing the union of all effects from a tuple of Result types, useful for orchestrating multiple concurrent operations.

**Domain:** E-commerce checkout orchestrator — parallel validation of inventory, payment, and shipping.

## Code

```typescript
import { ok, err, type Result, type EffectUnion, type EffectOf, all } from "@hex-di/result";

// --- Domain errors ---
type OutOfStock = { readonly _tag: "OutOfStock"; readonly sku: string };
type PaymentFailed = { readonly _tag: "PaymentFailed"; readonly reason: string };
type ShippingUnavailable = { readonly _tag: "ShippingUnavailable"; readonly region: string };

// --- Individual operations ---
function checkInventory(sku: string): Result<{ available: number }, OutOfStock> {
  if (sku === "SOLD_OUT") return err({ _tag: "OutOfStock", sku });
  return ok({ available: 10 });
}

function validatePayment(method: string): Result<{ token: string }, PaymentFailed> {
  if (method === "expired") return err({ _tag: "PaymentFailed", reason: "Card expired" });
  return ok({ token: "tok_abc" });
}

function checkShipping(region: string): Result<{ eta: string }, ShippingUnavailable> {
  if (region === "Antarctica") return err({ _tag: "ShippingUnavailable", region });
  return ok({ eta: "3-5 days" });
}

// --- EffectUnion computes the merged error type ---
type CheckoutResults = [
  ReturnType<typeof checkInventory>,
  ReturnType<typeof validatePayment>,
  ReturnType<typeof checkShipping>,
];
type AllCheckoutErrors = EffectUnion<CheckoutResults>;
// = OutOfStock | PaymentFailed | ShippingUnavailable

// --- Orchestration ---
function checkout(
  sku: string,
  paymentMethod: string,
  region: string
): Result<[{ available: number }, { token: string }, { eta: string }], AllCheckoutErrors> {
  return all(checkInventory(sku), validatePayment(paymentMethod), checkShipping(region));
}

console.log("--- Successful checkout ---");
console.log(checkout("WIDGET", "visa", "US"));

console.log("\n--- Out of stock ---");
console.log(checkout("SOLD_OUT", "visa", "US"));

console.log("\n--- Payment failed ---");
console.log(checkout("WIDGET", "expired", "US"));

console.log("\n--- Shipping unavailable ---");
console.log(checkout("WIDGET", "visa", "Antarctica"));
```

## Key Takeaways

- `EffectUnion<Rs>` computes the union of error types from a tuple of Result types
- Useful for declaring the complete error surface of orchestrations that combine multiple operations
- Works naturally with `all()` which already produces the union of errors
- Enables explicit documentation of combined error types in function signatures
