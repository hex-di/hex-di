// @traces BEH-R03-003 INV-R2
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, waitFor, act } from "@testing-library/react";
import React from "react";
import { ok, ResultAsync } from "@hex-di/result";
import { useSafeTry } from "../../src/hooks/use-safe-try.js";
import { Match } from "../../src/components/match.js";

afterEach(cleanup);

describe("Integration: useSafeTry + Match (BEH-R03-003, BEH-R01-001)", () => {
  it("chains async results through Match", async () => {
    function OrderSummary() {
      const { result, isLoading } = useSafeTry(async function* () {
        const order = yield* await ResultAsync.ok({ id: "O1", userId: "U1" });
        const user = yield* await ResultAsync.ok({
          name: "Alice",
          id: order.userId,
        });
        return ok({ orderId: order.id, userName: user.name });
      }, []);

      if (isLoading || !result) return <span>Loading...</span>;
      return (
        <Match
          result={result}
          ok={({ orderId, userName }) => (
            <span>
              Order {orderId} by {userName}
            </span>
          )}
          err={e => <span>Error: {String(e)}</span>}
        />
      );
    }

    let container: HTMLElement;
    await act(async () => {
      const rendered = render(<OrderSummary />);
      container = rendered.container;
    });

    await waitFor(() => {
      expect(container!.textContent).toBe("Order O1 by Alice");
    });
  });

  it("short-circuits on Err through Match", async () => {
    function FailingOrder() {
      const { result, isLoading } = useSafeTry(async function* () {
        const _order = yield* await ResultAsync.ok({ id: "O1" });
        const _user = yield* await ResultAsync.err("user not found");
        return ok({ orderId: "O1", userName: "never" });
      }, []);

      if (isLoading || !result) return <span>Loading...</span>;
      return (
        <Match
          result={result}
          ok={({ orderId, userName }) => (
            <span>
              {orderId} {userName}
            </span>
          )}
          err={e => <span>Error: {e}</span>}
        />
      );
    }

    let container: HTMLElement;
    await act(async () => {
      const rendered = render(<FailingOrder />);
      container = rendered.container;
    });

    await waitFor(() => {
      expect(container!.textContent).toBe("Error: user not found");
    });
  });
});
