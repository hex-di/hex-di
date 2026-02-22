// @traces BEH-R06-002
import { describe, it, expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import React from "react";
import { ok } from "@hex-di/result";
import { renderWithResult } from "../../../src/testing/render-helpers.js";
import { Match } from "../../../src/components/match.js";

afterEach(cleanup);

describe("renderWithResult (BEH-R06-005)", () => {
  it("renders component via RTL render", () => {
    const result = ok("Alice");
    const { container } = renderWithResult(
      <Match
        result={result}
        ok={(name) => <p>{name}</p>}
        err={() => <p>Error</p>}
      />,
    );

    expect(container.textContent).toBe("Alice");
  });
});
