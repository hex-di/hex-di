---
id: UX-SF-065
kind: capability
title: "View Structured Logs with Correlation"
status: active
features: [FEAT-SF-024]
behaviors: [BEH-SF-057, BEH-SF-113, BEH-SF-133]
persona: [devops]
surface: [desktop, dashboard, cli]
---

# View Structured Logs with Correlation

## Use Case

A devops engineer opens the Structured Logs in the desktop app. This enables tracing a single operation through the entire system — from CLI invocation to agent tool call and back. The same operation is accessible via CLI (`specforge logs --flow <run-id> --level info`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌────────────────┐ ┌─────────────────┐ ┌──────────┐ ┌──────────────┐
│ DevOps Engineer│ │   Desktop App   │ │   Desktop App   │ │LogAggregator │
└───────┬────────┘ └────────┬────────┘ └────┬─────┘ └──────┬───────┘
        │           │       │          │
   [if Via CLI]     │       │          │
        │ logs --flow│       │          │
        │───────────►│       │          │
        │           │ queryLogs()      │
        │           │──────────────────►│
        │           │    LogEntries[]   │
        │           │◄──────────────────│
        │  entries  │       │          │
        │◄───────────│       │          │
   [else Via Dashboard]     │          │
        │ open log  │       │          │
        │───────────────────►│          │
        │           │       │streamLogs│
        │           │       │─────────►│
        │           │       │LogStream │
        │           │       │◄─────────│
        │  live view│       │          │
        │◄───────────────────│          │
   [end]            │       │          │
        │           │       │          │
        │ filter by │       │          │
        │ corr. ID  │       │          │
        │───────────►│       │          │
        │           │ queryByCorr()    │
        │           │──────────────────►│
        │           │ RelatedEntries[] │
        │           │◄──────────────────│
        │  trace    │       │          │
        │◄───────────│       │          │
        │           │       │          │
```

```mermaid
sequenceDiagram
    actor Ops as DevOps Engineer
    participant DesktopApp as Desktop App (Structured Logs)
    participant Logs as LogAggregator

    Ops->>+DesktopApp: Open Structured Logs → Filter by flow/level
    DesktopApp->>+Logs: queryLogs(runId, level)
    Logs-->>-DesktopApp: LogEntries[]{correlationId, component, message}
    DesktopApp-->>-Ops: Display structured log entries (BEH-SF-113)

    Ops->>+DesktopApp: Filter by correlation ID (BEH-SF-057)
    DesktopApp->>+Logs: queryByCorrelation(correlationId)
    Logs-->>-DesktopApp: RelatedEntries[]
    DesktopApp-->>-Ops: Trace across components (BEH-SF-133)
```

### CLI

```text
┌────────────────┐ ┌─────┐ ┌──────────┐ ┌──────────────┐
│ DevOps Engineer│ │ CLI │ │LogAggregator │
└───────┬────────┘ └──┬──┘ └────┬─────┘ └──────┬───────┘
        │           │       │          │
   [if Via CLI]     │       │          │
        │ logs --flow│       │          │
        │───────────►│       │          │
        │           │ queryLogs()      │
        │           │──────────────────►│
        │           │    LogEntries[]   │
        │           │◄──────────────────│
        │  entries  │       │          │
        │◄───────────│       │          │
   [else Via Dashboard]     │          │
        │ open log  │       │          │
        │───────────────────►│          │
        │           │       │streamLogs│
        │           │       │─────────►│
        │           │       │LogStream │
        │           │       │◄─────────│
        │  live view│       │          │
        │◄───────────────────│          │
   [end]            │       │          │
        │           │       │          │
        │ filter by │       │          │
        │ corr. ID  │       │          │
        │───────────►│       │          │
        │           │ queryByCorr()    │
        │           │──────────────────►│
        │           │ RelatedEntries[] │
        │           │◄──────────────────│
        │  trace    │       │          │
        │◄───────────│       │          │
        │           │       │          │
```

```mermaid
sequenceDiagram
    actor Ops as DevOps Engineer
    participant CLI
    participant CLI
    participant Logs as LogAggregator

    alt Via CLI
        Ops->>+CLI: specforge logs --flow <run-id> --level info
        CLI->>+Logs: queryLogs(runId, level)
        Logs-->>-CLI: LogEntries[]{correlationId, component, message}
        CLI-->>-Ops: Display structured log entries (BEH-SF-113)
    else Streaming mode
        Ops->>+CLI: specforge logs --follow
        CLI->>+Logs: streamLogs(filters)
        Logs-->>-CLI: LogStream
        CLI-->>-Ops: Live log stream with filters (BEH-SF-133)
    end

    Ops->>+CLI: specforge logs --correlation <id> (BEH-SF-057)
    CLI->>+Logs: queryByCorrelation(correlationId)
    Logs-->>-CLI: RelatedEntries[]
    CLI-->>-Ops: Trace across components
```

## Steps

1. Open the Structured Logs in the desktop app
2. Or Open the desktop app log viewer (BEH-SF-133)
3. Logs include correlation IDs linking related entries across components
4. Filter by correlation ID to trace a single operation (BEH-SF-057)
5. Filter by level (debug, info, warn, error), component, or time range
6. Click a log entry to see full context and related entries
7. Export logs for external analysis: `specforge logs export --format jsonl`

## Traceability

| Behavior   | Feature     | Role in this capability                     |
| ---------- | ----------- | ------------------------------------------- |
| BEH-SF-057 | FEAT-SF-024 | Flow execution logging with correlation IDs |
| BEH-SF-113 | FEAT-SF-024 | CLI log viewer                              |
| BEH-SF-133 | FEAT-SF-024 | Dashboard log viewer                        |
