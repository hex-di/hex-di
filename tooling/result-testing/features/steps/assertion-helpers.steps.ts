import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { ok, err, some, none, ResultAsync } from "@hex-di/result";
import {
  expectOk,
  expectErr,
  expectOkAsync,
  expectErrAsync,
  expectSome,
  expectNone,
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
  "a Result created with ok\\({int})",
  function (value: number) {
    this.result = ok(value);
  },
);

Given<ResultTestWorld>(
  "a Result created with ok\\({string})",
  function (value: string) {
    this.result = ok(parseValue(value));
  },
);

Given<ResultTestWorld>(
  "a Result created with err\\({string})",
  function (value: string) {
    this.result = err(parseValue(value));
  },
);

Given<ResultTestWorld>(
  "a Result created with err\\({int})",
  function (value: number) {
    this.result = err(value);
  },
);

Given<ResultTestWorld>(
  "a ResultAsync created with ResultAsync.ok\\({int})",
  function (value: number) {
    this.resultAsync = ResultAsync.ok(value);
  },
);

Given<ResultTestWorld>(
  "a ResultAsync created with ResultAsync.err\\({string})",
  function (value: string) {
    this.resultAsync = ResultAsync.err(parseValue(value));
  },
);

Given<ResultTestWorld>(
  "an Option created with some\\({int})",
  function (value: number) {
    this.option = some(value);
  },
);

Given<ResultTestWorld>("an Option created with none\\(\\)", function () {
  this.option = none();
});

// ---------------------------------------------------------------------------
// When — assertion helpers
// ---------------------------------------------------------------------------

When<ResultTestWorld>("I call expectOk on the Result", function () {
  try {
    this.returnValue = expectOk(this.result!);
  } catch (e) {
    this.thrownError = e as Error;
  }
});

When<ResultTestWorld>("I call expectErr on the Result", function () {
  try {
    this.returnValue = expectErr(this.result!);
  } catch (e) {
    this.thrownError = e as Error;
  }
});

When<ResultTestWorld>(
  "I call expectOkAsync on the ResultAsync",
  async function () {
    try {
      this.resolvedValue = await expectOkAsync(this.resultAsync!);
    } catch (e) {
      this.rejectedError = e as Error;
    }
  },
);

When<ResultTestWorld>(
  "I call expectErrAsync on the ResultAsync",
  async function () {
    try {
      this.resolvedValue = await expectErrAsync(this.resultAsync!);
    } catch (e) {
      this.rejectedError = e as Error;
    }
  },
);

When<ResultTestWorld>("I call expectSome on the Option", function () {
  try {
    this.returnValue = expectSome(this.option!);
  } catch (e) {
    this.thrownError = e as Error;
  }
});

When<ResultTestWorld>("I call expectNone on the Option", function () {
  try {
    expectNone(this.option!);
    this.returnValue = undefined;
  } catch (e) {
    this.thrownError = e as Error;
  }
});

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then<ResultTestWorld>("it returns {int}", function (expected: number) {
  assert.equal(this.thrownError, undefined, "Expected no error to be thrown");
  assert.strictEqual(this.returnValue, expected);
});

Then<ResultTestWorld>("it returns {string}", function (expected: string) {
  assert.equal(this.thrownError, undefined, "Expected no error to be thrown");
  assert.strictEqual(this.returnValue, parseValue(expected));
});

Then<ResultTestWorld>(
  "it throws with message containing {string}",
  function (substring: string) {
    assert.notEqual(
      this.thrownError,
      undefined,
      "Expected an error to be thrown",
    );
    assert.ok(
      this.thrownError!.message.includes(substring),
      `Expected error message to include "${substring}", got: "${this.thrownError!.message}"`,
    );
  },
);

Then<ResultTestWorld>("it does not throw", function () {
  assert.equal(
    this.thrownError,
    undefined,
    `Expected no error but got: ${this.thrownError?.message}`,
  );
});

Then<ResultTestWorld>("it resolves to {int}", function (expected: number) {
  assert.equal(
    this.rejectedError,
    undefined,
    "Expected no rejection",
  );
  assert.strictEqual(this.resolvedValue, expected);
});

Then<ResultTestWorld>("it resolves to {string}", function (expected: string) {
  assert.equal(
    this.rejectedError,
    undefined,
    "Expected no rejection",
  );
  assert.strictEqual(this.resolvedValue, parseValue(expected));
});

Then<ResultTestWorld>(
  "it rejects with message containing {string}",
  function (substring: string) {
    assert.notEqual(
      this.rejectedError,
      undefined,
      "Expected a rejection",
    );
    assert.ok(
      this.rejectedError!.message.includes(substring),
      `Expected rejection message to include "${substring}", got: "${this.rejectedError!.message}"`,
    );
  },
);
