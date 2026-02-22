import { When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { unwrap, unwrapErr } from "../../src/unsafe/index.js";
import type { ResultWorld } from "./world.js";

When("I call unwrap", function (this: ResultWorld) {
  try {
    this.extractedValue = unwrap(this.result!);
  } catch (e) {
    this.thrownError = e;
  }
});

When("I call unwrapErr", function (this: ResultWorld) {
  try {
    this.extractedValue = unwrapErr(this.result!);
  } catch (e) {
    this.thrownError = e;
  }
});

When("I call expect with message {string}", function (this: ResultWorld, message: string) {
  try {
    this.result!.expect(message);
  } catch (e) {
    this.thrownError = e;
  }
});

Then("the unwrapped value is {int}", function (this: ResultWorld, value: number) {
  assert.equal(this.extractedValue, value);
});

Then("the unwrapped error is {string}", function (this: ResultWorld, error: string) {
  assert.equal(this.extractedValue, error);
});

Then("it throws an UnwrapError", function (this: ResultWorld) {
  assert.ok(this.thrownError !== undefined);
  assert.ok(this.thrownError.constructor.name === "UnwrapError");
});

Then("it throws an UnwrapError with context _tag {string}", function (this: ResultWorld, tag: string) {
  assert.ok(this.thrownError !== undefined);
  assert.equal(this.thrownError.context._tag, tag);
});

Then("it throws an UnwrapError with message {string}", function (this: ResultWorld, message: string) {
  assert.ok(this.thrownError !== undefined);
  assert.ok(this.thrownError.message.includes(message));
});
