---
id: UX-SF-066
kind: capability
title: "Export Traces to External Platform"
status: active
features: [FEAT-SF-024]
behaviors: [BEH-SF-057, BEH-SF-113]
persona: [devops]
surface: [desktop, cli]
---

# Export Traces to External Platform

## Use Case

A devops engineer opens the Trace Export in the desktop app (e.g., Datadog, Grafana, Jaeger) using OpenTelemetry. This integrates SpecForge's execution data into the organization's existing monitoring infrastructure. The same operation is accessible via CLI (`specforge config telemetry --exporter otlp --endpoint <url>`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌────────────────┐ ┌─────────────────┐ ┌──────────────┐ ┌──────────────┐
│ DevOps Engineer│ │   Desktop App   │ │TraceExporter │ │Ext. Platform │
└───────┬────────┘ └────────┬────────┘ └──────┬───────┘ └──────┬───────┘
        │ config      │          │              │
        │ telemetry   │          │              │
        │────────────►│          │              │
        │           │ configure()│              │
        │           │───────────►│              │
        │           │ Configured │              │
        │           │◄───────────│              │
        │ configured│          │              │
        │◄────────────│          │              │
        │           │          │              │
        │     ── During flow execution ──     │
        │           │          │              │
        │           │          │ Export spans  │
        │           │          │─────────────►│
        │           │          │ Acknowledged │
        │           │          │◄─────────────│
        │           │          │              │
        │ telemetry │          │              │
        │ --verify  │          │              │
        │────────────►│          │              │
        │           │ verify() │              │
        │           │───────────►│              │
        │           │ Status{}  │              │
        │           │◄───────────│              │
        │ 42 spans  │          │              │
        │◄────────────│          │              │
        │           │          │              │
```

```mermaid
sequenceDiagram
    actor Ops as DevOps Engineer
    participant DesktopApp as Desktop App (Trace Export)
    participant Traces as TraceExporter
    participant Ext as External Platform

    Ops->>+DesktopApp: specforge config telemetry --exporter otlp --endpoint <url>
    DesktopApp->>+Traces: configureExporter(otlp, endpoint, auth)
    Traces-->>-DesktopApp: ExporterConfigured (BEH-SF-113)
    DesktopApp-->>-Ops: Telemetry exporter configured

    Note over Traces,Ext: During flow execution
    Traces->>+Ext: Export spans via OTLP (BEH-SF-057)
    Ext-->>-Traces: Acknowledged

    Ops->>+DesktopApp: specforge config telemetry --verify
    DesktopApp->>+Traces: verifyExport()
    Traces-->>-DesktopApp: ExportStatus{spans: 42, errors: 0}
    DesktopApp-->>-Ops: Export verified: 42 spans sent
```

### CLI

```text
┌────────────────┐ ┌─────┐ ┌──────────────┐ ┌──────────────┐
│ DevOps Engineer│ │ CLI │ │TraceExporter │ │Ext. Platform │
└───────┬────────┘ └──┬──┘ └──────┬───────┘ └──────┬───────┘
        │ config      │          │              │
        │ telemetry   │          │              │
        │────────────►│          │              │
        │           │ configure()│              │
        │           │───────────►│              │
        │           │ Configured │              │
        │           │◄───────────│              │
        │ configured│          │              │
        │◄────────────│          │              │
        │           │          │              │
        │     ── During flow execution ──     │
        │           │          │              │
        │           │          │ Export spans  │
        │           │          │─────────────►│
        │           │          │ Acknowledged │
        │           │          │◄─────────────│
        │           │          │              │
        │ telemetry │          │              │
        │ --verify  │          │              │
        │────────────►│          │              │
        │           │ verify() │              │
        │           │───────────►│              │
        │           │ Status{}  │              │
        │           │◄───────────│              │
        │ 42 spans  │          │              │
        │◄────────────│          │              │
        │           │          │              │
```

```mermaid
sequenceDiagram
    actor Ops as DevOps Engineer
    participant CLI
    participant Traces as TraceExporter
    participant Ext as External Platform

    Ops->>+CLI: specforge config telemetry --exporter otlp --endpoint <url>
    CLI->>+Traces: configureExporter(otlp, endpoint, auth)
    Traces-->>-CLI: ExporterConfigured (BEH-SF-113)
    CLI-->>-Ops: Telemetry exporter configured

    Note over Traces,Ext: During flow execution
    Traces->>+Ext: Export spans via OTLP (BEH-SF-057)
    Ext-->>-Traces: Acknowledged

    Ops->>+CLI: specforge config telemetry --verify
    CLI->>+Traces: verifyExport()
    Traces-->>-CLI: ExportStatus{spans: 42, errors: 0}
    CLI-->>-Ops: Export verified: 42 spans sent
```

## Steps

1. Open the Trace Export in the desktop app
2. Set authentication for the external platform
3. Configure trace sampling rate and filter criteria
4. System begins exporting traces for all flow executions (BEH-SF-057)
5. Verify export: check the external platform for incoming spans
6. View SpecForge spans in the external platform's trace viewer
7. Adjust sampling and filtering based on volume and cost

## Traceability

| Behavior   | Feature     | Role in this capability                |
| ---------- | ----------- | -------------------------------------- |
| BEH-SF-057 | FEAT-SF-024 | Trace generation during flow execution |
| BEH-SF-113 | FEAT-SF-024 | CLI telemetry configuration            |
