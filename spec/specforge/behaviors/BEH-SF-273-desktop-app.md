---
id: BEH-SF-273
kind: behavior
title: Desktop App
status: active
id_range: "273--281"
invariants: [INV-SF-8]
adrs: [ADR-002, ADR-016, ADR-017]
types: [flow, flow]
ports: [EventBusPort, ConfigPort]
---

# 29 — Desktop App

## BEH-SF-273: Tauri Window Lifecycle — Create, Manage, and Persist Main Window State

The Desktop App creates and manages a single main window using Tauri's window management API. Window position, size, and maximized state are persisted across sessions. Closing the window minimizes to the system tray instead of terminating the application (configurable). The SpecForge Server continues running while the window is closed.

### Contract

REQUIREMENT (BEH-SF-273): The Desktop App MUST create a main window on launch using Tauri's window API. The window position, size, and maximized/fullscreen state MUST be persisted to local storage and restored on next launch. Closing the window MUST minimize to the system tray by default (configurable via settings to quit instead). The SpecForge Server MUST continue running when the window is closed. Reopening from the tray MUST restore the window to its persisted state.

### Verification

- Launch test: launch the Desktop App; verify the main window opens.
- Persistence test: resize and move the window; quit and relaunch; verify position and size are restored.
- Close-to-tray test: close the window; verify the app remains in the system tray and the SpecForge Server is still running.
- Reopen test: click the tray icon; verify the window reopens in its persisted state.
- Quit test: configure close-to-quit; close the window; verify the application terminates and the SpecForge Server stops.

---

## BEH-SF-274: IPC Command Bridge — Type-Safe Tauri Command Layer

The IPC Command Bridge provides a type-safe command layer between the React frontend (webview) and the Rust backend. Frontend code calls `invoke()` with typed command names and payloads. Commands are routed to Rust handlers (for native features) or proxied to the SpecForge Server REST API (for server features). Rust-to-frontend events are emitted via Tauri's event system.

### Contract

REQUIREMENT (BEH-SF-274): The Desktop App MUST expose a set of Tauri commands callable from the webview via `invoke()`. Each command MUST have a typed name and payload. Commands for native features (window management, file dialogs, clipboard, notifications) MUST be handled by Rust handlers. Commands for server features MUST be proxied to the SpecForge Server's REST API. The Rust layer MUST emit events to the webview via Tauri's event system for SpecForge Server status changes (started, stopped, error) and file watcher notifications. All IPC calls MUST return typed responses or typed error objects.

### Verification

- Native command test: invoke a window management command from the webview; verify the Rust handler executes.
- Proxy command test: invoke a server-proxied command; verify it reaches the SpecForge Server REST API.
- Event test: trigger a SpecForge Server status change; verify the webview receives the event.
- Type safety test: invoke a command with an incorrect payload type; verify the call is rejected.
- Error test: invoke a command when the SpecForge Server is unavailable; verify a typed error is returned.

---

## BEH-SF-275: Flow Control Panel — Native Desktop Flow Management

The Desktop App renders the Flow Monitor view (BEH-SF-134) in its webview with additional native capabilities. Flow start/pause/resume/cancel actions are available from both the webview and the system tray. Native progress indicators (macOS dock badge, Windows taskbar progress) reflect the active flow's status. Flow completion triggers a native OS notification (BEH-SF-278).

### Contract

REQUIREMENT (BEH-SF-275): The Desktop App MUST render the Flow Monitor view (BEH-SF-134) in its webview. The app MUST provide flow control actions (start, pause, resume, cancel) from both the webview UI and the system tray context menu. The app MUST display native progress indicators: macOS dock badge showing iteration count, Windows taskbar progress bar showing phase completion percentage. Flow control actions initiated from the tray MUST be reflected in the webview in real-time. The app MUST trigger a native notification on flow completion.

### Verification

- Webview flow test: start a flow from the webview; verify the Flow Monitor updates.
- Tray flow test: start a flow from the tray menu; verify the webview reflects the running flow.
- Native progress test (macOS): start a flow; verify the dock badge shows the iteration count.
- Native progress test (Windows): start a flow; verify the taskbar progress bar advances.
- Sync test: pause a flow from the tray; verify the webview shows the paused state.

---

## BEH-SF-276: Knowledge Graph Visualization — Native Desktop Graph Explorer

The Desktop App renders the Graph Explorer view (BEH-SF-135) in its webview with native desktop enhancements. The graph visualization supports hardware-accelerated rendering via the system webview. Node double-click opens the referenced file in the user's default editor via OS file association. Export graph screenshots via native file save dialog.

### Contract

REQUIREMENT (BEH-SF-276): The Desktop App MUST render the Graph Explorer view (BEH-SF-135) in its webview. Double-clicking a graph node that references a file MUST open the file in the user's default editor via the OS file association. The app MUST provide a "Save Screenshot" action that captures the graph visualization and saves it via a native file dialog. Graph rendering MUST use the system webview's hardware acceleration for smooth interaction with large graphs (1000+ nodes).

