/**
 * Tracing Ports - Port definitions for distributed tracing.
 *
 * This module exports all tracing-related ports for use in adapters
 * and container configuration.
 *
 * @packageDocumentation
 */

export { TracerPort, type Tracer } from "./tracer.js";
export { SpanExporterPort, type SpanExporter } from "./exporter.js";
export { SpanProcessorPort, type SpanProcessor } from "./processor.js";
