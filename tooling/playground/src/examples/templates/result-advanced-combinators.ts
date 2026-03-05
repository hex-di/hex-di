/**
 * Result: Advanced Combinators
 *
 * Demonstrates partition, forEach, and zipOrAccumulate — combinators
 * for batch processing with different short-circuit and accumulation strategies.
 * Scenario: batch data import with validation and error collection.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  ok, err, partition, forEach, zipOrAccumulate,
  type Result,
} from "@hex-di/result";

// ---------------------------------------------------------------------------
// 1. partition — split Results into [ok[], err[]] (no short-circuit)
// ---------------------------------------------------------------------------
console.log("--- 1. partition ---");

type ImportError = { readonly _tag: "ImportError"; readonly row: number; readonly reason: string };

const importResults: Result<string, ImportError>[] = [
  ok("Alice"),
  err({ _tag: "ImportError", row: 2, reason: "missing email" }),
  ok("Bob"),
  err({ _tag: "ImportError", row: 4, reason: "invalid age" }),
  ok("Charlie"),
];

const [successes, failures] = partition(importResults);
console.log("Successes:", successes);
console.log("Failures:", failures);

// All ok
const [allOk, noErr] = partition([ok(1), ok(2), ok(3)]);
console.log("\\nAll ok:", allOk, "errors:", noErr);

// All err
const [noOk, allErr] = partition([err("a"), err("b")]);
console.log("All err:", noOk, "errors:", allErr);

// ---------------------------------------------------------------------------
// 2. forEach — map items through Result-returning fn (short-circuits)
// ---------------------------------------------------------------------------
console.log("\\n--- 2. forEach ---");

function validateRow(row: string): Result<{ name: string; valid: true }, string> {
  if (row.trim() === "") return err("empty row");
  if (row.startsWith("#")) return err(\`comment row: \${row}\`);
  return ok({ name: row, valid: true });
}

const rows = ["Alice", "Bob", "Charlie"];
const allValid = forEach(rows, (row) => validateRow(row));
console.log("All valid:", allValid);

const mixedRows = ["Alice", "", "Charlie"];
const shortCircuited = forEach(mixedRows, (row) => validateRow(row));
console.log("Short-circuited:", shortCircuited);
// Note: "Charlie" was never processed

// With index
const indexed = forEach([10, 20, 30], (item, idx) => ok(\`[\${idx}]: \${item}\`));
console.log("With index:", indexed);

// ---------------------------------------------------------------------------
// 3. zipOrAccumulate — combine Results, accumulate ALL errors
// ---------------------------------------------------------------------------
console.log("\\n--- 3. zipOrAccumulate ---");

function validateName(name: string): Result<string, string> {
  if (name.length < 2) return err("name too short");
  return ok(name);
}

function validateAge(age: number): Result<number, string> {
  if (age < 0) return err("age negative");
  if (age > 150) return err("age too large");
  return ok(age);
}

function validateEmail(email: string): Result<string, string> {
  if (!email.includes("@")) return err("invalid email");
  return ok(email);
}

// All pass
const allPass = zipOrAccumulate(
  validateName("Alice"),
  validateAge(25),
  validateEmail("alice@example.com"),
);
console.log("All pass:", allPass);
// => Ok(["Alice", 25, "alice@example.com"])

// Multiple failures — all errors collected
const multipleFailures = zipOrAccumulate(
  validateName("A"),
  validateAge(-5),
  validateEmail("bad"),
);
console.log("Multiple failures:", multipleFailures);
// => Err(["name too short", "age negative", "invalid email"])

// Single failure
const oneFailure = zipOrAccumulate(
  validateName("Bob"),
  validateAge(200),
  validateEmail("bob@test.com"),
);
console.log("One failure:", oneFailure);
// => Err(["age too large"])

// ---------------------------------------------------------------------------
// 4. Comparison: forEach vs zipOrAccumulate
// ---------------------------------------------------------------------------
console.log("\\n--- 4. forEach vs zipOrAccumulate ---");

function check(n: number): Result<number, string> {
  if (n < 0) return err(\`\${n} is negative\`);
  return ok(n * 2);
}

// forEach: stops at first error
const feResult = forEach([-1, -2, 3], (n) => check(n));
console.log("forEach [-1,-2,3]:", feResult); // Err("-1 is negative")

// zipOrAccumulate: collects all errors
const zaResult = zipOrAccumulate(check(-1), check(-2), check(3));
console.log("zipOrAccumulate:", zaResult); // Err(["-1 is negative", "-2 is negative"])

console.log("\\nAdvanced combinators demonstrated.");
`;

export const resultAdvancedCombinators: ExampleTemplate = {
  id: "result-advanced-combinators",
  title: "Result: Advanced Combinators",
  description:
    "partition, forEach, zipOrAccumulate — batch processing with different error strategies",
  category: "result",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "health",
};
