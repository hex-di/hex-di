/**
 * Result: Option Type
 *
 * Demonstrates some, none, isOption, toOption, toOptionErr,
 * transpose, and fromOptionJSON — the Option type and its bridges to Result.
 * Scenario: user profile lookups with optional fields.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  ok, err, some, none, isOption, fromOptionJSON,
  type Option, type Result,
} from "@hex-di/result";

// ---------------------------------------------------------------------------
// 1. some & none — Option constructors
// ---------------------------------------------------------------------------
console.log("--- 1. some & none ---");

const present = some(42);
const absent = none();

console.log("some(42):", present);
console.log("none():", absent);
console.log("some.isSome():", present.isSome());
console.log("none.isNone():", absent.isNone());
console.log("none() === none():", none() === none()); // singleton

// ---------------------------------------------------------------------------
// 2. Option methods — map, filter, andThen, match, unwrapOr
// ---------------------------------------------------------------------------
console.log("\\n--- 2. Option methods ---");

const doubled = some(21).map(x => x * 2);
console.log("map:", doubled);

const filtered = some(5).filter(x => x > 10);
console.log("filter (fails):", filtered);

const chained = some(3).andThen(x => x > 0 ? some(x * 10) : none());
console.log("andThen:", chained);

const matched = some("hello").match(
  v => \`Got: \${v}\`,
  () => "Nothing",
);
console.log("match:", matched);

console.log("unwrapOr:", none().unwrapOr("default"));

// ---------------------------------------------------------------------------
// 3. isOption — type guard
// ---------------------------------------------------------------------------
console.log("\\n--- 3. isOption ---");

console.log("isOption(some(1)):", isOption(some(1)));
console.log("isOption(none()):", isOption(none()));
console.log("isOption({ _tag: 'Some', value: 1 }):", isOption({ _tag: "Some", value: 1 }));
console.log("isOption(null):", isOption(null));

// ---------------------------------------------------------------------------
// 4. toOption / toOptionErr — Result to Option bridges
// ---------------------------------------------------------------------------
console.log("\\n--- 4. toOption / toOptionErr ---");

const okResult = ok(42);
const errResult = err("not found");

console.log("ok(42).toOption():", okResult.toOption());
console.log("err(...).toOption():", errResult.toOption());
console.log("ok(42).toOptionErr():", okResult.toOptionErr());
console.log("err(...).toOptionErr():", errResult.toOptionErr());

// ---------------------------------------------------------------------------
// 5. transpose — Option<Result<T,E>> <-> Result<Option<T>,E>
// ---------------------------------------------------------------------------
console.log("\\n--- 5. transpose ---");

// Ok(Some(v)) -> Some(Ok(v))
const okSome = ok(some(42));
console.log("Ok(Some(42)).transpose():", okSome.transpose());

// Ok(None) -> None
const okNone = ok(none());
console.log("Ok(None).transpose():", okNone.transpose());

// Err(e) -> Some(Err(e))
const errVal = err("oops") as Result<Option<number>, string>;
console.log("Err('oops').transpose():", errVal.transpose());

// Option side: Some(Ok(v)) -> Ok(Some(v))
const someOk = some(ok(42));
console.log("Some(Ok(42)).transpose():", someOk.transpose());

// Some(Err(e)) -> Err(e)
const someErr = some(err("fail"));
console.log("Some(Err('fail')).transpose():", someErr.transpose());

// None.transpose() -> Ok(None)
console.log("None.transpose():", none().transpose());

// ---------------------------------------------------------------------------
// 6. Option conversion & serialization
// ---------------------------------------------------------------------------
console.log("\\n--- 6. Conversion & serialization ---");

console.log("some(42).toNullable():", some(42).toNullable());
console.log("none().toNullable():", none().toNullable());
console.log("some(42).toUndefined():", some(42).toUndefined());
console.log("none().toUndefined():", none().toUndefined());

// toJSON / fromOptionJSON round-trip
const json = some("hello").toJSON();
console.log("toJSON:", json);

const restored = fromOptionJSON(json);
console.log("fromOptionJSON:", restored);
console.log("isOption(restored):", isOption(restored));

console.log("\\nOption type demonstrated.");
`;

export const resultOption: ExampleTemplate = {
  id: "result-option",
  title: "Result: Option Type",
  description:
    "some, none, isOption, toOption, toOptionErr, transpose, fromOptionJSON — Option and Result bridges",
  category: "result",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "health",
};
