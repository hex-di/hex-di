/**
 * Result: Transformations
 *
 * Demonstrates map, mapErr, mapBoth, flatten, and flip — the pure
 * transformation methods that convert values without side effects.
 * Scenario: transforming raw API response data through a pipeline.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";

// ---------------------------------------------------------------------------
// Scenario: Transform raw API response data through a pipeline
// ---------------------------------------------------------------------------

interface RawUser { first: string; last: string; age_str: string }
interface User { fullName: string; age: number }

// Simulate an API call that may fail
function fetchUser(id: number): Result<RawUser, { code: number; message: string }> {
  if (id === 1) return ok({ first: "Alice", last: "Smith", age_str: "28" });
  if (id === 2) return ok({ first: "Bob", last: "", age_str: "not-a-number" });
  return err({ code: 404, message: \`User \${id} not found\` });
}

// ---------------------------------------------------------------------------
// 1. map — transform the Ok value
// ---------------------------------------------------------------------------
console.log("--- 1. map ---");

const raw1 = fetchUser(1);
const user1 = raw1.map((r): User => ({
  fullName: \`\${r.first} \${r.last}\`.trim(),
  age: Number(r.age_str),
}));
console.log("map(user 1):", user1);

const raw3 = fetchUser(99);
const user3 = raw3.map((r): User => ({
  fullName: \`\${r.first} \${r.last}\`.trim(),
  age: Number(r.age_str),
}));
console.log("map(user 99) — Err passes through:", user3);

// ---------------------------------------------------------------------------
// 2. mapErr — transform the Err value
// ---------------------------------------------------------------------------
console.log("\\n--- 2. mapErr ---");

const friendly = raw3.mapErr((e) => \`Error \${e.code}: \${e.message}\`);
console.log("mapErr(user 99):", friendly);

const okUnchanged = raw1.mapErr((e) => \`Error \${e.code}: \${e.message}\`);
console.log("mapErr(user 1) — Ok passes through:", okUnchanged);

// ---------------------------------------------------------------------------
// 3. mapBoth — transform both tracks in one call
// ---------------------------------------------------------------------------
console.log("\\n--- 3. mapBoth ---");

const display1 = raw1.mapBoth(
  (r) => \`\${r.first} \${r.last} (age \${r.age_str})\`,
  (e) => \`[\${e.code}] \${e.message}\`,
);
console.log("mapBoth(user 1):", display1);

const display3 = raw3.mapBoth(
  (r) => \`\${r.first} \${r.last} (age \${r.age_str})\`,
  (e) => \`[\${e.code}] \${e.message}\`,
);
console.log("mapBoth(user 99):", display3);

// ---------------------------------------------------------------------------
// 4. flatten — unwrap a nested Result<Result<T, E>, E>
// ---------------------------------------------------------------------------
console.log("\\n--- 4. flatten ---");

function parseAge(raw: RawUser): Result<Result<number, string>, string> {
  const n = Number(raw.age_str);
  if (Number.isNaN(n)) return ok(err("age is not a number"));
  if (n < 0) return ok(err("age cannot be negative"));
  return ok(ok(n));
}

const nested = fetchUser(1).mapErr((e) => e.message).andThen(parseAge);
console.log("Before flatten (nested):", nested);

const flat = nested.flatten();
console.log("After flatten:", flat);

const nestedBad = fetchUser(2).mapErr((e) => e.message).andThen(parseAge);
const flatBad = nestedBad.flatten();
console.log("flatten(bad age):", flatBad);

// ---------------------------------------------------------------------------
// 5. flip — swap Ok and Err tracks
// ---------------------------------------------------------------------------
console.log("\\n--- 5. flip ---");

const success: Result<string, number> = ok("hello");
const flipped = success.flip();
console.log("flip(ok('hello')):", flipped);
console.log("  flipped._tag:", flipped._tag);

const failure: Result<string, number> = err(42);
const flippedErr = failure.flip();
console.log("flip(err(42)):", flippedErr);
console.log("  flippedErr._tag:", flippedErr._tag);

// Double flip returns to original
const doubleFlip = success.flip().flip();
console.log("double flip:", doubleFlip);

console.log("\\nAll transformations demonstrated.");
`;

export const resultTransformations: ExampleTemplate = {
  id: "result-transformations",
  title: "Result: Transformations",
  description: "map, mapErr, mapBoth, flatten, flip — pure value transformations",
  category: "result",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "health",
};
