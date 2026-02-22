// @traces BEH-R01-001 BEH-R02-001 INV-R2 INV-R3
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, act, waitFor } from "@testing-library/react";
import React from "react";
import { ok, err, ResultAsync, type Result } from "@hex-di/result";
import { useResultAsync } from "../../src/hooks/use-result-async.js";
import { Match } from "../../src/components/match.js";

afterEach(cleanup);

describe("Integration: useResultAsync + Match lifecycle (BEH-R02-001, BEH-R01-001)", () => {
  it("loading → Ok → render via Match", async () => {
    let resolvePromise: ((v: string) => void) | null = null;
    const promise = new Promise<string>((r) => {
      resolvePromise = r;
    });

    function UserProfile() {
      const { result, isLoading } = useResultAsync(
        () => ResultAsync.fromSafePromise(promise),
        [],
      );
      if (isLoading || !result) return <span>Loading...</span>;
      return (
        <Match
          result={result}
          ok={(name) => <span>Hello, {name}!</span>}
          err={(e) => <span>Error: {e}</span>}
        />
      );
    }

    let container: HTMLElement;
    await act(async () => {
      const rendered = render(<UserProfile />);
      container = rendered.container;
    });

    expect(container!.textContent).toBe("Loading...");

    await act(async () => {
      resolvePromise!("Alice");
    });

    await waitFor(() => {
      expect(container!.textContent).toBe("Hello, Alice!");
    });
  });

  it("loading → Err → render err branch via Match", async () => {
    function FailingProfile() {
      const { result, isLoading } = useResultAsync(
        () => ResultAsync.err("not found"),
        [],
      );
      if (isLoading || !result) return <span>Loading...</span>;
      return (
        <Match
          result={result}
          ok={(val) => <span>{String(val)}</span>}
          err={(e) => <span>Error: {e}</span>}
        />
      );
    }

    let container: HTMLElement;
    await act(async () => {
      const rendered = render(<FailingProfile />);
      container = rendered.container;
    });

    await waitFor(() => {
      expect(container!.textContent).toBe("Error: not found");
    });
  });
});
