import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { ResultAsync } from "../../src/index.js";
import type { ResultWorld } from "./world.js";

Given("a ResultAsync.err\\({string})", function (this: ResultWorld, error: string) {
  this.asyncResult = ResultAsync.err(error);
});

When("I await the ResultAsync", async function (this: ResultWorld) {
  this.result = await this.asyncResult!;
});

When("the awaited result is Ok\\({int})", async function (this: ResultWorld, value: number) {
  const awaited = await this.asyncResult!;
  assert.equal(awaited._tag, "Ok");
  if (awaited._tag === "Ok") {
    assert.equal(awaited.value, value);
  }
});

When("I create ResultAsync.ok\\({int})", function (this: ResultWorld, value: number) {
  this.asyncResult = ResultAsync.ok(value);
});

When("I create ResultAsync.err\\({string})", function (this: ResultWorld, error: string) {
  this.asyncResult = ResultAsync.err(error);
});

When("I async map with {string}", function (this: ResultWorld, _expr: string) {
  this.asyncResult = this.asyncResult!.map((x: number) => x * 3);
});

When("I async andThen with {string}", function (this: ResultWorld, _expr: string) {
  this.asyncResult = this.asyncResult!.andThen((x: number) => ResultAsync.ok(x + 1));
});

When("I async match with onOk {string} and onErr {string}", async function (this: ResultWorld, _onOk: string, _onErr: string) {
  this.extractedValue = await this.asyncResult!.match(
    (v: number) => v * 2,
    (_e: string) => 0,
  );
});

When("I call toAsync", function (this: ResultWorld) {
  this.asyncResult = this.result!.toAsync();
});

Then("the extracted async value is {int}", function (this: ResultWorld, value: number) {
  assert.equal(this.extractedValue, value);
});
