import { When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { createError, createErrorGroup, assertNever } from "../../src/index.js";
import type { ResultWorld } from "./world.js";

When("I create an error with tag {string} and fields resource={string}", function (this: ResultWorld, tag: string, resource: string) {
  const Factory = createError(tag);
  this.error = Factory({ resource });
});

When("I call assertNever with a value", function (this: ResultWorld) {
  try {
    assertNever("unexpected" as never);
  } catch (e) {
    this.thrownError = e;
  }
});

When("I create an error group {string} with error {string}", function (this: ResultWorld, namespace: string, errorName: string) {
  const group = createErrorGroup(namespace);
  const Factory = group.create(errorName);
  this.error = Factory({});
  (this as any).errorGroup = group;
  (this as any).errorFactory = Factory;
});

Then("the error has _tag {string}", function (this: ResultWorld, tag: string) {
  assert.equal(this.error._tag, tag);
});

Then("the error has _namespace {string}", function (this: ResultWorld, ns: string) {
  assert.equal(this.error._namespace, ns);
});

Then("the error has field resource {string}", function (this: ResultWorld, value: string) {
  assert.equal(this.error.resource, value);
});

Then("the error is frozen", function (this: ResultWorld) {
  assert.ok(Object.isFrozen(this.error));
});

Then("it throws an error", function (this: ResultWorld) {
  assert.ok(this.thrownError !== undefined);
});

Then("the group is\\() recognizes the error", function (this: ResultWorld) {
  const group = (this as any).errorGroup;
  assert.ok(group.is(this.error));
});
