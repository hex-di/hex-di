---
id: ADR-017
kind: decision
title: Standalone Server over Sidecar
status: Accepted
date: 2026-02-28
supersedes: []
invariants: []
---

# ADR-017: Standalone Server over Sidecar

**Amends:** [ADR-016](./ADR-016-desktop-app-primary-client.md), [ADR-002](./ADR-002-tauri-over-electron.md)

## Context

ADR-016 describes the Desktop App as embedding the SpecForge Server as a "Node.js sidecar" managed by Tauri's sidecar process API. This couples all non-desktop clients to the Desktop App's lifecycle:

1. **CLI must work without the Desktop App** -- developers need headless flow execution in CI/CD pipelines and remote servers where no GUI is available.
2. **VS Code Extension must work without the Desktop App** -- it connects to a running server independently; requiring the Desktop App would be an unnecessary dependency.
3. **Web Dashboard is monitoring only** -- it cannot spawn Claude Code CLI sessions or trigger flows; it observes server state via HTTP/WebSocket.

The sidecar pattern implies the server exists _inside_ the Desktop App boundary. In practice, the server is a standalone process that any client can connect to.

## Decision

The SpecForge Server is a **standalone process**. All clients (Desktop App, CLI, VS Code Extension, Web Dashboard) connect to it uniformly via HTTP/WebSocket.

### Architecture

```
SpecForge Server (standalone Node.js process)
├── Flow Engine, Session Manager, ACP Session, Graph Sync
├── ONLY component that spawns Claude Code CLI
├── REST API + WebSocket on localhost:7654
└── Started by: `specforge server start`, Desktop App, or any client auto-start

Desktop App (Tauri)
├── Bundles server binary for zero-config install
├── Rust layer: start/stop/health-check server as separate OS process
├── React SPA in webview (connects to server via HTTP/WS)
└── Native features: tray, file watcher, notifications, auto-update

CLI (standalone, works in CI/CD)
├── Connects to running server OR auto-starts one
└── No Desktop App dependency

VS Code Extension (standalone)
├── Connects to running server (configurable URL)
└── No Desktop App dependency

Web Dashboard (monitoring only)
├── Read-only views (flows, findings, graph, costs)
├── Cannot trigger flows or spawn agent sessions
└── Connects to server via HTTP/WebSocket
```

### Server Discovery Mechanism

Clients locate the SpecForge Server using this precedence:

1. `SPECFORGE_SERVER_URL` environment variable (explicit override)
2. `.specforge/server.lock` file in the project root (contains `pid`, `port`, `startedAt`)
3. Default `http://localhost:7654`

### Desktop App Server Lifecycle

The Desktop App's Rust layer manages the server as an **external OS process** (not a sidecar):

- **On launch:** Check if a server is already running (lock file / health check). If not, start the bundled server binary as a detached process.
- **Health monitoring:** Periodic health checks (HTTP `GET /health`). Restart on crash.
- **On quit:** Stop the server process (configurable: stop on quit vs. leave running).
- **Lock file:** The server writes `.specforge/server.lock` on startup; clients read it for discovery.

## Consequences

### Positive

- **CLI works in CI/CD** -- No Desktop App dependency. `specforge run` connects to any running server or starts one.
- **VS Code Extension is independent** -- Configurable `specforge.serverUrl` setting; no Desktop App required.
- **Uniform client model** -- All clients use the same HTTP/WebSocket API. No special IPC for the Desktop App.
- **Server survives client restarts** -- Closing the Desktop App can leave the server running for other clients.

### Negative

- **Process management complexity** -- The Desktop App must manage an external process instead of a built-in sidecar. Requires lock file coordination and health checking.
- **Port conflicts** -- Multiple server instances could conflict. Mitigated by the lock file mechanism and health check before starting.

### Neutral

- **Same server binary** -- The server binary is identical whether started by the Desktop App, CLI, or manually. No code divergence.

## References

- Amended: [ADR-016 Desktop App as Primary Local Client](./ADR-016-desktop-app-primary-client.md)
- Amended: [ADR-002 Tauri over Electron](./ADR-002-tauri-over-electron.md)
- Architecture: [c3-desktop-app.md](../architecture/c3-desktop-app.md)
- Architecture: [c2-containers.md](../architecture/c2-containers.md)
- Behaviors: [BEH-SF-281](../behaviors/BEH-SF-273-desktop-app.md) (Server Lifecycle Management)
- Glossary: [Server Lifecycle Manager](../glossary.md), [Server Discovery](../glossary.md), [Server Lock File](../glossary.md)
