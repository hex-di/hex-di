---
id: ADR-016
kind: decision
title: Desktop App as Primary Local Client
status: Accepted
date: 2026-02-28
supersedes: [ADR-010]
invariants: []
---

# ADR-016: Desktop App as Primary Local Client

**Reinstates:** [ADR-002](./ADR-002-tauri-over-electron.md) (Tauri over Electron)

## Context

ADR-010 replaced the Tauri desktop application with a web dashboard and VS Code extension, reasoning that a CLI-first tool should avoid the complexity of a native app. However, the product direction has evolved:

1. **Session control as primary UX** -- SpecForge's core value is orchestrating Claude Code CLI sessions. A desktop app that spawns and controls these sessions provides a natural, always-available control surface that a browser tab cannot match.
2. **Zero-config local experience** -- The desktop app bundles the SpecForge Server binary and manages it as a separate process. Users install one application and get the full stack: server, graph database connection, agent orchestration, and a native GUI. No `npm install`, no `specforge server start`, no browser navigation.
3. **Native OS integration** -- System tray presence, native notifications, file system watching, and auto-updates are first-class desktop capabilities that web dashboards simulate poorly.
4. **Beta launch vehicle** -- The desktop app is the distribution mechanism for PT-2 (Beta Launch). A .dmg/.msi/.AppImage is a more accessible entry point for beta users than `npm install -g`.
5. **Shared SPA survives** -- The React SPA built for the web dashboard (ADR-010) is not discarded. It becomes the shared frontend codebase rendered in the Tauri webview (desktop) or served standalone (SaaS/browser). The investment in the SPA is preserved.

## Decision

Adopt the Tauri desktop application as the primary local GUI for SpecForge, reinstating the three-layer architecture from ADR-002:

1. **Rust layer (Tauri)** -- Window management, system tray, IPC bridge, file watcher, auto-update engine, Server Lifecycle Manager.
2. **SpecForge Server (external process)** -- The SpecForge Server binary, managed by the Rust layer as a separate OS process (see [ADR-017](./ADR-017-standalone-server-over-sidecar.md)). Runs the full orchestration stack (Flow Engine, Session Manager, ACP messaging, Graph Sync, Neo4j driver, Claude Code CLI subprocesses). Exposes REST API + WebSocket on localhost.
3. **React frontend (Webview)** -- The shared SPA from c3-web-dashboard.md, rendered in the Tauri webview. Same codebase used when the SPA is served standalone in the browser.

The web dashboard and VS Code extension continue to exist as alternative access points:

- **Web dashboard** -- The SPA served standalone by the server for browser access (SaaS mode, remote access).
- **VS Code extension** -- Lightweight sidebar panels connecting to the server via HTTP/WebSocket.

## Consequences

### Positive

- **Single install, full stack** -- Desktop app bundles server + SPA + server lifecycle management. Users go from download to first flow in under 5 minutes.
- **Native OS presence** -- System tray icon provides always-available access to flow status and quick actions. Native notifications surface flow completions and critical events without requiring the browser to be open.
- **File system watching** -- Tauri's Rust layer can watch the project directory for changes and trigger graph recomputation via the SpecForge Server, enabling continuous drift detection.
- **Auto-updates** -- Built-in update mechanism keeps the server, SPA, and Rust layer in sync. No separate `npm update` required.
- **Shared SPA investment preserved** -- The React SPA is the same codebase in both desktop webview and standalone browser modes. No duplication.
- **Clear beta distribution** -- .dmg, .msi, and .AppImage are standard distribution formats. Beta users install a single file.

### Negative

- **Tauri build toolchain** -- Requires Rust compilation and platform-specific signing for distribution. CI/CD pipeline must build for macOS, Windows, and Linux.
- **Cross-platform webview differences** -- WebKit on macOS, WebView2 on Windows, WebKitGTK on Linux. CSS/JS behavior may vary. Mitigated by targeting modern webview versions.
- **Server process management** -- The Rust layer must manage the SpecForge Server lifecycle as an external process (spawn, health check, restart on crash). Requires lock file coordination for server discovery by other clients.

### Neutral

- **Web dashboard unaffected** -- The standalone web dashboard remains available for SaaS mode and browser-based access. The desktop app is an additional client, not a replacement for the SPA itself.
- **VS Code extension unaffected** -- The extension connects to the server regardless of how the server was started.

## References

- Behaviors: [BEH-SF-273 through BEH-SF-281](../behaviors/BEH-SF-273-desktop-app.md)
- Architecture: [c3-desktop-app.md](../architecture/c3-desktop-app.md)
- Reinstated: [ADR-002 Tauri over Electron](./ADR-002-tauri-over-electron.md)
- Superseded: [ADR-010 Web Dashboard + VS Code over Desktop](./ADR-010-web-dashboard-vscode-over-desktop.md)
- Amended by: [ADR-017 Standalone Server over Sidecar](./ADR-017-standalone-server-over-sidecar.md)
- Product milestone: PT-2 (Beta Launch — Desktop App)
