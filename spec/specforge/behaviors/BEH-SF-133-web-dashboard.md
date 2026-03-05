---
id: BEH-SF-133
kind: behavior
title: Web Dashboard
status: active
id_range: "133--138"
invariants: [INV-SF-8]
adrs: [ADR-010]
types: [flow, flow]
ports: [GraphQueryPort, EventBusPort]
---

# 19 — Web Dashboard

---

## Constraints

The Web Dashboard is a **monitoring-only, read-only client**. It connects to the SpecForge Server via HTTP/WebSocket to observe system state. It MUST NOT provide flow start/pause/resume/cancel controls — those actions are available only through the Desktop App, CLI, and VS Code Extension. The only write operation the Web Dashboard performs is updating finding status (BEH-SF-136).

## BEH-SF-133: Localhost Server — SpecForge Server Serves React SPA at `localhost:PORT`

SpecForge Server serves the React SPA alongside its REST API at `localhost:PORT`. The SPA is bundled with the server package as static assets. The `specforge dashboard` command starts the server (if not already running) and opens the default browser to the dashboard URL.

### Contract

> **Clarification:** The web dashboard is read-only for direct flow control operations (no start/pause/resume/cancel buttons). However, the dashboard DOES support `specforge feedback` submission for human-in-the-loop approval gates (see BEH-SF-121--126). Flow control is available via CLI, Desktop App, and VS Code extension.

REQUIREMENT (BEH-SF-133): The SpecForge Server MUST serve the React SPA as static assets at `localhost:PORT` alongside its REST API. The SPA MUST be bundled with the server package (no separate install required). `specforge dashboard` MUST start the server if it is not already running, MUST open the default browser to `http://localhost:PORT`, and MUST output the URL to stdout. The port MUST be configurable via `.specforge/config.json` or the `--port` flag.

### Verification

- Serve test: start the server; verify the SPA is accessible at `http://localhost:PORT`.
- Bundle test: install the server package; verify the SPA assets are included without a separate install step.
- CLI test: run `specforge dashboard`; verify the browser opens to the correct URL.
- Port test: configure a custom port; verify the SPA is served on the custom port.
- Already running test: start the server manually; run `specforge dashboard`; verify it reuses the running server.

---

## BEH-SF-134: Flow Monitor — Real-Time Phase Progress, Agent Activity, Convergence Metrics

The Flow Monitor view displays active and recent flow runs with real-time updates. Each flow run shows phase-by-phase progress bars, agent session status indicators, iteration counts, and a convergence trend chart. Flow runs are listed in reverse chronological order.

### Contract

REQUIREMENT (BEH-SF-134): The Flow Monitor view MUST display a list of active and recent flow runs in reverse chronological order. Each flow run MUST show: (a) phase-by-phase progress bars indicating completion status, (b) agent session status indicators (running, paused, completed, failed), (c) iteration counts per phase, (d) a convergence trend chart showing quality metrics over iterations. The view MUST update in real-time via WebSocket events (`phase-started`, `phase-completed`, `agent-spawned`, `flow-completed`).

### Verification

- Flow list test: start multiple flows; verify all appear in the monitor in reverse chronological order.
- Progress test: advance a flow through phases; verify progress bars update in real-time.
- Agent status test: spawn, pause, and complete agents; verify status indicators reflect the current state.
- Convergence chart test: run a multi-iteration phase; verify the convergence trend chart displays data points.
- Real-time test: observe the view while a flow runs; verify updates appear without manual refresh.

---

## BEH-SF-135: Graph Explorer — Interactive Neo4j Visualization with Cypher Query Bar

The Graph Explorer view provides an interactive visualization of the Neo4j knowledge graph. Users can browse nodes and relationships visually with pan and zoom controls, run ad-hoc Cypher queries via a query bar, and click nodes to inspect their properties in a detail panel.

### Contract

REQUIREMENT (BEH-SF-135): The Graph Explorer view MUST render the knowledge graph as an interactive node-link diagram with pan, zoom, and drag controls. The view MUST provide a Cypher query bar where users can enter and execute ad-hoc Cypher queries against the graph via the server API. Query results MUST be rendered as graph visualizations (for node/relationship results) or as tables (for scalar/aggregate results). Clicking a node MUST open a detail panel showing all node properties.

