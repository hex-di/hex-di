// @traces BEH-R02-003 INV-R6
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, act, waitFor } from "@testing-library/react";
import React, { Suspense, useState } from "react";
import { ok, err, ResultAsync, type Result } from "@hex-di/result";
import { useResultSuspense } from "../../../src/hooks/use-result-suspense.js";

afterEach(cleanup);

describe("useResultSuspense (BEH-R02-003)", () => {
  it("suspends then returns Result", async () => {
    let resolvePromise: ((v: string) => void) | null = null;
    const promise = new Promise<string>((r) => {
      resolvePromise = r;
    });

    function Inner() {
      const result = useResultSuspense(
        () => ResultAsync.fromSafePromise(promise),
        [],
      );
      return <span>Got: {result.isOk() ? result.value : "error"}</span>;
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
      resolvePromise!("hello");
    });

    expect(container!.textContent).toBe("Got: hello");
  });

  it("Err result returned, not thrown (INV-R4, INV-R6)", async () => {
    function Inner() {
      const result = useResultSuspense(
        () => ResultAsync.err("mapped error"),
        [],
      );
      return (
        <span>
          {result.isErr() ? `Error: ${result.error}` : String(result.value)}
        </span>
      );
    }

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

    // ResultAsync.err resolves immediately (microtask), so after act it should be ready
    expect(container!.textContent).toBe("Error: mapped error");
    expect(errorCaught).toBe(false);
  });

  it("re-suspends on deps change", async () => {
    // Create externally-controlled promises
    const promises = new Map<string, { promise: Promise<string>; resolve: (v: string) => void }>();
    function getControlledPromise(key: string) {
      if (!promises.has(key)) {
        let resolve!: (v: string) => void;
        const promise = new Promise<string>((r) => { resolve = r; });
        promises.set(key, { promise, resolve });
      }
      return promises.get(key)!;
    }

    function Inner({ dep }: { dep: string }) {
      const result = useResultSuspense(
        () => ResultAsync.fromSafePromise(getControlledPromise(dep).promise),
        [dep],
      );
      return <span>Got: {result.isOk() ? result.value : "err"}</span>;
    }

    function Wrapper() {
      const [dep, setDep] = useState("a");
      return (
        <div>
          <Suspense fallback={<span>Loading...</span>}>
            <Inner dep={dep} />
          </Suspense>
          <button onClick={() => setDep("b")}>Change</button>
        </div>
      );
    }

    let container: HTMLElement;
    await act(async () => {
      const rendered = render(<Wrapper />);
      container = rendered.container;
    });

    expect(container!.textContent).toContain("Loading...");

    // Resolve first promise
    await act(async () => {
      getControlledPromise("a").resolve("first");
    });

    expect(container!.textContent).toContain("Got: first");

    // Change deps - triggers re-suspension
    await act(async () => {
      container!.querySelector("button")!.click();
    });

    // Resolve second promise
    await act(async () => {
      getControlledPromise("b").resolve("second");
    });

    expect(container!.textContent).toContain("Got: second");
  });
});
