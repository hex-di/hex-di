/**
 * Result: Do Notation
 *
 * Demonstrates bind and let_ — monadic do-notation for building up
 * a typed context object one field at a time via .andThen() chaining.
 * Scenario: user registration pipeline accumulating validated fields.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  ok, err, bind, let_, type Result,
} from "@hex-di/result";

// ---------------------------------------------------------------------------
// Helpers: validation functions
// ---------------------------------------------------------------------------

type ValidationError = { readonly _tag: "ValidationError"; readonly field: string; readonly message: string };

function validateName(name: string): Result<string, ValidationError> {
  if (name.length < 2) return err({ _tag: "ValidationError", field: "name", message: "too short" });
  return ok(name);
}

function validateEmail(email: string): Result<string, ValidationError> {
  if (!email.includes("@")) return err({ _tag: "ValidationError", field: "email", message: "invalid format" });
  return ok(email.toLowerCase());
}

function validateAge(age: number): Result<number, ValidationError> {
  if (age < 18) return err({ _tag: "ValidationError", field: "age", message: "must be 18+" });
  return ok(age);
}

// ---------------------------------------------------------------------------
// 1. bind — adds a Result value to the context (short-circuits on Err)
// ---------------------------------------------------------------------------
console.log("--- 1. bind — accumulate validated fields ---");

const registration = ok({})
  .andThen(bind("name", () => validateName("Alice")))
  .andThen(bind("email", () => validateEmail("alice@example.com")))
  .andThen(bind("age", () => validateAge(25)));

console.log("Success:", registration);

// Short-circuit on validation error
const failedReg = ok({})
  .andThen(bind("name", () => validateName("A")))
  .andThen(bind("email", () => validateEmail("alice@example.com")));

console.log("Failed at name:", failedReg);

// ---------------------------------------------------------------------------
// 2. let_ — adds a plain (non-Result) value to the context
// ---------------------------------------------------------------------------
console.log("\\n--- 2. let_ — add computed values ---");

const withComputed = ok({})
  .andThen(bind("name", () => validateName("Bob")))
  .andThen(bind("email", () => validateEmail("bob@example.com")))
  .andThen(let_("greeting", (ctx) => \`Hello, \${ctx.name}!\`))
  .andThen(let_("displayEmail", (ctx) => ctx.email.toUpperCase()));

console.log("With computed:", withComputed);

// ---------------------------------------------------------------------------
// 3. Complex pipeline — bind + let_ combined
// ---------------------------------------------------------------------------
console.log("\\n--- 3. Complex registration pipeline ---");

const fullPipeline = ok({})
  .andThen(bind("name", () => validateName("Charlie")))
  .andThen(bind("email", () => validateEmail("charlie@test.com")))
  .andThen(bind("age", () => validateAge(30)))
  .andThen(let_("isAdult", (ctx) => ctx.age >= 18))
  .andThen(let_("userId", () => \`usr_\${Date.now()}\`))
  .andThen(let_("summary", (ctx) =>
    \`User \${ctx.name} (\${ctx.email}), age \${ctx.age}, id: \${ctx.userId}\`
  ));

console.log("Full pipeline:", fullPipeline);

// ---------------------------------------------------------------------------
// 4. Using context from previous binds
// ---------------------------------------------------------------------------
console.log("\\n--- 4. Dependent binds ---");

function lookupDiscount(age: number): Result<number, ValidationError> {
  if (age >= 65) return ok(20);
  if (age >= 25) return ok(10);
  return ok(0);
}

const withDiscount = ok({})
  .andThen(bind("age", () => validateAge(70)))
  .andThen(bind("discount", (ctx) => lookupDiscount(ctx.age)))
  .andThen(let_("message", (ctx) => \`\${ctx.discount}% discount for age \${ctx.age}\`));

console.log("Dependent:", withDiscount);

console.log("\\nDo notation demonstrated.");
`;

export const resultDoNotation: ExampleTemplate = {
  id: "result-do-notation",
  title: "Result: Do Notation",
  description: "bind, let_ — monadic do-notation for accumulating typed context",
  category: "result",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "health",
};
