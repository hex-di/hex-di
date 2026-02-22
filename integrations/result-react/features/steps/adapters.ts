import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { ResultAsync } from "@hex-di/result";
import {
  toQueryFn,
  toQueryOptions,
  toMutationFn,
  toMutationOptions,
} from "../../src/adapters/tanstack-query.js";
import { toSwrFetcher } from "../../src/adapters/swr.js";
import type { ReactResultWorld } from "./world.js";

// --- Given ---

Given("a ResultAsync-returning function that succeeds with {string}", function (this: ReactResultWorld, value: string) {
  this.fn = () => ResultAsync.ok(value);
});

Given("a ResultAsync-returning function that fails with {string}", function (this: ReactResultWorld, error: string) {
  this.fn = () => ResultAsync.err(error);
});

Given("a ResultAsync mutation function that succeeds", function (this: ReactResultWorld) {
  this.fn = (name: string) => ResultAsync.ok(`saved: ${name}`);
});

Given("a ResultAsync mutation function that fails", function (this: ReactResultWorld) {
  this.fn = (_name: string) => ResultAsync.err("fail");
});

Given("a key-based ResultAsync function that succeeds", function (this: ReactResultWorld) {
  this.fn = (key: string) => ResultAsync.ok(`data-${key}`);
});

Given("a key-based ResultAsync function that fails", function (this: ReactResultWorld) {
  this.fn = (_key: string) => ResultAsync.err("not found");
});

// --- When ---

When("I wrap it with toQueryFn and call it", async function (this: ReactResultWorld) {
  const queryFn = toQueryFn(this.fn!);
  try {
    this.output = await queryFn();
  } catch (e) {
    this.error = e;
  }
});

When("I call toQueryOptions with a query key", function (this: ReactResultWorld) {
  this.hookResult = toQueryOptions(["user", 1], this.fn!);
});

When("I wrap it with toMutationFn and call it with {string}", async function (this: ReactResultWorld, arg: string) {
  const mutationFn = toMutationFn(this.fn!);
  try {
    this.output = await mutationFn(arg);
  } catch (e) {
    this.error = e;
  }
});

When("I wrap it with toMutationOptions and call it with {string}", async function (this: ReactResultWorld, arg: string) {
  const opts = toMutationOptions(this.fn!);
  try {
    this.output = await opts.mutationFn(arg);
  } catch (e) {
    this.error = e;
  }
});

When("I wrap it with toSwrFetcher and call it with {string}", async function (this: ReactResultWorld, key: string) {
  const fetcher = toSwrFetcher(this.fn!);
  try {
    this.output = await fetcher(key);
  } catch (e) {
    this.error = e;
  }
});

// --- Then ---

Then("the output resolves to {string}", function (this: ReactResultWorld, expected: string) {
  assert.strictEqual(this.output, expected);
});

Then("the output rejects with {string}", function (this: ReactResultWorld, expected: string) {
  assert.strictEqual(this.error, expected);
});

Then("the output has the expected queryKey", function (this: ReactResultWorld) {
  assert.deepStrictEqual(this.hookResult.queryKey, ["user", 1]);
});

Then("the queryFn resolves to {string}", async function (this: ReactResultWorld, expected: string) {
  const result = await this.hookResult.queryFn();
  assert.strictEqual(result, expected);
});
