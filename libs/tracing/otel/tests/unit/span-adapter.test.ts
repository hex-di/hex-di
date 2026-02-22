/**
 * Unit tests for convertToReadableSpan - HexDI to OTel span conversion.
 *
 * Tests verify accurate field mapping, time conversions, enum mappings,
 * and proper handling of events, links, and parent contexts.
 */

import { describe, it, expect } from "vitest";
import { convertToReadableSpan } from "../../src/adapters/span-adapter.js";
import { SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import type { SpanData } from "@hex-di/tracing";

describe("convertToReadableSpan", () => {
  const baseSpanData: SpanData = {
    context: {
      traceId: "trace123",
      spanId: "span456",
      traceFlags: 1,
      traceState: undefined,
    },
    name: "test-span",
    kind: "internal",
    startTime: 1000,
    endTime: 2000,
    status: "ok",
    attributes: { key: "value" },
    events: [],
    links: [],
    parentSpanId: undefined,
  };

  it("should map all basic fields correctly", () => {
    const otelSpan = convertToReadableSpan(baseSpanData);

    expect(otelSpan.name).toBe("test-span");
    expect(otelSpan.kind).toBe(SpanKind.INTERNAL);
    expect(otelSpan.spanContext().traceId).toBe("trace123");
    expect(otelSpan.spanContext().spanId).toBe("span456");
    expect(otelSpan.spanContext().traceFlags).toBe(1);
    expect(otelSpan.attributes).toEqual({ key: "value" });
    expect(otelSpan.ended).toBe(true);
  });

  it("should convert milliseconds to HrTime format", () => {
    const otelSpan = convertToReadableSpan(baseSpanData);

    // 1000ms = [1, 0] (1 second, 0 nanoseconds)
    expect(otelSpan.startTime).toEqual([1, 0]);
    // 2000ms = [2, 0] (2 seconds, 0 nanoseconds)
    expect(otelSpan.endTime).toEqual([2, 0]);
    // duration = 1000ms = [1, 0] (1 second, 0 nanoseconds)
    expect(otelSpan.duration).toEqual([1, 0]);
  });

  it("should convert milliseconds with fractional seconds to HrTime", () => {
    const spanWithFractionalTime: SpanData = {
      ...baseSpanData,
      startTime: 1234,
      endTime: 5678,
    };

    const otelSpan = convertToReadableSpan(spanWithFractionalTime);

    // 1234ms = [1, 234000000] (1 second, 234 million nanoseconds)
    expect(otelSpan.startTime).toEqual([1, 234_000_000]);
    // 5678ms = [5, 678000000] (5 seconds, 678 million nanoseconds)
    expect(otelSpan.endTime).toEqual([5, 678_000_000]);
    // duration = 4444ms = [4, 444000000]
    expect(otelSpan.duration).toEqual([4, 444_000_000]);
  });

  it("should convert internal span kind", () => {
    const internalSpan: SpanData = { ...baseSpanData, kind: "internal" };
    const otelSpan = convertToReadableSpan(internalSpan);
    expect(otelSpan.kind).toBe(SpanKind.INTERNAL);
  });

  it("should convert server span kind", () => {
    const serverSpan: SpanData = { ...baseSpanData, kind: "server" };
    const otelSpan = convertToReadableSpan(serverSpan);
    expect(otelSpan.kind).toBe(SpanKind.SERVER);
  });

  it("should convert client span kind", () => {
    const clientSpan: SpanData = { ...baseSpanData, kind: "client" };
    const otelSpan = convertToReadableSpan(clientSpan);
    expect(otelSpan.kind).toBe(SpanKind.CLIENT);
  });

  it("should convert producer span kind", () => {
    const producerSpan: SpanData = { ...baseSpanData, kind: "producer" };
    const otelSpan = convertToReadableSpan(producerSpan);
    expect(otelSpan.kind).toBe(SpanKind.PRODUCER);
  });

  it("should convert consumer span kind", () => {
    const consumerSpan: SpanData = { ...baseSpanData, kind: "consumer" };
    const otelSpan = convertToReadableSpan(consumerSpan);
    expect(otelSpan.kind).toBe(SpanKind.CONSUMER);
  });

  it("should convert unset status", () => {
    const unsetSpan: SpanData = { ...baseSpanData, status: "unset" };
    const otelSpan = convertToReadableSpan(unsetSpan);
    expect(otelSpan.status.code).toBe(SpanStatusCode.UNSET);
  });

  it("should convert ok status", () => {
    const okSpan: SpanData = { ...baseSpanData, status: "ok" };
    const otelSpan = convertToReadableSpan(okSpan);
    expect(otelSpan.status.code).toBe(SpanStatusCode.OK);
  });

  it("should convert error status", () => {
    const errorSpan: SpanData = { ...baseSpanData, status: "error" };
    const otelSpan = convertToReadableSpan(errorSpan);
    expect(otelSpan.status.code).toBe(SpanStatusCode.ERROR);
  });

  it("should convert span events with attributes", () => {
    const spanWithEvents: SpanData = {
      ...baseSpanData,
      events: [
        {
          name: "event1",
          time: 1500,
          attributes: { detail: "first" },
        },
        {
          name: "event2",
          time: 1750,
          attributes: { detail: "second" },
        },
      ],
    };

    const otelSpan = convertToReadableSpan(spanWithEvents);

    expect(otelSpan.events).toHaveLength(2);
    expect(otelSpan.events[0].name).toBe("event1");
    expect(otelSpan.events[0].time).toEqual([1, 500_000_000]);
    expect(otelSpan.events[0].attributes).toEqual({ detail: "first" });
    expect(otelSpan.events[1].name).toBe("event2");
    expect(otelSpan.events[1].time).toEqual([1, 750_000_000]);
    expect(otelSpan.events[1].attributes).toEqual({ detail: "second" });
  });

  it("should convert span links with trace context", () => {
    const spanWithLinks: SpanData = {
      ...baseSpanData,
      links: [
        {
          traceId: "linkedTrace1",
          spanId: "linkedSpan1",
          traceFlags: 1,
          traceState: undefined,
        },
        {
          traceId: "linkedTrace2",
          spanId: "linkedSpan2",
          traceFlags: 0,
          traceState: "vendor=value",
        },
      ],
    };

    const otelSpan = convertToReadableSpan(spanWithLinks);

    expect(otelSpan.links).toHaveLength(2);
    expect(otelSpan.links[0].context.traceId).toBe("linkedTrace1");
    expect(otelSpan.links[0].context.spanId).toBe("linkedSpan1");
    expect(otelSpan.links[0].context.traceFlags).toBe(1);
    expect(otelSpan.links[1].context.traceId).toBe("linkedTrace2");
    expect(otelSpan.links[1].context.spanId).toBe("linkedSpan2");
    expect(otelSpan.links[1].context.traceFlags).toBe(0);
    expect(otelSpan.links[1].context.traceState?.serialize()).toBe("vendor=value");
  });

  it("should generate parentSpanContext when parentSpanId is present", () => {
    const childSpan: SpanData = {
      ...baseSpanData,
      parentSpanId: "parent789",
    };

    const otelSpan = convertToReadableSpan(childSpan);

    expect(otelSpan.parentSpanContext).toBeDefined();
    expect(otelSpan.parentSpanContext?.spanId).toBe("parent789");
    expect(otelSpan.parentSpanContext?.traceId).toBe("trace123");
    expect(otelSpan.parentSpanContext?.traceFlags).toBe(1);
    expect(otelSpan.parentSpanContext?.isRemote).toBe(false);
  });

  it("should not have parentSpanContext when parentSpanId is undefined", () => {
    const rootSpan: SpanData = {
      ...baseSpanData,
      parentSpanId: undefined,
    };

    const otelSpan = convertToReadableSpan(rootSpan);

    expect(otelSpan.parentSpanContext).toBeUndefined();
  });

  it("should handle traceState in spanContext", () => {
    const spanWithTraceState: SpanData = {
      ...baseSpanData,
      context: {
        ...baseSpanData.context,
        traceState: "vendor1=value1,vendor2=value2",
      },
    };

    const otelSpan = convertToReadableSpan(spanWithTraceState);
    const spanContext = otelSpan.spanContext();

    expect(spanContext.traceState).toBeDefined();
    expect(spanContext.traceState?.serialize()).toBe("vendor1=value1,vendor2=value2");
  });

  it("should make traceState immutable in converted spans", () => {
    const spanWithTraceState: SpanData = {
      ...baseSpanData,
      context: {
        ...baseSpanData.context,
        traceState: "vendor=value",
      },
    };

    const otelSpan = convertToReadableSpan(spanWithTraceState);
    const traceState = otelSpan.spanContext().traceState;

    expect(() => traceState?.set("key", "value")).toThrow(
      "TraceState is immutable in converted spans"
    );
    expect(() => traceState?.unset("key")).toThrow("TraceState is immutable in converted spans");
    expect(traceState?.get("key")).toBeUndefined();
  });

  it("should create default resource when not provided", () => {
    const otelSpan = convertToReadableSpan(baseSpanData);

    expect(otelSpan.resource).toBeDefined();
    expect(otelSpan.resource.attributes[ATTR_SERVICE_NAME]).toBe("hex-di-app");
  });

  it("should use provided custom resource", () => {
    const customResource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "my-service",
      "service.version": "1.2.3",
      "deployment.environment": "production",
    });

    const otelSpan = convertToReadableSpan(baseSpanData, customResource);

    expect(otelSpan.resource).toBe(customResource);
    expect(otelSpan.resource.attributes[ATTR_SERVICE_NAME]).toBe("my-service");
    expect(otelSpan.resource.attributes["service.version"]).toBe("1.2.3");
    expect(otelSpan.resource.attributes["deployment.environment"]).toBe("production");
  });

  it("should include instrumentation scope metadata", () => {
    const otelSpan = convertToReadableSpan(baseSpanData);

    expect(otelSpan.instrumentationScope).toBeDefined();
    expect(otelSpan.instrumentationScope.name).toBe("@hex-di/tracing");
    expect(otelSpan.instrumentationScope.version).toBe("0.1.0");
  });

  it("should set dropped counts to zero", () => {
    const otelSpan = convertToReadableSpan(baseSpanData);

    expect(otelSpan.droppedAttributesCount).toBe(0);
    expect(otelSpan.droppedEventsCount).toBe(0);
    expect(otelSpan.droppedLinksCount).toBe(0);
  });

  it("should preserve all attributes", () => {
    const spanWithManyAttributes: SpanData = {
      ...baseSpanData,
      attributes: {
        "http.method": "GET",
        "http.url": "https://example.com/api",
        "http.status_code": 200,
        "custom.attribute": "custom-value",
      },
    };

    const otelSpan = convertToReadableSpan(spanWithManyAttributes);

    expect(otelSpan.attributes).toEqual({
      "http.method": "GET",
      "http.url": "https://example.com/api",
      "http.status_code": 200,
      "custom.attribute": "custom-value",
    });
  });
});
