# Claude Code — CLI Reference

**Source:** [CLI Reference](https://code.claude.com/docs/en/cli-reference)
**Captured:** 2026-02-27

---

## Commands

| Command                         | Description                                                      |
| ------------------------------- | ---------------------------------------------------------------- |
| `claude`                        | Start interactive session                                        |
| `claude "query"`                | Start interactive session with initial prompt                    |
| `claude -p "query"`             | Print mode — query via SDK, then exit                            |
| `cat file \| claude -p "query"` | Process piped content                                            |
| `claude -c`                     | Continue most recent conversation in current directory           |
| `claude -c -p "query"`          | Continue via SDK (print mode)                                    |
| `claude -r "<session>" "query"` | Resume session by ID or name                                     |
| `claude update`                 | Update to latest version                                         |
| `claude auth login`             | Sign in (`--email`, `--sso` flags)                               |
| `claude auth logout`            | Log out                                                          |
| `claude auth status`            | Show authentication status as JSON (`--text` for human-readable) |
| `claude agents`                 | List all configured subagents grouped by source                  |
| `claude mcp`                    | Configure MCP servers                                            |
| `claude remote-control`         | Start a Remote Control session                                   |

---

## Flags

### Core Behavior

| Flag               | Description                                               |
| ------------------ | --------------------------------------------------------- |
| `--print`, `-p`    | Print response without interactive mode                   |
| `--model`          | Model alias (`sonnet`, `opus`, `haiku`) or full name      |
| `--output-format`  | `text`, `json`, `stream-json`                             |
| `--json-schema`    | Validated JSON output matching a JSON Schema (print mode) |
| `--max-turns`      | Limit agentic turns (print mode)                          |
| `--max-budget-usd` | Maximum dollar spend before stopping (print mode)         |
| `--verbose`        | Full turn-by-turn output                                  |

### System Prompt

| Flag                          | Behavior                          | Modes               |
| ----------------------------- | --------------------------------- | ------------------- |
| `--system-prompt`             | **Replace** entire default prompt | Interactive + Print |
| `--system-prompt-file`        | **Replace** with file contents    | Print only          |
| `--append-system-prompt`      | **Append** to default prompt      | Interactive + Print |
| `--append-system-prompt-file` | **Append** file contents          | Print only          |

### Permissions & Tools

| Flag                                   | Description                                                      |
| -------------------------------------- | ---------------------------------------------------------------- |
| `--permission-mode`                    | `default`, `acceptEdits`, `plan`, `dontAsk`, `bypassPermissions` |
| `--allowedTools`                       | Tools that execute without prompting                             |
| `--disallowedTools`                    | Tools removed from model context                                 |
| `--tools`                              | Restrict which built-in tools Claude can use                     |
| `--dangerously-skip-permissions`       | Skip all permission prompts                                      |
| `--allow-dangerously-skip-permissions` | Enable bypass as option without activating                       |

### Sessions

| Flag                       | Description                                        |
| -------------------------- | -------------------------------------------------- |
| `--continue`, `-c`         | Load most recent conversation in current directory |
| `--resume`, `-r`           | Resume session by ID or name                       |
| `--session-id`             | Use specific session UUID                          |
| `--fork-session`           | Create new session ID when resuming                |
| `--no-session-persistence` | Don't save session to disk (print mode)            |

### Agents & Extensions

| Flag                  | Description                              |
| --------------------- | ---------------------------------------- |
| `--agent`             | Specify an agent for the session         |
| `--agents`            | Define custom subagents via JSON         |
| `--mcp-config`        | Load MCP servers from JSON files         |
| `--strict-mcp-config` | Only use MCP servers from `--mcp-config` |
| `--add-dir`           | Additional working directories           |
| `--worktree`, `-w`    | Start in isolated git worktree           |
| `--plugin-dir`        | Load plugins from directories            |
| `--chrome`            | Enable Chrome browser integration        |

### Configuration

| Flag                | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `--settings`        | Path to settings JSON file or JSON string              |
| `--setting-sources` | Comma-separated list: `user`, `project`, `local`       |
| `--fallback-model`  | Fallback model when default is overloaded (print mode) |
| `--teammate-mode`   | Agent team display: `auto`, `in-process`, `tmux`       |
| `--debug`           | Enable debug mode with category filtering              |

### Other

| Flag                         | Description                                        |
| ---------------------------- | -------------------------------------------------- |
| `--version`, `-v`            | Output version number                              |
| `--init`                     | Run initialization hooks and start interactive     |
| `--init-only`                | Run initialization hooks and exit                  |
| `--maintenance`              | Run maintenance hooks and exit                     |
| `--input-format`             | Input format for print mode: `text`, `stream-json` |
| `--include-partial-messages` | Include partial streaming events                   |
| `--disable-slash-commands`   | Disable all skills and slash commands              |
| `--remote`                   | Create web session on claude.ai                    |
| `--teleport`                 | Resume web session in local terminal               |
| `--from-pr`                  | Resume sessions linked to a GitHub PR              |
| `--betas`                    | Beta headers for API requests                      |

---

## SpecForge Usage

SpecForge's `ClaudeCodeAdapter` primarily uses:

- `claude -p` with `--output-format stream-json` for all agent interactions
- `--allowedTools` / `--disallowedTools` for role-based tool scoping
- `--model` for model selection per agent
- `--system-prompt` or `--append-system-prompt` for role definition
- `--resume` / `--session-id` for session continuity
- `--max-turns` and `--max-budget-usd` for resource bounds
- `--permission-mode dontAsk` or `bypassPermissions` for non-interactive execution
- `--agents` for SpecForge role definitions as subagents
