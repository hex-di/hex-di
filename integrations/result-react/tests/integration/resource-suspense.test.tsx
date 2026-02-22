// @traces BEH-R02-003 BEH-R02-004 INV-R6 INV-R9
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import React, { Suspense } from "react";
import { ResultAsync } from "@hex-di/result";
import { createResultResource } from "../../src/hooks/create-result-resource.js";
import { Match } from "../../src/components/match.js";

afterEach(cleanup);

describe("Integration: createResultResource + Suspense + Match (BEH-R02-004, BEH-R01-001)", () => {
  it("suspends, resolves, and renders through Match", async () => {
    let resolvePromise: ((v: string) => void) | null = null;
    const resource = createResultResource(() =>
      ResultAsync.fromSafePromise(
        new Promise<string>((r) => {
          resolvePromise = r;
        }),
      ),
    );

    function Inner() {
      const result = resource.read();
      return (
        <Match
          result={result}
          ok={(name) => <span>User: {name}</span>}
          err={(e) => <span>Error: {e}</span>}
        />
      );
    }

    let container: HTMLElement;
    await act(async () => {
      const rendered = render(
        <Suspense fallback={<span>Loading...</span>}>
          <Inner />
        </Suspense>,
      );
      container = rendered.container;
    });

    expect(container!.textContent).toBe("Loading...");

    await act(async () => {
      resolvePromise!("Alice");
    });

    expect(container!.textContent).toBe("User: Alice");
  });
});
