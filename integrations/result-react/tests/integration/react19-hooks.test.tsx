// @traces BEH-R03-002 BEH-R03-004 INV-R11
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, act, waitFor } from "@testing-library/react";
import React from "react";
import { ok, err, ResultAsync, type Result } from "@hex-di/result";
import { useOptimisticResult } from "../../src/hooks/use-optimistic-result.js";
import { useResultTransition } from "../../src/hooks/use-result-transition.js";
import { Match } from "../../src/components/match.js";

afterEach(cleanup);

describe("Integration: React 19 hooks (BEH-R03-002, BEH-R03-004)", () => {
  describe("useOptimisticResult + Match", () => {
    it("displays optimistic value then reverts to authoritative", () => {
      function Counter({ authoritative }: { authoritative: Result<number, string> }) {
        const { result, setOptimistic } = useOptimisticResult(
          authoritative,
          (_current, increment: number) =>
            ok(_current.isOk() ? _current.value + increment : 0) as Result<number, string>
        );

        return (
          <div>
            <Match
              result={result}
              ok={v => <span data-testid="value">{v}</span>}
              err={e => <span data-testid="error">{e}</span>}
            />
            <button data-testid="increment" onClick={() => setOptimistic(1)}>
              +1
            </button>
          </div>
        );
      }

      const authoritative: Result<number, string> = ok(10);
      const { getByTestId } = render(<Counter authoritative={authoritative} />);

      expect(getByTestId("value").textContent).toBe("10");
    });

    it("renders error variant through Match", () => {
      function ErrDisplay({ authoritative }: { authoritative: Result<number, string> }) {
        const { result } = useOptimisticResult(
          authoritative,
          (_current, _increment: number) => ok(0) as Result<number, string>
        );
        return (
          <Match
            result={result}
            ok={v => <span data-testid="value">{v}</span>}
            err={e => <span data-testid="error">{e}</span>}
          />
        );
      }

      const authoritative: Result<number, string> = err("fail");
      const { getByTestId } = render(<ErrDisplay authoritative={authoritative} />);
      expect(getByTestId("error").textContent).toBe("fail");
    });
  });

  describe("useResultTransition + Match", () => {
    it("shows pending state while transition resolves", async () => {
      function TransitionDemo() {
        const { result, isPending, startResultTransition } = useResultTransition<string, string>();

        return (
          <div>
            <span data-testid="pending">{String(isPending)}</span>
            {result ? (
              <Match
                result={result}
                ok={v => <span data-testid="value">{v}</span>}
                err={e => <span data-testid="error">{e}</span>}
              />
            ) : (
              <span data-testid="empty">no data</span>
            )}
            <button
              data-testid="load"
              onClick={() => startResultTransition(() => ResultAsync.ok("loaded"))}
            >
              Load
            </button>
          </div>
        );
      }

      const { getByTestId } = render(<TransitionDemo />);

      expect(getByTestId("empty").textContent).toBe("no data");

      await act(async () => {
        getByTestId("load").click();
      });

      await waitFor(() => {
        expect(getByTestId("value").textContent).toBe("loaded");
      });
    });

    it("handles error result in transition", async () => {
      function TransitionErr() {
        const { result, startResultTransition } = useResultTransition<string, string>();

        return (
          <div>
            {result ? (
              <Match
                result={result}
                ok={v => <span data-testid="value">{v}</span>}
                err={e => <span data-testid="error">{e}</span>}
              />
            ) : (
              <span data-testid="empty">empty</span>
            )}
            <button
              data-testid="fail"
              onClick={() => startResultTransition(() => ResultAsync.err("oops"))}
            >
              Fail
            </button>
          </div>
        );
      }

      const { getByTestId } = render(<TransitionErr />);

      await act(async () => {
        getByTestId("fail").click();
      });

      await waitFor(() => {
        expect(getByTestId("error").textContent).toBe("oops");
      });
    });
  });
});
