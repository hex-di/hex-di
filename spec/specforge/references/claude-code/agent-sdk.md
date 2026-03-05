# Claude Code — Agent SDK

**Source:** [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview), [Headless Usage](https://code.claude.com/docs/en/headless)
**Captured:** 2026-02-27

---

## Package

The Claude Agent SDK provides programmatic access to Claude Code's agentic loop.

- **TypeScript:** `@anthropic-ai/claude-agent-sdk`
- **Python:** `claude-agent-sdk`
- **CLI:** `claude -p` (print mode) — same capabilities, no SDK dependency

SpecForge uses the CLI print mode (`claude -p`) as the primary integration surface, keeping the dependency on a single binary rather than a library.

---

## Core API: `claude -p`

The `-p` (print) flag runs Claude Code non-interactively. All CLI flags work with `-p`.

```bash
# Basic query
claude -p "Find and fix the bug in auth.py" --allowedTools "Read,Edit,Bash"

# Structured JSON output
claude -p "Summarize this project" --output-format json

# Streaming output
claude -p "Explain recursion" --output-format stream-json --verbose

# Session resume
claude -p "Continue that review" --resume "$session_id"

# Custom system prompt
claude -p --append-system-prompt "You are a security engineer" "Review this PR"
```

---

## Key Options

| Option                     | Purpose                                   | SpecForge Usage                  |
| -------------------------- | ----------------------------------------- | -------------------------------- |
| `--allowedTools`           | Tools that execute without prompting      | Tool scoping per agent role      |
| `--disallowedTools`        | Tools removed from model context          | Block tools per role             |
| `--model`                  | Model alias or full name                  | Model selection per agent        |
| `--max-turns`              | Limit agentic turns                       | Bound agent iterations           |
| `--max-budget-usd`         | Dollar cap on API calls                   | Budget enforcement               |
| `--output-format`          | `text`, `json`, `stream-json`             | Token tracking via stream-json   |
| `--system-prompt`          | Replace entire system prompt              | Role-specific prompting          |
| `--append-system-prompt`   | Append to default prompt                  | Add flow instructions            |
| `--resume`                 | Resume session by ID                      | Session continuity               |
| `--fork-session`           | Fork from resumed session                 | Session branching                |
| `--permission-mode`        | `default`, `dontAsk`, `bypassPermissions` | Non-interactive execution        |
| `--agents`                 | Define subagents as JSON                  | Role definitions                 |
| `--mcp-config`             | Load MCP servers from JSON                | External tool integration        |
| `--add-dir`                | Additional working directories            | Multi-directory access           |
| `--worktree`               | Isolated git worktree                     | Process isolation                |
| `--json-schema`            | Structured output schema                  | Typed agent responses            |
| `--session-id`             | Specific session UUID                     | Deterministic session management |
| `--no-session-persistence` | Don't save session to disk                | Ephemeral sessions               |

---

## Output Formats

### JSON (`--output-format json`)

Single JSON object on completion:

```json
{
  "result": "...",
  "session_id": "...",
  "structured_output": { ... },
  "usage": { ... }
}
```

### Stream JSON (`--output-format stream-json`)

Newline-delimited JSON events in real time. Each line is a JSON object representing an event. Key event types:

- `text` — text content from the model
- `tool_use` — tool invocation
- `tool_result` — tool output
- `system` — system events (compaction, etc.)
- `error` — error events

Token usage is included in message metadata.

---

## Session Management

### Resume

```bash
session_id=$(claude -p "Start a review" --output-format json | jq -r '.session_id')
claude -p "Continue that review" --resume "$session_id"
```

### Fork

```bash
claude --resume abc123 --fork-session
```

Creates a new session ID preserving history up to that point. The original session remains unchanged.

### Continue

```bash
claude -p "Now focus on the database queries" --continue
```

Continues the most recent conversation in the current directory.

---

## Subagent Definitions via `--agents`

```bash
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer",
    "prompt": "You are a senior code reviewer",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  }
}'
```

Fields: `description` (required), `prompt` (required), `tools`, `disallowedTools`, `model`, `permissionMode`, `maxTurns`, `skills`, `mcpServers`, `hooks`, `memory`, `background`, `isolation`.

---

## Hooks (CLI-level)

Hooks are configured in settings.json, not via CLI flags. The CLI executes hooks based on the settings hierarchy. See [hooks.md](./hooks.md).

For the TypeScript/Python SDK, hooks can be passed programmatically. The CLI adapter uses file-based hooks via settings.

---

## MCP Server Integration

```bash
claude --mcp-config ./mcp.json
```

MCP servers provide additional tools and resources. Each server adds tool definitions to the context window.

---

## SpecForge Integration Points

| SpecForge Concept        | Agent SDK Mapping                             |
| ------------------------ | --------------------------------------------- |
| `spawnAgent()`           | `claude -p` with role-specific flags          |
| `AgentHandle.sendTask()` | `claude -p --resume <sessionId>`              |
| `AgentHandle.dispose()`  | Process termination                           |
| Tool scoping             | `--allowedTools`, `--disallowedTools`         |
| Model selection          | `--model`                                     |
| System prompt            | `--system-prompt` or `--append-system-prompt` |
| Token tracking           | `--output-format stream-json` event metadata  |
| Budget control           | `--max-budget-usd`                            |
| Session fork             | `--resume <id> --fork-session`                |

See [behaviors/BEH-SF-151-claude-code-adapter.md](../../behaviors/BEH-SF-151-claude-code-adapter.md) for full behavioral contracts.
