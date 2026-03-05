# Zed ACP — Agent Extensions

**Source:** https://zed.dev/docs/extensions/agent-servers
**Captured:** 2026-02-28

---

## Overview

Zed supports packaging ACP agents as **extensions** for one-click installation. Starting from Zed v0.221.x, the ACP Registry is the preferred installation method, but extensions remain supported as an alternative distribution channel.

Extensions auto-download agent binaries, add menu items, and handle platform-specific distribution.

---

## extension.toml Format

```toml
[agent_servers.my-agent]
name = "My Agent"
icon = "icon/agent.svg"

[agent_servers.my-agent.env]
AGENT_VAR = "value"

[agent_servers.my-agent.targets.darwin-aarch64]
archive = "https://github.com/example/releases/download/v1.0.0/agent-darwin-arm64.tar.gz"
cmd = "./my-agent"
args = ["--mode", "acp"]
sha256 = "abc123..."

[agent_servers.my-agent.targets.darwin-x86_64]
archive = "https://github.com/example/releases/download/v1.0.0/agent-darwin-x64.tar.gz"
cmd = "./my-agent"

[agent_servers.my-agent.targets.linux-aarch64]
archive = "..."
cmd = "./my-agent"

[agent_servers.my-agent.targets.linux-x86_64]
archive = "..."
cmd = "./my-agent"

[agent_servers.my-agent.targets.windows-x86_64]
archive = "..."
cmd = "./my-agent"
```

---

## Field Reference

### Agent-Level Fields

| Field  | Required | Description                             |
| ------ | -------- | --------------------------------------- |
| `name` | Yes      | Display name shown in Zed UI            |
| `icon` | No       | Path to SVG icon (16x16 bounding box)   |
| `env`  | No       | Environment variables for all platforms |

### Target-Level Fields

| Field     | Required | Description                                   |
| --------- | -------- | --------------------------------------------- |
| `archive` | Yes      | Download URL (`.tar.gz`, `.zip`)              |
| `cmd`     | Yes      | Executable path relative to extracted archive |
| `args`    | No       | Command-line arguments                        |
| `sha256`  | No       | Archive integrity hash                        |
| `env`     | No       | Platform-specific env var overrides           |

---

## Platform Targets

Format: `{os}-{arch}`

| Target            | OS      | Architecture  |
| ----------------- | ------- | ------------- |
| `darwin-aarch64`  | macOS   | Apple Silicon |
| `darwin-x86_64`   | macOS   | Intel         |
| `linux-aarch64`   | Linux   | ARM64         |
| `linux-x86_64`    | Linux   | x86-64        |
| `windows-aarch64` | Windows | ARM64         |
| `windows-x86_64`  | Windows | x86-64        |

---

## Icon Requirements

- **Format**: SVG
- **Bounding box**: 16x16 with 1–2px padding
- **Color**: Must use `currentColor` (monochrome) — Zed auto-converts to match theme
- **Optimization**: Process through SVGOMG for size reduction

---

## Available Agent Extensions

Known Zed extensions for ACP agents:

| Extension | Agent                       |
| --------- | --------------------------- |
| Auggie    | Augment Code's Auggie agent |
| OpenCode  | OpenCode agent              |
| Stakpak   | Stakpak agent               |

---

## Extensions vs Registry

| Feature       | Extension                 | Registry                  |
| ------------- | ------------------------- | ------------------------- |
| Installation  | Zed extension marketplace | Built-in agent picker     |
| Updates       | Extension version bump    | Automatic (hourly checks) |
| Distribution  | Binary archives only      | Binary, npx, uvx          |
| Configuration | `extension.toml`          | `agent.json`              |
| Preferred for | Custom/internal agents    | Public agents             |
