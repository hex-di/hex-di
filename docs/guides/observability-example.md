# Observability Example Walkthrough

The **pokenerve API** is the canonical reference for a fully-wired observability stack in HexDI. It combines structured logging (Pino), error tracking (Sentry), and distributed tracing (Jaeger/OpenTelemetry) in a single dependency injection graph.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      pokenerve API Graph                     │
│                                                              │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │ LogHandlerPort   │  │ ErrorTrackerPort  │  │ TracerPort │ │
│  │   (Pino)         │  │   (Sentry/NoOp)   │  │  (Jaeger)  │ │
│  └────────┬─────────┘  └────────┬──────────┘  └─────┬──────┘ │
│           │                     │                    │        │
│  ┌────────▼─────────┐          │               ┌────▼──────┐ │
│  │ ScopedLoggerPort  │          │               │ Batch     │ │
│  │  (request-scoped) │          │               │ Processor │ │
│  └──────────────────┘          │               └───────────┘ │
│                                │                              │
│  ┌─────────────────────────────┴──────────────────────────┐  │
│  │                Domain Adapters                          │  │
│  │  MemoryCache, RateLimiter, PokeApiProxy                │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Graph Wiring

The graph is built in `examples/pokenerve/api/src/graph/api-graph.ts`:

```typescript
import { createAdapter, ErrorTrackerPort, NoOpErrorTrackerAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { TracerPort } from "@hex-di/tracing";
import { createJaegerExporter } from "@hex-di/tracing-jaeger";
import { createBatchSpanProcessor } from "@hex-di/tracing-otel";
import { createSentryErrorTracker } from "@hex-di/error-tracking-sentry";

export function buildApiGraph(env: EnvConfig) {
  // 1. Tracing: Jaeger exporter + OTel batch processor
  const tracerAdapter = createAdapter({
    provides: TracerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => {
      const exporter = createJaegerExporter({
        serviceName: env.jaegerServiceName,
        endpoint: env.jaegerEndpoint,
        deploymentEnvironment: env.nodeEnv,
      });
      const processor = createBatchSpanProcessor(exporter, {
        scheduledDelayMillis: 1000,
        maxExportBatchSize: 64,
      });
      return createExportingTracer(processor, { "service.name": "pokenerve-api" });
    },
  });

  // 2. Error tracking: Sentry when DSN is configured, NoOp otherwise
  const errorTrackerAdapter = env.sentryDsn
    ? createAdapter({
        provides: ErrorTrackerPort,
        requires: [],
        lifetime: "singleton",
        factory: () =>
          createSentryErrorTracker({
            dsn: env.sentryDsn,
            environment: env.nodeEnv,
          }),
      })
    : NoOpErrorTrackerAdapter;

  // 3. Assemble the graph with all observability + domain adapters
  const apiGraph = GraphBuilder.create()
    .provide(tracerAdapter)
    .provide(logHandlerAdapter) // Pino-backed LogHandler
    .provide(loggerAdapter) // ScopedLogger with request context
    .provide(errorTrackerAdapter) // Sentry or NoOp
    .provide(memoryCacheAdapter)
    .provide(rateLimiterAdapter)
    .provide(pokeApiProxyAdapter)
    .build();

  return { apiGraph, tracerAdapter };
}
```

## Key Patterns

### 1. Conditional error tracking

The error tracker adapter is chosen at startup based on configuration. When `SENTRY_DSN` is set, the Sentry adapter captures exceptions. Otherwise, `NoOpErrorTrackerAdapter` silently drops errors — no code changes needed between environments.

### 2. Structured logging with Pino

The logger wiring in `examples/pokenerve/api/src/adapters/logger.ts`:

```typescript
import { createPinoHandler } from "@hex-di/logger-pino";
import { LogHandlerPort, ScopedLoggerAdapter } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";

export const logHandlerAdapter = createAdapter({
  provides: LogHandlerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => createPinoHandler({ level: "info" }),
});

export const loggerAdapter = ScopedLoggerAdapter;
```

### 3. Distributed tracing with Jaeger

Tracing uses a three-layer composition:

1. **Exporter** — sends spans to Jaeger (`createJaegerExporter`)
2. **Batch processor** — buffers spans for efficient export (`createBatchSpanProcessor`)
3. **Tracer** — creates spans for operations (`createExportingTracer`)

### 4. Health endpoints

The pokenerve API exposes health checks at:

- `GET /api/health` — liveness probe with dependency status
- `GET /debug/health` — container diagnostics including resolution metadata

## Testing the Stack Locally

```bash
# Start the pokenerve API (requires env vars or defaults)
cd examples/pokenerve/api
pnpm dev

# Verify health
curl http://localhost:3001/api/health

# If running Jaeger locally (docker):
# docker run -d --name jaeger -p 14268:14268 -p 16686:16686 jaegertracing/all-in-one
# Then set JAEGER_ENDPOINT=http://localhost:14268/api/traces
```

## Related

- [Observability Map](../observability.md) — full package landscape
- [Debug Playbook — Tracing](../debug-playbook.md#tracing-spans-not-appearing) — troubleshooting tracing issues
- [React Error Handling](https://github.com/leaderiop/hex-di/blob/main/integrations/react/README.md#error-handling) — ErrorBoundary + ErrorTracker in React
