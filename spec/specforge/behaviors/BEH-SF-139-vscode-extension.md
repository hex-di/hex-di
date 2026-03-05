---
id: BEH-SF-139
kind: behavior
title: VS Code Extension
status: active
id_range: 139--142
invariants: [INV-SF-8]
adrs: [ADR-010, ADR-017]
types: [flow, extensibility]
ports: [GraphQueryPort, EventBusPort]
---

# 20 — VS Code Extension

---

## Constraints

The VS Code Extension operates **independently of the Desktop App**. It connects to a running SpecForge Server using the server discovery mechanism: `specforge.serverUrl` VS Code setting > `SPECFORGE_SERVER_URL` env var > `.specforge/server.lock` file > default `http://localhost:7654`. The `specforge.serverUrl` setting is configurable in VS Code's settings UI and `settings.json`.

## BEH-SF-139: Flow Status Sidebar — Active/Recent Flow Runs with Phase Progress

The Flow Status sidebar panel displays a VS Code TreeView showing active and recent flow runs. Each flow run expands to show its phases and current progress. Clicking a flow run opens the flow details in the web dashboard.

### Contract

REQUIREMENT (BEH-SF-139): The extension MUST register a TreeDataProvider that displays flow runs in the VS Code sidebar. Each flow run tree item MUST show: flow name, status (running, paused, completed, failed), and start time. Expanding a flow run MUST reveal its phases with progress indicators and iteration counts. Clicking a flow run MUST open the flow detail page in the web dashboard (using the discovered server URL, e.g., `http://localhost:7654/flows/<id>`). The TreeView MUST refresh automatically when WebSocket events (`phase-started`, `phase-completed`, `flow-completed`) are received.

### Verification

- TreeView test: start a flow; verify it appears in the sidebar TreeView.
- Expand test: expand a flow run node; verify phases are listed with progress indicators.
- Status test: pause and resume a flow; verify the status icon updates in the TreeView.
- Click test: click a flow run; verify the web dashboard opens to the flow detail page.
- Real-time test: observe the TreeView during a flow; verify it refreshes as phases progress.

---

## BEH-SF-140: Findings Panel — Inline Findings Linked to Spec File Locations

The Findings panel displays a VS Code TreeView showing findings grouped by severity. Clicking a finding navigates to the referenced spec file and line in the editor. Findings update in real-time as new findings are added during flow runs.

### Contract

REQUIREMENT (BEH-SF-140): The extension MUST register a TreeDataProvider that displays findings grouped by severity (critical, warning, info) in the VS Code sidebar. Each finding tree item MUST show: severity icon, message summary, and source file path. Clicking a finding MUST open the referenced spec file in the editor and navigate to the relevant line using `vscode.window.showTextDocument` with a selection range. The TreeView MUST refresh automatically when `finding-added` WebSocket events are received. The panel MUST support a refresh command to manually reload findings.

### Verification

- Grouping test: generate findings of mixed severity; verify they appear grouped by severity in the TreeView.
- Navigation test: click a finding; verify the spec file opens at the correct line.
- Severity icons test: verify critical, warning, and info findings display distinct icons.
- Real-time test: add a finding during a flow; verify it appears in the TreeView without manual refresh.
- Refresh test: trigger the manual refresh command; verify the TreeView reloads findings from the server.

---

## BEH-SF-141: Graph Query Panel — Run Cypher Queries, View Results in Table/Tree Format

The Graph Query Panel provides a VS Code Webview for entering Cypher queries and displaying results. Results can be viewed in either table format (for tabular data) or tree format (for graph traversal results). The panel supports query history.

### Contract

REQUIREMENT (BEH-SF-141): The extension MUST provide a Webview panel (opened via command palette or sidebar action) with a Cypher query input field. Submitting a query MUST execute it against the SpecForge Server via the HTTP API (`POST /api/cypher`) and display the results. Results MUST be renderable in table format (columns and rows) and tree format (expandable node hierarchy). The panel MUST maintain a query history (last 20 queries) navigable with up/down arrows. The panel MUST display query execution time and result count.

### Verification

- Query test: enter a Cypher query; verify results are returned and displayed.
- Table format test: run a tabular query; verify results display as a table with columns and rows.
- Tree format test: run a graph traversal query; verify results display as an expandable tree.
- History test: run multiple queries; verify up/down arrows navigate query history.
- Metadata test: verify execution time and result count are displayed after each query.

---

## BEH-SF-142: Notification Integration — VS Code Notifications for Flow Events

The extension delivers VS Code notifications for significant flow events. Notification severity matches the event type: information for completions, warnings for budget alerts, errors for critical findings.

### Contract

REQUIREMENT (BEH-SF-142): The extension MUST display VS Code notifications for the following events received via WebSocket: (a) `flow-completed` -- information notification with flow name and final status, (b) `finding-added` with severity `critical` -- error notification with finding message and a "Go to file" action, (c) `budget-warning` -- warning notification with current usage percentage and budget limit, (d) `convergence-reached` -- information notification with phase name and iteration count. Notifications MUST be configurable (enable/disable per event type) via extension settings. The "Go to file" action on critical finding notifications MUST navigate to the spec file.

### Verification

- Flow completed test: complete a flow; verify an information notification appears.
- Critical finding test: add a critical finding; verify an error notification appears with a "Go to file" action.
- Budget warning test: trigger a budget warning; verify a warning notification appears.
- Go to file test: click "Go to file" on a critical finding notification; verify the spec file opens.
- Settings test: disable flow-completed notifications in settings; verify no notification appears on flow completion.
