# Claude Code — Settings

**Source:** [Settings](https://code.claude.com/docs/en/settings)
**Captured:** 2026-02-27

---

## Settings Hierarchy (Precedence Order)

From highest to lowest priority:

| Priority | Source           | Description                                                 |
| -------- | ---------------- | ----------------------------------------------------------- |
| 1        | **Managed**      | Server-managed, MDM/OS policies, or `managed-settings.json` |
| 2        | **Command Line** | Temporary session overrides via flags                       |
| 3        | **Local**        | `.claude/settings.local.json` (gitignored)                  |
| 4        | **Project**      | `.claude/settings.json` (committed to git)                  |
| 5        | **User**         | `~/.claude/settings.json` (personal)                        |

---

## File Locations

| Feature     | User                      | Project                           | Local                          |
| ----------- | ------------------------- | --------------------------------- | ------------------------------ |
| Settings    | `~/.claude/settings.json` | `.claude/settings.json`           | `.claude/settings.local.json`  |
| Subagents   | `~/.claude/agents/`       | `.claude/agents/`                 | —                              |
| MCP Servers | `~/.claude.json`          | `.mcp.json`                       | `~/.claude.json` (per-project) |
| Memory      | `~/.claude/CLAUDE.md`     | `CLAUDE.md` / `.claude/CLAUDE.md` | `CLAUDE.local.md`              |

Managed settings locations:

- **macOS:** `/Library/Application Support/ClaudeCode/managed-settings.json`
- **Linux/WSL:** `/etc/claude-code/managed-settings.json`

---

## Key Settings

### Model & Inference

| Setting                 | Purpose                             |
| ----------------------- | ----------------------------------- |
| `model`                 | Default model for Claude Code       |
| `availableModels`       | Restrict model selection (managed)  |
| `alwaysThinkingEnabled` | Enable extended thinking by default |

### Permissions

| Setting                             | Purpose                              |
| ----------------------------------- | ------------------------------------ |
| `permissions.allow`                 | Permit tool use without confirmation |
| `permissions.ask`                   | Request confirmation before tool use |
| `permissions.deny`                  | Block tool use entirely              |
| `permissions.additionalDirectories` | Grant access to working directories  |
| `permissions.defaultMode`           | Default permission mode              |
| `disableBypassPermissionsMode`      | Prevent bypassing permission checks  |

### Hooks

| Setting                 | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| `hooks`                 | Lifecycle event scripts (see [hooks.md](./hooks.md)) |
| `disableAllHooks`       | Disable all hooks and status line                    |
| `allowManagedHooksOnly` | Only allow managed/SDK hooks                         |

### Sandbox

| Setting                            | Purpose                          |
| ---------------------------------- | -------------------------------- |
| `sandbox.enabled`                  | Enable bash sandboxing           |
| `sandbox.autoAllowBashIfSandboxed` | Auto-approve bash when sandboxed |
| `sandbox.network.allowedDomains`   | Allowed outbound domains         |

### Environment

| Setting        | Purpose                                 |
| -------------- | --------------------------------------- |
| `env`          | Environment variables for every session |
| `apiKeyHelper` | Custom script to generate auth values   |

---

## Environment Variables (Key Subset)

### Authentication

| Variable               | Purpose                     |
| ---------------------- | --------------------------- |
| `ANTHROPIC_API_KEY`    | API key                     |
| `ANTHROPIC_AUTH_TOKEN` | Custom Authorization header |

### Model Configuration

| Variable                         | Purpose                                        |
| -------------------------------- | ---------------------------------------------- |
| `ANTHROPIC_MODEL`                | Model to use                                   |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL`  | Override Haiku model                           |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Override Sonnet model                          |
| `ANTHROPIC_DEFAULT_OPUS_MODEL`   | Override Opus model                            |
| `CLAUDE_CODE_EFFORT_LEVEL`       | Reasoning effort: `low`, `medium`, `high`      |
| `MAX_THINKING_TOKENS`            | Extended thinking budget (default: 31999)      |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS`  | Max output tokens (default: 32000, max: 64000) |
| `CLAUDE_CODE_SUBAGENT_MODEL`     | Model for subagents                            |
| `CLAUDE_CODE_DISABLE_1M_CONTEXT` | Disable 1M context window                      |

### Bash & Execution

| Variable                  | Purpose                    |
| ------------------------- | -------------------------- |
| `BASH_DEFAULT_TIMEOUT_MS` | Default bash timeout       |
| `BASH_MAX_TIMEOUT_MS`     | Maximum bash timeout       |
| `BASH_MAX_OUTPUT_LENGTH`  | Max bash output characters |

### Features

| Variable                               | Purpose                   |
| -------------------------------------- | ------------------------- |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | Enable agent teams        |
| `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` | Disable background tasks  |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`      | Auto-compaction trigger % |

### Caching

| Variable                 | Purpose                    |
| ------------------------ | -------------------------- |
| `DISABLE_PROMPT_CACHING` | Disable all prompt caching |

---

## SpecForge Integration

SpecForge injects settings via:

1. **`--settings` flag** — path to a JSON file with role-specific configuration
2. **`--setting-sources` flag** — control which setting sources to load
3. **`env` block** — environment variables for model overrides, budget caps
4. **`permissions` block** — tool scoping per role

See [BEH-SF-152](../../behaviors/BEH-SF-151-claude-code-adapter.md) (tool scoping) and [BEH-SF-158](../../behaviors/BEH-SF-151-claude-code-adapter.md) (hook integration).
