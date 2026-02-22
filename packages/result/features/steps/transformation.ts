import { When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { ok, err } from "../../src/index.js";
import type { ResultWorld } from "./world.js";

// --- map ---

When("I map with {string}", function (this: ResultWorld, _expr: string) {
  this.result = this.result!.map((x: number) => x * 3);
});

When("I mapErr with {string}", function (this: ResultWorld, _expr: string) {
  this.result = this.result!.mapErr((e: string) => e.toUpperCase());
});

// --- flip ---

When("I flip the result", function (this: ResultWorld) {
  this.result = this.result!.flip();
});

// --- andThen / orElse ---

When("I andThen with {string}", function (this: ResultWorld, _expr: string) {
  this.result = this.result!.andThen((x: number) => ok(x + 1));
});

When("I orElse with {string}", function (this: ResultWorld, _expr: string) {
  this.result = this.result!.orElse((_e: string) => ok(0));
});

// --- andTee / orTee ---

When("I andTee with a side-effect function", function (this: ResultWorld) {
  this.result = this.result!.andTee((v: any) => {
    this.sideEffectValue = v;
  });
});

When("I orTee with a side-effect function", function (this: ResultWorld) {
  this.result = this.result!.orTee((e: any) => {
    this.sideEffectValue = e;
  });
});

// --- and / or ---

When("I call and with ok\\({int})", function (this: ResultWorld, value: number) {
  this.result = this.result!.and(ok(value));
});

When("I call or with ok\\({int})", function (this: ResultWorld, value: number) {
  this.result = this.result!.or(ok(value));
});

// --- Then ---

Then("the result is Err\\({string})", function (this: ResultWorld, error: string) {
  assert.ok(this.result !== undefined);
  assert.equal(this.result!._tag, "Err");
  if (this.result!._tag === "Err") {
    assert.equal(this.result!.error, error);
  }
});

Then("the side effect was called with {int}", function (this: ResultWorld, value: number) {
  assert.equal(this.sideEffectValue, value);
});

Then("the side effect was called with {string}", function (this: ResultWorld, value: string) {
  assert.equal(this.sideEffectValue, value);
});
