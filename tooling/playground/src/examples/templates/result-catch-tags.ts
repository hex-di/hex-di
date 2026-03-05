/**
 * Result: Tagged Error Handling
 *
 * Demonstrates catchTag, catchTags, createErrorGroup, and andThenWith —
 * pattern matching on tagged errors for selective recovery.
 * Scenario: API gateway routing with per-error-type recovery strategies.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  ok, err, type Result,
  createErrorGroup,
} from "@hex-di/result";

// ---------------------------------------------------------------------------
// 1. catchTag — handle a single tagged error
// ---------------------------------------------------------------------------
console.log("--- 1. catchTag ---");

type NotFound = { readonly _tag: "NotFound"; readonly resource: string };
type RateLimited = { readonly _tag: "RateLimited"; readonly retryAfterMs: number };
type ServerError = { readonly _tag: "ServerError"; readonly code: number };

type ApiError = NotFound | RateLimited | ServerError;

function fetchResource(id: string): Result<string, ApiError> {
  if (id === "missing") return err({ _tag: "NotFound", resource: id });
  if (id === "busy") return err({ _tag: "RateLimited", retryAfterMs: 5000 });
  if (id === "broken") return err({ _tag: "ServerError", code: 500 });
  return ok(\`Data for \${id}\`);
}

// catchTag handles one error type, narrows the remaining union
const handled = fetchResource("missing")
  .catchTag("NotFound", (e) => ok(\`Fallback for \${e.resource}\`));
console.log("catchTag NotFound:", handled);
// Error type is now: RateLimited | ServerError

// ---------------------------------------------------------------------------
// 2. catchTags — handle multiple tagged errors at once
// ---------------------------------------------------------------------------
console.log("\\n--- 2. catchTags ---");

const multiHandled = fetchResource("busy")
  .catchTags({
    NotFound: (e) => ok(\`Default for \${e.resource}\`),
    RateLimited: (e) => ok(\`Queued, retry in \${e.retryAfterMs}ms\`),
  });
console.log("catchTags RateLimited:", multiHandled);
// Error type is now: ServerError

// ---------------------------------------------------------------------------
// 3. createErrorGroup — two-level discriminated errors
// ---------------------------------------------------------------------------
console.log("\\n--- 3. createErrorGroup ---");

const Http = createErrorGroup("HttpError");
const NotFoundErr = Http.create("NotFound");
const TimeoutErr = Http.create("Timeout");

const Db = createErrorGroup("DbError");
const ConnectionErr = Db.create("Connection");

const httpErr = NotFoundErr({ url: "/api/users", status: 404 });
const timeoutErr = TimeoutErr({ url: "/api/data", ms: 30000 });
const dbErr = ConnectionErr({ host: "db.local", port: 5432 });

console.log("HTTP NotFound:", httpErr);
console.log("HTTP Timeout:", timeoutErr);
console.log("DB Connection:", dbErr);

// Type guards
console.log("\\nHttp.is(httpErr):", Http.is(httpErr));
console.log("Http.is(dbErr):", Http.is(dbErr));
console.log("Http.isTag('NotFound')(httpErr):", Http.isTag("NotFound")(httpErr));
console.log("Http.isTag('Timeout')(httpErr):", Http.isTag("Timeout")(httpErr));

// ---------------------------------------------------------------------------
// 4. andThenWith — chain with both success and error handlers
// ---------------------------------------------------------------------------
console.log("\\n--- 4. andThenWith ---");

function riskyOperation(input: number): Result<number, { _tag: "Overflow" }> {
  if (input > 100) return err({ _tag: "Overflow" });
  return ok(input * 2);
}

const successCase = ok(10).andThenWith(
  (v) => riskyOperation(v),
  () => ok(0), // error recovery
);
console.log("andThenWith (success path):", successCase);

const errorCase = (err("initial-error") as Result<number, string>).andThenWith(
  (v) => riskyOperation(v),
  () => ok(-1), // error recovery
);
console.log("andThenWith (error path):", errorCase);

console.log("\\nTagged error handling demonstrated.");
`;

export const resultCatchTags: ExampleTemplate = {
  id: "result-catch-tags",
  title: "Result: Tagged Error Handling",
  description:
    "catchTag, catchTags, createErrorGroup, andThenWith — pattern matching on tagged errors",
  category: "result",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "health",
};
