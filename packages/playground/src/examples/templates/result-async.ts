/**
 * Result: Async Operations
 *
 * Demonstrates ResultAsync and all async-related functionality:
 * static constructors, fromPromise, fromSafePromise, fromAsyncThrowable,
 * toAsync, asyncMap, asyncAndThen, and async instance methods.
 * Scenario: simulated API calls with async pipelines.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  ok, err,
  ResultAsync,
  fromPromise, fromSafePromise, fromAsyncThrowable,
} from "@hex-di/result";

// ---------------------------------------------------------------------------
// Helpers: simulated async APIs
// ---------------------------------------------------------------------------

async function fetchUserApi(id: number): Promise<{ name: string; email: string }> {
  if (id === 1) return { name: "Alice", email: "alice@example.com" };
  if (id === 2) return { name: "Bob", email: "bob@example.com" };
  throw new Error(\`User \${id} not found\`);
}

async function fetchOrdersApi(email: string): Promise<string[]> {
  if (email === "alice@example.com") return ["order-1", "order-2"];
  return [];
}

async function safeTimestamp(): Promise<number> {
  return Date.now();
}

// ---------------------------------------------------------------------------
// 1. ResultAsync static constructors
// ---------------------------------------------------------------------------
console.log("--- 1. ResultAsync.ok / ResultAsync.err ---");

const asyncOk = ResultAsync.ok(42);
const resolvedOk = await asyncOk;
console.log("ResultAsync.ok(42):", resolvedOk);

const asyncErr = ResultAsync.err("boom");
const resolvedErr = await asyncErr;
console.log("ResultAsync.err('boom'):", resolvedErr);

// ---------------------------------------------------------------------------
// 2. fromPromise — wrap a Promise that may reject
// ---------------------------------------------------------------------------
console.log("\\n--- 2. fromPromise ---");

const user1 = await fromPromise(
  fetchUserApi(1),
  (e) => \`fetch failed: \${e instanceof Error ? e.message : String(e)}\`,
);
console.log("fromPromise (user 1):", user1);

const user99 = await fromPromise(
  fetchUserApi(99),
  (e) => \`fetch failed: \${e instanceof Error ? e.message : String(e)}\`,
);
console.log("fromPromise (user 99):", user99);

// ---------------------------------------------------------------------------
// 3. fromSafePromise — wrap a Promise that never rejects
// ---------------------------------------------------------------------------
console.log("\\n--- 3. fromSafePromise ---");

const ts = await fromSafePromise(safeTimestamp());
console.log("fromSafePromise (timestamp):", ts._tag, typeof ts.value);

// ---------------------------------------------------------------------------
// 4. fromAsyncThrowable — create a reusable safe async wrapper
// ---------------------------------------------------------------------------
console.log("\\n--- 4. fromAsyncThrowable ---");

const safeFetchUser = fromAsyncThrowable(
  fetchUserApi,
  (e) => \`API error: \${e instanceof Error ? e.message : String(e)}\`,
);

const wrapped1 = await safeFetchUser(1);
console.log("fromAsyncThrowable(1):", wrapped1);

const wrapped99 = await safeFetchUser(99);
console.log("fromAsyncThrowable(99):", wrapped99);

// ---------------------------------------------------------------------------
// 5. Async pipeline chaining (map, andThen, orElse on ResultAsync)
// ---------------------------------------------------------------------------
console.log("\\n--- 5. Async pipeline chaining ---");

const pipeline = fromPromise(
  fetchUserApi(1),
  (e) => \`fetch failed: \${e instanceof Error ? e.message : String(e)}\`,
)
  .map((user) => user.email)
  .andThen((email) =>
    fromPromise(
      fetchOrdersApi(email),
      (e) => \`orders failed: \${e instanceof Error ? e.message : String(e)}\`,
    )
  )
  .map((orders) => \`Found \${orders.length} orders\`);

const pipelineResult = await pipeline;
console.log("Async pipeline:", pipelineResult);

// Pipeline with error
const failPipeline = fromPromise(
  fetchUserApi(99),
  (e) => \`fetch failed: \${e instanceof Error ? e.message : String(e)}\`,
)
  .map((user) => user.email)
  .andThen((email) =>
    fromPromise(
      fetchOrdersApi(email),
      (e) => \`orders failed: \${e instanceof Error ? e.message : String(e)}\`,
    )
  );

const failResult = await failPipeline;
console.log("Failed pipeline:", failResult);

// ---------------------------------------------------------------------------
// 6. toAsync / asyncMap / asyncAndThen — sync-to-async bridges
// ---------------------------------------------------------------------------
console.log("\\n--- 6. Sync-to-async bridges ---");

// toAsync: lift a sync Result into ResultAsync
const syncResult = ok("alice@example.com");
const asyncResult = syncResult.toAsync();
const bridged = await asyncResult.map((email) => email.toUpperCase());
console.log("toAsync + map:", bridged);

// asyncMap: apply an async transformation to a sync Result
const asyncMapped = ok(1).asyncMap(async (id) => {
  const user = await fetchUserApi(id);
  return user.name;
});
const mappedResult = await asyncMapped;
console.log("asyncMap:", mappedResult);

// asyncAndThen: chain a sync Result into an async operation
const asyncChained = ok(2).asyncAndThen((id) =>
  fromPromise(
    fetchUserApi(id),
    (e) => \`failed: \${e instanceof Error ? e.message : String(e)}\`,
  )
);
const chainedResult = await asyncChained;
console.log("asyncAndThen:", chainedResult);

// ---------------------------------------------------------------------------
// 7. Async extraction methods
// ---------------------------------------------------------------------------
console.log("\\n--- 7. Async extraction ---");

const asyncVal = ResultAsync.ok(100);
console.log("unwrapOr:", await asyncVal.unwrapOr(0));
console.log("match:", await asyncVal.match((v) => \`ok:\${v}\`, (e) => \`err:\${e}\`));
console.log("toNullable:", await asyncVal.toNullable());
console.log("intoTuple:", await asyncVal.intoTuple());

const asyncErrVal = ResultAsync.err("oops");
console.log("unwrapOr (err):", await asyncErrVal.unwrapOr(0));
console.log("merge (err):", await asyncErrVal.merge());

console.log("\\nAll async operations demonstrated.");
`;

export const resultAsync: ExampleTemplate = {
  id: "result-async",
  title: "Result: Async Operations",
  description:
    "ResultAsync, fromPromise, fromSafePromise, fromAsyncThrowable, toAsync, asyncMap, asyncAndThen",
  category: "result",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  timeoutMs: 10000,
  defaultPanel: "health",
};
