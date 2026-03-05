/**
 * Result: Effect Contracts
 *
 * Demonstrates EffectContract and SatisfiesContract —
 * type-level function contracts that declare input, output, and effects.
 * Scenario: medical records API with enforced effect declarations.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  ok, err, type Result,
  type EffectContract, type SatisfiesContract, type TaggedError,
} from "@hex-di/result";

// --- Domain errors ---
type NotFound = TaggedError<"NotFound", { patientId: string }>;
type Unauthorized = TaggedError<"Unauthorized", { requiredRole: string }>;
type ValidationErr = TaggedError<"ValidationError", { field: string; message: string }>;

// --- Effect contracts ---
type ReadRecordContract = EffectContract<
  string,
  { name: string },
  NotFound | Unauthorized
>;

type UpdateRecordContract = EffectContract<
  { id: string; data: Record<string, string> },
  { updated: true },
  NotFound | Unauthorized | ValidationErr
>;

// --- Implementations ---
function readRecord(patientId: string): Result<{ name: string }, NotFound | Unauthorized> {
  if (patientId === "unknown") return err({ _tag: "NotFound", patientId });
  if (patientId === "restricted") return err({ _tag: "Unauthorized", requiredRole: "doctor" });
  return ok({ name: \`Patient \${patientId}\` });
}

function updateRecord(
  input: { id: string; data: Record<string, string> }
): Result<{ updated: true }, NotFound | Unauthorized | ValidationErr> {
  if (!input.data.name) return err({ _tag: "ValidationError", field: "name", message: "required" });
  if (input.id === "unknown") return err({ _tag: "NotFound", patientId: input.id });
  return ok({ updated: true });
}

// Compile-time: SatisfiesContract<typeof readRecord, ReadRecordContract>   => true
// Compile-time: SatisfiesContract<typeof updateRecord, UpdateRecordContract> => true

console.log("--- Read record ---");
console.log(readRecord("P001"));
console.log(readRecord("unknown"));
console.log(readRecord("restricted"));

console.log("\\n--- Update record ---");
console.log(updateRecord({ id: "P001", data: { name: "Alice" } }));
console.log(updateRecord({ id: "P001", data: {} }));

console.log("\\nEffect contracts verified at compile time.");
`;

export const resultEffectContract: ExampleTemplate = {
  id: "result-effect-contract",
  title: "Result: Effect Contracts",
  description:
    "EffectContract, SatisfiesContract — type-level function contracts with effect declarations",
  category: "result",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "health",
};
