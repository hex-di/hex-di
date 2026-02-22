import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { ok, err, ResultAsync, some, none } from "@hex-di/result";
import {
  matchResult,
  matchResultAsync,
  matchOption,
  resultAction,
} from "../../src/server/index.js";
import type { ReactResultWorld } from "./world.js";

// --- Given ---

Given("an Ok result with value {string}", function (this: ReactResultWorld, value: string) {
  this.result = ok(value);
});

Given("an Err result with error {string}", function (this: ReactResultWorld, error: string) {
  this.result = err(error);
});

Given("a ResultAsync.ok\\({string})", function (this: ReactResultWorld, value: string) {
  this.asyncResult = ResultAsync.ok(value);
});

Given("a ResultAsync.err\\({string})", function (this: ReactResultWorld, error: string) {
  this.asyncResult = ResultAsync.err(error);
});

Given("a Some option with value {string}", function (this: ReactResultWorld, value: string) {
  this.option = some(value);
});

Given("a None option", function (this: ReactResultWorld) {
  this.option = none();
});

Given("a resultAction wrapping a doubling function", function (this: ReactResultWorld) {
  this.fn = resultAction(
    async (n: number) => n * 2,
    (e) => String(e),
  );
});

Given("a resultAction wrapping a throwing function", function (this: ReactResultWorld) {
  this.fn = resultAction(
    async (_s: string) => {
      throw new Error("intentional");
    },
    (e) => String(e),
  );
});

// --- When ---

When("I call matchResult with ok handler returning length and err handler returning {int}", function (this: ReactResultWorld, errVal: number) {
  this.output = matchResult(this.result!, {
    ok: (v: string) => v.length,
    err: () => errVal,
  });
});

When("I call matchResultAsync with ok handler returning uppercase and err handler returning {string}", async function (this: ReactResultWorld, fallback: string) {
  this.output = await matchResultAsync(this.asyncResult!, {
    ok: (v: string) => v.toUpperCase(),
    err: () => fallback,
  });
});

When("I call matchOption with some handler returning greeting and none handler returning {string}", function (this: ReactResultWorld, fallback: string) {
  this.output = matchOption(this.option!, {
    some: (v: string) => `Hello, ${v}`,
    none: () => fallback,
  });
});

When("I execute the action with argument {int}", async function (this: ReactResultWorld, arg: number) {
  this.result = await this.fn!(arg);
});

When("I execute the action with argument {string}", async function (this: ReactResultWorld, arg: string) {
  this.result = await this.fn!(arg);
});

// --- Then ---

Then("the output is {int}", function (this: ReactResultWorld, expected: number) {
  assert.strictEqual(this.output, expected);
});

Then("the output is {string}", function (this: ReactResultWorld, expected: string) {
  assert.strictEqual(this.output, expected);
});

Then("the result is Ok with value {int}", function (this: ReactResultWorld, expected: number) {
  assert.ok(this.result!.isOk(), "Expected Ok");
  assert.strictEqual(this.result!.isOk() && this.result!.value, expected);
});

Then("the result is Err", function (this: ReactResultWorld) {
  assert.ok(this.result!.isErr(), "Expected Err");
});
