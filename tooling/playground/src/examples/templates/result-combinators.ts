/**
 * Result: Combinators
 *
 * Demonstrates all, allSettled, any, and collect — functions for
 * combining multiple Results into one.
 * Scenario: form validation with multiple fields.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import { ok, err, all, allSettled, any, collect } from "@hex-di/result";
import type { Result } from "@hex-di/result";

// ---------------------------------------------------------------------------
// Scenario: Validate a registration form with multiple fields
// ---------------------------------------------------------------------------

function validateName(name: string): Result<string, string> {
  if (name.length < 2) return err("name too short");
  if (name.length > 50) return err("name too long");
  return ok(name.trim());
}

function validateEmail(email: string): Result<string, string> {
  if (!email.includes("@")) return err("invalid email");
  return ok(email.toLowerCase().trim());
}

function validateAge(age: number): Result<number, string> {
  if (age < 0 || age > 150) return err("age out of range");
  if (!Number.isInteger(age)) return err("age must be integer");
  return ok(age);
}

function validatePassword(pw: string): Result<string, string> {
  if (pw.length < 8) return err("password too short");
  if (!/[A-Z]/.test(pw)) return err("needs uppercase letter");
  if (!/[0-9]/.test(pw)) return err("needs a digit");
  return ok(pw);
}

// ---------------------------------------------------------------------------
// 1. all — short-circuits on first error (like Promise.all)
// ---------------------------------------------------------------------------
console.log("--- 1. all ---");

const allOk = all(
  validateName("Alice"),
  validateEmail("alice@example.com"),
  validateAge(28),
);
console.log("all (valid):", allOk);

const allBad = all(
  validateName("A"),
  validateEmail("bad"),
  validateAge(-5),
);
console.log("all (first error wins):", allBad);

const mixed = all(
  validateName("Alice"),
  validateEmail("bad"),
  validateAge(28),
);
console.log("all (middle error):", mixed);

// ---------------------------------------------------------------------------
// 2. allSettled — collects ALL errors instead of short-circuiting
// ---------------------------------------------------------------------------
console.log("\\n--- 2. allSettled ---");

const settledOk = allSettled(
  validateName("Alice"),
  validateEmail("alice@example.com"),
  validateAge(28),
);
console.log("allSettled (valid):", settledOk);

const settledBad = allSettled(
  validateName("A"),
  validateEmail("bad"),
  validateAge(-5),
);
console.log("allSettled (all errors collected):", settledBad);

// ---------------------------------------------------------------------------
// 3. any — returns first Ok, fails only if ALL fail
// ---------------------------------------------------------------------------
console.log("\\n--- 3. any ---");

// Multiple data sources — take first success
function fetchFromCache(key: string): Result<string, string> {
  if (key === "config") return ok("cached-config-value");
  return err("cache miss");
}

function fetchFromEnv(key: string): Result<string, string> {
  if (key === "config") return ok("env-config-value");
  return err("not in env");
}

function fetchFromDefault(_key: string): Result<string, string> {
  return ok("default-value");
}

const firstSuccess = any(
  fetchFromCache("missing"),
  fetchFromEnv("missing"),
  fetchFromDefault("missing"),
);
console.log("any (first success from defaults):", firstSuccess);

const cacheHit = any(
  fetchFromCache("config"),
  fetchFromEnv("config"),
  fetchFromDefault("config"),
);
console.log("any (cache hit):", cacheHit);

const allFail = any(
  err("source A failed"),
  err("source B failed"),
  err("source C failed"),
);
console.log("any (all fail):", allFail);

// ---------------------------------------------------------------------------
// 4. collect — combine named Results into a typed object
// ---------------------------------------------------------------------------
console.log("\\n--- 4. collect ---");

const formOk = collect({
  name: validateName("Alice"),
  email: validateEmail("alice@example.com"),
  age: validateAge(28),
  password: validatePassword("Secret99"),
});
console.log("collect (valid form):", formOk);

const formBad = collect({
  name: validateName("A"),
  email: validateEmail("bad"),
  age: validateAge(28),
  password: validatePassword("weak"),
});
console.log("collect (invalid form):", formBad);

// Type-safe access to collected values
formOk.inspect((form) => {
  console.log("Collected form fields:");
  console.log("  name:", form.name);
  console.log("  email:", form.email);
  console.log("  age:", form.age);
  console.log("  password:", form.password);
});

console.log("\\nAll combinators demonstrated.");
`;

export const resultCombinators: ExampleTemplate = {
  id: "result-combinators",
  title: "Result: Combinators",
  description: "all, allSettled, any, collect — combining multiple Results",
  category: "result",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "health",
};
