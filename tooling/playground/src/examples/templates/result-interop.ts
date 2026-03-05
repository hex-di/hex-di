/**
 * Result: Interop & Serialization
 *
 * Demonstrates fromJSON and toSchema — interoperability with JSON
 * serialization and the Standard Schema validation protocol.
 * Scenario: API response deserialization and form validation.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  ok, err, fromJSON, toSchema, isResult,
  type Result,
} from "@hex-di/result";

// ---------------------------------------------------------------------------
// 1. toJSON — serialize a Result to plain JSON
// ---------------------------------------------------------------------------
console.log("--- 1. toJSON ---");

const okJson = ok(42).toJSON();
console.log("ok(42).toJSON():", okJson);

const errJson = err("not found").toJSON();
console.log("err('not found').toJSON():", errJson);

const complexJson = ok({ name: "Alice", scores: [95, 87] }).toJSON();
console.log("complex toJSON:", complexJson);

// ---------------------------------------------------------------------------
// 2. fromJSON — deserialize back to a branded Result
// ---------------------------------------------------------------------------
console.log("\\n--- 2. fromJSON ---");

const restored = fromJSON(okJson);
console.log("fromJSON(okJson):", restored);
console.log("isResult:", isResult(restored));
console.log("isOk:", restored.isOk());
if (restored.isOk()) console.log("value:", restored.value);

const restoredErr = fromJSON(errJson);
console.log("\\nfromJSON(errJson):", restoredErr);
console.log("isErr:", restoredErr.isErr());
if (restoredErr.isErr()) console.log("error:", restoredErr.error);

// Round-trip
const roundTrip = fromJSON(ok("hello").toJSON());
console.log("\\nRound-trip:", roundTrip);

// ---------------------------------------------------------------------------
// 3. fromJSON with legacy format (no _schemaVersion)
// ---------------------------------------------------------------------------
console.log("\\n--- 3. Legacy JSON format ---");

const legacy = fromJSON({ _tag: "Ok", value: 99 } as { _tag: "Ok"; value: number });
console.log("Legacy format:", legacy);

// ---------------------------------------------------------------------------
// 4. toSchema — wrap a validation function as StandardSchemaV1
// ---------------------------------------------------------------------------
console.log("\\n--- 4. toSchema ---");

const positiveNumber = toSchema((input: unknown) => {
  if (typeof input !== "number") return err("Expected a number");
  if (input <= 0) return err("Must be positive");
  return ok(input);
});

console.log("Schema vendor:", positiveNumber["~standard"].vendor);
console.log("Schema version:", positiveNumber["~standard"].version);

// Valid input
const valid = positiveNumber["~standard"].validate(42);
console.log("\\nvalidate(42):", valid);

// Invalid inputs
const notNumber = positiveNumber["~standard"].validate("hello");
console.log("validate('hello'):", notNumber);

const negative = positiveNumber["~standard"].validate(-5);
console.log("validate(-5):", negative);

// ---------------------------------------------------------------------------
// 5. toSchema with complex validation
// ---------------------------------------------------------------------------
console.log("\\n--- 5. Complex schema ---");

interface UserInput {
  name: string;
  age: number;
}

const userSchema = toSchema((input: unknown) => {
  if (typeof input !== "object" || input === null) return err("Expected object");
  const obj = input as Record<string, unknown>;
  if (typeof obj.name !== "string") return err("name must be a string");
  if (typeof obj.age !== "number") return err("age must be a number");
  if (obj.age < 0 || obj.age > 150) return err("age out of range");
  return ok({ name: obj.name, age: obj.age } as UserInput);
});

console.log("Valid user:", userSchema["~standard"].validate({ name: "Bob", age: 30 }));
console.log("Invalid user:", userSchema["~standard"].validate({ name: 42 }));
console.log("Null input:", userSchema["~standard"].validate(null));

console.log("\\nInterop & serialization demonstrated.");
`;

export const resultInterop: ExampleTemplate = {
  id: "result-interop",
  title: "Result: Interop & Serialization",
  description: "fromJSON, toSchema — JSON round-trip and StandardSchemaV1 validation",
  category: "result",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "health",
};
