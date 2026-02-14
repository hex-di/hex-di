/**
 * Tests for src/container/result-helpers.ts
 */
import { describe, it, expect, vi } from "vitest";
import {
  mapToContainerError,
  mapToDisposalError,
  emitResultEvent,
  resolveResult,
  recordResult,
} from "../src/container/result-helpers.js";
import { ContainerError, FactoryError, DisposalError } from "../src/errors/index.js";
import { ok, err } from "@hex-di/result";
import type { InspectorAPI } from "../src/inspection/types.js";

describe("mapToContainerError", () => {
  it("returns ContainerError instances as-is", () => {
    const error = new FactoryError("Port1", new Error("fail"));
    const result = mapToContainerError(error);
    expect(result).toBe(error);
  });

  it("wraps non-ContainerError in FactoryError with 'unknown' port", () => {
    const error = new Error("random error");
    const result = mapToContainerError(error);
    expect(result).toBeInstanceOf(FactoryError);
    expect(result.code).toBe("FACTORY_FAILED");
    if (result instanceof FactoryError) {
      expect(result.portName).toBe("unknown");
    }
  });

  it("wraps string errors", () => {
    const result = mapToContainerError("string error");
    expect(result).toBeInstanceOf(FactoryError);
  });

  it("wraps null values", () => {
    const result = mapToContainerError(null);
    expect(result).toBeInstanceOf(FactoryError);
  });
});

describe("mapToDisposalError", () => {
  it("handles AggregateError", () => {
    const aggErr = new AggregateError([new Error("e1"), new Error("e2")]);
    const result = mapToDisposalError(aggErr);
    expect(result).toBeInstanceOf(DisposalError);
    expect(result.causes).toHaveLength(2);
  });

  it("handles regular Error", () => {
    const error = new Error("disposal failure");
    const result = mapToDisposalError(error);
    expect(result).toBeInstanceOf(DisposalError);
    expect(result.causes).toHaveLength(1);
  });

  it("handles non-Error values", () => {
    const result = mapToDisposalError("string error");
    expect(result).toBeInstanceOf(DisposalError);
    expect(result.causes).toHaveLength(1);
  });
});

describe("emitResultEvent", () => {
  it("emits result:ok event for Ok results", () => {
    const emit = vi.fn();
    const inspector = { emit } as unknown as InspectorAPI;
    const result = ok("value");

    emitResultEvent(inspector, "Logger", result);

    expect(emit).toHaveBeenCalledOnce();
    expect(emit.mock.calls[0][0]).toMatchObject({
      type: "result:ok",
      portName: "Logger",
    });
    expect(emit.mock.calls[0][0].timestamp).toBeGreaterThan(0);
  });

  it("emits result:err event for Err results", () => {
    const emit = vi.fn();
    const inspector = { emit } as unknown as InspectorAPI;
    const error = new FactoryError("Logger", new Error("fail"));
    const result = err(error);

    emitResultEvent(inspector, "Logger", result);

    expect(emit).toHaveBeenCalledOnce();
    expect(emit.mock.calls[0][0]).toMatchObject({
      type: "result:err",
      portName: "Logger",
      errorCode: "FACTORY_FAILED",
    });
  });

  it("does nothing when inspector is undefined", () => {
    // Should not throw
    emitResultEvent(undefined, "Logger", ok("value"));
  });

  it("does nothing when inspector.emit is undefined", () => {
    const inspector = {} as unknown as InspectorAPI;
    // Should not throw
    emitResultEvent(inspector, "Logger", ok("value"));
  });
});

describe("resolveResult", () => {
  it("returns Ok result on success", () => {
    const result = resolveResult(() => "resolved-value");
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe("resolved-value");
    }
  });

  it("returns Err result on error", () => {
    const result = resolveResult(() => {
      throw new Error("resolution failure");
    });
    expect(result.isErr()).toBe(true);
  });

  it("uses custom error mapper when provided", () => {
    const customMapper = (err: unknown): any => {
      return new FactoryError("custom", err);
    };
    const result = resolveResult(() => {
      throw new Error("fail");
    }, customMapper);
    expect(result.isErr()).toBe(true);
  });

  it("maps non-ResolutionError to FactoryError with unknown port", () => {
    const result = resolveResult(() => {
      throw "string error";
    });
    expect(result.isErr()).toBe(true);
  });
});

describe("recordResult", () => {
  it("emits result:ok for Ok results and returns same result", () => {
    const emit = vi.fn();
    const inspector = { emit } as unknown as InspectorAPI;
    const result = ok("value");

    const returned = recordResult(inspector, "Logger", result);

    expect(returned).toBe(result);
    expect(emit).toHaveBeenCalledOnce();
    expect(emit.mock.calls[0][0]).toMatchObject({
      type: "result:ok",
      portName: "Logger",
    });
  });

  it("emits result:err for Err results and returns same result", () => {
    const emit = vi.fn();
    const inspector = { emit } as unknown as InspectorAPI;
    const error = { code: "SOME_ERROR" };
    const result = err(error);

    const returned = recordResult(inspector, "Database", result);

    expect(returned).toBe(result);
    expect(emit).toHaveBeenCalledOnce();
    expect(emit.mock.calls[0][0]).toMatchObject({
      type: "result:err",
      portName: "Database",
      errorCode: "SOME_ERROR",
    });
  });

  it("does nothing when inspector.emit is falsy", () => {
    const inspector = {} as unknown as InspectorAPI;
    const result = ok("value");
    const returned = recordResult(inspector, "Logger", result);
    expect(returned).toBe(result);
  });
});
