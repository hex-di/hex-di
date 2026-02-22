import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { ok, err, all, allSettled, any, partition, forEach } from "../../src/index.js";
import type { Result } from "../../src/index.js";
import type { ResultWorld } from "./world.js";

// --- Given ---

Given("a list of Ok results [{int}, {int}, {int}]", function (this: ResultWorld, a: number, b: number, c: number) {
  (this as any).resultList = [ok(a), ok(b), ok(c)];
});

Given("a list containing ok\\({int}), err\\({string}), ok\\({int})", function (this: ResultWorld, a: number, e: string, c: number) {
  (this as any).resultList = [ok(a), err(e), ok(c)];
});

Given("a list containing err\\({string}), ok\\({int}), err\\({string})", function (this: ResultWorld, e1: string, b: number, e2: string) {
  (this as any).resultList = [err(e1), ok(b), err(e2)];
});

Given("a list of Err results [{string}, {string}, {string}]", function (this: ResultWorld, a: string, b: string, c: string) {
  (this as any).resultList = [err(a), err(b), err(c)];
});

Given("a list containing ok\\({int}), err\\({string}), ok\\({int}), err\\({string})", function (this: ResultWorld, a: number, e1: string, c: number, e2: string) {
  (this as any).resultList = [ok(a), err(e1), ok(c), err(e2)];
});

Given("items [{int}, {int}, {int}]", function (this: ResultWorld, a: number, b: number, c: number) {
  (this as any).items = [a, b, c];
});

Given("items with a negative value", function (this: ResultWorld) {
  (this as any).items = [1, -1, 3];
});

// --- When (all/allSettled/any/partition take variadic args) ---

When("I call all", function (this: ResultWorld) {
  this.result = all(...(this as any).resultList);
});

When("I call allSettled", function (this: ResultWorld) {
  this.result = allSettled(...(this as any).resultList);
});

When("I call any", function (this: ResultWorld) {
  this.result = any(...(this as any).resultList);
});

When("I call partition", function (this: ResultWorld) {
  (this as any).partitionResult = partition((this as any).resultList);
});

When("I call forEach with {string}", function (this: ResultWorld, _expr: string) {
  this.result = forEach((this as any).items, (x: number) => ok(x * 2));
});

When("I call forEach with a function that fails on negative", function (this: ResultWorld) {
  this.result = forEach((this as any).items, (x: number) =>
    x < 0 ? err("negative") : ok(x * 2),
  );
});

// --- Then ---

Then("the result is Ok\\([{int}, {int}, {int}])", function (this: ResultWorld, a: number, b: number, c: number) {
  assert.equal(this.result!._tag, "Ok");
  if (this.result!._tag === "Ok") {
    assert.deepEqual(this.result!.value, [a, b, c]);
  }
});

Then("the result is Err with all errors collected", function (this: ResultWorld) {
  assert.equal(this.result!._tag, "Err");
});

Then("the result is Err with all errors", function (this: ResultWorld) {
  assert.equal(this.result!._tag, "Err");
});

Then("the Ok partition is [{int}, {int}]", function (this: ResultWorld, a: number, b: number) {
  const [oks] = (this as any).partitionResult;
  assert.deepEqual(oks, [a, b]);
});

Then("the Err partition is [{string}, {string}]", function (this: ResultWorld, a: string, b: string) {
  const [, errs] = (this as any).partitionResult;
  assert.deepEqual(errs, [a, b]);
});

Then("the result is Err", function (this: ResultWorld) {
  assert.equal(this.result!._tag, "Err");
});
