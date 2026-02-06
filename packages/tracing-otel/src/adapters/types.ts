/**
 * Type conversion utilities for bridging HexDI and OpenTelemetry types.
 *
 * Converts between HexDI's lightweight SpanData format and OTel's ReadableSpan
 * interface without using type casts (per CLAUDE.md rules).
 *
 * @packageDocumentation
 */

import { SpanKind as OtelSpanKind, SpanStatusCode } from "@opentelemetry/api";
import type { HrTime, Link } from "@opentelemetry/api";
import type { SpanKind as HexSpanKind, SpanStatus, SpanEvent } from "@hex-di/tracing";
import type { TimedEvent } from "@opentelemetry/sdk-trace-base";

/**
 * Convert HexDI span kind to OpenTelemetry SpanKind enum.
 *
 * Maps HexDI's string-based span kinds to OTel's numeric enum values.
 * Uses proper type mapping without any type casts.
 *
 * @param kind - HexDI span kind
 * @returns OTel SpanKind enum value
 */
export function convertSpanKind(kind: HexSpanKind): OtelSpanKind {
  const kindMap: Record<HexSpanKind, OtelSpanKind> = {
    internal: OtelSpanKind.INTERNAL,
    server: OtelSpanKind.SERVER,
    client: OtelSpanKind.CLIENT,
    producer: OtelSpanKind.PRODUCER,
    consumer: OtelSpanKind.CONSUMER,
  };

  return kindMap[kind];
}

/**
 * Convert HexDI span status to OpenTelemetry SpanStatusCode enum.
 *
 * Maps HexDI's string-based status to OTel's numeric enum values.
 * Uses proper type mapping without any type casts.
 *
 * @param status - HexDI span status
 * @returns OTel status object with code and optional message
 */
export function convertSpanStatus(status: SpanStatus): {
  code: SpanStatusCode;
  message?: string;
} {
  const statusMap: Record<SpanStatus, SpanStatusCode> = {
    unset: SpanStatusCode.UNSET,
    ok: SpanStatusCode.OK,
    error: SpanStatusCode.ERROR,
  };

  return {
    code: statusMap[status],
  };
}

/**
 * Convert milliseconds timestamp to OpenTelemetry HrTime format.
 *
 * HexDI stores timestamps as milliseconds since Unix epoch (Date.now()).
 * OTel uses HrTime format: [seconds, nanoseconds] tuple for higher precision.
 *
 * @param milliseconds - Timestamp in milliseconds since Unix epoch
 * @returns HrTime tuple [seconds, nanoseconds]
 */
export function convertToHrTime(milliseconds: number): HrTime {
  const seconds = Math.floor(milliseconds / 1000);
  const nanos = (milliseconds % 1000) * 1_000_000;
  return [seconds, nanos];
}

/**
 * Convert HexDI span event to OpenTelemetry TimedEvent.
 *
 * Maps HexDI's SpanEvent format to OTel's TimedEvent format with HrTime.
 *
 * @param event - HexDI span event
 * @returns OTel TimedEvent
 */
export function convertSpanEvent(event: SpanEvent): TimedEvent {
  return {
    name: event.name,
    time: convertToHrTime(event.time),
    attributes: event.attributes,
  };
}

/**
 * Convert HexDI span link (SpanContext) to OpenTelemetry Link.
 *
 * Maps HexDI's SpanContext format to OTel's Link format.
 * Links represent relationships between spans (e.g., follows-from, batched operations).
 *
 * @param context - HexDI span context
 * @returns OTel Link
 */
export function convertSpanLink(context: {
  readonly traceId: string;
  readonly spanId: string;
  readonly traceFlags: number;
  readonly traceState?: string;
}): Link {
  return {
    context: {
      traceId: context.traceId,
      spanId: context.spanId,
      traceFlags: context.traceFlags,
      traceState: context.traceState
        ? {
            serialize: () => context.traceState ?? "",
            set: () => {
              throw new Error("TraceState is immutable in converted spans");
            },
            unset: () => {
              throw new Error("TraceState is immutable in converted spans");
            },
            get: () => undefined,
          }
        : undefined,
    },
    attributes: {},
  };
}
