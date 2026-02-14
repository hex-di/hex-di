/**
 * Tests for library adapter kind detection.
 */

import { describe, it, expect } from "vitest";
import {
  detectLibraryKind,
  detectFromCategory,
  detectFromPortName,
} from "../../../src/panels/graph/library-detection.js";
import type { VisualizableAdapter } from "@hex-di/core";

function createAdapter(overrides: Partial<VisualizableAdapter> = {}): VisualizableAdapter {
  return {
    portName: "TestPort",
    lifetime: "singleton",
    factoryKind: "sync",
    dependencyNames: [],
    origin: "own",
    ...overrides,
  };
}

// =============================================================================
// detectFromCategory
// =============================================================================

describe("detectFromCategory", () => {
  it("returns undefined for undefined metadata", () => {
    expect(detectFromCategory(undefined)).toBeUndefined();
  });

  it("returns undefined for empty metadata", () => {
    expect(detectFromCategory({})).toBeUndefined();
  });

  it("returns undefined for non-string category", () => {
    expect(detectFromCategory({ category: 42 })).toBeUndefined();
  });

  it("returns undefined for category without slash", () => {
    expect(detectFromCategory({ category: "store" })).toBeUndefined();
  });

  it("returns undefined for unknown library", () => {
    expect(detectFromCategory({ category: "unknown/state" })).toBeUndefined();
  });

  it("returns undefined for invalid kind within known library", () => {
    expect(detectFromCategory({ category: "store/invalid" })).toBeUndefined();
  });

  it("detects store/state", () => {
    expect(detectFromCategory({ category: "store/state" })).toEqual({
      library: "store",
      kind: "state",
    });
  });

  it("detects store/atom", () => {
    expect(detectFromCategory({ category: "store/atom" })).toEqual({
      library: "store",
      kind: "atom",
    });
  });

  it("detects store/derived", () => {
    expect(detectFromCategory({ category: "store/derived" })).toEqual({
      library: "store",
      kind: "derived",
    });
  });

  it("detects store/async-derived", () => {
    expect(detectFromCategory({ category: "store/async-derived" })).toEqual({
      library: "store",
      kind: "async-derived",
    });
  });

  it("detects store/linked-derived", () => {
    expect(detectFromCategory({ category: "store/linked-derived" })).toEqual({
      library: "store",
      kind: "linked-derived",
    });
  });

  it("detects store/effect", () => {
    expect(detectFromCategory({ category: "store/effect" })).toEqual({
      library: "store",
      kind: "effect",
    });
  });

  it("detects query/query", () => {
    expect(detectFromCategory({ category: "query/query" })).toEqual({
      library: "query",
      kind: "query",
    });
  });

  it("detects query/mutation", () => {
    expect(detectFromCategory({ category: "query/mutation" })).toEqual({
      library: "query",
      kind: "mutation",
    });
  });

  it("detects query/streamed-query", () => {
    expect(detectFromCategory({ category: "query/streamed-query" })).toEqual({
      library: "query",
      kind: "streamed-query",
    });
  });

  it("detects saga/saga", () => {
    expect(detectFromCategory({ category: "saga/saga" })).toEqual({
      library: "saga",
      kind: "saga",
    });
  });

  it("detects saga/saga-management", () => {
    expect(detectFromCategory({ category: "saga/saga-management" })).toEqual({
      library: "saga",
      kind: "saga-management",
    });
  });

  it("detects flow/flow", () => {
    expect(detectFromCategory({ category: "flow/flow" })).toEqual({
      library: "flow",
      kind: "flow",
    });
  });

  it("detects flow/activity", () => {
    expect(detectFromCategory({ category: "flow/activity" })).toEqual({
      library: "flow",
      kind: "activity",
    });
  });

  it("detects logger/logger", () => {
    expect(detectFromCategory({ category: "logger/logger" })).toEqual({
      library: "logger",
      kind: "logger",
    });
  });

  it("detects logger/handler", () => {
    expect(detectFromCategory({ category: "logger/handler" })).toEqual({
      library: "logger",
      kind: "handler",
    });
  });

  it("detects logger/formatter", () => {
    expect(detectFromCategory({ category: "logger/formatter" })).toEqual({
      library: "logger",
      kind: "formatter",
    });
  });

  it("detects logger/inspector", () => {
    expect(detectFromCategory({ category: "logger/inspector" })).toEqual({
      library: "logger",
      kind: "inspector",
    });
  });

  it("detects tracing/tracer", () => {
    expect(detectFromCategory({ category: "tracing/tracer" })).toEqual({
      library: "tracing",
      kind: "tracer",
    });
  });

  it("detects tracing/processor", () => {
    expect(detectFromCategory({ category: "tracing/processor" })).toEqual({
      library: "tracing",
      kind: "processor",
    });
  });

  it("detects tracing/exporter", () => {
    expect(detectFromCategory({ category: "tracing/exporter" })).toEqual({
      library: "tracing",
      kind: "exporter",
    });
  });

  it("detects tracing/bridge", () => {
    expect(detectFromCategory({ category: "tracing/bridge" })).toEqual({
      library: "tracing",
      kind: "bridge",
    });
  });
});

