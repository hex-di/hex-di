import { When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { ok, err, safeTry } from "../../src/index.js";
import type { ResultWorld } from "./world.js";

When("I run safeTry yielding ok\\({int}) and ok\\({int})", function (this: ResultWorld, a: number, b: number) {
  this.result = safeTry(function* () {
    const x: number = yield* ok(a);
    const y: number = yield* ok(b);
    return ok(x + y);
  });
});

When("I run safeTry yielding ok\\({int}) then err\\({string})", function (this: ResultWorld, a: number, e: string) {
  this.result = safeTry(function* () {
    const _x: number = yield* ok(a);
    const _y: number = yield* err(e);
    return ok(_x + _y);
  });
});

When("I yield* ok\\({int}) inside safeTry", function (this: ResultWorld, value: number) {
  this.result = safeTry(function* () {
    const v: number = yield* ok(value);
    return ok(v);
  });
  this.extractedValue = this.result._tag === "Ok" ? this.result.value : undefined;
});

When("I run safeTry with an Err and code after yield", function (this: ResultWorld) {
  (this as any).reachedAfterYield = false;
  const self = this;
  this.result = safeTry(function* () {
    const _v: number = yield* err("stop");
    (self as any).reachedAfterYield = true;
    return ok(_v);
  });
});

When("I run safeTry that encounters Err", function (this: ResultWorld) {
  this.result = safeTry(function* () {
    const _v: number = yield* err("stop");
    return ok(_v);
  });
});

Then("the safeTry result is Ok\\({int})", function (this: ResultWorld, value: number) {
  assert.equal(this.result!._tag, "Ok");
  if (this.result!._tag === "Ok") {
    assert.equal(this.result!.value, value);
  }
});

Then("the safeTry result is Err\\({string})", function (this: ResultWorld, error: string) {
  assert.equal(this.result!._tag, "Err");
  if (this.result!._tag === "Err") {
    assert.equal(this.result!.error, error);
  }
});

Then("the yielded value is {int}", function (this: ResultWorld, value: number) {
  assert.equal(this.extractedValue, value);
});

Then("the code after yield is not reached", function (this: ResultWorld) {
  assert.equal((this as any).reachedAfterYield, false);
});

Then("the generator is properly cleaned up", function (this: ResultWorld) {
  assert.equal(this.result!._tag, "Err");
});
