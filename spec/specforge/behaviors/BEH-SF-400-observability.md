---
id: BEH-SF-400
kind: behavior
title: Observability
status: active
id_range: 400--407
invariants: [INV-SF-24]
adrs: [ADR-020]
types: [flow]
ports: [LoggerPort, MetricsPort, TelemetryPort, ConfigPort]
---

# 61 — Observability

**Feature:** [FEAT-SF-024](../features/FEAT-SF-024-observability.md)

---

## BEH-SF-400: Structured JSON Logging — Correlation IDs in Every Entry

All log entries are emitted as structured JSON with correlation IDs linking each entry to its originating flow, phase, session, and agent. This enables precise filtering and tracing across the full execution hierarchy.

### Contract

REQUIREMENT (BEH-SF-400): `LoggerPort.log(level, message, context)` MUST emit a JSON-structured log entry containing at minimum: `timestamp` (ISO 8601), `level`, `message`, `flowId`, `phaseId`, `sessionId`, and `agentId` fields extracted from `context`. If any correlation ID is absent from the context, the field MUST be set to `null` rather than omitted. Log entries MUST be written to the configured sink synchronously before the call returns.

### Verification

- Structured output test: call `log("info", "test", fullContext)`; verify emitted JSON contains all correlation ID fields.
- Missing correlation test: call `log` with partial context; verify missing IDs appear as `null` in output.
- Sink delivery test: configure a test sink; verify log entries arrive synchronously.

---

## BEH-SF-401: Log Level Configuration — Per-Component Level Control

Log verbosity is configurable per component (flow engine, agent runtime, convergence evaluator, etc.). This allows operators to increase verbosity for a specific subsystem without flooding logs from others.

### Contract

REQUIREMENT (BEH-SF-401): `ConfigPort.setLogLevel(component, level)` MUST configure the minimum log level for the named component. Valid levels are `debug`, `info`, `warn`, `error` in ascending severity. `LoggerPort.log()` MUST suppress entries below the component's configured level. The default level for all components MUST be `info`. Level changes MUST take effect immediately without restart.

### Verification

- Suppression test: set component level to `warn`; emit an `info` log; verify it is suppressed.
- Pass-through test: set component level to `debug`; emit a `debug` log; verify it is emitted.
- Hot reload test: change level from `error` to `debug` at runtime; verify subsequent `debug` logs are emitted.

---

## BEH-SF-402: Runtime Metrics Collection — Token Usage, Latency, and Errors

The MetricsPort collects runtime metrics including token consumption per agent call, flow execution latency, convergence iteration counts, and error rates. Metrics are stored in memory and exposable via external endpoints.

### Contract

REQUIREMENT (BEH-SF-402): `MetricsPort.record(metricName, value, labels)` MUST store the metric value with associated labels (flowId, phaseId, agentRole). The system MUST collect at minimum: `tokens_used` (counter per agent call), `flow_duration_ms` (histogram per flow execution), `convergence_iterations` (gauge per phase), and `error_count` (counter per error type). `MetricsPort.snapshot()` MUST return all collected metrics as a structured object.

### Verification

- Token recording test: execute an agent call; verify `tokens_used` metric is recorded with correct labels.
- Snapshot test: record multiple metrics; call `snapshot()`; verify all metrics are present.
- Label test: record metrics with different labels; verify they are stored as distinct series.

---

## BEH-SF-403: Prometheus Export — Metrics Endpoint Compatibility

Collected metrics are exposable via a Prometheus-compatible HTTP endpoint. The endpoint serves metrics in Prometheus text exposition format, enabling integration with standard monitoring stacks.

### Contract

REQUIREMENT (BEH-SF-403): `MetricsPort.exposePrometheus(port)` MUST start an HTTP server on the specified port serving metrics at `/metrics` in Prometheus text exposition format (version 0.0.4). Counter metrics MUST include `_total` suffix. Histogram metrics MUST include `_bucket`, `_sum`, and `_count` suffixes. The endpoint MUST respond within 500ms. Metrics MUST reflect the current in-memory state at request time.

### Verification

- Endpoint test: start Prometheus endpoint; HTTP GET `/metrics`; verify 200 response with correct content type.
- Format test: verify counter metrics include `_total` suffix and histogram metrics include bucket lines.
- Freshness test: record a new metric; immediately query `/metrics`; verify the new metric appears.

