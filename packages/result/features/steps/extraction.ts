import { When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { ResultWorld } from "./world.js";

// --- match ---

When("I match with onOk {string} and onErr {string}", function (this: ResultWorld, _onOk: string, _onErr: string) {
  this.extractedValue = this.result!.match(
    (v: number) => v * 2,
    (e: string) => e.length,
  );
});

// --- unwrapOr ---

When("I unwrapOr with default {int}", function (this: ResultWorld, defaultValue: number) {
  this.extractedValue = this.result!.unwrapOr(defaultValue);
});

// --- toNullable / toUndefined ---

When("I call toNullable", function (this: ResultWorld) {
  this.extractedValue = this.result!.toNullable();
});

When("I call toUndefined", function (this: ResultWorld) {
  this.extractedValue = this.result!.toUndefined();
});

// --- intoTuple ---

When("I call intoTuple", function (this: ResultWorld) {
  this.tuple = this.result!.intoTuple();
});

// --- toJSON ---

When("I call toJSON", function (this: ResultWorld) {
  this.json = this.result!.toJSON();
});

// --- Then ---

Then("the extracted value is {int}", function (this: ResultWorld, value: number) {
  assert.equal(this.extractedValue, value);
});

Then("the extracted value is null", function (this: ResultWorld) {
  assert.equal(this.extractedValue, null);
});

Then("the extracted value is undefined", function (this: ResultWorld) {
  assert.equal(this.extractedValue, undefined);
});

// intoTuple: Ok returns [null, value], Err returns [error, null]
Then("the tuple is [{int}, null]", function (this: ResultWorld, value: number) {
  assert.deepEqual(this.tuple, [null, value]);
});

Then("the tuple is [null, {string}]", function (this: ResultWorld, error: string) {
  assert.deepEqual(this.tuple, [error, null]);
});

Then("the JSON has _tag {string} and value {int}", function (this: ResultWorld, tag: string, value: number) {
  assert.equal(this.json._tag, tag);
  assert.equal(this.json.value, value);
});

Then("the JSON has _tag {string} and error {string}", function (this: ResultWorld, tag: string, error: string) {
  assert.equal(this.json._tag, tag);
  assert.equal(this.json.error, error);
});
