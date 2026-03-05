---
id: ADR-022
kind: decision
title: Dynamic Agent Capabilities & Streaming
status: Accepted
date: 2026-02-28
supersedes: []
invariants: [INV-SF-41]
---

# ADR-022: Dynamic Agent Capabilities & Streaming

**Extends:** [ADR-019](./ADR-019-zed-inspired-architecture.md)

## Context

ADR-019 established the `FlowUpdate` discriminated union for session-scoped streaming, and ADR-020 introduced version negotiation and extension methods. However, agent-client interaction remains static after connection establishment:

1. **No mid-session configuration** — Agents expose configuration options (e.g., verbosity level, code style preference, review depth) but clients cannot discover or modify these options without out-of-band communication. Configuration changes require restarting the session.
2. **Opaque tool execution** — Tool calls report start and completion but provide no incremental progress. Long-running tools (code search across large repositories, test suite execution) appear frozen to the user.
3. **Static command discovery** — Slash commands are hardcoded in the surface layer. Agents cannot advertise context-specific commands (e.g., `/deploy` only appears when the agent has detected a deployment configuration).
4. **Content block assumptions** — The protocol sends all FlowUpdate variants to all clients regardless of surface capabilities. A terminal-based client receives `CodeDiff` variants it cannot render; a web dashboard receives `AgentPlan` variants it displays identically to text.
5. **No capability declaration at session creation** — There is no mechanism for clients to declare what content types they support when creating a session.

## Decision

### 1. Config Options Exchange

Agents advertise configuration options via the `ConfigOptionsUpdate` FlowUpdate variant. Each `ConfigOption` (defined in [types/acp.md](../types/acp.md)) declares a name, description, type (`boolean`, `string`, `number`, `enum`), default value, and current value.

- Agents send `ConfigOptionsUpdate` after session creation and whenever available options change (e.g., after loading a project configuration file).
- Clients modify options by sending a `ConfigSetRequest` message. The agent validates the request and responds with an updated `ConfigOptionsUpdate` reflecting the new state.
- Options are session-scoped. Changing an option in one session does not affect other sessions with the same agent.

### 2. Incremental ToolCall Updates

The `ToolCallProgress` FlowUpdate variant provides incremental progress updates for long-running tool executions:

- `toolCallId` correlates with the preceding `ToolCallStarted` event.
- `delta` contains the incremental output since the last progress event (e.g., newly matched search results, test output lines).
- `percentage` is an optional 0-100 integer for tools that can estimate completion (e.g., test suites with known test counts).

Tool call progress is gated by the `toolCallProgress` capability in `BackendNegotiatedCapabilities` (see [ADR-020](./ADR-020-protocol-extension-observability.md)). Backends that do not support progress simply emit `ToolCallStarted` followed by `ToolCallCompleted` with no intermediate updates.

### 3. Slash Commands as Agent-Advertised

Slash commands are no longer hardcoded in the surface layer. Agents advertise available commands via the `CommandsUpdate` FlowUpdate variant, which carries an array of `SlashCommandDescriptor` values (defined in [types/acp.md](../types/acp.md)):

- Each descriptor includes a name (without the `/` prefix), a description, and typed argument definitions.
- Agents send `CommandsUpdate` after session creation and whenever the available command set changes (e.g., after detecting a new project context).
- The surface layer renders the command palette from the most recent `CommandsUpdate`. Commands not present in the latest update are removed from the palette.
- When the user invokes a slash command, the surface layer sends it as a regular `PromptRequest` with the command text (e.g., `/deploy staging`). The agent parses and executes it.

### 4. Content Block Capability Gating

Before delivering FlowUpdate variants to a client, the protocol layer validates each content block against the session's `SurfaceCapabilities`. The gating pipeline produces a `ContentGatingResult` for each block:

| Action      | Behavior                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `pass`      | Content block is delivered as-is                                                                                               |
| `downgrade` | Content block is replaced with a simpler representation (e.g., `CodeDiff` → plain text diff, `AgentPlan` → markdown checklist) |
| `drop`      | Content block is suppressed entirely with a logged reason                                                                      |

Downgrade rules are defined per FlowUpdate `_tag`:

