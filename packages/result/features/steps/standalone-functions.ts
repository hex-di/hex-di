import { When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { ok } from "../../src/index.js";
import { map } from "../../src/fn/map.js";
import { andThen } from "../../src/fn/and-then.js";
import { unwrapOr } from "../../src/fn/unwrap-or.js";
import { pipe } from "../../src/fn/pipe.js";
import type { ResultWorld } from "./world.js";

When("I apply standalone map with {string}", function (this: ResultWorld, _expr: string) {
  this.result = map((x: number) => x * 3)(this.result!);
});

When("I pipe through map {string} and map {string}", function (this: ResultWorld, _expr1: string, _expr2: string) {
  this.result = pipe(
    this.result!,
    map((x: number) => x + 1),
    map((x: number) => x * 2),
  );
});

When("I apply standalone andThen with {string}", function (this: ResultWorld, _expr: string) {
  this.result = andThen((x: number) => ok(x + 1))(this.result!);
});

When("I apply standalone unwrapOr with default {int}", function (this: ResultWorld, defaultValue: number) {
  this.extractedValue = unwrapOr(defaultValue)(this.result!);
});
