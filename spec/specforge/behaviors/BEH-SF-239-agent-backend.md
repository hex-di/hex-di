---
id: BEH-SF-239
kind: behavior
title: Agent Backend
status: active
id_range: "239--248"
invariants: [INV-SF-18, INV-SF-2]
adrs: [ADR-018]
types: [acp, acp, ports, ports]
ports: [AgentBackendPort]
---

# 33 — Agent Backend

**ADR:** [ADR-018](../decisions/ADR-018-acp-agent-protocol.md) — ACP as Primary Agent Protocol
**Supersedes:** [behaviors/BEH-SF-151-claude-code-adapter.md](./BEH-SF-151-claude-code-adapter.md) (refactored)
**Architecture:** [architecture/c3-acp-layer.md](../architecture/c3-acp-layer.md)
**References:** [references/claude-code/](../references/claude-code/)

## BEH-SF-239: Claude Code Backend Registration — Default AgentBackendPort Implementation

The `ClaudeCodeBackend` is the default implementation of `AgentBackendService`, registered at startup.

### Contract

REQUIREMENT (BEH-SF-239): At startup, the system MUST register the `ClaudeCodeBackend` as the default `AgentBackendService` implementation. The backend MUST declare its capabilities via `getCapabilities()`: supported models (`opus`, `sonnet`, `haiku`), streaming support (`true`), persistent sessions (`true`). The backend MUST be replaceable with alternative implementations without affecting the ACP protocol layer.

### Verification

- Registration test: verify `ClaudeCodeBackend` is registered at startup.
- Capabilities test: verify `getCapabilities()` returns accurate capability information.
- Replacement test: register an alternative backend; verify the ACP layer uses it.

---

## BEH-SF-240: Backend Execution — Translate ACP Run to claude -p Invocation

The `ClaudeCodeBackend` translates an ACP run's execution config into a `claude -p` CLI invocation.

### Contract

REQUIREMENT (BEH-SF-240): When `AgentBackendService.execute(config)` is called, the `ClaudeCodeBackend` MUST: (a) compose a system prompt from the config's role, system prompt, and input messages, (b) build CLI arguments: `claude -p` with `--output-format stream-json`, `--model`, `--allowedTools`, `--max-turns`, `--permission-mode dontAsk`, (c) spawn a child process, (d) return an AsyncIterable of `ACPMessage` parsed from stream-json output. Process spawn failure MUST return a `BackendError`.

### Verification

- CLI args test: verify correct `claude -p` arguments are built from execution config.
- Spawn test: verify a child process is spawned.
- Output test: verify stream-json output is parsed into ACPMessages.
- Error test: simulate spawn failure; verify a `BackendError` is returned.

---

## BEH-SF-241: Backend Output Translation — stream-json to ACPMessages

The `ClaudeCodeBackend` translates Claude Code's `stream-json` output format into `ACPMessage` parts.

### Contract

REQUIREMENT (BEH-SF-241): When the Claude Code subprocess produces stream-json events, the backend MUST parse each newline-delimited JSON event and translate it to `ACPMessage` parts: `text` events → text content parts, `tool_use`/`tool_result` events → trajectory metadata parts, final output → complete document parts. Token usage MUST be extracted from message events and attached as trajectory metadata.

### Verification

- Text translation test: receive a text event; verify it becomes an ACPMessage text part.
- Tool translation test: receive tool_use/tool_result events; verify trajectory metadata is set.
- Token tracking test: verify token usage is extracted and attached as metadata.
- Complete output test: verify the final output is translated to a complete document part.

---

## BEH-SF-242: Backend Session Continuity — --resume for ACP Session Persistence

The `ClaudeCodeBackend` uses Claude Code's `--resume` flag to maintain session context across ACP runs.

### Contract

REQUIREMENT (BEH-SF-242): When an ACP run includes a `sessionId`, the backend MUST: (a) on the first run for a session, spawn with `--session-id <sessionId>`, (b) on subsequent runs, spawn with `--resume <sessionId>`. The resumed session MUST retain full conversation history. Fork requests MUST use `--resume <sessionId> --fork-session`. The `--resume` mechanism MUST be transparent to the ACP protocol layer.

### Verification

- First run test: create a run with sessionId; verify `--session-id` is used.
- Resume test: create a second run with same sessionId; verify `--resume` is used.
- History test: verify the resumed session remembers prior conversation.
- Fork test: request a fork; verify `--fork-session` is used.

---

## BEH-SF-243: Backend Tool Scoping — --allowedTools per Role

The `ClaudeCodeBackend` scopes tool access per agent role via the `--allowedTools` CLI flag.

### Contract

REQUIREMENT (BEH-SF-243): When building CLI arguments, the backend MUST set `--allowedTools` based on the role from the execution config. Tool sets MUST match the role definitions: discovery (Read, Glob, Grep, WebSearch, WebFetch), spec-author (Read, Write, Edit, Bash, Glob, Grep), dev-agent (Read, Write, Edit, Bash, Glob, Grep), reviewer (Read, Glob, Grep). `--disallowedTools` MUST additionally be set to prevent tool context pollution (e.g., `Task` to prevent subagent nesting).

### Verification

