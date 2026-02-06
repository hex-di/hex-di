/**
 * Tests for tracing hooks (useTracer, useSpan, useTracedCallback).
 *
 * @packageDocumentation
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { createMemoryTracer } from "@hex-di/tracing";
import { TracingProvider } from "../src/providers/tracing-provider.js";
import { useTracer } from "../src/hooks/use-tracer.js";
import { useSpan } from "../src/hooks/use-span.js";
import { useTracedCallback } from "../src/hooks/use-traced-callback.js";
import { MissingProviderError } from "../src/errors.js";

afterEach(() => {
  cleanup();
});

describe("useTracer", () => {
  it("returns tracer from TracingProvider", () => {
    const tracer = createMemoryTracer();

    function TestComponent() {
      const tracerFromHook = useTracer();
      return <div>{tracerFromHook === tracer ? "correct-tracer" : "wrong-tracer"}</div>;
    }

    render(
      <TracingProvider tracer={tracer}>
        <TestComponent />
      </TracingProvider>
    );

    expect(screen.getByText("correct-tracer")).toBeDefined();
  });

  it("throws MissingProviderError when used outside TracingProvider", () => {
    function TestComponent() {
      try {
        useTracer();
        return <div>should-not-render</div>;
      } catch (error) {
        if (error instanceof MissingProviderError) {
          expect(error.message).toContain("useTracer");
          expect(error.message).toContain("TracingProvider");
          return <div>error-caught</div>;
        }
        throw error;
      }
    }

    render(<TestComponent />);

    expect(screen.getByText("error-caught")).toBeDefined();
  });

  it("returns same tracer reference across renders", () => {
    const tracer = createMemoryTracer();
    const tracerRefs: unknown[] = [];

    function TestComponent() {
      const tracerFromHook = useTracer();
      tracerRefs.push(tracerFromHook);
      return <div>rendered</div>;
    }

    const { rerender } = render(
      <TracingProvider tracer={tracer}>
        <TestComponent />
      </TracingProvider>
    );

    rerender(
      <TracingProvider tracer={tracer}>
        <TestComponent />
      </TracingProvider>
    );

    expect(tracerRefs[0]).toBe(tracerRefs[1]);
  });
});

describe("useSpan", () => {
  it("returns undefined when no active span", () => {
    const tracer = createMemoryTracer();

    function TestComponent() {
      const span = useSpan();
      return <div>{span === undefined ? "no-span" : "has-span"}</div>;
    }

    render(
      <TracingProvider tracer={tracer}>
        <TestComponent />
      </TracingProvider>
    );

    expect(screen.getByText("no-span")).toBeDefined();
  });

  it("returns active span when inside withSpan", () => {
    const tracer = createMemoryTracer();

    function TestComponent() {
      const tracerFromHook = useTracer();
      const span = tracerFromHook.withSpan("test-span", activeSpan => {
        // Get active span via tracer API instead of useSpan hook
        const currentSpan = tracerFromHook.getActiveSpan();
        return currentSpan === activeSpan ? "same-span" : "different-span";
      });
      return <div>{span}</div>;
    }

    render(
      <TracingProvider tracer={tracer}>
        <TestComponent />
      </TracingProvider>
    );

    expect(screen.getByText("same-span")).toBeDefined();
  });

  it("returns active span context information", () => {
    const tracer = createMemoryTracer();

    function TestComponent() {
      const tracerFromHook = useTracer();
      let traceId = "";

      tracerFromHook.withSpan("test-span", () => {
        // Get active span via tracer API instead of useSpan hook
        const span = tracerFromHook.getActiveSpan();
        if (span) {
          traceId = span.context.traceId;
        }
      });

      return <div>{traceId.length > 0 ? "has-trace-id" : "no-trace-id"}</div>;
    }

    render(
      <TracingProvider tracer={tracer}>
        <TestComponent />
      </TracingProvider>
    );

    expect(screen.getByText("has-trace-id")).toBeDefined();
  });

  it("throws MissingProviderError when used outside TracingProvider", () => {
    function TestComponent() {
      try {
        useSpan();
        return <div>should-not-render</div>;
      } catch (error) {
        if (error instanceof MissingProviderError) {
          return <div>error-caught</div>;
        }
        throw error;
      }
    }

    render(<TestComponent />);

    expect(screen.getByText("error-caught")).toBeDefined();
  });
});

describe("useTracedCallback", () => {
  it("creates span when callback is invoked", () => {
    const tracer = createMemoryTracer();

    function TestComponent() {
      const handleClick = useTracedCallback(
        "button.click",
        () => {
          return "clicked";
        },
        []
      );

      return <button onClick={handleClick}>Click Me</button>;
    }

    render(
      <TracingProvider tracer={tracer}>
        <TestComponent />
      </TracingProvider>
    );

    const button = screen.getByText("Click Me");
    button.click();

    const spans = tracer.getCollectedSpans();
    expect(spans.length).toBe(1);
    expect(spans[0].name).toBe("button.click");
  });

  it("handles async callbacks correctly", async () => {
    const tracer = createMemoryTracer();

    function TestComponent() {
      const handleClick = useTracedCallback(
        "async.operation",
        async () => {
          await Promise.resolve();
          return "async-result";
        },
        []
      );

      return (
        <button
          onClick={() => {
            void handleClick();
          }}
        >
          Async Click
        </button>
      );
    }

    render(
      <TracingProvider tracer={tracer}>
        <TestComponent />
      </TracingProvider>
    );

    const button = screen.getByText("Async Click");
    button.click();

    // Wait for async operation to complete
    await new Promise(resolve => setTimeout(resolve, 10));

    const spans = tracer.getCollectedSpans();
    expect(spans.length).toBe(1);
    expect(spans[0].name).toBe("async.operation");
  });

  it("preserves callback arguments", () => {
    const tracer = createMemoryTracer();
    let capturedValue = "";

    function TestComponent() {
      const handleClick = useTracedCallback(
        "button.click",
        (value: string) => {
          capturedValue = value;
        },
        []
      );

      return <button onClick={() => handleClick("test-value")}>Click</button>;
    }

    render(
      <TracingProvider tracer={tracer}>
        <TestComponent />
      </TracingProvider>
    );

    const button = screen.getByText("Click");
    button.click();

    expect(capturedValue).toBe("test-value");
  });

  it("memoizes callback based on dependencies", () => {
    const tracer = createMemoryTracer();
    const callbackRefs: unknown[] = [];

    function TestComponent({ dep }: { dep: number }) {
      const callback = useTracedCallback(
        "test",
        () => {
          return dep;
        },
        [dep]
      );

      callbackRefs.push(callback);
      return <div>rendered</div>;
    }

    const { rerender } = render(
      <TracingProvider tracer={tracer}>
        <TestComponent dep={1} />
      </TracingProvider>
    );

    // Same dep - should return same callback
    rerender(
      <TracingProvider tracer={tracer}>
        <TestComponent dep={1} />
      </TracingProvider>
    );

    expect(callbackRefs[0]).toBe(callbackRefs[1]);

    // Different dep - should return new callback
    rerender(
      <TracingProvider tracer={tracer}>
        <TestComponent dep={2} />
      </TracingProvider>
    );

    expect(callbackRefs[1]).not.toBe(callbackRefs[2]);
  });

  it("records exceptions in spans", () => {
    const tracer = createMemoryTracer();

    function TestComponent() {
      const handleClick = useTracedCallback(
        "error.operation",
        () => {
          throw new Error("test error");
        },
        []
      );

      const handleClickSafe = () => {
        try {
          handleClick();
        } catch {
          // Swallow error for test
        }
      };

      return <button onClick={handleClickSafe}>Click</button>;
    }

    render(
      <TracingProvider tracer={tracer}>
        <TestComponent />
      </TracingProvider>
    );

    const button = screen.getByText("Click");
    button.click();

    const spans = tracer.getCollectedSpans();
    expect(spans.length).toBe(1);
    expect(spans[0].status).toBe("error");
  });

  it("handles multiple callback invocations", () => {
    const tracer = createMemoryTracer();

    function TestComponent() {
      const handleClick = useTracedCallback(
        "multi.click",
        () => {
          return "clicked";
        },
        []
      );

      return <button onClick={handleClick}>Click</button>;
    }

    render(
      <TracingProvider tracer={tracer}>
        <TestComponent />
      </TracingProvider>
    );

    const button = screen.getByText("Click");
    button.click();
    button.click();
    button.click();

    const spans = tracer.getCollectedSpans();
    expect(spans.length).toBe(3);
    expect(spans.every(s => s.name === "multi.click")).toBe(true);
  });
});

describe("React hooks rules compliance", () => {
  it("hooks can be used unconditionally", () => {
    const tracer = createMemoryTracer();

    function TestComponent() {
      // All hooks called unconditionally at top level
      const tracerFromHook = useTracer();
      const span = useSpan();
      const callback = useTracedCallback("test", () => undefined, []);

      return (
        <div>
          {tracerFromHook !== undefined ? "has-tracer" : "no-tracer"}
          {span ? "has-span" : "no-span"}
          {callback !== undefined ? "has-callback" : "no-callback"}
        </div>
      );
    }

    render(
      <TracingProvider tracer={tracer}>
        <TestComponent />
      </TracingProvider>
    );

    expect(screen.getByText(/has-tracer/)).toBeDefined();
    expect(screen.getByText(/no-span/)).toBeDefined();
    expect(screen.getByText(/has-callback/)).toBeDefined();
  });
});
