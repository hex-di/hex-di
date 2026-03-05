# Effectful & Pure Results

Demonstrates `EffectfulResult`, `PureResult`, `IsEffectFree`, and `EffectOf` — the type-level building blocks for distinguishing between computations that can fail and those guaranteed to succeed.

**Domain:** E-commerce order pipeline — pure lookups vs effectful payments.

## Code

```typescript
import {
  ok,
  err,
  type Result,
  type PureResult,
  type EffectfulResult,
  type IsEffectFree,
  type EffectOf,
} from "@hex-di/result";

// --- Tagged errors ---
type InsufficientStock = { readonly _tag: "InsufficientStock"; readonly sku: string };
type PaymentDeclined = { readonly _tag: "PaymentDeclined"; readonly reason: string };

// --- Pure computation (never fails) ---
function formatOrderSummary(items: string[]): PureResult<string> {
  return ok(`Order: ${items.join(", ")}`);
}

// --- Effectful computation (can fail) ---
function processPayment(amount: number): EffectfulResult<string, PaymentDeclined> {
  if (amount > 10000) return err({ _tag: "PaymentDeclined", reason: "Limit exceeded" });
  return ok(`txn_${amount}`);
}

function checkStock(sku: string): Result<number, InsufficientStock> {
  if (sku === "SOLD_OUT") return err({ _tag: "InsufficientStock", sku });
  return ok(42);
}

// --- Type-level checks ---
type SummaryIsPure = IsEffectFree<PureResult<string>>; // true
type PaymentIsPure = IsEffectFree<ReturnType<typeof processPayment>>; // false
type PaymentEffects = EffectOf<ReturnType<typeof processPayment>>; // PaymentDeclined
type StockEffects = EffectOf<ReturnType<typeof checkStock>>; // InsufficientStock

// --- Runtime ---
console.log("--- Pure result ---");
const summary = formatOrderSummary(["Widget", "Gadget"]);
console.log(summary);

console.log("\n--- Effectful: payment success ---");
console.log(processPayment(500));

console.log("\n--- Effectful: payment failure ---");
console.log(processPayment(20000));

console.log("\n--- Effectful: stock check ---");
console.log(checkStock("SOLD_OUT"));
console.log(checkStock("WIDGET_A"));
```

## Key Takeaways

- `PureResult<T>` is `Result<T, never>` — a computation that cannot fail
- `EffectfulResult<T, E>` returns `never` when `E` is `never`, preventing accidental usage with pure results
- `IsEffectFree<R>` checks at the type level whether a Result type has no error channel
- `EffectOf<R>` extracts the error type from a Result, enabling generic effect programming
