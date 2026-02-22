// @traces INV-R4
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, act, waitFor } from "@testing-library/react";
import React, { Suspense } from "react";
import { ResultAsync } from "@hex-di/result";
import { useResultAsync } from "../../src/hooks/use-result-async.js";
import { useResultSuspense } from "../../src/hooks/use-result-suspense.js";
import { Match } from "../../src/components/match.js";

afterEach(cleanup);

describe("GxP: Error as value, no exception promotion (INV-R4)", () => {
  it("useResultAsync Err does not trigger ErrorBoundary", async () => {
    let errorCaught = false;

    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { hasError: boolean }
    > {
      state = { hasError: false };
      static getDerivedStateFromError() {
        return { hasError: true };
      }
      componentDidCatch() {
        errorCaught = true;
      }
      render() {
        if (this.state.hasError) return <span>ErrorBoundary triggered</span>;
        return this.props.children;
      }
    }

    function Inner() {
      const { result, isLoading } = useResultAsync(
        () => ResultAsync.err("critical-failure"),
        [],
      );
      if (isLoading || !result) return <span>Loading...</span>;
      return (
        <Match
          result={result}
          ok={(v) => <span>{String(v)}</span>}
          err={(e) => <span>Error handled: {e}</span>}
        />
      );
    }

    let container: HTMLElement;
    await act(async () => {
      const rendered = render(
        <ErrorBoundary>
          <Inner />
        </ErrorBoundary>,
      );
      container = rendered.container;
    });

    await waitFor(() => {
      expect(container!.textContent).toBe("Error handled: critical-failure");
    });
    expect(errorCaught).toBe(false);
  });

  it("useResultSuspense Err does not trigger ErrorBoundary (INV-R6)", async () => {
    let errorCaught = false;

    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { hasError: boolean }
    > {
      state = { hasError: false };
      static getDerivedStateFromError() {
        return { hasError: true };
      }
      componentDidCatch() {
        errorCaught = true;
      }
      render() {
        if (this.state.hasError) return <span>ErrorBoundary triggered</span>;
        return this.props.children;
      }
    }

    function Inner() {
      const result = useResultSuspense(
        () => ResultAsync.err("suspense-error"),
        [],
      );
      return (
        <Match
          result={result}
          ok={(v) => <span>{String(v)}</span>}
          err={(e) => <span>Err: {e}</span>}
        />
      );
    }

    let container: HTMLElement;
    await act(async () => {
      const rendered = render(
        <ErrorBoundary>
          <Suspense fallback={<span>Loading...</span>}>
            <Inner />
          </Suspense>
        </ErrorBoundary>,
      );
      container = rendered.container;
    });

    await waitFor(() => {
      expect(container!.textContent).toBe("Err: suspense-error");
    });
    expect(errorCaught).toBe(false);
  });
});
