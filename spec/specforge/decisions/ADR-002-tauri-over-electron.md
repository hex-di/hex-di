---
id: ADR-002
kind: decision
title: Tauri over Electron
status: Accepted
date: 2025-01-15
supersedes: []
invariants: []
---

# ADR-002: Tauri over Electron

**Reinstated Date:** 2026-02-28

## Context

SpecForge needs a desktop application shell. The primary candidates are Electron (mature, large ecosystem) and Tauri (lightweight, Rust backend, system webview).

## Decision

Use Tauri 2.0 for the desktop application shell with a three-layer architecture:

1. **Rust layer (Tauri)** — Window management, IPC, system tray, file dialogs, native menus, Server Lifecycle Manager
2. **SpecForge Server (external process)** — Standalone Node.js process managed by the Rust layer (see [ADR-017](./ADR-017-standalone-server-over-sidecar.md)). SpecForge orchestrator, HexDi container, Claude Code CLI, Neo4j driver
3. **React frontend** — UI views rendered in the system webview

## Rationale

1. **Bundle size** — ~10 MB (Tauri) vs ~150 MB (Electron). SpecForge runs alongside IDEs and other dev tools; a lightweight footprint matters.

2. **Memory usage** — Tauri uses the system webview instead of bundling Chromium. Lower memory overhead for a tool that may run all day alongside an IDE.

3. **Rust backend safety** — The IPC layer benefits from Rust's memory safety guarantees. The Rust layer is thin (mostly IPC routing), but it handles security-sensitive operations like file system scoping.

4. **Process management** — Tauri 2.0 has mature external process management. The SpecForge Server runs as a standalone Node.js process (which needs Node.js for the Claude Code CLI). Communication is via HTTP/WebSocket on localhost.

## Architecture

```
┌────────────────────────────────┐
│     React Frontend (Webview)   │
│  Views │ Hooks │ Components    │
├────────────────────────────────┤
│  Tauri IPC (invoke/events)     │
├────────────────────────────────┤
│     Rust Tauri Core            │
│  Window │ Tray │ Dialogs │ FS  │
├────────────────────────────────┤
│  SpecForge Server (external)   │
│  Orchestrator │ HexDi │ Claude │
│  Neo4j Driver │ Graph Sync     │
└────────────────────────────────┘
```

## Trade-offs

- **Server process management** — The SpecForge Server runs as an external OS process managed by the Rust layer via HTTP/WebSocket. This adds process lifecycle management compared to Electron's direct Node.js integration. Managed by the Server Lifecycle Manager component (see [ADR-017](./ADR-017-standalone-server-over-sidecar.md)).

- **System webview inconsistency** — Different OS versions have different webview engines (WebKit on macOS, WebView2 on Windows). CSS/JS compatibility requires testing across platforms. Mitigated by targeting modern webview versions and using well-supported React patterns.

- **Ecosystem maturity** — Electron has a larger ecosystem of plugins and community solutions. Tauri's ecosystem is growing but smaller. Acceptable because SpecForge's UI is custom-built (not relying on Electron-specific plugins).

## References

- Superseded by [ADR-010](./ADR-010-web-dashboard-vscode-over-desktop.md) — Web dashboard + VS Code extension replaced the desktop app
- Reinstated by [ADR-016](./ADR-016-desktop-app-primary-client.md) — Desktop app restored as primary local client; the SPA survives as shared frontend rendered in Tauri webview and standalone browser
- Amended by [ADR-017](./ADR-017-standalone-server-over-sidecar.md) — Server is a standalone process, not a sidecar
