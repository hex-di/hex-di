# Effect Contracts

Demonstrates `EffectContract` and `SatisfiesContract` — type-level function contracts that declare input, output, and effects as part of the function signature.

**Domain:** Medical records API — enforce that record access functions declare all their effects.

## Code

```typescript
import {
  ok,
  err,
  type Result,
  type EffectContract,
  type SatisfiesContract,
  type TaggedError,
} from "@hex-di/result";

// --- Domain errors ---
type NotFound = TaggedError<"NotFound", { patientId: string }>;
type Unauthorized = TaggedError<"Unauthorized", { requiredRole: string }>;
type ValidationErr = TaggedError<"ValidationError", { field: string; message: string }>;

// --- Effect contracts ---
type ReadRecordContract = EffectContract<
  string, // Input: patient ID
  { name: string }, // Output: patient record
  NotFound | Unauthorized // Declared effects
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
  return ok({ name: `Patient ${patientId}` });
}

function updateRecord(input: {
  id: string;
  data: Record<string, string>;
}): Result<{ updated: true }, NotFound | Unauthorized | ValidationErr> {
  if (!input.data.name) return err({ _tag: "ValidationError", field: "name", message: "required" });
  if (input.id === "unknown") return err({ _tag: "NotFound", patientId: input.id });
  return ok({ updated: true });
}

// --- Compile-time verification ---
type ReadSatisfies = SatisfiesContract<typeof readRecord, ReadRecordContract>; // true
type UpdateSatisfies = SatisfiesContract<typeof updateRecord, UpdateRecordContract>; // true

// --- Runtime ---
console.log("--- Read record ---");
console.log(readRecord("P001"));
console.log(readRecord("unknown"));
console.log(readRecord("restricted"));

console.log("\n--- Update record ---");
console.log(updateRecord({ id: "P001", data: { name: "Alice" } }));
console.log(updateRecord({ id: "P001", data: {} }));
```

## Key Takeaways

- `EffectContract<In, Out, Effects>` is a pure type — zero runtime cost
- `SatisfiesContract<Fn, Contract>` verifies at compile time that a function matches its contract
- Violations produce descriptive types: `EffectViolation`, `OutputViolation`, `InputViolation`
- Contracts make effect declarations explicit and verifiable in code review
