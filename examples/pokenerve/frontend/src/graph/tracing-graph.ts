/**
 * Tracing dependency graph for observability services.
 *
 * Provides the ExportingTracer that routes completed spans through
 * a SimpleSpanProcessor to the OTLP browser exporter (for Jaeger).
 * Both tracer and exporter are singleton lifetime.
 *
 * @packageDocumentation
 */

import { GraphBuilder } from "@hex-di/graph";
import { createAdapter } from "@hex-di/core";
import { TracerPort, SpanExporterPort, tracerLikeAdapter } from "@hex-di/tracing";
import { createSimpleSpanProcessor } from "@hex-di/tracing-otel";
import { otlpBrowserExporterAdapter } from "../adapters/tracing/otlp-browser.js";
import { createExportingTracer } from "../adapters/tracing/exporting-tracer.js";

// ---------------------------------------------------------------------------
// Tracer adapter: ExportingTracer → SimpleSpanProcessor → OTLP exporter
// ---------------------------------------------------------------------------

const tracerAdapter = createAdapter({
  provides: TracerPort,
  requires: [SpanExporterPort],
  lifetime: "singleton",
  factory: deps => {
    const processor = createSimpleSpanProcessor(deps.SpanExporter);
    return createExportingTracer(processor, { "service.name": "pokenerve-frontend" });
  },
});

// ---------------------------------------------------------------------------
// Tracing graph combining tracer and OTLP exporter
// ---------------------------------------------------------------------------

const tracingGraphBuilder = GraphBuilder.create()
  .provide(otlpBrowserExporterAdapter)
  .provide(tracerAdapter)
  .provide(tracerLikeAdapter);

export { tracingGraphBuilder };
