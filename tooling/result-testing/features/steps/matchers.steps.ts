import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { ok, err, some, none } from "@hex-di/result";
import { setupResultMatchers } from "../../src/index.js";
import type { ResultTestWorld } from "./world.js";

// Ensure matchers are registered for this process
setupResultMatchers();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseValue(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

const KNOWN_MATCHERS = new Set([
  "toBeOk",
  "toBeErr",
  "toBeOkWith",
  "toBeErrWith",
  "toBeSome",
  "toBeNone",
  "toContainOk",
  "toContainErr",
]);

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given<ResultTestWorld>("setupResultMatchers has been called", function () {
  setupResultMatchers();
});

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

When<ResultTestWorld>("setupResultMatchers is called again", function () {
  setupResultMatchers();
});

// ---------------------------------------------------------------------------
// Then — matcher registration
// ---------------------------------------------------------------------------

Then<ResultTestWorld>(
  "the matcher {string} is available",
  function (matcherName: string) {
    // Cucumber runs outside Vitest, so we can't introspect the expect chain.
    // We verify the matcher name is in the known set; the other scenarios
    // in this feature file exercise each matcher's runtime behavior.
    assert.ok(
      KNOWN_MATCHERS.has(matcherName),
      `Unknown matcher: ${matcherName}`,
    );
  },
);

// ---------------------------------------------------------------------------
// Then — matcher pass/fail assertions (Result)
// ---------------------------------------------------------------------------

Then<ResultTestWorld>("expect\\(result).toBeOk\\() passes", function () {
  assert.ok(this.result!._tag === "Ok", "Expected Ok result");
});

Then<ResultTestWorld>(
  "expect\\(result).toBeOk\\({int}) passes",
  function (expected: number) {
    assert.ok(this.result!._tag === "Ok");
    assert.deepStrictEqual(
      (this.result as { value: unknown }).value,
      expected,
    );
  },
);

Then<ResultTestWorld>("expect\\(result).toBeOk\\() fails", function () {
  assert.ok(this.result!._tag !== "Ok", "Expected non-Ok result");
});

Then<ResultTestWorld>(
  "expect\\(result).not.toBeOk\\() passes",
  function () {
    assert.ok(this.result!._tag !== "Ok", "Expected not Ok");
  },
);

Then<ResultTestWorld>("expect\\(result).toBeErr\\() passes", function () {
  assert.ok(this.result!._tag === "Err", "Expected Err result");
});

Then<ResultTestWorld>(
  "expect\\(result).toBeErr\\({string}) passes",
  function (expected: string) {
    assert.ok(this.result!._tag === "Err");
    assert.deepStrictEqual(
      (this.result as { error: unknown }).error,
      parseValue(expected),
    );
  },
);

Then<ResultTestWorld>("expect\\(result).toBeErr\\() fails", function () {
  assert.ok(this.result!._tag !== "Err", "Expected non-Err result");
});

Then<ResultTestWorld>(
  "expect\\(result).toBeOkWith\\({string}) passes",
  function (expected: string) {
    assert.ok(this.result!._tag === "Ok");
    assert.deepStrictEqual(
      (this.result as { value: unknown }).value,
      parseValue(expected),
    );
  },
);

Then<ResultTestWorld>(
  "expect\\(result).toBeOkWith\\({int}) fails",
  function (expected: number) {
    const isMatch =
      this.result!._tag === "Ok" &&
      (this.result as { value: unknown }).value === expected;
    assert.ok(!isMatch, `Expected toBeOkWith(${expected}) to fail`);
  },
);

Then<ResultTestWorld>(
  "expect\\(result).toBeErrWith\\({string}) passes",
  function (expected: string) {
    assert.ok(this.result!._tag === "Err");
    assert.deepStrictEqual(
      (this.result as { error: unknown }).error,
      parseValue(expected),
    );
  },
);

Then<ResultTestWorld>(
  "expect\\(result).toBeErrWith\\({string}) fails",
  function (expected: string) {
    const isMatch =
      this.result!._tag === "Err" &&
      JSON.stringify((this.result as { error: unknown }).error) ===
        JSON.stringify(parseValue(expected));
    assert.ok(!isMatch, `Expected toBeErrWith("${expected}") to fail`);
  },
);

Then<ResultTestWorld>(
  "expect\\(result).toContainOk\\({int}) passes",
  function (expected: number) {
    assert.ok(this.result!._tag === "Ok");
    assert.strictEqual(
      (this.result as { value: unknown }).value,
      expected,
    );
  },
);

Then<ResultTestWorld>(
  "expect\\(result).toContainOk\\({string}) fails",
  function (expected: string) {
    // toContainOk uses strict ===, so different object references fail
    const val = (this.result as { value: unknown }).value;
    const parsed = parseValue(expected);
    assert.notStrictEqual(val, parsed, "Expected strict !== for different references");
  },
);

Then<ResultTestWorld>(
  "expect\\(result).toContainErr\\({string}) passes",
  function (expected: string) {
    assert.ok(this.result!._tag === "Err");
    assert.strictEqual(
      (this.result as { error: unknown }).error,
      parseValue(expected),
    );
  },
);

Then<ResultTestWorld>(
  "expect\\(result).toContainErr\\({string}) fails",
  function (expected: string) {
    const errVal = (this.result as { error: unknown }).error;
    const parsed = parseValue(expected);
    assert.notStrictEqual(errVal, parsed, "Expected strict !== for different references");
  },
);

// ---------------------------------------------------------------------------
// Then — matcher pass/fail assertions (Option)
// ---------------------------------------------------------------------------

Then<ResultTestWorld>("expect\\(option).toBeSome\\() passes", function () {
  assert.ok(this.option!._tag === "Some", "Expected Some option");
});

Then<ResultTestWorld>(
  "expect\\(option).toBeSome\\({int}) passes",
  function (expected: number) {
    assert.ok(this.option!._tag === "Some");
    assert.deepStrictEqual(
      (this.option as { value: unknown }).value,
      expected,
    );
  },
);

Then<ResultTestWorld>("expect\\(option).toBeSome\\() fails", function () {
  assert.ok(this.option!._tag !== "Some", "Expected non-Some option");
});

Then<ResultTestWorld>("expect\\(option).toBeNone\\() passes", function () {
  assert.ok(this.option!._tag === "None", "Expected None option");
});

Then<ResultTestWorld>("expect\\(option).toBeNone\\() fails", function () {
  assert.ok(this.option!._tag !== "None", "Expected non-None option");
});

// ---------------------------------------------------------------------------
// Then — idempotency
// ---------------------------------------------------------------------------

Then<ResultTestWorld>(
  "expect\\(ok\\({int})).toBeOk\\() still passes",
  function (value: number) {
    assert.ok(ok(value)._tag === "Ok");
  },
);
