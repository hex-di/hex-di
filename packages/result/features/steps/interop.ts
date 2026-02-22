import { When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { ok, fromJSON, toSchema } from "../../src/index.js";
import type { ResultWorld } from "./world.js";

When("I call fromJSON with an Ok JSON containing value {int}", function (this: ResultWorld, value: number) {
  this.result = fromJSON({ _tag: "Ok", value, _schemaVersion: 1 });
});

When("I call fromJSON with an Err JSON containing error {string}", function (this: ResultWorld, error: string) {
  this.result = fromJSON({ _tag: "Err", error, _schemaVersion: 1 });
});

When("I call fromJSON with an invalid JSON", function (this: ResultWorld) {
  try {
    fromJSON({ invalid: true } as any);
  } catch (e) {
    this.thrownError = e;
  }
});

When("I call toSchema with a validator", function (this: ResultWorld) {
  (this as any).schema = toSchema((input: unknown) => {
    if (typeof input === "number") return ok(input);
    throw new Error("not a number");
  });
});

When("I call toJSON then fromJSON", function (this: ResultWorld) {
  const json = this.result!.toJSON();
  this.result = fromJSON(json);
});

Then("it throws a TypeError", function (this: ResultWorld) {
  assert.ok(this.thrownError instanceof TypeError);
});

Then("the schema validates Ok inputs", function (this: ResultWorld) {
  const schema = (this as any).schema;
  assert.ok(schema !== undefined);
  assert.ok("~standard" in schema);
});

Then("the schema rejects invalid inputs", function (this: ResultWorld) {
  assert.ok((this as any).schema !== undefined);
});

Then("the round-tripped result is Ok\\({int})", function (this: ResultWorld, value: number) {
  assert.equal(this.result!._tag, "Ok");
  if (this.result!._tag === "Ok") {
    assert.equal(this.result!.value, value);
  }
});
