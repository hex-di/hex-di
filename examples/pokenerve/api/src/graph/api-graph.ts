import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { TracerPort } from "@hex-di/tracing";
import { createJaegerExporter } from "@hex-di/tracing-jaeger";
import { createBatchSpanProcessor } from "@hex-di/tracing-otel";
import { memoryCacheAdapter } from "../adapters/memory-cache.js";
import { rateLimiterAdapter } from "../adapters/rate-limiter.js";
import { pokeApiProxyAdapter } from "../adapters/pokeapi-proxy.js";
import { createExportingTracer } from "../adapters/exporting-tracer.js";

const jaegerEndpoint = process.env.JAEGER_ENDPOINT ?? "http://localhost:14268/api/traces";

const tracerAdapter = createAdapter({
  provides: TracerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => {
    const exporter = createJaegerExporter({
      serviceName: process.env.JAEGER_SERVICE_NAME ?? "pokenerve-api",
      endpoint: jaegerEndpoint,
      deploymentEnvironment: process.env.NODE_ENV ?? "development",
    });

    const processor = createBatchSpanProcessor(exporter, {
      scheduledDelayMillis: 1000,
      maxExportBatchSize: 64,
    });

    return createExportingTracer(processor, { "service.name": "pokenerve-api" });
  },
});

const apiGraph = GraphBuilder.create()
  .provide(tracerAdapter)
  .provide(memoryCacheAdapter)
  .provide(rateLimiterAdapter)
  .provide(pokeApiProxyAdapter)
  .build();

export { apiGraph, tracerAdapter };
