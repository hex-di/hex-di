/**
 * SagaTracingHook Tests
 *
 * Tests the SagaTracingHook: span creation, filter exclusion,
 * traceCompensation toggle, scope/context attribute injection.
 */

import { describe, it, expect, vi } from "vitest";
import { createSagaTracingHook } from "../src/introspection/saga-tracing-hook.js";
import type { TracerLike } from "../src/introspection/types.js";

// =============================================================================
// Helpers
// =============================================================================

function createMockTracer(): TracerLike & {
  pushSpan: ReturnType<typeof vi.fn<TracerLike["pushSpan"]>>;
  popSpan: ReturnType<typeof vi.fn<TracerLike["popSpan"]>>;
} {
  return {
    pushSpan: vi.fn<TracerLike["pushSpan"]>(),
    popSpan: vi.fn<TracerLike["popSpan"]>(),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("SagaTracingHook", () => {
  it("creates span for step execution", () => {
    const tracer = createMockTracer();
    const hook = createSagaTracingHook({ tracer });

    hook.onStepStart("OrderSaga", "Payment", 0);
    hook.onStepEnd("OrderSaga", true);

    expect(tracer.pushSpan).toHaveBeenCalledWith(
      "saga:OrderSaga/Payment",
      expect.objectContaining({
        "hex-di.saga.name": "OrderSaga",
        "hex-di.saga.step.name": "Payment",
        "hex-di.saga.step.index": "0",
      })
    );
    expect(tracer.popSpan).toHaveBeenCalledWith("ok");
  });

  it("creates span for failed step", () => {
    const tracer = createMockTracer();
    const hook = createSagaTracingHook({ tracer });

    hook.onStepStart("OrderSaga", "Shipping", 1);
    hook.onStepEnd("OrderSaga", false);

    expect(tracer.popSpan).toHaveBeenCalledWith("error");
  });

  it("creates span for compensation", () => {
    const tracer = createMockTracer();
    const hook = createSagaTracingHook({ tracer });

    hook.onCompensationStart("OrderSaga", "Payment");
    hook.onCompensationEnd("OrderSaga", true);

    expect(tracer.pushSpan).toHaveBeenCalledWith(
      "saga:compensation:Payment",
      expect.objectContaining({
        "hex-di.saga.name": "OrderSaga",
        "hex-di.saga.failed.step": "Payment",
      })
    );
    expect(tracer.popSpan).toHaveBeenCalledWith("ok");
  });

  it("creates span for failed compensation", () => {
    const tracer = createMockTracer();
    const hook = createSagaTracingHook({ tracer });

    hook.onCompensationStart("OrderSaga", "Payment");
    hook.onCompensationEnd("OrderSaga", false);

    expect(tracer.popSpan).toHaveBeenCalledWith("error");
  });

  it("filter excludes non-matching saga names for steps", () => {
    const tracer = createMockTracer();
    const hook = createSagaTracingHook({
      tracer,
      filter: sagaName => sagaName === "OrderSaga",
    });

    hook.onStepStart("PaymentSaga", "Charge", 0);
    hook.onStepEnd("PaymentSaga", true);

    expect(tracer.pushSpan).not.toHaveBeenCalled();
    expect(tracer.popSpan).not.toHaveBeenCalled();
  });

  it("filter excludes non-matching saga names for compensation", () => {
    const tracer = createMockTracer();
    const hook = createSagaTracingHook({
      tracer,
      filter: sagaName => sagaName === "OrderSaga",
    });

    hook.onCompensationStart("PaymentSaga", "Charge");
    hook.onCompensationEnd("PaymentSaga", true);

    expect(tracer.pushSpan).not.toHaveBeenCalled();
    expect(tracer.popSpan).not.toHaveBeenCalled();
  });

  it("traceCompensation=false skips compensation spans", () => {
    const tracer = createMockTracer();
    const hook = createSagaTracingHook({
      tracer,
      traceCompensation: false,
    });

    hook.onCompensationStart("OrderSaga", "Payment");
    hook.onCompensationEnd("OrderSaga", true);

    expect(tracer.pushSpan).not.toHaveBeenCalled();
    expect(tracer.popSpan).not.toHaveBeenCalled();

    // Steps still traced
    hook.onStepStart("OrderSaga", "Payment", 0);
    expect(tracer.pushSpan).toHaveBeenCalledTimes(1);
  });

  it("includes scopeId in attributes", () => {
    const tracer = createMockTracer();
    const hook = createSagaTracingHook({
      tracer,
      scopeId: "scope-123",
    });

    hook.onStepStart("OrderSaga", "Payment", 0);

    expect(tracer.pushSpan).toHaveBeenCalledWith(
      "saga:OrderSaga/Payment",
      expect.objectContaining({ "hex-di.saga.scope.id": "scope-123" })
    );
  });

  it("includes traceContext entries in attributes", () => {
    const tracer = createMockTracer();
    const hook = createSagaTracingHook({
      tracer,
      traceContext: { trace_id: "t-1", span_id: "s-1" },
    });

    hook.onStepStart("OrderSaga", "Payment", 0);

    expect(tracer.pushSpan).toHaveBeenCalledWith(
      "saga:OrderSaga/Payment",
      expect.objectContaining({
        trace_id: "t-1",
        span_id: "s-1",
      })
    );
  });

  it("includes scopeId and traceContext in compensation spans", () => {
    const tracer = createMockTracer();
    const hook = createSagaTracingHook({
      tracer,
      scopeId: "scope-456",
      traceContext: { request_id: "req-1" },
    });

    hook.onCompensationStart("OrderSaga", "Payment");

    expect(tracer.pushSpan).toHaveBeenCalledWith(
      "saga:compensation:Payment",
      expect.objectContaining({
        "hex-di.saga.scope.id": "scope-456",
        request_id: "req-1",
        "hex-di.saga.name": "OrderSaga",
        "hex-di.saga.failed.step": "Payment",
      })
    );
  });
});
