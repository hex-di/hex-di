// @traces BEH-R02-004 INV-R6 INV-R9
import { describe, it, expect } from "vitest";
import { render, act } from "@testing-library/react";
import React, { Suspense } from "react";
import { ResultAsync } from "@hex-di/result";
import { createResultResource } from "../../../src/hooks/create-result-resource.js";

describe("createResultResource (BEH-R02-004)", () => {
  it("read() suspends, then returns Result", async () => {
    let resolve: ((v: number) => void) | null = null;
    const resource = createResultResource(() =>
      ResultAsync.fromSafePromise(
        new Promise<number>((r) => {
          resolve = r;
        }),
      ),
    );

    function Inner() {
      const result = resource.read();
      return <span>Value: {result.isOk() ? result.value : "err"}</span>;
    }

    const { container } = render(
      <Suspense fallback={<span>Loading...</span>}>
        <Inner />
      </Suspense>,
    );

    expect(container.textContent).toBe("Loading...");

    await act(async () => {
      resolve!(42);
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(container.textContent).toBe("Value: 42");
  });

  it("preload() starts fetch eagerly", async () => {
    let fetchStarted = false;
    let resolve: ((v: string) => void) | null = null;
    const resource = createResultResource(() => {
      fetchStarted = true;
      return ResultAsync.fromSafePromise(
        new Promise<string>((r) => {
          resolve = r;
        }),
      );
    });

    resource.preload();
    expect(fetchStarted).toBe(true);

    // Resolve before render
    resolve!("preloaded");
    await new Promise((r) => setTimeout(r, 0));

    function Inner() {
      const result = resource.read();
      return <span>{result.isOk() ? result.value : "err"}</span>;
    }

    const { container } = render(
      <Suspense fallback={<span>Loading...</span>}>
        <Inner />
      </Suspense>,
    );

    // Should NOT suspend since data is preloaded
    expect(container.textContent).toBe("preloaded");
  });

  it("invalidate() clears cache, re-suspends", async () => {
    let callCount = 0;
    let resolvers: Array<(v: string) => void> = [];

    const resource = createResultResource(() => {
      callCount++;
      return ResultAsync.fromSafePromise(
        new Promise<string>((r) => {
          resolvers.push(r);
        }),
      );
    });

    function Inner() {
      const result = resource.read();
      return <span>{result.isOk() ? result.value : "err"}</span>;
    }

    const { container } = render(
      <Suspense fallback={<span>Loading...</span>}>
        <Inner />
      </Suspense>,
    );

    expect(container.textContent).toBe("Loading...");
    expect(callCount).toBe(1);

    await act(async () => {
      resolvers[0]("first");
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(container.textContent).toBe("first");

    // Invalidate triggers re-fetch on next read
    resource.invalidate();
    expect(callCount).toBe(1); // invalidate doesn't immediately fetch
  });

  it("cache isolation (INV-R9)", async () => {
    let resolveA: ((v: string) => void) | null = null;
    let resolveB: ((v: string) => void) | null = null;

    const resourceA = createResultResource(() =>
      ResultAsync.fromSafePromise(
        new Promise<string>((r) => {
          resolveA = r;
        }),
      ),
    );

    const resourceB = createResultResource(() =>
      ResultAsync.fromSafePromise(
        new Promise<string>((r) => {
          resolveB = r;
        }),
      ),
    );

    function InnerA() {
      const result = resourceA.read();
      return <span>A: {result.isOk() ? result.value : "err"}</span>;
    }

    function InnerB() {
      const result = resourceB.read();
      return <span>B: {result.isOk() ? result.value : "err"}</span>;
    }

    const { container } = render(
      <div>
        <Suspense fallback={<span>Loading A...</span>}>
          <InnerA />
        </Suspense>
        <Suspense fallback={<span>Loading B...</span>}>
          <InnerB />
        </Suspense>
      </div>,
    );

    expect(container.textContent).toContain("Loading A...");
    expect(container.textContent).toContain("Loading B...");

    await act(async () => {
      resolveA!("alpha");
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(container.textContent).toContain("A: alpha");
    expect(container.textContent).toContain("Loading B...");

    await act(async () => {
      resolveB!("beta");
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(container.textContent).toContain("A: alpha");
    expect(container.textContent).toContain("B: beta");
  });
});
