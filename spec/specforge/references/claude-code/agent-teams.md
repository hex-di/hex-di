# Claude Code — Agent Teams

**Source:** [Orchestrate Teams](https://code.claude.com/docs/en/agent-teams)
**Captured:** 2026-02-27

**Status:** Experimental — disabled by default, enable with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.

---

## Architecture

| Component     | Role                                                                   |
| ------------- | ---------------------------------------------------------------------- |
| **Team lead** | Main session that creates the team, spawns teammates, coordinates work |
| **Teammates** | Separate Claude Code instances that work on assigned tasks             |
| **Task list** | Shared list of work items that teammates claim and complete            |
| **Mailbox**   | Messaging system for inter-agent communication                         |

---

## Display Modes

| Mode             | Description                                         | Requirement    |
| ---------------- | --------------------------------------------------- | -------------- |
| `in-process`     | All teammates in main terminal; Shift+Down to cycle | Any terminal   |
| `tmux` / iTerm2  | Each teammate gets own split pane                   | tmux or iTerm2 |
| `auto` (default) | Split panes if in tmux, otherwise in-process        | —              |

Set via `teammateMode` in settings or `--teammate-mode` flag.

---

## Communication

- **Direct messaging** — send to a specific teammate
- **Broadcast** — send to all teammates (use sparingly, costs scale with team size)
- **Automatic delivery** — messages delivered automatically to recipients
- **Idle notifications** — teammates notify lead when they finish and stop

---

## Task Coordination

- Shared task list with states: pending, in progress, completed
- Tasks can have dependencies — blocked tasks can't be claimed until dependencies complete
- **Lead assigns** tasks explicitly or **teammates self-claim** available work
- File locking prevents race conditions on simultaneous claims
- Teams and tasks stored locally at `~/.claude/teams/{team-name}/` and `~/.claude/tasks/{team-name}/`

---

## Plan Approval

Teammates can be required to plan before implementing:

1. Teammate works in read-only plan mode
2. Sends plan approval request to lead
3. Lead reviews and approves or rejects with feedback
4. On approval, teammate exits plan mode and implements

---

## Comparison with Subagents

|                   | Subagents                            | Agent Teams                                 |
| ----------------- | ------------------------------------ | ------------------------------------------- |
| **Context**       | Own window; results return to caller | Own window; fully independent               |
| **Communication** | Report back to main agent only       | Direct messaging between teammates          |
| **Coordination**  | Main agent manages all work          | Shared task list with self-coordination     |
| **Best for**      | Focused tasks, result summaries      | Complex work requiring collaboration        |
| **Token cost**    | Lower                                | Higher (~7x standard sessions in plan mode) |

---

## Limitations

- No session resumption with in-process teammates
- Task status can lag (teammates may not mark tasks complete)
- One team per session
- No nested teams (teammates can't spawn teams)
- Lead is fixed for team lifetime
- Permissions set at spawn (all teammates inherit lead's mode)
- Split panes require tmux or iTerm2

---

## SpecForge Relevance

Agent teams are a future consideration for SpecForge's multi-agent orchestration. Currently, SpecForge uses the subagent model (individual `claude -p` processes) rather than agent teams. The experimental status and limitations make agent teams unsuitable for production use at this time.

Key difference: SpecForge's orchestrator handles task coordination and inter-agent communication via ACP message exchange, replacing the need for agent teams' built-in task list and mailbox.
