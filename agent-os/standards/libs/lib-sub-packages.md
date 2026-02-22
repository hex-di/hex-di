# Library Sub-Package Splitting

Each lib is split into focused packages so users only pay for what they install.

```
libs/
  logger/
    core/        @hex-di/logger          # ports, adapters, types, utils
    react/       @hex-di/logger-react    # React hooks/providers (peer: react)
    bunyan/      @hex-di/logger-bunyan   # Bunyan backend (peer: bunyan)
    pino/        @hex-di/logger-pino     # Pino backend (peer: pino)
    winston/     @hex-di/logger-winston  # Winston backend (peer: winston)
  tracing/
    core/        @hex-di/tracing         # ports, adapters, types, utils
    datadog/     @hex-di/tracing-datadog # Datadog bridge (peer: dd-trace)
    otel/        @hex-di/tracing-otel    # OpenTelemetry (peer: @opentelemetry/*)
    jaeger/      @hex-di/tracing-jaeger  # Jaeger exporter
    zipkin/      @hex-di/tracing-zipkin  # Zipkin exporter
  flow/
    core/        @hex-di/flow
    react/       @hex-di/flow-react      # React integration (peer: react)
    testing/     @hex-di/flow-testing    # Test utilities (peer: vitest)
```

**Split rules:**
- `react/` — anything requiring `react` as peer dep
- `testing/` — test utilities requiring `vitest` as peer dep
- Vendor backends — anything requiring a third-party vendor as peer dep
- Core package must have zero optional deps that would bloat all users
