/**
 * Result: Extraction & Matching
 *
 * Demonstrates match, unwrapOr, unwrapOrElse, expect, expectErr,
 * toNullable, toUndefined, intoTuple, merge, and toJSON —
 * all the ways to extract values from a Result.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";

// Setup: some Results to extract from
const success: Result<number, string> = ok(42);
const failure: Result<number, string> = err("something went wrong");

// ---------------------------------------------------------------------------
// 1. match — exhaustive pattern matching (both branches required)
// ---------------------------------------------------------------------------
console.log("--- 1. match ---");

const matchOk = success.match(
  (value) => \`Got value: \${value}\`,
  (error) => \`Got error: \${error}\`,
);
console.log("match(success):", matchOk);

const matchErr = failure.match(
  (value) => \`Got value: \${value}\`,
  (error) => \`Got error: \${error}\`,
);
console.log("match(failure):", matchErr);

// ---------------------------------------------------------------------------
// 2. unwrapOr — extract value with a static default
// ---------------------------------------------------------------------------
console.log("\\n--- 2. unwrapOr ---");

console.log("unwrapOr(success, 0):", success.unwrapOr(0));
console.log("unwrapOr(failure, 0):", failure.unwrapOr(0));

// ---------------------------------------------------------------------------
// 3. unwrapOrElse — extract value with a computed default
// ---------------------------------------------------------------------------
console.log("\\n--- 3. unwrapOrElse ---");

const fromOk = success.unwrapOrElse((e) => e.length);
console.log("unwrapOrElse(success):", fromOk);

const fromErr = failure.unwrapOrElse((e) => e.length);
console.log("unwrapOrElse(failure):", fromErr);

// ---------------------------------------------------------------------------
// 4. expect / expectErr — extract with an assertion message
// ---------------------------------------------------------------------------
console.log("\\n--- 4. expect / expectErr ---");

const expected = success.expect("should have a value");
console.log("expect(success):", expected);

try {
  failure.expect("should have a value");
} catch (e) {
  console.log("expect(failure) threw:", e instanceof Error ? e.message : String(e));
}

const expectedErr = failure.expectErr("should have an error");
console.log("expectErr(failure):", expectedErr);

try {
  success.expectErr("should have an error");
} catch (e) {
  console.log("expectErr(success) threw:", e instanceof Error ? e.message : String(e));
}

// ---------------------------------------------------------------------------
// 5. toNullable / toUndefined — convert to nullable types
// ---------------------------------------------------------------------------
console.log("\\n--- 5. toNullable / toUndefined ---");

console.log("toNullable(success):", success.toNullable());
console.log("toNullable(failure):", success.toNullable() === null ? "null" : success.toNullable());
console.log("toNullable(failure) is null:", failure.toNullable() === null);

console.log("toUndefined(success):", success.toUndefined());
console.log("toUndefined(failure) is undefined:", failure.toUndefined() === undefined);

// ---------------------------------------------------------------------------
// 6. intoTuple — convert to [error, value] tuple (Go-style)
// ---------------------------------------------------------------------------
console.log("\\n--- 6. intoTuple ---");

const [errOk, valOk] = success.intoTuple();
console.log("intoTuple(success):", [errOk, valOk]);

const [errFail, valFail] = failure.intoTuple();
console.log("intoTuple(failure):", [errFail, valFail]);

// Pattern: Go-style error handling
const [error, value] = ok("data").intoTuple();
if (error !== null) {
  console.log("Error:", error);
} else {
  console.log("Value:", value);
}

// ---------------------------------------------------------------------------
// 7. merge — extract the inner value regardless of track
// ---------------------------------------------------------------------------
console.log("\\n--- 7. merge ---");

const mergedOk: number | string = success.merge();
console.log("merge(success):", mergedOk);

const mergedErr: number | string = failure.merge();
console.log("merge(failure):", mergedErr);

// Works when both types are the same
const sameType: Result<string, string> = ok("hello");
const merged: string = sameType.merge();
console.log("merge(same type):", merged);

// ---------------------------------------------------------------------------
// 8. toJSON — serializable representation
// ---------------------------------------------------------------------------
console.log("\\n--- 8. toJSON ---");

console.log("toJSON(success):", JSON.stringify(success.toJSON()));
console.log("toJSON(failure):", JSON.stringify(failure.toJSON()));

// Round-trip via JSON.stringify (toJSON is called automatically)
console.log("JSON.stringify(success):", JSON.stringify(success));
console.log("JSON.stringify(failure):", JSON.stringify(failure));

console.log("\\nAll extraction methods demonstrated.");
`;

export const resultExtraction: ExampleTemplate = {
  id: "result-extraction",
  title: "Result: Extraction & Matching",
  description:
    "match, unwrapOr, unwrapOrElse, expect, expectErr, toNullable, toUndefined, intoTuple, merge, toJSON",
  category: "result",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "health",
};
