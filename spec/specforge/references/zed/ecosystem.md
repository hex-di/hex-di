# Zed ACP — Ecosystem

**Source:** https://github.com/agentclientprotocol/registry, https://agentclientprotocol.com
**Captured:** 2026-02-28

---

## Supported Agents

### Tier 1 — Major AI Providers

| Agent          | ID               | Distribution                             | Provider  | Notes                                    |
| -------------- | ---------------- | ---------------------------------------- | --------- | ---------------------------------------- |
| Claude Agent   | `claude-acp`     | npx (`@zed-industries/claude-agent-acp`) | Anthropic | ACP wrapper maintained by Zed Industries |
| Gemini CLI     | `gemini`         | npx                                      | Google    | Google's CLI agent                       |
| GitHub Copilot | `github-copilot` | binary                                   | GitHub    | Platform-specific binaries               |
| Codex          | `codex-acp`      | npx                                      | OpenAI    | OpenAI's coding agent                    |

### Tier 2 — Established Agents

| Agent    | ID         | Distribution | Provider       |
| -------- | ---------- | ------------ | -------------- |
| Goose    | `goose`    | binary       | Block (Square) |
| Auggie   | `auggie`   | binary       | Augment Code   |
| Cline    | `cline`    | —            | Cline          |
| Junie    | `junie`    | —            | JetBrains      |
| OpenCode | `opencode` | binary       | OpenCode       |

### Tier 3 — Growing Ecosystem

| Agent         | ID               | Provider    |
| ------------- | ---------------- | ----------- |
| Kilo          | `kilo`           | —           |
| Kimi          | `kimi`           | Moonshot AI |
| Stakpak       | `stakpak`        | Stakpak     |
| Qwen Code     | `qwen-code`      | Alibaba     |
| Mistral Vibe  | `mistral-vibe`   | Mistral AI  |
| Corust Agent  | `corust-agent`   | —           |
| Factory Droid | `factory-droid`  | —           |
| CodeBuddy     | `codebuddy-code` | —           |
| Pi ACP        | `pi-acp`         | —           |
| Qoder         | `qoder`          | —           |
| AutoHand      | `autohand`       | —           |
| Minion Code   | `minion-code`    | —           |

---

## Supported Editors (Clients)

| Editor         | Status     | Integration Type  |
| -------------- | ---------- | ----------------- |
| Zed            | Production | Native (built-in) |
| JetBrains IDEs | Available  | Plugin            |
| Neovim         | Available  | Plugin            |
| Emacs          | Available  | Plugin            |

### Zed (Reference Implementation)

Zed is the reference client for ACP. The protocol was designed and first implemented within Zed, and the editor provides:

- Built-in ACP Registry browser for one-click agent installation
- Full support for all ACP features (fs, terminal, permissions, modes, plans, diffs)
- Extension system for packaging custom ACP agents
- Native agent integration alongside ACP (uses language models directly)

### JetBrains IDEs

Plugin available for IntelliJ IDEA, PyCharm, WebStorm, and other JetBrains products. Implements ACP client capabilities within the JetBrains platform.

### Neovim

Community plugin that implements ACP client in Lua. Supports agent spawning, session management, and terminal integration within Neovim's TUI.

### Emacs

Community plugin for Emacs users. Implements the ACP client protocol for Emacs interaction.

---

## SDKs

| Language   | Package                        | Purpose                        |
| ---------- | ------------------------------ | ------------------------------ |
| Rust       | `agent-client-protocol-schema` | Official SDK, used by Zed      |
| TypeScript | Available                      | For building agents in Node.js |
| Python     | Available                      | For building agents in Python  |
| Kotlin     | Available                      | For building agents in JVM     |

---

## Distribution Channels

### ACP Registry (Preferred)

- Central catalog at `cdn.agentclientprotocol.com`
- Agents discovered automatically by editors
- Supports binary, npx, and uvx distribution
- Auto-updated hourly from npm, PyPI, GitHub Releases

### Zed Extensions

- Packaging via `extension.toml`
- Binary distribution only
- Manual version bumps required
- Best for custom/internal agents

### Direct Binary

- User configures agent binary path manually
- No auto-update
- Maximum flexibility for custom setups

---

## Community and Governance

### Open Standard

- Created by Zed Industries
- Apache 2.0 license
- Open governance with multi-vendor participation
- Contributions accepted via GitHub

### Key Repositories

| Repository                                  | Purpose                                   |
| ------------------------------------------- | ----------------------------------------- |
| `agentclientprotocol/agent-client-protocol` | Protocol specification and SDKs           |
| `agentclientprotocol/registry`              | Agent registry and agent.json definitions |
| `zed-industries/zed`                        | Reference client implementation           |
| `zed-industries/claude-agent-acp`           | Claude agent ACP wrapper                  |

### Relationship to MCP

ACP and MCP are complementary standards:

| Aspect     | MCP                      | ACP                            |
| ---------- | ------------------------ | ------------------------------ |
| Purpose    | Connect AI to tools/data | Connect editors to agents      |
| Direction  | Model -> Server (tools)  | Editor -> Agent (subprocess)   |
| Transport  | stdio, HTTP+SSE          | stdio (primary)                |
| Governance | Anthropic                | Zed Industries                 |
| Scope      | General-purpose tool use | Editor-specific agentic coding |

ACP agents can consume MCP servers — the editor passes MCP configurations to agents, and can expose its own tools via MCP stdio proxy. This makes ACP a higher-level protocol that subsumes MCP for editor-agent interactions.
