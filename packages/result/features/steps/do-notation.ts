import { When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { ok, err, bind, let_ } from "../../src/index.js";
import type { Result } from "../../src/index.js";
import type { ResultWorld } from "./world.js";

When("I start with Result.Do", function (this: ResultWorld) {
  this.result = ok({});
});

When("I start with Result.Do and bind {string} to ok\\({int})", function (this: ResultWorld, name: string, value: number) {
  this.result = ok({} as Record<string, number>)
    .andThen(bind(name, () => ok(value)));
});

When("I start with Result.Do and bind {string} to err\\({string})", function (this: ResultWorld, name: string, error: string) {
  this.result = ok({} as Record<string, number>)
    .andThen(bind(name, () => err(error) as Result<number, string>));
});

When("I start with Result.Do, bind {string} to ok\\({int}), and let_ {string} as {string}", function (this: ResultWorld, bindName: string, value: number, letName: string, _expr: string) {
  this.result = ok({} as Record<string, number>)
    .andThen(bind(bindName, () => ok(value)))
    .andThen(let_(letName, (acc: Record<string, number>) => acc[bindName] * 3));
});

When("I pipe Result.Do through bind and let_", function (this: ResultWorld) {
  this.result = ok({} as Record<string, number>)
    .andThen(bind("x", () => ok(1)))
    .andThen(bind("y", () => ok(2)))
    .andThen(let_("sum", (acc: { x: number; y: number }) => acc.x + acc.y));
});

Then("the accumulator is an empty Ok record", function (this: ResultWorld) {
  assert.equal(this.result!._tag, "Ok");
  if (this.result!._tag === "Ok") {
    assert.deepEqual(this.result!.value, {});
  }
});

Then("the accumulator contains x = {int}", function (this: ResultWorld, value: number) {
  assert.equal(this.result!._tag, "Ok");
  if (this.result!._tag === "Ok") {
    assert.equal((this.result!.value as any).x, value);
  }
});

Then("the accumulator contains y = {int}", function (this: ResultWorld, value: number) {
  assert.equal(this.result!._tag, "Ok");
  if (this.result!._tag === "Ok") {
    assert.equal((this.result!.value as any).y, value);
  }
});

Then("the result accumulates all values", function (this: ResultWorld) {
  assert.equal(this.result!._tag, "Ok");
  if (this.result!._tag === "Ok") {
    const acc = this.result!.value as any;
    assert.equal(acc.x, 1);
    assert.equal(acc.y, 2);
    assert.equal(acc.sum, 3);
  }
});