### Verification

- Graph render test: open the Graph Explorer; verify nodes and relationships render correctly.
- File open test: double-click a file node; verify the file opens in the default editor.
- Screenshot test: click "Save Screenshot"; verify the native file dialog opens and the screenshot saves.
- Performance test: load a graph with 1000+ nodes; verify smooth pan and zoom interaction.

---

## BEH-SF-277: System Tray Integration — Minimize to Tray, Quick Actions, Background Operation

The Desktop App installs a system tray icon with a status indicator reflecting the current state (idle, flow running, error). The tray provides a context menu with quick actions: open the main window, start the last-run flow, pause the active flow, and quit. The app operates in the background when the window is closed.

### Contract

REQUIREMENT (BEH-SF-277): The Desktop App MUST install a system tray icon on launch. The tray icon MUST display a status indicator: idle (default icon), flow running (animated or distinct icon), error (error icon). The tray MUST provide a context menu with: (a) "Open SpecForge" — opens/focuses the main window, (b) "Start Last Flow" — starts the most recently executed flow, (c) "Pause Flow" — pauses the active flow (grayed out if no flow running), (d) "Quit" — stops the SpecForge Server and exits the application. The tray icon MUST remain visible when the main window is closed. Left-clicking the tray icon MUST open/focus the main window.

### Verification

- Tray presence test: launch the app; verify the tray icon appears.
- Status test: start a flow; verify the tray icon changes to the "running" state.
- Menu test: right-click the tray; verify all menu items are present.
- Quick action test: click "Start Last Flow"; verify the flow starts.
- Left-click test: close the window; left-click the tray; verify the window reopens.
- Quit test: click "Quit"; verify the SpecForge Server stops and the app exits.

---

## BEH-SF-278: Desktop Notifications — Native OS Notifications for Flow and Agent Events

The Desktop App sends native OS notifications for key events: flow completion (success or failure), critical findings detected, agent errors, and SpecForge Server health issues. Notifications are configurable — users can enable/disable notification categories. Clicking a notification opens the relevant view in the main window.

### Contract

REQUIREMENT (BEH-SF-278): The Desktop App MUST send native OS notifications for: (a) flow completion — title includes flow name, body includes finding summary, (b) critical findings — when findings with severity "critical" are detected during a flow, (c) agent errors — when an agent subprocess crashes or fails, (d) SpecForge Server health — when the SpecForge Server process crashes or becomes unreachable. Each notification category MUST be independently configurable (enable/disable) via the app settings. Clicking a notification MUST open the main window and navigate to the relevant view (Flow Monitor for flow events, Findings for finding events). Notifications MUST use the OS-native notification system (macOS Notification Center, Windows Toast, Linux libnotify).

### Verification

- Flow complete test: complete a flow; verify a native notification appears.
- Critical finding test: add a critical finding; verify a notification fires.
- Agent error test: crash an agent; verify a notification fires.
- Click-to-navigate test: click a flow completion notification; verify the window opens to the Flow Monitor.
- Disable test: disable flow completion notifications; complete a flow; verify no notification fires.
- Platform test: verify notifications use the native system on each supported platform.

---

## BEH-SF-279: Auto-Update Pipeline — Check, Download, Install, Rollback

The Desktop App checks for updates on startup and periodically (configurable interval, default: daily). Updates are downloaded as delta packages. Installation applies the update and restarts the app. If the new version fails to start (health check fails within 30 seconds), the app rolls back to the previous version automatically.

### Contract

REQUIREMENT (BEH-SF-279): The Desktop App MUST check for updates from a configured update server on startup and at a configurable interval (default: once per day). When an update is available, the app MUST display an update notification with version number and changelog summary. The user MUST be able to accept or defer the update. On acceptance, the app MUST download the update package and display download progress. After download, the app MUST install the update and restart. If the new version fails to start (SpecForge Server health check fails within 30 seconds of restart), the app MUST automatically roll back to the previous version and notify the user of the rollback. Auto-update MUST be disableable via settings (for enterprise/managed deployments).

### Verification

- Check test: launch the app with an update available; verify the update notification appears.
- Download test: accept the update; verify the download progress is displayed.
- Install test: after download; verify the app restarts with the new version.
- Rollback test: simulate a bad update (SpecForge Server fails to start); verify the app rolls back to the previous version.
- Defer test: defer the update; verify the app continues with the current version.
- Disable test: disable auto-update; verify no update checks occur.
- Health check test: after restart, verify the SpecForge Server health check completes within 30 seconds.

---

## BEH-SF-280: Native File Watcher — Monitor Project Directory and Trigger Graph Recomputation

The Desktop App watches the active project directory for file changes using OS-native file system events (FSEvents on macOS, inotify on Linux, ReadDirectoryChanges on Windows). File changes are debounced (100ms window) and forwarded to the SpecForge Server to trigger incremental graph recomputation. The watcher respects `.gitignore` and `.specforgeignore` patterns.

