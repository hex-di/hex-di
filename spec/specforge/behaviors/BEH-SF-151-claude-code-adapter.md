---
id: BEH-SF-151
kind: behavior
title: Behavior 22 — ClaudeCodeAdapter
status: deprecated
id_range: "151--160"
invariants: [INV-SF-5]
adrs: [ADR-018]
types: [ports]
ports: [AgentBackendPort]
---

# Behavior 22 — ClaudeCodeAdapter

> **Superseded:** This file is superseded by [33-agent-backend.md](./BEH-SF-239-agent-backend.md). Retained for historical reference.

The `ClaudeCodeAdapter` has been refactored into the `ClaudeCodeBackend` — the default implementation of `AgentBackendService` behind the ACP protocol layer. The behaviors below are retained for historical reference with mapping to their ACP replacements.

**Behavior Mapping:**

- BEH-SF-151 (Agent Spawning) → BEH-SF-240 (Backend Execution)
- BEH-SF-152 (Tool Scoping) → BEH-SF-243 (Backend Tool Scoping)
- BEH-SF-153 (Session Resume) → BEH-SF-242 (Backend Session Continuity)
- BEH-SF-154 (Disposal) → BEH-SF-248 (Backend Disposal)
- BEH-SF-155 (Token Tracking) → BEH-SF-246 (Backend Token Tracking)
- BEH-SF-156 (Model Mapping) → BEH-SF-240 (Backend Execution — model passed via config)
- BEH-SF-157 (System Prompt) → BEH-SF-240 (Backend Execution — prompt composed at ACP layer)
- BEH-SF-158 (Hook Integration) → BEH-SF-247 (Backend Hook Integration)
- BEH-SF-159 (Subagent Definitions) → BEH-SF-211 (Agent Handler Registration via ACP)
- BEH-SF-160 (Error Mapping) → BEH-SF-245 (Backend Error Mapping)

**Related:**

- [ADR-018](../decisions/ADR-018-acp-agent-protocol.md) — ACP as Primary Agent Protocol
- [behaviors/BEH-SF-239-agent-backend.md](./BEH-SF-239-agent-backend.md) — Replacement behaviors
- [references/claude-code/](../references/claude-code/) — Full reference documentation
- [types/ports.md](../types/ports.md) — AgentBackendService, ClaudeCodeBackendConfig

## BEH-SF-151: Agent Spawning via query()

**Given** SpecForge needs to spawn a new agent
**When** `LLMProviderService.spawnAgent(config)` is called
**Then** the adapter:

1. Composes a system prompt from: role definition + flow-specific instructions + composed context chunks + ACP session summary
2. Builds CLI arguments from `AgentSpawnConfig`:
   - `claude -p` with `--output-format stream-json`
   - `--system-prompt <composed>` or `--append-system-prompt <flow-instructions>`
   - `--allowedTools <tools>` per role
   - `--model <model>` per selection
   - `--max-turns <n>` if bounded
   - `--max-budget-usd <n>` if budget-constrained
   - `--permission-mode dontAsk` (default for non-interactive)
   - `--session-id <uuid>` for deterministic session management
3. Spawns a child process executing the assembled command
4. Returns an `AgentHandle` wrapping the process and its stream-json output iterator

**Error:** Process spawn failure → `ProcessCrashError`

### Contract

REQUIREMENT (BEH-SF-151): The adapter must compose a system prompt, build CLI arguments from AgentSpawnConfig, spawn a child process, and return an AgentHandle wrapping the process and its stream-json output iterator.

### Verification

- Unit test: verify the behavior described above functions correctly.

---

## BEH-SF-152: Tool Scoping per Role

**Given** each agent role has a specific capability profile
**When** the adapter builds CLI arguments for `spawnAgent()`
**Then** `--allowedTools` is set based on the role:

| Role        | Allowed Tools                                   |
| ----------- | ----------------------------------------------- |
| Discovery   | `Read`, `Glob`, `Grep`, `WebSearch`, `WebFetch` |
| Spec Author | `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep` |
| Dev Agent   | `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep` |
| Reviewer    | `Read`, `Glob`, `Grep`                          |
| Planner     | `Read`, `Glob`, `Grep`, `Bash`                  |

`--disallowedTools` may additionally be set to explicitly remove tools from the model's context (e.g., `Task` to prevent subagent nesting).

