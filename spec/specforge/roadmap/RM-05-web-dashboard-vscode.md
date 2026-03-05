---
id: RM-05
title: "Phase 5: Web Dashboard + VS Code Extension"
kind: roadmap
status: Planned
dependencies: []
---

## Phase 5: Web Dashboard + VS Code Extension

**Goal:** React SPA web dashboard and VS Code extension for visualization and control.
**Source:** [c3-web-dashboard.md](../architecture/c3-web-dashboard.md), [c3-vscode-extension.md](../architecture/c3-vscode-extension.md)

### Deliverables

| #         | Deliverable                           | Package               | Behaviors                | Status  |
| --------- | ------------------------------------- | --------------------- | ------------------------ | ------- |
| WI-PH-5-1 | Web Dashboard (React SPA)             | `@specforge/web`      | BEH-SF-133–138           | Planned |
| WI-PH-5-2 | VS Code Extension                     | `@specforge/vscode`   | BEH-SF-139–142           | Planned |
| WI-PH-5-3 | WebSocket event stream                | `@specforge/server`   | BEH-SF-133               | Planned |
| WI-PH-5-4 | Human-in-the-loop gates               | `@specforge/server`   | BEH-SF-121–126           | Planned |
| WI-PH-5-5 | Surface capabilities & content gating | `@specforge/protocol` | BEH-SF-512–519 (ADR-022) | Planned |

### Architecture Coverage

- [c3-web-dashboard.md](../architecture/c3-web-dashboard.md) — React SPA architecture, WebSocket layer
- [c3-vscode-extension.md](../architecture/c3-vscode-extension.md) — Extension architecture, editor integration

### Exit Criteria

- [ ] EC-PH-5-1: Web Dashboard connects to SpecForge Server and renders live data
- [ ] EC-PH-5-2: VS Code extension provides spec navigation and flow control
- [ ] EC-PH-5-3: Flow execution controllable from both dashboard and extension (start, pause, resume, cancel)

### Risk

- WebSocket reliability under high event volume; VS Code extension cross-platform compatibility
