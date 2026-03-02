/**
 * Guard: Batch Evaluation & Serialization
 *
 * Demonstrates evaluateBatch for evaluating multiple policies at once,
 * policy serialization for persistence, and the explain() function
 * for human-readable policy descriptions.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  createPermission,
  createPermissionGroup,
  createAuthSubject,
  hasPermission,
  hasRole,
  hasAttribute,
  allOf,
  anyOf,
  not,
  withLabel,
  evaluate,
  evaluateBatch,
  serializePolicy,
  deserializePolicy,
  explainPolicy,
  eq,
  gte,
  inArray,
  literal,
} from "@hex-di/guard";

// ---------------------------------------------------------------------------
// Setup: E-commerce platform with multiple resource policies
// ---------------------------------------------------------------------------

console.log("=== Batch Evaluation & Serialization ===\\n");

const product = createPermissionGroup("product", ["read", "write", "delete", "publish"]);
const order = createPermissionGroup("order", ["read", "write", "cancel", "refund"]);
const customer = createPermissionGroup("customer", ["read", "write", "delete"]);
const report = createPermissionGroup("report", ["read", "export"]);

// ---------------------------------------------------------------------------
// 1. Define a policy map — named policies for batch evaluation
// ---------------------------------------------------------------------------

const policies = {
  "product:manage": withLabel("Product Management", allOf(
    anyOf(hasRole("product_manager"), hasRole("admin")),
    hasPermission(product.write),
  )),

  "order:process": withLabel("Order Processing", allOf(
    anyOf(hasRole("order_processor"), hasRole("admin")),
    hasPermission(order.write),
    hasAttribute("department", inArray(["fulfillment", "operations", "admin"])),
  )),

  "order:refund": withLabel("Refund Authorization", allOf(
    anyOf(hasRole("finance_manager"), hasRole("admin")),
    hasPermission(order.refund),
    hasAttribute("clearanceLevel", gte(3)),
  )),

  "customer:delete": withLabel("Customer Data Deletion", allOf(
    hasRole("admin"),
    hasPermission(customer.delete),
    hasAttribute("clearanceLevel", gte(4)),
    not(hasAttribute("department", eq(literal("marketing")))),
  )),

  "report:export": withLabel("Report Export", allOf(
    hasPermission(report.export),
    hasAttribute("clearanceLevel", gte(2)),
  )),
};

// ---------------------------------------------------------------------------
// 2. Subjects
// ---------------------------------------------------------------------------

const subjects = {
  productMgr: createAuthSubject("alice-pm", ["product_manager"], new Set([
    "product:read", "product:write", "product:publish",
    "order:read", "report:read",
  ]), {
    department: "product",
    clearanceLevel: 3,
  }),

  orderProcessor: createAuthSubject("bob-orders", ["order_processor"], new Set([
    "order:read", "order:write", "order:cancel",
    "product:read", "customer:read",
  ]), {
    department: "fulfillment",
    clearanceLevel: 2,
  }),

  financeManager: createAuthSubject("carol-finance", ["finance_manager"], new Set([
    "order:read", "order:write", "order:refund",
    "report:read", "report:export",
  ]), {
    department: "finance",
    clearanceLevel: 4,
  }),

  admin: createAuthSubject("dave-admin", ["admin"], new Set([
    "product:read", "product:write", "product:delete", "product:publish",
    "order:read", "order:write", "order:cancel", "order:refund",
    "customer:read", "customer:write", "customer:delete",
    "report:read", "report:export",
  ]), {
    department: "admin",
    clearanceLevel: 5,
  }),
};

// ---------------------------------------------------------------------------
// 3. Batch evaluation — evaluate all policies at once
// ---------------------------------------------------------------------------

console.log("--- Batch Evaluation Results ---\\n");

const policyNames = Object.keys(policies);
console.log("".padEnd(18) + policyNames.map(n => n.padEnd(18)).join(""));
console.log("-".repeat(18 + policyNames.length * 18));

for (const [name, subject] of Object.entries(subjects)) {
  const results = evaluateBatch(policies, { subject });

  let row = name.padEnd(18);
  for (const policyName of policyNames) {
    const result = results[policyName];
    if (result.isOk()) {
      row += result.value.kind.toUpperCase().padEnd(18);
    } else {
      row += "ERROR".padEnd(18);
    }
  }
  console.log(row);
}

// ---------------------------------------------------------------------------
// 4. Policy serialization — persist policies as JSON
// ---------------------------------------------------------------------------

console.log("\\n--- Policy Serialization ---\\n");

const productPolicy = policies["product:manage"];
const serialized = serializePolicy(productPolicy);
console.log("Serialized policy (JSON):");
console.log(JSON.stringify(serialized, null, 2));

// Deserialize back
const deserialized = deserializePolicy(serialized);
if (deserialized.isOk()) {
  console.log("\\nDeserialized successfully!");
  console.log("Kind:", deserialized.value.kind);

  // Evaluate the deserialized policy — it works just like the original
  const result = evaluate(deserialized.value, { subject: subjects.productMgr });
  console.log("Re-evaluation:", result.isOk() && result.value.kind);
} else {
  console.log("Deserialization error:", deserialized.error);
}

// ---------------------------------------------------------------------------
// 5. Policy explanation — human-readable descriptions
// ---------------------------------------------------------------------------

console.log("\\n--- Policy Explanations ---\\n");

for (const [name, policy] of Object.entries(policies)) {
  const explanation = explainPolicy(policy);
  console.log(name + ":");
  console.log("  " + explanation);
  console.log();
}

// ---------------------------------------------------------------------------
// 6. Compare batch vs individual evaluation
// ---------------------------------------------------------------------------

console.log("--- Batch vs Individual Performance ---\\n");

const subject = subjects.admin;

// Batch (single call)
const batchStart = performance.now();
for (let i = 0; i < 100; i++) {
  evaluateBatch(policies, { subject });
}
const batchTime = performance.now() - batchStart;

// Individual (multiple calls)
const individualStart = performance.now();
for (let i = 0; i < 100; i++) {
  for (const policy of Object.values(policies)) {
    evaluate(policy, { subject });
  }
}
const individualTime = performance.now() - individualStart;

console.log("100 iterations of 5 policies:");
console.log("  Batch:", batchTime.toFixed(2), "ms");
console.log("  Individual:", individualTime.toFixed(2), "ms");

console.log("\\nDone! Check the Guard panel for evaluation trees and traces.");
`;

export const guardBatchEvaluation: ExampleTemplate = {
  id: "guard-batch-evaluation",
  title: "Guard: Batch Evaluation & Serialization",
  description:
    "evaluateBatch for multiple policies, serialize/deserialize, explainPolicy for human-readable output",
  category: "guard",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "guard",
};