### Contract

REQUIREMENT (BEH-SF-280): The Desktop App MUST watch the active project directory for file create, modify, and delete events using OS-native file system APIs. Events MUST be debounced with a 100ms window to coalesce rapid changes (e.g., `git checkout`). After debounce, the app MUST forward changed file paths to the SpecForge Server via HTTP POST to trigger incremental graph recomputation. The watcher MUST respect `.gitignore` patterns (if present) and `.specforgeignore` patterns (if present) to exclude irrelevant files (node_modules, build artifacts, etc.). The watcher MUST start when a project is opened and stop when the project is closed or the app quits. The watcher status (active, paused, error) MUST be visible in the app status bar.

### Verification

- Watch test: open a project; modify a file; verify the SpecForge Server receives the change event.
- Debounce test: modify 10 files rapidly; verify a single batched event is sent after debounce.
- Ignore test: modify a file in `node_modules/`; verify no event is sent.
- Specforgeignore test: add a pattern to `.specforgeignore`; verify matching files are excluded.
- Status test: verify the watcher status is displayed in the app status bar.
- Stop test: close the project; verify the watcher stops.

---

## BEH-SF-281: Server Lifecycle Management — Start, Health-Check, Restart, Stop

The Desktop App manages the SpecForge Server as an external OS process via the Server Lifecycle Manager component. On launch, the Desktop App checks if a server is already running (reads `.specforge/server.lock` and performs an HTTP health check). If no server is running, the Desktop App starts the bundled server binary as a detached process. The Server Lifecycle Manager performs periodic health checks and automatically restarts the server on crash. On Desktop App quit, the server is stopped (configurable: stop on quit vs. leave running for other clients).

### Contract

REQUIREMENT (BEH-SF-281): The Desktop App MUST check for a running SpecForge Server on launch by reading `.specforge/server.lock` and performing an HTTP `GET /health` request. If no server is running, the Desktop App MUST start the bundled server binary as a detached OS process and wait for the health check to succeed (timeout: 10 seconds). The server MUST write a `.specforge/server.lock` file on startup containing `pid`, `port`, and `startedAt` fields. The Server Lifecycle Manager MUST perform periodic health checks (default: every 5 seconds). If the health check fails 3 consecutive times, the Server Lifecycle Manager MUST restart the server process automatically. On Desktop App quit, the Server Lifecycle Manager MUST stop the server process by default (configurable via settings to leave running). If another client started the server (detected by comparing the lock file's PID with the Desktop App's child PID), the Desktop App MUST NOT stop the server on quit.

### Verification

- Auto-start test: launch the Desktop App with no server running; verify the server starts and the health check succeeds.
- Already-running test: start the server manually; launch the Desktop App; verify it connects to the existing server without starting a second instance.
- Health check test: verify the Server Lifecycle Manager performs periodic health checks at the configured interval.
- Crash recovery test: kill the server process; verify the Server Lifecycle Manager detects the crash and restarts the server within 15 seconds.
- Lock file test: start the server via Desktop App; verify `.specforge/server.lock` contains valid `pid`, `port`, and `startedAt` fields.
- Quit-stop test: quit the Desktop App; verify the server process is stopped.
- Quit-leave test: configure "leave server running on quit"; quit the Desktop App; verify the server process continues running.
- External server test: start the server via CLI (`specforge server start`); launch the Desktop App; quit the Desktop App; verify the server continues running (Desktop App did not start it).

---

## Auto-Update Rollback

**BEH-SF-DESKTOP-01:** REQUIREMENT: "Fails to start" is defined as: health check fails within 30 seconds of launch after an update.

**BEH-SF-DESKTOP-02:** REQUIREMENT: On update failure, the Desktop App MUST restore the previous server binary from backup.

**BEH-SF-DESKTOP-03:** REQUIREMENT: If rollback itself fails, the Desktop App MUST log the error, display a notification to the user, and remain on the failed version (no infinite retry loop).

---

**BEH-SF-DESKTOP-04:** REQUIREMENT: The Desktop App MUST support a "Keep server running after app close" setting, configured via `.specforge/config.json` field `desktop.leaveServerRunning` (boolean, default: `false`).

---

**BEH-SF-DESKTOP-05:** REQUIREMENT: File watcher startup failure MUST log a warning and continue without the watcher (non-critical).

**BEH-SF-DESKTOP-06:** REQUIREMENT: File watcher mid-operation failure MUST debounce + retry once. Server unreachable events MUST be buffered (max 1000 events) and replayed on reconnect.

---

**BEH-SF-DESKTOP-07:** REQUIREMENT: Auto-update downloads MUST be cancellable, support resume via HTTP Range headers, and retry up to 3 times on failure.

---

> **Tray icon status (N13):** Green = healthy, Yellow = degraded, Red = unhealthy. Icon updates via health check polling (5-second interval).

> **Notifications (N15):** Desktop notifications expire after 30 seconds. No-op if the application window is focused.
