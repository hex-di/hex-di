import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { ok, err, some, ResultAsync } from "@hex-di/result";
import {
  expectFrozen,
  expectResultBrand,
  expectOptionBrand,
  expectImmutableResult,
  expectNeverRejects,
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
  "a frozen object {string}",
  function (json: string) {
    this.returnValue = Object.freeze(parseValue(json));
  },
);

Given<ResultTestWorld>(
  "a non-frozen object {string}",
  function (json: string) {
    this.returnValue = parseValue(json);
  },
);

Given<ResultTestWorld>(
  "a structural fake Result {string}",
  function (json: string) {
    this.returnValue = parseValue(json);
  },
);

Given<ResultTestWorld>(
  "a structural fake Option {string}",
  function (json: string) {
    this.returnValue = parseValue(json);
  },
);

Given<ResultTestWorld>(
  "a frozen structural fake Result {string}",
  function (json: string) {
    this.returnValue = Object.freeze(parseValue(json));
  },
);

// ---------------------------------------------------------------------------
// When — expectFrozen
// ---------------------------------------------------------------------------

When<ResultTestWorld>("I call expectFrozen on it", function () {
  try {
    expectFrozen(this.returnValue);
    this.thrownError = undefined;
  } catch (e) {
    this.thrownError = e as Error;
  }
});

When<ResultTestWorld>("I call expectFrozen on the Result", function () {
  try {
    expectFrozen(this.result);
    this.thrownError = undefined;
  } catch (e) {
    this.thrownError = e as Error;
  }
});

When<ResultTestWorld>(
  "I call expectFrozen with null",
  function () {
    try {
      expectFrozen(null);
      this.thrownError = undefined;
    } catch (e) {
      this.thrownError = e as Error;
    }
  },
);

When<ResultTestWorld>(
  "I call expectFrozen with {int}",
  function (value: number) {
    try {
      expectFrozen(value);
      this.thrownError = undefined;
    } catch (e) {
      this.thrownError = e as Error;
    }
  },
);

// ---------------------------------------------------------------------------
// When — expectResultBrand
// ---------------------------------------------------------------------------

When<ResultTestWorld>("I call expectResultBrand on the Result", function () {
  try {
    expectResultBrand(this.result);
    this.thrownError = undefined;
  } catch (e) {
    this.thrownError = e as Error;
  }
});

When<ResultTestWorld>("I call expectResultBrand on it", function () {
  try {
    expectResultBrand(this.returnValue);
    this.thrownError = undefined;
  } catch (e) {
    this.thrownError = e as Error;
  }
});

When<ResultTestWorld>(
  "I call expectResultBrand with {int}",
  function (value: number) {
    try {
      expectResultBrand(value);
      this.thrownError = undefined;
    } catch (e) {
      this.thrownError = e as Error;
    }
  },
);

// ---------------------------------------------------------------------------
// When — expectOptionBrand
// ---------------------------------------------------------------------------

When<ResultTestWorld>("I call expectOptionBrand on the Option", function () {
  try {
    expectOptionBrand(this.option);
    this.thrownError = undefined;
  } catch (e) {
    this.thrownError = e as Error;
  }
});

When<ResultTestWorld>("I call expectOptionBrand on it", function () {
  try {
    expectOptionBrand(this.returnValue);
    this.thrownError = undefined;
  } catch (e) {
    this.thrownError = e as Error;
  }
});

// ---------------------------------------------------------------------------
// When — expectImmutableResult
// ---------------------------------------------------------------------------

When<ResultTestWorld>(
  "I call expectImmutableResult on the Result",
  function () {
    try {
      expectImmutableResult(this.result!);
      this.thrownError = undefined;
    } catch (e) {
      this.thrownError = e as Error;
    }
  },
);

When<ResultTestWorld>(
  "I call expectImmutableResult on it",
  function () {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expectImmutableResult(this.returnValue as any);
      this.thrownError = undefined;
    } catch (e) {
      this.thrownError = e as Error;
    }
  },
);

When<ResultTestWorld>(
  "I call expectImmutableResult with null",
  function () {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expectImmutableResult(null as any);
      this.thrownError = undefined;
    } catch (e) {
      this.thrownError = e as Error;
    }
  },
);

// ---------------------------------------------------------------------------
// When — expectNeverRejects
// ---------------------------------------------------------------------------

When<ResultTestWorld>(
  "I call expectNeverRejects on the ResultAsync",
  async function () {
    try {
      await expectNeverRejects(this.resultAsync!);
      this.thrownError = undefined;
    } catch (e) {
      this.thrownError = e as Error;
    }
  },
);

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then<ResultTestWorld>("it resolves without throwing", function () {
  assert.equal(
    this.thrownError,
    undefined,
    `Expected no error but got: ${this.thrownError?.message}`,
  );
});