- Role scoping test: spawn each role; verify `--allowedTools` matches the role definition.
- Disallowed test: verify `--disallowedTools` is set for roles that need it.
- Enforcement test: verify tool access is enforced at the Claude Code level.

---

## BEH-SF-244: Backend MCP Config — --mcp-config per Session

The `ClaudeCodeBackend` passes per-session MCP configuration to Claude Code.

### Contract

REQUIREMENT (BEH-SF-244): When MCP servers are configured for an agent role, the backend MUST generate a temporary MCP config file and pass it via `--mcp-config`. The config MUST include only servers authorized for the role per `RoleMcpMapping`. The temporary file MUST be cleaned up when the run ends. This behavior delegates to `McpConfigGenerator` from the MCP Composition subsystem.

### Verification

- Config generation test: spawn with MCP mappings; verify temp config is created.
- Cleanup test: complete the run; verify the temp file is deleted.
- Authorization test: verify only role-authorized servers are in the config.

---

## BEH-SF-245: Backend Error Mapping — Claude Code Errors to ACP Run Failures

Claude Code errors are mapped to ACP run failure states with `BackendError` types.

### Contract

REQUIREMENT (BEH-SF-245): When Claude Code produces an error, the backend MUST map it to a `BackendError` variant: rate limit (429) → `RateLimitError`, context overflow → `ContextOverflowError`, budget exceeded → `BudgetExceededError`, process crash → `ProcessCrashError`, authentication failure → `AuthenticationError`, invalid model → `ModelNotAvailableError`. All errors MUST be frozen (`Object.freeze()`) and carry a unique `_tag`. Transient errors MUST be flagged as retryable.

### Verification

- Mapping test: trigger each Claude Code error; verify correct BackendError variant.
- Tag test: verify each error has a unique `_tag`.
- Freeze test: verify all errors are frozen.
- Retryable test: verify rate limit errors are flagged as retryable; auth errors are not.

---

## BEH-SF-246: Backend Token Tracking — Extract Usage from stream-json as Trajectory Metadata

Token usage is extracted from Claude Code's stream-json output and attached as trajectory metadata.

### Contract

REQUIREMENT (BEH-SF-246): The backend MUST parse token usage (`inputTokens`, `outputTokens`) from stream-json message events. Token usage MUST be aggregated per run in a cumulative `TokenUsage` accumulator. Final usage from the JSON output's `usage` field MUST be authoritative. Usage MUST be attached to output messages as `TrajectoryMetadata` with `kind: "trajectory"`.

### Verification

- Extraction test: complete a run; verify token usage is extracted from stream-json.
- Aggregation test: verify per-run token usage is accumulated across messages.
- Authoritative test: verify the final JSON output usage overrides stream-based estimates.
- Metadata test: verify usage is attached as TrajectoryMetadata on output messages.

---

## BEH-SF-247: Backend Hook Integration — Hook Events to ACP Trajectory Metadata

Claude Code hook events are captured and translated to ACP trajectory metadata.

### Contract

REQUIREMENT (BEH-SF-247): The backend MUST configure Claude Code hooks via `--settings` injection: `PreToolUse` (additional access control), `PostToolUse` (capture tool results), `Stop` (detect completion), `SubagentStart`/`SubagentStop` (track subagent activity). Hook output MUST be captured alongside stream-json and translated to `TrajectoryMetadata` parts with `toolName`, `toolInput`, and `toolOutput` fields.

### Verification

- Hook config test: verify hooks are configured via --settings.
- Capture test: trigger a tool use; verify hook output is captured.
- Translation test: verify hook events become TrajectoryMetadata on output messages.
- Subagent test: trigger a subagent; verify SubagentStart/Stop are tracked.

---

## BEH-SF-248: Backend Disposal — SIGTERM/SIGKILL on Run Cancel

When an ACP run is cancelled, the backend terminates the Claude Code subprocess.

### Contract

REQUIREMENT (BEH-SF-248): When a run cancellation is requested, the backend MUST: (a) send SIGTERM to the child process, (b) wait for graceful shutdown (configurable timeout, default 10 seconds), (c) if the process does not exit, send SIGKILL, (d) release all resources (stream iterator, event listeners). Disposal MUST be idempotent. The backend MUST report the final token usage even on cancellation.

### Verification

- SIGTERM test: cancel a run; verify SIGTERM is sent to the child process.
- Grace period test: cancel a slow process; verify SIGKILL is sent after timeout.
- Idempotent test: cancel twice; verify no error on the second call.
- Usage test: cancel a run; verify final token usage is reported.

---

## Connection/Session Separation

**BEH-SF-325:** Connection pooling MUST be independent of session lifecycle. A connection pool MUST serve multiple sessions concurrently.

**BEH-SF-326:** Connections MUST be reusable across sessions. When a session ends, its borrowed connections MUST be returned to the pool, not destroyed.

**BEH-SF-327:** Connection failure MUST NOT terminate the session. The session MUST retry with a different connection from the pool (up to 3 retries with exponential backoff).

**BEH-SF-328:** Connection health checks MUST run at 30-second intervals. Unhealthy connections MUST be removed from the pool and replaced.

**BEH-SF-329:** Connection lifecycle MUST be independent from session lifecycle. Creating a session MUST NOT require creating a new connection. Destroying a session MUST NOT destroy its connections.

---
