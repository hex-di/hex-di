/**
 * Convert HexDI SpanData to OpenTelemetry ReadableSpan format.
 *
 * This adapter bridges HexDI's lightweight tracing format with OpenTelemetry's
 * standard ReadableSpan interface, enabling export to any OTel-compatible backend.
 *
 * @packageDocumentation
 */

import type { SpanData } from "@hex-di/tracing";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import type { SpanContext } from "@opentelemetry/api";
import { type Resource, resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import {
  convertSpanKind,
  convertSpanStatus,
  convertToHrTime,
  convertSpanEvent,
  convertSpanLink,
} from "./types.js";

/**
 * Create a default Resource for spans without explicit service metadata.
 *
 * Resource represents service-level attributes (service.name, service.version, etc.).
 * This creates a minimal resource with a default service name.
 * Users should override this with their actual service metadata.
 *
 * @returns Default OTel Resource
 */
function createDefaultResource() {
  return resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "hex-di-app",
  });
}

/**
 * Convert HexDI SpanData to OpenTelemetry ReadableSpan.
 *
 * Performs field-by-field conversion from HexDI's format to OTel's format.
 * All time conversions are done using convertToHrTime (milliseconds -> HrTime).
 * All span kinds and statuses are mapped using proper enum conversions.
 *
 * **No type casts are used** - this implementation follows CLAUDE.md rules by
 * converting each field explicitly rather than casting the entire structure.
 *
 * @param hexSpan - HexDI span data
 * @param resource - Optional OpenTelemetry Resource with service metadata.
 *                   If not provided, uses a default resource with "hex-di-app".
 * @returns OTel ReadableSpan interface
 */
export function convertToReadableSpan(hexSpan: SpanData, resource?: Resource): ReadableSpan {
  const startTime = convertToHrTime(hexSpan.startTime);
  const endTime = convertToHrTime(hexSpan.endTime);
  const duration = convertToHrTime(hexSpan.endTime - hexSpan.startTime);

  // Convert parentSpanId to parentSpanContext if present
  const parentSpanContext: SpanContext | undefined = hexSpan.parentSpanId
    ? {
        traceId: hexSpan.context.traceId,
        spanId: hexSpan.parentSpanId,
        traceFlags: hexSpan.context.traceFlags,
        traceState: hexSpan.context.traceState
          ? {
              serialize: () => hexSpan.context.traceState ?? "",
              set: () => {
                throw new Error("TraceState is immutable in converted spans");
              },
              unset: () => {
                throw new Error("TraceState is immutable in converted spans");
              },
              get: () => undefined,
            }
          : undefined,
        isRemote: false,
      }
    : undefined;

  return {
    name: hexSpan.name,
    kind: convertSpanKind(hexSpan.kind),
    spanContext: () => ({
      traceId: hexSpan.context.traceId,
      spanId: hexSpan.context.spanId,
      traceFlags: hexSpan.context.traceFlags,
      traceState: hexSpan.context.traceState
        ? {
            serialize: () => hexSpan.context.traceState ?? "",
            set: () => {
              throw new Error("TraceState is immutable in converted spans");
            },
            unset: () => {
              throw new Error("TraceState is immutable in converted spans");
            },
            get: () => undefined,
          }
        : undefined,
      isRemote: false,
    }),
    parentSpanContext,
    startTime,
    endTime,
    status: convertSpanStatus(hexSpan.status),
    attributes: hexSpan.attributes,
    links: hexSpan.links.map(convertSpanLink),
    events: hexSpan.events.map(convertSpanEvent),
    duration,
    ended: true,
    resource: resource ?? createDefaultResource(),
    instrumentationScope: {
      name: "@hex-di/tracing",
      version: "0.1.0",
    },
    droppedAttributesCount: 0,
    droppedEventsCount: 0,
    droppedLinksCount: 0,
  };
}
