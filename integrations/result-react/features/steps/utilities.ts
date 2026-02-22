import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { fromAction } from "../../src/utilities/from-action.js";
import type { ReactResultWorld } from "./world.js";

// --- Given ---

Given("an async function that returns {string}", function (this: ReactResultWorld, value: string) {
  this.fn = async () => value;
});

Given("an async function that throws {string}", function (this: ReactResultWorld, error: string) {
  this.fn = async () => {
    throw new Error(error);
  };
});

Given("an async function accepting name and age", function (this: ReactResultWorld) {
  this.fn = async (name: string, age: number) => ({ name, age });
});

// --- When ---

When("I wrap it with fromAction and call it", async function (this: ReactResultWorld) {
  const wrapped = fromAction(this.fn!, (e) => String(e));
  this.result = await wrapped();
});

When("I wrap it with fromAction and call it with {string} and {int}", async function (this: ReactResultWorld, name: string, age: number) {
  const wrapped = fromAction(this.fn!, (e) => String(e));
  this.result = await wrapped(name, age);
});

// --- Then ---

Then("the result is Ok with value {string}", function (this: ReactResultWorld, expected: string) {
  assert.ok(this.result!.isOk(), "Expected Ok");
  assert.strictEqual(this.result!.isOk() && this.result!.value, expected);
});

Then("the result is Err with error {string}", function (this: ReactResultWorld, expected: string) {
  assert.ok(this.result!.isErr(), "Expected Err");
  if (this.result!.isErr()) {
    assert.ok(String(this.result!.error).includes(expected));
  }
});

Then("the result is Ok with value containing name {string} and age {int}", function (this: ReactResultWorld, name: string, age: number) {
  assert.ok(this.result!.isOk(), "Expected Ok");
  if (this.result!.isOk()) {
    assert.strictEqual(this.result!.value.name, name);
    assert.strictEqual(this.result!.value.age, age);
  }
});
