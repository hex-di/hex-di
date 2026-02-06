# Requirements: HexDI v7.0 Distributed Tracing

**Defined:** 2026-02-06
**Core Value:** Catch dependency graph errors at compile time, not runtime
**Milestone Value:** Replace isolated per-container tracing with distributed tracing supporting cross-container propagation, multiple backends, and framework integration

## v7.0 Requirements

### Core Types and Ports

- [x] **CORE-01**: Tracer port with startSpan, withSpan, withSpanAsync, getActiveSpan, getSpanContext, withAttributes methods
- [x] **CORE-02**: Span interface with context, setAttribute, setAttributes, addEvent, setStatus, recordException, end, isRecording
- [x] **CORE-03**: SpanContext type with traceId (32 hex), spanId (16 hex), traceFlags, traceState
- [x] **CORE-04**: SpanData type for completed spans (context, parentSpanId, name, kind, startTime, endTime, duration, status, attributes, events, links)
- [x] **CORE-05**: SpanExporter port with export, shutdown, forceFlush methods
- [x] **CORE-06**: SpanProcessor port with onStart, onEnd, shutdown, forceFlush methods
- [x] **CORE-07**: AttributeValue type (string | number | boolean | arrays) with type guards (no casts)
- [x] **CORE-08**: SpanKind type (internal, server, client, producer, consumer)
- [x] **CORE-09**: SpanStatus type (ok, error, unset)
- [x] **CORE-10**: TracerPort, SpanExporterPort, SpanProcessorPort port definitions via createPort()

### Built-in Adapters

- [x] **ADPT-01**: NoOpTracer adapter with zero runtime overhead (singleton frozen span, no allocations, no timing calls)
- [x] **ADPT-02**: MemoryTracer adapter that collects SpanData for testing assertions (getCollectedSpans, clear)
- [x] **ADPT-03**: ConsoleTracer adapter for development debugging (colorize, includeTimestamps, minDurationMs options)
- [x] **ADPT-04**: All adapters registered via createAdapter() with proper port/lifetime configuration

### Context Propagation

- [x] **CTX-01**: W3C Trace Context traceparent header parsing (version-traceId-spanId-traceFlags)
- [x] **CTX-02**: W3C Trace Context traceparent header serialization
- [x] **CTX-03**: tracestate header parsing and serialization (vendor-specific key-value pairs)
- [x] **CTX-04**: extractTraceContext(headers) function for incoming request context extraction
- [x] **CTX-05**: injectTraceContext(context, headers) function for outgoing request context injection
- [x] **CTX-06**: Trace/span ID generation (crypto.randomUUID or hex-encoded random bytes)
- [x] **CTX-07**: Correlation ID propagation via context variable (CorrelationIdVar)

### Container Instrumentation

- [x] **INST-01**: instrumentContainer(container, tracer, options) installs beforeResolve/afterResolve hooks on a single container, returns cleanup function
- [x] **INST-02**: instrumentContainerTree(root, tracer, options) walks container hierarchy via inspector and instruments all containers
- [x] **INST-03**: Module-level span stack for active span context propagation across containers
- [x] **INST-04**: beforeResolve hook creates child span under active parent span, pushes to stack
- [x] **INST-05**: afterResolve hook pops span from stack, records error/success, ends span with try/finally
- [x] **INST-06**: Resolution span attributes: hex-di.port.name, hex-di.port.lifetime, hex-di.resolution.cached, hex-di.container.name
- [x] **INST-07**: createTracingHook(tracer, options) creates a standalone ResolutionHook for manual hook registration
- [x] **INST-08**: AutoInstrumentOptions: traceSyncResolutions, traceAsyncResolutions, portFilter, additionalAttributes, minDurationMs
- [x] **INST-09**: Cross-container tracing: parent container span is parent of child container resolution spans

### OpenTelemetry Backend

- [ ] **OTEL-01**: @hex-di/tracing-otel package in packages/tracing-otel/
- [ ] **OTEL-02**: OtelSpanExporter adapter converting HexDI SpanData to OTel ReadableSpan
- [ ] **OTEL-03**: BatchSpanProcessor with configurable batch size and flush interval
- [ ] **OTEL-04**: SimpleSpanProcessor for synchronous export (testing/development)
- [ ] **OTEL-05**: OTLP HTTP exporter configuration (endpoint, headers, compression)
- [ ] **OTEL-06**: Resource metadata support (service.name, service.version, deployment.environment)
- [ ] **OTEL-07**: Semantic conventions mapping (hex-di.\* to OTel standard attributes)
- [ ] **OTEL-08**: Timeout-based shutdown for BatchSpanProcessor (prevents disposal deadlock)

