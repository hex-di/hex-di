---
id: FEAT-SF-006
kind: feature
title: "Desktop App"
status: active
behaviors:
  [
    BEH-SF-273,
    BEH-SF-274,
    BEH-SF-275,
    BEH-SF-276,
    BEH-SF-277,
    BEH-SF-278,
    BEH-SF-279,
    BEH-SF-280,
    BEH-SF-281,
  ]
adrs: [ADR-002, ADR-016, ADR-017, ADR-019]
roadmap_phases: [RM-04]
---

# Desktop App

## Problem

Local-first users need a native application for managing specification workflows without depending on cloud infrastructure. Web browsers introduce latency and lack deep OS integration for file watching, process management, and system tray presence.

## Solution

A Tauri-based desktop application serves as the primary local client (ADR-016). It provides a native window with IPC bridge to a standalone server process (ADR-017), flow control UI, graph visualization, and deep OS integration. The architecture follows Zed-inspired patterns (ADR-019) for performance and responsiveness. The desktop app manages the server lifecycle, bridges file system events, and provides a rich UI for flow monitoring and graph exploration.

## Constituent Behaviors

| ID         | Summary                                           |
| ---------- | ------------------------------------------------- |
| BEH-SF-273 | Tauri window lifecycle management                 |
| BEH-SF-274 | IPC bridge between Tauri shell and server         |
| BEH-SF-275 | Server lifecycle management (start, stop, health) |
| BEH-SF-276 | Flow control UI (start, pause, resume, cancel)    |
| BEH-SF-277 | Graph visualization panel                         |
| BEH-SF-278 | File watcher integration                          |
| BEH-SF-279 | System tray presence                              |
| BEH-SF-280 | Auto-update mechanism                             |
| BEH-SF-281 | Desktop app settings and preferences              |

## Acceptance Criteria

- [ ] Tauri app launches and displays main window
- [ ] IPC bridge communicates reliably with standalone server
- [ ] Server lifecycle is managed (start on app launch, graceful shutdown)
- [ ] Flow control UI reflects real-time flow state
- [ ] Graph visualization renders knowledge graph nodes and edges
- [ ] File watcher detects spec file changes and triggers sync
