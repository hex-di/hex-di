/**
 * Unit tests for Jaeger exporter adapter.
 *
 * Tests verify proper wiring to OTel JaegerExporter and callback-to-Promise adaptation.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { createJaegerExporter } from "../../src/exporter.js";
import type { SpanData } from "@hex-di/tracing";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";

// Track the last created mock instance
let lastJaegerInstance: any = null;

// Mock the OTel JaegerExporter
vi.mock("@opentelemetry/exporter-jaeger", () => {
  const MockJaegerExporter = vi.fn((config: any) => {
    const instance = {
      _config: config,
      export: vi.fn((spans: any, callback: any) => {
        // Simulate async callback - success by default
        setTimeout(() => {
          callback({ code: 0 });
        }, 0);
      }),
      forceFlush: vi.fn(() => Promise.resolve()),
      shutdown: vi.fn(() => Promise.resolve()),
    };
    lastJaegerInstance = instance;
    return instance;
  });

  return {
    JaegerExporter: MockJaegerExporter,
  };
});

// Mock the tracing-otel utilities
vi.mock("@hex-di/tracing-otel", () => {
  return {
    convertToReadableSpan: vi.fn((spanData: SpanData, resource: any): any => {
      return {
        name: spanData.name,
        spanContext: () => ({
          traceId: spanData.context.traceId,
          spanId: spanData.context.spanId,
          traceFlags: spanData.context.traceFlags,
        }),
        startTime: [Math.floor(spanData.startTime / 1000), (spanData.startTime % 1000) * 1000000],
        endTime: [Math.floor(spanData.endTime / 1000), (spanData.endTime % 1000) * 1000000],
        status: { code: spanData.status === "ok" ? 0 : 1 },
        attributes: spanData.attributes,
        links: [],
        events: [],
        duration: [0, (spanData.endTime - spanData.startTime) * 1000000],
        ended: true,
        resource,
        kind: 0,
        instrumentationScope: { name: "test", version: undefined, schemaUrl: undefined },
        droppedAttributesCount: 0,
        droppedEventsCount: 0,
        droppedLinksCount: 0,
      } as ReadableSpan;
    }),
    createResource: vi.fn((options: any) => {
      return {
        attributes: {
          "service.name": options.serviceName,
          "service.version": options.serviceVersion,
          "deployment.environment": options.deploymentEnvironment,
          "service.namespace": options.serviceNamespace,
          ...options.attributes,
        },
      };
    }),
  };
});

/**
 * Helper to create test SpanData
 */
function createTestSpanData(name: string): SpanData {
  return {
    context: {
      traceId: "trace123",
      spanId: `span-${name}`,
      traceFlags: 1,
    },
    name,
    kind: "internal",
    startTime: 1000,
    endTime: 2000,
    status: "ok",
    attributes: {},
    events: [],
    links: [],
    parentSpanId: undefined,
  };
}