### Backend Adapters

- [ ] **BACK-01**: @hex-di/tracing-jaeger package using @opentelemetry/exporter-jaeger (via OTel, not deprecated jaeger-client)
- [ ] **BACK-02**: @hex-di/tracing-zipkin package using @opentelemetry/exporter-zipkin (via OTel, not deprecated zipkin npm)
- [ ] **BACK-03**: @hex-di/tracing-datadog package using dd-trace (proprietary protocol, not OTel bridge)
- [ ] **BACK-04**: Each backend adapter implements SpanExporterPort with proper factory and lifetime

### Breaking Changes and Migration

- [ ] **MIGR-01**: Remove existing TraceCollector, TracingAPI, ResolutionSpan types from @hex-di/core
- [ ] **MIGR-02**: Remove trace(), enableTracing() standalone functions from @hex-di/runtime
- [ ] **MIGR-03**: Remove container.tracer property (TracingAPI) from @hex-di/runtime
- [ ] **MIGR-04**: Remove MemoryCollector, NoOpCollector, CompositeCollector from @hex-di/runtime
- [ ] **MIGR-05**: Update @hex-di/hono integration to use new tracing system
- [ ] **MIGR-06**: Update @hex-di/react integration to use new tracing system
- [ ] **MIGR-07**: Update @hex-di/testing if it references old tracing types
- [ ] **MIGR-08**: Update all examples to use new tracing API
- [ ] **MIGR-09**: Full pnpm -r typecheck and pnpm -r test pass after migration

### Framework Integration

- [ ] **FRMW-01**: Hono tracingMiddleware: extract traceparent from incoming requests, create root span, inject traceparent in responses
- [ ] **FRMW-02**: Hono middleware options: tracer, spanName function, extractContext, injectContext, attributes function
- [ ] **FRMW-03**: React TracingProvider component establishing trace context for React tree
- [ ] **FRMW-04**: React useTracer() hook to access tracer in components
- [ ] **FRMW-05**: React useSpan() hook to get current active span
- [ ] **FRMW-06**: React useTracedCallback() hook for tracing callbacks

### Testing Utilities

- [ ] **TEST-01**: createMemoryTracer() factory for test setup
- [ ] **TEST-02**: assertSpanExists(spans, matcher) assertion helper matching name, status, attributes
- [ ] **TEST-03**: Span matchers for common patterns (hasAttribute, hasEvent, hasStatus, hasDuration)
- [ ] **TEST-04**: MemoryTracer provides getCollectedSpans() and clear() methods

### Performance and Quality

- [ ] **PERF-01**: NoOp tracer overhead < 5% vs no tracing (benchmark verified)
- [ ] **PERF-02**: Memory tracer overhead < 10% vs no tracing (benchmark verified)
- [x] **PERF-03**: Zero external dependencies in @hex-di/tracing core package
- [x] **PERF-04**: All public API has comprehensive JSDoc documentation
- [ ] **PERF-05**: No `any` types, no type casts, no eslint-disable comments

## v8.0 Requirements (Deferred)

### Logging

- **LOG-01**: @hex-di/logging package with Logger/LogSink ports
- **LOG-02**: Structured log events with trace correlation
- **LOG-03**: Console, JSON, and pretty-print log sinks
- **LOG-04**: Log level filtering (trace, debug, info, warn, error)
- **LOG-05**: Automatic DI resolution logging

### Enhanced Tracing

- **ENH-01**: Sampling strategies (head-based, tail-based)
- **ENH-02**: Span links for causality
- **ENH-03**: W3C Baggage propagation
- **ENH-04**: Inspector-to-Container reverse lookup in @hex-di/runtime (replace WeakMap workaround)
- **ENH-05**: Automatic instrumentation of dynamically created child containers

## Out of Scope

