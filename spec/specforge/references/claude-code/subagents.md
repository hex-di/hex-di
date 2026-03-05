# Claude Code — Subagents

**Source:** [Create Custom Subagents](https://code.claude.com/docs/en/sub-agents)
**Captured:** 2026-02-27

---

## What Subagents Are

Subagents are specialized AI assistants that run in their own context window with a custom system prompt, specific tool access, and independent permissions. When Claude encounters a matching task, it delegates to the subagent, which works independently and returns results.

---

## Built-in Subagents

| Subagent              | Model              | Tools                          | Purpose                                           |
| --------------------- | ------------------ | ------------------------------ | ------------------------------------------------- |
| **Explore**           | Haiku (fast)       | Read-only (denied Write, Edit) | File discovery, code search, codebase exploration |
| **Plan**              | Inherits from main | Read-only (denied Write, Edit) | Codebase research for planning                    |
| **General-purpose**   | Inherits from main | All tools                      | Complex research, multi-step operations           |
| **Bash**              | Inherits           | —                              | Running terminal commands in separate context     |
| **Claude Code Guide** | Haiku              | —                              | Questions about Claude Code features              |

---

## Custom Subagent Definition

Subagents are Markdown files with YAML frontmatter:

```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep
model: sonnet
---

You are a code reviewer. Analyze code and provide actionable feedback.
```

### Frontmatter Fields

| Field             | Required | Description                                                      |
| ----------------- | -------- | ---------------------------------------------------------------- |
| `name`            | Yes      | Unique identifier (lowercase, hyphens)                           |
| `description`     | Yes      | When Claude should delegate to this subagent                     |
| `tools`           | No       | Tools the subagent can use (inherits all if omitted)             |
| `disallowedTools` | No       | Tools to deny                                                    |
| `model`           | No       | `sonnet`, `opus`, `haiku`, or `inherit` (default: `inherit`)     |
| `permissionMode`  | No       | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |
| `maxTurns`        | No       | Maximum agentic turns                                            |
| `skills`          | No       | Skills to preload into context at startup                        |
| `mcpServers`      | No       | MCP servers available to this subagent                           |
| `hooks`           | No       | Lifecycle hooks scoped to this subagent                          |
| `memory`          | No       | Persistent memory scope: `user`, `project`, `local`              |
| `background`      | No       | `true` to always run as background task (default: `false`)       |
| `isolation`       | No       | `worktree` for isolated git worktree                             |

---

## Scopes (Priority Order)

| Location                   | Scope                   | Priority    |
| -------------------------- | ----------------------- | ----------- |
| `--agents` CLI flag        | Current session only    | 1 (highest) |
| `.claude/agents/`          | Current project         | 2           |
| `~/.claude/agents/`        | All user projects       | 3           |
| Plugin `agents/` directory | Where plugin is enabled | 4 (lowest)  |

When multiple subagents share the same name, the higher-priority location wins.

---

## Programmatic Definition via `--agents`

```bash
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer",
    "prompt": "You are a senior code reviewer",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  },
  "debugger": {
    "description": "Debugging specialist",
    "prompt": "You are an expert debugger"
  }
}'
```

The `--agents` JSON accepts the same fields as file-based frontmatter. Use `prompt` for the system prompt (equivalent to the markdown body).

---

## Tool Restriction: `Task(agent_type)`

Control which subagents a main-thread agent can spawn:

```yaml
tools: Task(worker, researcher), Read, Bash
```

Allowlist — only `worker` and `researcher` can be spawned. Omitting `Task` entirely prevents spawning any subagents.

---

## Foreground vs Background

- **Foreground** — blocks main conversation until complete; permission prompts pass through
- **Background** — runs concurrently; pre-approves needed permissions at launch; auto-denies anything not pre-approved

Press **Ctrl+B** to background a running task.

---

## Subagent Constraints

- Subagents **cannot spawn other subagents** (no nesting)
- Subagents receive **only their system prompt** plus basic environment details, not the full Claude Code system prompt
- Each invocation creates a **fresh context** (unless resumed via agent ID)
- Subagent transcripts persist at `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl`

---

## SpecForge Relevance

SpecForge defines each agent role as a Claude Code subagent:

- **Discovery agent** → read-only tools, inherit model
- **Spec author** → Read, Write, Edit, Bash, full access
- **Reviewer** → Read, Glob, Grep, read-only
- **Dev agent** → Read, Write, Edit, Bash, full access

Subagent definitions are passed via `--agents` JSON at spawn time. See [BEH-SF-159](../../behaviors/BEH-SF-151-claude-code-adapter.md).
