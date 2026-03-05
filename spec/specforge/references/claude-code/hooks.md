# Claude Code — Hooks

**Source:** [Hooks Reference](https://code.claude.com/docs/en/hooks), [Hooks Guide](https://code.claude.com/docs/en/hooks-guide)
**Captured:** 2026-02-27

---

## What Hooks Are

Hooks are user-defined shell commands or LLM prompts that execute automatically at specific points in Claude Code's lifecycle. They enable workflow automation, permission control, and event capture.

---

## Hook Events

| Event           | Matcher Input   | When It Fires                       | Frequency               |
| --------------- | --------------- | ----------------------------------- | ----------------------- |
| `PreToolUse`    | Tool name       | Before a tool is used               | Per tool call           |
| `PostToolUse`   | Tool name       | After a tool completes              | Per tool call           |
| `Stop`          | (none)          | When Claude finishes responding     | Per response            |
| `Notification`  | (none)          | When Claude sends a notification    | Per notification        |
| `SessionStart`  | (none)          | When a session begins               | Once per session        |
| `SessionEnd`    | (none)          | When a session ends                 | Once per session        |
| `SubagentStart` | Agent type name | When a subagent begins              | Per subagent spawn      |
| `SubagentStop`  | Agent type name | When a subagent completes           | Per subagent completion |
| `TeammateIdle`  | (none)          | When a teammate is about to go idle | Per teammate            |
| `TaskCompleted` | (none)          | When a task is marked complete      | Per task completion     |

---

## Hook Configuration

Hooks are configured in settings.json files (user, project, or local):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "./scripts/validate-command.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "./scripts/run-linter.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "./scripts/on-complete.sh"
          }
        ]
      }
    ]
  }
}
```

---

## Matcher Syntax

- **No matcher** — hook fires for all instances of the event
- **Tool name** — exact match: `"Bash"`, `"Edit"`, `"Read"`
- **Pipe-separated** — match multiple: `"Edit|Write"`
- **For subagent events** — matcher is the agent type name: `"db-agent"`

---

## Hook Input (stdin JSON)

### PreToolUse Input

```json
{
  "session_id": "...",
  "tool_name": "Bash",
  "tool_input": {
    "command": "npm test"
  }
}
```

### PostToolUse Input

```json
{
  "session_id": "...",
  "tool_name": "Bash",
  "tool_input": {
    "command": "npm test"
  },
  "tool_output": "..."
}
```

---

## Hook Output (Exit Codes)

| Exit Code | Meaning                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------ |
| **0**     | Success, continue normally                                                                             |
| **1**     | Error, but continue (logged)                                                                           |
| **2**     | **Block the operation** — for PreToolUse, denies the tool call; for TaskCompleted, prevents completion |

### Exit Code 2 — Permission Decisions

For `PreToolUse` hooks, exit code 2 blocks the tool call. The stderr output is fed back to Claude as the reason.

### Hook-Specific Output (stdout JSON)

PreToolUse hooks can return structured output to modify behavior:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "updatedInput": {
      "command": "modified-command"
    }
  }
}
```

Permission decisions: `"allow"`, `"deny"`, `"ask"`.

---

## Subagent-Scoped Hooks

Hooks defined in subagent frontmatter only run while that subagent is active:

```yaml
---
name: code-reviewer
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-command.sh"
---
```

`Stop` hooks in frontmatter are automatically converted to `SubagentStop` events.

---

## SDK vs File-Based Hooks

- **File-based** — configured in settings.json, used by CLI
- **SDK** — passed programmatically via the TypeScript/Python Agent SDK

SpecForge uses file-based hooks via settings injection (the `--settings` flag or `settingSources`).

---

## SpecForge Relevance

SpecForge uses hooks for:

- **PreToolUse** — tool access control per agent role (beyond `--allowedTools`)
- **PostToolUse** — capture tool results for token tracking and orchestrator events
- **Stop** — detect session completion for flow coordination
- **SubagentStart/SubagentStop** — track agent lifecycle events

See [BEH-SF-158](../../behaviors/BEH-SF-151-claude-code-adapter.md).
