---
id: ADR-004
kind: decision
title: Claude Code CLI as Opaque Agent Subprocess
status: Superseded
superseded_by: ADR-018
date: 2025-02-01
supersedes: []
invariants: [INV-SF-2]
---

# ADR-004: Claude Code CLI as Opaque Agent Subprocess

## Context

SpecForge agents need a way to invoke LLM capabilities. Options: direct LLM API integration, Claude Code CLI (via the Claude Agent SDK, `@anthropic-ai/claude-agent-sdk`) as an opaque subprocess, or a multi-provider abstraction.

## Decision

Use the Claude Code CLI (powered by the Claude Agent SDK, `@anthropic-ai/claude-agent-sdk`) exclusively as an opaque subprocess for all LLM interaction. The primary integration surface is `claude -p` (print mode) with `--output-format stream-json` for real-time token tracking. Each agent is a Claude Code subprocess with built-in tool infrastructure. SpecForge never calls any LLM API directly — Claude Code handles all model communication internally. Abstracted behind `LLMProviderPort` for future extensibility to other CLI-based agent tools.

## Rationale

1. **Built-in tools** — Claude Code subprocesses come with file access, bash execution, code search, and web search out of the box. Agents get the same tool capabilities as interactive Claude Code sessions without SpecForge reimplementing tool infrastructure.

2. **Skills reuse** — System prompts can directly incorporate existing `.claude/skills/` content. Agent expertise is defined as skill files, not custom prompt engineering.

3. **Conversation management** — The Claude CLI handles conversation history, context window management, and automatic context compression. SpecForge doesn't need to implement its own conversation state machine.

4. **Process isolation** — Each agent is an OS process with clear lifecycle: spawn, execute, send messages, dispose. Process boundaries provide natural isolation between agents ([INV-SF-2](../invariants/INV-SF-2-agent-session-isolation.md)).

5. **Port abstraction** — The `LLMProviderPort` interface abstracts the SDK. The subprocess model (not direct API) is the core abstraction: all providers are CLI-based tools that SpecForge spawns as subprocesses. Future adapters (Codex CLI, Ollama, etc.) implement the same `LLMProviderService` interface. No agent logic changes when switching providers.

## Architecture

```typescript
// Port interface (provider-agnostic, subprocess model)
interface LLMProviderService {
  spawnAgent(config: AgentSpawnConfig): ResultAsync<AgentHandle, LLMError>;
  getCapabilities(): ProviderCapabilities;
  estimateTokenUsage(config: AgentSpawnConfig): ResultAsync<TokenEstimate, LLMError>;
}

interface ProviderCapabilities {
  supportedModels: ReadonlyArray<ModelSelection>;
  supportsTools: boolean;
  supportsPersistentSessions: boolean;
  supportsStreaming: boolean;
}

// Claude Code adapter (default implementation, wraps claude CLI via Agent SDK)
function createClaudeCodeAdapter(deps: LLMAdapterDeps): LLMProviderService {
  // Spawns `claude -p` subprocesses with --output-format stream-json
  // Maps model selection → --model alias (opus, sonnet, haiku)
  // Tracks token usage from stream-json events
  // Handles retry with exponential backoff
  // See: behaviors/BEH-SF-151-claude-code-adapter.md (BEH-SF-151 through BEH-SF-160)
}

// Future adapters (same interface, different CLI tools):
// createCodexCLIAdapter(deps): LLMProviderService  — wraps OpenAI Codex CLI
// createOllamaAdapter(deps): LLMProviderService     — wraps Ollama CLI

// Model mapping (Claude Code adapter — uses aliases, resolved by Claude Code)
// opus   → Opus 4.6 (currently claude-opus-4-6)
// sonnet → Sonnet 4.6 (currently claude-sonnet-4-6)
// haiku  → Haiku 4.5 (currently claude-haiku-4-5)
// Pin via: ANTHROPIC_DEFAULT_OPUS_MODEL, ANTHROPIC_DEFAULT_SONNET_MODEL, ANTHROPIC_DEFAULT_HAIKU_MODEL
```

## Trade-offs

- **Less prompt engineering control** — The Claude CLI adds its own system context alongside SpecForge's system prompt. Less control than direct model prompting. Acceptable because the CLI's additions (tool descriptions, safety guidelines) are beneficial.

- **Subprocess overhead** — Each agent is an OS process. 8 agent roles × N concurrent sessions = many processes. Mitigated by the session manager which controls concurrency and disposes idle sessions.

- **Token transparency** — Token usage is less granular than direct API integration would be. The SDK adapter tracks approximate usage via the CLI's reporting. Sufficient for budget tracking and cost estimation.

## Future Extensibility

The `LLMProviderPort` abstraction enables future CLI-based agent tool integrations without changing agent logic:

- **Codex CLI** — OpenAI's CLI agent tool, same subprocess model
- **Ollama** — Local model serving via CLI, for air-gapped environments
- **Custom CLI tools** — Any CLI that accepts prompts and returns structured output

The key constraint: all providers must support the subprocess model (spawn, send task, receive output, dispose). Direct API integration is out of scope — SpecForge delegates model communication entirely to the CLI tool.

## Superseded

This ADR is superseded by [ADR-018](./ADR-018-acp-agent-protocol.md). Claude Code CLI is no longer the protocol surface — it becomes one possible agent backend behind ACP handlers:

| Old Concept                          | New Concept                                                         |
| ------------------------------------ | ------------------------------------------------------------------- |
| `LLMProviderPort` (subprocess model) | `ACPAgentPort` (ACP client) + `AgentBackendPort` (execution engine) |
| `LLMProviderService.spawnAgent()`    | `ACPAgentService.createRun()`                                       |
| `AgentHandle.sendTask()`             | `ACPAgentService.resumeRun()`                                       |
| `ClaudeCodeAdapter`                  | `ClaudeCodeBackend` (implements `AgentBackendService`)              |
| `--session-id`/`--resume`            | ACP session state descriptors                                       |
| `--output-format stream-json`        | ACP streaming runs via SSE                                          |

See [behaviors/BEH-SF-239-agent-backend.md](../behaviors/BEH-SF-239-agent-backend.md) for the refactored Claude Code integration.

## References

- [Agent Sessions](../behaviors/BEH-SF-025-agent-sessions.md) — Agent session architecture
- [ClaudeCodeAdapter Behaviors](../behaviors/BEH-SF-151-claude-code-adapter.md) — BEH-SF-151 through BEH-SF-160 (refactored as agent backend)
- [Agent Backend Behaviors](../behaviors/BEH-SF-239-agent-backend.md) — BEH-SF-239 through BEH-SF-248
- [Port Types](../types/ports.md) — `ACPAgentService`, `AgentBackendService`
- [Ports and Adapters](../architecture/ports-and-adapters.md) — `ACPAgentPort`, `AgentBackendPort`
- [Claude Code Reference](../references/claude-code/) — Agent SDK, CLI, hooks, settings, permissions
