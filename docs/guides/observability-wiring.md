---
title: Observability Stack Wiring
description: Copy-paste example for wiring logger, tracer, error tracker, and diagnostic routes into a Hono application.
sidebar_position: 12
---

# Observability Stack Wiring

HexDI provides a complete observability stack as composable adapters. This guide shows how to wire all four components into a single Hono application using the DI container.

## Components

| Component           | Port                            | Adapter Package                 | Purpose                                   |
| ------------------- | ------------------------------- | ------------------------------- | ----------------------------------------- |
| Structured logging  | `LogHandlerPort` / `LoggerPort` | `@hex-di/logger-pino`           | JSON logs with traceId/spanId correlation |
| Distributed tracing | `TracerPort`                    | `@hex-di/tracing-otel`          | W3C Trace Context, span export            |
| Error tracking      | `ErrorTrackerPort`              | `@hex-di/error-tracking-sentry` | Exception capture with context            |
| Diagnostics         | (Hono routes)                   | `@hex-di/hono`                  | Health, graph, scope inspection endpoints |

## Install

```bash
pnpm add @hex-di/core @hex-di/graph @hex-di/runtime
pnpm add @hex-di/logger @hex-di/logger-pino
pnpm add @hex-di/tracing @hex-di/tracing-otel @hex-di/tracing-jaeger
pnpm add @hex-di/error-tracking-sentry
pnpm add @hex-di/hono hono @hono/node-server
```

## Graph Composition

Wire all observability adapters in a single `GraphBuilder`:

```typescript
import { createAdapter, ErrorTrackerPort, NoOpErrorTrackerAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { TracerPort } from "@hex-di/tracing";
import { createJaegerExporter } from "@hex-di/tracing-jaeger";
import { createBatchSpanProcessor } from "@hex-di/tracing-otel";
import { createSentryErrorTracker } from "@hex-di/error-tracking-sentry";
import { createPinoHandler, LogHandlerPort } from "@hex-di/logger-pino";
import { ScopedLoggerAdapter } from "@hex-di/logger";

const tracerAdapter = createAdapter({
  provides: TracerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => {
    const exporter = createJaegerExporter({
      serviceName: "my-api",
      endpoint: "http://localhost:14268/api/traces",
    });
    const processor = createBatchSpanProcessor(exporter, {
      scheduledDelayMillis: 1000,
      maxExportBatchSize: 64,
    });
    return createExportingTracer(processor, { "service.name": "my-api" });
  },
});

const logHandlerAdapter = createAdapter({
  provides: LogHandlerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => createPinoHandler({ level: "info" }),
});

const loggerAdapter = ScopedLoggerAdapter;

const errorTrackerAdapter = process.env.SENTRY_DSN
  ? createAdapter({
      provides: ErrorTrackerPort,
      requires: [],
      lifetime: "singleton",
      factory: () =>
        createSentryErrorTracker({
          dsn: process.env.SENTRY_DSN,
          environment: process.env.NODE_ENV ?? "development",
        }),
    })
  : NoOpErrorTrackerAdapter;

const graph = GraphBuilder.create()
  .provide(tracerAdapter)
  .provide(logHandlerAdapter)
  .provide(loggerAdapter)
  .provide(errorTrackerAdapter)
  // ...your service adapters
  .build();
```

## Server Setup

Compose the container, middleware, and diagnostic routes:

```typescript
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createContainer } from "@hex-di/runtime";
import { TracerPort, instrumentContainer } from "@hex-di/tracing";
import { LoggerPort } from "@hex-di/logger";
import { createScopeMiddleware, tracingMiddleware, createDiagnosticRoutes } from "@hex-di/hono";

const container = createContainer({ graph, name: "MyAPI" });

const tracer = container.resolve(TracerPort);
const logger = container.resolve(LoggerPort);

instrumentContainer(container, tracer);

const app = new Hono();

app.use("*", tracingMiddleware({ tracer }));
app.use("*", createScopeMiddleware(container));

app.get("/health", c => c.json({ status: "ok" }));
app.route("/debug", createDiagnosticRoutes({ pathPrefix: "/debug" }));

serve({ fetch: app.fetch, port: 3000 }, () => {
  logger.info("API listening", { port: 3000 });
});
```

## What You Get

- **`GET /health`** -- Simple liveness check
- **`GET /debug/health`** -- Container phase, port count, scope tree, disposed status
- **`GET /debug/ports`** -- All registered ports with lifetimes
- **`GET /debug/scopes`** -- Active scope hierarchy
- **`GET /debug/graph`** -- Dependency graph as adjacency list
- **Structured JSON logs** -- Every log line includes `traceId`, `spanId`, `service` fields
- **W3C `traceparent`** -- Incoming headers are extracted; outgoing responses include `traceparent`
- **Sentry error capture** -- Unhandled exceptions are reported with trace context (when SENTRY_DSN is set)

## Canonical Implementation

The [`examples/pokenerve/api/`](https://github.com/leaderiop/hex-di/blob/main/examples/pokenerve/api/) application is the reference implementation for full observability wiring. Key files:

| File                                                                                                                                    | What It Does                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [`graph/api-graph.ts`](https://github.com/leaderiop/hex-di/blob/main/examples/pokenerve/api/src/graph/api-graph.ts)                     | Composes tracer, logger, error tracker adapters                |
| [`server.ts`](https://github.com/leaderiop/hex-di/blob/main/examples/pokenerve/api/src/server.ts)                                       | Wires middleware, diagnostic routes, container instrumentation |
| [`adapters/logger.ts`](https://github.com/leaderiop/hex-di/blob/main/examples/pokenerve/api/src/adapters/logger.ts)                     | Pino log handler adapter                                       |
| [`adapters/exporting-tracer.ts`](https://github.com/leaderiop/hex-di/blob/main/examples/pokenerve/api/src/adapters/exporting-tracer.ts) | Tracer with span export                                        |

## Related

- [Production Observability](./production-observability.md) -- Sentry, Datadog, and OpenTelemetry integration details
- [OpenAPI Snapshots](./openapi-snapshots.md) -- CI drift detection for HTTP API contracts
- [Architecture](../architecture.md) -- Layer diagram and dependency boundaries