- `CodeDiff` → Plain text with `---`/`+++` unified diff markers if `supportsCodeDiff` is `false`.
- `AgentPlan` → Markdown checklist text if `supportsAgentPlan` is `false`.
- `ExtFlowUpdate` → Dropped if the extension's content type is not in `supportedContentTypes`.
- Interactive elements within any variant → Stripped if `supportsInteractiveElements` is `false`.

The gating pipeline runs after FlowUpdate emission and before WebSocket/SSE delivery. It MUST NOT modify the original FlowUpdate; it produces a new variant or drops the event (INV-SF-41).

### 5. Surface Capabilities Abstraction

Clients declare their rendering capabilities at session creation by providing a `SurfaceCapabilities` value (defined in [types/acp.md](../types/acp.md)):

- `supportedContentTypes` — MIME types the surface can render (e.g., `["text/plain", "text/markdown", "application/json"]`).
- `supportsStreaming` — Whether the surface can handle incremental FlowUpdate delivery.
- `supportsInteractiveElements` — Whether the surface can render interactive UI elements (buttons, dropdowns).
- `supportsCodeDiff` — Whether the surface has a diff viewer.
- `supportsAgentPlan` — Whether the surface has a plan/progress tracker.
- `maxContentSizeBytes` — Maximum content block size; larger blocks are chunked or dropped.

If no `SurfaceCapabilities` is provided, the protocol assumes a full-featured web surface (all capabilities enabled, 10 MB max content size). This default ensures backward compatibility with clients that predate capability declaration.

## Concept Mapping

| Zed Pattern                                   | SpecForge Adoption                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| `ContextServerSettings` dynamic configuration | `ConfigOption` with `ConfigOptionsUpdate` FlowUpdate                     |
| Streaming tool output chunks                  | `ToolCallProgress` FlowUpdate with `delta` and `percentage`              |
| Context server slash commands                 | `SlashCommandDescriptor` via `CommandsUpdate` FlowUpdate                 |
| Content type negotiation in HTTP              | `SurfaceCapabilities` at session creation, content block gating pipeline |
| Progressive enhancement in web                | Downgrade pipeline: rich → plain text fallbacks for unsupported surfaces |

## Trade-Offs

**Benefits:**

- Mid-session configuration eliminates restart overhead for preference changes
- Incremental tool progress provides real-time feedback for long-running operations
- Agent-advertised commands enable context-aware command palettes without surface-layer hardcoding
- Capability gating ensures all surfaces receive content they can render, eliminating broken UI states
- Default full-featured capabilities maintain backward compatibility

**Costs:**

- Config option validation adds per-session overhead (mitigated: options are small, validation is fast)
- Tool call progress increases message volume on the streaming channel
- Dynamic command updates require the surface layer to re-render the command palette reactively
- Downgrade pipeline adds a processing step to every FlowUpdate delivery
- Surface capabilities must be declared accurately; incorrect declarations produce incorrect gating

## Consequences

- [types/acp.md](../types/acp.md) — `ConfigOption`, `ConfigSetRequest`, `SlashCommandDescriptor`, `SlashCommandArg`, `SurfaceCapabilities`, `ContentGatingResult`; `ToolCallProgress`, `CommandsUpdate`, `ConfigOptionsUpdate` FlowUpdate variants
- [types/ports.md](../types/ports.md) — `SessionStateManager.createSession()` accepts `SurfaceCapabilities` parameter
- [invariants/INV-SF-41-surface-capability-gating.md](../invariants/INV-SF-41-surface-capability-gating.md) — FlowUpdate blocks MUST be validated against SurfaceCapabilities before delivery
- [behaviors/BEH-SF-512-dynamic-capabilities.md](../behaviors/BEH-SF-512-dynamic-capabilities.md) — BEH-SF-512 through BEH-SF-519

## References

- [ADR-019](./ADR-019-zed-inspired-architecture.md) — FlowUpdate discriminated union (extended, not superseded)
- [ADR-020](./ADR-020-protocol-extension-observability.md) — Version negotiation and capability discovery
- [types/acp.md](../types/acp.md) — Full type definitions for dynamic capability types