describe("createJaegerExporter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastJaegerInstance = null;
  });

  it("should pass endpoint configuration to underlying JaegerExporter", async () => {
    const { JaegerExporter } = await import("@opentelemetry/exporter-jaeger");

    const exporter = createJaegerExporter({
      endpoint: "http://jaeger:14268/api/traces",
      serviceName: "test-service",
    });

    expect(JaegerExporter).toHaveBeenCalledWith({
      endpoint: "http://jaeger:14268/api/traces",
    });
    expect(exporter).toBeDefined();
  });

  it("should use default endpoint when not provided", async () => {
    const { JaegerExporter } = await import("@opentelemetry/exporter-jaeger");

    createJaegerExporter({
      serviceName: "test-service",
    });

    expect(JaegerExporter).toHaveBeenCalledWith({
      endpoint: "http://localhost:14268/api/traces",
    });
  });

  it("should create resource with service metadata", async () => {
    const { createResource } = await import("@hex-di/tracing-otel");

    createJaegerExporter({
      serviceName: "test-service",
      serviceVersion: "1.2.3",
      deploymentEnvironment: "production",
      serviceNamespace: "platform",
      attributes: { "custom.tag": "value" },
    });

    expect(createResource).toHaveBeenCalledWith({
      serviceName: "test-service",
      serviceVersion: "1.2.3",
      deploymentEnvironment: "production",
      serviceNamespace: "platform",
      attributes: { "custom.tag": "value" },
    });
  });

  it("should convert HexDI spans to OTel ReadableSpan format", async () => {
    const { convertToReadableSpan } = await import("@hex-di/tracing-otel");
    const exporter = createJaegerExporter({ serviceName: "test-service" });

    const spans = [createTestSpanData("span1"), createTestSpanData("span2")];

    await exporter.export(spans);

    expect(convertToReadableSpan).toHaveBeenCalledTimes(2);
    expect(convertToReadableSpan).toHaveBeenCalledWith(
      spans[0],
      expect.objectContaining({
        attributes: expect.objectContaining({
          "service.name": "test-service",
        }),
      })
    );
  });

  it("should delegate export to underlying JaegerExporter", async () => {
    const exporter = createJaegerExporter({ serviceName: "test-service" });
    const spans = [createTestSpanData("test")];

    await exporter.export(spans);

    expect(lastJaegerInstance).not.toBeNull();
    expect(lastJaegerInstance!.export).toHaveBeenCalledTimes(1);
    expect(lastJaegerInstance!.export).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ name: "test" })]),
      expect.any(Function)
    );
  });

  it("should convert callback-based export to Promise (success)", async () => {
    const exporter = createJaegerExporter({ serviceName: "test-service" });
    const spans = [createTestSpanData("test")];

    // Export returns a Promise
    const result = exporter.export(spans);
    expect(result).toBeInstanceOf(Promise);

    // Should resolve successfully
    await expect(result).resolves.toBeUndefined();
  });

  it("should handle export errors gracefully (logs but does not throw)", async () => {
    const exporter = createJaegerExporter({ serviceName: "test-service" });

    // Override the export mock for this test to simulate error
    lastJaegerInstance!.export = vi.fn((spans: any, callback: any) => {
      callback({ code: 1, error: new Error("Export failed") });
    });

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const spans = [createTestSpanData("test")];

    // Should not throw - graceful degradation
    await expect(exporter.export(spans)).resolves.toBeUndefined();

    // Should log the error
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy.mock.calls[0]![0]).toContain("[hex-di/tracing-jaeger]");

    consoleErrorSpy.mockRestore();
  });

  it("should delegate forceFlush to underlying exporter", async () => {
    const exporter = createJaegerExporter({ serviceName: "test-service" });

    await exporter.forceFlush();

    expect(lastJaegerInstance).not.toBeNull();
    expect(lastJaegerInstance!.forceFlush).toHaveBeenCalledTimes(1);
  });

  it("should handle forceFlush errors gracefully", async () => {
    const exporter = createJaegerExporter({ serviceName: "test-service" });

    // Override forceFlush to simulate error
    lastJaegerInstance!.forceFlush = vi.fn(() => Promise.reject(new Error("Flush failed")));

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Should not throw
    await expect(exporter.forceFlush()).resolves.toBeUndefined();

    // Should log the error
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy.mock.calls[0]![0]).toContain("forceFlush failed");

    consoleErrorSpy.mockRestore();
  });

  it("should delegate shutdown to underlying exporter", async () => {
    const exporter = createJaegerExporter({ serviceName: "test-service" });

    await exporter.shutdown();

    expect(lastJaegerInstance).not.toBeNull();
    expect(lastJaegerInstance!.shutdown).toHaveBeenCalledTimes(1);
  });

  it("should handle shutdown errors gracefully", async () => {
    const exporter = createJaegerExporter({ serviceName: "test-service" });

    // Override shutdown to simulate error
    lastJaegerInstance!.shutdown = vi.fn(() => Promise.reject(new Error("Shutdown failed")));

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Should not throw
    await expect(exporter.shutdown()).resolves.toBeUndefined();

    // Should log the error
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy.mock.calls[0]![0]).toContain("Shutdown failed");

    consoleErrorSpy.mockRestore();
  });

  it("should handle empty span batches", async () => {
    const exporter = createJaegerExporter({ serviceName: "test-service" });

    // Empty array should not throw
    await expect(exporter.export([])).resolves.toBeUndefined();

    // Should still call underlying export with empty array
    expect(lastJaegerInstance!.export).toHaveBeenCalledWith([], expect.any(Function));
  });
});
