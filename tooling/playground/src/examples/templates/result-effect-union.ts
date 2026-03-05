/**
 * Result: Effect Union
 *
 * Demonstrates EffectUnion — computing the union of all effects from a
 * tuple of Result types for orchestrating multiple concurrent operations.
 * Scenario: e-commerce checkout orchestrating inventory, payment, and shipping.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  ok, err, type Result,
  type EffectUnion,
  all,
} from "@hex-di/result";

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

// EffectUnion computes: OutOfStock | PaymentFailed | ShippingUnavailable
type CheckoutResults = [
  ReturnType<typeof checkInventory>,
  ReturnType<typeof validatePayment>,
  ReturnType<typeof checkShipping>,
];
type AllErrors = EffectUnion<CheckoutResults>;

// --- Orchestration using all() ---
function checkout(sku: string, paymentMethod: string, region: string) {
  return all(
    checkInventory(sku),
    validatePayment(paymentMethod),
    checkShipping(region),
  );
}

console.log("--- Successful checkout ---");
console.log(checkout("WIDGET", "visa", "US"));

console.log("\\n--- Out of stock ---");
console.log(checkout("SOLD_OUT", "visa", "US"));

console.log("\\n--- Payment failed ---");
console.log(checkout("WIDGET", "expired", "US"));

console.log("\\n--- Shipping unavailable ---");
console.log(checkout("WIDGET", "visa", "Antarctica"));

console.log("\\nEffect union demonstrated.");
`;

export const resultEffectUnion: ExampleTemplate = {
  id: "result-effect-union",
  title: "Result: Effect Union",
  description: "EffectUnion — compute merged error types from concurrent operations",
  category: "result",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "health",
};
