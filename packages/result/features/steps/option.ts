import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import {
  some, none, isOption, OPTION_BRAND, fromOptionJSON,
} from "../../src/index.js";
import { fromNullable as optionFromNullable } from "../../src/option/from-nullable.js";
import type { ResultWorld } from "./world.js";

Given("a some\\({int})", function (this: ResultWorld, value: number) {
  this.option = some(value);
});

Given("a none\\()", function (this: ResultWorld) {
  this.option = none();
});

When("I create some\\({int})", function (this: ResultWorld, value: number) {
  this.option = some(value);
});

When("I create none\\()", function (this: ResultWorld) {
  this.option = none();
});

When("I call Option.fromNullable with {int}", function (this: ResultWorld, value: number) {
  this.option = optionFromNullable(value);
});

When("I call Option.fromNullable with null", function (this: ResultWorld) {
  this.option = optionFromNullable(null);
});

When("I serialize and deserialize the option", function (this: ResultWorld) {
  const json = this.option.toJSON();
  this.option = fromOptionJSON(json);
});

Then("OPTION_BRAND is a symbol", function (this: ResultWorld) {
  assert.equal(typeof OPTION_BRAND, "symbol");
});

Then("the option _tag is {string}", function (this: ResultWorld, tag: string) {
  assert.equal(this.option._tag, tag);
});

Then("the option value is {int}", function (this: ResultWorld, value: number) {
  assert.equal(this.option.value, value);
});

Then("isOption returns true", function (this: ResultWorld) {
  assert.ok(isOption(this.option));
});

Then("isOption returns false", function (this: ResultWorld) {
  assert.ok(!isOption(this.plainObject));
});

Then("the option is Some\\({int})", function (this: ResultWorld, value: number) {
  assert.equal(this.option._tag, "Some");
  assert.equal(this.option.value, value);
});

Then("the option is None", function (this: ResultWorld) {
  assert.equal(this.option._tag, "None");
});

Then("the round-tripped option is Some\\({int})", function (this: ResultWorld, value: number) {
  assert.equal(this.option._tag, "Some");
  assert.equal(this.option.value, value);
});
