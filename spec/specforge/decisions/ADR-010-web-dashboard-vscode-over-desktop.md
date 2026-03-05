---
id: ADR-010
kind: decision
title: Web Dashboard + VS Code Extension over Desktop App
status: Superseded
superseded_by: ADR-016
date: 2026-02-27
supersedes: []
invariants: []
---

# ADR-010: Web Dashboard + VS Code Extension over Desktop App

**Superseded Date:** 2026-02-28

## Context

SpecForge was originally designed with a Tauri-based desktop application as the primary UI (ADR-002). While Tauri offered a lightweight native shell, the desktop app introduced significant complexity:

1. **Build toolchain overhead** -- Tauri requires Rust compilation, platform-specific webview SDKs, and cross-platform signing. This is heavy for a CLI-first developer tool.
2. **Deployment coupling** -- The desktop app was tightly coupled to the local machine. In team and SaaS deployment modes, a localhost web dashboard is more natural and deployment-mode agnostic.
3. **Developer workflow mismatch** -- Developers already live in their editor (VS Code) and terminal. A standalone desktop app adds a context switch. Lightweight sidebar panels inside VS Code meet developers where they already work.
4. **Maintenance burden** -- Supporting three platforms (macOS, Windows, Linux) with native webview differences (WebKit vs. WebView2) doubles the testing surface for marginal benefit over a web dashboard.

The core insight is that SpecForge is a CLI-first tool. The UI layer should complement the CLI, not compete with it.

## Decision

Replace the Tauri desktop application with:

1. **Web dashboard** -- A React SPA served at `localhost:PORT` by the SpecForge Server. The SPA is bundled with the server package as static assets. `specforge dashboard` opens the browser. The dashboard provides four key views: Flow Monitor, Graph Explorer, Findings, and Cost Tracker.

2. **VS Code extension** -- Lightweight sidebar panels for flow status, findings, and graph queries. Uses VS Code TreeView providers for structured data and a Webview panel for the Cypher query interface. Communicates with the SpecForge Server via the same HTTP/WebSocket API as the web dashboard.

Both UIs consume the same SpecForge Server REST API and WebSocket event stream, ensuring feature parity and a single source of truth.

## Consequences

### Positive

- **CLI-first approach reaches more developers** -- No native app install required. The dashboard is accessible from any browser on the local machine.
- **Web dashboard works in all deployment modes** -- Solo, team, and SaaS modes all serve the same SPA. In SaaS mode, the dashboard can evolve to support remote access.
- **VS Code extension meets developers where they already work** -- Flow status and findings are visible without leaving the editor. Click-to-navigate from findings to spec files reduces context switching.
- **No native build toolchain required** -- Eliminates the Tauri/Rust compilation dependency, platform-specific webview SDKs, and cross-platform signing.
- **Simpler deployment** -- SPA is bundled as static assets with the server package. No separate installer, no app store distribution.
- **Single API surface** -- Both the web dashboard and VS Code extension consume the same REST + WebSocket API, reducing backend complexity.

### Negative

- **No offline-first native experience** -- The web dashboard requires the SpecForge Server to be running. There is no offline local-first experience like a native app could provide.
- **WebSocket dependency for real-time updates** -- Real-time features depend on a persistent WebSocket connection. Network instability degrades the experience (mitigated by automatic reconnection and HTTP polling fallback).
- **VS Code extension limited to VS Code users** -- Developers using other editors (JetBrains, Neovim) do not benefit from the extension. They can still use the web dashboard and CLI.

### Neutral

- **Web dashboard can evolve to support remote access** -- In SaaS mode, the dashboard could be served from the cloud rather than localhost, enabling remote team access without architectural changes.
- **Extension API surface is stable** -- VS Code TreeView and Webview APIs are mature and well-documented, reducing the risk of breaking changes from VS Code updates.

## References

- Behaviors: [BEH-SF-133 through BEH-SF-138](../behaviors/BEH-SF-133-web-dashboard.md), [BEH-SF-139 through BEH-SF-142](../behaviors/BEH-SF-139-vscode-extension.md)
- Architecture: [c3-web-dashboard.md](../architecture/c3-web-dashboard.md), [c3-vscode-extension.md](../architecture/c3-vscode-extension.md)
- Superseded: [ADR-002 Tauri over Electron](./ADR-002-tauri-over-electron.md)
