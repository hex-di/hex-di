# Observability Map

HexDI provides a vendor-neutral observability stack through ports and adapters. Each concern (logging, error tracking, tracing) has a port in `@hex-di/core` with multiple adapter implementations.

## Logging

| Package                  | Role                                                                    |
| ------------------------ | ----------------------------------------------------------------------- |
| `@hex-di/core`           | `LogHandlerPort`, `ScopedLoggerPort` — vendor-neutral logging contracts |
| `@hex-di/logger-pino`    | Pino-backed `LogHandler` adapter — structured JSON logging              |
| `@hex-di/logger-winston` | Winston-backed `LogHandler` adapter                                     |
| `@hex-di/logger-bunyan`  | Bunyan-backed `LogHandler` adapter                                      |

Logging follows a two-layer design: a **LogHandler** (transport backend) and a **ScopedLogger** (context-enriched facade). The handler is registered once in the graph; scoped loggers are created per-scope with contextual fields (e.g., `requestId`).

## Error Tracking

| Package                         | Role                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `@hex-di/core`                  | `ErrorTrackerPort` — vendor-neutral error tracking contract with `noOp` default |
| `@hex-di/error-tracking-sentry` | Sentry adapter via `@sentry/node`                                               |

The `ErrorTrackerPort` is a well-known port in `@hex-di/core` (`packages/core/src/well-known/error-tracker.ts`). When no adapter is registered, the `noOp` implementation silently drops errors. In production, wire `createSentryErrorTracker` from `@hex-di/error-tracking-sentry`.

## Tracing

| Package                   | Role                                                            |
| ------------------------- | --------------------------------------------------------------- |
| `@hex-di/tracing-core`    | `TracerPort`, span types, and tracer utilities                  |
| `@hex-di/tracing-otel`    | OpenTelemetry SDK integration (batch span processor, exporters) |
| `@hex-di/tracing-jaeger`  | Jaeger exporter adapter                                         |
| `@hex-di/tracing-zipkin`  | Zipkin exporter adapter                                         |
| `@hex-di/tracing-datadog` | DataDog dd-trace bridge — exports HexDI spans to DataDog APM    |

Tracing uses the `TracerPort` contract. Adapters compose an exporter (Jaeger, Zipkin, or DataDog) with a batch processor from `@hex-di/tracing-otel`. The pokenerve example demonstrates this wiring — see [Observability Example](./guides/observability-example.md).

## React Integration

| Component            | Package         | Role                                                                              |
| -------------------- | --------------- | --------------------------------------------------------------------------------- |
| `HexDiErrorBoundary` | `@hex-di/react` | React Error Boundary with `onError` callback for forwarding to `ErrorTrackerPort` |
| `TracingProvider`    | `@hex-di/react` | Context provider for distributed tracing in React component trees                 |

See [React Error Handling](https://github.com/leaderiop/hex-di/blob/main/integrations/react/README.md#error-handling) for wiring patterns.

## Health Endpoints

Example apps expose health endpoints for operational monitoring:

- `GET /health` — basic liveness probe (hono-todo)
- `GET /api/health` — API health with dependency status (pokenerve)
- `GET /debug/health` — container diagnostics with resolution metadata

## Wiring it All Together

The pokenerve API example is the canonical reference for a fully-wired observability stack:

```
Graph
├── LogHandlerPort      → Pino adapter (@hex-di/logger-pino)
├── ScopedLoggerPort    → ScopedLoggerAdapter (context-enriched)
├── ErrorTrackerPort    → Sentry adapter (@hex-di/error-tracking-sentry)
├── TracerPort          → Jaeger exporter + OTel batch processor
└── Health endpoints    → /api/health, /debug/health
```

See [Observability Example Walkthrough](./guides/observability-example.md) for a detailed code walkthrough.

## Related

- [Architecture](./architecture.md) — layer diagram and package boundaries
- [Debug Playbook](./debug-playbook.md) — tracing sanity-checks and logger troubleshooting
- [React README — Error Handling](https://github.com/leaderiop/hex-di/blob/main/integrations/react/README.md#error-handling) — ErrorBoundary + ErrorTracker pattern
