// @traces BEH-R01-001 INV-R5 INV-R12
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, within, act } from "@testing-library/react";
import React, { useState, useEffect } from "react";
import { ok, err, type Result } from "@hex-di/result";
import { Match } from "../../../src/components/match.js";

afterEach(cleanup);

describe("Match (BEH-R01-001)", () => {
  it("renders ok branch when result is Ok", () => {
    const { container } = render(
      <Match
        result={ok(42)}
        ok={(value) => <span>Value: {value}</span>}
        err={(error) => <span>Error: {error}</span>}
      />,
    );
    expect(container.textContent).toBe("Value: 42");
  });

  it("renders err branch when result is Err", () => {
    const { container } = render(
      <Match
        result={err("not found")}
        ok={(value) => <span>Value: {value}</span>}
        err={(error) => <span>Error: {error}</span>}
      />,
    );
    expect(container.textContent).toBe("Error: not found");
  });

  it("unmounts previous branch on variant change (key isolation)", () => {
    let effectCleanedUp = false;

    function OkBranch({ value }: { value: number }) {
      useEffect(() => {
        return () => {
          effectCleanedUp = true;
        };
      }, []);
      return <span>Value: {value}</span>;
    }

    function Wrapper() {
      const [result, setResult] = useState<Result<number, string>>(ok(42));
      return (
        <div>
          <Match
            result={result}
            ok={(value) => <OkBranch value={value} />}
            err={(error) => <span>Error: {error}</span>}
          />
          <button onClick={() => setResult(err("fail"))}>Switch</button>
        </div>
      );
    }

    const { container } = render(<Wrapper />);
    const view = within(container);
    expect(view.getByText("Value: 42")).toBeTruthy();

    act(() => {
      view.getByText("Switch").click();
    });
    expect(view.getByText("Error: fail")).toBeTruthy();
    expect(effectCleanedUp).toBe(true);
  });
});
