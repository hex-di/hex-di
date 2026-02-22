/**
 * Result: Generators & Error Patterns
 *
 * Demonstrates safeTry (sync + async) for generator-based early returns,
 * createError for tagged error constructors, and assertNever for
 * exhaustive matching.
 * Scenario: user registration flow with typed errors.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  ok, err, safeTry, createError, assertNever,
} from "@hex-di/result";
import type { Result } from "@hex-di/result";

// ---------------------------------------------------------------------------
// 1. createError — typed error constructors with _tag discrimination
// ---------------------------------------------------------------------------
console.log("--- 1. createError ---");

// createError returns a factory that takes a fields object
const ValidationError = createError("ValidationError");
const NotFoundError = createError("NotFoundError");
const PermissionError = createError("PermissionError");

const valErr = ValidationError({ message: "email is invalid", field: "email" });
console.log("ValidationError:", valErr);
console.log("  _tag:", valErr._tag);
console.log("  message:", valErr.message);
console.log("  field:", valErr.field);

const notFound = NotFoundError({ message: "user 42 not found", resource: "User", id: "42" });
console.log("NotFoundError:", notFound);
console.log("  _tag:", notFound._tag, "resource:", notFound.resource);

// Type: { readonly _tag: "PermissionError"; readonly message: string; readonly action: string }
const permErr = PermissionError({ message: "access denied", action: "delete" });
console.log("PermissionError:", permErr);

type AppError =
  | { readonly _tag: "ValidationError"; readonly message: string; readonly field: string }
  | { readonly _tag: "NotFoundError"; readonly message: string; readonly resource: string; readonly id: string }
  | { readonly _tag: "PermissionError"; readonly message: string; readonly action: string };

// ---------------------------------------------------------------------------
// 2. assertNever — exhaustive matching
// ---------------------------------------------------------------------------
console.log("\\n--- 2. assertNever ---");

function handleError(error: AppError): string {
  switch (error._tag) {
    case "ValidationError": return \`Validation [\${error.field}]: \${error.message}\`;
    case "NotFoundError": return \`Not Found [\${error.resource} \${error.id}]: \${error.message}\`;
    case "PermissionError": return \`Permission Denied [\${error.action}]: \${error.message}\`;
    default: return assertNever(error);
  }
}

console.log(handleError(ValidationError({ message: "bad input", field: "name" })));
console.log(handleError(NotFoundError({ message: "missing", resource: "Order", id: "99" })));
console.log(handleError(PermissionError({ message: "forbidden", action: "write" })));

// ---------------------------------------------------------------------------
// 3. safeTry (sync) — generator-based early return for Results
// ---------------------------------------------------------------------------
console.log("\\n--- 3. safeTry (sync) ---");

function validateEmail(email: string): Result<string, AppError> {
  if (!email.includes("@")) return err(ValidationError({ message: "missing @", field: "email" }));
  if (email.length < 5) return err(ValidationError({ message: "too short", field: "email" }));
  return ok(email.toLowerCase());
}

function validateName(name: string): Result<string, AppError> {
  if (name.length < 2) return err(ValidationError({ message: "too short", field: "name" }));
  return ok(name.trim());
}

function lookupUser(email: string): Result<{ id: number }, AppError> {
  const users: Record<string, number> = { "alice@example.com": 1 };
  const id = users[email];
  if (id === undefined) return err(NotFoundError({ message: "not found", resource: "User", id: email }));
  return ok({ id });
}

// safeTry with sync generator — yield* unwraps Ok or short-circuits on Err
const registerSync = safeTry(function* () {
  const email = yield* validateEmail("alice@example.com");
  const name = yield* validateName("Alice");
  const user = yield* lookupUser(email);
  return ok({ ...user, email, name });
});
console.log("safeTry sync (success):", registerSync);

const registerFail = safeTry(function* () {
  const email = yield* validateEmail("bad");
  const name = yield* validateName("Alice");
  const user = yield* lookupUser(email);
  return ok({ ...user, email, name });
});
console.log("safeTry sync (validation error):", registerFail);

const registerNotFound = safeTry(function* () {
  const email = yield* validateEmail("unknown@test.com");
  const name = yield* validateName("Bob");
  const user = yield* lookupUser(email);
  return ok({ ...user, email, name });
});
console.log("safeTry sync (not found):", registerNotFound);

// ---------------------------------------------------------------------------
// 4. safeTry (async) — async generator-based early return
// ---------------------------------------------------------------------------
console.log("\\n--- 4. safeTry (async) ---");

async function fetchProfile(id: number): Promise<Result<{ bio: string }, AppError>> {
  if (id === 1) return ok({ bio: "Hello, I am Alice!" });
  return err(NotFoundError({ message: "not found", resource: "Profile", id: String(id) }));
}

const asyncFlow = await safeTry(async function* () {
  const email = yield* validateEmail("alice@example.com");
  const name = yield* validateName("Alice");
  const user = yield* lookupUser(email);
  const profileResult = await fetchProfile(user.id);
  const profile = yield* profileResult;
  return ok({ email, name, id: user.id, bio: profile.bio });
});
console.log("safeTry async (success):", asyncFlow);

const asyncFail = await safeTry(async function* () {
  const email = yield* validateEmail("alice@example.com");
  const name = yield* validateName("Alice");
  const user = yield* lookupUser(email);
  const profileResult = await fetchProfile(999);
  const profile = yield* profileResult;
  return ok({ email, name, id: user.id, bio: profile.bio });
});
console.log("safeTry async (profile not found):", asyncFail);

// ---------------------------------------------------------------------------
// 5. Combining all patterns
// ---------------------------------------------------------------------------
console.log("\\n--- 5. Combined pattern ---");

function processRequest(input: {
  email: string;
  name: string;
}): Result<string, AppError> {
  return safeTry(function* () {
    const email = yield* validateEmail(input.email);
    const name = yield* validateName(input.name);
    const user = yield* lookupUser(email);
    return ok(\`Processed: \${name} (id=\${user.id}, email=\${email})\`);
  });
}

const good = processRequest({ email: "alice@example.com", name: "Alice" });
console.log("Combined (ok):", good);

const bad = processRequest({ email: "x", name: "A" });
console.log("Combined (err):", bad);

// Handle the error exhaustively
bad.inspectErr((error) => {
  const message = handleError(error);
  console.log("Handled:", message);
});

console.log("\\nAll generator & error patterns demonstrated.");
`;

export const resultSafeTry: ExampleTemplate = {
  id: "result-safe-try",
  title: "Result: Generators & Error Patterns",
  description:
    "safeTry (sync + async), createError, assertNever — generator-based early returns and typed errors",
  category: "result",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  timeoutMs: 10000,
  defaultPanel: "health",
};