Tool scoping is enforced at the Claude Code level — the adapter does not implement its own access control.

### Contract

REQUIREMENT (BEH-SF-152): The adapter must set `--allowedTools` based on the agent role's capability profile and may set `--disallowedTools` to explicitly remove tools from the model's context.

### Verification

- Unit test: verify the behavior described above functions correctly.

---

## BEH-SF-153: Session Resume and Fork

**Given** an existing `AgentHandle` with a session ID
**When** `AgentHandle.sendTask(task)` is called
**Then** the adapter:

1. Invokes `claude -p --resume <sessionId>` with the task as the prompt
2. The resumed session retains full conversation history from prior interactions
3. The new response streams via `--output-format stream-json`

**Given** a need to branch agent work
**When** the adapter receives a fork request
**Then** it invokes `claude -p --resume <sessionId> --fork-session`:

1. A new session ID is created
2. Conversation history up to the fork point is preserved
3. The original session remains unchanged

### Contract

REQUIREMENT (BEH-SF-153): The adapter must support resuming an existing session via `--resume <sessionId>` and forking a session via `--fork-session`, preserving conversation history in both cases.

### Verification

- Unit test: verify the behavior described above functions correctly.

---

## BEH-SF-154: Session Disposal

**Given** an active `AgentHandle`
**When** `AgentHandle.dispose()` is called
**Then** the adapter:

1. Sends SIGTERM to the child process
2. Waits for graceful shutdown (configurable timeout)
3. If the process does not exit, sends SIGKILL
4. Releases all resources (stream iterator, event listeners)

Disposal is idempotent — calling `dispose()` on an already-disposed handle is a no-op.

### Contract

REQUIREMENT (BEH-SF-154): The adapter must dispose of an active AgentHandle by sending SIGTERM, waiting for graceful shutdown, escalating to SIGKILL if needed, and releasing all resources idempotently.

### Verification

- Unit test: verify the behavior described above functions correctly.

---

## BEH-SF-155: Token Tracking from Stream

**Given** an active agent session with `--output-format stream-json`
**When** stream-json events are received
**Then** the adapter:

1. Parses each newline-delimited JSON event
2. Extracts token usage metadata (`inputTokens`, `outputTokens`) from message events
3. Aggregates per-session totals in a `TokenUsage` accumulator
4. Reports cumulative usage on each `sendTask()` completion

**When** the session completes (via JSON output format)
**Then** the final JSON object's `usage` field provides authoritative session totals.

### Contract

REQUIREMENT (BEH-SF-155): The adapter must parse stream-json events to extract token usage metadata, aggregate per-session totals, and report cumulative usage on each sendTask() completion.

### Verification

- Unit test: verify the behavior described above functions correctly.

---

## BEH-SF-156: Model Selection Mapping

**Given** a `ModelSelection` value from the flow configuration
**When** the adapter builds CLI arguments
**Then** model aliases are mapped:

| SpecForge `ModelSelection` | `--model` value |
| -------------------------- | --------------- |
| `"opus"`                   | `opus`          |
| `"sonnet"`                 | `sonnet`        |
| `"haiku"`                  | `haiku`         |

**Given** a `sendTask()` call with a model override
**When** the override differs from the session's initial model
**Then** the adapter passes `--model <override>` on the resumed session.

Model aliases resolve to the latest version via Claude Code's alias system (currently Opus 4.6, Sonnet 4.6, Haiku 4.5). Pinning to specific versions is done via environment variables (`ANTHROPIC_DEFAULT_OPUS_MODEL`, etc.) at deployment time.

### Contract

REQUIREMENT (BEH-SF-156): The adapter must map ModelSelection values to `--model` CLI arguments and support per-task model overrides on resumed sessions.

### Verification

- Unit test: verify the behavior described above functions correctly.

---

## BEH-SF-157: System Prompt Composition

**Given** a `spawnAgent()` call with role configuration
**When** the adapter composes the system prompt
**Then** the prompt is assembled from four layers:

1. **Role definition** — core identity and behavioral constraints for the agent role
2. **Flow-specific instructions** — what the current flow step expects the agent to accomplish
3. **Composed context chunks** — relevant context from the ACP session (gathered artifacts, prior results)
4. **ACP session summary** — current state of shared data accessible to the flow

