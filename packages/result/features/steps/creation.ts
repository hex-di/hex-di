import { When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import {
  ok, fromThrowable, tryCatch, fromNullable,
  fromPredicate, fromPromise, fromSafePromise,
  fromAsyncThrowable, ResultAsync,
} from "../../src/index.js";
import type { ResultWorld } from "./world.js";

// --- fromThrowable (zero-arg: returns Result directly) ---

When("I call fromThrowable with a function returning {int}", function (this: ResultWorld, value: number) {
  this.result = fromThrowable(() => value, (e) => String(e));
});

When("I call fromThrowable with a function that throws {string}", function (this: ResultWorld, msg: string) {
  this.result = fromThrowable(
    () => { throw new Error(msg); },
    (e) => (e as Error).message,
  );
});

// --- tryCatch ---

When("I call tryCatch with a function returning {int}", function (this: ResultWorld, value: number) {
  this.result = tryCatch(() => value, (e) => String(e));
});

When("I call tryCatch with a function that throws {string}", function (this: ResultWorld, msg: string) {
  this.result = tryCatch(
    () => { throw new Error(msg); },
    (e) => (e as Error).message,
  );
});

// --- fromNullable ---

When("I call fromNullable with value {int}", function (this: ResultWorld, value: number) {
  this.result = fromNullable(value, () => "was null");
});

When("I call fromNullable with null", function (this: ResultWorld) {
  this.result = fromNullable(null, () => "was null");
});

// --- fromPredicate ---

When("I call fromPredicate with value {int} and predicate {string}", function (this: ResultWorld, value: number, _pred: string) {
  this.result = fromPredicate(value, (x) => x > 0, () => "predicate failed");
});

// --- Async ---

When("I call fromPromise with a promise resolving to {int}", function (this: ResultWorld, value: number) {
  this.asyncResult = fromPromise(Promise.resolve(value), (e) => String(e));
});

When("I call fromPromise with a promise rejecting with {string}", function (this: ResultWorld, msg: string) {
  this.asyncResult = fromPromise(Promise.reject(new Error(msg)), (e) => (e as Error).message);
});

When("I call fromSafePromise with a promise resolving to ok\\({int})", function (this: ResultWorld, value: number) {
  this.asyncResult = fromSafePromise(Promise.resolve(value));
});

When("I call fromAsyncThrowable with an async function returning {int}", function (this: ResultWorld, value: number) {
  const wrapped = fromAsyncThrowable(async () => value, (e) => String(e));
  this.asyncResult = wrapped();
});

// --- Then assertions ---

Then("the result is Ok\\({int})", function (this: ResultWorld, value: number) {
  assert.ok(this.result !== undefined);
  assert.equal(this.result!._tag, "Ok");
  if (this.result!._tag === "Ok") {
    assert.equal(this.result!.value, value);
  }
});

Then("the result is Err with a mapped error", function (this: ResultWorld) {
  assert.ok(this.result !== undefined);
  assert.equal(this.result!._tag, "Err");
});

Then("the result is Err with the nullable error", function (this: ResultWorld) {
  assert.ok(this.result !== undefined);
  assert.equal(this.result!._tag, "Err");
});

Then("the result is Err with the predicate error", function (this: ResultWorld) {
  assert.ok(this.result !== undefined);
  assert.equal(this.result!._tag, "Err");
});

Then("the async result is Ok\\({int})", async function (this: ResultWorld, value: number) {
  const awaited = await this.asyncResult!;
  assert.equal(awaited._tag, "Ok");
  if (awaited._tag === "Ok") {
    assert.equal(awaited.value, value);
  }
});

Then("the async result is Err with a mapped error", async function (this: ResultWorld) {
  const awaited = await this.asyncResult!;
  assert.equal(awaited._tag, "Err");
});

Then("the async result is Err\\({string})", async function (this: ResultWorld, error: string) {
  const awaited = await this.asyncResult!;
  assert.equal(awaited._tag, "Err");
  if (awaited._tag === "Err") {
    assert.equal(awaited.error, error);
  }
});
