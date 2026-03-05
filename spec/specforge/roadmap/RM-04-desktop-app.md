---
id: RM-04
title: "Phase 4: Desktop App (Tauri)"
kind: roadmap
status: Planned
dependencies: []
---

## Phase 4: Desktop App (Tauri)

**Goal:** Native cross-platform desktop application using Tauri — the primary GUI for local SpecForge usage.
**Source:** [c3-desktop-app.md](../architecture/c3-desktop-app.md)

### Deliverables

| #         | Deliverable                                     | Package              | Behaviors      | Status  |
| --------- | ----------------------------------------------- | -------------------- | -------------- | ------- |
| WI-PH-4-1 | Tauri shell + IPC bridge                        | `@specforge/desktop` | BEH-SF-273–274 | Planned |
| WI-PH-4-2 | Desktop UI (flow control + graph visualization) | `@specforge/desktop` | BEH-SF-275–276 | Planned |
| WI-PH-4-3 | System tray + desktop notifications             | `@specforge/desktop` | BEH-SF-277–278 | Planned |
| WI-PH-4-4 | Auto-update mechanism                           | `@specforge/desktop` | BEH-SF-279     | Planned |
| WI-PH-4-5 | Native file system integration                  | `@specforge/desktop` | BEH-SF-280     | Planned |
| WI-PH-4-6 | Server lifecycle management                     | `@specforge/desktop` | BEH-SF-281     | Planned |
| WI-PH-4-7 | Cross-platform build pipeline                   | `@specforge/desktop` | —              | Planned |

### Behavior Detail (BEH-SF-273–280)

| ID         | Behavior                                                                                                          | Source                                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| BEH-SF-273 | Tauri Window Lifecycle — create, manage, and persist main window state across sessions                            | [c3-desktop-app.md](../architecture/c3-desktop-app.md)                                                                    |
| BEH-SF-274 | IPC Command Bridge — type-safe Tauri command layer between Rust backend and web frontend                          | [c3-desktop-app.md](../architecture/c3-desktop-app.md)                                                                    |
| BEH-SF-275 | Flow Control Panel — start, pause, resume, cancel flows with real-time progress                                   | [c3-desktop-app.md](../architecture/c3-desktop-app.md), [BEH-SF-134](../behaviors/BEH-SF-133-web-dashboard.md)            |
| BEH-SF-276 | Knowledge Graph Visualization — interactive graph explorer with zoom, filter, and search                          | [c3-desktop-app.md](../architecture/c3-desktop-app.md), [BEH-SF-135](../behaviors/BEH-SF-133-web-dashboard.md)            |
| BEH-SF-277 | System Tray Integration — minimize to tray, tray menu for quick actions, background operation                     | [c3-desktop-app.md](../architecture/c3-desktop-app.md)                                                                    |
| BEH-SF-278 | Desktop Notifications — native OS notifications for flow completion, agent events, and errors                     | [c3-desktop-app.md](../architecture/c3-desktop-app.md)                                                                    |
| BEH-SF-279 | Auto-Update Pipeline — check, download, and install updates with rollback on failure                              | [c3-desktop-app.md](../architecture/c3-desktop-app.md)                                                                    |
| BEH-SF-280 | Native File Watcher — monitor project directory for changes and trigger graph recomputation                       | [c3-desktop-app.md](../architecture/c3-desktop-app.md)                                                                    |
| BEH-SF-281 | Server Lifecycle Management — start server on launch if not running, health-check, restart on crash, stop on quit | [c3-desktop-app.md](../architecture/c3-desktop-app.md), [ADR-017](../decisions/ADR-017-standalone-server-over-sidecar.md) |

### Architecture Coverage

- [c3-desktop-app.md](../architecture/c3-desktop-app.md) — Tauri shell, IPC bridge, server lifecycle manager, file watcher, auto-update

### Exit Criteria

- [ ] EC-PH-4-1: Desktop app launches on macOS, Windows, and Linux
- [ ] EC-PH-4-2: Flow execution controllable from desktop (start, pause, resume, cancel)
- [ ] EC-PH-4-3: Auto-update installs new version without manual intervention
- [ ] EC-PH-4-4: Desktop notifications fire on flow completion and critical agent events

### Risk

- Tauri cross-platform differences (especially Linux WebKitGTK variations); native API surface smaller than Electron
