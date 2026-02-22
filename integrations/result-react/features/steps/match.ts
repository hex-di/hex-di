import { Given, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { ok, err, type Result } from "@hex-di/result";
import { Match } from "../../src/components/match.js";
import type { ReactResultWorld } from "./world.js";

// --- Given ---

Given(
  "a React tree with Match and an Ok result {string}",
  function (this: ReactResultWorld, value: string) {
    const result: Result<string, string> = ok(value);
    this.output = ReactDOMServer.renderToStaticMarkup(
      React.createElement(Match, {
        result,
        ok: (v: string) => React.createElement("span", null, `Hello, ${v}`),
        err: (e: string) => React.createElement("span", null, `Error: ${e}`),
      }),
    );
  },
);

Given(
  "a React tree with Match and an Err result {string}",
  function (this: ReactResultWorld, error: string) {
    const result: Result<string, string> = err(error);
    this.output = ReactDOMServer.renderToStaticMarkup(
      React.createElement(Match, {
        result,
        ok: (v: string) => React.createElement("span", null, `Hello, ${v}`),
        err: (e: string) => React.createElement("span", null, `Error: ${e}`),
      }),
    );
  },
);

// --- Then ---

Then(
  "the rendered output contains {string}",
  function (this: ReactResultWorld, expected: string) {
    assert.ok(
      String(this.output).includes(expected),
      `Expected output to contain "${expected}", got: ${this.output}`,
    );
  },
);
