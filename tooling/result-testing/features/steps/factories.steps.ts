import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import {
  expectOk,
  expectErr,
  expectOkAsync,
  expectErrAsync,
  expectSome,
  expectNone,
  createResultFixture,
  createOptionFixture,
  mockResultAsync,
} from "../../src/index.js";
import type { ResultTestWorld } from "./world.js";

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

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given<ResultTestWorld>(
  "a result fixture with defaults {int}",
  function (defaults: number) {
    this.resultFixture = createResultFixture(defaults) as ResultTestWorld["resultFixture"];
  },
);

Given<ResultTestWorld>(
  "a result fixture with defaults {string}",
  function (defaults: string) {
    this.resultFixture = createResultFixture(parseValue(defaults)) as ResultTestWorld["resultFixture"];
  },
);

Given<ResultTestWorld>(
  "an option fixture with defaults {string}",
  function (defaults: string) {
    this.optionFixture = createOptionFixture(parseValue(defaults)) as ResultTestWorld["optionFixture"];
  },
);

Given<ResultTestWorld>("a mock ResultAsync", function () {
  this.mockRA = mockResultAsync();
});

// ---------------------------------------------------------------------------
// When — result fixture
// ---------------------------------------------------------------------------

When<ResultTestWorld>("I call fixture.ok\\()", function () {
  this.result = this.resultFixture!.ok();
});

When<ResultTestWorld>(
  "I call fixture.ok\\({string})",
  function (override: string) {
    this.result = this.resultFixture!.ok(parseValue(override));
  },
);

When<ResultTestWorld>(
  "I call fixture.err\\({string})",
  function (error: string) {
    this.result = this.resultFixture!.err(parseValue(error));
  },
);

When<ResultTestWorld>("I call fixture.okAsync\\()", function () {
  this.resultAsync = this.resultFixture!.okAsync();
});

When<ResultTestWorld>(
  "I call fixture.errAsync\\({string})",
  function (error: string) {
    this.resultAsync = this.resultFixture!.errAsync(parseValue(error));
  },
);

// ---------------------------------------------------------------------------
// When — option fixture
// ---------------------------------------------------------------------------

When<ResultTestWorld>("I call fixture.some\\()", function () {
  this.option = this.optionFixture!.some();
});

When<ResultTestWorld>(
  "I call fixture.some\\({string})",
  function (override: string) {
    this.option = this.optionFixture!.some(parseValue(override));
  },
);

When<ResultTestWorld>("I call fixture.none\\()", function () {
  this.option = this.optionFixture!.none();
});

// ---------------------------------------------------------------------------
// When — mockResultAsync
// ---------------------------------------------------------------------------

When<ResultTestWorld>(
  "I resolve it with {string}",
  function (value: string) {
    this.mockRA!.resolve(parseValue(value));
  },
);

When<ResultTestWorld>(
  "I reject it with {string}",
  function (error: string) {
    this.mockRA!.reject(parseValue(error));
  },
);

// ---------------------------------------------------------------------------
// Then — result assertions
// ---------------------------------------------------------------------------

Then<ResultTestWorld>(
  "the result is Ok\\({string})",
  function (expected: string) {
    const value = expectOk(this.result!);
    assert.deepStrictEqual(value, parseValue(expected));
  },
);

Then<ResultTestWorld>(
  "the result is Err\\({string})",
  function (expected: string) {
    const error = expectErr(this.result!);
    assert.deepStrictEqual(error, parseValue(expected));
  },
);

// ---------------------------------------------------------------------------
// Then — ResultAsync assertions
// ---------------------------------------------------------------------------

Then<ResultTestWorld>(
  "the ResultAsync resolves to Ok\\({int})",
  async function (expected: number) {
    const value = await expectOkAsync(
      this.resultAsync ?? this.mockRA!.resultAsync,
    );
    assert.strictEqual(value, expected);
  },
);

Then<ResultTestWorld>(
  "the ResultAsync resolves to Ok\\({string})",
  async function (expected: string) {
    const value = await expectOkAsync(
      this.resultAsync ?? this.mockRA!.resultAsync,
    );
    assert.deepStrictEqual(value, parseValue(expected));
  },
);

Then<ResultTestWorld>(
  "the ResultAsync resolves to Err\\({string})",
  async function (expected: string) {
    const error = await expectErrAsync(
      this.resultAsync ?? this.mockRA!.resultAsync,
    );
    assert.deepStrictEqual(error, parseValue(expected));
  },
);

// ---------------------------------------------------------------------------
// Then — option assertions
// ---------------------------------------------------------------------------

Then<ResultTestWorld>(
  "the option is Some\\({string})",
  function (expected: string) {
    const value = expectSome(this.option!);
    assert.deepStrictEqual(value, parseValue(expected));
  },
);

Then<ResultTestWorld>("the option is None", function () {
  expectNone(this.option!);
});
