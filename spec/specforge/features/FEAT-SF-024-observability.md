---
id: FEAT-SF-024
kind: feature
title: "Observability & Telemetry"
status: active
behaviors:
  [BEH-SF-400, BEH-SF-401, BEH-SF-402, BEH-SF-403, BEH-SF-404, BEH-SF-405, BEH-SF-406, BEH-SF-407]
adrs: [ADR-020]
roadmap_phases: [RM-09]
---

# Observability & Telemetry

## Problem

When flows fail, converge slowly, or produce unexpected results, operators have no structured way to diagnose issues. Agent decision-making is opaque, token consumption is invisible, and there is no way to export traces to external observability platforms.

## Solution

Three ports provide layered observability: LoggerPort produces structured JSON logs with correlation IDs linking log entries to specific sessions, phases, and iterations; MetricsPort collects runtime metrics (token usage, latency, convergence rates, error counts) exposable via Prometheus-compatible endpoints; TelemetryPort exports distributed traces in OpenTelemetry format for integration with external platforms (Datadog, Grafana, etc.). In solo mode, telemetry is a no-op; in SaaS mode, it feeds the cloud analytics dashboard.

## Constituent Behaviors

| ID         | Summary                                                   |
| ---------- | --------------------------------------------------------- |
| BEH-SF-400 | Structured JSON logging with correlation IDs              |
| BEH-SF-401 | Log level configuration per component                     |
| BEH-SF-402 | Runtime metrics collection (token usage, latency, errors) |
| BEH-SF-403 | Metrics export via Prometheus-compatible endpoint         |
| BEH-SF-404 | Distributed trace export in OpenTelemetry format          |
| BEH-SF-405 | Trace correlation across flow → phase → session → agent   |
| BEH-SF-406 | Telemetry mode switching (no-op in solo, active in SaaS)  |
| BEH-SF-407 | Log and trace retention policies                          |

## Acceptance Criteria

- [ ] Every log entry includes correlation IDs for flow, phase, and session
- [ ] Metrics endpoint exposes token usage, latency, and error rates
- [ ] OpenTelemetry traces can be exported to external platforms
- [ ] Traces correlate across the full flow → phase → session → agent chain
- [ ] Solo mode incurs zero telemetry overhead (no-op adapter)
- [ ] Log retention policies enforce configurable cleanup
