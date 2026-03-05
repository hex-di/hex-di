/**
 * Result: Effectful & Pure Results
 *
 * Demonstrates EffectfulResult, PureResult, IsEffectFree, and EffectOf —
 * the type-level building blocks for effectful vs pure computations.
 * Scenario: e-commerce order pipeline with pure lookups vs effectful payments.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  ok, err, type Result,
  type PureResult, type EffectfulResult, type IsEffectFree, type EffectOf,
} from "@hex-di/result";

// --- Tagged errors ---
type InsufficientStock = { readonly _tag: "InsufficientStock"; readonly sku: string };
type PaymentDeclined = { readonly _tag: "PaymentDeclined"; readonly reason: string };

// --- Pure computation (never fails) ---
function formatOrderSummary(items: string[]): PureResult<string> {
  return ok(\`Order: \${items.join(", ")}\`);
}

// --- Effectful computation (can fail) ---
function processPayment(amount: number): EffectfulResult<string, PaymentDeclined> {
  if (amount > 10000) return err({ _tag: "PaymentDeclined", reason: "Limit exceeded" });
  return ok(\`txn_\${amount}\`);
}

function checkStock(sku: string): Result<number, InsufficientStock> {
  if (sku === "SOLD_OUT") return err({ _tag: "InsufficientStock", sku });
  return ok(42);
}

// --- Type-level checks (shown via comments) ---
// IsEffectFree<PureResult<string>>                       => true
// IsEffectFree<ReturnType<typeof processPayment>>        => false
// EffectOf<ReturnType<typeof processPayment>>            => PaymentDeclined
// EffectOf<ReturnType<typeof checkStock>>                => InsufficientStock

// --- Runtime ---
console.log("--- Pure result ---");
console.log(formatOrderSummary(["Widget", "Gadget"]));

console.log("\\n--- Effectful: payment success ---");
console.log(processPayment(500));

console.log("\\n--- Effectful: payment failure ---");
console.log(processPayment(20000));

console.log("\\n--- Stock check ---");
console.log(checkStock("SOLD_OUT"));
console.log(checkStock("WIDGET_A"));

console.log("\\nAll effect type utilities demonstrated.");
`;

export const resultEffectfulResult: ExampleTemplate = {
  id: "result-effectful-result",
  title: "Result: Effectful & Pure Results",
  description:
    "EffectfulResult, PureResult, IsEffectFree, EffectOf — type-level effect building blocks",
  category: "result",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "health",
};
