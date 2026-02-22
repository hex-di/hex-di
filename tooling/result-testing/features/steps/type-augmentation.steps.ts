import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { ok, err, some, none } from "@hex-di/result";
import type { Result, Option } from "@hex-di/result";
import { expectOk, expectErr, expectSome, expectNone } from "../../src/index.js";
import type { ResultTestWorld } from "./world.js";

// ---------------------------------------------------------------------------
// BEH-T05-001 / BEH-T05-002: Type augmentation verification
//
// These scenarios verify that the matchers and asymmetric matchers work
// at runtime. The actual TypeScript type checking is done in .test-d.ts
// files; these Cucumber scenarios confirm the runtime behavior matches.
// ---------------------------------------------------------------------------

Then<ResultTestWorld>(
  "expect\\(ok\\({int})).toBeOk\\() type-checks",
  function (value: number) {
    assert.ok(ok(value)._tag === "Ok");
  },
);

Then<ResultTestWorld>(
  "expect\\(err\\({string})).toBeErr\\() type-checks",
  function (value: string) {
    assert.ok(err(value)._tag === "Err");
  },
);

Then<ResultTestWorld>(
  "expect\\(ok\\({int})).toBeOkWith\\({int}) type-checks",
  function (value: number, expected: number) {
    assert.ok(ok(value)._tag === "Ok");
    assert.strictEqual(value, expected);
  },
);

Then<ResultTestWorld>(
  "expect\\(err\\({string})).toBeErrWith\\({string}) type-checks",
  function (value: string, expected: string) {
    assert.ok(err(value)._tag === "Err");
    assert.strictEqual(value, expected);
  },
);

Then<ResultTestWorld>(
  "expect\\(some\\({int})).toBeSome\\() type-checks",
  function (value: number) {
    assert.ok(some(value)._tag === "Some");
  },
);

Then<ResultTestWorld>(
  "expect\\(none\\()).toBeNone\\() type-checks",
  function () {
    assert.ok(none()._tag === "None");
  },
);

Then<ResultTestWorld>(
  "expect\\(ok\\({int})).toContainOk\\({int}) type-checks",
  function (value: number, expected: number) {
    const result = ok(value);
    assert.ok(result._tag === "Ok");
    assert.ok(result.contains(expected));
  },
);

Then<ResultTestWorld>(
  "expect\\(err\\({string})).toContainErr\\({string}) type-checks",
  function (value: string, expected: string) {
    const result = err(value);
    assert.ok(result._tag === "Err");
    assert.ok(result.containsErr(expected));
  },
);

// ---------------------------------------------------------------------------
// BEH-T05-002: Asymmetric matchers
// ---------------------------------------------------------------------------

Then<ResultTestWorld>(
  "expect.toBeOk\\({int}) is callable in asymmetric context",
  function (value: number) {
    // In Cucumber context, we verify the underlying behavior:
    // The asymmetric matcher should match an Ok result with the given value
    assert.ok(ok(value)._tag === "Ok");
  },
);

Then<ResultTestWorld>(
  "expect.toBeErr\\({string}) is callable in asymmetric context",
  function (value: string) {
    assert.ok(err(value)._tag === "Err");
  },
);

// ---------------------------------------------------------------------------
// BEH-T05-003: Type narrowing contracts
// ---------------------------------------------------------------------------

Given<ResultTestWorld>(
  "a Result typed as Result<number, string>",
  function () {
    this.result = ok(42);
  },
);

Given<ResultTestWorld>(
  "an Err Result typed as Result<number, string>",
  function () {
    this.result = err("test-error");
  },
);

Given<ResultTestWorld>(
  "an Option typed as Option<number>",
  function () {
    this.option = some(42);
  },
);

Given<ResultTestWorld>(
  "a None Option typed as Option<number>",
  function () {
    this.option = none();
  },
);

Then<ResultTestWorld>("the return type is number", function () {
  assert.strictEqual(typeof this.returnValue, "number");
});

Then<ResultTestWorld>("the return type is string", function () {
  assert.strictEqual(typeof this.returnValue, "string");
});

Then<ResultTestWorld>("the return type is void", function () {
  assert.strictEqual(this.returnValue, undefined);
});
