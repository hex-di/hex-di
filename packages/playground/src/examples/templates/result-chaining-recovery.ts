/**
 * Result: Chaining & Recovery
 *
 * Demonstrates andThen, orElse, andTee, orTee, andThrough,
 * inspect, and inspectErr — methods for sequencing operations
 * and injecting side effects.
 * Scenario: user registration pipeline with validation steps.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";

// ---------------------------------------------------------------------------
// Scenario: User registration pipeline
// ---------------------------------------------------------------------------

const logs: string[] = [];
function log(msg: string): void { logs.push(msg); }

// Validation helpers
function validateEmail(email: string): Result<string, string> {
  if (!email.includes("@")) return err("invalid email: missing @");
  if (email.length < 5) return err("invalid email: too short");
  return ok(email.toLowerCase().trim());
}

function validatePassword(password: string): Result<string, string> {
  if (password.length < 8) return err("password must be at least 8 characters");
  if (!/[0-9]/.test(password)) return err("password must contain a digit");
  return ok(password);
}

function checkBlocklist(email: string): Result<string, string> {
  const blocked = ["spam@test.com", "blocked@evil.com"];
  if (blocked.includes(email)) return err(\`email \${email} is blocked\`);
  return ok(email);
}

interface User { email: string; password: string }

// ---------------------------------------------------------------------------
// 1. andThen — chain dependent validations (short-circuits on first error)
// ---------------------------------------------------------------------------
console.log("--- 1. andThen ---");

const registration = validateEmail("Alice@Example.COM")
  .andThen((email) =>
    validatePassword("secret123").map((pw): User => ({ email, password: pw }))
  );
console.log("andThen (valid):", registration);

const badRegistration = validateEmail("bad")
  .andThen((email) =>
    validatePassword("secret123").map((pw): User => ({ email, password: pw }))
  );
console.log("andThen (bad email):", badRegistration);

const badPw = validateEmail("ok@test.com")
  .andThen((email) =>
    validatePassword("short").map((pw): User => ({ email, password: pw }))
  );
console.log("andThen (bad password):", badPw);

// ---------------------------------------------------------------------------
// 2. orElse — recover from errors with a fallback strategy
// ---------------------------------------------------------------------------
console.log("\\n--- 2. orElse ---");

function recoverEmail(error: string): Result<string, string> {
  if (error.includes("missing @")) return ok("fallback@default.com");
  return err(error);
}

const recovered = validateEmail("nope").orElse(recoverEmail);
console.log("orElse (recoverable):", recovered);

const notRecovered = validateEmail("x").orElse(recoverEmail);
console.log("orElse (too short, not recoverable):", notRecovered);

const alreadyOk = validateEmail("ok@test.com").orElse(recoverEmail);
console.log("orElse (already Ok — skipped):", alreadyOk);

// ---------------------------------------------------------------------------
// 3. andTee / orTee — side effects without changing the Result
// ---------------------------------------------------------------------------
console.log("\\n--- 3. andTee / orTee ---");

logs.length = 0;

const withTee = validateEmail("alice@example.com")
  .andTee((email) => log(\`[audit] validated email: \${email}\`))
  .andThen((email) =>
    validatePassword("secure99").map((pw): User => ({ email, password: pw }))
  )
  .andTee((user) => log(\`[audit] registered user: \${user.email}\`))
  .orTee((error) => log(\`[audit] registration failed: \${error}\`));

console.log("Result:", withTee);
console.log("Audit log:", logs);

logs.length = 0;
const withTeeErr = validateEmail("bad")
  .andTee((email) => log(\`[audit] validated: \${email}\`))
  .orTee((error) => log(\`[audit] validation failed: \${error}\`));

console.log("Error result:", withTeeErr);
console.log("Audit log:", logs);

// ---------------------------------------------------------------------------
// 4. andThrough — check a condition without consuming the value
// ---------------------------------------------------------------------------
console.log("\\n--- 4. andThrough ---");

const throughOk = validateEmail("alice@example.com")
  .andThrough((email) => checkBlocklist(email));
console.log("andThrough (not blocked):", throughOk);

const throughBlocked = validateEmail("spam@test.com")
  .andThrough((email) => checkBlocklist(email));
console.log("andThrough (blocked):", throughBlocked);

// Original value passes through on success
const throughValue = ok(42).andThrough(() => ok("ignored"));
console.log("andThrough preserves value:", throughValue);

// ---------------------------------------------------------------------------
// 5. inspect / inspectErr — debug logging without changing the Result
// ---------------------------------------------------------------------------
console.log("\\n--- 5. inspect / inspectErr ---");

logs.length = 0;

validateEmail("alice@example.com")
  .inspect((v) => log(\`[debug] Ok value: \${v}\`))
  .inspectErr((e) => log(\`[debug] Err value: \${e}\`));

validateEmail("bad")
  .inspect((v) => log(\`[debug] Ok value: \${v}\`))
  .inspectErr((e) => log(\`[debug] Err value: \${e}\`));

console.log("Debug logs:", logs);

console.log("\\nAll chaining & recovery methods demonstrated.");
`;

export const resultChainingRecovery: ExampleTemplate = {
  id: "result-chaining-recovery",
  title: "Result: Chaining & Recovery",
  description:
    "andThen, orElse, andTee, orTee, andThrough, inspect, inspectErr — sequencing and side effects",
  category: "result",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "health",
};
