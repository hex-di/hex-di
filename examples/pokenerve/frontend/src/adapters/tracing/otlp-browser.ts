/**
 * OTLP HTTP exporter adapter for browser-to-Jaeger span export.
 *
 * Converts HexDI SpanData to OTLP JSON format and sends to Jaeger
 * via the OTLP HTTP endpoint (port 4318). Uses `keepalive: true`
 * to survive page navigation.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { SpanExporterPort } from "@hex-di/tracing";
import type { SpanData, Attributes } from "@hex-di/tracing";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const OTLP_ENDPOINT = "";

// ---------------------------------------------------------------------------
// OTLP JSON types (subset of the OTLP specification)
// ---------------------------------------------------------------------------

interface OtlpExportRequest {
  readonly resourceSpans: readonly OtlpResourceSpan[];
}

interface OtlpResourceSpan {
  readonly resource: {
    readonly attributes: readonly OtlpAttribute[];
  };
  readonly scopeSpans: readonly OtlpScopeSpan[];
}

interface OtlpScopeSpan {
  readonly scope: { readonly name: string; readonly version: string };
  readonly spans: readonly OtlpSpan[];
}

interface OtlpSpan {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly kind: number;
  readonly startTimeUnixNano: string;
  readonly endTimeUnixNano: string;
  readonly attributes: readonly OtlpAttribute[];
  readonly status: { readonly code: number };
}

interface OtlpAttribute {
  readonly key: string;
  readonly value: OtlpAttributeValue;
}

interface OtlpAttributeValue {
  readonly stringValue?: string;
  readonly intValue?: string;
  readonly boolValue?: boolean;
}

// ---------------------------------------------------------------------------
// Conversion utilities
// ---------------------------------------------------------------------------

function toNanoString(ms: number): string {
  return String(Math.floor(ms * 1_000_000));
}

function spanKindToOtlp(kind: string): number {
  switch (kind) {
    case "server":
      return 2;
    case "client":
      return 3;
    case "producer":
      return 4;
    case "consumer":
      return 5;
    default:
      return 1; // internal
  }
}

function statusToOtlp(status: string): number {
  switch (status) {
    case "ok":
      return 1;
    case "error":
      return 2;
    default:
      return 0; // unset
  }
}

function convertAttribute(key: string, value: string | number | boolean): OtlpAttribute {
  if (typeof value === "string") {
    return { key, value: { stringValue: value } };
  }
  if (typeof value === "number") {
    return { key, value: { intValue: String(value) } };
  }
  return { key, value: { boolValue: value } };
}

function convertAttributes(attrs: Attributes): readonly OtlpAttribute[] {
  return Object.entries(attrs).map(([key, value]) => {
    if (Array.isArray(value)) {
      // Flatten array attributes to string representation
      return convertAttribute(key, String(value));
    }
    return convertAttribute(key, value);
  });
}

function convertSpan(span: SpanData): OtlpSpan {
  const otlpSpan: OtlpSpan = {
    traceId: span.context.traceId,
    spanId: span.context.spanId,
    parentSpanId: span.parentSpanId,
    name: span.name,
    kind: spanKindToOtlp(span.kind),
    startTimeUnixNano: toNanoString(span.startTime),
    endTimeUnixNano: toNanoString(span.endTime),
    attributes: convertAttributes(span.attributes),
    status: { code: statusToOtlp(span.status) },
  };
  return otlpSpan;
}

function convertToOtlpFormat(
  spans: ReadonlyArray<SpanData>,
  serviceName: string
): OtlpExportRequest {
  return {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: "service.name", value: { stringValue: serviceName } },
            { key: "deployment.environment", value: { stringValue: "development" } },
          ],
        },
        scopeSpans: [
          {
            scope: { name: "@hex-di/tracing", version: "1.0.0" },
            spans: spans.map(convertSpan),
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// OTLP browser exporter adapter
// ---------------------------------------------------------------------------

const otlpBrowserExporterAdapter = createAdapter({
  provides: SpanExporterPort,
  lifetime: "singleton",
  factory: () => ({
    async export(spans: ReadonlyArray<SpanData>): Promise<void> {
      if (spans.length === 0) return;

      // DEBUG: log all exported span names to verify flow spans reach the exporter
      console.debug(
        "[PokéNerve Tracing] Exporting spans:",
        spans.map(s => s.name)
      );

      const otlpPayload = convertToOtlpFormat(spans, "pokenerve-frontend");

      try {
        await fetch(`${OTLP_ENDPOINT}/v1/traces`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(otlpPayload),
          keepalive: true,
        });
      } catch {
        // Telemetry failures never break the application
        console.warn("[PokéNerve Tracing] Failed to export spans to Jaeger");
      }
    },

    async forceFlush(): Promise<void> {
      // No-op for browser exporter -- no internal buffer
    },

    async shutdown(): Promise<void> {
      // No-op for browser exporter
    },
  }),
});

export { otlpBrowserExporterAdapter };
