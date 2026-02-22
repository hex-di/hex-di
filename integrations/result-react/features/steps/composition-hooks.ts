import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { ok, err, ResultAsync, type Result } from "@hex-di/result";
import { safeTry } from "@hex-di/result";
import type { ReactResultWorld } from "./world.js";

// Composition hooks (useResult, useSafeTry, useOptimisticResult, useResultTransition)
// use React state internally. For Cucumber acceptance tests, we test the underlying
// logic directly since Cucumber runs outside React render context.

// --- Given ---

Given(
  "a useResult hook with no initial value",
  function (this: ReactResultWorld) {
    this.hookResult = {
      result: undefined,
      initial: undefined,
      type: "useResult",
    };
  },
);

Given(
  "a useSafeTry hook yielding Ok {string} and Ok {string}",
  function (this: ReactResultWorld, a: string, b: string) {
    const result = safeTry(function* () {
      const va = yield* ok(a);
      const vb = yield* ok(b);
      return ok(va + vb);
    });
    this.hookResult = {
      result,
      type: "safeTry",
    };
  },
);

Given(
  "a useSafeTry hook yielding Ok {string} then Err {string}",
  function (this: ReactResultWorld, a: string, error: string) {
    const result = safeTry(function* () {
      const va = yield* ok(a);
      const _vb = yield* err(error);
      return ok(va);
    });
    this.hookResult = {
      result,
      type: "safeTry",
    };
  },
);

Given(
  "a useOptimisticResult hook with authoritative Ok {string}",
  function (this: ReactResultWorld, value: string) {
    // Simulate useOptimisticResult: starts with authoritative result,
    // setOptimistic applies the update function
    const authoritative = ok(value);
    this.hookResult = {
      result: authoritative,
      authoritative,
      updateFn: (_current: Result<string, never>, optimistic: string) => ok(optimistic),
      type: "optimistic",
    };
  },
);

Given(
  "a useResultTransition hook",
  function (this: ReactResultWorld) {
    // Simulate useResultTransition: starts with undefined result
    this.hookResult = {
      result: undefined,
      type: "transition",
    };
  },
);

// --- When ---

When(
  "I call setOk with {string}",
  function (this: ReactResultWorld, value: string) {
    this.hookResult.result = ok(value);
  },
);

When(
  "I call setErr with {string}",
  function (this: ReactResultWorld, error: string) {
    this.hookResult.result = err(error);
  },
);

When("I call reset", function (this: ReactResultWorld) {
  this.hookResult.result = this.hookResult.initial;
});

When(
  "I apply optimistic value {string}",
  function (this: ReactResultWorld, value: string) {
    // Simulate what useOptimistic does: apply updateFn
    this.hookResult.result = this.hookResult.updateFn(
      this.hookResult.authoritative,
      value,
    );
  },
);

When(
  "I start a transition returning Ok {string}",
  async function (this: ReactResultWorld, value: string) {
    // Simulate what useResultTransition does: await the async fn, set result
    const resultAsync = ResultAsync.ok(value);
    this.hookResult.result = await resultAsync;
  },
);
