# Claude Code — Overview

**Source:** [How Claude Code Works](https://code.claude.com/docs/en/how-claude-code-works)
**Captured:** 2026-02-27

---

## What Claude Code Is

Claude Code is an agentic assistant that runs in the terminal. It is the default LLM provider for SpecForge via the `ClaudeCodeAdapter`.

---

## The Agentic Loop

Claude Code works through three phases that blend together:

1. **Gather context** — search files, read code, explore the codebase
2. **Take action** — edit files, run commands, create artifacts
3. **Verify results** — run tests, check output, confirm changes

The loop adapts to the task. A question may only need context gathering. A bug fix cycles through all three phases repeatedly. Claude decides what each step requires based on what it learned from the previous step, chaining dozens of actions together.

Users can interrupt at any point to steer direction, provide context, or request a different approach.

---

## Built-in Tool Categories

| Category              | Capabilities                                                                      |
| --------------------- | --------------------------------------------------------------------------------- |
| **File operations**   | Read files, edit code, create new files, rename and reorganize                    |
| **Search**            | Find files by pattern, search content with regex, explore codebases               |
| **Execution**         | Run shell commands, start servers, run tests, use git                             |
| **Web**               | Search the web, fetch documentation, look up error messages                       |
| **Code intelligence** | Type errors/warnings after edits, go to definition, find references (via plugins) |

Claude also has tools for spawning subagents, asking questions, and orchestration tasks.

---

## Session Model

- **Sessions are independent** — each new session starts with a fresh context window without prior conversation history
- **Sessions are resumable** — `claude --continue` or `claude --resume <id>` restores conversation history
- **Sessions are forkable** — `--fork-session` creates a new session ID while preserving history up to that point
- **Sessions are directory-scoped** — tied to the working directory; switching branches shows new files but keeps conversation
- **Parallel sessions** — use git worktrees for separate directories per branch

---

## Context Window Management

Claude's context window holds conversation history, file contents, command outputs, CLAUDE.md, loaded skills, and system instructions.

### Auto-Compaction

When context fills up, Claude Code manages it automatically:

1. Clears older tool outputs first
2. Summarizes the conversation if needed
3. Preserves user requests and key code snippets

Early instructions may be lost during compaction — persistent rules belong in CLAUDE.md.

### Context Monitoring

- `/context` — see what is using space
- `/compact [focus]` — manually trigger compaction with optional focus directive
- "Compact Instructions" section in CLAUDE.md controls what is preserved during compaction

---

## Checkpoints and Safety

- **Every file edit is reversible** — before editing, Claude snapshots the current file contents
- **Esc twice** to rewind to a previous state
- Checkpoints are local to the session, separate from git
- Actions affecting remote systems (databases, APIs) cannot be checkpointed

---

## SpecForge Relevance

The agentic loop is the core abstraction that SpecForge wraps. The `ClaudeCodeAdapter`:

- Spawns Claude Code as a subprocess (each agent = one process)
- Configures the agentic loop via system prompt, tool scoping, and model selection
- Tracks token usage through streaming output
- Manages session lifecycle (create, resume, fork, dispose)

See [ADR-004](../../decisions/ADR-004-claude-code-sdk.md) for the architectural decision.