### Verification

- Visualization test: open the Graph Explorer; verify nodes and relationships are rendered as a graph.
- Pan/zoom test: interact with the graph; verify pan, zoom, and drag controls work.
- Cypher test: enter a Cypher query in the query bar; verify results are displayed.
- Node inspection test: click a node; verify a detail panel shows the node's properties.
- Table results test: run an aggregate Cypher query; verify results display in table format.

---

## BEH-SF-136: Findings View — ACP Session Findings with Severity Filtering and Status Management

The Findings view displays a table of ACP session findings from flow runs. Findings are sortable by severity (critical, warning, info) and filterable by status (open, resolved, deferred). Each finding links to its source spec file location. Status can be updated directly from the table.

### Contract

REQUIREMENT (BEH-SF-136): The Findings view MUST display a table of findings with columns for severity, status, message, source location, and flow run. The table MUST be sortable by severity and MUST support filtering by status (open, resolved, deferred). Each finding MUST link to its source spec file location. The view MUST allow updating a finding's status (open, resolved, deferred) directly from the table. The view MUST update in real-time via WebSocket events (`finding-added`).

### Verification

- Table test: run a flow that produces findings; verify all findings appear in the table.
- Sort test: click the severity column header; verify findings are sorted by severity.
- Filter test: filter by status "open"; verify only open findings are shown.
- Link test: click a finding's source location; verify it opens or highlights the spec file.
- Status update test: change a finding's status to "resolved"; verify the change persists.
- Real-time test: add a finding during a flow; verify it appears in the table without manual refresh.

---

## BEH-SF-137: Cost Tracker — Token Usage per Agent/Phase/Flow with Cost Estimation

The Cost Tracker view displays a dashboard showing token consumption broken down by agent role, phase, and flow run. Includes estimated cost computed using configured pricing rates. Supports filtering by date range and flow run.

### Contract

REQUIREMENT (BEH-SF-137): The Cost Tracker view MUST display token consumption with breakdowns by: (a) agent role (spec-author, reviewer, etc.), (b) phase within a flow run, (c) flow run totals. The view MUST compute and display estimated cost using pricing rates from `.specforge/config.json`. The view MUST support filtering by date range and by specific flow run. Token counts MUST include both input and output tokens. The view MUST update in real-time via WebSocket events (`budget-warning`, `flow-completed`).

### Verification

- Agent breakdown test: run a flow with multiple agents; verify token usage is shown per agent role.
- Phase breakdown test: verify token usage is shown per phase within each flow run.
- Flow total test: verify a total token count is displayed per flow run.
- Cost estimation test: configure pricing; verify estimated cost is calculated and displayed.
- Filter test: filter by a date range; verify only matching flow runs are shown.
- Real-time test: observe the view during a flow; verify token counts update as agents consume tokens.

---

## BEH-SF-138: Real-Time Updates — WebSocket Event Streaming from SpecForge Server

All dashboard views receive real-time updates via a persistent WebSocket connection to the SpecForge Server. The WebSocket streams events including phase-started, phase-completed, finding-added, agent-spawned, budget-warning, and flow-completed. The dashboard gracefully handles disconnection and reconnection.

### Contract

REQUIREMENT (BEH-SF-138): The dashboard MUST establish a persistent WebSocket connection to `ws://localhost:PORT/ws` on load. The server MUST stream the following event types over WebSocket: `phase-started`, `phase-completed`, `finding-added`, `agent-spawned`, `budget-warning`, `flow-completed`. Each event MUST include a `type` field and a `payload` with event-specific data. On disconnection, the dashboard MUST attempt automatic reconnection with exponential backoff. During disconnection, the dashboard MUST display a connection status indicator and MUST fall back to HTTP polling for data freshness.

### Verification

- Connection test: open the dashboard; verify a WebSocket connection is established.
- Event test: start a flow; verify all event types are received by the dashboard.
- Dispatch test: verify each view updates when its relevant events are received.
- Disconnection test: kill the WebSocket connection; verify the dashboard shows a disconnection indicator.
- Reconnection test: restore the server; verify the dashboard reconnects automatically.
- Fallback test: during disconnection, verify data is still refreshed via HTTP polling.
