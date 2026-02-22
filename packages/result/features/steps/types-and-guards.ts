import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import {
  ok, err, isResult, isResultAsync,
  RESULT_BRAND, ResultAsync,
} from "../../src/index.js";
import type { ResultWorld } from "./world.js";

// --- Given ---

Given("an Ok result with value {int}", function (this: ResultWorld, value: number) {
  this.result = ok(value);
});

Given("an Ok result with value {string}", function (this: ResultWorld, value: string) {
  this.result = ok(value);
});

Given("an Err result with error {string}", function (this: ResultWorld, error: string) {
  this.result = err(error);
});

Given("a plain object with _tag {string} and value {int}", function (this: ResultWorld, tag: string, value: number) {
  this.plainObject = { _tag: tag, value };
});

Given("a ResultAsync.ok\\({int})", function (this: ResultWorld, value: number) {
  this.asyncResult = ResultAsync.ok(value);
});

Given("a plain Promise resolving to {int}", function (this: ResultWorld, value: number) {
  this.plainPromise = Promise.resolve(value);
});

// --- When ---

When("I create ok\\({int})", function (this: ResultWorld, value: number) {
  this.result = ok(value);
});

When("I create err\\({string})", function (this: ResultWorld, error: string) {
  this.result = err(error);
});

// --- Then ---

Then("the result carries the RESULT_BRAND symbol", function (this: ResultWorld) {
  assert.ok(this.result !== undefined);
  assert.ok(RESULT_BRAND in this.result!);
});

Then("the result _tag is {string}", function (this: ResultWorld, tag: string) {
  assert.ok(this.result !== undefined);
  assert.equal(this.result!._tag, tag);
});

Then("the result value is {int}", function (this: ResultWorld, value: number) {
  assert.ok(this.result !== undefined && this.result._tag === "Ok");
  assert.equal(this.result.value, value);
});

Then("the result value is {string}", function (this: ResultWorld, value: string) {
  assert.ok(this.result !== undefined && this.result._tag === "Ok");
  assert.equal(this.result.value, value);
});

Then("the result error is {string}", function (this: ResultWorld, error: string) {
  assert.ok(this.result !== undefined && this.result._tag === "Err");
  assert.equal(this.result.error, error);
});

Then("the result error is {int}", function (this: ResultWorld, error: number) {
  assert.ok(this.result !== undefined && this.result._tag === "Err");
  assert.equal(this.result.error, error);
});

Then("isResult returns true", function (this: ResultWorld) {
  assert.ok(isResult(this.result));
});

Then("isResult returns false", function (this: ResultWorld) {
  assert.ok(!isResult(this.plainObject));
});

Then("isResultAsync returns true", function (this: ResultWorld) {
  assert.ok(isResultAsync(this.asyncResult));
});

Then("isResultAsync returns false", function (this: ResultWorld) {
  assert.ok(!isResultAsync(this.plainPromise));
});

Then("isOk\\() returns true", function (this: ResultWorld) {
  assert.ok(this.result!.isOk());
});

Then("isOk\\() returns false", function (this: ResultWorld) {
  assert.ok(!this.result!.isOk());
});

Then("isErr\\() returns true", function (this: ResultWorld) {
  assert.ok(this.result!.isErr());
});

Then("isErr\\() returns false", function (this: ResultWorld) {
  assert.ok(!this.result!.isErr());
});

Then("it can be awaited with await", async function (this: ResultWorld) {
  const awaited = await this.asyncResult!;
  assert.ok(awaited._tag === "Ok" || awaited._tag === "Err");
});