---

## BEH-SF-404: OpenTelemetry Trace Export — Distributed Tracing Integration

The TelemetryPort exports distributed traces in OpenTelemetry format, enabling integration with external observability platforms (Datadog, Grafana Tempo, Jaeger).

### Contract

REQUIREMENT (BEH-SF-404): `TelemetryPort.exportTrace(spans)` MUST export an array of spans conforming to the OpenTelemetry Trace specification (OTLP). Each span MUST include `traceId`, `spanId`, `parentSpanId`, `operationName`, `startTime`, `endTime`, `attributes`, and `status`. The exporter MUST support both HTTP/protobuf and gRPC transport protocols configurable via `ConfigPort.setTraceExporter(protocol, endpoint)`. Export failures MUST be retried with exponential backoff (max 3 attempts).

### Verification

- Export test: create spans and export; verify they arrive at the configured collector endpoint.
- Schema test: verify exported spans contain all required OTLP fields.
- Retry test: simulate export failure; verify retry with backoff up to 3 attempts.

---

## BEH-SF-405: Trace Correlation — Flow to Phase to Session to Agent

Traces form a hierarchy: flow span → phase span → session span → agent span. Each level is a child span of the one above, enabling drill-down from a flow execution to the specific agent action that caused an issue.

### Contract

REQUIREMENT (BEH-SF-405): When a flow executes, `TelemetryPort` MUST create a root span for the flow. Each phase within the flow MUST create a child span of the flow span. Each session within a phase MUST create a child span of the phase span. Each agent invocation within a session MUST create a child span of the session span. All spans in a single flow execution MUST share the same `traceId`. The `parentSpanId` chain MUST be: flow → phase → session → agent.

### Verification

- Hierarchy test: execute a flow with 1 phase, 1 session, 1 agent call; verify 4 spans with correct parent chain.
- Shared traceId test: verify all spans in a flow share the same `traceId`.
- Multi-phase test: execute a flow with 2 phases; verify each phase span is a child of the flow span.

---

## BEH-SF-406: Telemetry Mode Switching — No-Op in Solo, Active in SaaS

In solo deployment mode, all telemetry operations are no-ops incurring zero performance overhead. In SaaS mode, telemetry is fully active and feeds the cloud analytics dashboard. Mode switching is controlled by the deployment configuration.

### Contract

REQUIREMENT (BEH-SF-406): When `ConfigPort.getDeploymentMode()` returns `"solo"`, all `TelemetryPort` and `MetricsPort` methods MUST be no-op implementations that return immediately without allocating memory or performing I/O. When the mode is `"saas"`, all methods MUST be fully active. The mode MUST be determined at startup and MUST NOT change during runtime. The no-op adapter MUST satisfy the same interface as the active adapter, ensuring callers do not need mode-aware branching.

### Verification

- No-op test: in solo mode, call `exportTrace`; verify no I/O occurs and method returns instantly.
- Active test: in SaaS mode, call `exportTrace`; verify spans are exported.
- Interface parity test: verify the no-op adapter implements the same interface as the active adapter.

---

## BEH-SF-407: Retention Policies — Configurable Log and Trace Cleanup

Log entries and trace data are subject to configurable retention policies. Policies define maximum age, maximum storage size, and per-component overrides. Expired data is cleaned up automatically.

### Contract

REQUIREMENT (BEH-SF-407): `ConfigPort.setRetentionPolicy(target, policy)` MUST configure retention for the specified target (`"logs"` or `"traces"`). The policy MUST specify `maxAgeDays` (integer, 1–365) and `maxSizeMB` (integer). When data exceeds either limit, the oldest entries MUST be deleted automatically. Per-component overrides MUST take precedence over the global policy. Cleanup MUST run on a configurable interval (default: every 6 hours) without blocking normal operations.

### Verification

- Age cleanup test: set `maxAgeDays` to 1; insert a log entry dated 2 days ago; trigger cleanup; verify deletion.
- Size cleanup test: set `maxSizeMB` to 1; insert entries exceeding 1MB; trigger cleanup; verify oldest entries are deleted.
- Override test: set a component-specific policy; verify it takes precedence over the global policy.
