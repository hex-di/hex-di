# Zed ACP — Registry

**Source:** https://github.com/agentclientprotocol/registry, https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json
**Captured:** 2026-02-28

---

## What the Registry Is

The ACP Registry is a central catalog of agents that implement the Agent Client Protocol. Editors query the registry to discover, install, and update agents.

### Locations

| Resource          | URL                                                                    |
| ----------------- | ---------------------------------------------------------------------- |
| GitHub repository | `github.com/agentclientprotocol/registry`                              |
| CDN endpoint      | `https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json` |

---

## registry.json Schema

```json
{
  "$id": "https://cdn.agentclientprotocol.com/registry/v1/latest/registry.schema.json",
  "version": "1.0.0",
  "agents": [ ... ]
}
```

| Field     | Type     | Description                           |
| --------- | -------- | ------------------------------------- |
| `version` | `string` | Semver version of the registry format |
| `agents`  | `array`  | Array of agent entries                |

---

## agent.json Schema

Each agent is defined by an `agent.json` file in the registry:

| Field          | Type            | Required | Constraints                             |
| -------------- | --------------- | -------- | --------------------------------------- |
| `id`           | `string`        | Yes      | Pattern: `^[a-z][a-z0-9-]*$`            |
| `name`         | `string`        | Yes      | minLength: 1                            |
| `version`      | `string`        | Yes      | Semver: `^[0-9]+\.[0-9]+\.[0-9]+`       |
| `description`  | `string`        | Yes      | minLength: 1                            |
| `repository`   | `string`        | No       | URI format                              |
| `authors`      | `array[string]` | No       |                                         |
| `license`      | `string`        | No       | SPDX identifier or `'proprietary'`      |
| `icon`         | `string`        | No       | Inline SVG, 16x16, uses `currentColor`  |
| `distribution` | `object`        | Yes      | At least one of: `binary`, `npx`, `uvx` |

---

## Distribution Types

### Binary

Platform-specific executables. Each platform target provides an archive URL and executable path:

```json
{
  "binary": {
    "darwin-aarch64": {
      "archive": "https://example.com/agent-darwin-arm64.tar.gz",
      "cmd": "./my-agent",
      "args": [],
      "env": {}
    },
    "darwin-x86_64":   { ... },
    "linux-aarch64":   { ... },
    "linux-x86_64":    { ... },
    "windows-aarch64": { ... },
    "windows-x86_64":  { ... }
  }
}
```

**Platform targets**: `{os}-{arch}` where OS is `darwin`/`linux`/`windows` and arch is `aarch64`/`x86_64`.

**Supported archive formats**: `.zip`, `.tar.gz`, `.tgz`, `.tar.bz2`, `.tbz2`, or raw binaries.

### NPX (Node.js)

```json
{
  "npx": {
    "package": "@scope/package-name@version",
    "args": [],
    "env": {}
  }
}
```

### UVX (Python)

```json
{
  "uvx": {
    "package": "package-name",
    "args": [],
    "env": {}
  }
}
```

---

## Registered Agents

As of 2026-02-28, 20+ agents are registered:

| ID               | Name           | Distribution | Authors      |
| ---------------- | -------------- | ------------ | ------------ |
| `claude-acp`     | Claude Agent   | npx          | Anthropic    |
| `gemini`         | Gemini CLI     | npx          | Google       |
| `github-copilot` | GitHub Copilot | binary       | GitHub       |
| `goose`          | Goose          | binary       | Block        |
| `codex-acp`      | Codex          | npx          | OpenAI       |
| `auggie`         | Auggie         | binary       | Augment Code |
| `opencode`       | OpenCode       | binary       | OpenCode     |
| `cline`          | Cline          | —            | —            |
| `junie`          | Junie          | —            | JetBrains    |
| `kilo`           | Kilo           | —            | —            |
| `kimi`           | Kimi           | —            | Moonshot AI  |
| `stakpak`        | Stakpak        | —            | Stakpak      |
| `qwen-code`      | Qwen Code      | —            | Alibaba      |
| `mistral-vibe`   | Mistral Vibe   | —            | Mistral AI   |

### Example: Claude ACP agent.json

```json
{
  "id": "claude-acp",
  "name": "Claude Agent",
  "version": "0.19.2",
  "description": "ACP wrapper for Anthropic's Claude",
  "repository": "https://github.com/zed-industries/claude-agent-acp",
  "authors": ["Anthropic"],
  "license": "proprietary",
  "distribution": {
    "npx": {
      "package": "@zed-industries/claude-agent-acp@0.19.2"
    }
  }
}
```

---

## Authentication in Registry

Two patterns for agent authentication:

### Agent Auth

Agent manages OAuth flow independently:

1. Agent starts a local HTTP server
2. Opens browser for user authorization
3. Receives redirect with auth code
4. Exchanges code for token

### Terminal Auth

Interactive terminal-based setup. Custom `args` and `env` variables configure the terminal auth flow.

Environment variable auth is defined in the ACP spec but not yet supported by the registry.

---

## Auto-Updates

Registry versions are checked hourly from upstream package registries:

| Distribution | Update Source   |
| ------------ | --------------- |
| NPX          | npm registry    |
| UVX          | PyPI            |
| Binary       | GitHub Releases |
