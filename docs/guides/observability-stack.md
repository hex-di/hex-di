---
title: Recommended Observability Stack
description: Quick decision guide for choosing and wiring HexDI observability packages.
sidebar_position: 11
---

# Recommended Observability Stack

HexDI provides observability as composable port/adapter pairs. This page is the starting point for choosing and wiring them. Each concern is optional and independent — install only what you need.

## At a Glance

| Concern             | Port                            | Recommended Adapter             | Install                                         |
| ------------------- | ------------------------------- | ------------------------------- | ----------------------------------------------- |
| Structured logging  | `LogHandlerPort` / `LoggerPort` | `@hex-di/logger-pino`           | `pnpm add @hex-di/logger @hex-di/logger-pino`   |
| Distributed tracing | `TracerPort`                    | `@hex-di/tracing-otel`          | `pnpm add @hex-di/tracing @hex-di/tracing-otel` |
| Error tracking      | `ErrorTrackerPort`              | `@hex-di/error-tracking-sentry` | `pnpm add @hex-di/error-tracking-sentry`        |
| Diagnostic routes   | (Hono middleware)               | `@hex-di/hono`                  | `pnpm add @hex-di/hono`                         |

Alternative adapters:

- **Logging:** `@hex-di/logger-winston`, `@hex-di/logger-bunyan`
- **Tracing exporters:** `@hex-di/tracing-jaeger`, `@hex-di/tracing-zipkin`, `@hex-di/tracing-datadog`
- **Error tracking:** `NoOpErrorTrackerAdapter` (from `@hex-di/core`) for environments that don't need it

## Minimal Setup (Copy-Paste)

Wire all four concerns in a single graph:

```typescript
import { createAdapter, ErrorTrackerPort, NoOpErrorTrackerAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { ScopedLoggerAdapter, LogHandlerPort } from "@hex-di/logger";
import { createPinoHandler } from "@hex-di/logger-pino";
import { TracerPort, createExportingTracer } from "@hex-di/tracing";
import { createBatchSpanProcessor, createOtlpHttpExporter } from "@hex-di/tracing-otel";
import { createSentryErrorTracker } from "@hex-di/error-tracking-sentry";

const graph = GraphBuilder.create()
  .provide(
    createAdapter({
      provides: LogHandlerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => createPinoHandler({ level: "info" }),
    })
  )
  .provide(ScopedLoggerAdapter)
  .provide(
    createAdapter({
      provides: TracerPort,
      requires: [],
      lifetime: "singleton",
      factory: () =>
        createExportingTracer({
          serviceName: "my-api",
          processor: createBatchSpanProcessor(
            createOtlpHttpExporter({ url: "http://localhost:4318/v1/traces" })
          ),
        }),
    })
  )
  .provide(
    process.env.SENTRY_DSN
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
      : NoOpErrorTrackerAdapter
  )
  .build();
```

## Canonical Reference Implementation

The [`examples/pokenerve/api/`](https://github.com/leaderiop/hex-di/blob/main/examples/pokenerve/api/) application is the reference for full observability wiring in a production-style Hono server. Key files:

| File                                                                                                                                    | Responsibility                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [`graph/api-graph.ts`](https://github.com/leaderiop/hex-di/blob/main/examples/pokenerve/api/src/graph/api-graph.ts)                     | Composes tracer, logger, error tracker, and all service adapters |
| [`server.ts`](https://github.com/leaderiop/hex-di/blob/main/examples/pokenerve/api/src/server.ts)                                       | Middleware, diagnostic routes, container instrumentation         |
| [`adapters/logger.ts`](https://github.com/leaderiop/hex-di/blob/main/examples/pokenerve/api/src/adapters/logger.ts)                     | Pino log handler adapter                                         |
| [`adapters/exporting-tracer.ts`](https://github.com/leaderiop/hex-di/blob/main/examples/pokenerve/api/src/adapters/exporting-tracer.ts) | Tracer with span export to Jaeger                                |
| [`env.ts`](https://github.com/leaderiop/hex-di/blob/main/examples/pokenerve/api/src/env.ts)                                             | Result-based env config including `sentryDsn`                    |

## Decision Guide

**Start here** based on your deployment scenario:

- **Local development only** — Skip all observability. Add `NoOpErrorTrackerAdapter` if your graph requires `ErrorTrackerPort`.
- **Single service, getting started** — Add logging (`@hex-di/logger-pino`) first. Structured JSON logs provide the most value for the least setup.
- **Microservices or distributed system** — Add tracing (`@hex-di/tracing-otel`) with an OTLP collector. Trace-log correlation is automatic when both are wired.
- **Production SaaS** — Add all four: logging, tracing, error tracking (Sentry), and diagnostic routes. See [Production Observability](./production-observability.md) for Datadog/Grafana specifics.

## Detailed Guides

| Guide                                                     | When to read it                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------- |
| [Observability Wiring](./observability-wiring.md)         | Step-by-step wiring with copy-paste code for Hono apps              |
| [Production Observability](./production-observability.md) | Sentry, Datadog, OTel integration and trace-log correlation         |
| [Error Tracking](./error-tracking.md)                     | `ErrorTrackerPort` usage patterns, Result integration, NoOp adapter |
| [Runtime Validation](./runtime-validation.md)             | Startup env validation before container creation                    |
