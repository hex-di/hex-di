/**
 * Tests for TracingProvider component.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryTracer } from "@hex-di/tracing";
import { TracingProvider } from "../src/providers/tracing-provider.js";
import { useTracer } from "../src/hooks/use-tracer.js";
import { MissingProviderError } from "../src/errors.js";

describe("TracingProvider", () => {
  it("provides tracer to children", () => {
    const tracer = createMemoryTracer();

    function TestComponent() {
      const tracerFromContext = useTracer();
      return <div>{tracerFromContext === tracer ? "same-tracer" : "different-tracer"}</div>;
    }

    render(
      <TracingProvider tracer={tracer}>
        <TestComponent />
      </TracingProvider>
    );

    expect(screen.getByText("same-tracer")).toBeDefined();
  });

  it("provides tracer to deeply nested children", () => {
    const tracer = createMemoryTracer();

    function DeepChild() {
      const tracerFromContext = useTracer();
      return <div>{tracerFromContext === tracer ? "found-tracer" : "not-found"}</div>;
    }

    function MiddleChild() {
      return (
        <div>
          <DeepChild />
        </div>
      );
    }

    render(
      <TracingProvider tracer={tracer}>
        <MiddleChild />
      </TracingProvider>
    );

    expect(screen.getByText("found-tracer")).toBeDefined();
  });

  it("allows multiple TracingProviders to be nested", () => {
    const outerTracer = createMemoryTracer();
    const innerTracer = createMemoryTracer();

    function InnerComponent() {
      const tracer = useTracer();
      return <div>{tracer === innerTracer ? "inner-tracer" : "wrong-tracer"}</div>;
    }

    function OuterComponent() {
      const tracer = useTracer();
      return (
        <div>
          <span>{tracer === outerTracer ? "outer-tracer" : "wrong-outer"}</span>
          <TracingProvider tracer={innerTracer}>
            <InnerComponent />
          </TracingProvider>
        </div>
      );
    }

    render(
      <TracingProvider tracer={outerTracer}>
        <OuterComponent />
      </TracingProvider>
    );

    expect(screen.getByText("outer-tracer")).toBeDefined();
    expect(screen.getByText("inner-tracer")).toBeDefined();
  });

  it("throws MissingProviderError when useTracer called outside provider", () => {
    function TestComponent() {
      try {
        useTracer();
        return <div>should-not-render</div>;
      } catch (error) {
        if (error instanceof MissingProviderError) {
          return <div>caught-error</div>;
        }
        throw error;
      }
    }

    render(<TestComponent />);

    expect(screen.getByText("caught-error")).toBeDefined();
  });
});
