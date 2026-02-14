/**
 * Result: Constructors & Guards
 *
 * Demonstrates every way to create a Result and every runtime type guard.
 * Scenario: parsing and validating user profile data from raw input.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  ok, err,
  fromNullable, fromPredicate, fromThrowable, tryCatch,
  isResult, isResultAsync,
} from "@hex-di/result";
import type { Result } from "@hex-di/result";

// ---------------------------------------------------------------------------
// Scenario: Parse user profile data from a raw input map
// ---------------------------------------------------------------------------

const rawData = new Map<string, string>([
  ["name", "Alice"],
  ["age", "28"],
  ["bio", '{"text":"Hello world"}'],
]);

// 1. fromNullable — lift a nullable Map lookup into a Result
const nameResult = fromNullable(rawData.get("name"), () => "name is missing");
console.log("1. fromNullable (name):", nameResult);

const missingResult = fromNullable(rawData.get("email"), () => "email is missing");
console.log("   fromNullable (email):", missingResult);

// 2. fromPredicate — validate a parsed number meets a condition
const rawAge = rawData.get("age");
const ageResult = fromPredicate(
  Number(rawAge),
  (n) => !Number.isNaN(n) && n >= 18,
  (n) => \`invalid age: \${n}\`,
);
console.log("2. fromPredicate (age >= 18):", ageResult);

const childAge = fromPredicate(
  10,
  (n) => n >= 18,
  (n) => \`too young: \${n}\`,
);
console.log("   fromPredicate (age 10):", childAge);

// 3. fromThrowable — wrap JSON.parse so it returns Result instead of throwing
const safeJsonParse = fromThrowable(
  (input: string) => JSON.parse(input) as { text: string },
  (error) => \`JSON parse failed: \${error instanceof Error ? error.message : String(error)}\`,
);

const bioResult = safeJsonParse(rawData.get("bio") ?? "");
console.log("3. fromThrowable (valid JSON):", bioResult);

const badJsonResult = safeJsonParse("{broken");
console.log("   fromThrowable (bad JSON):", badJsonResult);

// 4. tryCatch — inline try/catch as Result
const urlResult = tryCatch(
  () => new URL("https://example.com/profile"),
  (e) => \`bad url: \${e instanceof Error ? e.message : String(e)}\`,
);
console.log("4. tryCatch (valid URL):", urlResult);

const badUrlResult = tryCatch(
  () => new URL("not a url"),
  (e) => \`bad url: \${e instanceof Error ? e.message : String(e)}\`,
);
console.log("   tryCatch (bad URL):", badUrlResult);

// 5. ok / err — direct constructors
const manual: Result<string, string> = ok("direct value");
const manualErr: Result<string, string> = err("direct error");
console.log("5. ok():", manual);
console.log("   err():", manualErr);

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

console.log("\\n--- Type Guards ---");

// isResult — standalone runtime check for any Result value
console.log("6. isResult(nameResult):", isResult(nameResult));
console.log("   isResult(42):", isResult(42));
console.log("   isResult(null):", isResult(null));

// isResultAsync — standalone check for ResultAsync (sync Results are not ResultAsync)
console.log("7. isResultAsync(nameResult):", isResultAsync(nameResult));

// .isOk() / .isErr() — instance method guards that narrow the type
console.log("8. nameResult.isOk():", nameResult.isOk());
console.log("   missingResult.isOk():", missingResult.isOk());
console.log("   nameResult.isErr():", nameResult.isErr());
console.log("   missingResult.isErr():", missingResult.isErr());

// .isOkAnd() / .isErrAnd() — instance methods combining track check + predicate
console.log("9. nameResult.isOkAnd(v => v.length > 3):", nameResult.isOkAnd((v) => v.length > 3));
console.log("   nameResult.isOkAnd(v => v.length > 10):", nameResult.isOkAnd((v) => v.length > 10));
console.log("   missingResult.isErrAnd(e => e.includes('missing')):", missingResult.isErrAnd((e) => e.includes("missing")));

console.log("\\nAll constructors and guards demonstrated.");
`;

export const resultConstructorsGuards: ExampleTemplate = {
  id: "result-constructors-guards",
  title: "Result: Constructors & Guards",
  description:
    "ok, err, fromNullable, fromPredicate, fromThrowable, tryCatch, isResult, isOk, isErr, isOkAnd, isErrAnd",
  category: "result",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "health",
};