The assembled prompt is passed via `--system-prompt` (full replacement) when the role requires complete control, or `--append-system-prompt` (append to defaults) when the role benefits from Claude Code's built-in capabilities.

### Contract

REQUIREMENT (BEH-SF-157): The adapter must compose the system prompt from four layers (role definition, flow-specific instructions, composed context chunks, ACP session summary) and pass it via `--system-prompt` or `--append-system-prompt` based on role requirements.

### Verification

- Unit test: verify the behavior described above functions correctly.

---

## BEH-SF-158: Hook Integration

**Given** a need to observe agent lifecycle events
**When** the adapter configures hooks
**Then** it registers hooks via settings injection (`--settings` flag):

| Hook Event      | Purpose                                                |
| --------------- | ------------------------------------------------------ |
| `PreToolUse`    | Additional tool access control beyond `--allowedTools` |
| `PostToolUse`   | Capture tool results for orchestrator events           |
| `Stop`          | Detect session completion for flow coordination        |
| `SubagentStart` | Track when Claude Code spawns internal subagents       |
| `SubagentStop`  | Track when internal subagents complete                 |

Hook commands write structured JSON to stdout, which the adapter captures alongside the stream-json output to emit orchestrator-level events.

### Contract

REQUIREMENT (BEH-SF-158): The adapter must register lifecycle hooks (PreToolUse, PostToolUse, Stop, SubagentStart, SubagentStop) via settings injection and capture their structured JSON output to emit orchestrator-level events.

### Verification

- Unit test: verify the behavior described above functions correctly.

---

## BEH-SF-159: Subagent Definitions for Roles

**Given** SpecForge agent roles need to be defined as Claude Code subagents
**When** the adapter builds the `--agents` JSON flag
**Then** each role maps to a subagent definition:

```json
{
  "discovery": {
    "description": "Explores codebases, finds files, reads documentation",
    "prompt": "<composed system prompt>",
    "tools": ["Read", "Glob", "Grep", "WebSearch", "WebFetch"],
    "model": "haiku"
  },
  "spec-author": {
    "description": "Writes specification documents and creates artifacts",
    "prompt": "<composed system prompt>",
    "tools": ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    "model": "inherit"
  }
}
```

Fields populated from `ClaudeAgentSpawnConfig`:

- `description` — from role metadata
- `prompt` — from system prompt composition (BEH-SF-157)
- `tools` — from tool scoping (BEH-SF-152)
- `model` — from model selection (BEH-SF-156)
- `maxTurns` — from agent configuration
- `hooks` — from hook integration (BEH-SF-158)

### Contract

REQUIREMENT (BEH-SF-159): The adapter must map each SpecForge agent role to a Claude Code subagent definition in the `--agents` JSON flag, populating description, prompt, tools, model, maxTurns, and hooks from the role configuration.

### Verification

- Unit test: verify the behavior described above functions correctly.

---

## BEH-SF-160: Error Mapping

**Given** Claude Code produces an error during agent execution
**When** the adapter receives the error (via stream-json event, process exit code, or stderr)
**Then** errors are mapped to SpecForge `LLMError` variants:

| Claude Code Error             | SpecForge Error          | Detection                                              |
| ----------------------------- | ------------------------ | ------------------------------------------------------ |
| Rate limit (429)              | `RateLimitError`         | Stream event with `type: "error"` + rate limit message |
| Context overflow              | `ContextOverflowError`   | Stream event indicating context limit reached          |
| Budget exceeded               | `BudgetExceededError`    | Stream event or process exit after `--max-budget-usd`  |
| Process crash (non-zero exit) | `ProcessCrashError`      | Child process exits with non-zero code                 |
| Authentication failure        | `AuthenticationError`    | Stream event with auth error message                   |
| Invalid model                 | `ModelNotAvailableError` | Stream event with model not found message              |

All errors are frozen (`Object.freeze()`) and carry a unique `_tag` for discriminated union matching.

Transient errors (rate limits) are eligible for retry by the orchestrator. Fatal errors (auth, model) are not.

### Contract

REQUIREMENT (BEH-SF-160): The adapter must map Claude Code errors (rate limit, context overflow, budget exceeded, process crash, authentication failure, invalid model) to frozen SpecForge LLMError variants with unique `_tag` fields for discriminated union matching.

### Verification

- Unit test: verify the behavior described above functions correctly.