// =============================================================================
// detectFromPortName
// =============================================================================

describe("detectFromPortName", () => {
  it("returns undefined for generic port name", () => {
    expect(detectFromPortName("FooBar")).toBeUndefined();
  });

  it("detects store from port name ending in Store", () => {
    const result = detectFromPortName("UserStore");
    expect(result).toEqual({ library: "store", kind: "state" });
  });

  it("detects store from port name ending in State", () => {
    expect(detectFromPortName("AppState")?.library).toBe("store");
  });

  it("detects query from port name ending in Query", () => {
    const result = detectFromPortName("UsersQuery");
    expect(result).toEqual({ library: "query", kind: "query" });
  });

  it("detects mutation from port name ending in Mutation", () => {
    const result = detectFromPortName("CreateUserMutation");
    expect(result).toEqual({ library: "query", kind: "mutation" });
  });

  it("detects saga from port name ending in Saga", () => {
    const result = detectFromPortName("PaymentSaga");
    expect(result).toEqual({ library: "saga", kind: "saga" });
  });

  it("detects saga management from port name ending in SagaManager", () => {
    const result = detectFromPortName("OrderSagaManager");
    expect(result).toEqual({ library: "saga", kind: "saga-management" });
  });

  it("detects flow from port name ending in Flow", () => {
    const result = detectFromPortName("CheckoutFlow");
    expect(result).toEqual({ library: "flow", kind: "flow" });
  });

  it("detects activity from port name ending in Activity", () => {
    const result = detectFromPortName("ValidationActivity");
    expect(result).toEqual({ library: "flow", kind: "activity" });
  });

  it("detects logger from port name ending in Logger", () => {
    const result = detectFromPortName("AppLogger");
    expect(result).toEqual({ library: "logger", kind: "logger" });
  });

  it("detects tracing from port name ending in Tracer", () => {
    const result = detectFromPortName("RequestTracer");
    expect(result).toEqual({ library: "tracing", kind: "tracer" });
  });

  it("is case insensitive", () => {
    expect(detectFromPortName("mystore")).toBeDefined();
  });
});

// =============================================================================
// detectLibraryKind (integration)
// =============================================================================

describe("detectLibraryKind", () => {
  it("prefers category over port name", () => {
    const adapter = createAdapter({
      portName: "UserStore",
      metadata: { category: "query/query" },
    });
    const result = detectLibraryKind(adapter);
    expect(result?.library).toBe("query");
  });

  it("falls back to port name when no metadata", () => {
    const adapter = createAdapter({ portName: "UserStore" });
    const result = detectLibraryKind(adapter);
    expect(result?.library).toBe("store");
  });

  it("returns undefined for unrecognized adapter", () => {
    const adapter = createAdapter({ portName: "HttpClient" });
    expect(detectLibraryKind(adapter)).toBeUndefined();
  });

  it("detects store adapter with non-matching port name via category", () => {
    const adapter = createAdapter({
      portName: "Counter",
      metadata: { category: "store/state" },
    });
    expect(detectLibraryKind(adapter)).toEqual({ library: "store", kind: "state" });
  });

  it("detects query adapter with non-matching port name via category", () => {
    const adapter = createAdapter({
      portName: "FetchUsers",
      metadata: { category: "query/query" },
    });
    expect(detectLibraryKind(adapter)).toEqual({ library: "query", kind: "query" });
  });

  it("detects flow adapter with non-matching port name via category", () => {
    const adapter = createAdapter({
      portName: "CheckoutWizard",
      metadata: { category: "flow/flow" },
    });
    expect(detectLibraryKind(adapter)).toEqual({ library: "flow", kind: "flow" });
  });
});