| Feature                                       | Reason                                                             |
| --------------------------------------------- | ------------------------------------------------------------------ |
| Automatic third-party library instrumentation | Users install @opentelemetry/auto-instrumentations-node separately |
| Metrics collection                            | Separate concern, separate package (future)                        |
| Graph visualization / DevTools                | Deferred to dedicated visualization milestone                      |
| Decorator-based tracing (@Trace())            | Not core library philosophy                                        |
| Global singleton tracer                       | Anti-pattern; tracer resolved via DI                               |
| Synchronous span export                       | Performance hazard; export is always async                         |
| Custom trace context formats                  | W3C Trace Context is the standard; custom formats not supported    |
| Built-in OTel SDK bundling                    | Users provide their own OTel SDK configuration                     |
| AsyncLocalStorage for React                   | Breaks in concurrent rendering mode                                |

## Traceability

| Requirement | Phase       | Status   |
| ----------- | ----------- | -------- |
| CORE-01     | Phase 23    | Complete |
| CORE-02     | Phase 23    | Complete |
| CORE-03     | Phase 23    | Complete |
| CORE-04     | Phase 23    | Complete |
| CORE-05     | Phase 23    | Complete |
| CORE-06     | Phase 23    | Complete |
| CORE-07     | Phase 23    | Complete |
| CORE-08     | Phase 23    | Complete |
| CORE-09     | Phase 23    | Complete |
| CORE-10     | Phase 23    | Complete |
| ADPT-01     | Phase 23    | Complete |
| ADPT-02     | Phase 23    | Complete |
| ADPT-03     | Phase 23    | Complete |
| ADPT-04     | Phase 23    | Complete |
| CTX-01      | Phase 23    | Complete |
| CTX-02      | Phase 23    | Complete |
| CTX-03      | Phase 23    | Complete |
| CTX-04      | Phase 23    | Complete |
| CTX-05      | Phase 23    | Complete |
| CTX-06      | Phase 23    | Complete |
| CTX-07      | Phase 23    | Complete |
| INST-01     | Phase 24    | Complete |
| INST-02     | Phase 24    | Complete |
| INST-03     | Phase 24    | Complete |
| INST-04     | Phase 24    | Complete |
| INST-05     | Phase 24    | Complete |
| INST-06     | Phase 24    | Complete |
| INST-07     | Phase 24    | Complete |
| INST-08     | Phase 24    | Complete |
| INST-09     | Phase 24    | Complete |
| OTEL-01     | Phase 25    | Pending  |
| OTEL-02     | Phase 25    | Pending  |
| OTEL-03     | Phase 25    | Pending  |
| OTEL-04     | Phase 25    | Pending  |
| OTEL-05     | Phase 25    | Pending  |
| OTEL-06     | Phase 25    | Pending  |
| OTEL-07     | Phase 25    | Pending  |
| OTEL-08     | Phase 25    | Pending  |
| BACK-01     | Phase 25    | Pending  |
| BACK-02     | Phase 25    | Pending  |
| BACK-03     | Phase 25    | Pending  |
| BACK-04     | Phase 25    | Pending  |
| MIGR-01     | Phase 26    | Pending  |
| MIGR-02     | Phase 26    | Pending  |
| MIGR-03     | Phase 26    | Pending  |
| MIGR-04     | Phase 26    | Pending  |
| MIGR-05     | Phase 26    | Pending  |
| MIGR-06     | Phase 26    | Pending  |
| MIGR-07     | Phase 26    | Pending  |
| MIGR-08     | Phase 26    | Pending  |
| MIGR-09     | Phase 26    | Pending  |
| FRMW-01     | Phase 27    | Pending  |
| FRMW-02     | Phase 27    | Pending  |
| FRMW-03     | Phase 27    | Pending  |
| FRMW-04     | Phase 27    | Pending  |
| FRMW-05     | Phase 27    | Pending  |
| FRMW-06     | Phase 27    | Pending  |
| TEST-01     | Phase 27    | Pending  |
| TEST-02     | Phase 27    | Pending  |
| TEST-03     | Phase 27    | Pending  |
| TEST-04     | Phase 27    | Pending  |
| PERF-01     | Phase 27    | Pending  |
| PERF-02     | Phase 27    | Pending  |
| PERF-03     | Phase 23    | Complete |
| PERF-04     | Phase 23    | Complete |
| PERF-05     | Phase 23-27 | Pending  |

**Coverage:**

- v7.0 requirements: 66 total
- Mapped to phases: 66
- Unmapped: 0

---

_Requirements defined: 2026-02-06_
_Last updated: 2026-02-06 Phase 24 complete_
